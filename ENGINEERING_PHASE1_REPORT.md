# ISEYC Digital Operations Centre — Engineering Discovery & Gap Analysis

**Repository:** `mrzulqarnainnadabo/iseyc-digital-operations-centre`
**Branch:** `engineering/operations-attention` (do not auto-merge to main)
**Date:** 2026-09-10

## Architecture
- Frontend: Vite + React + tRPC + TanStack Query
- Backend: Express + tRPC + Drizzle + Postgres/Supabase
- Auth: Supabase JWT → users (role, docRole, isAuthorizedOfficer)
- Modules: meeting, doc, chamber, development, operations (new)

## This slice
- Deterministic attention engine (no AI, no mutations)
- GET /api/health with app + operational summary
- tRPC operations.attention + operations.health (officer-gated)
- Unit tests for pure evaluators

## Priority findings
P0: dual role model clarity; production domain ownership separate
P1: unified attention; richer action lifecycle fields
P2: query scoping; scheduled institutional brief
P3: UI polish

## Next 5 tasks
1. Surface attention on Home/Command UI
2. Scoped action queries + document completedAt proposal
3. Chamber intelligence in attention scan
4. Idempotent daily internal brief (no external send)
5. Permission matrix documentation
