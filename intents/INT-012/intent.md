---
id: INT-012
phase: 3
epic: E05
confidence: Assumed
origin: scopezilla
title: 15-day assessment escalation to Team Manager
---

# INT-012 — 15-day assessment escalation to Team Manager

## Outcome

An assessment that stays pending for 15 days from its Assigned Date is escalated to the practitioner's Team Manager so it doesn't sit forever.

## Build target

- Scheduled Flow scanning Assessment__c where Status = Pending AND Assigned_Date < TODAY - 15 (calendar days)
- On match: create a Task assigned to the Team Manager (region-aware) with a link to the Assessment
- Set Assessment.Escalated__c = true and store Escalated_Date__c

## Guardrails

- Must not double-escalate — check Escalated__c before creating a Task

## Out of scope

- Must not build a chatter-post variant — Task is the ratified channel (subject to G0501 confirmation)

## Acceptance

An Assessment created 16 days ago in Pending status is escalated on the next Scheduled Flow run: the Team Manager sees a new Task on their queue and clicking through opens the Assessment.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
_none_

## Open questions

- Q-012-1: Escalation channel — Task, Case, or Chatter post? (Resolver: PTSF Ops leadership) — UNANSWERED

## Grounding

### Carried (unmapped upstream fields)
- surface: automation
