# INT-014 — Decision-support mechanism: Flow calculator + reference-table

**Date:** 2026-09-30 · **Intent:** [INT-014](../intents/INT-014/intent.md) · **Design:** [design.md](../intents/INT-014/design.md)

## Context

INT-014's `## Open questions` carries `Q-014-1`: is the subsidy decision-support mechanism a **business rule engine**, a **Flow-based calculator**, or a **reference-table lookup**? The intent's own title and build target already name a Screen Flow computing amount from `distance × transport-type multiplier` reading a `Subsidy_Determination_Rule__c` object — so the question is effectively answered inside the intent, but was never formally closed.

## Decision

**Flow-based calculator reading a Subsidy_Determination_Rule__c reference table** — the intent's declared shape. Not a BRE, not a CMDT.

## Rationale

- The Screen Flow gives the Assessor the guided, editable UX the acceptance walkthrough requires; a BRE call would still need a Flow shell around it.
- A **Custom Object** (not CMDT) for the multipliers keeps the ruleset admin-editable at runtime — the client's Ops team can adjust regional multipliers without a deploy.
- No BRE license or Salesforce Decision-Table dependency taken on for MVP; if the ruleset ever grows multi-factor (region × transport × season × distance-band), revisit.

## Consequences

- Q-014-1 → ANSWERED (mechanism = Flow + Custom Object reference table).
- The Approval Process piece of the intent remains 📋 deferred to an INT-014 follow-on that lands after INT-005 + INT-020 (Team Manager users + Region model).
- No change to any other intent.

## Ratified by

Prashant Kumar (Trusted Guide) — 2026-09-30.
