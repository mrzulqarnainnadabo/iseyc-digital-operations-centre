/**
 * Deterministic operational attention engine.
 * CONDITION → REASON → RECOMMENDED ACTION
 * Does not mutate records. Does not call AI.
 */

import { desc, eq } from "drizzle-orm";
import {
  commandBriefRuns,
  meetingActionItems,
  meetingSubmissions,
  User,
} from "../../drizzle/schema";
import { getDb } from "../db";
import type {
  AttentionItem,
  AttentionSeverity,
  OperationalHealthSummary,
} from "./types";

const REVIEW_STATUSES = new Set([
  "under_review",
  "needs_human_review",
  "draft_ready",
]);

const BLOCKED_STATUSES = new Set(["blocked"]);

const STALE_MS = 1000 * 60 * 60 * 24 * 14;

function parseDueDate(raw: string | null | undefined): Date | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);
  const human = Date.parse(
    trimmed.replace(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/, "$2 $1, $3")
  );
  if (!Number.isNaN(human)) return new Date(human);
  return null;
}

function isOverdue(due: Date, now: Date): boolean {
  return due.getTime() < now.getTime();
}

function severityRank(s: AttentionSeverity): number {
  switch (s) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
  }
}

function item(
  partial: Omit<AttentionItem, "detectedAt"> & { detectedAt?: string },
  now: Date
): AttentionItem {
  return {
    ...partial,
    detectedAt: partial.detectedAt ?? now.toISOString(),
  };
}

export function evaluateActionItemAttention(
  action: {
    id: number;
    actionDescription: string;
    accountableOwner: string;
    dueDate: string | null;
    confirmationStatus: "draft" | "confirmed";
    submissionId: number;
  },
  submission: { isTestMode: boolean; meetingTitle: string } | null,
  now: Date
): AttentionItem[] {
  const out: AttentionItem[] = [];
  const isTestMode = submission?.isTestMode ?? false;
  const title = action.actionDescription.slice(0, 120) || `Action #${action.id}`;
  const dest = `/review/${action.submissionId}`;

  const owner = (action.accountableOwner || "").trim();
  if (!owner || owner.toLowerCase() === "unassigned" || owner.toLowerCase() === "tbd") {
    out.push(
      item(
        {
          id: `action-${action.id}-missing-owner`,
          type: "missing_owner",
          severity: "medium",
          recordKind: "meeting_action_item",
          recordId: action.id,
          title,
          reason: "Action has no accountable owner.",
          recommendedAction: "assign",
          destination: dest,
          isTestMode,
        },
        now
      )
    );
  }

  if (action.confirmationStatus === "draft") {
    out.push(
      item(
        {
          id: `action-${action.id}-unconfirmed`,
          type: "draft_unconfirmed",
          severity: "low",
          recordKind: "meeting_action_item",
          recordId: action.id,
          title,
          reason:
            "Action remains in draft confirmation status and is not yet institutional.",
          recommendedAction: "confirm",
          destination: dest,
          isTestMode,
        },
        now
      )
    );
  }

  const due = parseDueDate(action.dueDate);
  if (due && isOverdue(due, now) && action.confirmationStatus === "confirmed") {
    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    out.push(
      item(
        {
          id: `action-${action.id}-overdue`,
          type: "overdue_action",
          severity: "high",
          recordKind: "meeting_action_item",
          recordId: action.id,
          title,
          reason: `Confirmed action is overdue${days >= 0 ? ` by ${days} day(s)` : ""}.`,
          recommendedAction: "follow_up",
          destination: dest,
          isTestMode,
        },
        now
      )
    );
  }

  if (!action.dueDate || !action.dueDate.trim()) {
    out.push(
      item(
        {
          id: `action-${action.id}-no-due`,
          type: "incomplete",
          severity: "low",
          recordKind: "meeting_action_item",
          recordId: action.id,
          title,
          reason: "Action has no due date.",
          recommendedAction: "complete_information",
          destination: dest,
          isTestMode,
        },
        now
      )
    );
  }

  return out;
}

