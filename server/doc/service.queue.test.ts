import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), eq: vi.fn() }));

vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("drizzle-orm", async importActual => {
  const actual = await importActual<typeof import("drizzle-orm")>();
  return { ...actual, eq: mocks.eq };
});

import { getContentQueue } from "./service";

describe("DOC live/test queue isolation", () => {
  it("filters Media AI Agent content queues independently by the requested test-mode boundary", async () => {
    const liveRecord = { id: 1, contentOwnerUserId: 5, isTestMode: false, title: "Live draft" };
    const testRecord = { id: 2, contentOwnerUserId: 5, isTestMode: true, title: "Test draft" };
    mocks.eq.mockImplementation((_column: unknown, value: unknown) => ({ value }));
    const where = vi.fn((condition: { value: boolean }) => ({ orderBy: vi.fn(async () => condition.value ? [testRecord] : [liveRecord]) }));
    mocks.getDb.mockResolvedValue({ select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })) });

    const liveQueue = await getContentQueue({ id: 5, role: "user" }, false);
    const testQueue = await getContentQueue({ id: 5, role: "user" }, true);

    expect(liveQueue).toEqual([liveRecord]);
    expect(testQueue).toEqual([testRecord]);
    expect(mocks.eq).toHaveBeenNthCalledWith(1, expect.anything(), false);
    expect(mocks.eq).toHaveBeenNthCalledWith(2, expect.anything(), true);
  });
});
