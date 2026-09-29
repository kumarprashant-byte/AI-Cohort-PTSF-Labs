---
id: INT-009
phase: 3
epic: E04
confidence: Confirmed
origin: scopezilla
title: Practitioner community and geolocation-based auto-assignment
ratified: 2026-09-29 by Prashant Kumar @ e7826a71b17e
---

# INT-009 — Practitioner community and geolocation-based auto-assignment

## Outcome

When a subsidy application is not auto-rejected, the nearest available practitioner in the treatment specialty is auto-assigned within a few seconds of submission.

## Build target

- Partner Community licenses provisioned for ~4,000 practitioners (subject to G0101 resolution)
- Contact geocoded on Address change (Location__c geolocation field)
- Practitioner_Specialty__c junction between Contact and Treatment_Type__c
- Assignment__c custom object with Status (Assigned / Accepted / Declined / Completed / Reassigned)
- Apex trigger on Subsidy_Application__c after HIC completion → enqueue Queueable `AssignmentSelector`
- SOQL selection by DISTANCE() from patient Location__c, filtered by specialty, On_Leave__c = false, Current_Load__c < Capacity_Max__c, excluding previously-declined practitioners
- Community record page for Assignment__c with Accept / Decline buttons and Medical_History__c related list (visible only via INT-004's sharing)

## Guardrails

- Must not select a practitioner outside the patient's region (patient's Region drives BusinessHours downstream)
- Must not assign more than one open Assignment per application at a time
- Must not expose an application's Medical_History__c to a practitioner before their Assignment reaches Accepted

## Out of scope

- Must not build the reassignment SLA clock (INT-010 owns it)
- Must not build the assessment form (INT-011 owns it)

## Acceptance

A submitted application in APAC with treatment 'Oncology → Radiation Therapy' fires the trigger; within 5 seconds, an Assignment__c exists on the nearest oncology-capable, on-duty APAC practitioner. That practitioner opens the community, sees the assignment tile, opens it, and can see the patient's Medical_History__c rows.

## Success criteria

_none_

## Dependencies

### Internal
- INT-003
- INT-004 — Medical_History__c must exist; the community record page's related list is gated by INT-004's Private OWD + INT-019's manual share
- INT-005 — Contact.Region__c drives the region guardrail on selection
- INT-008

### External
_none_

## Open questions

- Q-009-1: What tie-breakers apply when two practitioners tie on distance (load, longest-since-last-assignment, random)? (Resolver: PTSF Ops leadership + IA) — UNANSWERED

## Grounding

### Carried (unmapped upstream fields)
- surface: experience-cloud
