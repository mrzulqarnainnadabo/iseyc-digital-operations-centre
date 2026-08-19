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

  try {
    user = await authenticateSupabaseRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures (auth.me, etc.).
    // Note: the scheduled meeting-fallback cron callback is NOT authenticated
    // here — it's a plain Express route (not tRPC) verified separately by
    // server/_core/sdk.ts's cronAuth. See server/_core/index.ts.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
