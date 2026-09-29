# Refine INT-001 — polish tweaks from /ql-vet-intent

**Date:** 2026-09-29 · **Deciders:** Prashant Kumar

## Context

`/ql-vet-intent INT-001` surfaced two 💡 polish findings on the single-org capstone + DevOps intent (post the earlier single-org refine + owner-attribution correction):

- **P1 — "base custom objects" ambiguous.** The build target bullet listed "base custom objects" as part of the source repo's base metadata, but INT-004 / INT-008 / INT-009 own the real custom objects on the engagement. A build agent could read this as "seed placeholder objects here" instead of "no custom objects until the phase intents deliver them".
- **P2 — Business Hours consumer unnamed.** The bullet declared regional Business Hours (APAC/EMEA/AMER) exist "for downstream SLA math" without naming the consumer. On a single-org capstone this is a real Phase-1 setup step, but leaving the consumer implicit hides an unowned dependency.

## Choice

- **P1** — rewrote the bullet to `(profiles, permission sets, custom settings) — custom objects are owned by their phase intents (INT-004 Medical_History__c, INT-008 Subsidy_Application__c, INT-009 Assignment__c, etc.), not deployed here`. Names the boundary explicitly rather than leaving "base custom objects" to interpretation.
- **P2** — narrowed the bullet to state Business Hours records exist per region and added **Q-001** under `## Open questions` asking which intent owns the SLA math that consumes them. Honest silence over an invented dependency.

## Consequences

- INT-001's ratification (`503ad7322529`, Prashant Kumar, 2026-09-29) was already stale from prior refines. This third edit keeps it stale; re-ratify against the new hash after review.
- INT-001 is 🔧 In progress in the ledger — no `drift` / `reverify` action.
- Q-001 is a genuine open question for the design pass — likely resolved by whichever intent formalizes the assessment or allocation SLA (Q-001 answer folds into that intent's dependencies, not INT-001's build target).
- No other intent files touched by this edit.
