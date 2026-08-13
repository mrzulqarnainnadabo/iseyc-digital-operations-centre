import { describe, expect, it } from "vitest";
import { canAccessMeetingTracker, canConfirmDraftAction, canElevateToAuthoritative, canTransitionSubmission, isConsolidationEligible, isIsolatedTestRecord } from "./guards";

describe("meeting tracker safeguards", () => {
  it("waits until the consolidation window has elapsed", () => {
    const now = new Date("2026-08-13T10:00:00Z");
    expect(isConsolidationEligible(new Date("2026-08-13T10:12:00Z"), now)).toBe(false);
    expect(isConsolidationEligible(new Date("2026-08-13T09:59:59Z"), now)).toBe(true);
  });

  it("requires an administrator and an explicit draft status before authority can be granted", () => {
    expect(canElevateToAuthoritative("user", "draft_ready")).toBe(false);
    expect(canElevateToAuthoritative("admin", "pending_consolidation")).toBe(false);
    expect(canElevateToAuthoritative("admin", "draft_ready")).toBe(true);
  });

  it("prevents automatic or premature action confirmation", () => {
    expect(canConfirmDraftAction("admin", "draft_ready", "draft")).toBe(false);
    expect(canConfirmDraftAction("user", "approved", "draft")).toBe(false);
    expect(canConfirmDraftAction("admin", "approved", "confirmed")).toBe(false);
    expect(canConfirmDraftAction("admin", "approved", "draft")).toBe(true);
  });

  it("keeps test and live record operations isolated", () => {
    expect(isIsolatedTestRecord(true, false)).toBe(false);
    expect(isIsolatedTestRecord(false, true)).toBe(false);
    expect(isIsolatedTestRecord(true, true)).toBe(true);
  });

  it("allows only controlled record-status transitions used by the processing and review service", () => {
    expect(canTransitionSubmission("pending_consolidation", "processing")).toBe(true);
    expect(canTransitionSubmission("processing", "draft_ready")).toBe(true);
    expect(canTransitionSubmission("draft_ready", "under_review")).toBe(true);
    expect(canTransitionSubmission("under_review", "approved")).toBe(true);
    expect(canTransitionSubmission("pending_consolidation", "approved")).toBe(false);
    expect(canTransitionSubmission("approved", "under_review")).toBe(false);
  });

  it("requires explicit authorised-officer membership independently of a basic signed-in session", () => {
    expect(canAccessMeetingTracker(false)).toBe(false);
    expect(canAccessMeetingTracker(true)).toBe(true);
  });
});
