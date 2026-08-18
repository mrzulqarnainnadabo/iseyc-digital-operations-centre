import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("fs", () => ({ default: { promises: { readFile: mocks.readFile } } }));

import { resolveStaticDistPath, sendStaticFile, sendStaticIndex } from "./vite";

describe("production static document delivery", () => {
  it("sends the index bootstrap as a complete HTML response instead of a streamed static index", async () => {
    const indexHtml = Buffer.from("<!doctype html><title>ISEYC Digital Operations Centre</title>");
    mocks.readFile.mockResolvedValue(indexHtml);
    const end = vi.fn();
    const set = vi.fn(() => ({ end }));
    const status = vi.fn(() => ({ set }));
    await sendStaticIndex({ status }, "/app/dist/public");
    expect(mocks.readFile).toHaveBeenCalledWith("/app/dist/public/index.html");
    expect(status).toHaveBeenCalledWith(200);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "text/html; charset=utf-8", "Content-Length": indexHtml.byteLength }));
    expect(end).toHaveBeenCalledWith(indexHtml);
  });

  it("sets an explicit JavaScript MIME type and byte length for buffered production assets", async () => {
    mocks.readFile.mockResolvedValue(Buffer.from("console.log('ISEYC')"));
    const end = vi.fn();
    const set = vi.fn(() => ({ end }));
    const status = vi.fn(() => ({ set }));
    await sendStaticFile({ status }, "/app/dist/public/assets/index.js");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "application/javascript; charset=utf-8", "Content-Length": 20 }));
    expect(end).toHaveBeenCalledWith(Buffer.from("console.log('ISEYC')"));
  });

  it("prefers the active project build directory over an adjacent stale runtime directory", () => {
    const resolved = resolveStaticDistPath("/workspace/iseeyc", "/workspace/iseeyc/dist", filePath => filePath === "/workspace/iseeyc/dist/public/index.html");
    expect(resolved).toBe("/workspace/iseeyc/dist/public");
  });
});
