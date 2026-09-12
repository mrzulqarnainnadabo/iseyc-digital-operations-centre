import { describe, expect, it } from "vitest";
import { deriveNextStep } from "./journey";

describe("deriveNextStep", () => {
  it("asks for profile consent first", () => {
    const step = deriveNextStep({
      hasActiveConsent: false,
      hasFocus: false,
      hasGrowthPlan: false,
      pendingParticipationCount: 0,
      mentorshipStatus: "none",
      hasCheckIn: false,
    });
    expect(step.code).toBe("complete_profile");
  });

  it("prioritises pending confirmation over mentorship noise", () => {
    const step = deriveNextStep({
      hasActiveConsent: true,
      hasFocus: true,
      hasGrowthPlan: true,
      pendingParticipationCount: 2,
      mentorshipStatus: "requested",
      hasCheckIn: false,
    });
    expect(step.code).toBe("await_confirmation");
  });

  it("suggests check-in when mentorship is active without check-ins", () => {
    const step = deriveNextStep({
      hasActiveConsent: true,
      hasFocus: true,
      hasGrowthPlan: true,
      pendingParticipationCount: 0,
      mentorshipStatus: "active",
      hasCheckIn: false,
    });
    expect(step.code).toBe("first_check_in");
  });
});
