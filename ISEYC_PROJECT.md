# ISEYC Digital Operations Centre

**This repo is ONLY for the ISEYC Digital Operations Centre (DOC).**

Do **not** confuse with:

| Project | Repo | Supabase ref | Purpose |
|---------|------|--------------|---------|
| **ISEYC DOC** (this) | `iseyc-digital-operations-centre` | `ydlskzafsekiowwjqvvc` | Institutional ops platform |
| Autoverse | `Autoverse` | `lbvydqkwfvpguvvhrcfx` | Separate product |
| ISEYC Civic Brain | `iseyc-civic-brain` | (own) | Civic AI chat |
| 2027 Street Mandate | `2027-street-mandate` | (own/Notion) | Civic survey |

## Production targets

- **GitHub:** https://github.com/mrzulqarnainnadabo/iseyc-digital-operations-centre
- **Vercel project name:** `iseyc-digital-operations-centre`
- **Live URL:** https://iseyc-digital-operations-centre.vercel.app
- **Supabase:** https://ydlskzafsekiowwjqvvc.supabase.co (project ref `ydlskzafsekiowwjqvvc`)

## Required Vercel env (Production)

```
DATABASE_URL=           # Supabase pooler port 6543, sslmode=require
VITE_SUPABASE_URL=https://ydlskzafsekiowwjqvvc.supabase.co
VITE_SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
OWNER_AUTH_USER_ID=     # after first sign-in UUID
```

## Migrations

Already applied on `ydlskzafsekiowwjqvvc` (0000 + 0001).

## Deploy note

All HTTP traffic is rewritten to `/api` (Express serverless). Build must produce `dist/public` (Vite) and `dist/index.js` (esbuild).
