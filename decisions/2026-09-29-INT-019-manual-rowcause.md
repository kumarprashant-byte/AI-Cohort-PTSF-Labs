---
date: 2026-09-29
intents: [INT-019]
ratifier: Prashant Kumar
---

# INT-019 Apex-managed sharing — Manual RowCause (not custom Practitioner_Assignment_Share)

## Context

`intents/INT-019/design.md` chose a **custom Apex Sharing Reason** (`Practitioner_Assignment_Share`) on `Medical_History__c` for atomic revocation and to distinguish INT-019's programmatic shares from user-initiated Manual shares. Deploying the SharingReason metadata on the orgfarm dev org (`orgfarm-5f9310b41f`) failed under every source format tried:

- Standalone `sharingReasons/Practitioner_Assignment_Share.sharingReason-meta.xml` with `<fullName>Practitioner_Assignment_Share</fullName>` → `'Practitioner_Assignment_Share' does not resolve to a valid sObject type, fullName must end with: __as, __b, __c, __dll, __dlm, __e, __kav, __mdt, __mg, __x`.
- Same file without `<fullName>` → `element fullName missing for a child of type SharingReason`.
- Inline `<sharingReasons>` nested in `Medical_History__c.object-meta.xml` → same "does not resolve to sObject type" error.
- Retrieval attempt (`sf project retrieve start --metadata SharingReason:Medical_History__c.Practitioner_Assignment_Share`) → `Entity cannot be found`.

Combined, the orgfarm dev edition (or this version of the metadata API surface) rejects custom SharingReason source deployment.

## Change

`AssignmentShareService` uses standard **`RowCause = 'Manual'`** on `Medical_History__Share` — one of the two rejected alternatives in `intents/INT-019/design.md § Alternatives considered`.

Trade-offs:

- **Lost:** atomicity of "revoke only INT-019-owned shares" via row-cause filter. `revokeForAssignments` filters `RowCause = 'Manual'`, so a Manual share created by an admin outside the automation *could* be revoked when Status transitions off Accepted. Mitigation: an admin should never Manual-share Medical_History__c by hand; grants come only through the practitioner-community assignment flow.
- **Lost:** a distinct audit trail row cause. Replaced by `Audit_Log__c.Action__c = 'Manual_Share_Insert'` / `'Manual_Share_Delete'` — the row cause is captured in the audit log even though the share record itself doesn't distinguish.
- **Preserved:** the acceptance criterion — practitioner gets Read on Medical_History__c only while Assignment.Status = Accepted; revocation on Declined/Reassigned/Completed.

## Consequences

- No hashed scope fields in `intents/INT-019/intent.md` changed — design-level pivot, no `reverify` required.
- Follow-on: when a future engagement org supports the custom SharingReason format, `AssignmentShareService` swaps `RowCause = 'Manual'` → `RowCause = 'Practitioner_Assignment_Share__c'` in two places (grant + revoke) and adds the SharingReason metadata to the object. Test class re-runs unchanged.
- `AssignmentShareServiceTest` proves grant, revoke, and idempotency all pass (deploy 0AfoB000000yihkSAA, 3/3 tests green).
