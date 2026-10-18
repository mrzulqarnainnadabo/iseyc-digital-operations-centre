/**
 * ISEYC Institutional Spine — Phase 2 service
 * Org structure, department desks, global approval queue, Day-1 packet.
 * AI never becomes a seat-holder. Human approval remains final.
 */
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  aiDeskRuns,
  contentDrafts,
  departments,
  institutionalAuditLog,
  meetingSubmissions,
  programmes,
  publications,
  resolutions,
  seatHolders,
  seats,
  users,
} from "../../drizzle/schema";

const CIVIC_MANDATE_URL = "https://2027-street-mandate.vercel.app";
const CIVIC_BRAIN_URL = "https://github.com/mrzulqarnainnadabo/iseyc-civic-brain";

export async function getOrgStructure() {
  const db = await getDb();
  if (!db) return { departments: [], seats: [], holders: [], programmes: [] };

  const [deptRows, seatRows, holderRows, programmeRows] = await Promise.all([
    db.select().from(departments).where(eq(departments.isActive, true)).orderBy(asc(departments.sortOrder)),
    db.select().from(seats).orderBy(asc(seats.sortOrder)),
    db
      .select({
        id: seatHolders.id,
        seatId: seatHolders.seatId,
        userId: seatHolders.userId,
        status: seatHolders.status,
        appointedAt: seatHolders.appointedAt,
        userName: users.name,
        userEmail: users.email,
        docRole: users.docRole,
      })
      .from(seatHolders)
      .leftJoin(users, eq(seatHolders.userId, users.id))
      .where(and(eq(seatHolders.status, "active"), eq(seatHolders.isTestMode, false))),
    db.select().from(programmes).where(eq(programmes.status, "active")).orderBy(asc(programmes.name)),
  ]);

  return {
    departments: deptRows,
    seats: seatRows,
    holders: holderRows,
    programmes: programmeRows,
    layers: [
      { key: "board_of_trustees", label: "Board of Trustees", description: "Oversight" },
      { key: "advisory_council", label: "Advisory Council", description: "Counsel" },
      { key: "presidential_council", label: "Presidential Council", description: "National President, CoS, SG, COO, CFO" },
      { key: "department", label: "Departments", description: "Operational desks" },
      { key: "shared_service", label: "Shared Services", description: "Communications & Storytelling under CoS" },
    ],
  };
}

export async function getDepartmentDesk(departmentKey: string) {
  const db = await getDb();
  if (!db) return null;

  const [dept] = await db.select().from(departments).where(eq(departments.departmentKey, departmentKey as any)).limit(1);
  if (!dept) return null;

  const [deptSeats, deptProgrammes, openAiRuns, openPublications, openResolutions] = await Promise.all([
    db.select().from(seats).where(eq(seats.departmentId, dept.id)).orderBy(asc(seats.sortOrder)),
    db.select().from(programmes).where(eq(programmes.departmentId, dept.id)).orderBy(asc(programmes.name)),
    db
      .select()
      .from(aiDeskRuns)
      .where(
        and(
          eq(aiDeskRuns.departmentId, dept.id),
          eq(aiDeskRuns.isTestMode, false),
          inArray(aiDeskRuns.status, ["draft_ready", "under_human_review", "queued"]),
        ),
      )
      .orderBy(desc(aiDeskRuns.createdAt))
      .limit(20),
    db
      .select()
      .from(publications)
      .where(
        and(
          eq(publications.departmentId, dept.id),
          eq(publications.isTestMode, false),
          inArray(publications.status, ["draft", "under_review", "approved"]),
        ),
      )
      .orderBy(desc(publications.updatedAt))
      .limit(20),
    db
      .select()
      .from(resolutions)
      .where(
        and(
          eq(resolutions.isTestMode, false),
          inArray(resolutions.status, ["draft", "under_review"]),
        ),
      )
      .orderBy(desc(resolutions.createdAt))
      .limit(10),
  ]);

  const civicLinks =
    departmentKey === "civic_affairs"
      ? {
          mandate: { label: "Civic Mandate Nigeria (published-only)", url: CIVIC_MANDATE_URL },
          brain: { label: "Civic Brain (evidence companion)", url: CIVIC_BRAIN_URL },
          note: "Civic tools remain published-only and non-partisan. No ranking, endorsement, or campaign use.",
        }
      : null;

  return {
    department: dept,
    seats: deptSeats,
    programmes: deptProgrammes,
    openAiDeskRuns: openAiRuns,
    openPublications: openPublications,
    openResolutions: openResolutions,
    civicLinks,
  };
}

/**
 * Global approval queue: items across modules that await human review.
 * Aggregates institutional spine + existing module pending items.
 */
