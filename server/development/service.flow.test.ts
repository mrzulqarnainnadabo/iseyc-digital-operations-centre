import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { approveMentorship, confirmParticipationRecord, recordMentorshipCheckIn } from "./service";

function makeDb(record: unknown, updates: Array<Record<string, unknown>>, inserts: Array<Record<string, unknown>>) {
  const limit = vi.fn(async () => [record]);
  const where = vi.fn(() => ({ limit }));
  return {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })),
    update: vi.fn(() => ({ set: vi.fn((payload: Record<string, unknown>) => { updates.push(payload); return { where: vi.fn(async () => undefined) }; }) })),
    insert: vi.fn(() => ({ values: vi.fn(async (payload: Record<string, unknown>) => { inserts.push(payload); return [{ insertId: 91 }]; }) })),
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
});
