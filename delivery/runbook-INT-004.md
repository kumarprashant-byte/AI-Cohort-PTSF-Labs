# INT-004 — Deployment runbook

**Intent:** PHI security foundation
**Delivered metadata:** `Medical_History__c`, `Audit_Log__c`, `PHI_Emergency_Access`, `Practitioner_Medical_History_Read`
**Sharing reason (INT-019):** `Practitioner_Assignment_Share` on `Medical_History__c` — present in target org from earlier partial deploy; INT-019 will re-source in metadata under the correct format.

## 1. Deploy metadata

```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Medical_History__c \
  --source-dir force-app/main/default/objects/Audit_Log__c \
  --source-dir force-app/main/default/permissionsets \
  --wait 15
```

## 2. Post-deploy — Setup steps (not metadata)

### 2a. Restriction Rule `Internal_Profiles_Blocked` — DEFERRED

**Gated on:** Q-004-1 (PHI classification matrix) + Q-design-004-1 (filter shape).

When those two answer, author under Setup → Object Manager → Medical History → Restriction Rules. Intended filter shape (from `intents/INT-004/design.md`):

- **User criteria:** `User.Profile.Name NOT IN ('Compliance_Officer','System_Administrator') AND $Permission.PHI_Emergency_Access = FALSE`
- **Record criteria:** `Patient__c != null` (i.e. deny read on all real medical-history rows to blocked internal profiles)

### 2b. Break-glass audit Flow `Assign_Break_Glass_PS` — DEFERRED

Author as a **screen Flow** (or auto-launched via a permission-request Lightning action) that:

1. Takes required `Reason__c` (LongTextArea) from the requesting admin.
2. Inserts the `PermissionSetAssignment(AssigneeId, PermissionSetId = PHI_Emergency_Access)`.
3. Inserts `Audit_Log__c(User__c=AssigneeId, Action__c='Break_Glass_Grant', Reason__c=<input>, Target_Object_Type__c='PermissionSetAssignment', Target_Object_Id__c=<new PSA Id>, Timestamp__c=NOW())`.

Revocation companion: either a scheduled Apex batch that finds expired PSAs and calls a `revokeBreakGlass` invocable, or a manual admin action that mirrors the grant Flow with `Action__c='Break_Glass_Revoke'`. See `decisions/2026-09-29-INT-004-audit-flow-deferral.md`.

### 2c. Shield Platform Encryption — DEFERRED

Gated on **Q-004-1**. Design.md's proposed encryption scheme:

| Field | Scheme |
|---|---|
| `Medical_History__c.Diagnosis__c` | Probabilistic |
| `Medical_History__c.Diagnosis_Code__c` | Deterministic (equality-match compliance queries) |
| `Medical_History__c.Medication__c`, `Allergy__c`, `Notes__c` | Probabilistic |

Enable in Setup → Platform Encryption → Encryption Policy once the classification matrix lands.
