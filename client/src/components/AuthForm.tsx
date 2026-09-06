import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { setAccessToken } from "@/lib/authToken";
import { FormEvent, useState } from "react";

type Mode = "sign_in" | "sign_up" | "reset_password";

function appOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function formatAuthError(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as { message?: string; code?: string; status?: number; name?: string };
    const parts = [e.message, e.code ? `code=${e.code}` : null, e.status ? `status=${e.status}` : null].filter(
      Boolean
    ) as string[];
    if (parts.length) return parts.join(" · ");
    if (e.name) return e.name;
  }
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("sign_up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const redirectTo = appOrigin();
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "sign_in") {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) throw signInError;
        setAccessToken(signInData.session?.access_token ?? null);
      } else if (mode === "sign_up") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (signUpError) throw signUpError;
        if (signUpData.session?.access_token) {
          setAccessToken(signUpData.session.access_token);
          setNotice("Welcome to ISEYC — you are signed in.");
        } else {
          setNotice("Account created. Check your email if confirmation is required, then sign in.");
          setMode("sign_in");
        }
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });
        if (resetError) throw resetError;
        setNotice("If that email is registered, a reset link was sent. Open it on this device.");
        setMode("sign_in");
      }
    } catch (err) {
      console.error("[AuthForm]", err);
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
      {mode !== "reset_password" ? (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("sign_up");
              setError(null);
              setNotice(null);
            }}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === "sign_up" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Join ISEYC
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign_in");
              setError(null);
              setNotice(null);
            }}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === "sign_in" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Sign in
          </button>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </div>
      {mode !== "reset_password" ? (
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          {mode === "sign_up" ? (
            <p className="text-[11px] text-slate-400">Minimum 6 characters. You can change this later.</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600 break-words">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full bg-emerald-700 text-white hover:bg-emerald-800"
      >
        {pending
          ? "Please wait…"
          : mode === "sign_in"
            ? "Sign in"
            : mode === "sign_up"
              ? "Create free account"
              : "Send reset link"}
      </Button>

      <div className="flex items-center justify-between text-xs text-slate-500">
        {mode === "reset_password" ? (
          <button
            type="button"
            onClick={() => {
              setMode("sign_in");
              setError(null);
              setNotice(null);
            }}
            className="underline hover:text-slate-800"
          >
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode("reset_password");
              setError(null);
              setNotice(null);
            }}
            className="underline hover:text-slate-800"
          >
            Forgot password?
          </button>
        )}
      </div>
    </form>
  );
}
