---
id: INT-002
phase: 1
epic: E08
confidence: Assumed
origin: scopezilla
title: Federate three regional Active Directories with JIT provisioning
ratified: 2026-09-30 by Prashant Kumar @ c066bc1dbd9d
---

# INT-002 — Federate three regional Active Directories with JIT provisioning

## Outcome

Internal PTSF users sign in with their regional AD credentials and land in Salesforce with Region and Language attributes pre-populated.

## Build target

- Three SAML Single Sign-On configurations (one per regional AD: APAC, EMEA, AMER)
- JIT provisioning handler that creates the User with Profile, Region__c, and Language attributes from the SAML assertion
- MyDomain configured; login page routes each region to the correct IdP
- Named permission set for each region grants regional data-scope access

## Guardrails

- Must not federate patient or practitioner logins (INT-003 owns those)
- Must not grant a JIT-provisioned user any PHI-access permission set

## Out of scope

- Must not build a global AD federation (three regional trusts is the ratified design)

## Acceptance

An Assessor in EMEA authenticates against the EMEA AD, lands in Salesforce with Region__c = EMEA and Language = French pre-set, and can open a French-locale application list view.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
- PTSF Regional AD (APAC/EMEA/AMER) | SAML metadata + JIT attribute contract | owner: PTSF IT / regional AD admins

## Open questions

_none_

## Grounding

### Carried (unmapped upstream fields)
- surface: security
