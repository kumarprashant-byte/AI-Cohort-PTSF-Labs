# INT-011 — Deployment runbook

**Intent:** `intents/INT-011/intent.md` · **Design:** `intents/INT-011/design.md` · **Test script:** `intents/INT-011/test-script.md` · **Deferral decision:** `decisions/2026-09-29-INT-011-specialist-referral-deferred.md`

## Prerequisites

- **INT-009 ✅** — `Assignment__c`, `Subsidy_Application__c`, `Treatment_Type__c` (custom object, not picklist), `Contact.Region__c`.
- **Treatment_Type__c records seeded**: at least `Oncology` and `General`. Verify:
  ```bash
  sf data query --query "SELECT Name FROM Treatment_Type__c" --target-org <alias>
  ```
  If missing:
  ```bash
  sf data create record --sobject Treatment_Type__c --values "Name='Oncology'" --target-org <alias>
  sf data create record --sobject Treatment_Type__c --values "Name='General'" --target-org <alias>
  ```

## Metadata deploy (two-part, on a first-time deploy)

Custom Metadata Type schema must exist before its records can deploy. Deploy in two passes:

**Pass 1 — object schema:**
```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Assessment__c \
  --source-dir force-app/main/default/objects/Assessment_Form__mdt \
  --target-org <alias>
```

**Pass 2 — records, code, LWC, PSG:**
```bash
sf project deploy start \
  --source-dir force-app/main/default/customMetadata \
  --source-dir force-app/main/default/classes/AssessmentShareService.cls \
  --source-dir force-app/main/default/classes/AssessmentShareService.cls-meta.xml \
  --source-dir force-app/main/default/classes/AssessmentFormController.cls \
  --source-dir force-app/main/default/classes/AssessmentFormController.cls-meta.xml \
  --source-dir force-app/main/default/classes/AssessmentFormControllerTest.cls \
  --source-dir force-app/main/default/classes/AssessmentFormControllerTest.cls-meta.xml \
  --source-dir force-app/main/default/triggers/AssessmentShareTrigger.trigger \
  --source-dir force-app/main/default/triggers/AssessmentShareTrigger.trigger-meta.xml \
  --source-dir force-app/main/default/lwc/assessmentForm \
  --source-dir force-app/main/default/permissionsets/Practitioner_Assessment_Access.permissionset-meta.xml \
  --target-org <alias> \
  --test-level RunSpecifiedTests --tests AssessmentFormControllerTest
```

**Component tally:** 1 CustomObject (Assessment__c), 1 CustomMetadata type (Assessment_Form__mdt), 2 CustomMetadata records (Oncology, General), 2 ApexClass + 1 Trigger, 1 LWC bundle, 1 PermissionSet.

**Verified deploy:** pass 1 `0AfoB000000yjALSAY`, pass 2 (with tests 6/6 green) `0AfoB000000yjWvSAI` on `orgfarm-5f9310b41f.test2.my.pc-rnd.salesforce.com` — 2026-09-29.

## Setup steps (not in the metadata deploy)

### 1. Assign `Practitioner_Assessment_Access` to practitioner users

Any user who submits assessments needs this PS in addition to their region/role PSG (INT-005):
```bash
sf org assign permset --name Practitioner_Assessment_Access --on-behalf-of apac.practitioner@ptsf.test.invalid --target-org <alias>
```

### 2. Place `assessmentForm` LWC on the Assignment record page

Setup → Object Manager → Assignment → Lightning Record Pages → **Assignment Record Page** → *Edit*. Drag the **Assessment Form** custom component onto the page. Save + Activate.

Also drop it on the Experience Cloud community's Assignment detail page:
Setup → All Sites → *PTSF Community* → Builder → Assignment page → drag **Assessment Form** onto the page → Publish.

### 3. Seed additional Treatment_Type__c records + form schemas as needed

Only `Oncology` and `General` schemas ship. To add `Cardiology`:
1. Create `Treatment_Type__c` record `Name='Cardiology'`.
2. Author `force-app/main/default/customMetadata/Assessment_Form.Cardiology.md-meta.xml` with the field-descriptor JSON.
3. Deploy just the CMT records dir.

## Deferred / follow-ons

- **Specialist re-referral action** — deferred per `decisions/2026-09-29-INT-011-specialist-referral-deferred.md`. `Assessment__c.Parent_Assessment__c` is already present so the follow-on won't need a schema change. The same follow-on should land INT-009's AssignmentSelector (blocks INT-010's enqueue too).
- **Localized form labels** — schemas are English-only. A follow-on can add a `Locale__c` field on `Assessment_Form__mdt` or an alternate schema JSON per locale.
- **Reviewer surface (INT-013)** — reads Assessments in `Pending Review`; not this build.

## Rollback

Metadata is additive but has referential wiring:

1. Remove the LWC from the Assignment record + community page (Setup / App Builder).
2. Deactivate the trigger via the tooling API (destructive deploys on triggers require IsActive=false):
   ```bash
   sf data query --use-tooling-api -q "SELECT Id, Status FROM ApexTrigger WHERE Name='AssessmentShareTrigger'" --target-org <alias>
   # then update Status='Inactive' via the tooling API
   ```
3. Destructive deploy in dependency order: LWC → PermissionSet → Trigger → ApexClasses → CustomMetadata records → Assessment__c object → Assessment_Form__mdt.
