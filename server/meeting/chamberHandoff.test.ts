import { describe, expect, it } from "vitest";
import { assertChamberSourceOnlyFiles, createChamberTrackerDraftSubmission } from "./service";

describe("Chamber-to-Meeting source-only safeguards", () => {
  it("accepts only protected source-document fields for a Chamber handoff", () => {
    expect(() => assertChamberSourceOnlyFiles([{ originalName: "source.txt", mimeType: "text/plain", fileSizeBytes: 12, storageKey: "source", storageUrl: "/source", extractedText: "Source text" }])).not.toThrow();
  });

  it("rejects intelligence JSON or identifiers before a Chamber handoff can reach record or action processing", async () => {
    const sourceWithIntelligence = { originalName: "source.txt", mimeType: "text/plain", fileSizeBytes: 12, storageKey: "source", storageUrl: "/source", extractedText: "Source text", intelligenceDraftId: 71, draftJson: { executiveSummary: "Not a source" } };
    expect(() => assertChamberSourceOnlyFiles([sourceWithIntelligence])).toThrow("cannot enter a Meeting & Decision handoff");
    await expect(createChamberTrackerDraftSubmission({ chamberSessionId: 17, meetingTitle: "Controlled Chamber", sensitivity: "internal", isTestMode: true, submittedByUserId: 4, files: [sourceWithIntelligence] as any })).rejects.toThrow("cannot enter a Meeting & Decision handoff");
  });
});
