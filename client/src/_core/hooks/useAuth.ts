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
      // A sign-in/sign-out/token-refresh means the Bearer token main.tsx
      // attaches to tRPC requests has changed — re-fetch the enriched user
      // record (docRole, isAuthorizedOfficer, etc.) from our own backend.
      utils.auth.me.invalidate();
    });

    return () => subscription.subscription.unsubscribe();
  }, [utils]);

  // Once we know whether there's a Supabase session, ask our backend for the
  // matching institutional user record (auto-provisioned on first sign-in).
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

  return {
    user: session ? (meQuery.data ?? null) : null,
    loading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(session && meQuery.data),
    refresh: () => meQuery.refetch(),
    logout,
  };
}
