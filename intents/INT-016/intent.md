---
id: INT-016
phase: 4
epic: E11
confidence: Assumed
origin: scopezilla
title: Operational and executive reporting
---

# INT-016 — Operational and executive reporting

## Outcome

Assessors, managers, and executives see the operational and cycle-time metrics they need without any medical-history leakage.

## Build target

- Assessor dashboard: My Queue, SLA breaches, applications-in-flight by status
- Team Manager dashboard: regional throughput, escalation count, practitioner acceptance rate
- Executive dashboard (CRM Analytics if standard reports hit LDV): subsidies granted per region, rejection reasons, cycle time
- All reports run against region-scoped rows; med-history-derived fields are excluded from any internal-facing report

## Guardrails

- Must not surface any Medical_History__c field, count, or derived metric on an internal report
- Must not aggregate across regions on a Regional Ops dashboard

## Out of scope

- Must not build patient-facing analytics

## Acceptance

An APAC Regional Ops Manager opens their dashboard, sees 200 in-flight APAC applications, a 5% SLA breach count, and no data leaks across into EMEA or AMER.

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
- surface: console
