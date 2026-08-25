import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const utils = trpc.useUtils();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      utils.auth.me.invalidate();
    });

    return () => subscription.subscription.unsubscribe();
  }, [utils]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: session !== undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [utils]);

  const sessionLoading = session === undefined;
  const loading = sessionLoading || (Boolean(session) && meQuery.isLoading);

  const serverAuthError =
    Boolean(session) && !meQuery.isLoading && meQuery.data == null
      ? meQuery.error?.message ??
        "Signed in with Supabase, but the server could not verify your session. Check SUPABASE_URL, SUPABASE_ANON_KEY, and DATABASE_URL on the host."
      : null;

  return {
    user: session ? (meQuery.data ?? null) : null,
    loading,
    error: meQuery.error ?? null,
    serverAuthError,
    isAuthenticated: Boolean(session && meQuery.data),
    refresh: () => meQuery.refetch(),
    logout,
  };
}
