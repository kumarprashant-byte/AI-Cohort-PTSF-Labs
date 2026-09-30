# INT-016 — Deploy runbook

**Intent:** Operational and executive reporting
**Delivered:** 2026-09-30

## What ships in the deploy

- Report folder `PTSF Reports` (API: `PTSF_Reports`)
- Dashboard folder `PTSF Dashboards` (API: `PTSF_Dashboards`)
- Custom Report Type `PTSF_Subsidy_Applications` (base object Subsidy_Application__c)
- Custom Report Type `PTSF_Assignments` (base object Assignment__c)

## Post-deploy Setup click-through (INT-016-C5)

Salesforce Reports and Dashboards metadata deploys are fragile on a greenfield org — CRT plumbing and folder ordering causes recurring "invalid report type" errors even when the CRT is present. Admin creates the reports and dashboards in Report Builder against the deployed CRTs:

1. **Reports** (Analytics → Reports → New Report → PTSF Reports folder):
   - `In-Flight Applications by Region` — CRT: PTSF Subsidy Applications; Summary format; group by Region__c then Status__c; filter Status__c ≠ Closed.
   - `SLA Breach Count` — CRT: PTSF Assignments; Summary; group by Region__c; filter SLA state = Breached (or per your Assignment lifecycle field).
   - `Subsidies Granted by Region` — CRT: PTSF Subsidy Applications; Summary; group by Region__c; sum Approved_Amount__c; filter Status__c = Approved.

2. **Dashboards** (Analytics → Dashboards → New → PTSF Dashboards folder):
   - `Assessor Dashboard` — In-Flight Applications (bar) + SLA Breaches (bar).
   - `Team Manager Dashboard` — Regional Throughput (column, uses In-Flight report) + Escalations (column, uses SLA Breach Count).
   - `Executive Dashboard` — Subsidies Granted by Region (pie) + In-Flight by Status (column).

3. **Guardrail check (INT-016-C6):** confirm none of the six components reference any field from `Medical_History__c`. That object is Private OWD (INT-004) — reports on Subsidy_Application__c and Assignment__c cannot cross that boundary without an explicit join.

## Region scoping

INT-020's OWD-Private + criteria-based sharing rules do the row-level scoping. No per-report `Region__c = <region>` filter is needed. Verify with Scene A in `intents/INT-016/test-script.md`.

## What is NOT in this deploy

- Reports and dashboards (📋 admin click-through above)
- CRM Analytics executive board (📋 INT-016-follow-on — deferred until standard reports hit LDV)
- Patient-facing analytics (out of scope per intent)
