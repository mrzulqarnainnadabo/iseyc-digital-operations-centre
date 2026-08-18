export type ChamberSessionStatus = "draft" | "scheduled" | "open" | "closed" | "cancelled" | "archived";
export type ChamberSessionType = "internal_meeting" | "visitor_session" | "seminar";

const allowedTransitions: Record<ChamberSessionStatus, ChamberSessionStatus[]> = {
  draft: ["scheduled", "cancelled", "archived"],
  scheduled: ["open", "cancelled", "archived"],
  open: ["closed"],
  closed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export function canTransitionChamberSession(from: ChamberSessionStatus, to: ChamberSessionStatus) {
  return allowedTransitions[from].includes(to);
}

export function canUseVisitorAdmission(sessionType: ChamberSessionType) {
  return sessionType === "visitor_session" || sessionType === "seminar";
}

export function isSameChamberScope(sessionIsTestMode: boolean, recordIsTestMode: boolean) {
  return sessionIsTestMode === recordIsTestMode;
}

export function isChamberManager(input: { chairUserId: number; createdByUserId: number; actorUserId: number; actorRole: "user" | "admin"; actorDocRole: string }) {
  return input.actorRole === "admin" || input.actorDocRole === "national_president" || input.chairUserId === input.actorUserId || input.createdByUserId === input.actorUserId;
}

export function officialPositionForRole(docRole: string) {
  const positions: Record<string, string> = {
    national_president: "National President",
    presidential_council: "Presidential Council",
    administrator: "Administrator",
    officer: "ISEYC Officer",
    member: "ISEYC Member",
  };
  return positions[docRole] || "ISEYC Member";
}
