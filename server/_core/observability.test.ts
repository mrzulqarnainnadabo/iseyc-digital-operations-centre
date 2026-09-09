import { describe, expect, it } from "vitest";
import { createRequestId, getRequestId, REQUEST_ID_HEADER } from "./observability";

describe("request observability", () => {
  it("creates a UUID request id", () => {
    const id = createRequestId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("normalizes an incoming request id header", () => {
    expect(getRequestId("  abc-123  ")).toBe("abc-123");
    expect(getRequestId(["abc-123", "other"])).toBe("abc-123");
    expect(getRequestId("   ")).toBeUndefined();
    expect(getRequestId(undefined)).toBeUndefined();
  });

  it("uses a stable response header name", () => {
    expect(REQUEST_ID_HEADER).toBe("X-Request-Id");
  });
});