export function evaluateSubmissionAttention(
  submission: {
    id: number;
    meetingTitle: string;
    status: string;
    statusReason: string | null;
    isTestMode: boolean;
    updatedAt: Date;
  },
  now: Date
): AttentionItem[] {
  const out: AttentionItem[] = [];
  const dest = `/review/${submission.id}`;
  const title = submission.meetingTitle;

  if (BLOCKED_STATUSES.has(submission.status)) {
    out.push(
      item(
        {
          id: `submission-${submission.id}-blocked`,
          type: "blocked",
          severity: "high",
          recordKind: "meeting_submission",
          recordId: submission.id,
          title,
          reason:
            submission.statusReason ||
            "Meeting record is blocked and requires human intervention.",
          recommendedAction: "investigate",
          destination: dest,
          isTestMode: submission.isTestMode,
        },
        now
      )
    );
  }

  if (REVIEW_STATUSES.has(submission.status)) {
    out.push(
      item(
        {
          id: `submission-${submission.id}-review`,
          type:
            submission.status === "needs_human_review"
              ? "governance_review"
              : "awaiting_review",
          severity: submission.status === "needs_human_review" ? "high" : "medium",
          recordKind: "meeting_submission",
          recordId: submission.id,
          title,
          reason:
            submission.statusReason ||
            `Record status is "${submission.status}" and awaits human review.`,
          recommendedAction: "review",
          destination: dest,
          isTestMode: submission.isTestMode,
        },
        now
      )
    );
  }

  const age = now.getTime() - new Date(submission.updatedAt).getTime();
  if (
    age > STALE_MS &&
    !["approved"].includes(submission.status) &&
    !BLOCKED_STATUSES.has(submission.status)
  ) {
    out.push(
      item(
        {
          id: `submission-${submission.id}-stale`,
          type: "stale",
          severity: "medium",
          recordKind: "meeting_submission",
          recordId: submission.id,
          title,
          reason: "Record has not progressed for more than 14 days.",
          recommendedAction: "follow_up",
          destination: dest,
          isTestMode: submission.isTestMode,
        },
        now
      )
    );
  }

  return out;
}

export function evaluateBriefAttention(
  brief: {
    id: number;
    status: string;
    statusReason: string | null;
    isTestMode: boolean;
    coverageStart: Date;
  },
  now: Date
): AttentionItem[] {
  const out: AttentionItem[] = [];
  if (["draft_ready", "under_review"].includes(brief.status)) {
    out.push(
      item(
        {
          id: `brief-${brief.id}-review`,
          type: "awaiting_review",
          severity: "medium",
          recordKind: "command_brief",
          recordId: brief.id,
          title: `Command Brief #${brief.id}`,
          reason:
            brief.statusReason ||
            "Command Brief draft requires human review before institutional use.",
          recommendedAction: "review",
          destination: "/command-brief",
          isTestMode: brief.isTestMode,
        },
        now
      )
    );
  }
  if (brief.status === "withheld_for_review") {
    out.push(
      item(
        {
          id: `brief-${brief.id}-withheld`,
          type: "governance_review",
          severity: "high",
          recordKind: "command_brief",
          recordId: brief.id,
          title: `Command Brief #${brief.id}`,
          reason:
            brief.statusReason || "Command Brief withheld pending governance review.",
          recommendedAction: "investigate",
          destination: "/command-brief",
          isTestMode: brief.isTestMode,
        },
        now
      )
    );
  }
  return out;
}

export function sortAttention(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    return a.id.localeCompare(b.id);
  });
}

