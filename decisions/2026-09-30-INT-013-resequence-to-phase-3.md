# Pull INT-013 (Assessor Service Console) forward from phase 4 to phase 3

**Date:** 2026-09-30 · **Deciders:** Prashant Kumar

## Context

After phase 1–3 delivered seven intents (INT-001/004/005/007/009/010/011), the org holds objects, security, automation, and integration scaffolding but ships **no `CustomApplication`, tabs, or FlexiPages** — an assessor can only reach records via `/lightning/o/…` URLs. The delivered work compiles and passes tests, but nothing is *usable*: this is the cascading-consequence gap AGENTS.md flags ("a usable increment is the bar, not a compiling one").

INT-013 is the intent that stands up the assessor's app container — sequenced to phase 4 in the Scopezilla plan. On paper the next natural build is INT-008 (subsidy application lifecycle rules on the HIC completion event), but INT-008's acceptance walkthrough presumes a human observing an application move through statuses — which nobody can do without an app.

Touches: `intents/INT-013/intent.md` (resequence), and the plan's ordering for phase 3/4 as a whole.

## Options

- **Keep INT-013 in phase 4, build INT-008 next.** Follows the Scopezilla ordering. Con: three more intents (INT-008/012/014) would ship into an org where their acceptance can't be walked by a real user; the demo cadence stays URL-driven; the "usable increment" bar keeps slipping.
- **Pull INT-013 forward to phase 3 (chosen).** Delivers a visible surface now, so INT-008 and later phase-3/4 intents land into an org an assessor can actually work. Utility-bar launchers for INT-014 (Determine Subsidy) and INT-012 (Escalate to Manager) ship stubbed / deferred with 📋 pointers — INT-013's core value (list views, primary tab, layout, related lists, medical-history denial) doesn't depend on them.
- **Draft a lighter bridge app** (minimal nav + Subsidy Application tab + list views), leave INT-013 in phase 4. Rejected: doubles the app-container work — the bridge would be thrown away when INT-013 lands, and INT-013's core scope (list views, primary tab, denial guardrails) *is* the bridge already.

## Choice

Move INT-013 from `phase: 4` to `phase: 3`. Build it next. Utility-bar launchers for INT-014 and INT-012 ship as deferred (📋) proof criteria in the test script — the app is usable without them; they wire up when those intents deliver.

## Consequences

- **No scope hash change** — `phase:` is excluded from the hash; `drift` does not trip. `validate` still passes.
- **INT-008 slides to build after INT-013.** Its subscriber Flow now lands into an org with an app that shows the status transitions it drives.
- **INT-014 / INT-012 carry a small ripple:** when they deliver, they wire their launchers into INT-013's utility bar (a metadata edit to the CustomApplication, not a new app). Named as follow-on in each of their intent files at build time.
- **README delivery index refreshes** on the next `index --write` — INT-013 now shows in phase 3 alongside 009/010/011.
