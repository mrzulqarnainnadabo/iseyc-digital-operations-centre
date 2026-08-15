import { describe, expect, it } from "vitest";
import { canTransitionCommandBrief, mediaDraftPersistenceUpdate, mediaReviewPersistenceUpdate } from "./lifecycle";

describe("DOC service lifecycle safeguards", () => {
  it("permits only controlled Command Brief lifecycle transitions", () => {
    expect(canTransitionCommandBrief("source_pending", "draft_ready")).toBe(true);
    expect(canTransitionCommandBrief("draft_ready", "under_review")).toBe(true);
    expect(canTransitionCommandBrief("under_review", "approved_for_internal_use")).toBe(true);
    expect(canTransitionCommandBrief("source_pending", "approved_for_internal_use")).toBe(false);
    expect(canTransitionCommandBrief("approved_for_internal_use", "draft_ready")).toBe(false);
  });

  it("persists generated and reviewed media content as never published", () => {
    expect(mediaDraftPersistenceUpdate({ xDraft: "draft" }, "draft_ready")).toMatchObject({ status: "draft_ready", publicationPerformed: false });
    expect(mediaReviewPersistenceUpdate("approved_for_publication", 9)).toMatchObject({ status: "approved_for_publication", requiredReviewerUserId: 9, publicationPerformed: false });
  });
});
