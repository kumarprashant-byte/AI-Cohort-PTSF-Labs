---
id: INT-008
phase: 2
epic: E02
confidence: Confirmed
origin: scopezilla
title: Subsidy application lifecycle with treatment picker and auto-reject
ratified: 2026-09-30 by Prashant Kumar @ eebdfaf09a89
---

# INT-008 — Subsidy application lifecycle with treatment picker and auto-reject

## Outcome

A patient submits a subsidy application, picks a treatment from a hierarchy of 500+ leaves, and — if HIC confirms their insurance covers travel — sees the application auto-rejected with a plain-language explanation.

## Build target

- Subsidy_Application__c custom object with status state machine (Draft → Submitted → HIC-check pending → Awaiting Practitioner → Assessment → Approved/Rejected)
- Treatment_Type__c hierarchical object with a metadata-driven picker component
- Medical_History__c snapshot mechanism captured at submission time
- On-submit Flow that fires `HIC_Entitlement_Requested__e` (INT-007) and moves status to HIC-check pending
- On HIC completion: if entitlement covers travel, auto-reject Flow generates a localized explanation and emails the patient; else move to Awaiting Practitioner (INT-009 picks it up)
- Selective indexes on Status + Region + Created_Date (the skinny table is deferred to the design record INT-001 carries — a Support case can't be filed against the capstone org)

## Guardrails

- Must not allow submission before Contact.Onboarding_Complete__c
- Must not let a patient edit an application after submission (a corrections workflow is out of scope this phase)

## Out of scope

- Must not assign a practitioner (INT-009 owns assignment)
- Must not decide subsidy amount (INT-014 owns determination)

## Acceptance

A patient completes onboarding, opens a new application, picks 'Oncology → Radiation Therapy' from the hierarchical picker, submits; HIC returns 'covered by insurance' in 6 seconds; the patient sees an auto-reject screen in their language with the reason and a localized rejection email arrives.

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
- surface: screen-flow
