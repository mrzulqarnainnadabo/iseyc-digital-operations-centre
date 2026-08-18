export type DevelopmentProfileConsentStatus = "not_requested" | "active" | "withdrawn";

export function profileConsentPolicy(consentStatus: DevelopmentProfileConsentStatus) {
  const isActive = consentStatus === "active";
  return {
    isActive,
    profileStatus: isActive ? "active" as const : "paused" as const,
    consentVersion: isActive ? "ISEYC-DOC-DEVELOPMENT-1.0" : null,
    shouldRetainVoluntaryDevelopmentData: isActive,
    shouldClearCommunitySelections: !isActive,
  };
}
