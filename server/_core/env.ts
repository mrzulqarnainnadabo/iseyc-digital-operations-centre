export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Supabase project URL (used for JWKS verification of new ECC-signed tokens).
  // Prefer SUPABASE_URL; fall back to the Vite public URL if that is all that is set.
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "",

  // Legacy HS256 JWT secret (Supabase Dashboard -> API -> Legacy JWT Secret).
  // Still tried first for older tokens; new projects often issue ES256 tokens
  // which are verified via JWKS instead.
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",

  // The Supabase auth user id (UUID) of the institution's National President
  // account. On first sign-in this account is automatically bootstrapped
  // with docRole="national_president", isAuthorizedOfficer=true, role="admin".
  ownerAuthUserId: process.env.OWNER_AUTH_USER_ID ?? "",

  // --- Legacy Manus Forge config -------------------------------------------
  // Still required by server/_core/sdk.ts, which now ONLY verifies the
  // Meeting & Decision Tracker's scheduled fallback callback (cron). This is
  // scoped for full replacement in Phase 6 (Vercel Cron migration) — do not
  // remove until that phase lands.
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
