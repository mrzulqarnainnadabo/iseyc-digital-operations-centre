import { describe, expect, it } from "vitest";
import { intelligentDevelopmentEnvironment } from "../../shared/intelligentDevelopmentEnvironments";

describe("intelligent development environment standard", () => {
  it("defines departments as governed contribution environments rather than digital training centres", () => {
    expect(intelligentDevelopmentEnvironment.definition).toContain("intelligent development environment");
    expect(intelligentDevelopmentEnvironment.definition).toContain("not a digital training centre");
    expect(intelligentDevelopmentEnvironment.operatingElements.map(item => item.title)).toEqual([
      "Purpose-led contribution",
      "Guided practice",
      "Responsible intelligence",
      "Evidence of growth",
    ]);
  });

  it("preserves human review, non-partisanship, and non-autonomous member advancement", () => {
    expect(intelligentDevelopmentEnvironment.safeguards.join(" ")).toContain("accountable human review");
    expect(intelligentDevelopmentEnvironment.safeguards.join(" ")).toContain("partisan");
    expect(intelligentDevelopmentEnvironment.operatingElements[3].description).toContain("no system infers achievement or advancement autonomously");
  });
});
