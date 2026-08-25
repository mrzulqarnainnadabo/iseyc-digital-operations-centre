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

  const hasBearer =
    typeof opts.req.headers.authorization === "string" &&
    opts.req.headers.authorization.startsWith("Bearer ");

  try {
    user = await authenticateSupabaseRequest(opts.req);
    console.log(`[Auth] OK userId=${user.id} authUserId=${user.authUserId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[Auth] FAIL hasBearer=${hasBearer} reason=${message}`
    );
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
