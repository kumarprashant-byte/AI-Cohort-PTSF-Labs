---
intent: INT-017
phase: 5
proof_hash: 1dca234d70ce
authored: 2026-09-30
---

# INT-017 — Test script

**Intent:** TAMS-to-Salesforce data migration ETL and dedup
**Phase:** 5 · **Source intent:** `intents/INT-017/intent.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-017-C1 | Migration_Staging__c canonical schema exists (build target) | org-probe: `object-exists(Migration_Staging__c)`, `field-exists(Migration_Staging__c.Source_System__c)`, `field-exists(Migration_Staging__c.Payload_JSON__c)`, `field-exists(Migration_Staging__c.Load_Status__c)` | ✅ | (verify — green, 2026-09-30) |
| INT-017-C2 | Origin_Office__c present on staging + materialized targets (guardrail 2) | org-probe: `field-exists(Migration_Staging__c.Origin_Office__c)`, `field-exists(Contact.Origin_Office__c)`, `field-exists(Subsidy_Application__c.Origin_Office__c)` | ✅ | (verify — green, 2026-09-30) |
| INT-017-C3 | Match_Score__c enables <95 review routing (guardrail 3) | org-probe: `field-exists(Migration_Staging__c.Match_Score__c)`, `field-type(Migration_Staging__c.Match_Score__c, Number)` | ✅ | (verify — green, 2026-09-30) |
| INT-017-C4 | Staging is Private OWD (data steward review pattern) | org-probe: `sharing-model(Migration_Staging__c, Private)` | ✅ | (verify — green, 2026-09-30) |
| INT-017-C5 | Per-TAMS ETL adapter (MuleSoft/Informatica) delivers pilot region (acceptance) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-017.md | 📋 | accepted-gap |
| INT-017-C6 | Contact dedup rule fires at 95% threshold (guardrail 3) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-017.md | 📋 | accepted-gap |
| INT-017-C7 | Reconciliation reports show 100% count parity (acceptance) | 👁 Manual scene A | 👁 | _pending_ |
| INT-017-C8 | In-flight applications not migrated (guardrail 1) | 👁 Manual scene B | 👁 | _pending_ |

## Manual validation scenes

### Scene A — Reconciliation report parity (C7)
1. Complete a pilot-region ETL load (smallest AMER office).
2. Run the reconciliation report: Migration_Staging row count per Target_Object__c vs materialized row count on Contact / Subsidy_Application__c / Assessment__c.
3. Confirm 100% parity; Data Steward queue has <200 items.

### Scene B — In-flight filter (C8)
1. In the source TAMS extract, tag 5 known in-flight applications (Status != Closed).
2. Run the ETL for that region.
3. Confirm those 5 rows never land in Migration_Staging__c and never materialize on Subsidy_Application__c.

## Deliberately not tested (out of scope)
- Audit history migration — explicitly out of scope per intent.