export async function getGlobalApprovalQueue(opts: { isTestMode?: boolean } = {}) {
  const db = await getDb();
  if (!db) return { items: [], counts: {} };
  const isTest = opts.isTestMode ?? false;

  const [aiItems, pubItems, resolutionItems, meetingItems, contentItems] = await Promise.all([
    db
      .select({
        id: aiDeskRuns.id,
        title: aiDeskRuns.promptRole,
        status: aiDeskRuns.status,
        createdAt: aiDeskRuns.createdAt,
        detail: aiDeskRuns.inputSummary,
      })
      .from(aiDeskRuns)
      .where(
        and(
          eq(aiDeskRuns.isTestMode, isTest),
          inArray(aiDeskRuns.status, ["draft_ready", "under_human_review"]),
        ),
      )
      .orderBy(desc(aiDeskRuns.createdAt))
      .limit(30),
    db
      .select({
        id: publications.id,
        title: publications.title,
        status: publications.status,
        createdAt: publications.createdAt,
        detail: publications.summary,
      })
      .from(publications)
      .where(
        and(
          eq(publications.isTestMode, isTest),
          inArray(publications.status, ["under_review", "approved"]),
        ),
      )
      .orderBy(desc(publications.updatedAt))
      .limit(30),
    db
      .select({
        id: resolutions.id,
        title: resolutions.title,
        status: resolutions.status,
        createdAt: resolutions.createdAt,
        detail: resolutions.statusReason,
      })
      .from(resolutions)
      .where(
        and(eq(resolutions.isTestMode, isTest), inArray(resolutions.status, ["under_review"])),
      )
      .orderBy(desc(resolutions.createdAt))
      .limit(20),
    db
      .select({
        id: meetingSubmissions.id,
        title: meetingSubmissions.meetingTitle,
        status: meetingSubmissions.status,
        createdAt: meetingSubmissions.createdAt,
        detail: meetingSubmissions.statusReason,
      })
      .from(meetingSubmissions)
      .where(
        and(
          eq(meetingSubmissions.isTestMode, isTest),
          inArray(meetingSubmissions.status, ["draft_ready", "under_review", "needs_human_review"]),
        ),
      )
      .orderBy(desc(meetingSubmissions.createdAt))
      .limit(30),
    db
      .select({
        id: contentDrafts.id,
        title: contentDrafts.title,
        status: contentDrafts.status,
        createdAt: contentDrafts.createdAt,
        detail: contentDrafts.objective,
      })
      .from(contentDrafts)
      .where(
        and(
          eq(contentDrafts.isTestMode, isTest),
          inArray(contentDrafts.status, ["draft_ready", "revision_requested"]),
        ),
      )
      .orderBy(desc(contentDrafts.updatedAt))
      .limit(20),
  ]);

  const items = [
    ...aiItems.map(r => ({ ...r, module: "ai_desk" as const, reviewPath: `/command-centre/ai-desk/${r.id}` })),
    ...pubItems.map(r => ({ ...r, module: "publication" as const, reviewPath: `/command-centre/publication/${r.id}` })),
    ...resolutionItems.map(r => ({ ...r, module: "resolution" as const, reviewPath: `/command-centre/resolution/${r.id}` })),
    ...meetingItems.map(r => ({ ...r, module: "meeting" as const, reviewPath: `/review/${r.id}` })),
    ...contentItems.map(r => ({ ...r, module: "content" as const, reviewPath: `/media/${r.id}` })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    items,
    counts: {
      ai_desk: aiItems.length,
      publication: pubItems.length,
      resolution: resolutionItems.length,
      meeting: meetingItems.length,
      content: contentItems.length,
      total: items.length,
    },
  };
}

/**
 * Day-1 appointment packet for a seat: what a new holder inherits.
 */
export async function getDay1Packet(seatKey: string) {
  const db = await getDb();
  if (!db) return null;

  const [seat] = await db.select().from(seats).where(eq(seats.seatKey, seatKey)).limit(1);
  if (!seat) return null;

  let department = null;
  if (seat.departmentId) {
    const [d] = await db.select().from(departments).where(eq(departments.id, seat.departmentId)).limit(1);
    department = d || null;
  }

  const [activeHolder] = await db
    .select({
      id: seatHolders.id,
      userId: seatHolders.userId,
      status: seatHolders.status,
      appointedAt: seatHolders.appointedAt,
      userName: users.name,
    })
    .from(seatHolders)
    .leftJoin(users, eq(seatHolders.userId, users.id))
    .where(and(eq(seatHolders.seatId, seat.id), eq(seatHolders.status, "active"), eq(seatHolders.isTestMode, false)))
    .limit(1);

  const relatedProgrammes = seat.departmentId
    ? await db.select().from(programmes).where(eq(programmes.departmentId, seat.departmentId))
    : [];

  const openDeskRuns = await db
    .select()
    .from(aiDeskRuns)
    .where(
      and(
        eq(aiDeskRuns.seatId, seat.id),
        eq(aiDeskRuns.isTestMode, false),
        inArray(aiDeskRuns.status, ["draft_ready", "under_human_review", "queued"]),
      ),
    )
    .limit(10);

  return {
    seat,
    department,
    activeHolder: activeHolder || null,
    programmes: relatedProgrammes,
    openAiDeskRuns: openDeskRuns,
    inheritanceNote:
      "A new appointee inherits this seat, its open queues, linked programmes, and published archive. AI desk output remains draft until human approval. No autonomous authority transfers with the seat.",
    sops: [
      "Review open AI desk runs and return or approve none without reading source material.",
      "Confirm active programmes and accountable ownership.",
      "Check global approval queue for items touching this seat or department.",
      "Do not publish, contact externals, or move money without the human gates already enforced in DOC modules.",
    ],
    civicNote:
      seat.seatKey === "head_civic"
        ? "Civic Affairs desk links to published-only Civic Mandate and Civic Brain. No campaign ranking or endorsement tools."
        : null,
  };
}

export async function listSeats() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(seats).orderBy(asc(seats.sortOrder));
}

export async function listDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.isActive, true)).orderBy(asc(departments.sortOrder));
}

export async function writeInstitutionalAudit(opts: {
  entityType: string;
  entityId: number;
  actorUserId?: number | null;
  eventType: string;
  detail?: string;
  isTestMode?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(institutionalAuditLog).values({
    entityType: opts.entityType,
    entityId: opts.entityId,
    actorUserId: opts.actorUserId ?? null,
    eventType: opts.eventType,
    detail: opts.detail ?? null,
    isTestMode: opts.isTestMode ?? false,
  });
}
