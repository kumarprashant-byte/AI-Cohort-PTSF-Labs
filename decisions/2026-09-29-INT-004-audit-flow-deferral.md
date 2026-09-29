---
date: 2026-09-29
intents: [INT-004]
ratifier: Prashant Kumar
---

# INT-004 audit-trigger pivot to Flow wrapper; Restriction Rule to runbook

## Context

INT-004's design.md proposed an `AuditPermissionSetAssignmentTrigger` on `PermissionSetAssignment` (after insert/delete) writing `Audit_Log__c` rows for PHI break-glass grants and revokes. On the orgfarm dev org (`orgfarm-5f9310b41f`) the trigger deploy failed with `SObject type does not allow triggers: PermissionSetAssignment` — the platform does not permit Apex triggers on `PermissionSetAssignment` on this edition.

Separately, the design's `Internal_Profiles_Blocked` Restriction Rule remains gated on Q-004-1 (PHI classification matrix) and Q-design-004-1 (filter shape) — both still open pending Trusted Guide input.

## Change

- **Audit path:** replace the Apex trigger with a **`Assign_Break_Glass_PS` Flow** that (a) creates the `PermissionSetAssignment` and (b) inserts the `Audit_Log__c` row atomically in one transaction. Revocation follows the same pattern via a scheduled or record-triggered Flow on PSA delete (once Salesforce ships PSA delete-trigger support, or via a scheduled cleanup that reconciles active PSAs against an expected set).
- **Restriction Rule:** captured in `delivery/runbook-INT-004.md` as a post-deploy manual Setup step, deferred until Q-004-1 + Q-design-004-1 close.

Both are 👁 walkthrough criteria (INT-004-C4, INT-004-C5) marked `deferred-as-is` in the test script, pointing back at this decision.

## Consequences

- INT-004 delivers with object + FLS + audit-log schema in place, but the audit *write path* is deferred to the runbook Flow — a follow-on refinement will fold the Flow authoring back into the intent's scope (or into a new INT for break-glass tooling).
- INT-019 remains unblocked: its Apex-managed sharing depends on `Medical_History__c` OWD Private (delivered) and the `Practitioner_Assignment_Share` sharing reason (present in the target org from an earlier partial deploy; INT-019 will re-source it in metadata).
- No hashed scope fields in `intents/INT-004/intent.md` changed — this decision documents a design-level pivot, not a scope edit, so no `reverify` is required. The `test-script.md` proof plan absorbs the deferral through its Sign-off cells.
