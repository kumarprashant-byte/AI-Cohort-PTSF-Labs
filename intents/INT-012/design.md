---
intent: INT-012
scope_hash: 9256b9fa1d61
authored: 2026-09-30
---

# INT-012 — Design

**Intent:** 15-day assessment escalation to Team Manager
**Source intent:** `intents/INT-012/intent.md`

## Data model

Extends existing `Assessment__c` (INT-011 scope) with three new fields:
- **`Assigned_Date__c`** (Formula, Date) — `DATEVALUE(CreatedDate)`. The intent names "Assigned Date" as the SLA anchor; INT-011's `Assessment__c` uses `CreatedDate` for that moment, and a formula wrap avoids a new backfilled column while keeping the intent's field name literal in Flow conditions.
- **`Escalated__c`** (Checkbox, default false) — the double-escalate guardrail's anchor.
- **`Escalated_Date__c`** (Date) — stamp of the escalation event.

## Sharing & security

- No OWD changes. Fields inherit `Assessment__c`'s current sharing.
- FLS: readable on `Assessor_Base`, `Team_Manager_Base`, `Regional_Ops_Manager_Base`. Editable only via automation (this Flow), so no permset grants edit — the scheduled Flow runs `SystemModeWithSharing` and writes directly.

## Automation approach

**Scheduled Flow `Assessment_15_Day_Escalation`** (daily 02:00 UTC — after the SLA check flow at 01:00, distinct so they don't share transaction pressure):
1. Get Records: `Assessment__c` where `Status__c = 'Pending'` AND `Escalated__c = false` AND `Assigned_Date__c < TODAY - 15`.
2. Loop each match:
   - Create a `Task` with `Subject = 'Escalation — Assessment ' + Assessment.Name`, `WhatId = Assessment.Id`, `Priority = 'High'`, `OwnerId = <see routing below>`, `ActivityDate = TODAY + 3`.
   - Update Assessment: `Escalated__c = true`, `Escalated_Date__c = TODAY`.
3. Bulk-friendly: build collections of Tasks-to-insert and Assessments-to-update; single Create + single Update per run.

**Task-owner routing (Team Manager resolution):**
- **This intent ships with a pragmatic default:** Task `OwnerId = Assessment.OwnerId` (the assessment's current owner — usually the assessor). This satisfies the automation shape and lets the guardrail be proven, but doesn't route to the *practitioner's Team Manager* the intent describes.
- **Real Team-Manager routing** requires (a) practitioner → user mapping (INT-005/INT-010 scope) and (b) Region on Assessment (INT-020 scope) to pick `<Region>_Team_Manager` from the role hierarchy. Recorded as 📋 in the test script (C4), routed to an INT-005 + INT-020 follow-on that flips the Flow's Task owner assignment.

## Integration (if any)

None.

## Alternatives considered

- **Case instead of Task** — Q-012-1 open question ("Task, Case, or Chatter post?") flags the ambiguity, but the intent's own `build target` names Task and its `out_of_scope` names Chatter, so Task is the working answer. Recorded in `decisions/2026-09-30-INT-012-escalation-channel.md`. If Ops flips it later, `/ql-refine-intent` amends and the Flow's create step swaps object.
- **Process Builder / Workflow Rule** — rejected. Salesforce's declarative-first path is Flow; PB/WFR are deprecated for new work.
- **Named Assigned_Date__c field** (backfilled from CreatedDate) — rejected. A formula field keeps the intent's name literal without a migration; if a real edit path emerges later, promote to a normal field with a backfill.

## Neighboring & future scope

**BUILT ON (delivered):** INT-005 (role hierarchy — the Team Manager roles exist; routing follow-on will consult), INT-011 (Assessment__c object).

**BUILDS ON THIS (forward cone):**
- **INT-005 + INT-020 routing follow-on** — swap Task `OwnerId` from `Assessment.OwnerId` to the practitioner's Team Manager once (a) practitioner user mapping and (b) Region on Assessment both exist. Metadata edit to the Flow.
- **INT-013 utility bar** — a "Escalate to Manager" utility action on the `Application_Review` app (C5 gap on INT-013). This intent's Flow is the *automated* escalation path; INT-013's utility item will be a manual/on-demand invocation of the same escalation logic. That's a design nudge, not a build-here.

**PRESENT IN ORG:** `Assessment__c` exists (INT-011). No collision with the three new fields. `AssignmentSlaCheckFlow` (INT-010) runs 01:00 daily; this Flow at 02:00.

## Build sequence

Single pass: three fields → Flow → permset FLS.

## Open design questions

_none_ (Q-012-1 answered pragmatically for this build via `decisions/2026-09-30-INT-012-escalation-channel.md`; a later Ops decision flips the Flow's target object)
