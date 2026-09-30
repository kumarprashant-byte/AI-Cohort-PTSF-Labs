---
intent: INT-020
phase: 3
proof_hash: be28fae85008
authored: 2026-09-30
---

# INT-020 — Test script

**Intent:** Region scoping and OWD sharing on subsidy/assignment/assessment objects
**Phase:** 3 · **Source intent:** `intents/INT-020/intent.md` · **Design:** `intents/INT-020/design.md` · **OWD-model decision:** `decisions/2026-09-30-INT-020-owd-model.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-020-C1 | `Region__c` picklist exists on Subsidy_Application__c, Assignment__c, Assessment__c with values EMEA / AMER / APAC (build target) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-020-C2 | OWD on Subsidy_Application__c is Private (design § Sharing; per decisions/2026-09-30-INT-020-owd-model.md) | org-probe (EntityDefinition.InternalSharingModel) | ✅ | (verify — green, 2026-09-30) |
| INT-020-C3 | OWD on Assessment__c and Assignment__c remains Private (guardrails / no regression) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-020-C4 | Nine criteria-based sharing rules exist — 3 objects × {EMEA, AMER, APAC}, each `Region__c = <region>` sharing to `<region>_Regional_Ops_Manager` role and subordinates (build target) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-020-C5 | Medical_History__c OWD is untouched — remains Private with INT-004's Apex sharing intact (guardrail 1) | org-probe (regression) | ✅ | (verify — green, 2026-09-30) |
| INT-020-C6 | End-to-end: APAC Assessor `SELECT Id FROM Subsidy_Application__c` returns only APAC rows; EMEA Regional Ops Manager returns only EMEA (acceptance) | Manual scene A | 👁 | _pending_ |
| INT-020-C7 | Same personas open the "All Open Applications" list view and see only same-region rows (acceptance) | Manual scene B | 👁 | _pending_ |
| INT-020-C8 | Region auto-stamp from parent Subsidy_Application__c onto child Assignment/Assessment on insert (build target — "populated at insert from the parent Contact / owning User's Region") | 📋 accepted by Prashant Kumar — INT-020-follow-on (small Flow) | 📋 | — |

## Automated proofs to write

None — configuration only. Structural facts via org-probe; end-to-end via persona-based manual scenes.

## Org assertions

- **INT-020-C1** (fields):
  - `field-exists(Subsidy_Application__c.Region__c)`, `field-type(Subsidy_Application__c.Region__c, Picklist)`
  - `field-exists(Assignment__c.Region__c)`, `field-type(Assignment__c.Region__c, Picklist)`
  - `field-exists(Assessment__c.Region__c)`, `field-type(Assessment__c.Region__c, Picklist)`
- **INT-020-C2 / C3 / C5** (OWD):
  - `EntityDefinition.InternalSharingModel = 'Private'` for Subsidy_Application__c, Assessment__c, Assignment__c, Medical_History__c
- **INT-020-C4** (sharing rules):
  - Nine `SharingCriteriaRule` records exist across the three objects, each filtering on Region__c and sharing to the region's Regional Ops Manager role + subordinates.

## Manual validation scenes

### Scene A — SOQL isolation (criterion C6)
1. Create three test users, one per region, each granted the corresponding `<region>_Assessor` role and the `Assessor_Base` perm set.
2. Seed nine Subsidy_Application__c records (three per region).
3. As each user run `SELECT Id, Region__c FROM Subsidy_Application__c` in the Developer Console.
4. Confirm each user sees exactly the three rows for their region — no cross-region rows.
**Expected:** SOQL honors row-level security. **Sign-off:** _name / date / pass·fail_.

### Scene B — List view isolation (criterion C7)
1. Same personas as Scene A.
2. Open the Application_Review console → Subsidy_Application__c tab → "All Open Applications" list view.
3. Confirm the list shows only same-region rows for each persona.
**Expected:** UI paths honor OWD; no leaked rows through list views. **Sign-off:** _name / date / pass·fail_.

## Deliberately not tested (out of scope)

- Cross-region reporting overrides — the intent's `out_of_scope` explicitly defers this to the Reporting phase (INT-016).
- Region auto-stamp on child rows — 📋 C8, follow-on Flow.
- Restriction rules layered on top of sharing rules — the intent doesn't ask for that filtering pattern.
