---
id: INT-019
phase: 3
epic: E09
confidence: Confirmed
origin: local
title: Practitioner temporary access to medical history via Apex-managed sharing on Assignment__c
ratified: 2026-09-29 by Prashant Kumar @ 67b23cf17f93
---

# INT-019 — Practitioner temporary access to medical history via Apex-managed sharing on Assignment__c

## Outcome

A practitioner sees the patient's medical history only while their Assignment__c sits at Status = Accepted; access appears when the practitioner accepts and disappears the moment the assignment moves off Accepted, with no manual admin step.

## Build target

- Apex trigger on Assignment__c: on Status → Accepted, insert Medical_History__Share rows granting Read to the Practitioner User (identified via the Assignment__c ownership field — INT-009 owns the field's shape) for every Medical_History__c record on the assigned patient
- 'Practitioner Medical History Read' permission set granting Read on Medical_History__c object + FLS on the fields the community record page renders (assigned to Practitioner Community users; the manual share is row access, this is object/field access)
- Same trigger: on Status → Completed / Declined / Reassigned, delete those manual shares
- Trigger is idempotent and bulk-safe (handles list of Assignment__c per DML)

## Guardrails

- Must not grant Edit or Delete via the manual share — Read only
- Must not survive an Assignment moving off Accepted — share deletion must be atomic with the status change
- Must not use standard sharing rules or role-hierarchy grants (INT-004's guardrail carries)

## Out of scope

- Must not change Medical_History__c OWD, Restriction Rule, break-glass permission set, or Shield config (INT-004 owns those)
- Must not build the Assignment__c object itself (INT-009 owns it)

## Acceptance

An Assignment moves to Accepted; the practitioner opens the assignment record and sees the patient's Medical_History__c rows on the page. Move the Assignment to Completed; the practitioner refreshes and the records are gone. Repeat with Declined and Reassigned — same result.

## Success criteria

_none_

## Dependencies

### Internal
- INT-004 — Medical_History__c object, OWD Private, Restriction Rule must exist before manual shares are meaningful
- INT-009 — Assignment__c object must exist for the trigger to attach to

### External
_none_

## Open questions

- Q-019-1: is the practitioner carried on Assignment__c as OwnerId, or as a dedicated Practitioner__c lookup? INT-009's design settles it; the trigger's share-insert reads whichever field. — **ANSWERED 2026-09-29: `Assignment__c.OwnerId` is the Practitioner User** (no separate `Practitioner__c` lookup). Chosen to give the community "My Assignments" list view standard sharing and make reassignment a clean owner change. See `intents/INT-009/design.md` § Data model and `intents/INT-019/design.md`, and `decisions/2026-09-29-design-question-answers.md`.

## Grounding

### Carried (unmapped upstream fields)
- surface: security
