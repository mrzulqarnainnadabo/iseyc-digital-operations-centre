import { describe, expect, it } from "vitest";
import { profileConsentPolicy } from "./consent";

describe("developmental profile consent controls", () => {
  it("retains member-selected developmental data only with active consent", () => {
    expect(profileConsentPolicy("active")).toMatchObject({
      isActive: true,
      profileStatus: "active",
      shouldRetainVoluntaryDevelopmentData: true,
      shouldClearCommunitySelections: false,
    });
  });

  it("clears voluntary development and community selections when consent is withdrawn", () => {
    expect(profileConsentPolicy("withdrawn")).toMatchObject({
      isActive: false,
      profileStatus: "paused",
      consentVersion: null,
      shouldRetainVoluntaryDevelopmentData: false,
      shouldClearCommunitySelections: true,
    });
  });
});
