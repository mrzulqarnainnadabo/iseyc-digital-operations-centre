export type DocRole = "member" | "officer" | "administrator" | "presidential_council" | "national_president";
export type ContentStatus = "research_requested" | "source_pending_approval" | "draft_ready" | "revision_requested" | "approved_for_publication" | "withheld_for_governance_review" | "archived";

export function canViewPresidentialBrief(role: DocRole) {
  return role === "national_president" || role === "presidential_council";
}

export function canManageMediaDrafts(isAuthorisedOfficer: boolean, role: DocRole) {
  return isAuthorisedOfficer && role !== "member";
}

export function canReviewMediaDraft(systemRole: "user" | "admin", isAuthorisedOfficer: boolean) {
  return systemRole === "admin" && isAuthorisedOfficer;
}

export function canMarkContentPublished() {
  return false;
}

export function mediaDraftStatusFor(sourceApprovalStatus: "approved_external" | "approved_internal" | "pending_confirmation" | "restricted", riskFlag: boolean): ContentStatus {
  if (riskFlag || sourceApprovalStatus === "restricted") return "withheld_for_governance_review";
  if (sourceApprovalStatus !== "approved_external") return "source_pending_approval";
  return "draft_ready";
}
