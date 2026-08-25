import { ForbiddenError } from "@shared/_core/errors";
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
 * Verify the browser access token by calling Supabase Auth directly:
 *   GET {SUPABASE_URL}/auth/v1/user
 * Headers: Authorization: Bearer <access_token>, apikey: <anon key>
 *
 * Works with both legacy JWT anon keys and new sb_publishable_ keys.
 */
async function verifyWithSupabaseUserApi(
  token: string
): Promise<SupabaseAccessTokenClaims | null> {
  const base = ENV.supabaseUrl.replace(/\/$/, "");
  const apiKey = ENV.supabaseAnonKey;

  if (!base || !apiKey) {
    console.error(
      "[Auth] Missing SUPABASE_URL or SUPABASE_ANON_KEY on server.",
      `urlSet=${Boolean(base)} keySet=${Boolean(apiKey)}`
    );
    return null;
  }

  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[Auth] /auth/v1/user failed status=${res.status} body=${body.slice(0, 300)}`
      );
      return null;
    }

    const u = (await res.json()) as {
      id?: string;
      email?: string;
      user_metadata?: { full_name?: string; name?: string } | null;
      app_metadata?: { provider?: string } | null;
    };

    if (!u?.id) {
      console.warn("[Auth] /auth/v1/user returned no user id");
      return null;
    }

    return {
      sub: u.id,
      email: u.email ?? null,
      user_metadata: u.user_metadata ?? null,
      app_metadata: u.app_metadata ?? null,
    };
  } catch (error) {
    console.warn("[Auth] /auth/v1/user request error:", String(error));
    return null;
  }
}

export async function authenticateSupabaseRequest(req: Request): Promise<User> {
  const token = extractBearerToken(req);
  if (!token) {
    throw ForbiddenError("Missing Supabase access token");
  }

  const claims = await verifyWithSupabaseUserApi(token);
  if (!claims) {
    throw ForbiddenError("Invalid or expired session");
  }

  const signedInAt = new Date();
  let user = await db.getUserByAuthUserId(claims.sub);

  if (!user) {
    const displayName =
      claims.user_metadata?.full_name || claims.user_metadata?.name || null;

    try {
      await db.upsertUser({
        authUserId: claims.sub,
        name: displayName,
        email: claims.email ?? null,
        loginMethod: claims.app_metadata?.provider ?? "email",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByAuthUserId(claims.sub);
    } catch (error) {
      console.error("[Auth] Failed to provision user in database:", String(error));
      throw ForbiddenError("Could not create institutional user record");
    }
  }

  if (!user) {
    throw ForbiddenError("User not found");
  }

  try {
    await db.upsertUser({
      authUserId: user.authUserId,
      lastSignedIn: signedInAt,
    });
  } catch (error) {
    console.warn("[Auth] Failed to update lastSignedIn:", String(error));
  }

  return user;
}
