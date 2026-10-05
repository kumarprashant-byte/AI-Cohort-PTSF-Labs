---
date: 2026-09-30
intent: INT-008
kind: refinement
---

# INT-008 guardrail 2 narrowed — system-managed fields excluded from post-submission lock

## Context

Full Apex test run on 2026-09-30 surfaced a scope conflict between two delivered intents:

- **INT-008** ships validation rule `Subsidy_Application__c.Locked_After_Submission` (guardrail 2) blocking `ISCHANGED` on `Patient__c`, `Treatment_Type__c`, and `Previously_Declined_Practitioners__c` once `Status__c` leaves `Draft`.
- **INT-011** ships `AssignmentSlaCheckAction.run`, which on SLA-overdue reassignment appends the declined practitioner's Contact Id to `Previously_Declined_Practitioners__c` via `update` on the parent Subsidy_Application__c.

The two collide: INT-011's reassignment can never fire against a submitted application — which is exactly the state SLA reassignment exists to handle. Three tests fail:
- `AssignmentSlaCheckActionTest.declinedPractitionerIsAppendedToApplication`
- `AssignmentSlaCheckActionTest.emailSentToPractitioner`
- `AssignmentSlaCheckActionTest.overdueAssignmentIsReassigned`

## Change

Refining **INT-008**, not INT-011. Guardrail 2's intent is *"patient cannot edit after submission"* — a user-facing lock, not a general immutability contract. `Previously_Declined_Practitioners__c` is system-owned append bookkeeping written by the SLA path; it was never a patient-editable field, and its inclusion in the lock was over-reach.

**Before (guardrail 2):**
> Must not let a patient edit an application after submission (a corrections workflow is out of scope this phase)

**After (guardrail 2):**
> Must not let a patient edit patient-facing fields on an application after submission — Patient__c and Treatment_Type__c are locked. System-managed bookkeeping fields (e.g., Previously_Declined_Practitioners__c) stay open for platform automation. Corrections workflow is out of scope this phase.

The validation rule `Locked_After_Submission` drops `ISCHANGED(Previously_Declined_Practitioners__c)` from its formula in the same change.

## Consequences

- INT-008 flips to 🔄 Needs re-verify (scope hash moves; the delivered validation rule changes).
- INT-011's three failing tests should turn green after the validation rule redeploys.
- No change to INT-011's scope — its mechanism was correct; INT-008's guardrail was too broad.

## Links

- `intents/INT-008/intent.md`
- `force-app/main/default/objects/Subsidy_Application__c/validationRules/Locked_After_Submission.validationRule-meta.xml`
- `force-app/main/default/classes/AssignmentSlaCheckAction.cls` (INT-011)
