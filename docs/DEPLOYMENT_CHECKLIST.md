# DOC deployment checklist (production)

## Required server env (never commit values)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres (prefer Supabase pooler port **6543**, SSL) |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anon/publishable key for `/auth/v1/user` |
| `OWNER_AUTH_USER_ID` | National President Supabase Auth **user UUID** |

Optional / legacy (if still referenced by modules): see `.env.example`.

## Supabase

1. Auth → Providers → Email enabled for the founder account flow.
2. Authentication → Users → founder exists; copy User UID into `OWNER_AUTH_USER_ID`.
3. Database → `users` table reachable from pooler (schema applied).
4. Do **not** expose service role key to the Vite client.

## After deploy

1. Open production URL → Sign in.
2. If waiting room appears: confirm `OWNER_AUTH_USER_ID`, redeploy, sign out/in.
3. Confirm Command Brief (national_president) and Officer access (admin).
4. Open Civic Mandate / Civic Brain links (separate apps).
5. Sign out; confirm modules locked.

## Do not

- Skip authentication
- Auto-admin first signup
- Put secrets in GitHub or client bundles
