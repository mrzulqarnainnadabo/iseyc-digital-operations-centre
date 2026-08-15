import { describe, expect, it } from "vitest";
import { canManageMediaDrafts, canMarkContentPublished, canReviewMediaDraft, canViewPresidentialBrief, mediaDraftStatusFor } from "./guards";

describe("Digital Operations Centre safeguards", () => {
  it("limits the Presidential Command Brief to presidential roles", () => {
    expect(canViewPresidentialBrief("national_president")).toBe(true);
    expect(canViewPresidentialBrief("presidential_council")).toBe(true);
    expect(canViewPresidentialBrief("officer")).toBe(false);
  });

  it("requires authorised officer membership for media drafting", () => {
    expect(canManageMediaDrafts(true, "officer")).toBe(true);
    expect(canManageMediaDrafts(false, "officer")).toBe(false);
    expect(canManageMediaDrafts(true, "member")).toBe(false);
  });

  it("keeps publication unavailable to every automated path", () => {
    expect(canMarkContentPublished()).toBe(false);
    expect(canReviewMediaDraft("admin", true)).toBe(true);
    expect(canReviewMediaDraft("user", true)).toBe(false);
  });

  it("withholds risky or unapproved material from public-ready content", () => {
    expect(mediaDraftStatusFor("approved_external", false)).toBe("draft_ready");
    expect(mediaDraftStatusFor("pending_confirmation", false)).toBe("source_pending_approval");
    expect(mediaDraftStatusFor("restricted", false)).toBe("withheld_for_governance_review");
    expect(mediaDraftStatusFor("approved_external", true)).toBe("withheld_for_governance_review");
  });
});
