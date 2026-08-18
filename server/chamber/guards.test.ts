import { describe, expect, it } from "vitest";
import { canTransitionChamberSession, canUseVisitorAdmission, isChamberManager, isSameChamberScope, officialPositionForRole } from "./guards";

describe("Digital Chamber safeguards", () => {
  it("permits only the governed session-state progression", () => {
    expect(canTransitionChamberSession("draft", "scheduled")).toBe(true);
    expect(canTransitionChamberSession("scheduled", "open")).toBe(true);
    expect(canTransitionChamberSession("open", "closed")).toBe(true);
    expect(canTransitionChamberSession("draft", "open")).toBe(false);
    expect(canTransitionChamberSession("closed", "open")).toBe(false);
  });

  it("restricts visitor admission to visitor sessions and seminars", () => {
    expect(canUseVisitorAdmission("visitor_session")).toBe(true);
    expect(canUseVisitorAdmission("seminar")).toBe(true);
    expect(canUseVisitorAdmission("internal_meeting")).toBe(false);
  });

  it("keeps live and test Chamber records in separate scopes", () => {
    expect(isSameChamberScope(false, false)).toBe(true);
    expect(isSameChamberScope(true, true)).toBe(true);
    expect(isSameChamberScope(false, true)).toBe(false);
    expect(isSameChamberScope(true, false)).toBe(false);
  });

  it("limits Chamber management to the Chair, creator, authorised administrator, or National President", () => {
    expect(isChamberManager({ chairUserId: 4, createdByUserId: 4, actorUserId: 4, actorRole: "user", actorDocRole: "officer" })).toBe(true);
    expect(isChamberManager({ chairUserId: 4, createdByUserId: 4, actorUserId: 9, actorRole: "admin", actorDocRole: "administrator" })).toBe(true);
    expect(isChamberManager({ chairUserId: 4, createdByUserId: 4, actorUserId: 8, actorRole: "user", actorDocRole: "national_president" })).toBe(true);
    expect(isChamberManager({ chairUserId: 4, createdByUserId: 4, actorUserId: 7, actorRole: "user", actorDocRole: "officer" })).toBe(false);
  });

  it("uses role-sourced official position names rather than inferred labels", () => {
    expect(officialPositionForRole("national_president")).toBe("National President");
    expect(officialPositionForRole("presidential_council")).toBe("Presidential Council");
    expect(officialPositionForRole("officer")).toBe("ISEYC Officer");
  });
});
