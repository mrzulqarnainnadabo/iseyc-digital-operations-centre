import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("fs", () => ({ default: { promises: { readFile: mocks.readFile } } }));

import { sendStaticIndex } from "./vite";

describe("production static document delivery", () => {
  it("sends the index bootstrap as a complete HTML response instead of a streamed static index", async () => {
    mocks.readFile.mockResolvedValue("<!doctype html><title>ISEYC Digital Operations Centre</title>");
    const send = vi.fn();
    const type = vi.fn(() => ({ send }));
    const status = vi.fn(() => ({ type }));
    await sendStaticIndex({ status }, "/app/dist/public");
    expect(mocks.readFile).toHaveBeenCalledWith("/app/dist/public/index.html", "utf-8");
    expect(status).toHaveBeenCalledWith(200);
    expect(type).toHaveBeenCalledWith("html");
    expect(send).toHaveBeenCalledWith("<!doctype html><title>ISEYC Digital Operations Centre</title>");
  });
});
