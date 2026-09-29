---
id: INT-001
phase: 1
epic: E12
confidence: Confirmed
origin: scopezilla
title: Provision capstone org and DevOps pipeline
ratified: 2026-09-29 by Prashant Kumar @ 268745afcc83
---

# INT-001 — Provision capstone org and DevOps pipeline

## Outcome

A single capstone org and a source-controlled CI/CD flow are stood up so every subsequent phase deploys metadata predictably. The capstone org plays every role (prod + sandbox tiers) for this engagement; multi-tier provisioning is deferred until licensed tenants exist.

## Build target

- A single capstone org exists and is authenticated as the engagement's default target (alias `ptsf-lab`)
- Source repo holds the base metadata (profiles, permission sets, custom settings) — custom objects are owned by their phase intents (INT-004 Medical_History__c, INT-008 Subsidy_Application__c, INT-009 Assignment__c, etc.), not deployed here
- CI/CD pipeline deploys a change from a feature branch, through `develop`, into the capstone org
- LDV baseline is captured as a design record — skinny-table + selective-index approach for the future Subsidy_Application__c, and Big Object archival design — no metadata is deployed for this bullet
- Business Hours records exist in the capstone org per region (APAC, EMEA, AMER); the SLA-math consumer is not yet named (Q-001)

## Guardrails

- Must not create org-wide sharing rules or Restriction Rules (INT-004 owns PHI security)
- Must not create the Subsidy_Application__c or Assignment__c objects (INT-008/INT-009 own them)
- Must not enable Shield Platform Encryption without the Phase 0 PHI classification signoff

## Out of scope

- Must not stand up separate Production / Full / Partial / Developer Pro tenants — the capstone org plays all roles (deferred to a real-licensed-tenant engagement)
- Must not execute the LDV skinny-table request against Salesforce Support — Support cases against production require a real production tenant; captured as design only
- Must not stand up per-region orgs (deferred to G0904 resolution)
- Must not procure Partner Community licenses (belongs to INT-009)

## Acceptance

A DevOps engineer merges a trivial custom-label change on a feature branch, watches CI deploy it into the capstone org, and confirms the label appears in Setup.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
- Salesforce Licensing | Capstone org access (orgfarm lab is sufficient; licensed tenants deferred) | owner: PTSF IT

## Open questions

- Q-001: which intent owns the SLA math that consumes the regional Business Hours records? (Assessment lifecycle, practitioner allocation, or a dedicated SLA intent?) — **ANSWERED 2026-09-29: INT-010** (3-business-day accept-or-reassign SLA); the BusinessHours records seeded here are read by INT-010's Scheduled Flow. See `intents/INT-001/design.md` § Neighboring & future scope and `decisions/2026-09-29-design-question-answers.md`.

## Grounding

### Carried (unmapped upstream fields)
- surface: devops
