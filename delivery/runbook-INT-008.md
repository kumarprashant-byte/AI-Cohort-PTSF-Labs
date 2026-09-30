# INT-008 — Deployment runbook

**Intent:** `intents/INT-008/intent.md` · **Design:** `intents/INT-008/design.md` · **Test script:** `intents/INT-008/test-script.md`

## Prerequisites

- **INT-007 ✅** — HIC platform-event pair (`HIC_Entitlement_Requested__e` / `HIC_Entitlement_Completed__e`) exists.
- **INT-009 ✅** — `Subsidy_Application__c` + `Treatment_Type__c` objects exist.
- **INT-004 ✅** — `Medical_History__c` object + Restriction Rule (the snapshot flow reads MH rows).
- **INT-005 ✅** — `Assessor_Base` permission set (extended with FLS on new fields).

## Metadata deploy (single pass)

```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Subsidy_Application__c \
  --source-dir force-app/main/default/flows/Subsidy_Application_On_Submit.flow-meta.xml \
  --source-dir force-app/main/default/flows/Subsidy_Application_On_HIC_Complete.flow-meta.xml \
  --source-dir force-app/main/default/permissionsets/Assessor_Base.permissionset-meta.xml \
  --target-org <alias>
```

**Verified:** `0AfoB000000ypqrSAA` clean on `epic.out.e68d765f4115@orgfarm.salesforce.com` — 2026-09-30.

**Components:** 3 CustomFields (`Medical_History_Snapshot__c`, `Rejection_Reason__c`, `Submitted_At__c`) + 1 picklist extension (`Status__c` gains `Approved`, `Rejected`, `Assessment`) + 1 ValidationRule (`Locked_After_Submission`) + 2 Flows (`Subsidy_Application_On_Submit` record-triggered, `Subsidy_Application_On_HIC_Complete` platform-event-triggered) + PermissionSet edit (3 field permissions on `Assessor_Base`).

## Setup steps (not in the metadata deploy)

None. The flows activate on deploy; the validation rule is active-by-metadata.

## How it works

1. Assessor (or patient, once INT-006 lands) sets `Subsidy_Application__c.Status__c = Submitted`.
2. `Subsidy_Application_On_Submit` fires: queries `Medical_History__c` rows for `Patient__c`, builds a snapshot string into `Medical_History_Snapshot__c`, publishes a `HIC_Entitlement_Requested__e` platform event with `Source_Record_Id__c = <app id>`, stamps `Submitted_At__c`, advances `Status__c → Awaiting_Insurance_Check`.
3. INT-007's HIC request-side automation processes the event, calls HIC, publishes `HIC_Entitlement_Completed__e` with `Status__c` = `Covered` / `Not_Covered` / `Failed`.
4. `Subsidy_Application_On_HIC_Complete` fires: looks up the app by `Source_Record_Id__c`; if found and `Status = Covered`, sets app `Status = Rejected` + `Rejection_Reason__c` + sends English rejection email to `Patient__r.Email`; else advances to `Awaiting_Practitioner` (INT-010 assignment picks up).
5. `Locked_After_Submission` VR blocks edits to `Patient__c`/`Treatment_Type__c`/`Previously_Declined_Practitioners__c` once the app has left Draft.

## Deferred / follow-ons

- **Onboarding_Complete gate (C8)** — the field `Contact.Onboarding_Complete__c` is INT-006's build target. When INT-006 lands, add a validation rule to block `Status = Submitted` unless `Patient__r.Onboarding_Complete__c = TRUE`.
- **Localized rejection email + patient wizard (C9, C10)** — INT-006 owns the Experience Cloud site + localized templates. The current Flow sends an English inline email; INT-006 swaps to a per-language template set via an Email Alert.
- **Selective indexes (C11)** — deferred to INT-001's design record (Support case required, capstone org can't file).
- **Manual scenes A + B (C12, C13, C7)** — 👁 _pending_; human tester runs `intents/INT-008/test-script.md` scenes A and B.

## Rollback

Destructive deploy in this order: two flows, then the validation rule, then the three new fields. Revert `Status__c` picklist by removing the three added values (existing records must not hold them first). Revert `Assessor_Base` FLS by dropping the three `fieldPermissions` blocks.
