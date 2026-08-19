export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Supabase Auth (Phase 2). Access tokens are verified locally against this
  // secret (Supabase dashboard -> Project Settings -> API -> JWT Secret) so
  // no network round-trip is needed per request.
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
