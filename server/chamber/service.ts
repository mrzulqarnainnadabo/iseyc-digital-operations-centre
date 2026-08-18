import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { chamberAuditLog, chamberDocuments, chamberParticipants, chamberSessions, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { createChamberTrackerDraftSubmission } from "../meeting/service";
import { canTransitionChamberSession, canUseVisitorAdmission, isChamberManager, isSameChamberScope, officialPositionForRole, type ChamberSessionStatus, type ChamberSessionType } from "./guards";

type Actor = { id: number; role: "user" | "admin"; docRole: string; name?: string | null; email?: string | null };

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Digital Chamber service is unavailable.");
  return db;
}

async function writeAudit(input: { sessionId: number; actorUserId?: number; eventType: string; detail: string; isTestMode: boolean }) {
  const db = await requireDb();
  await db.insert(chamberAuditLog).values(input);
}

async function loadSession(sessionId: number) {
  const db = await requireDb();
  const session = (await db.select().from(chamberSessions).where(eq(chamberSessions.id, sessionId)).limit(1))[0];
  if (!session) throw new Error("Digital Chamber session not found.");
  return session;
}

async function assertManager(sessionId: number, actor: Actor) {
  const session = await loadSession(sessionId);
  if (!isChamberManager({ chairUserId: session.chairUserId, createdByUserId: session.createdByUserId, actorUserId: actor.id, actorRole: actor.role, actorDocRole: actor.docRole })) {
    throw new Error("Only the Session Chair or an authorised administrator may manage this Chamber session.");
  }
  return session;
}

export async function createChamberSession(input: { title: string; description?: string; sessionType: ChamberSessionType; conveningBody?: string; sensitivity: "public" | "internal" | "confidential" | "restricted"; agenda: string[]; scheduledStartAt?: Date; scheduledEndAt?: Date; isTestMode: boolean; actor: Actor }) {
  const db = await requireDb();
  const result = await db.insert(chamberSessions).values({
    title: input.title,
    description: input.description || null,
    sessionType: input.sessionType,
    conveningBody: input.conveningBody || null,
    chairUserId: input.actor.id,
    sensitivity: input.sensitivity,
    agendaJson: input.agenda,
    scheduledStartAt: input.scheduledStartAt || null,
    scheduledEndAt: input.scheduledEndAt || null,
    status: "draft",
    isTestMode: input.isTestMode,
    createdByUserId: input.actor.id,
  });
  const sessionId = Number(result[0].insertId);
  await db.insert(chamberParticipants).values({
    sessionId,
    userId: input.actor.id,
    invitedEmail: input.actor.email || null,
    displayName: input.actor.name || "ISEYC Session Chair",
    officialPosition: officialPositionForRole(input.actor.docRole),
    participantType: "internal",
    sessionRole: "chair",
    admissionStatus: "admitted",
    admittedByUserId: input.actor.id,
    admittedAt: new Date(),
    isTestMode: input.isTestMode,
    addedByUserId: input.actor.id,
  });
  await writeAudit({ sessionId, actorUserId: input.actor.id, eventType: "session_created", detail: `Digital Chamber ${input.sessionType} created as a controlled ${input.isTestMode ? "test" : "live"} session.`, isTestMode: input.isTestMode });
  return getChamberSessionDetail(sessionId, input.actor);
}

export async function listChamberSessions(actor: Actor, isTestMode: boolean) {
  const db = await requireDb();
  if (actor.role === "admin" || actor.docRole === "national_president") {
    const rows = await db.select().from(chamberSessions).where(eq(chamberSessions.isTestMode, isTestMode)).orderBy(desc(chamberSessions.updatedAt));
    return rows.filter(row => isSameChamberScope(isTestMode, row.isTestMode));
  }
  const memberships = await db.select({ sessionId: chamberParticipants.sessionId }).from(chamberParticipants).where(and(eq(chamberParticipants.userId, actor.id), eq(chamberParticipants.isTestMode, isTestMode), eq(chamberParticipants.admissionStatus, "admitted")));
  const ids = memberships.map(item => item.sessionId);
  if (!ids.length) return [];
  const rows = await db.select().from(chamberSessions).where(and(inArray(chamberSessions.id, ids), eq(chamberSessions.isTestMode, isTestMode))).orderBy(desc(chamberSessions.updatedAt));
  return rows.filter(row => isSameChamberScope(isTestMode, row.isTestMode));
}

export async function listChamberDirectory() {
  const db = await requireDb();
  const directory = await db.select({ id: users.id, name: users.name, email: users.email, docRole: users.docRole }).from(users).where(eq(users.isAuthorizedOfficer, true)).orderBy(asc(users.name));
  return directory.map(person => ({ ...person, officialPosition: officialPositionForRole(person.docRole) }));
}

