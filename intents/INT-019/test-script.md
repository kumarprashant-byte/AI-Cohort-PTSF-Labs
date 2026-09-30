---
intent: INT-019
proof_hash: 8df167a79bd5
authored: 2026-09-29
---

# INT-019 — Test script

**Intent:** Practitioner temporary access to Medical_History__c during accepted assignments
**Design:** `intents/INT-019/design.md`
**Design deviation:** Manual RowCause instead of custom `Practitioner_Assignment_Share` sharing reason — see `decisions/2026-09-29-INT-019-manual-rowcause.md`.

## Criteria

| Id | Criterion | Type | How proven | Sign-off |
|---|---|---|---|---|
| INT-019-C1 | `AssignmentShareService.grantForAssignments` inserts `Medical_History__Share` rows with `AccessLevel=Read`, `RowCause=Manual` for each Medical_History__c whose Patient__c matches the Assignment's Application patient, granted to `Assignment.OwnerId` | ✅ | Apex test `AssignmentShareServiceTest.acceptGrantsShares` — 2 histories per patient, assignment transitions to Accepted, 2 share rows asserted with correct fields | Prashant Kumar / 2026-09-29 / pass — evidence deploy 0AfoB000000yihJSAQ |
| INT-019-C2 | `AssignmentShareService.revokeForAssignments` deletes the shares it inserted when Assignment transitions off Accepted (Declined/Reassigned/Completed) | ✅ | Apex test `AssignmentShareServiceTest.declineRevokesShares` — after Accept then Decline, share count is 0 for the practitioner user | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-019-C3 | Grant is idempotent — re-calling `grantForAssignments` for an already-shared assignment adds no duplicate rows | ✅ | Apex test `AssignmentShareServiceTest.grantIsIdempotent` — share count stays at 2 after second grant call | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-019-C4 | `AssignmentShareTrigger` on `Assignment__c` after-update routes Status transitions to `grantForAssignments` (into Accepted) and `revokeForAssignments` (out of Accepted) | ✅ | Both `acceptGrantsShares` and `declineRevokesShares` drive the trigger path (not the service directly) — deploy log shows trigger deployed active | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-019-C5 | Each grant + revoke writes an `Audit_Log__c` row with `Action__c='Manual_Share_Insert'` / `'Manual_Share_Delete'`, `Target_Object_Type__c='Medical_History__c'`, `Target_Object_Id__c` = share's ParentId | ✅ | Both tests assert `Audit_Log__c` row counts by Action__c after their respective transitions | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-019-C6 | Custom Apex Sharing Reason `Practitioner_Assignment_Share` (from design § Data model) | 👁 | **Deferred** — orgfarm dev edition rejects SharingReason source deployment in every tested format. Manual RowCause substitute stands; see `decisions/2026-09-29-INT-019-manual-rowcause.md`. Runbook § Custom Row Cause for the future refit. | Prashant Kumar / 2026-09-29 / deferred-as-is / → decisions/2026-09-29-INT-019-manual-rowcause.md |
