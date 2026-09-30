---
title: PTSF Patient Travel Support — RACI Matrix
authored: 2026-09-30
---

# RACI Matrix

Roles across the 20 intents and delivery lifecycle. Legend: **R** Responsible (does the work) · **A** Accountable (signs off) · **C** Consulted (input required) · **I** Informed (kept aware).

## Roles

| Code | Role | Real-world holder |
|---|---|---|
| TG | Trusted Guide / Architect of record | Prashant Kumar |
| AI | AI builder (this workspace) | Claude Opus 4.7 |
| SFA | Salesforce Admin | PTSF Salesforce Admin |
| PTIT | PTSF IT (identity, integration, infra) | PTSF IT team |
| ROM | Regional Ops Manager | one per region (EMEA/AMER/APAC) |
| TM | Team Manager | one per region |
| HIC | HIC Vendor | External |
| LEG | Legal / Compliance | PTSF Legal |
| MKT | Marketing / Dev (Facebook app) | PTSF Marketing |

## By activity

### Scope definition + refinement

| Activity | TG | AI | SFA | PTIT | ROM | LEG |
|---|---|---|---|---|---|---|
| Author intent | C | R | I | I | C | C |
| Ratify intent (sign) | **A** | R | I | I | C | C |
| Refine an intent (governed edit) | **A** | R | I | I | C | I |
| Decision records | **A** | R | I | I | C | C |

### Design + build

| Activity | TG | AI | SFA | PTIT | HIC |
|---|---|---|---|---|---|
| Author design.md | C | R | C | C | I |
| Ratify design | **A** | R | C | C | I |
| Metadata build (Apex, Flow, objects) | C | R | I | I | I |
| Deploy to sandbox | **A** | R | C | I | I |
| Deploy to production | **A** | I | R | C | I |

### Testing + sign-off

| Activity | TG | AI | SFA | PTIT | ROM | TM |
|---|---|---|---|---|---|---|
| Author test-script.md | C | R | I | I | I | I |
| Run automated tests | I | R | I | I | I | I |
| Run manual (👁) scenes | C | I | R | C | R | R |
| Sign off manual criteria | **A** | I | R | I | R | R |
| Diagnose failures | **A** | R | C | C | I | I |

### Per-intent sign-off responsibility

For the 15 intents with pending 👁 manual criteria:

| Intent | Primary signer | Secondary |
|---|---|---|
| INT-002 (SAML JIT) | PTIT | TG |
| INT-003 (external logins) | MKT + SFA | TG |
| INT-005 (regional users) | PTIT + ROM | TG |
| INT-006 (patient wizard) | SFA | TG |
| INT-008 (application lifecycle) | SFA | TG |
| INT-010 (SLA reassignment) | ROM (regional) | SFA |
| INT-011 (assessment form) | SFA | TM |
| INT-012 (escalation) | TM | ROM |
| INT-013 (assessor console) | SFA | ROM |
| INT-014 (subsidy determination) | ROM | TG |
| INT-015 (chat + bot) | SFA + ROM | TG |
| INT-016 (reporting) | ROM | TM |
| INT-017 (migration) | PTIT + SFA | TG |
| INT-018 (cutover) | **PTIT** | TG + ROM |
| INT-020 (region scoping) | SFA | ROM |

### External integration owners

| System | R (config) | A (approve) | C (spec) | I |
|---|---|---|---|---|
| SAML IdP (3 regional ADs) | PTIT | TG | AI | SFA |
| Facebook Auth Provider | MKT | TG | AI | SFA |
| HIC vendor callout | PTIT | TG | HIC | SFA |
| TAMS export | PTIT | TG | AI | SFA |

### Delivery lifecycle

| Activity | TG | AI | SFA | PTIT | ROM |
|---|---|---|---|---|---|
| Create feature branch + PR | I | R | I | I | I |
| Merge PR → develop | **A** | I | R | I | I |
| Cut release/* branch | **A** | I | R | I | I |
| Promote to production | **A** | I | R | C | C |
| Regional cutover weekend (INT-018) | **A** | I | R | R | R |
| Post-cutover reconciliation | **A** | I | C | R | R |
| Handoff to customer admin (Day-2) | **A** | I | C | C | C |

## Escalation path

1. Build / test issue → **AI** diagnoses → **TG** approves fix scope.
2. Intent / scope conflict → **TG** decides; records `decisions/`.
3. External dependency blocked → **TG** escalates to relevant external role (PTIT/MKT/HIC).
4. Cutover / production issue → **PTIT + TG** joint call; ROM notified per region.
5. Compliance / PHI exposure risk → **LEG** consulted; work halts until cleared.

## Notes

- The **AI builder never signs off** on behalf of a human — it drafts, records, and routes. The Trusted Guide's ratification is the accountable act.
- **Manual test sign-offs must be a named human** — `/ql-record-test-execution` captures the name, date, and result but the person who ran the scene is the signer.
- **Legal has veto over PHI exposure** — any change touching `Medical_History__c` or `Assessment_Response__c` gets a LEG consultation.
