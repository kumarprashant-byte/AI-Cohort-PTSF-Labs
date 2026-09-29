---
id: INT-020
phase: 3
epic: E09
confidence: Confirmed
origin: local
title: Region scoping and OWD sharing on subsidy/assignment/assessment objects
---

# INT-020 — Region scoping and OWD sharing on subsidy/assignment/assessment objects

## Outcome

Once the region-scoped custom objects exist, each row carries the region it belongs to and users see only their own region's rows — an APAC Assessor doesn't see EMEA cases, and reports honor row-level security automatically.

## Build target

- Region__c on Subsidy_Application__c, Assignment__c, Assessment__c (populated at insert from the parent Contact / owning User's Region)
- OWD Public Read-Only on all three objects
- Criteria-based sharing rule per object constraining visibility to same-Region users
- List views (My Region's Open Applications, etc.) filtered by Region

## Guardrails

- Must not apply this pattern to Medical_History__c (INT-004 owns it — PHI stays Private OWD)
- Must not let a role-hierarchy grant cross regions
- Must not populate Region__c from the running User's context at query time — it's a persisted field so sharing rules can act on it

## Out of scope

- Must not build cross-region reporting overrides (Reporting phase decides)

## Acceptance

An APAC Assessor opens the All Open Applications list view and sees only APAC applications; the EMEA Regional Ops Manager opens the same list view and sees only EMEA; the SOQL `SELECT Id FROM Subsidy_Application__c` returns only the caller's region for both.

## Success criteria

_none_

## Dependencies

### Internal
- INT-005 — Region__c on User + role hierarchy + Profile × Region permission-set groups
- INT-008 — Subsidy_Application__c
- INT-009 — Assignment__c
- INT-011 — Assessment__c

### External
_none_

## Open questions

_none_

## Grounding

### Carried (unmapped upstream fields)
- surface: security
