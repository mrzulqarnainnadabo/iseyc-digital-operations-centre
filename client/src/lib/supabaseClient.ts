import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Auth] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Sign-in will not work until these are set — see .env.example."
  );
}

// The Supabase client persists the session (access_token + refresh_token) in
// localStorage and refreshes it automatically. We read the current access
// token in client/src/main.tsx to attach it to every tRPC request.
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
