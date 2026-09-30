# Intent delivery ledger

> The backward link between scope and delivery. `intents/INT-NNN/intent.md`
> is the canonical WHAT (living — refined in-repo); this file tracks STATUS —
> which intent was built, in which PR, with what evidence, against which version
> of the scope.
>
> **Written by the ledger commands, not by hand.** `start INT-00x` opens a row
> (🔧 In progress); `deliver INT-00x --pr <ref>` closes it out as you assemble the
> PR — atomically flipping to ✅ Delivered, stamping the current scope hash, and
> refreshing the README index. When `drift` finds a delivered intent whose
> scope moved after you built it, `reverify INT-00x` flips the row to 🔄 (keeping
> the hash + PR); `deliver` re-stamps it once the build is re-verified.

Status: ⬜ Not started · 🔧 In progress · ✅ Delivered · 🔄 Needs re-verify (scope drifted) · 🚫 Retired (de-scoped)

| Intent | Phase | Status | PR | Evidence | Scope hash @ delivery |
|--------|-------|--------|----|----------|-----------------------|
| INT-001 | 1 | ✅ Delivered | — | — | `268745afcc83` |
| INT-002 | 1 | ⬜ Not started | — | — | — |
| INT-003 | 1 | ⬜ Not started | — | — | — |
| INT-004 | 1 | ✅ Delivered | local-orgfarm-2026-09-29 | — | `7a87f285c64b` |
| INT-005 | 1 | ✅ Delivered | sandbox-verify:2026-09-30+2-manual-scenes-pending | — | `3a454bd1c005` |
| INT-006 | 2 | ⬜ Not started | — | — | — |
| INT-007 | 2 | ✅ Delivered | sandbox-deploy:0AfoB000000yjmXSAQ+partial-per-decision-2026-09-29-INT-007-hic-payload-deferred | — | `e0f63f2a5954` |
| INT-008 | 2 | ✅ Delivered | sandbox-verify:2026-09-30+manual-scenes-pending | — | `eebdfaf09a89` |
| INT-009 | 3 | ✅ Delivered | local-orgfarm-2026-09-29 | — | `e7826a71b17e` |
| INT-010 | 3 | ✅ Delivered | sandbox-deploy:0AfoB000000yj3tSAA | — | `2ae5cd8d9fee` |
| INT-011 | 3 | ✅ Delivered | sandbox-deploy:0AfoB000000yjWvSAI+partial-per-decision-2026-09-29-INT-011-specialist-referral-deferred | — | `e5c327e92065` |
| INT-012 | 3 | ⬜ Not started | — | — | — |
| INT-013 | 4 | ✅ Delivered | sandbox-deploy:0AfoB000000ypXVSAY+permset-pass | — | `ebef5bab7440` |
| INT-014 | 4 | ⬜ Not started | — | — | — |
| INT-015 | 4 | ⬜ Not started | — | — | — |
| INT-016 | 4 | ⬜ Not started | — | — | — |
| INT-017 | 5 | ⬜ Not started | — | — | — |
| INT-018 | 5 | ⬜ Not started | — | — | — |
| INT-019 | 3 | ✅ Delivered | local-orgfarm-2026-09-29 | — | `67b23cf17f93` |
| INT-020 | 3 | ⬜ Not started | — | — | — |

_20 intents across phase(s) 1, 2, 3, 4, 5. Seeded from `intents/`._
