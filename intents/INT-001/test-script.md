---
intent: INT-001
proof_hash: 268745afcc83
authored: 2026-09-29
---

# INT-001 — Test script

**Intent:** Provision capstone org and DevOps pipeline
**Design:** `intents/INT-001/design.md`

## Criteria

| Id | Criterion | Type | How proven | Sign-off |
|---|---|---|---|---|
| INT-001-C1 | Three regional `BusinessHours` records exist (`PTSF_APAC_Support`, `PTSF_EMEA_Support`, `PTSF_AMER_Support`) with matching timezones and `IsActive = true` | ✅ | SOQL: `SELECT Name, TimeZoneSidKey, IsActive FROM BusinessHours WHERE Name LIKE 'PTSF_%'` returns 3 active rows | Prashant Kumar / 2026-09-29 / pass — evidence orgfarm-5f9310b41f query |
| INT-001-C2 | `Deploy_Environment__c` List Custom Setting present with `Environment_Label__c` + `Login_URL__c` | ✅ | Describe: `sf sobject describe --sobject Deploy_Environment__c` returns customSetting=true and both fields | Prashant Kumar / 2026-09-29 / pass — evidence deploy 0AfoB000000yiFtSAI |
| INT-001-C3 | Empty scaffolds `PHI_Emergency_Access` and `Practitioner_Medical_History_Read` permission sets assignable | ✅ | SOQL: `SELECT Name FROM PermissionSet WHERE Name IN ('PHI_Emergency_Access','Practitioner_Medical_History_Read')` returns 2 rows | Prashant Kumar / 2026-09-29 / pass — evidence PS deploy |
| INT-001-C4 | CI workflow files present; deploy validates against target org | 👁 | Confirm `.github/workflows/*.yml` exist; `sf project deploy validate --source-dir force-app` returns success | Prashant Kumar / 2026-09-29 / pass — evidence orgfarm deploy Succeeded |
| INT-001-C5 | LDV design record (skinny-table + Big Object archival) captured with licensed-tenant blocker acknowledged | 👁 | Read `intents/INT-001/design.md` § LDV baseline — names skinny table + Big Object partition key + backfill blocker | Prashant Kumar / 2026-09-29 / pass — evidence design.md |

## Notes

- **BusinessHours are seeded as data, not metadata** (per design Q-design-001-2: no first-class metadata type; records are created via `sf data create record` and captured in the runbook — `delivery/runbook-INT-001.md`).
- **Shield Platform Encryption is not enabled in this INT-001 build** — that's INT-004's step, and its enablement is a Setup step (not metadata-deployable) captured in that intent's runbook.
- The capstone tenant is orgfarm developer edition (`orgfarm-5f9310b41f.test2.my.pc-rnd.salesforce.com`). Deploy target for all four INT-00x builds this sitting.
