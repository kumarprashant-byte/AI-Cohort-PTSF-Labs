---
intent: INT-013
phase: 3
proof_hash: fde5fd27d8bd
authored: 2026-09-30
---

# INT-013 — Test script

**Intent:** Assessor Service Console for application review
**Phase:** 3 · **Source intent:** `intents/INT-013/intent.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-013-C1 | `Application Review` CustomApplication deploys as a Console app (guardrail: usable Service Console) | org-probe (see § Org assertions) | ✅ | (verify — green, 2026-09-30) |
| INT-013-C2 | `Subsidy_Application__c` is the primary object tab in the app (build target) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-013-C3 | Medical History is NOT reachable from the console — no tab, no related list, no lookup path (guardrail 1) | org-probe + Manual scene A | ✅ | (verify — green, 2026-09-30) |
| INT-013-C4 | Utility bar 'Determine Subsidy' launcher for INT-014 | 📋 accepted by Prashant Kumar — INT-014 | 📋 | — |
| INT-013-C5 | Utility bar 'Escalate to Manager' action for INT-012 | 📋 accepted by Prashant Kumar — INT-012 | 📋 | — |
| INT-013-C6 | List views: `My Queue` and `Open Applications` on Subsidy_Application__c (build target) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-013-C7 | Regional Queue list view (build target) — deferred, awaits `Subsidy_Application__c.Region__c` from INT-020 | 📋 accepted by Prashant Kumar — INT-020 | 📋 | — |
| INT-013-C8 | SLA Breached list view (build target) — deferred, awaits SLA-breach stamp on Assignment (INT-010 follow-on) | 📋 accepted by Prashant Kumar — INT-010 follow-on | 📋 | — |
| INT-013-C9 | App visible only to `Assessor_Base` permission set (guardrail: not exposed to non-assessors) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-013-C10 | Assessor persona opens console, sees My Queue, opens an app, sees Assessment + HIC_Check tiles (acceptance walkthrough) | Manual scene B | 👁 | _pending_ |

## Automated proofs to write

None — this intent is metadata-only. All ✅ criteria prove via `org-probe` (structural assertions against the deployed org), not Apex tests.

## Org assertions

- **INT-013-C1** (Console app deploys):
  - `custom-application-exists(Application_Review)`
  - `custom-application-type(Application_Review, Console)`
- **INT-013-C2** (Primary tab):
  - `custom-tab-exists(Subsidy_Application__c)`
  - `custom-application-primary-tab(Application_Review, Subsidy_Application__c)`
- **INT-013-C3** (Medical History denial — structural half):
  - `custom-application-tabs-exclude(Application_Review, Medical_History__c)`
  - `flexipage-related-lists-exclude(Subsidy_Application_Record_Page, Medical_History__c)`
  - The behavioral denial (Restriction Rule) is proven by INT-004's test suite; not re-asserted here.
- **INT-013-C6** (List views):
  - `list-view-exists(Subsidy_Application__c.My_Queue)`
  - `list-view-exists(Subsidy_Application__c.Open_Applications)`
- **INT-013-C9** (App visibility permset-scoped):
  - `permission-set-app-visible(Assessor_Base, Application_Review)`
  - `permission-set-app-not-visible(Regional_Ops_Manager_Base, Application_Review)`
  - `permission-set-app-not-visible(Team_Manager_Base, Application_Review)`

## Manual validation scenes

### Scene A — Medical History unreachable from the console (criterion C3, human-visible half)

1. Assign the tester an APAC Assessor persona (Region_APAC + Assessor_Base).
2. Open the App Launcher; select **Application Review**.
3. Confirm the nav bar lists **Subsidy Applications**, **Assessments**, **HIC Checks** — and **no Medical Histories**.
4. Open a Subsidy Application record; scan every related list and every tab in the record page. Confirm **no Medical History related list, no Medical History field, no lookup path**.
5. In global search, type "Medical" — confirm **zero Medical_History__c results** for this persona.
**Expected:** Medical History is invisible on every path in the console. **Sign-off:** _name / date / pass·fail_.

### Scene B — Assessor works an application end-to-end in the console (criterion C10, acceptance walkthrough)

1. Log in as an APAC Assessor.
2. Open **Application Review** from the App Launcher.
3. Click **My Queue** — confirm it lists only applications where the assessor is the owner.
4. Open one application; the record page loads with the Assessment(s) related list and HIC_Check(s) related list visible.
5. Utility bar renders with a Recent Items launcher (empty by default until INT-014/INT-012 wire theirs — expected).
6. Attempt to reach Medical History — the console offers no path (already asserted in Scene A).
**Expected:** the console is usable end-to-end for the assessor's core review flow. **Sign-off:** _name / date / pass·fail_.

## Deliberately not tested (out of scope)

- Determine Subsidy Flow behavior — INT-014.
- Managerial escalation routing — INT-012.
- Regional data scoping on list views — INT-020.
- SLA breach visualization — follow-on to INT-010.
