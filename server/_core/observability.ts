/**
 * Small, dependency-free observability helpers shared by HTTP entry points.
 * Keep this module free of application/business logic so it can be reused by
 * Node and Vercel runtimes without changing request behaviour.
 */
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "X-Request-Id";

export function createRequestId(): string {
  return randomUUID();
}

export function getRequestId(headerValue: string | string[] | undefined): string | undefined {
  if (Array.isArray(headerValue)) return headerValue[0]?.trim() || undefined;
  const value = headerValue?.trim();
  return value || undefined;
}

export function logRequest(options: {
  requestId: string;
  method: string;
  path: string;
  authenticated: boolean;
  userId?: number | null;
}): void {
  const user = options.userId == null ? "-" : String(options.userId);
  console.log(
    `[Req] id=${options.requestId} method=${options.method} path=${options.path} auth=${options.authenticated ? "yes" : "no"} user=${user}`
  );
}
