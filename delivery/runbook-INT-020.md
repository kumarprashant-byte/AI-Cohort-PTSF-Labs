# INT-020 — Deploy runbook

**Intent:** Region scoping + OWD sharing on Subsidy_Application__c / Assignment__c / Assessment__c
**Delivered:** 2026-09-30 · **Decision:** [decisions/2026-09-30-INT-020-owd-model.md](../decisions/2026-09-30-INT-020-owd-model.md)

## What ships in the deploy

- `Region__c` picklist (EMEA / AMER / APAC, restricted) on Subsidy_Application__c, Assignment__c, Assessment__c.
- Subsidy_Application__c `sharingModel` / `externalSharingModel` flipped from ReadWrite → Private (OWD tightening).
- Nine criteria-based `SharingCriteriaRule` records — 3 objects × 3 regions — each sharing rows whose `Region__c = <region>` with the `<region>_Regional_Ops_Manager` role and its subordinates.
- Assessor_Base perm set: read + edit FLS on the two new child Region__c fields.

Deploy id `0AfoB000000yqTZSAY` (Succeeded, 32 components).

## Post-deploy manual steps

1. **Assign the region roles.** In Setup → Users, set each Assessor test user's Role to `<region>_Assessor`. Users without a regional role branch see 0 rows on Subsidy_Application__c — that is the intended tightening (see decision record).
2. **Seed nine Subsidy_Application__c rows** (three per region) with `Region__c` populated, so the manual scenes have data to isolate.
3. **Run test-script.md manual scenes A + B** with `/ql-record-test-execution` to sign off INT-020-C6 and INT-020-C7.

## What is NOT in this deploy

- **Region auto-stamp** on Assignment__c / Assessment__c child rows on insert (📋 INT-020-C8) — a follow-on Flow. MVP requires the Assessor to set Region__c manually on children.
- **Cross-region reporting overrides** — deferred to INT-016 (Reporting).
