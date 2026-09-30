---
id: INT-013
phase: 3
epic: E06
confidence: Confirmed
origin: scopezilla
title: Assessor Service Console for application review
ratified: 2026-09-30 by Prashant Kumar @ ebef5bab7440
---

# INT-013 — Assessor Service Console for application review

## Outcome

An Assessor works a subsidy application end-to-end in a Service Console app that shows everything relevant except medical history.

## Build target

- Service Console app 'Application Review' with Subsidy_Application__c as primary tab
- Related lists: Assessment(s), HIC_Check(s), Practitioner info (Contact card)
- Medical_History__c intentionally NOT shown (INT-004's Restriction Rule enforces)
- Utility bar with a 'Determine Subsidy' launcher (INT-014) and 'Escalate to Manager' action
- List views for My Queue, Regional Queue, SLA Breached

## Guardrails

- Must not expose Medical_History__c anywhere in this console — no related list, no lookup, no report
- Must not surface an application from a different region on a Regional Ops list view

## Out of scope

- Must not build the determination Flow (INT-014 owns it)
- Must not build managerial approval routing (INT-015 owns it)

## Acceptance

An APAC Assessor opens the console, sees My Queue with only APAC applications, opens one, sees the Assessment and HIC_Check tiles, tries to reach medical history — nothing exists in the UI to reach it — and clicks Determine Subsidy to launch INT-014.

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
- surface: console
