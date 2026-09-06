import { createClient } from "@supabase/supabase-js";

/** Strip BOM / zero-width / smart punctuation that break fetch headers (ISO-8859-1). */
function cleanEnv(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2018\u2019\u201C\u201D]/g, "")
    .replace(/\u2026/g, "")
    .trim();
}

const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Auth] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Sign-in will not work until these are set — see .env.example."
  );
}

if (supabaseAnonKey && /[^\x00-\xFF]/.test(supabaseAnonKey)) {
  console.error(
    "[Auth] VITE_SUPABASE_ANON_KEY still contains non-ASCII characters after cleaning. Re-paste the key from Supabase → Settings → API."
  );
}

// Session is persisted in localStorage; access token is also mirrored in authToken.ts
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
