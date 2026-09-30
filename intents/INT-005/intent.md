---
id: INT-005
phase: 1
epic: E09
confidence: Assumed
origin: scopezilla
title: Regional user model and role hierarchy
ratified: 2026-09-30 by Prashant Kumar @ 3a454bd1c005
---

# INT-005 — Regional user model and role hierarchy

## Outcome

Every User and Contact carries the region they belong to, and the role hierarchy is modeled per region — the scaffolding downstream sharing (INT-020) plugs into once the region-scoped custom objects exist.

## Build target

- Region__c on User and Contact
- Role hierarchy modeled per region (Regional Ops Manager → Team Manager → Assessor)
- Permission set groups per Profile × Region combination

## Guardrails

- Must not apply this pattern to Medical_History__c (INT-004 owns it)
- Must not let a role-hierarchy grant cross regions

## Out of scope

- Must not add Region__c to Subsidy_Application__c / Assignment__c / Assessment__c — those objects don't exist yet; INT-020 owns Region on them (with the OWD + criteria sharing rules) once they're created
- Must not build cross-region reporting overrides (Reporting phase decides)

## Acceptance

An APAC Assessor and an EMEA Regional Ops Manager both log in; each User record carries the correct Region__c value; each user's role sits in the expected regional branch of the hierarchy; each user has the Profile × Region permission-set group assigned.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
_none_

## Open questions

- Q-005-1: which profiles get regionalized (Assessor, Team Manager, Regional Ops Manager only, or every internal profile including Compliance Officer / System Administrator)? Determines the PSG count.

## Grounding

### Carried (unmapped upstream fields)
- surface: security
