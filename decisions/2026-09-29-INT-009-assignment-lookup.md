---
date: 2026-09-29
intents: [INT-009]
ratifier: Prashant Kumar
---

# INT-009 Assignment.Application → Lookup (not Master-Detail)

## Context

`intents/INT-009/design.md` § Data model prescribes `Assignment__c.Application__c` as **Master-Detail** to `Subsidy_Application__c` (line 21) *and* also prescribes **OWD Assignment__c: Private** (line 45) so practitioners see only their own assignments. Salesforce refuses both simultaneously: an M-D child inherits sharing from the parent, so `sharingModel=Private` is rejected with `Cannot set sharingModel to Private on a CustomObject with a MasterDetail relationship field` (deploy 0AfoB000000yiarSAA on orgfarm-5f9310b41f, 2026-09-29T13:20Z).

The design is internally contradictory on this seam.

## Change

`Assignment__c.Application__c` is a **required Lookup** (`deleteConstraint: Restrict`) to `Subsidy_Application__c`, not a Master-Detail. Assignment__c OWD stays **Private** (practitioner sees own via `OwnerId`), matching the sharing design (line 45) and INT-019's dependency on the practitioner-owner path.

Trade-offs:

- **Lost:** direct roll-up summary from Application to Assignment count. Replaced by an Apex trigger (INT-010's Scheduled Flow or an `AssignmentTrigger` on `Assignment__c` after insert/delete) that maintains a `Total_Assignments__c` Number field on the Application if needed. Not built here — flagged for INT-008/INT-010.
- **Lost:** cascade-delete of Assignments when the Application is deleted. Replaced by `deleteConstraint: Restrict` on the lookup: the Application can't be deleted while it has open Assignments — semantically stronger for the compliance surface.
- **Preserved:** practitioner isolation (Private OWD + OwnerId), role-hierarchy grants (assessors up the branch), INT-019's manual-share path.

## Consequences

- `intents/INT-009/design.md` line 21 is now inconsistent with the built code. Ratifying this decision does **not** trigger `reverify` (design.md isn't hashed), but the design should be edited in a follow-on `/ql-refine-intent INT-009` pass to note "Application__c is Lookup (see decisions/2026-09-29-INT-009-assignment-lookup.md)".
- `Distance_km__c` formula (design line 25) as `Application__r.Contact__r.Location__c` still works — cross-object formulas traverse Lookup and M-D alike within the 5-relationship depth.
- INT-010's SLA reads `Assignment.Assigned_Date`, `Accepted_Date` directly — unaffected.
