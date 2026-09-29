---
date: 2026-09-29
intents: [INT-011, INT-009]
ratifier: Prashant Kumar
---

# INT-011 — Specialist re-referral action deferred to a follow-on intent

## Context

INT-011's Build target names *"'Request specialist assessment' action creates a child Assessment__c and a new Assignment__c via INT-009's logic filtered to the specialist specialty"* — the spawn depends on INT-009's `AssignmentSelector` Queueable. INT-009 delivered the data model and scaffolding but deferred the selector (C6-C8), so the spawn cannot honestly land in this build without either stubbing the specialist pick (shipping a fake) or reinventing the selector inside this intent (scope creep across an already-large increment).

## Change

The specialist re-referral half of INT-011's Build target is **deferred to a dedicated follow-on intent** that will land alongside — or after — the AssignmentSelector work. INT-011 ships the assessment core (data model, sharing, save/submit, metadata-driven form, attachments); the follow-on adds the "Request specialist assessment" action.

To keep the follow-on additive-only, the current build includes `Assessment__c.Parent_Assessment__c` (self-lookup) even though it's unused today — the follow-on won't need a schema change.

## Consequences

- **INT-011's test script marks this as a `📋 accepted gap`** with a pointer to this decision, so `coverage --gate` doesn't fail the delivered intent on the deferred half.
- **INT-009's AssignmentSelector remains the blocking dependency** for INT-010's enqueue *and* INT-011's spawn — a single follow-on that lands the selector unblocks both. Recorded on both intents' runbooks.
- **No scope hash change on INT-011.** The intent still names the specialist re-referral as scope; the deferral is a delivery reality tracked here and in the ledger's proof plan, not a scope softening (which would require `/ql-refine-intent`).
- If the follow-on is deprioritized indefinitely, `/ql-refine-intent` should be used to cut the specialist re-referral from INT-011's build target — until then, the intent as-written remains truthful about intent, and the test script is truthful about what's proven.
