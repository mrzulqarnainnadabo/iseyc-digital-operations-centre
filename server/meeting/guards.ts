export type SubmissionStatus =
  | "pending_consolidation"
  | "processing"
  | "draft_ready"
  | "under_review"
  | "approved"
  | "needs_human_review"
  | "blocked";

const allowedTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  pending_consolidation: ["processing", "needs_human_review", "blocked"],
  processing: ["draft_ready", "needs_human_review", "blocked"],
  draft_ready: ["under_review", "approved", "needs_human_review", "blocked"],
  under_review: ["approved", "needs_human_review", "blocked"],
  approved: [],
  needs_human_review: ["under_review", "approved", "blocked"],
  blocked: [],
};

export function canTransitionSubmission(current: SubmissionStatus, next: SubmissionStatus) {
  return allowedTransitions[current].includes(next);
}

export function assertTransitionSubmission(current: SubmissionStatus, next: SubmissionStatus) {
  if (!canTransitionSubmission(current, next)) {
    throw new Error(`Controlled transition denied: ${current} to ${next}.`);
  }
}

export function canAccessMeetingTracker(isAuthorizedOfficer: boolean) {
  return isAuthorizedOfficer;
}

export function isConsolidationEligible(eligibleAt: Date, now = new Date()) {
  return eligibleAt.getTime() <= now.getTime();
}

export function canElevateToAuthoritative(role: "user" | "admin", status: SubmissionStatus) {
  return role === "admin" && ["draft_ready", "under_review", "needs_human_review"].includes(status);
}

export function canConfirmDraftAction(
  role: "user" | "admin",
  submissionStatus: SubmissionStatus,
  confirmationStatus: "draft" | "confirmed",
) {
  return role === "admin" && submissionStatus === "approved" && confirmationStatus === "draft";
}

export function isIsolatedTestRecord(submissionIsTest: boolean, requestedIsTest: boolean) {
  return submissionIsTest === requestedIsTest;
}
