import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

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

function claimsFromPayload(payload: JWTPayload): SupabaseAccessTokenClaims | null {
  const sub = payload.sub;
  if (!isNonEmptyString(sub)) {
    console.warn("[Auth] Supabase token missing sub claim");
    return null;
  }

  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : null,
    user_metadata:
      (payload.user_metadata as SupabaseAccessTokenClaims["user_metadata"]) ?? null,
    app_metadata:
      (payload.app_metadata as SupabaseAccessTokenClaims["app_metadata"]) ?? null,
  };
}

/** Legacy HS256 secret (still works for older tokens). */
async function verifyWithLegacySecret(token: string): Promise<SupabaseAccessTokenClaims | null> {
  if (!ENV.supabaseJwtSecret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(ENV.supabaseJwtSecret), {
      algorithms: ["HS256"],
    });
    return claimsFromPayload(payload);
  } catch {
    return null;
  }
}

/**
 * New Supabase JWT Signing Keys (ECC / ES256 etc.) are verified via the
 * project's JWKS endpoint. This is the path for tokens issued after the
 * migration away from the single Legacy JWT Secret.
 */
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (_jwks) return _jwks;
  const base = ENV.supabaseUrl.replace(/\/$/, "");
  if (!base) {
    console.error(
      "[Auth] SUPABASE_URL (or VITE_SUPABASE_URL) is not set — cannot verify ES256 tokens via JWKS."
    );
    return null;
  }
  _jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  return _jwks;
}

async function verifyWithJwks(token: string): Promise<SupabaseAccessTokenClaims | null> {
  const jwks = getJwks();
  if (!jwks) return null;
  try {
    const { payload } = await jwtVerify(token, jwks);
    return claimsFromPayload(payload);
  } catch (error) {
    console.warn("[Auth] JWKS token verification failed", String(error));
    return null;
  }
}

async function verifySupabaseAccessToken(
  token: string
): Promise<SupabaseAccessTokenClaims | null> {
  // Prefer JWKS (new ECC keys). Fall back to legacy HS256 secret.
  const fromJwks = await verifyWithJwks(token);
  if (fromJwks) return fromJwks;

  const fromLegacy = await verifyWithLegacySecret(token);
  if (fromLegacy) return fromLegacy;

  console.warn(
    "[Auth] Supabase token verification failed for both JWKS and legacy HS256 secret"
  );
  return null;
}

/**
 * Authenticate a request against a Supabase Auth access token (sent as
 * `Authorization: Bearer <access_token>` by the browser client — see
 * client/src/lib/supabaseClient.ts and client/src/main.tsx).
 *
 * On first sign-in for a given Supabase user, a corresponding row is
 * auto-provisioned in our own `users` table (default docRole="member",
 * isAuthorizedOfficer=false) — an ISEYC administrator or the National
 * President must then grant elevated access via Officer Access, exactly as
 * before. The single exception is ENV.ownerAuthUserId, which is bootstrapped
 * straight to National President on first sign-in (see server/db.ts).
 */
export async function authenticateSupabaseRequest(req: Request): Promise<User> {
  const token = extractBearerToken(req);
  if (!token) {
    throw ForbiddenError("Missing Supabase access token");
  }

  const claims = await verifySupabaseAccessToken(token);
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
