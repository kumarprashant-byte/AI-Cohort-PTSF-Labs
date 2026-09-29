---
intent: INT-005
phase: 1
proof_hash: 13e6ec75293c
authored: 2026-09-29
---

# INT-005 — Test script

**Intent:** Regional user model and role hierarchy
**Phase:** 1 · **Source intent:** `intents/INT-005/intent.md` · **Design:** `intents/INT-005/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-005-C1 | `User.Region__c` exists as a restricted picklist with values APAC / EMEA / AMER (build target) | org-probe (see § Org assertions) | ✅ | _pending_ |
| INT-005-C2 | Ten roles deployed — `PTSF_Global` root plus three regional branches, each three levels (Regional Ops Manager → Team Manager → Assessor) (build target, acceptance A3) | org-probe (see § Org assertions) | ✅ | _pending_ |
| INT-005-C3 | Nine Permission Set Groups deployed, one per Profile × Region combination (build target) | org-probe (see § Org assertions) | ✅ | _pending_ |
| INT-005-C4 | Each PSG composes its role base PS (`Assessor_Base` / `Team_Manager_Base` / `Regional_Ops_Manager_Base`) and its region marker PS (`Region_APAC` / `Region_EMEA` / `Region_AMER`) (design § Sharing) | org-probe (see § Org assertions) | ✅ | _pending_ |
| INT-005-C5 | No parent-child edge crosses regions in the role hierarchy — each regional branch's parent chain stays within one region up to `PTSF_Global` (guardrail 2) | org-probe (see § Org assertions) | ✅ | _pending_ |
| INT-005-C6 | An APAC Assessor test user logs in; their `User.Region__c = APAC`, their `UserRole` is `APAC_Assessor`, and the `APAC_Assessor` PSG is assigned (acceptance A1 + A3 + A4) | Manual scene A | 👁 | _pending_ |
| INT-005-C7 | An EMEA Regional Ops Manager test user logs in; their `User.Region__c = EMEA`, their `UserRole` is `EMEA_Regional_Ops_Manager`, and the `EMEA_Regional_Ops_Manager` PSG is assigned (acceptance A2 + A3 + A4) | Manual scene B | 👁 | _pending_ |
| INT-005-C8 | `Region__c` is **not** added to `Medical_History__c` — INT-004 continues to own it unchanged (guardrail 1) | org-probe (see § Org assertions) | ✅ | _pending_ |
| INT-005-C9 | `Region__c` is **not** added to `Subsidy_Application__c` or `Assignment__c` (Assessment__c doesn't exist yet) — INT-020 will own Region on these once created (out_of_scope 1) | org-probe (see § Org assertions) | ✅ | _pending_ |

### Deliberately not tested (out of scope)

- **Cross-region reporting overrides** (out_of_scope 2) — deferred to the Reporting phase; nothing to prove here.
- **Compliance Officer / System Administrator regionalization** — deferred per Q-005-1 working answer (design § Open design questions). No PSGs, no proof.
- **INT-020 region-based sharing rules on custom objects** — the intent explicitly leaves the OWD + criteria-based sharing on Subsidy_Application__c / Assignment__c / Assessment__c to INT-020. C9 proves absence-of-Region on those objects; the rules themselves are INT-020's proof plan.

## Automated proofs to write

_None._ This intent is config-only (fields, roles, permission sets, permission set groups); every ✅ criterion is an `org-probe` structural assertion. No Apex tests are added by this intent.

## Org assertions

Structural facts each `org-probe` ✅ criterion needs true in the build org. `/ql-verify-build` runs these before the PR.

- **INT-005-C1** (User.Region__c exists as restricted picklist APAC/EMEA/AMER):
  - `field-exists(User.Region__c)`
  - `field-type(User.Region__c, Picklist)`
  - `picklist-values(User.Region__c, [APAC, EMEA, AMER])`
  - `picklist-restricted(User.Region__c, true)`

- **INT-005-C2** (ten roles with the expected three-branch shape):
  - `role-exists(PTSF_Global)`
  - `role-exists(APAC_Regional_Ops_Manager)` with `parent=PTSF_Global`
  - `role-exists(APAC_Team_Manager)` with `parent=APAC_Regional_Ops_Manager`
  - `role-exists(APAC_Assessor)` with `parent=APAC_Team_Manager`
  - `role-exists(EMEA_Regional_Ops_Manager)` with `parent=PTSF_Global`
  - `role-exists(EMEA_Team_Manager)` with `parent=EMEA_Regional_Ops_Manager`
  - `role-exists(EMEA_Assessor)` with `parent=EMEA_Team_Manager`
  - `role-exists(AMER_Regional_Ops_Manager)` with `parent=PTSF_Global`
  - `role-exists(AMER_Team_Manager)` with `parent=AMER_Regional_Ops_Manager`
  - `role-exists(AMER_Assessor)` with `parent=AMER_Team_Manager`

- **INT-005-C3** (nine PSGs deployed):
  - `permset-group-exists(APAC_Assessor)`
  - `permset-group-exists(APAC_Team_Manager)`
  - `permset-group-exists(APAC_Regional_Ops_Manager)`
  - `permset-group-exists(EMEA_Assessor)`
  - `permset-group-exists(EMEA_Team_Manager)`
  - `permset-group-exists(EMEA_Regional_Ops_Manager)`
  - `permset-group-exists(AMER_Assessor)`
  - `permset-group-exists(AMER_Team_Manager)`
  - `permset-group-exists(AMER_Regional_Ops_Manager)`

- **INT-005-C4** (each PSG composes base role PS + region PS): for each region `R ∈ {APAC, EMEA, AMER}` and each role `Role ∈ {Assessor, Team_Manager, Regional_Ops_Manager}`:
  - `permset-group-contains(R_Role, permset=Role_Base)`
  - `permset-group-contains(R_Role, permset=Region_R)`
  - (9 pair-assertions total)

- **INT-005-C5** (no cross-region parent edge):
  - `role-parent-chain-within(APAC_Assessor, [APAC_Team_Manager, APAC_Regional_Ops_Manager, PTSF_Global])` — no EMEA/AMER role in the chain
  - `role-parent-chain-within(EMEA_Assessor, [EMEA_Team_Manager, EMEA_Regional_Ops_Manager, PTSF_Global])`
  - `role-parent-chain-within(AMER_Assessor, [AMER_Team_Manager, AMER_Regional_Ops_Manager, PTSF_Global])`

- **INT-005-C8** (Region__c not on Medical_History__c):
  - `field-does-not-exist(Medical_History__c.Region__c)`

- **INT-005-C9** (Region__c not on subsidy/assignment objects):
  - `field-does-not-exist(Subsidy_Application__c.Region__c)`
  - `field-does-not-exist(Assignment__c.Region__c)`

## Manual validation scenes

### Scene A — APAC Assessor login and role/PSG assignment (criterion C6)

1. Provision a test user `apac.assessor@ptsf.test.invalid` with `User.Region__c = APAC`, `UserRole = APAC_Assessor`, and Permission Set Group `APAC_Assessor` assigned.
2. Log in as that user.
3. Open the user's own record from the avatar menu → **Details** — confirm the **Region** field shows `APAC`.
4. In Setup → *Users* (as an admin, in a second browser or after step 5's logout), confirm the user's **Role** shows as `APAC Assessor` and the **Permission Set Group Assignments** list contains `APAC_Assessor`.

**Expected:** the user's Region, Role, and PSG assignment all match APAC-Assessor exactly, with no cross-region PSGs assigned.
**Sign-off:** _name / date / pass·fail_.

### Scene B — EMEA Regional Ops Manager login and role/PSG assignment (criterion C7)

1. Provision a test user `emea.rom@ptsf.test.invalid` with `User.Region__c = EMEA`, `UserRole = EMEA_Regional_Ops_Manager`, and Permission Set Group `EMEA_Regional_Ops_Manager` assigned.
2. Log in as that user.
3. Open the user's own record → **Details** — confirm **Region** shows `EMEA`.
4. As admin, confirm the user's **Role** is `EMEA Regional Ops Manager` and the **Permission Set Group Assignments** list contains `EMEA_Regional_Ops_Manager`.

**Expected:** the user's Region, Role, and PSG assignment all match EMEA-RegionalOps exactly, with no cross-region PSGs assigned.
**Sign-off:** _name / date / pass·fail_.
