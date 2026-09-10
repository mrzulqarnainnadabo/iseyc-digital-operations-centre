# ISEYC DOC — Refinement Handoff (Development Journey)

**Branch:** `refinement/development-journey-v2`
**Base:** Jules PR #1 tip (`1564d16`)
**Do not merge to main. Do not deploy production.**

## Preserved
- Jules deterministic attention engine + severity policy
- Lightweight `/api/health` (no attention scan)
- Existing development governance (human confirmation only)

## Corrections
1. Non-admin officers only see attention from submissions they own
2. Command briefs remain admin/national_president only

## Development Journey
- `server/development/journey.ts` + `development.journey` tRPC
- DevelopmentProfile page rebuilt as continuous journey UX
- pending ≠ confirmed throughout
- No scores, leaderboards, or AI assessment
- Nav: Development Journey

## Branding
- `ISEYC_TOKENS` semantic tokens in `branding.ts`

## ChatGPT review focus
1. deriveNextStep priority
2. pending vs confirmed UX
3. attention ownership filter
4. journey query volume
5. mobile Home/Command polish remaining
