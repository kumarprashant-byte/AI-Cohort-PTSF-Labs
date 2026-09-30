---
intent: INT-016
phase: 4
proof_hash: c82cefe5a1ab
authored: 2026-09-30
---

# INT-016 — Test script

**Intent:** Operational and executive reporting

## Criteria

| ID | Criterion | How proven | Type | Sign-off |
|----|-----------|------------|------|----------|
| INT-016-C1 | Report folder `PTSF_Reports` and dashboard folder `PTSF_Dashboards` exist | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-016-C2 | Custom Report Type `PTSF_Subsidy_Applications` (base object Subsidy_Application__c) deployed | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-016-C3 | Custom Report Type `PTSF_Assignments` (base object Assignment__c) deployed | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-016-C4 | Row-level scoping via OWD (INT-020) — reports written on these report types honor Region__c sharing (no report-level filter needed) | derivation from INT-020-C2..C4 | ✅ | (verify — green, 2026-09-30) |
| INT-016-C5 | Reports (In-Flight by Region, SLA Breach Count, Subsidies Granted by Region) + three persona dashboards created in Setup — 📋 accepted by Prashant Kumar — runbook-INT-016.md click-through (Salesforce report/dashboard metadata deploys are fragile on greenfield orgs; admin creates them in Report Builder against the deployed CRTs) | 📋 | 📋 | — |
| INT-016-C6 | No report or dashboard references Medical_History__c (guardrail 1) — enforced by the click-through step's explicit exclusion list | 👁 | 👁 | _pending_ |
| INT-016-C7 | APAC Regional Ops Manager opens Team Manager Dashboard and sees APAC rows only (acceptance) | Manual scene A | 👁 | _pending_ |
| INT-016-C8 | CRM Analytics escalation when standard reports hit LDV — 📋 accepted by Prashant Kumar — INT-016-follow-on | 📋 | 📋 | — |

## Manual validation scenes

### Scene A — Region isolation on the Team Manager dashboard (C7)
1. Log in as an APAC Regional Ops Manager test user.
2. Open Analytics → PTSF Dashboards → Team Manager Dashboard.
3. Confirm every component shows only APAC rows.
**Expected:** OWD-scoped reporting via INT-020's sharing rules. **Sign-off:** _name / date / pass·fail_.

## Deliberately not tested

- Patient-facing analytics — explicitly out of scope.
- Practitioner acceptance rate — needs a roll-up field not yet computed.
