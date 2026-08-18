import { describe, expect, it } from "vitest";
import { civicAwarenessModel } from "../../shared/civicAwareness";

describe("Civic Brain awareness model", () => {
  it("uses the approved Civic Brain reference and all four national-awareness levels", () => {
    expect(civicAwarenessModel.civicBrainUrl).toBe("https://iseyc-civic-brain.vercel.app/");
    expect(civicAwarenessModel.awarenessLevels.map(item => item.title)).toEqual(["National Assembly", "Federal", "State", "Local"]);
  });

  it("requires source traceability, human approval, and a non-partisan public-education path", () => {
    const safeguards = civicAwarenessModel.safeguards.join(" ");
    expect(safeguards).toContain("No autonomous source collection");
    expect(safeguards).toContain("source reference");
    expect(safeguards).toContain("non-partisan");
    expect(safeguards).toContain("draft-only");
    expect(civicAwarenessModel.controlledFlow).toEqual(["Source capture", "Accountable review", "Plain-language draft", "Human approval", "Public education release"]);
  });
});