export async function getChamberSessionDetail(sessionId: number, actor: Actor) {
  const db = await requireDb();
  const session = await loadSession(sessionId);
  const manager = isChamberManager({ chairUserId: session.chairUserId, createdByUserId: session.createdByUserId, actorUserId: actor.id, actorRole: actor.role, actorDocRole: actor.docRole });
  if (!manager) {
    const membership = (await db.select().from(chamberParticipants).where(and(eq(chamberParticipants.sessionId, sessionId), eq(chamberParticipants.userId, actor.id), eq(chamberParticipants.admissionStatus, "admitted"), eq(chamberParticipants.isTestMode, session.isTestMode))).limit(1))[0];
    if (!membership) throw new Error("You have not been admitted to this Digital Chamber session.");
  }
  const [participants, audit, documents] = await Promise.all([
    db.select().from(chamberParticipants).where(and(eq(chamberParticipants.sessionId, sessionId), eq(chamberParticipants.isTestMode, session.isTestMode))).orderBy(chamberParticipants.createdAt),
    db.select().from(chamberAuditLog).where(and(eq(chamberAuditLog.sessionId, sessionId), eq(chamberAuditLog.isTestMode, session.isTestMode))).orderBy(desc(chamberAuditLog.createdAt)),
    db.select().from(chamberDocuments).where(and(eq(chamberDocuments.sessionId, sessionId), eq(chamberDocuments.isTestMode, session.isTestMode))).orderBy(desc(chamberDocuments.createdAt)),
  ]);
  return {
    session,
    participants: participants.filter(participant => isSameChamberScope(session.isTestMode, participant.isTestMode)),
    audit: audit.filter(entry => isSameChamberScope(session.isTestMode, entry.isTestMode)),
    documents: documents.filter(document => isSameChamberScope(session.isTestMode, document.isTestMode)),
    canManage: manager,
    documentDesk: { enabled: true, message: "Sources can be uploaded and handed to the existing draft-only Meeting & Decision Tracker. Text and audio explanations remain withheld until their human-reviewed intelligence layer is activated." },
  };
}

export async function addChamberParticipant(input: { sessionId: number; participantType: "internal" | "authorised_visitor"; sessionRole: "presenter" | "participant" | "observer"; targetUserId?: number; visitorName?: string; visitorEmail?: string; actor: Actor }) {
  const db = await requireDb();
  const session = await assertManager(input.sessionId, input.actor);
  if (input.participantType === "authorised_visitor" && !canUseVisitorAdmission(session.sessionType)) throw new Error("Authorised visitors may only be added to a controlled visitor session or seminar.");
  let participant: { userId: number | null; invitedEmail: string | null; displayName: string; officialPosition: string; participantType: "internal" | "authorised_visitor" };
  if (input.participantType === "internal") {
    if (!input.targetUserId) throw new Error("An authorised ISEYC account is required for an internal participant.");
    const user = (await db.select().from(users).where(eq(users.id, input.targetUserId)).limit(1))[0];
    if (!user || !user.isAuthorizedOfficer) throw new Error("The selected internal participant is not an authorised ISEYC officer.");
    participant = { userId: user.id, invitedEmail: user.email || null, displayName: user.name || "ISEYC Officer", officialPosition: officialPositionForRole(user.docRole), participantType: "internal" };
  } else {
    if (!input.visitorName || !input.visitorEmail) throw new Error("An authorised visitor requires a name and email address.");
    participant = { userId: null, invitedEmail: input.visitorEmail.trim().toLowerCase(), displayName: input.visitorName.trim(), officialPosition: "Authorised Visitor", participantType: "authorised_visitor" };
  }
  const result = await db.insert(chamberParticipants).values({ sessionId: input.sessionId, ...participant, sessionRole: input.sessionRole, admissionStatus: "invited", isTestMode: session.isTestMode, addedByUserId: input.actor.id });
  await writeAudit({ sessionId: input.sessionId, actorUserId: input.actor.id, eventType: "participant_invited", detail: `${participant.displayName} added as ${participant.officialPosition}.`, isTestMode: session.isTestMode });
  return { id: Number(result[0].insertId) };
}

