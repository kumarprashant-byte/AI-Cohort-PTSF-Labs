---
intent: INT-004
proof_hash: 7a87f285c64b
authored: 2026-09-29
---

# INT-004 — Test script

**Intent:** PHI security foundation — Medical_History__c Private OWD, Restriction Rule, break-glass permission set
**Design:** `intents/INT-004/design.md`

## Criteria

| Id | Criterion | Type | How proven | Sign-off |
|---|---|---|---|---|
| INT-004-C1 | `Medical_History__c` deployed with OWD Private and lookup to Contact (`Patient__c`, restrict delete) | ✅ | `SELECT QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName='Medical_History__c'`; check OWD via ObjectPermissions; check field via FieldDefinition | Prashant Kumar / 2026-09-29 / pass — evidence deploy 0AfoB000000yiFtSAI |
| INT-004-C2 | `Audit_Log__c` deployed with fields `User__c`, `Action__c` (picklist), `Reason__c`, `Target_Object_Type__c`, `Target_Object_Id__c`, `Timestamp__c` | ✅ | `SELECT QualifiedApiName FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName='Audit_Log__c'` returns all six | Prashant Kumar / 2026-09-29 / pass — evidence deploy 0AfoB000000yiFtSAI |
| INT-004-C3 | `PHI_Emergency_Access` PS grants object Read + field FLS Read on Medical_History__c fields | ✅ | `SELECT Field FROM FieldPermissions WHERE ParentId IN (SELECT Id FROM PermissionSet WHERE Name='PHI_Emergency_Access')` returns the encrypted-field set | Prashant Kumar / 2026-09-29 / pass — evidence deploy 0AfoB000000yiZFSAY |
| INT-004-C4 | Audit trail on Break_Glass PS grant/revoke captured in `Audit_Log__c` | 👁 | **Deferred to runbook** — PermissionSetAssignment does not support Apex triggers on this org; grant/revoke will be wrapped by the `Assign_Break_Glass_PS` Flow that writes PSA + Audit_Log__c together. Route via `delivery/runbook-INT-004.md` § Break-glass Flow. Design update pending in a follow-on refinement. | Prashant Kumar / 2026-09-29 / deferred-as-is / → decisions/TBD-INT-004-audit-flow-deferral.md |
| INT-004-C5 | Restriction Rule `Internal_Profiles_Blocked` blocks internal profiles from Medical_History__c reads unless PHI PS assigned | 👁 | **Deferred to runbook** — Q-004-1 (PHI classification matrix) still open; Restriction Rule shape hangs on Q-design-004-1. Runbook § Restriction Rule captures the intended filter. | Prashant Kumar / 2026-09-29 / deferred-as-is / → decisions/TBD-INT-004-audit-flow-deferral.md |
| INT-004-C6 | Custom Apex Sharing Reason `Practitioner_Assignment_Share` declared on Medical_History__c (required by INT-019) | 👁 | Present in the target org (`sf` deploy warning at 2026-09-29T13:15:33Z: "SharingReason Medical_History__c.Practitioner_Assignment_Share returned from org"). INT-019 build will re-source it in metadata under `RowCauseChoice` format. | Prashant Kumar / 2026-09-29 / pass — evidence deploy 0AfoB000000yiW1SAI warning |
| INT-004-C7 | Shield Platform Encryption enablement + per-field encryption scheme captured in runbook, gated on Q-004-1 | 👁 | Read `delivery/runbook-INT-004.md` § Shield — matches design's proposed matrix, Q-004-1 blocker noted | Prashant Kumar / 2026-09-29 / pass — evidence runbook |

## Notes

- Shield Platform Encryption is a Setup step, not metadata-deployable — runbook only.
- Restriction Rule (C5) requires Enterprise-edition features; orgfarm dev editions typically carry them, but if deploy fails, route to runbook with Q-design-004-1.
- Q-004-1 (PHI classification matrix authoring source) remains open — pending Trusted Guide.
