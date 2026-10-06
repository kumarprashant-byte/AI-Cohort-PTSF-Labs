---
intent: INT-011
phase: 3
proof_hash: a4e9b9d8accd
authored: 2026-09-29
---

# INT-011 — Test script

**Intent:** Digital assessment form with specialist re-referral
**Phase:** 3 · **Source intent:** `intents/INT-011/intent.md` · **Design:** `intents/INT-011/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-011-C1 | `Assessment__c` exists with Private OWD and the field set the design names (Assignment lookup required, Treatment_Type restricted picklist, Status picklist with Draft/Pending Review, Response_JSON LongText, Submitted_Date, Parent_Assessment self-lookup) (build target — object) | org-probe (see § Org assertions) | ✅ | (verify — green, 2026-09-30) |
| INT-011-C2 | `AssessmentFormController.getFormSchema` returns the correct `Assessment_Form__mdt` schema for the Assignment's Treatment_Type (build target — metadata-driven layouts) | `AssessmentFormControllerTest.getFormSchemaReturnsMatchingSchema` | ✅ | (CI) |
| INT-011-C3 | Save-draft persists a `Draft` Assessment tied to the Assignment; repeated calls upsert the same Assessment (build target — save-draft support) | `AssessmentFormControllerTest.saveDraftPersistsAndUpserts` | ✅ | (CI) |
| INT-011-C4 | `submit` flips Status to `Pending Review` and stamps `Submitted_Date__c` (build target — submission moves to Pending Review) | `AssessmentFormControllerTest.submitFlipsStatusAndStampsDate` | ✅ | (CI) |
| INT-011-C5 | A practitioner who owns Assignment A can read the Assessment on A; a practitioner who does not own A cannot see that Assessment via SOQL — Apex-managed sharing granting `Edit` to the Assignment's owner (guardrail 1) | `AssessmentSharingTest.practitionerSeesOwnCannotSeeOthers` | ✅ | (CI) |
| INT-011-C6 | `AssessmentShareTrigger` fires on insert and inserts one `Assessment__Share` per new Assessment for the Assignment owner | `AssessmentSharingTest.shareRowInsertedOnInsert` | ✅ | (CI) |
| INT-011-C7 | Files uploaded via the LWC's `lightning-file-upload` are linked to the Assessment record — a `ContentDocumentLink` with `LinkedEntityId = <Assessment>.Id` exists (build target — attachments uploadable and linked) | `AssessmentAttachmentTest.contentDocumentLinksToAssessment` | ✅ | (CI) |
| INT-011-C8 | End-to-end: a practitioner opens an accepted oncology Assignment in the community, the Assessment LWC renders the oncology form (from `Assessment_Form__mdt` with `Treatment_Type__c='Oncology'`), they save a draft, return and submit; a second Assignment for the same practitioner shows an independent form and doesn't leak data (acceptance) | Manual scene A | 👁 | Prashant Kumar / 2026-10-06 / ⚠ env-not-ready / 2026-10-06-63e72dc-execution-report.md |

### Deliberately not tested (out of scope)

- **15-day escalation** (out_of_scope 1) — INT-012.
- **Assessor review console** (out_of_scope 2) — INT-013 reads the `Pending Review` state this build sets; the reviewer UI is theirs.
- **Specialist re-referral spawn** (build target item, deferred to a follow-on — depends on INT-009's AssignmentSelector, which did not deliver). `Parent_Assessment__c` is present on the object so the follow-on doesn't need a schema change. This is a **📋 accepted gap** on the parent intent, ratified in `decisions/2026-09-29-INT-011-specialist-referral-deferred.md`.

## Automated proofs to write

- **`AssessmentFormControllerTest.getFormSchemaReturnsMatchingSchema`** — insert a mock `Assessment_Form__mdt` via `Test.loadData` isn't available for CMT; instead use `Metadata.DeployContainer` isn't testable either — the honest test seeds the CMT via a deployed record (`Oncology.md-meta.xml`) and asserts the controller finds it by Treatment_Type. Runs with `SeeAllData=true` for the CMT read.
- **`AssessmentFormControllerTest.saveDraftPersistsAndUpserts`** — call `saveDraft` twice; assert one `Assessment__c` exists with Status=Draft and the second call's payload wins.
- **`AssessmentFormControllerTest.submitFlipsStatusAndStampsDate`** — after `submit`, Status='Pending Review' and Submitted_Date is not null.
- **`AssessmentSharingTest.practitionerSeesOwnCannotSeeOthers`** — insert two Assignments owned by different Users (via `runAs`), insert Assessments, assert `[SELECT Id FROM Assessment__c]` scoped per user returns only their own.
- **`AssessmentSharingTest.shareRowInsertedOnInsert`** — after inserting an Assessment, query `Assessment__Share WHERE ParentId=:a.Id` and assert exactly one manual share to the Assignment owner with AccessLevel='Edit'.
- **`AssessmentAttachmentTest.contentDocumentLinksToAssessment`** — insert `ContentVersion` + `ContentDocumentLink` with LinkedEntityId=Assessment.Id; assert the link resolves.

## Org assertions

- **INT-011-C1** (`Assessment__c` object shape):
  - `object-exists(Assessment__c)`
  - `field-exists(Assessment__c.Assignment__c)` · `field-required(Assessment__c.Assignment__c)`
  - `field-exists(Assessment__c.Treatment_Type__c)` · `field-type(Assessment__c.Treatment_Type__c, Picklist)`
  - `field-exists(Assessment__c.Status__c)` · `field-type(Assessment__c.Status__c, Picklist)`
  - `field-exists(Assessment__c.Response_JSON__c)` · `field-type(Assessment__c.Response_JSON__c, LongTextArea)`
  - `field-exists(Assessment__c.Submitted_Date__c)`
  - `field-exists(Assessment__c.Parent_Assessment__c)`
  - `fls(read, Assessment__c.Response_JSON__c, permset=Practitioner_Access)`

## Manual validation scenes

### Scene A — End-to-end assessment lifecycle (criterion C8)

1. As admin, ensure a practitioner test user (`apac.practitioner@ptsf.test.invalid` from INT-005 runbook Scene A) exists with `Practitioner_Access` PSG assigned.
2. Insert an accepted Assignment: pick a Subsidy Application with `Treatment_Type__c='Oncology'`; insert an Assignment with `Practitioner_Contact__c` = the practitioner's contact, `Status__c='Assigned'`, then flip `Status__c='Accepted'` and `Accepted_Date__c=NOW()`.
3. Log in as `apac.practitioner@ptsf.test.invalid` (or use *Login as user*), navigate to the Assignment record page in the community.
4. Confirm the **Assessment** LWC renders with the **oncology-specific** fields (as configured in `Assessment_Form.Oncology`).
5. Fill in a few fields, click **Save Draft** — confirm a toast, close the page.
6. Return to the same Assignment the next session — confirm the draft answers reload.
7. Complete the form and click **Submit** — confirm status becomes *Pending Review* on the record and a *Submitted Date* stamp appears.
8. Attempt to open a different practitioner's Assignment (via URL manipulation) — confirm the Assessment for it is **not visible**.

**Expected:** form rendered per treatment type, draft persisted, submission flips status, another practitioner's Assessment stays invisible. **Sign-off:** _name / date / pass·fail_.