export async function setParticipantAdmission(input: { sessionId: number; participantId: number; admissionStatus: "admitted" | "declined" | "removed"; actor: Actor }) {
  const db = await requireDb();
  const session = await assertManager(input.sessionId, input.actor);
  const participant = (await db.select().from(chamberParticipants).where(and(eq(chamberParticipants.id, input.participantId), eq(chamberParticipants.sessionId, input.sessionId), eq(chamberParticipants.isTestMode, session.isTestMode))).limit(1))[0];
  if (!participant) throw new Error("Chamber participant not found.");
  await db.update(chamberParticipants).set({ admissionStatus: input.admissionStatus, admittedByUserId: input.actor.id, admittedAt: input.admissionStatus === "admitted" ? new Date() : null }).where(eq(chamberParticipants.id, input.participantId));
  await writeAudit({ sessionId: input.sessionId, actorUserId: input.actor.id, eventType: `participant_${input.admissionStatus}`, detail: `${participant.displayName} marked ${input.admissionStatus}.`, isTestMode: session.isTestMode });
}

export async function transitionChamberSession(input: { sessionId: number; nextStatus: ChamberSessionStatus; actor: Actor }) {
  const db = await requireDb();
  const session = await assertManager(input.sessionId, input.actor);
  if (!canTransitionChamberSession(session.status, input.nextStatus)) throw new Error(`A Chamber session cannot move from ${session.status} to ${input.nextStatus}.`);
  await db.update(chamberSessions).set({ status: input.nextStatus }).where(eq(chamberSessions.id, input.sessionId));
  await writeAudit({ sessionId: input.sessionId, actorUserId: input.actor.id, eventType: "session_status_changed", detail: `Session state changed from ${session.status} to ${input.nextStatus}.`, isTestMode: session.isTestMode });
}

export async function requestChamberTrackerDraft(input: { sessionId: number; actor: Actor }) {
  const db = await requireDb();
  const session = await assertManager(input.sessionId, input.actor);
  if (session.trackerLinkStatus !== "not_linked") throw new Error("This Chamber session already has a tracker handoff in progress or linked record.");
  const documents = await db.select().from(chamberDocuments).where(and(eq(chamberDocuments.sessionId, input.sessionId), eq(chamberDocuments.isTestMode, session.isTestMode)));
  const scopedDocuments = documents.filter(document => isSameChamberScope(session.isTestMode, document.isTestMode));
  if (!scopedDocuments.length) throw new Error("Add at least one controlled Chamber document before requesting a tracker draft handoff.");
  const submissionId = await createChamberTrackerDraftSubmission({
    chamberSessionId: input.sessionId,
    meetingTitle: session.title,
    meetingDate: session.scheduledStartAt?.toISOString() || undefined,
    conveningBody: session.conveningBody || undefined,
    sensitivity: session.sensitivity,
    isTestMode: session.isTestMode,
    submittedByUserId: input.actor.id,
    files: scopedDocuments.map(document => ({ originalName: document.originalName, mimeType: document.mimeType, fileSizeBytes: document.fileSizeBytes, storageKey: document.storageKey, storageUrl: document.storageUrl, extractedText: document.extractedText })),
  });
  await db.update(chamberSessions).set({ trackerLinkStatus: "linked", linkedMeetingSubmissionId: submissionId }).where(eq(chamberSessions.id, input.sessionId));
  await writeAudit({ sessionId: input.sessionId, actorUserId: input.actor.id, eventType: "tracker_draft_linked", detail: `Draft-only Meeting & Decision Tracker submission ${submissionId} linked. No record, decision, or action was approved.`, isTestMode: session.isTestMode });
  return { status: "linked" as const, submissionId };
}

function safeDocumentKeyPart(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "chamber-source";
}

export async function uploadChamberDocument(input: { sessionId: number; originalName: string; mimeType: string; base64: string; sourceText?: string; actor: Actor }) {
  const db = await requireDb();
  const session = await assertManager(input.sessionId, input.actor);
  const bytes = Buffer.from(input.base64, "base64");
  const storagePrefix = session.isTestMode ? "digital-chamber/test" : "digital-chamber/live";
  const upload = await storagePut(`${storagePrefix}/${input.sessionId}/${Date.now()}-${safeDocumentKeyPart(input.originalName)}`, bytes, input.mimeType);
  const result = await db.insert(chamberDocuments).values({
    sessionId: input.sessionId,
    originalName: input.originalName,
    mimeType: input.mimeType,
    fileSizeBytes: bytes.length,
    storageKey: upload.key,
    storageUrl: upload.url,
    extractedText: input.sourceText?.slice(0, 120_000) || null,
    uploadedByUserId: input.actor.id,
    isTestMode: session.isTestMode,
  });
  await writeAudit({ sessionId: input.sessionId, actorUserId: input.actor.id, eventType: "document_uploaded", detail: `${input.originalName} added to the protected Chair document desk. Analysis remains ungenerated until human review controls are enabled.`, isTestMode: session.isTestMode });
  return { id: Number(result[0].insertId), url: upload.url };
}
