import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateSupabaseRequest } from "./supabaseAuth";
import { REQUEST_ID_HEADER } from "./observability";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const requestId = opts.req.header(REQUEST_ID_HEADER) ?? "-";

  try {
    user = await authenticateSupabaseRequest(opts.req);
    console.log(`[Auth] id=${requestId} result=ok userId=${user.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown authentication error";
    console.warn(`[Auth] id=${requestId} result=fail reason=${message}`);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
