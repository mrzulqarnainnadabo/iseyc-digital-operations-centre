import { describe, expect, it } from "vitest";
import { APPROVED_GRASSROOTS_TIERS, APPROVED_RESPONSIBILITY_PILLARS, assertApprovedTopologySelection } from "./approvedTopology";

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

  it("permits profile selection only when topology rows retain the exact approved institutional labels", () => {
    const tiers = APPROVED_GRASSROOTS_TIERS.map((name, index) => ({ id: index + 1, name }));
    const pillars = APPROVED_RESPONSIBILITY_PILLARS.map((name, index) => ({ id: index + 1, name }));
    expect(() => assertApprovedTopologySelection({ tiers, pillars, tierId: 1, pillarIds: [1, 7] })).not.toThrow();
    expect(() => assertApprovedTopologySelection({ tiers: [{ id: 1, name: "Street Lead" }], pillars, tierId: 1, pillarIds: [1] })).toThrow("approved ISEYC tier");
    expect(() => assertApprovedTopologySelection({ tiers, pillars: [{ id: 1, name: "Community Data" }], tierId: 1, pillarIds: [1] })).toThrow("approved ISEYC pillars");
  });
});
