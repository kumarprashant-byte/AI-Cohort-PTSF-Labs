---
id: INT-005
phase: 1
epic: E09
confidence: Assumed
origin: scopezilla
title: Region-scoped OWD and role hierarchy for non-PHI records
---

# INT-005 — Region-scoped OWD and role hierarchy for non-PHI records

## Outcome

Every non-PHI record is scoped to its region by default — an APAC Assessor doesn't see EMEA cases, and reports honor row-level security automatically.

## Build target

- Region__c on User, Contact, Subsidy_Application__c, Assignment__c, Assessment__c
- OWD Public Read-Only for Subsidy_Application__c, Assignment__c, Assessment__c with a criteria-based sharing rule constraining visibility to same-Region users
- Role hierarchy modeled per region (Regional Ops Manager → Team Manager → Assessor)
- Permission set groups per Profile × Region combination

## Guardrails

- Must not apply this pattern to Medical_History__c (INT-004 owns it)
- Must not let a role-hierarchy grant cross regions

## Out of scope

- Must not build cross-region reporting overrides (Reporting phase decides)

## Acceptance

An APAC Assessor opens the All Open Applications list view and sees only APAC applications; the EMEA Regional Ops Manager sees only EMEA.

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
- surface: security
