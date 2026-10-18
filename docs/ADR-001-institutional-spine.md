# ADR-001 — Institutional Spine v1

**Status:** Accepted for implementation  
**Date:** 2026-10-18  
**Branch:** `feat/institutional-spine-v1`

## Context

ISEYC Digital Operations Centre already contains strong human-gated modules (Meeting & Decision Tracker, Command Brief, Media Command, Chamber, Developmental Profiles). The target is to evolve it into the ISEYC Institutional Operating System / Command Centre without deleting existing products.

## Decision

Extend the existing repo. Add first-class institutional entities that compose with current modules.

### Entities (Phase 1)

| Entity | Purpose | Key rules |
|--------|---------|-----------|
| **Department** | 4 departments only | Education & Capacity Building, Health & Well-being, Digital Systems & Technology, Civic Affairs |
| **Programme** | Owned by a department | Former Business & Investment lives here under Education (`isBusinessInvestmentRelated`) |
| **Seat** | Role definition (National President, CoS, SG, COO, CFO, Dept Heads, Comms shared service) | Layered: BOT / Advisory / Presidential Council / Department / Shared Service. Maps optionally to existing `docRole` |
| **SeatHolder** | Human assignment to a seat | Active / acting / ended / revoked. Human only |
| **Publication** | Institutional content with public slug | Status machine; only `published` + `visibility=public` is public face |
| **AI_Desk_Run** | AI support for a seat/department | `requiresHuman` defaults true. AI is staff to the seat, never the seat-holder |
| **Resolution** | Formal decision / resolution | Links to seat or meeting submission; human approver |
| **institutional_audit_log** | Unified audit for spine entities | Complements existing module audit tables |

### What stays unchanged

- All existing modules, status machines, human approval gates, test isolation, audit tables.
- Civic Mandate and Civic Brain remain published-only external products; linked under Civic Affairs desk.
- AI never publishes, contacts externals, moves money, or appears as a seat-holder.

### Schema notes for implementers

1. Migration `drizzle/0002_institutional_spine.sql` creates tables + seeds the 4 departments, core seats, and example programmes under Education.
2. `drizzle/schema.ts` on this branch currently surfaces the new spine types. **Merge required:** the original schema content must be restored alongside the new exports so existing modules continue to type-check. Recommended local workflow:
   - `git checkout main -- drizzle/schema.ts`
   - Append the institutional spine block from this branch.
   - Or run `drizzle-kit generate` after applying the migration if preferred.
3. No foreign-key constraints were added in v1 to keep migration simple and avoid circular dependency with `users` / existing tables during rollout. Application-level integrity is enforced in services.

### Public / private boundary

- Public surface: only rows in `publications` with `status = 'published'` and `visibility = 'public'`.
- Everything else (seats, holders, AI desk runs, drafts, internal resolutions) remains private officer UI.

### Next (Phase 2)

- Private Command Centre UI: Org Structure view, department desks, global approval queue, Day-1 packet.
- tRPC routers + services for seats/holders/publications/ai_desk_runs with the same human-gate pattern already used in `meeting` and `doc` modules.

## Consequences

- Positive: ISEYC becomes runnable as a system of seats and desks that new appointees inherit.
- Positive: Business & Investment has a clear home under Education.
- Positive: AI support is explicitly modelled as staff, never authority.
- Trade-off: schema.ts on this branch needs a local merge of original tables before production merge; migration itself is complete and safe.