export async function scanOperationalAttention(
  user: User | null,
  options?: {
    includeTestMode?: boolean;
    now?: Date;
  }
): Promise<AttentionItem[]> {
  if (!user || !user.isAuthorizedOfficer) {
    return [];
  }

  const includeTestMode = options?.includeTestMode ?? false;
  const now = options?.now ?? new Date();
  const db = await getDb();
  if (!db) return [];

  let submissions = includeTestMode
    ? await db
        .select()
        .from(meetingSubmissions)
        .orderBy(desc(meetingSubmissions.updatedAt))
        .limit(200)
    : await db
        .select()
        .from(meetingSubmissions)
        .where(eq(meetingSubmissions.isTestMode, false))
        .orderBy(desc(meetingSubmissions.updatedAt))
        .limit(200);

  // Non-admin officers only see attention derived from submissions they own.
  if (user.role !== "admin") {
    submissions = submissions.filter(s => s.submittedByUserId === user.id);
  }

  const submissionMap = new Map(submissions.map(s => [s.id, s]));
  const items: AttentionItem[] = [];
  for (const s of submissions) {
    items.push(
      ...evaluateSubmissionAttention(
        {
          id: s.id,
          meetingTitle: s.meetingTitle,
          status: s.status,
          statusReason: s.statusReason,
          isTestMode: s.isTestMode,
          updatedAt: s.updatedAt,
        },
        now
      )
    );
  }

  if (submissionMap.size > 0) {
    const allActions = await db.select().from(meetingActionItems).limit(500);
    for (const action of allActions) {
      if (!submissionMap.has(action.submissionId)) continue;
      const sub = submissionMap.get(action.submissionId)!;
      items.push(
        ...evaluateActionItemAttention(
          {
            id: action.id,
            actionDescription: action.actionDescription,
            accountableOwner: action.accountableOwner,
            dueDate: action.dueDate,
            confirmationStatus: action.confirmationStatus,
            submissionId: action.submissionId,
          },
          { isTestMode: sub.isTestMode, meetingTitle: sub.meetingTitle },
          now
        )
      );
    }
  }

  if (user.docRole === "national_president" || user.role === "admin") {
    const briefs = includeTestMode
      ? await db
          .select()
          .from(commandBriefRuns)
          .orderBy(desc(commandBriefRuns.createdAt))
          .limit(50)
      : await db
          .select()
          .from(commandBriefRuns)
          .where(eq(commandBriefRuns.isTestMode, false))
          .orderBy(desc(commandBriefRuns.createdAt))
          .limit(50);

    for (const brief of briefs) {
      items.push(
        ...evaluateBriefAttention(
          {
            id: brief.id,
            status: brief.status,
            statusReason: brief.statusReason,
            isTestMode: brief.isTestMode,
            coverageStart: brief.coverageStart,
          },
          now
        )
      );
    }
  }

  return sortAttention(items);
}

export function summarizeAttention(
  items: AttentionItem[]
): OperationalHealthSummary["operational"] {
  return {
    attentionCount: items.length,
    criticalCount: items.filter(i => i.severity === "critical").length,
    highCount: items.filter(i => i.severity === "high").length,
    overdueActionCount: items.filter(i => i.type === "overdue_action").length,
    awaitingReviewCount: items.filter(
      i => i.type === "awaiting_review" || i.type === "governance_review"
    ).length,
    blockedCount: items.filter(i => i.type === "blocked").length,
  };
}

export async function getOperationalHealth(options?: {
  includeTestMode?: boolean;
  user?: User | null;
}): Promise<OperationalHealthSummary> {
  const generatedAt = new Date().toISOString();
  let database: OperationalHealthSummary["application"]["database"] = "unknown";
  try {
    const db = await getDb();
    if (!db) {
      database = "down";
    } else {
      await db.select().from(meetingSubmissions).limit(1);
      database = "ok";
    }
  } catch {
    database = "down";
  }

  let operational: OperationalHealthSummary["operational"] = {
    attentionCount: 0,
    criticalCount: 0,
    highCount: 0,
    overdueActionCount: 0,
    awaitingReviewCount: 0,
    blockedCount: 0,
  };

  if (database === "ok" && options?.user) {
    try {
      const items = await scanOperationalAttention(options.user, {
        includeTestMode: options?.includeTestMode ?? false,
      });
      operational = summarizeAttention(items);
    } catch {
      // attention scan failure does not mark API down
    }
  }

  return {
    application: {
      api: "ok",
      database,
    },
    operational,
    generatedAt,
  };
}
