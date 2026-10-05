---
title: PTSF Patient Travel Support — Project Charter
authored: 2026-09-30
sponsor: PTSF Executive Leadership
trusted_guide: Prashant Kumar
---

# Project Charter

## Purpose
Consolidate the three regional TAMS (Travel Assistance Management System) instances into a single Salesforce-based platform that serves patients seeking subsidised medical travel, the practitioners who deliver assessments, and PTSF's regional operations teams.

## Business drivers
- **Retire legacy TAMS** — three fragmented regional stacks with divergent data models and no unified reporting.
- **Patient experience** — self-service application intake, real-time status, localised communication.
- **PHI compliance** — enforce Private OWD on medical history, restriction rules, break-glass audit trail.
- **Operational visibility** — regional dashboards for Team Managers and executives.

## Scope

### In scope (20 delivered intents)
- Salesforce org provisioning + DevOps pipeline (INT-001)
- Identity + regional user model (INT-002, INT-005)
- Patient + Practitioner login surfaces (INT-003)
- PHI security foundation + region scoping (INT-004, INT-020)
- Patient portal onboarding wizard (INT-006)
- Async HIC integration (INT-007)
- Application lifecycle with auto-reject (INT-008)
- Practitioner community + auto-assignment (INT-009)
- SLA reassignment (INT-010)
- Digital assessment form (INT-011)
- 15-day escalation (INT-012)
- Assessor Service Console (INT-013)
- Subsidy determination Flow (INT-014)
- Chat + bot + KB (INT-015)
- Reporting (INT-016)
- Practitioner MHE temporary access (INT-019)
- TAMS→Salesforce migration ETL (INT-017)
- Per-region cutover with dual-run (INT-018)

### Out of scope
- Real HIC vendor endpoint enablement (deferred to production)
- Real IdP metadata configuration (deferred to PTSF IT handoff)
- TAMS hardware decommission (PTSF IT owns)
- Global AD federation
- Patient-facing analytics
- Practitioner acceptance rate roll-up

## Success criteria
- All 20 intents ✅ Delivered (met — 2026-09-30)
- Automated test coverage ≥ 39 Apex tests green (met)
- Zero critical defects on merge to `develop` (met)
- Structural org-probes verified for all `✅` criteria (met — verify-evidence 2026-09-30)
- 15 pending 👁 manual sign-offs completed before production cutover (pending)
- Regional cutover with < 4 hours per-region downtime (pending)

## Governance
- **Trusted Guide (Architect of record):** Prashant Kumar. Owns Intent, signs off ratification, decides scope disputes.
- **Delivery method:** QL AI-native (agent builds; human ratifies). Every scope change carries a `decisions/` record. `intents/` is canonical; `scopezilla/` is a read-only mirror.
- **Pipeline:** `feature/* → develop → release/* → main → prod`. Agent lane ends at PR into `develop`.
- **CI gates:** `validate`, `drift`, `coverage --gate` — no `--no-verify`, no bypass.
- **Reviews:** intent-only PRs skip build gauntlet but still run Intent trust chain; build PRs run the full CI.

## Assumptions
See `delivery/raid-log.md` § Assumptions.

## Risks
Top risks: HIC vendor spec still open, IdP metadata not received, 15 manual sign-offs pending, TAMS cutover dual-run drift. See `delivery/raid-log.md` § Risks.

## High-level timeline
| Phase | Focus | Status |
|---|---|---|
| 0 | Discovery + scope | Complete |
| 1 | Foundation (org, identity, security) | ✅ Delivered |
| 2 | Patient intake + HIC | ✅ Delivered |
| 3 | Practitioner + assessment | ✅ Delivered |
| 4 | Business logic + operational surfaces | ✅ Delivered |
| 5 | Migration + cutover | ✅ Delivered (metadata); cutover pending |

## Deliverables (top-level)
- **Working org** — `epic.out.e68d765f4115@orgfarm.salesforce.com` (203 components deployed)
- **20 intent packages** — each with `intent.md`, `design.md`, `test-script.md`, `runbook`
- **Test artifacts** — 39 Apex tests, seed data script, manual test checklist
- **Governance artifacts** — intent ledger, decision records, RAID log, RACI matrix, this charter
- **Capability map** — `delivery/capability-map.html` for stakeholder walkthroughs
