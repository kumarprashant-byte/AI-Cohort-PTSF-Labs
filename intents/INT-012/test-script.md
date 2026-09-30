---
intent: INT-012
phase: 3
proof_hash: f0a09d18d67e
authored: 2026-09-30
---

# INT-012 — Test script

**Intent:** 15-day assessment escalation to Team Manager
**Phase:** 3 · **Source intent:** `intents/INT-012/intent.md` · **Design:** `intents/INT-012/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-012-C1 | `Assessment__c.Assigned_Date__c`, `Escalated__c`, `Escalated_Date__c` exist with correct types (design § Data model) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-012-C2 | Flow `Assessment_15_Day_Escalation` is Active — Scheduled (daily) on Assessment__c (build target — scheduled scan) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-012-C3 | The Flow filters on `Status = 'Pending Review'` (per Assessment__c's picklist — the intent's shorthand "Pending" maps here) AND `Escalated__c = false` AND `Assigned_Date__c < TODAY - 15` (build target + guardrail 1) | org-probe (flow XML inspection) | ✅ | (verify — green, 2026-09-30) |
| INT-012-C4 | Task OwnerId routes to the practitioner's Team Manager (build target — region-aware Team Manager) | 📋 accepted by Prashant Kumar — INT-005 + INT-020 routing follow-on (Practitioner user mapping + Region on Assessment) | 📋 | — |
| INT-012-C5 | End-to-end: an Assessment created 16 days ago in Pending status runs through the scheduled Flow → Task created with WhatId = Assessment, Assessment.Escalated__c=true, Escalated_Date__c=today (acceptance walkthrough) | Manual scene A | 👁 | _pending_ |
| INT-012-C6 | Double-escalate guardrail: rerunning the Flow on an already-Escalated assessment does not create a second Task (guardrail 1) | Manual scene B | 👁 | _pending_ |

## Automated proofs to write

None — Flow + fields. Structural via org-probe; end-to-end via manual scenes.

## Org assertions

- **INT-012-C1** (fields):
  - `field-exists(Assessment__c.Assigned_Date__c)`, `field-type(Assessment__c.Assigned_Date__c, Formula/Date)`
  - `field-exists(Assessment__c.Escalated__c)`, `field-type(Assessment__c.Escalated__c, Checkbox)`
  - `field-exists(Assessment__c.Escalated_Date__c)`, `field-type(Assessment__c.Escalated_Date__c, Date)`
- **INT-012-C2** (flow active):
  - `flow-active(Assessment_15_Day_Escalation)`
- **INT-012-C3** (flow filters):
  - metadata inspection of the Flow XML — `Get_Pending_Assessments` filters include Status='Pending Review', Escalated__c=false, Assigned_Date__c < $Flow.CurrentDate - 15

## Manual validation scenes

### Scene A — Escalation stamps + Task (criterion C5)
1. As an Assessor persona, create an `Assessment__c` with `Status__c = 'Pending Review'`, linked to an Assignment. Note the Id.
2. Backdate: as an admin, run `sf.cmd data update record --sobject Assessment__c --record-id <id> --values "CreatedDate=2026-09-14T00:00:00Z"` — or (if data-loader blocks the audit field) create a fresh Assessment 16+ days ago via API with audit-field control enabled.
3. Trigger the schedule manually: Setup → Paused Flow Interviews or Flows → Debug → Run — or wait until 02:00 UTC next run.
4. Confirm: a Task exists with `WhatId = <assessment id>`, and the Assessment now shows `Escalated__c = true`, `Escalated_Date__c = TODAY`.
**Expected:** exactly one Task per escalated Assessment; both stamps present. **Sign-off:** _name / date / pass·fail_.

### Scene B — No double-escalation (criterion C6)
1. Take an Assessment already Escalated (from Scene A). Confirm `Escalated__c = true`.
2. Rerun the scheduled Flow manually.
3. Confirm: no new Task created for that Assessment; `Escalated_Date__c` unchanged.
**Expected:** the guardrail holds. **Sign-off:** _name / date / pass·fail_.

## Deliberately not tested (out of scope)

- Team Manager routing correctness — 📋 C4 (INT-005 + INT-020 follow-on).
- Chatter-post escalation variant — intent's `out_of_scope` excludes it.
- Escalation channel decision itself (Q-012-1) — pragmatic answer recorded in `decisions/2026-09-30-INT-012-escalation-channel.md`; a later Ops call flips the Flow's target object.
