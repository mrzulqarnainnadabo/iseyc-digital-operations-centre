export type CommandBriefStatus = "source_pending" | "draft_ready" | "under_review" | "approved_for_internal_use" | "withheld_for_review" | "archived";
export type ContentDraftStatus = "research_requested" | "source_pending_approval" | "draft_ready" | "revision_requested" | "approved_for_publication" | "withheld_for_governance_review" | "archived";

const commandBriefTransitions: Record<CommandBriefStatus, CommandBriefStatus[]> = {
  source_pending: ["draft_ready", "withheld_for_review"],
  draft_ready: ["under_review", "approved_for_internal_use", "withheld_for_review", "archived"],
  under_review: ["approved_for_internal_use", "withheld_for_review", "archived"],
  approved_for_internal_use: ["archived"],
  withheld_for_review: ["under_review", "archived"],
  archived: [],
};

export function canTransitionCommandBrief(current: CommandBriefStatus, next: CommandBriefStatus) {
  return commandBriefTransitions[current].includes(next);
}

export function assertCommandBriefTransition(current: CommandBriefStatus, next: CommandBriefStatus) {
  if (!canTransitionCommandBrief(current, next)) throw new Error(`Controlled Command Brief transition denied: ${current} to ${next}.`);
}

export function mediaDraftPersistenceUpdate(draftJson: unknown, status: ContentDraftStatus) {
  return { draftJson, status, publicationPerformed: false };
}

export function mediaReviewPersistenceUpdate(status: "revision_requested" | "approved_for_publication" | "withheld_for_governance_review", reviewerUserId: number) {
  return { status, requiredReviewerUserId: reviewerUserId, publicationPerformed: false };
}
