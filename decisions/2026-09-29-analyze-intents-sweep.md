# Reconcile /ql-analyze-intents ⛔ findings — split PHI + region intents, correct INT-001/INT-008

**Date:** 2026-09-29 · **Deciders:** Prashant Kumar

## Context

`/ql-analyze-intents` on the seeded set (18 intents, all phases) surfaced four ⛔ findings that `node scripts/intent-ledger.mjs validate` couldn't catch — because the intents in question didn't declare their real internal dependencies, so `validate`'s phase-inversion check was blind to them:

- **F1 — INT-004 phase-inversion by prose.** Phase-1 INT-004 build target included an Apex trigger on `Assignment__c`, which INT-009 creates in phase 3.
- **F2 — INT-005 phase-inversion by prose.** Phase-1 INT-005 build target created `Region__c` on `Subsidy_Application__c` / `Assignment__c` / `Assessment__c`, which don't exist until phases 2/3/3.
- **F3 — INT-001 wrong-owner attribution.** Guardrail read *"INT-007/INT-009 own them"* for the two custom objects — INT-007 owns the HIC integration pattern, not Subsidy_Application__c. INT-008 does.
- **F4 — INT-001 vs INT-008 LDV contradiction.** INT-001 (post single-org refine) out-of-scope defers the skinny-table Support case; INT-008 build target listed the same skinny table as buildable. On the capstone org, INT-008 couldn't ship the skinny table either.

Touches: `intents/INT-001/intent.md`, `intents/INT-004/intent.md`, `intents/INT-005/intent.md`, `intents/INT-008/intent.md`. Adds `intents/INT-019/intent.md`, `intents/INT-020/intent.md`.

## Options

Considered per finding:

- **F1** — split the trigger to a new phase-3 intent (chosen); resequence INT-004 wholesale to phase 3 (rejected — delays the PHI foundation for no reason); drop the trigger (rejected — leaves the mechanism unowned).
- **F2** — split into a phase-1 user-scaffolding intent + phase-3 object-scoping intent (chosen); resequence INT-005 wholesale to phase 3 (rejected — delays regional user model + role hierarchy needlessly).
- **F3** — correct the attribution to "INT-008/INT-009" (chosen); no alternative worth considering.
- **F4** — narrow INT-008 to selective indexes only, defer the skinny table to INT-001's design record (chosen); mirror INT-001 and defer both (rejected — indexes are self-serve and don't need a Support case).

## Choice

Applied four edits and two captures in one working change:

- **INT-001** (`intent.md`) — corrected the wrong-owner attribution in the guardrail (`INT-007/INT-009` → `INT-008/INT-009`).
- **INT-004** (`intent.md`) — retitled to "PHI security foundation"; removed the Apex trigger bullet; sharpened the guardrail language and acceptance test around the object + OWD + Restriction Rule + break-glass permission set + Audit_Log__c + Shield. Added the new INT-019 pointer under `out_of_scope`.
- **INT-005** (`intent.md`) — retitled to "Regional user model and role hierarchy"; removed the object-level Region__c + OWD + sharing rule bullets; acceptance rewritten to verify the User/Contact scaffolding. Added the new INT-020 pointer under `out_of_scope`.
- **INT-008** (`intent.md`) — narrowed the LDV bullet to selective indexes only; skinny table now cross-referenced to INT-001's design record.
- **INT-019** (new, `origin: local`, phase 3, epic E09) — "Practitioner temporary access to medical history via Apex-managed sharing on Assignment__c." Contains the trigger that used to sit in INT-004. Declares `INT-004` and `INT-009` under `### Internal`.
- **INT-020** (new, `origin: local`, phase 3, epic E09) — "Region scoping and OWD sharing on subsidy/assignment/assessment objects." Contains the object-level Region + OWD Public Read-Only + criteria sharing that used to sit in INT-005. Declares `INT-005`, `INT-008`, `INT-009`, `INT-011` under `### Internal`.

## Consequences

- INT-001's ratification (`503ad7322529`, Prashant Kumar, 2026-09-29) was already stale from the earlier single-org refine; this second edit keeps it stale. Re-ratify against the new hash after review.
- INT-004 was ⬜ Not started (never delivered), so no `reverify` is triggered. Same for INT-005 and INT-008.
- Finding F5 (systemic undeclared internal dependencies across ~9 intents — INT-008, INT-011, INT-012, INT-013, INT-014, INT-015, INT-016, INT-017, plus INT-009's missing INT-004 edge) is **not** fixed in this change. Routed to `/ql-grill-intents` for a working session, per the ratified choice at analysis time. Findings #6 and #7 (BusinessHours resolution mechanism, notification pattern) are 💡 polish, deferred.
- The delivery ledger needs two new rows (INT-019, INT-020) — regenerate the derived table via `intent-ledger` (both are ⬜ Not started).
- Once the /ql-grill-intents pass completes, expect `validate` to potentially surface new phase-order signals now that deps are declared — an intentional consequence of tightening the graph.
