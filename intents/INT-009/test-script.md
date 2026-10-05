---
intent: INT-009
proof_hash: 2b0476bc3292
authored: 2026-09-29
---

# INT-009 — Test script

**Intent:** Practitioner community and geolocation-based auto-assignment
**Design:** `intents/INT-009/design.md`
**Design deviation:** `Assignment__c.Application__c` is Lookup (not M-D) — see `decisions/2026-09-29-INT-009-assignment-lookup.md`.

## Criteria

| Id | Criterion | Type | How proven | Sign-off |
|---|---|---|---|---|
| INT-009-C1 | `Assignment__c` deployed with OWD Private, `OwnerId` addressable, and fields `Application__c` (Lookup, required, restrict-delete), `Practitioner_Contact__c`, `Status__c`, `Assigned_Date__c` (default NOW), `Accepted_Date__c`, `Decline_Reason__c` | ✅ | `SELECT QualifiedApiName FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName='Assignment__c'` returns all six; `EntityDefinition.InternalSharingModel='Private'` | Prashant Kumar / 2026-09-29 / pass — evidence deploy 0AfoB000000yicHSAY |
| INT-009-C2 | `Practitioner_Specialty__c` junction with two Master-Detail fields (`Practitioner__c` → Contact, `Treatment_Type__c` → Treatment_Type__c) | ✅ | Describe the object; both M-D fields present, `sharingModel=ControlledByParent` | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-009-C3 | Contact extensions: `Region__c` picklist (APAC/EMEA/AMER), `Location__c` geolocation, `Capacity_Max__c` number, `On_Leave__c` checkbox | ✅ | `SELECT QualifiedApiName, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName='Contact' AND QualifiedApiName IN ('Region__c','Location__c','Capacity_Max__c','On_Leave__c')` returns 4 rows with expected types | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-009-C4 | `Subsidy_Application__c` scaffold with `Patient__c` (Contact lookup, required), `Treatment_Type__c` lookup, `Status__c` picklist including `Awaiting_Practitioner`, `Previously_Declined_Practitioners__c` LongText | ✅ | FieldDefinition query returns all four; picklist value `Awaiting_Practitioner` present | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-009-C5 | `Treatment_Type__c` reference-list object deployed with OWD Public Read | ✅ | Object describe returns `sharingModel='Read'` | Prashant Kumar / 2026-09-29 / pass — evidence deploy |
| INT-009-C6 | `AssignmentSelector` Queueable + `SubsidyApplicationTrigger` + `AssignmentTrigger` + geocoding + community Sharing Set | 👁 | **Deferred to runbook** — Apex + community + geocoding all gated on Q-design-009-1..5 and INT-003/005/008 completion. See `delivery/runbook-INT-009.md` § Automation, § Community. | Prashant Kumar / 2026-09-29 / deferred-as-is / → decisions/2026-09-29-INT-009-assignment-lookup.md |
| INT-009-C7 | `Current_Load__c` roll-up on Contact (COUNT of Assignment__c where Status IN Assigned/Accepted, via `Practitioner_Contact__c` lookup) | 👁 | **Deferred to runbook** — a roll-up summary needs the lookup to be Master-Detail; alternative is Apex trigger maintenance. Runbook § Load tracking. | Prashant Kumar / 2026-09-29 / deferred-as-is / → decisions/2026-09-29-INT-009-assignment-lookup.md |
| INT-009-C8 | `Distance_km__c` formula on Assignment__c using DISTANCE() | 👁 | **Deferred** — formula requires the `Owner:User.Contact.Location__c` traversal path to be verified against Q-design-009-2 (cross-object depth). Runbook § Distance formula. | Prashant Kumar / 2026-09-29 / deferred-as-is / → decisions/2026-09-29-INT-009-assignment-lookup.md |

## Notes

- INT-009's data-model foundation is delivered; the automation + community layer is bounded off to the runbook until the five Q-design-009 questions close and INT-005 + INT-008 are built.
- The Application__c → Lookup deviation stands until design.md is refined in a follow-on pass.
