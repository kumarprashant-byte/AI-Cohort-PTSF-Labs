---
intent: INT-012
executed_by: Prashant Kumar
executed_at: 2026-10-06
environment: ptsf (orgfarm epic.out.e68d765f4115)
branch: scope/INT-026-finish
commit: 63e72dc71aff8ec7b601586873823f2f4b73970b
type: manual
---

# Test Execution Report — INT-012 — 2026-10-06

**Intent:** 15-day assessment escalation to Team Manager
**Environment:** ptsf (orgfarm epic.out.e68d765f4115)
**Branch @ HEAD:** `scope/INT-026-finish` @ `63e72dc`
**Executed by:** Prashant Kumar
**Executed at:** 2026-10-06

## Scenes attempted

### Scene A — Escalation stamps + Task (criterion C5)

| Step | Result | Notes |
|------|--------|-------|
| 1. Create a Pending Review Assessment linked to an Assignment | ⚠️ NOT RUN | Prereq lineage missing in orgfarm (0 Treatment_Type__c rows, 0 Assignments). Would need seed data. |
| 2. Backdate `CreatedDate` to 16+ days ago | ⚠️ NOT RUN | Running SysAdmin lacks "Set Audit Fields upon Record Creation" user permission. Deploy of that permission to `PTSF_Admin_Fls_Overrides` failed: `Unknown user permission: SetAuditFields` — the org-level feature "Enable Set Audit Fields upon Record Creation and Update Records with Inactive Owners User Permissions" (Setup → User Interface) is off. Toggling it is a Setup UI action, not a metadata deploy. |
| 3. Trigger the scheduled flow | ✅ PASS (partial, no data) | `Flow.Interview.createInterview('Assessment_15_Day_Escalation', …).start()` executed OK against the empty orgfarm. Confirms the flow is invocable; proves nothing about the escalation behavior without aged data. |
| 4. Confirm Task created + Escalated__c=true + Escalated_Date__c=TODAY | ⚠️ NOT RUN | No eligible Assessment existed; nothing to confirm. |

**Criteria outcome:** C5 ⚠ environment not ready (seed data + Set-Audit-Fields permission missing).

### Scene B — No double-escalation (criterion C6)

Not attempted — depends on Scene A producing an escalated Assessment.

**Criteria outcome:** C6 ⚠ environment not ready (blocked on Scene A).

## Environment blockers

1. **Org-level setting "Enable Set Audit Fields upon Record Creation and Update Records with Inactive Owners User Permissions" is OFF.** Setup → User Interface → check the box. Requires an admin UI action.
2. **"Set Audit Fields upon Record Creation" user permission needs to be assigned** to the running SysAdmin (or to `PTSF_Admin_Fls_Overrides`) once the org-level toggle is on.
3. **No seed data in orgfarm** — 0 Treatment_Type__c rows, 0 Assignments, 0 Assessments. A seed Apex script is needed for the scene lineage.

## Structural evidence that DID pass

Independent of the manual scenes, the structural (org-probe) evidence from `intents/INT-012/verify-evidence/2026-09-30-verify.md` still holds, and today's work confirmed:

- `Escalated__c`, `Escalated_Date__c` now carry edit FLS on `PTSF_Admin_Fls_Overrides` and read FLS on `Team_Manager_Base` (commit `63e72dc`). This was the gap identified during the INT-026 orgfarm check — the fields existed but no permset could write to them. Without this, the Flow's `UpdatedAssessment.Escalated__c = true` assignment would silently no-op even if a user with FLS triggered it.
- Flow `Assessment_15_Day_Escalation` is still Active and invocable (confirmed via `Flow.Interview.createInterview`).

## Summary

**Criteria attempted:** 2 · **Passed:** 0 · **Blocked by environment:** 2 · **Not run:** 0
**Defects filed:** none (no behavior tested; blockers are environment, not code)
**Recommended next step:** Enable the org-level "Set Audit Fields" setting (Setup UI action), assign the user permission to `PTSF_Admin_Fls_Overrides`, author a seed script for the Assessment lineage, then re-run this report. Alternative: author an automated Apex test `Assessment15DayEscalationTest` using `Test.setCreatedDate` and graduate C5/C6 from 👁 to ✅ via `/ql-test-script`.
