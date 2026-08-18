import { describe, expect, it } from "vitest";
import { canGenerateChamberAudio, CHAMBER_DOCUMENT_INTELLIGENCE_OUTPUT_SECTIONS, CHAMBER_DOCUMENT_INTELLIGENCE_SYSTEM_PROMPT } from "./documentIntelligence";

describe("Digital Chamber document intelligence controls", () => {
  it("keeps every required explanatory section in the controlled output contract", () => {
    expect(CHAMBER_DOCUMENT_INTELLIGENCE_OUTPUT_SECTIONS).toEqual([
      "Executive Summary",
      "Key Points",
      "Institutional Implications",
      "Suggested Discussion Questions",
      "Source Traceability",
      "Review Flags",
    ]);
    expect(CHAMBER_DOCUMENT_INTELLIGENCE_SYSTEM_PROMPT).toContain("DRAFT — HUMAN REVIEW REQUIRED");
  });

  it("permits audio explanation only after source confirmation and human approval of the text draft", () => {
    expect(canGenerateChamberAudio({ textReviewStatus: "draft", sourceSetConfirmed: true, isTestMode: false })).toBe(false);
    expect(canGenerateChamberAudio({ textReviewStatus: "approved_for_audio", sourceSetConfirmed: false, isTestMode: false })).toBe(false);
    expect(canGenerateChamberAudio({ textReviewStatus: "approved_for_audio", sourceSetConfirmed: true, isTestMode: false })).toBe(true);
  });
});
