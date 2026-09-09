/**
 * ISEYC Digital Operations Centre — Operational Intelligence types
 * Deterministic attention items for the Command surface.
 * AI must not invent these; they are derived from record state.
 */

export type AttentionSeverity = "critical" | "high" | "medium" | "low";

export type AttentionType =
  | "overdue_action"
  | "missing_owner"
  | "awaiting_review"
  | "blocked"
  | "awaiting_approval"
  | "stale"
  | "incomplete"
  | "draft_unconfirmed"
  | "governance_review";

export type RecommendedAction =
  | "review"
  | "approve"
  | "assign"
  | "follow_up"
  | "complete_information"
  | "investigate"
  | "monitor"
  | "confirm"
  | "escalate";

export type AttentionRecordKind =
  | "meeting_submission"
  | "meeting_action_item"
  | "command_brief"
  | "content_draft"
  | "chamber_session"
  | "chamber_document_intelligence";

export interface AttentionItem {
  id: string;
  type: AttentionType;
  severity: AttentionSeverity;
  recordKind: AttentionRecordKind;
  recordId: number;
  title: string;
  reason: string;
  recommendedAction: RecommendedAction;
  destination: string;
  isTestMode: boolean;
  detectedAt: string;
}

export interface OperationalHealthSummary {
  application: {
    api: "ok" | "degraded" | "down";
    database: "ok" | "degraded" | "down" | "unknown";
  };
  operational: {
    attentionCount: number;
    criticalCount: number;
    highCount: number;
    overdueActionCount: number;
    awaitingReviewCount: number;
    blockedCount: number;
  };
  generatedAt: string;
}
