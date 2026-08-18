import { describe, expect, it } from "vitest";
import { APPROVED_GRASSROOTS_TIERS, APPROVED_RESPONSIBILITY_PILLARS } from "./approvedTopology";

describe("approved ISEYC community topology", () => {
  it("uses exactly the confirmed four-tier grassroots hierarchy", () => {
    expect(APPROVED_GRASSROOTS_TIERS).toEqual([
      "Street Representative",
      "Line Coordinator",
      "Ward Coordinator",
      "Central Leadership",
    ]);
  });

  it("uses exactly the confirmed seven Responsibility Pillars", () => {
    expect(APPROVED_RESPONSIBILITY_PILLARS).toEqual([
      "Safety & Emergency Response",
      "Health & Wellbeing",
      "Education & Capacity Building",
      "Economic Linkages & Livelihoods",
      "Sanitation & Environment",
      "Data, Intelligence & Documentation",
      "Community Voice & Participation",
    ]);
  });
});
