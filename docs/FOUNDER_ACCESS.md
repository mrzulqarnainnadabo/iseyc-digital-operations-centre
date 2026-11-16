# Founder access — National President (secure recovery)

This document describes how Ambassador Zulqarnain (National President) gains full Digital Operations Centre access **without** weakening authentication.

## How owner bootstrap works

1. You sign in with **Supabase Auth** (email/password) on the DOC login screen.
2. The server verifies the access token with Supabase (`/auth/v1/user`).
3. The server loads or creates a row in the local `users` table keyed by **auth user UUID**.
4. If the deployment environment variable `OWNER_AUTH_USER_ID` is set to **exactly** that UUID, the server sets on every matching upsert:
   - `role = admin`
   - `docRole = national_president`
   - `isAuthorizedOfficer = true`

No client-side role, email string, or hidden URL grants these privileges.

## Why access may fail

| Symptom | Likely cause |
| --- | --- |
| Login form error / session invalid | Wrong password, email confirmation pending, or Supabase env misconfigured |
| Signed in but "administrator must confirm your role" | Account exists as **member** / not officer — `OWNER_AUTH_USER_ID` missing, wrong UUID, or DB upsert failed |
| Auth works but Command Brief hidden | Officer without presidential `docRole` |
| Server logs Auth FAIL with database error | `DATABASE_URL` / pooler issue |

## Recovery steps (founder)

1. Open production: `https://iseyc-digital-operations-centre.vercel.app`
2. **Sign up or Sign in** with the institutional email you control.
3. In **Supabase** → Authentication → Users → open your user → copy **User UID** (UUID).
4. In **Vercel** → project for this app → Settings → Environment Variables:
   - Ensure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL` are set for Production.
   - Set `OWNER_AUTH_USER_ID` = that **User UID** (Production). Do not commit it to Git.
5. Redeploy Production so the server reads the new env.
6. **Sign out** fully, then **Sign in** again (re-applies owner privileges on upsert).
7. Confirm sidebar shows **Command Brief** and **Officer access**.

## What not to do

- Do not disable authentication or publish a skip-login button.
- Do not grant admin to the first registrant automatically.
- Do not put service-role keys or DB passwords in the frontend.
- Do not use email alone as proof of National President identity.

## Team members

Ordinary officers sign in once, then an **administrator** uses **Officer access** to set `docRole` and authorize modules. New accounts stay blocked until authorized.
