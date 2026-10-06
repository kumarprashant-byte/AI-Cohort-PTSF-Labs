---
intent: INT-024
phase: 3
authored: 2026-10-06
proof_hash: b491ec39c0fa
---

# INT-024 — Test script

**Intent:** Subsidy calculator — distance × transport decision table and manual override
**Design:** `intents/INT-024/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-024-C1 | `Subsidy_Determination_Rule__c.Distance_Min_Km__c`, `Distance_Max_Km__c`, `Base_Amount__c` exist with the design-specified types (build target — rule table extension) | org-probe | ✅ | verify — green / 2026-10-06 / test-evidence/2026-10-06-a78d0c3-org-probe.md |
| INT-024-C2 | `Subsidy_Application__c.Decision_Source__c` exists as a formula field returning `calculator` when `Approved_Amount__c = Proposed_Amount__c`, else `manual` (SC-3) | org-probe + Apex test `decisionSourceReadsManualOnDivergence` | ✅ | verify — green / 2026-10-06 / test-evidence/2026-10-06-a78d0c3-org-probe.md |
| INT-024-C3 | Validation rule `Override_Needs_Reason` exists on `Subsidy_Application__c` (guardrail — override reason required) | org-probe | ✅ | verify — green / 2026-10-06 / test-evidence/2026-10-06-a78d0c3-org-probe.md |
| INT-024-C4 | `AssessorSubsidyController.recalculate` returns the correct proposed amount for a seeded `(EMEA, Road, 180km)` tuple → 1,200 EUR (acceptance scene, SC-1 — picklist values per 2026-10-06 ratification: shipped `Road` substitutes for intent's "long-distance ground") | `AssessorSubsidyControllerTest.recalculateEmeaRoad180km` | ✅ | CI — green via deploy `0AfoB0000012UZJSA2` / 2026-10-06 |
| INT-024-C5 | `AssessorSubsidyController.recalculate` returns the correct proposed amount for `(EMEA, Air, 180km)` → 2,400 EUR (acceptance scene) | `AssessorSubsidyControllerTest.recalculateEmeaAir180km` | ✅ | CI — green via deploy `0AfoB0000012UZJSA2` / 2026-10-06 |
| INT-024-C6 | `recalculate` does **not** modify the record (SC-1 — proposal lives in-memory until Assessor saves) | `AssessorSubsidyControllerTest.recalculateDoesNotPersist` | ✅ | CI — green via deploy `0AfoB0000012UZJSA2` / 2026-10-06 |
| INT-024-C7 | `recalculate` throws a clear error when no rule row matches (missing config is loud, not silent) | `AssessorSubsidyControllerTest.recalculateThrowsOnMissingRule` | ✅ | CI — green via deploy `0AfoB0000012UZJSA2` / 2026-10-06 |
| INT-024-C8 | Saving a `Subsidy_Application__c` with `Approved_Amount__c ≠ Proposed_Amount__c` and blank `Adjustment_Reason__c` fails with the validation rule (SC-2) | `AssessorSubsidyControllerTest.overrideReasonRequiredOnDivergence` | ✅ | CI — green via deploy `0AfoB0000012UZJSA2` / 2026-10-06 |
| INT-024-C9 | Saving with matching amounts and no reason passes; `Decision_Source__c` reads `calculator` (SC-3) | `AssessorSubsidyControllerTest.calculatorPathNoOverride` | ✅ | CI — green via deploy `0AfoB0000012UZJSA2` / 2026-10-06 |
| INT-024-C11 | `assessorSubsidyCalculator` LWC bundle exists with target `lightning__RecordPage` and resolves on deploy | org-probe | ✅ | verify — green / 2026-10-06 / test-evidence/2026-10-06-a78d0c3-org-probe.md |
| INT-024-C12 | `Assessor_Base` permset grants R/E on `Decision_Source__c` and classAccess on `AssessorSubsidyController` | org-probe | ✅ | verify — green / 2026-10-06 / test-evidence/2026-10-06-a78d0c3-org-probe.md |
| INT-024-C13 | End-to-end: Assessor opens an EMEA Subsidy_Application with distance 180km and transport `long-distance ground`, clicks Recalculate → sees 1,200 EUR, changes transport to `air`, clicks Recalculate → sees 2,400 EUR, approves at 2,400 with an Adjustment Reason, record saves, `Decision_Source__c = manual`, INT-014's threshold Approval Process routes to EMEA Team Manager (acceptance) | Manual scene A | 👁 | Prashant Kumar / 2026-10-06 / pass / test-evidence/2026-10-06-f2befe0-execution-report.md |

### Deliberately not tested (out of scope)

- **Geocoding provider swap** — relies on standard Salesforce geocoding; no vendor integration.
- **Threshold Approval Process routing** — INT-014 owns it; C13 observes the hand-off but doesn't re-prove INT-014's logic.
- **Full regional rule matrix** — seed covers EMEA only; APAC/AMER seeding is operational follow-up.
- **Admin role to edit rule rows at runtime** — `Subsidy_Rule_Admin` permset is a follow-up.

## Automated proofs to write

- **`AssessorSubsidyControllerTest.recalculateEmeaGround180km`** — insert seeded rule rows, Patient (geocoded Paris), Facility (geocoded Lyon ≈ 393km) — but override Distance_Km__c on the application to 180 to pin the band. Call `recalculate`, assert `proposedAmount = 1200`.
- **`AssessorSubsidyControllerTest.recalculateEmeaAir180km`** — same setup, Transport_Type__c = `air`, assert `proposedAmount = 2400`.
- **`AssessorSubsidyControllerTest.recalculateDoesNotPersist`** — call `recalculate`, re-query the record, assert `Proposed_Amount__c` is unchanged in the DB.
- **`AssessorSubsidyControllerTest.recalculateThrowsOnMissingRule`** — point at a `(region, transport, distance)` tuple with no matching rule row; assert `AuraHandledException` with a clear message.
- **`AssessorSubsidyControllerTest.overrideReasonRequiredOnDivergence`** — insert application with Proposed=1000, Approved=1500, Adjustment_Reason blank; assert `DmlException` on update, assert the message contains the validation rule's error text.
- **`AssessorSubsidyControllerTest.calculatorPathNoOverride`** — insert application with Proposed=1200, Approved=1200, Adjustment_Reason blank; assert save succeeds, re-query, assert `Decision_Source__c = 'calculator'`.
- **`AssessorSubsidyControllerTest.haversineAgainstKnownFixture`** — call `haversineKm(48.8566, 2.3522, 45.7640, 4.8357)` (Paris → Lyon); assert within [385, 400] km.
- **`AssessorSubsidyControllerTest.decisionSourceFormulaResolves`** — covers C2's formula half; insert record with equal amounts, assert `calculator`; update Approved_Amount, assert `manual`.

## Org assertions

- **INT-024-C1**: `field-exists(Subsidy_Determination_Rule__c.Distance_Min_Km__c)` · `field-type(…, Number)` · same for `Distance_Max_Km__c` · `field-exists(…Base_Amount__c)` · `field-type(…, Currency)`.
- **INT-024-C2**: `field-exists(Subsidy_Application__c.Decision_Source__c)` · `field-type(…, Formula(Text))`.
- **INT-024-C3**: Tooling `SELECT Id FROM ValidationRule WHERE EntityDefinition.QualifiedApiName='Subsidy_Application__c' AND ValidationName='Override_Needs_Reason'` returns one row.
- **INT-024-C11**: LWC bundle `assessorSubsidyCalculator` present; meta targets include `lightning__RecordPage`.
- **INT-024-C12**: `permset-exists(Assessor_Base)` · `fls(read, Subsidy_Application__c.Decision_Source__c, permset=Assessor_Base)` · classAccess for `AssessorSubsidyController`.

## Manual validation scenes

### Scene A — End-to-end calculator + override + hand-off (criterion C13)

1. Log in as an Assessor-persona user with `Assessor_Base`. Open an EMEA Subsidy_Application whose `Distance_Km__c` is 180 and `Transport_Type__c` is `Road` (seed data).
2. Click **Recalculate** on the calculator panel — confirm the panel surfaces **1,200 EUR** as the proposed amount (v1 UX: the LWC displays the proposal; Assessor types Approved Amount on the standard record form). The record is not saved.
3. Change `Transport_Type__c` on the record to `Air` and save. Click **Recalculate** — confirm the panel surfaces **2,400 EUR**.
4. Attempt to save with `Approved Amount = 2,400` and **blank** `Adjustment Reason` — confirm the validation rule fires with the "Adjustment Reason is required…" error.
5. Enter `Adjustment Reason = "clinical need — air transport approved"`, set `Approved Amount = 2,400`, save. Confirm the record persists with `Proposed_Amount__c = 1,200`, `Approved_Amount__c = 2,400`, `Decision_Source__c = manual`.
6. Confirm INT-014's threshold Approval Process routes the record to the EMEA Team Manager (the approval request appears in that user's queue). This observes the INT-014 seam; it does not re-prove INT-014's logic.

**Expected:** Calculator proposes amounts live without saving; divergent approval requires a reason; `Decision_Source__c` tracks whether the final number came from the calculator or a manual override; the INT-014 approval hand-off still works. **Sign-off:** _name / date / pass·fail_.
