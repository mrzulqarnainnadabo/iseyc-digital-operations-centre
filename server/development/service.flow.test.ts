import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { approveMentorship, confirmCommunityAffiliation, confirmParticipationRecord, recordMentorshipCheckIn, requestMentorship, submitParticipation } from "./service";

function makeDb(record: unknown, updates: Array<Record<string, unknown>>, inserts: Array<Record<string, unknown>>) {
  const limit = vi.fn(async () => [record]);
  const where = vi.fn(() => ({ limit }));
  return {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })),
    update: vi.fn(() => ({ set: vi.fn((payload: Record<string, unknown>) => { updates.push(payload); return { where: vi.fn(async () => undefined) }; }) })),
    insert: vi.fn(() => ({ values: vi.fn((payload: Record<string, unknown>) => { inserts.push(payload); return Object.assign(Promise.resolve([{ id: 91 }]), { returning: vi.fn(async () => [{ id: 91 }]) }); }) })),
  } as any;
}

function makeWorkflowDb(records: unknown[][], updates: Array<Record<string, unknown>>, inserts: Array<Record<string, unknown>>) {
  let read = 0;
  const select = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => records[read++] || []) })) })) }));
  return {
    select,
    update: vi.fn(() => ({ set: vi.fn((payload: Record<string, unknown>) => { updates.push(payload); return { where: vi.fn(async () => undefined) }; }) })),
    insert: vi.fn(() => ({ values: vi.fn((payload: Record<string, unknown>) => {
      inserts.push(payload);
      const row = { id: 100 + inserts.length };
      const result = Promise.resolve([row]) as Promise<Array<{ id: number }>> & { returning?: (input: unknown) => Promise<Array<{ id: number }>>; onConflictDoUpdate?: (input: unknown) => Promise<Array<{ id: number }>> };
      result.returning = vi.fn(async () => [row]);
      result.onConflictDoUpdate = vi.fn(async () => [row]);
      return result;
    }) })),
  } as any;
}

describe("development continuity service flows", () => {
  beforeEach(() => mocks.getDb.mockReset());

  it("confirms one pending participation record through the accountable human path", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    mocks.getDb.mockResolvedValue(makeDb({ id: 13, confirmedAt: null }, updates, inserts));
    await confirmParticipationRecord({ participationId: 13, confirmedByUserId: 7 });
    expect(updates[0]).toMatchObject({ confirmedByUserId: 7, confirmedAt: expect.any(Date) });
  });

  it("activates a mentorship relationship only through a requested-state approval", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    mocks.getDb.mockResolvedValue(makeDb({ id: 21, status: "requested", agreedFocus: "Community coordination" }, updates, inserts));
    await approveMentorship({ relationshipId: 21, mentorUserId: 8, approvedByUserId: 7 });
    expect(updates[0]).toMatchObject({ mentorUserId: 8, approvedByUserId: 7, status: "active", approvedAt: expect.any(Date) });
  });

  it("denies a check-in attempt from a person outside the agreed mentorship relationship", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    mocks.getDb.mockResolvedValue(makeDb({ id: 31, status: "active", menteeUserId: 4, mentorUserId: 8 }, updates, inserts));
    await expect(recordMentorshipCheckIn({ relationshipId: 31, actorUserId: 9, nextStep: "Attempted bypass" })).rejects.toThrow("active, human-approved mentorship relationship");
    expect(inserts).toHaveLength(0);
  });

  it("persists an authorized mentor or mentee check-in against the active relationship", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    mocks.getDb.mockResolvedValue(makeDb({ id: 31, status: "active", menteeUserId: 4, mentorUserId: 8 }, updates, inserts));
    const result = await recordMentorshipCheckIn({ relationshipId: 31, actorUserId: 8, mentorGuidance: "Continue with the agreed next action." });
    expect(result).toEqual({ id: 91 });
    expect(inserts[0]).toMatchObject({ relationshipId: 31, recordedByUserId: 8, mentorGuidance: "Continue with the agreed next action.", checkInDate: expect.any(Date) });
  });

  it("exercises the complete member-to-administrator continuity workflow without inferring confirmation or mentorship approval", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const activeProfile = { userId: 4, consentStatus: "active" };
    const pendingParticipation = { id: 101, userId: 4, confirmedAt: null };
    const requestedRelationship = { id: 102, menteeUserId: 4, status: "requested", agreedFocus: "Community coordination" };
    const activeRelationship = { ...requestedRelationship, status: "active", mentorUserId: 8 };
    mocks.getDb.mockResolvedValue(makeWorkflowDb([[activeProfile], [pendingParticipation], [activeProfile], [], [requestedRelationship], [activeRelationship]], updates, inserts));

    const participation = await submitParticipation({ userId: 4, participationType: "community_contribution", title: "Reviewed community contribution", detail: "Awaiting accountable confirmation." });
    await confirmParticipationRecord({ participationId: participation.id, confirmedByUserId: 7 });
    const mentorship = await requestMentorship({ userId: 4, agreedFocus: "Community coordination" });
    await approveMentorship({ relationshipId: mentorship.id, mentorUserId: 8, approvedByUserId: 7 });
    const checkIn = await recordMentorshipCheckIn({ relationshipId: mentorship.id, actorUserId: 8, mentorGuidance: "Continue with the agreed next action." });

    expect(participation).toEqual({ id: 102, status: "awaiting_human_confirmation" });
    expect(mentorship).toEqual({ id: 104, status: "requested" });
    expect(checkIn).toEqual({ id: 105 });
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ confirmedByUserId: 7, confirmedAt: expect.any(Date) }),
      expect.objectContaining({ mentorUserId: 8, approvedByUserId: 7, status: "active", approvedAt: expect.any(Date) }),
    ]));
    expect(inserts).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 4, participationType: "community_contribution" }),
      expect.objectContaining({ menteeUserId: 4, status: "requested" }),
      expect.objectContaining({ relationshipId: 104, recordedByUserId: 8, mentorGuidance: "Continue with the agreed next action." }),
    ]));
  });

  it("confirms only an active-consent, self-declared affiliation against an exact approved tier", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const affiliation = { id: 41, userId: 4, tierId: 1, affiliationStatus: "self_declared" };
    const profile = { userId: 4, consentStatus: "active" };
    const tier = { id: 1, name: "Street Representative", isActive: true };
    mocks.getDb.mockResolvedValue(makeWorkflowDb([[affiliation], [profile], [tier]], updates, inserts));
    await expect(confirmCommunityAffiliation({ affiliationId: 41, confirmedByUserId: 7 })).resolves.toBeUndefined();
    expect(updates).toEqual([expect.objectContaining({ affiliationStatus: "confirmed", confirmedByUserId: 7, confirmedAt: expect.any(Date) })]);
  });

  it("blocks affiliation confirmation after consent withdrawal before tier or update access", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const affiliation = { id: 41, userId: 4, tierId: 1, affiliationStatus: "self_declared" };
    const withdrawnProfile = { userId: 4, consentStatus: "withdrawn" };
    mocks.getDb.mockResolvedValue(makeWorkflowDb([[affiliation], [withdrawnProfile]], updates, inserts));
    await expect(confirmCommunityAffiliation({ affiliationId: 41, confirmedByUserId: 7 })).rejects.toThrow("consent must be active");
    expect(updates).toHaveLength(0);
  });
});
