---
id: INT-001
phase: 1
epic: E12
confidence: Confirmed
origin: scopezilla
title: Provision org, sandboxes, and DevOps pipeline
---

# INT-001 — Provision org, sandboxes, and DevOps pipeline

## Outcome

A production org and lower sandboxes are stood up with a source-controlled CI/CD flow so every subsequent phase deploys metadata predictably.

## Build target

- Production org, Full Sandbox, Partial Sandbox, and N Developer Pro sandboxes exist and are named per convention
- Source repo holds the base metadata (profiles, permission sets, custom settings, base custom objects)
- CI/CD pipeline deploys a change from a feature branch through Partial → Full → Production
- LDV baseline set: skinny table + selective indexes on Subsidy_Application__c placeholder, Big Object archival design captured
- Business Hours records exist per region (APAC, EMEA, AMER) for downstream SLA math

## Guardrails

- Must not create org-wide sharing rules or Restriction Rules (INT-004 owns PHI security)
- Must not create the Subsidy_Application__c or Assignment__c objects (INT-007/INT-009 own them)
- Must not enable Shield Platform Encryption without the Phase 0 PHI classification signoff

## Out of scope

- Must not stand up per-region orgs (deferred to G0904 resolution)
- Must not procure Partner Community licenses (belongs to INT-009)

## Acceptance

A DevOps engineer merges a trivial custom-label change on a feature branch, watches CI promote it through the sandbox tiers to Production, and confirms the label appears in Setup in each org.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
- Salesforce Licensing | Service Cloud + Experience Cloud + sandbox licenses provisioned | owner: PTSF IT

## Open questions

_none_

## Grounding

### Carried (unmapped upstream fields)
- surface: devops
