import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { updateMyDevelopmentProfile } from "./service";

function makeDb() {
  const deletes: string[] = [];
  let reads = 0;
  const select = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => {
    const result = [
      [{ id: 1, name: "Street Representative", isActive: true, hierarchyOrder: 1 }],
      [{ id: 1, name: "Safety & Emergency Response", isActive: true, responsibilityOrder: 1 }],
      [{ id: 31 }, { id: 32 }],
      [{ userId: 4, consentStatus: "withdrawn", profileStatus: "paused" }],
      [], [], [], [], [], [],
    ][reads++] || [];
    Object.assign(result, { limit: vi.fn(async () => result), orderBy: vi.fn(async () => result) });
    return result;
  }) })) }));
  const del = vi.fn((table: { [key: string]: unknown }) => ({ where: vi.fn(async () => { deletes.push(String(Object.keys(table)[0] || "table")); }) }));
  const insertValues = vi.fn(() => ({ onConflictDoUpdate: vi.fn(async () => [{ id: 4 }]) }));
  return { db: { select, insert: vi.fn(() => ({ values: insertValues })), delete: del }, deletes } as any;
}

describe("developmental consent withdrawal", () => {
  it("clears voluntary community, participation, growth, and mentee-side mentorship history while retaining the paused consent record", async () => {
    const { db, deletes } = makeDb();
    mocks.getDb.mockResolvedValue(db);
    await updateMyDevelopmentProfile({ userId: 4, consentStatus: "withdrawn", visibilityLevel: "institutional_limited", developmentDirection: ["To be cleared"], developmentGoals: "To be cleared", mentoringPreference: "seeking_mentor", tierId: 1, pillarIds: [1] });
    expect(db.delete).toHaveBeenCalledTimes(6);
    expect(deletes).toHaveLength(6);
    expect(db.insert).toHaveBeenCalledWith(expect.anything());
  });
});
