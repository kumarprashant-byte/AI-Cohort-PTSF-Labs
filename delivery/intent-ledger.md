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
| INT-002 | 1 | ✅ Delivered | local/INT-002+samlssoconfig-deferred | — | `c066bc1dbd9d` |
| INT-003 | 1 | ✅ Delivered | local/INT-003+expcloud-deferred | — | `d1fb860cee24` |
| INT-004 | 1 | ✅ Delivered | local-orgfarm-2026-09-29 | — | `7a87f285c64b` |
| INT-005 | 1 | ✅ Delivered | sandbox-verify:2026-09-30+2-manual-scenes-pending | — | `3a454bd1c005` |
| INT-006 | 2 | ✅ Delivered | local-build | decisions/TEMPLATE.md | `550355e10b6f` |
| INT-007 | 2 | ✅ Delivered | sandbox-deploy:0AfoB000000yjmXSAQ+partial-per-decision-2026-09-29-INT-007-hic-payload-deferred | — | `e0f63f2a5954` |
| INT-008 | 2 | ✅ Delivered | sandbox-verify:2026-09-30+manual-scenes-pending | decisions/2026-09-30-INT-008-lock-scope-narrowed.md | `0d9f92f33ec1` |
| INT-009 | 3 | ✅ Delivered | local-orgfarm-2026-09-29 | — | `e7826a71b17e` |
| INT-010 | 3 | ✅ Delivered | sandbox-deploy:0AfoB000000yj3tSAA | — | `2ae5cd8d9fee` |
| INT-011 | 3 | ✅ Delivered | sandbox-deploy:0AfoB000000yjWvSAI+partial-per-decision-2026-09-29-INT-011-specialist-referral-deferred | — | `e5c327e92065` |
| INT-012 | 3 | ✅ Delivered | sandbox-verify:2026-09-30+manual-scenes-pending | — | `9256b9fa1d61` |
| INT-013 | 4 | ✅ Delivered | sandbox-deploy:0AfoB000000ypXVSAY+permset-pass | — | `ebef5bab7440` |
| INT-014 | 4 | ✅ Delivered | local:INT-014-subsidy-determination | — | `b4a09a4178cf` |
| INT-015 | 4 | ✅ Delivered | local-build | decisions/TEMPLATE.md | `ce2662925246` |
| INT-016 | 4 | ✅ Delivered | local/INT-016+admin-clickthrough | — | `8ee60968746a` |
| INT-017 | 5 | ✅ Delivered | local-build | decisions/TEMPLATE.md | `5f97a829effe` |
| INT-018 | 5 | ✅ Delivered | local-build | decisions/TEMPLATE.md | `570be557cf40` |
| INT-019 | 3 | ✅ Delivered | local-orgfarm-2026-09-29 | — | `67b23cf17f93` |
| INT-020 | 3 | ✅ Delivered | local/INT-020 | — | `f30955a620b6` |
| INT-021 | 2 | ✅ Delivered | local-build:88784f8 | — | `f435140e1e98` |
| INT-022 | 3 | ✅ Delivered | local-build:1d63a25 | — | `aa150bf28875` |
| INT-023 | 4 | ⬜ Not started | — | — | — |
| INT-024 | 4 | 🔧 In progress | — | — | — |
| INT-025 | 5 | ⬜ Not started | — | — | — |
| INT-026 | 1 | 🔧 In progress | — | — | — |
| INT-027 | 1 | ⬜ Not started | — | — | — |
| INT-028 | 3 | 🔧 In progress | — | — | — |

_28 intents across phase(s) 1, 2, 3, 4, 5. Seeded from `intents/`._
