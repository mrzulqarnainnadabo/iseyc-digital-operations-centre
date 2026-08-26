import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateSupabaseRequest } from "./supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const authHeader = opts.req.headers.authorization;
  const hasBearer =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  const tokenLen = hasBearer ? authHeader.slice(7).length : 0;

  try {
    user = await authenticateSupabaseRequest(opts.req);
    console.log(`[Auth] OK userId=${user.id} authUserId=${user.authUserId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Log full error object fields when available (postgres.js often puts code/detail on the error)
    const anyErr = error as Error & { code?: string; detail?: string; cause?: unknown };
    const extra = [
      anyErr.code ? `code=${anyErr.code}` : null,
      anyErr.detail ? `detail=${anyErr.detail}` : null,
      anyErr.cause ? `cause=${String(anyErr.cause)}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    console.warn(
      `[Auth] FAIL hasBearer=${hasBearer} tokenLen=${tokenLen} reason=${message}${extra ? " " + extra : ""}`
    );
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
