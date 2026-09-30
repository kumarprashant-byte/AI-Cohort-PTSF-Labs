---
id: INT-014
phase: 4
epic: E06
confidence: Assumed
origin: scopezilla
title: Subsidy determination Flow with regional threshold approval
ratified: 2026-09-30 by Prashant Kumar @ b4a09a4178cf
---

# INT-014 — Subsidy determination Flow with regional threshold approval

## Outcome

The Assessor uses a decision-support tool that proposes a subsidy amount from distance × transport type; if the amount exceeds a regional threshold, an Approval Process routes it to a Team Manager.

## Build target

- Subsidy_Determination_Rule__c custom object holding transport-type multipliers per region
- Screen Flow 'Determine Subsidy' invoked from INT-013's utility bar; computes proposed amount from Practitioner.Distance_From_Patient × Transport_Type multiplier
- Assessor can adjust the amount with a reason field
- Approval Process: if Amount > Region.Threshold__c, route to Team Manager (role hierarchy)
- Subsidy_Application__c fields: Proposed_Amount__c, Approved_Amount__c, Adjustment_Reason__c

## Guardrails

- Must not commit a subsidy amount that skips the approval process where required
- Must not use a global threshold — Region.Threshold__c drives it

## Out of scope

- Must not integrate to a payment system (G0603 unresolved)

## Acceptance

An Assessor in EMEA determines a subsidy of €1,800 (threshold €1,500); the Approval Process routes to the EMEA Team Manager, who approves; the application moves to Approved with Approved_Amount__c populated.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
_none_

## Open questions

- Q-014-1: Is the decision-support mechanism a business rule engine, this Flow-based calculator, or a reference-table lookup? (Resolver: PTSF Program Sponsor + IA) — UNANSWERED

## Grounding

### Carried (unmapped upstream fields)
- surface: screen-flow
