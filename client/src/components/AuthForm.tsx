import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { FormEvent, useState } from "react";

type Mode = "sign_in" | "sign_up" | "reset_password";

function appOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("sign_in");
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

    try {
      if (mode === "sign_in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // Session is set; useAuth + onAuthStateChange will re-render the app.
        // If the server cannot verify the JWT (missing SUPABASE_JWT_SECRET),
        // the user will stay on this screen — that is a server env issue.
      } else if (mode === "sign_up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (signUpError) throw signUpError;
        setNotice(
          "Account created. Check your email to confirm, then sign in — an ISEYC administrator will confirm your institutional role afterward."
        );
        setMode("sign_in");
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (resetError) throw resetError;
        setNotice("If that email is registered, a password reset link has been sent. Open it on this same device/browser.");
        setMode("sign_in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@iseyc.example"
        />
      </div>
      {mode !== "reset_password" ? (
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full bg-slate-950 text-white hover:bg-slate-800">
        {pending ? "Please wait…" : mode === "sign_in" ? "Sign in" : mode === "sign_up" ? "Create account" : "Send reset link"}
      </Button>

      <div className="flex items-center justify-between text-xs text-slate-500">
        {mode === "sign_in" ? (
          <>
            <button
              type="button"
              onClick={() => {
                setMode("sign_up");
                setError(null);
                setNotice(null);
              }}
              className="underline hover:text-slate-800"
            >
              Create an account
            </button>
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
          </>
        ) : (
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
        )}
      </div>
    </form>
  );
}
