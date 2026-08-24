export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Supabase project URL + anon key (used by server-side auth.getUser).
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "",
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",

  // Legacy HS256 JWT secret (optional fallback).
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",

  // The Supabase auth user id (UUID) of the institution's National President
  // account. On first sign-in this account is automatically bootstrapped
  // with docRole="national_president", isAuthorizedOfficer=true, role="admin".
  ownerAuthUserId: process.env.OWNER_AUTH_USER_ID ?? "",

  // --- Legacy Manus Forge config -------------------------------------------
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
