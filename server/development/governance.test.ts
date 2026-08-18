import { describe, expect, it } from "vitest";
import { canApproveMentorship, canConfirmParticipation, canRecordMentorshipCheckIn } from "./governance";

describe("developmental governance safeguards", () => {
  it("allows an unconfirmed participation record to be confirmed once and blocks repeat confirmation", () => {
    expect(canConfirmParticipation(null)).toBe(true);
    expect(canConfirmParticipation(new Date())).toBe(false);
  });

  it("allows human mentorship approval only from the requested state", () => {
    expect(canApproveMentorship("requested")).toBe(true);
    expect(canApproveMentorship("active")).toBe(false);
    expect(canApproveMentorship("declined")).toBe(false);
  });

  it("allows check-ins only within an active relationship and only for the agreed mentor or mentee", () => {
    expect(canRecordMentorshipCheckIn({ status: "active", menteeUserId: 4, mentorUserId: 8, actorUserId: 4 })).toBe(true);
    expect(canRecordMentorshipCheckIn({ status: "active", menteeUserId: 4, mentorUserId: 8, actorUserId: 8 })).toBe(true);
    expect(canRecordMentorshipCheckIn({ status: "active", menteeUserId: 4, mentorUserId: 8, actorUserId: 9 })).toBe(false);
    expect(canRecordMentorshipCheckIn({ status: "requested", menteeUserId: 4, mentorUserId: 8, actorUserId: 4 })).toBe(false);
  });
});
