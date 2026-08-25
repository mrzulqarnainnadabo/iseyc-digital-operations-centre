/**
 * In-memory bridge for the current Supabase access token.
 *
 * tRPC's httpBatchLink headers() can race with localStorage persistence
 * right after sign-in (onAuthStateChange has the session, but a concurrent
 * getSession() sometimes still returns null). Keeping the token here makes
 * Authorization: Bearer reliable on every /api/trpc request.
 */
import { supabase } from "./supabaseClient";

let currentAccessToken: string | null = null;
let initStarted = false;

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

/** Call once at app boot (from main.tsx). Safe to call multiple times. */
export function initAuthTokenListener(): void {
  if (initStarted) return;
  initStarted = true;

  supabase.auth.getSession().then(({ data }) => {
    currentAccessToken = data.session?.access_token ?? null;
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentAccessToken = session?.access_token ?? null;
  });
}

/**
 * Resolve a usable access token for outbound API calls.
 * Prefer the in-memory value; fall back to getSession / refreshSession.
 */
export async function resolveAccessToken(): Promise<string | null> {
  if (currentAccessToken) return currentAccessToken;

  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    currentAccessToken = data.session.access_token;
    return currentAccessToken;
  }

  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.data.session?.access_token) {
    currentAccessToken = refreshed.data.session.access_token;
    return currentAccessToken;
  }

  return null;
}
