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
| INT-001 | 1 | ⬜ Not started | — | — | — |
| INT-002 | 1 | ⬜ Not started | — | — | — |
| INT-003 | 1 | ⬜ Not started | — | — | — |
| INT-004 | 1 | ⬜ Not started | — | — | — |
| INT-005 | 1 | ⬜ Not started | — | — | — |
| INT-006 | 2 | ⬜ Not started | — | — | — |
| INT-007 | 2 | ⬜ Not started | — | — | — |
| INT-008 | 2 | ⬜ Not started | — | — | — |
| INT-009 | 3 | ⬜ Not started | — | — | — |
| INT-010 | 3 | ⬜ Not started | — | — | — |
| INT-011 | 3 | ⬜ Not started | — | — | — |
| INT-012 | 3 | ⬜ Not started | — | — | — |
| INT-013 | 4 | ⬜ Not started | — | — | — |
| INT-014 | 4 | ⬜ Not started | — | — | — |
| INT-015 | 4 | ⬜ Not started | — | — | — |
| INT-016 | 4 | ⬜ Not started | — | — | — |
| INT-017 | 5 | ⬜ Not started | — | — | — |
| INT-018 | 5 | ⬜ Not started | — | — | — |

_18 intents across phase(s) 1, 2, 3, 4, 5. Seeded from `intents/`._
