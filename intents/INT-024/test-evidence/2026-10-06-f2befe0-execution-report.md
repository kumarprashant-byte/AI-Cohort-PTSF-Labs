---
intent: INT-024
executed_by: Prashant Kumar
executed_at: 2026-10-06
environment: orgfarm build sandbox (epic.out.e68d765f4115@orgfarm.salesforce.com)
branch: feature/INT-024-subsidy-calculator
commit: f2befe0be30ee2caca043935caa915aab7f0ad83
type: manual
---

# Test Execution Report — INT-024 — 2026-10-06

**Intent:** Subsidy calculator — distance × transport decision table and manual override
**Environment:** orgfarm build sandbox (epic.out.e68d765f4115@orgfarm.salesforce.com)
**Branch @ HEAD:** `feature/INT-024-subsidy-calculator` @ `f2befe0` (`f2befe0be30ee2caca043935caa915aab7f0ad83`)
**Executed by:** Prashant Kumar
**Executed at:** 2026-10-06

## Scenes run

### Scene A — End-to-end calculator + override + hand-off (criterion C13)

| Step | Result | Notes |
|------|--------|-------|
| 1. Log in as Assessor-persona user with `Assessor_Base`. Open an EMEA Subsidy_Application with Distance_Km__c=180 and Transport_Type__c=Road. | ✅ PASS | Record opened with seeded values visible. |
| 2. Click **Recalculate** — panel surfaces **1,200 EUR**; record is not saved. | ✅ PASS | Panel showed 1,200 EUR; no DB write. |
| 3. Change Transport_Type__c to Air, save, click Recalculate — panel surfaces **2,400 EUR**. | ✅ PASS | Save succeeded; recalc returned 2,400 EUR. |
| 4. Attempt save with Approved Amount=2,400, blank Adjustment Reason — validation rule fires. | ✅ PASS | `Override_Needs_Reason` blocked the save with its error. |
| 5. Enter Adjustment Reason, set Approved=2,400, save. Confirm Proposed=1,200, Approved=2,400, Decision_Source__c=manual. | ✅ PASS | All three values persisted; formula resolved to `manual`. |
| 6. Confirm INT-014's threshold Approval Process routes to EMEA Team Manager. | ✅ PASS | Approval request landed in EMEA Team Manager's queue. |

**Criteria outcome:** C13 ✅

## Summary

**Criteria run:** 1 · **Passed:** 1 · **Failed:** 0 · **Not run:** 0
**Defects filed:** none
