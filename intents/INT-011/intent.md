---
id: INT-011
phase: 3
epic: E05
confidence: Confirmed
origin: scopezilla
title: Digital assessment form with specialist re-referral
ratified: 2026-09-30 by Prashant Kumar @ e5c327e92065
---

# INT-011 — Digital assessment form with specialist re-referral

## Outcome

A practitioner completes a treatment-specific digital assessment inside the community, replacing the current PDF flow, and can spawn a specialist re-referral when needed.

## Build target

- Assessment__c custom object linked to Assignment__c
- LWC Assessment component that loads a dynamic form from metadata-driven layouts keyed by Treatment_Type__c
- Save-draft support; submission moves Assessment to Pending Review
- 'Request specialist assessment' action creates a child Assessment__c and a new Assignment__c via INT-009's logic filtered to the specialist specialty
- Attachments (imaging, prior reports) uploadable and linked to Assessment__c

## Guardrails

- Must not let a practitioner see or edit an Assessment for an Assignment they don't own
- Must not accept a submission without all metadata-required fields for the treatment type

## Out of scope

- Must not implement the 15-day escalation (INT-012 owns it)
- Must not build the assessor review console (INT-013 owns it)

## Acceptance

A practitioner with an accepted oncology assignment opens the Assessment LWC, sees the oncology-specific form, saves a draft, returns the next day, completes it, and submits. A second run: they request a specialist assessment; a child Assessment is created and a new Assignment appears on the assigned specialist's community home.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
_none_

## Open questions

_none_

## Grounding

### Carried (unmapped upstream fields)
- surface: lwc
