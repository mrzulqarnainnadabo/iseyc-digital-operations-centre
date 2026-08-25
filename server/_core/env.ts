function stripInvisible(value: string): string {
  // Remove BOM, zero-width chars, and common paste garbage from mobile.
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function isAsciiHeaderSafe(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 255) return false;
  }
  return true;
}

function readEnv(name: string, fallbackName?: string): string {
  const raw =
    process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "";
  return stripInvisible(raw);
}

const supabaseUrl = readEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
const supabaseAnonKey = readEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
const databaseUrl = readEnv("DATABASE_URL");

// Detect bad pastes (Unicode ellipsis … is char 8230 — common on mobile copy).
if (supabaseAnonKey && !isAsciiHeaderSafe(supabaseAnonKey)) {
  console.error(
    "[Env] SUPABASE_ANON_KEY contains non-ASCII characters (e.g. \u2026). " +
      "Re-paste the key from Supabase Dashboard \u2192 Settings \u2192 API. " +
      "Do not use truncated text with \u2026"
  );
}
if (supabaseUrl && !isAsciiHeaderSafe(supabaseUrl)) {
  console.error(
    "[Env] SUPABASE_URL contains non-ASCII characters. Re-paste the project URL."
  );
}
if (databaseUrl && !/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  console.error(
    "[Env] DATABASE_URL does not look like a Postgres URI. " +
      "It must start with postgresql:// or postgres:// \u2014 not placeholder text."
  );
}

export const ENV = {
  databaseUrl,
  isProduction: process.env.NODE_ENV === "production",

  // Supabase project URL + anon key (used by server-side /auth/v1/user).
  supabaseUrl,
  supabaseAnonKey,

  // Legacy HS256 JWT secret (optional fallback).
  supabaseJwtSecret: readEnv("SUPABASE_JWT_SECRET"),

  // The Supabase auth user id (UUID) of the institution's National President
  // account. On first sign-in this account is automatically bootstrapped
  // with docRole="national_president", isAuthorizedOfficer=true, role="admin".
  ownerAuthUserId: readEnv("OWNER_AUTH_USER_ID"),

  // --- Legacy Manus Forge config -------------------------------------------
  appId: readEnv("VITE_APP_ID"),
  cookieSecret: readEnv("JWT_SECRET"),
  oAuthServerUrl: readEnv("OAUTH_SERVER_URL"),
  forgeApiUrl: readEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: readEnv("BUILT_IN_FORGE_API_KEY"),
};
