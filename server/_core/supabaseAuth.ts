import { ForbiddenError } from "@shared/_core/errors";
import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

type SupabaseAccessTokenClaims = {
  sub: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string } | null;
  app_metadata?: { provider?: string } | null;
};

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Official Supabase verification: pass the access token to auth.getUser().
 * This works for both legacy HS256 and new ECC (ES256) signing keys and does
 * not require us to manage JWKS or algorithm allow-lists.
 */
async function verifyWithSupabaseApi(
  token: string
): Promise<SupabaseAccessTokenClaims | null> {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    console.error(
      "[Auth] SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_* equivalents) must be set on the server."
    );
    return null;
  }

  try {
    const supabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      console.warn("[Auth] supabase.auth.getUser failed:", error?.message ?? "no user");
      return null;
    }

    const u = data.user;
    return {
      sub: u.id,
      email: u.email ?? null,
      user_metadata: (u.user_metadata as SupabaseAccessTokenClaims["user_metadata"]) ?? null,
      app_metadata: (u.app_metadata as SupabaseAccessTokenClaims["app_metadata"]) ?? null,
    };
  } catch (error) {
    console.warn("[Auth] supabase.auth.getUser threw:", String(error));
    return null;
  }
}

/**
 * Authenticate a request against a Supabase Auth access token (sent as
 * `Authorization: Bearer <access_token>` by the browser client).
 *
 * On first sign-in a row is auto-provisioned in our `users` table
 * (default docRole="member", isAuthorizedOfficer=false). An administrator
 * must then grant officer access. ENV.ownerAuthUserId is bootstrapped to
 * National President on first sign-in.
 */
export async function authenticateSupabaseRequest(req: Request): Promise<User> {
  const token = extractBearerToken(req);
  if (!token) {
    throw ForbiddenError("Missing Supabase access token");
  }

  const claims = await verifyWithSupabaseApi(token);
  if (!claims) {
    throw ForbiddenError("Invalid or expired session");
  }

  const signedInAt = new Date();
  let user = await db.getUserByAuthUserId(claims.sub);

  if (!user) {
    const displayName =
      claims.user_metadata?.full_name || claims.user_metadata?.name || null;

    await db.upsertUser({
      authUserId: claims.sub,
      name: displayName,
      email: claims.email ?? null,
      loginMethod: claims.app_metadata?.provider ?? "email",
      lastSignedIn: signedInAt,
    });
    user = await db.getUserByAuthUserId(claims.sub);
  }

  if (!user) {
    throw ForbiddenError("User not found");
  }

  await db.upsertUser({
    authUserId: user.authUserId,
    lastSignedIn: signedInAt,
  });

  return user;
}
