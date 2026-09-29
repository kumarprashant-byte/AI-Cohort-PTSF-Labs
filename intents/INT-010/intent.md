---
id: INT-010
phase: 3
epic: E04
confidence: Confirmed
origin: scopezilla
title: 3-business-day accept-or-reassign SLA with regional Business Hours
---

# INT-010 — 3-business-day accept-or-reassign SLA with regional Business Hours

## Outcome

A practitioner who doesn't accept an assignment within 3 business days for their region has the assignment automatically reassigned to the next-nearest eligible practitioner.

## Build target

- Scheduled Flow running nightly at 01:00 local per region
- Query: Assignment__c where Status = Assigned AND Accepted_Date = null AND Assigned_Date < TODAY minus 3 business days (per the practitioner's Region Business Hours)
- On match: set Status = Reassigned, add practitioner to previously-declined set on the Application, enqueue AssignmentSelector (INT-009) to pick the next candidate
- Email notification to the practitioner explaining the reassignment (localized)

## Guardrails

- Must not use calendar days — business days per Region Business Hours only
- Must not reassign an application without excluding the previously-declined practitioner

## Out of scope

- Must not escalate to a manager here — INT-012 owns 15-day escalation

## Acceptance

An assignment made in APAC at 10:00 Monday, with Region Business Hours excluding weekends and local holidays, remains unaccepted; by 01:00 the following Friday (3 business days elapsed) the Scheduled Flow reassigns it to the next candidate, and the original practitioner receives a localized 'assignment reassigned' email.

## Success criteria

_none_

## Dependencies

### Internal
- INT-009

### External
_none_

## Open questions

- Q-010-1: Whose Business Hours drive the clock — the practitioner's region, the patient's region, or the assessing region? (Resolver: PTSF Ops leadership + IA) — UNANSWERED

## Grounding

### Carried (unmapped upstream fields)
- surface: automation
