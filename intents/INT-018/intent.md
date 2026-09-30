---
id: INT-018
phase: 5
epic: E10
confidence: Confirmed
origin: scopezilla
title: Per-region cutover with 4-week dual-run
ratified: 2026-09-30 by Prashant Kumar @ 570be557cf40
---

# INT-018 — Per-region cutover with 4-week dual-run

## Outcome

Each region cuts over from TAMS to Salesforce with a 4-week dual-run tail so in-flight work completes without disruption, then TAMS goes read-only.

## Build target

- Cutover runbook per region (smallest region first, then next-largest, then largest)
- Freeze window for TAMS new-application intake during the migration batch
- 4-week dual-run window: new applications go to Salesforce, in-flight TAMS applications stay in TAMS and finish there
- Post-cutover: TAMS becomes read-only per region; reconciliation report signed off by Regional Ops Manager
- Rollback plan documented (fail fast in the first 48 hours)

## Guardrails

- Must not cut over more than one region on the same weekend
- Must not close the dual-run window before every in-flight TAMS application has completed

## Out of scope

- Must not decommission TAMS hardware (PTSF IT owns that after read-only cutover)

## Acceptance

AMER-pilot region cuts over on a Friday night; Monday morning, new applications flow into Salesforce; the last in-flight TAMS application closes on day 24; on day 29 TAMS-AMER is set read-only and the Regional Ops Manager signs the reconciliation report.

## Success criteria

_none_

## Dependencies

### Internal
- INT-017

### External
_none_

## Open questions

_none_

## Grounding

### Carried (unmapped upstream fields)
- surface: devops
