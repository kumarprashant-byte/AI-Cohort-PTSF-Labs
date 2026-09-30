---
intent: INT-008
phase: 2
proof_hash: 39de01b7571b
authored: 2026-09-30
---

# INT-008 — Test script

**Intent:** Subsidy application lifecycle with treatment picker and auto-reject
**Phase:** 2 · **Source intent:** `intents/INT-008/intent.md` · **Design:** `intents/INT-008/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-008-C1 | `Subsidy_Application__c.Status__c` picklist includes `Approved`, `Rejected`, `Assessment` alongside the existing values (build target — state machine) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-008-C2 | `Subsidy_Application__c.Medical_History_Snapshot__c` exists as LongTextArea (build target — snapshot mechanism) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-008-C3 | `Subsidy_Application__c.Rejection_Reason__c` and `Submitted_At__c` exist with correct types (design § Data model) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-008-C4 | Flow `Subsidy_Application_On_Submit` is Active — record-triggered on Subsidy_Application__c (build target — on-submit) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-008-C5 | Flow `Subsidy_Application_On_HIC_Complete` is Active — platform-event-triggered on `HIC_Entitlement_Completed__e` (build target — HIC completion handler) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-008-C6 | Validation rule `Subsidy_Application.Locked_After_Submission` is Active — enforces no-edit-after-submit for `Patient__c`, `Treatment_Type__c`, `Previously_Declined_Practitioners__c` (guardrail 2) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-008-C7 | Rejection email is sent to the patient on the Covered branch — Flow-embedded Send Email action, subject "Your subsidy application" (build target — localized rejection email; localization 📋 INT-006) | Manual scene A step 5 (email logs) | 👁 | _pending_ |
| INT-008-C8 | Onboarding-complete gate (guardrail 1) — must not allow submission before `Contact.Onboarding_Complete__c` | 📋 accepted by Prashant Kumar — INT-006 (field lives on Contact and is INT-006's build target) | 📋 | — |
| INT-008-C9 | Localized rejection email + auto-reject screen in patient's language (acceptance walkthrough) | 📋 accepted by Prashant Kumar — INT-006 (Patient Portal owns localization + the wizard) | 📋 | — |
| INT-008-C10 | Treatment picker screen for patient (build target — metadata-driven picker) | 📋 accepted by Prashant Kumar — INT-006 (Patient Portal wizard) | 📋 | — |
| INT-008-C11 | Selective indexes on Status + Region + Created_Date (build target — deferred to Support case) | 📋 accepted by Prashant Kumar — INT-001 design record (capstone org can't file cases) | 📋 | — |
| INT-008-C12 | End-to-end: patient submits → Status advances to Awaiting_Insurance_Check → HIC completes Covered → Status = Rejected + email fires (acceptance walkthrough, assessor persona substitutes for patient in this intent) | Manual scene A | 👁 | _pending_ |
| INT-008-C13 | End-to-end negative: HIC completes Not_Covered → Status = Awaiting_Practitioner (acceptance branch — INT-010 pickup) | Manual scene B | 👁 | _pending_ |

## Automated proofs to write

None — this intent is Flow + config + one VR. All ✅ criteria are org-probe structural assertions.

## Org assertions

- **INT-008-C1** (Status picklist extension):
  - `field-exists(Subsidy_Application__c.Status__c)`
  - `picklist-values-include(Subsidy_Application__c.Status__c, [Approved, Rejected, Assessment])`
- **INT-008-C2** (Snapshot field):
  - `field-exists(Subsidy_Application__c.Medical_History_Snapshot__c)`
  - `field-type(Subsidy_Application__c.Medical_History_Snapshot__c, LongTextArea)`
- **INT-008-C3** (Rejection reason + submitted-at):
  - `field-exists(Subsidy_Application__c.Rejection_Reason__c)`
  - `field-type(Subsidy_Application__c.Rejection_Reason__c, LongTextArea)`
  - `field-exists(Subsidy_Application__c.Submitted_At__c)`
  - `field-type(Subsidy_Application__c.Submitted_At__c, DateTime)`
- **INT-008-C4** (On-submit flow):
  - `flow-active(Subsidy_Application_On_Submit)`
- **INT-008-C5** (HIC-complete subscriber flow):
  - `flow-active(Subsidy_Application_On_HIC_Complete)`
- **INT-008-C6** (Locked-after-submit VR):
  - `validation-rule-active(Subsidy_Application__c.Locked_After_Submission)`

## Manual validation scenes

### Scene A — Auto-reject on covered-by-insurance (criterion C12)
1. As an Assessor persona, create a Subsidy_Application__c with a linked patient Contact and a Treatment_Type__c.
2. Change Status to `Submitted`; save.
3. Confirm within 5 seconds: Status advances to `Awaiting_Insurance_Check`, `Submitted_At__c` is stamped, `Medical_History_Snapshot__c` is populated.
4. Publish a test `HIC_Entitlement_Completed__e` (Setup → Platform Events → Publish, or via `sf data create record --sobject HIC_Entitlement_Completed__e`) with `Source_Object__c = Subsidy_Application__c`, `Source_Record_Id__c = <the app id>`, `Status__c = Covered`.
5. Confirm: application `Status__c = Rejected`, `Rejection_Reason__c` populated, and an email is queued (Setup → Email Logs) to the patient Contact.
**Expected:** every step observed. **Sign-off:** _name / date / pass·fail_.

### Scene B — Not-covered branch routes to practitioner (criterion C13)
1. Same setup as Scene A steps 1–3.
2. Publish `HIC_Entitlement_Completed__e` with `Status__c = Not_Covered`.
3. Confirm application `Status__c = Awaiting_Practitioner`; no rejection email; INT-010's assignment SLA flow (if active) picks it up.
**Expected:** clean branch to Awaiting_Practitioner. **Sign-off:** _name / date / pass·fail_.

## Deliberately not tested (out of scope)

- Practitioner assignment mechanics — INT-010.
- Subsidy amount determination — INT-014.
- Patient-facing screens / localization — INT-006 (📋 C9, C10).
- Onboarding_Complete__c gate — INT-006 (📋 C8).
- Selective index performance — deferred (📋 C11).
