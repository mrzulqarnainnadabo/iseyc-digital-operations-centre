export function canConfirmParticipation(confirmedAt: Date | null) {
  return !confirmedAt;
}

export function canApproveMentorship(status: string) {
  return status === "requested";
}

export function canRecordMentorshipCheckIn(input: { status: string; menteeUserId: number; mentorUserId: number | null; actorUserId: number }) {
  return input.status === "active" && [input.menteeUserId, input.mentorUserId].includes(input.actorUserId);
}
