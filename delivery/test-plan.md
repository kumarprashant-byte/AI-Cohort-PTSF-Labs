---
title: PTSF Patient Travel Support — Test Plan
authored: 2026-09-30
org: epic.out.e68d765f4115@orgfarm.salesforce.com
alias: ptsf-lab
---

# PTSF Patient Travel Support — Test Plan

A tester walkthrough for the 20 delivered intents. The full proof-plan matrix (every `INT-NNN-Cx` criterion, its type, and its sign-off) lives in each intent's own `intents/INT-NNN/test-script.md`; this document is the runnable overlay — how to log in, what data to use, in what order, and what to look for.

- **Target org:** `epic.out.e68d765f4115@orgfarm.salesforce.com` (alias `ptsf-lab`)
- **Open:** `sf.cmd org open --target-org epic.out.e68d765f4115@orgfarm.salesforce.com`
- **Automated coverage:** 39 Apex tests, all green. Run with `sf.cmd apex test run --test-level RunLocalTests --wait 10 --target-org ptsf-lab`.
- **Manual coverage:** 15 delivered intents carry 👁 criteria awaiting a human sign-off. Each scene in §3 below maps to one or more of those criteria.

## 1. Prerequisites

### 1.1 What's already deployed
Everything in `force-app/` is deployed to the sandbox (Deploy ID `0AfoB000000ys7BSAQ`, 203/203 components succeeded). This includes:
- Custom objects: `Subsidy_Application__c`, `Assignment__c`, `Assessment__c`, `HIC_Check__c`, `Medical_History_Entry__c`, plus platform events (`HIC_Prefill_Requested__e`, `HIC_Prefill_Completed__e`, `HIC_Entitlement_Completed__e`).
- Apex: `SamlJitHandler`, `HICQueueable`, `HICCalloutClient`, `HICRetrySchedulable`, `AssignmentSlaCheckAction`, `AssessmentFormController`, `MedicalHistorySnapshot`, and 12 more.
- Flows: `Subsidy_Application_On_Submit`, `Subsidy_Application_On_HIC_Complete`, `Assignment_SLA_Check`.
- Sharing rules: 9 criteria-based rules scoping Applications/Assignments/Assessments by region.
- Roles (12), permission sets, validation rules, custom report types, report/dashboard folders.

### 1.2 Test data seeded
Run `bash scripts/seed-test-data.sh` (idempotent; each run tags records with a timestamp). One prior run has already loaded:

| Type | Count | Notes |
|---|---|---|
| Contact | 6 test contacts | Patient + Practitioner × EMEA/AMER/APAC |
| Subsidy_Application__c | 5 | Draft (EMEA), Submitted (AMER), Awaiting_Practitioner (APAC), Approved (EMEA), plus one from an earlier smoke-test run |
| Assignment__c | 1 | APAC, Status=Assigned, linked to the awaiting-practitioner app |

Query anytime:
```
sf.cmd data query -q "SELECT Id, Status__c, Region__c FROM Subsidy_Application__c" --target-org ptsf-lab
```

### 1.3 What a tester needs
- System-admin login to the ptsf-lab org (used for every scene below). Persona-based testing (dedicated Assessor / Practitioner / Patient users, region-scoped sharing enforcement) is out of scope for this dry-run; it requires provisioning users through the SAML JIT handler with real IdP metadata — see runbook `intents/INT-002/`.
- The `sf` CLI authed to `ptsf-lab` (already the case in this workspace).

## 2. Suggested test order

Follow the phases so downstream scenes have upstream state to work against:

1. **Structural smoke tests (§3.1)** — objects, flows, sharing rules deployed and active.
2. **Application lifecycle (§3.2)** — the state machine from Draft → Submitted → Awaiting_Insurance_Check → Rejected / Awaiting_Practitioner.
3. **Insurance-check integration (§3.3)** — the async platform-event → Queueable → callback pattern.
4. **Assignment + assessment (§3.4)** — practitioner claim, SLA reassignment, assessment save/submit.
5. **Access boundaries (§3.5)** — medical history not visible to Assessors; region isolation.
6. **Reporting (§3.6)** — the three regional dashboards.

## 3. Manual test scenes

Each scene names its **intent + criteria** so the sign-off can be recorded back into `intents/INT-NNN/test-script.md` (via `/ql-record-test-execution`) once run.

### 3.1 Structural smoke tests (INT-001..020, all `org-probe ✅` criteria)

Confirms every deployed component is present and active.

1. **Setup → Object Manager** — confirm the custom objects listed in §1.1 all exist and are queryable.
2. **Setup → Flows** — confirm three flows show Active: `Subsidy_Application_On_Submit`, `Subsidy_Application_On_HIC_Complete`, `Assignment_SLA_Check`.
3. **Setup → Sharing Settings → `Subsidy_Application__c`** — confirm OWD is Private and three regional criteria-based rules exist (`Share_EMEA_Applications`, `Share_AMER_Applications`, `Share_APAC_Applications`).
4. **Setup → Named Credentials** — confirm `PTSF_HIC` exists (endpoint will be a placeholder; enablement is a runbook step).
5. **Setup → Reports → PTSF_Reports folder** — confirm the folder exists (dashboards live in `PTSF_Dashboards`).

**Expected:** every check green. **Signs off:** the org-probe `✅` criteria that were already verified (2026-09-30) — this is a second-eyes confirmation.

### 3.2 Application lifecycle (INT-008)

**Criteria proven:** INT-008-C7, C12, C13.

**Scene A — Auto-reject on covered-by-insurance (INT-008-C12).**
1. Open `App Launcher → Subsidy Applications → All`. Pick the AMER **Submitted** record (`a05oB000002vrG9QAI`).
2. Change Status to `Submitted` and save (record is already Submitted; make a trivial edit and save to re-fire the flow). Confirm within 5 seconds:
   - Status advances to `Awaiting_Insurance_Check`.
   - `Submitted_At__c` is stamped.
   - `Medical_History_Snapshot__c` is populated (LongTextArea, non-empty).
3. Publish a test `HIC_Entitlement_Completed__e`:
   ```
   sf.cmd data create record --sobject HIC_Entitlement_Completed__e \
     --values "Source_Object__c='Subsidy_Application__c' Source_Record_Id__c=a05oB000002vrG9QAI Status__c='Covered'" \
     --target-org ptsf-lab
   ```
4. Refresh the record. Expected: `Status__c = Rejected`, `Rejection_Reason__c` populated, and an email is queued (Setup → Email Logs).

**Scene B — Not-covered branch (INT-008-C13).**
1. Pick the EMEA **Draft** record (`a05oB000002vrEXQAY`). Change Status to `Submitted`; save.
2. Wait for it to advance to `Awaiting_Insurance_Check`.
3. Publish `HIC_Entitlement_Completed__e` with `Status__c='Not_Covered'`.
4. Expected: `Status__c = Awaiting_Practitioner`; no rejection email.

**Scene C — Locked-after-submit (INT-008-C6 regression check).**
1. Open any Submitted / Awaiting_* application.
2. Try to edit `Patient__c` or `Treatment_Type__c`. Expected: validation rule `Locked_After_Submission` blocks the save with "not editable after submission".

### 3.3 Insurance-check integration (INT-007)

**Criteria proven:** INT-007-C1..C7 are already green via Apex (`HICQueueableTest`, `HICCalloutClientTest`, `HICRetrySchedulableTest`). Manual scenes below re-observe the mechanism in the org.

**Scene D — Publish → Queueable enqueues (INT-007-C1).**
1. Publish `HIC_Prefill_Requested__e`:
   ```
   sf.cmd data create record --sobject HIC_Prefill_Requested__e \
     --values "Source_Record_Id__c='a05oB000002vrG9QAI' Submitted_At__c=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     --target-org ptsf-lab
   ```
2. Setup → Apex Jobs — expect one `HICQueueable` job enqueued within 5 seconds. Because the Named Credential endpoint is a placeholder, the callout will fail once, retry, and eventually flip the row to `Deferred`.
3. Query the `HIC_Check__c` row: `sf.cmd data query -q "SELECT Status__c, Attempt_Count__c FROM HIC_Check__c"`. Expected: `Attempt_Count__c` reaches 3, `Status__c = Deferred`, `Next_Attempt_At__c` in the future.

**Scene E — Idempotency (INT-007-C4).**
1. Re-publish the same `HIC_Prefill_Requested__e` with identical `Source_Record_Id__c` + `Submitted_At__c`.
2. Expected: no second `HIC_Check__c` row (still exactly 1); `Attempt_Count__c` does not increment a second time on the second publish.

### 3.4 Assignment + assessment (INT-010, INT-011)

**Criteria proven:** INT-010-C8 (SLA reassignment), INT-011-C8 (save-draft / submit round-trip).

**Scene F — SLA reassignment fires (INT-010-C8).**
1. Take the APAC assignment (`a03oB000000eidRQAQ`) and backdate `Assigned_Date__c` to 4 business days ago:
   ```
   sf.cmd data update record --sobject Assignment__c --record-id a03oB000000eidRQAQ \
     --values "Assigned_Date__c=$(date -u -d '4 days ago' +%Y-%m-%dT%H:%M:%SZ)" \
     --target-org ptsf-lab
   ```
2. Setup → Flows → `Assignment_SLA_Check` → Run (or wait for the schedule).
3. Expected: the Assignment status flips to `Reassigned`, and the parent `Subsidy_Application__c.Previously_Declined_Practitioners__c` captures the practitioner Contact Id.

**Scene G — Assessment save-draft and submit (INT-011-C8).**
1. From the APAC assignment, open the Assessment LWC (embedded on the Assignment page).
2. Fill in fields for the treatment type; click **Save Draft**. Expected: one `Assessment__c` row created with `Status__c = Draft`.
3. Click **Save Draft** again after editing. Expected: same row updated (no second row).
4. Click **Submit**. Expected: `Status__c = Pending Review`, `Submitted_Date__c` stamped.

### 3.5 Access boundaries (INT-001, INT-020)

**Criteria proven:** INT-001-C2 (Assessor can't see medical history in any UI path), INT-020-C5 (region isolation).

These scenes need a persona other than System Admin — record them as **⛔ blocked pending user provisioning** unless test users have been created by the SAML JIT handler runbook.

**Scene H — Medical history invisible to Assessor.**
1. Log in as an EMEA Assessor test user.
2. Confirm no **Medical History Entries** tab in the nav.
3. Open any Subsidy Application → confirm no MHE related list.
4. Navigate to `/lightning/o/Medical_History_Entry__c/list` → list loads with 0 records.

**Scene I — Region isolation.**
1. Log in as an APAC Regional Ops Manager test user.
2. Open `Subsidy Applications → All` → confirm only APAC-region rows are visible.
3. Try to open an EMEA record by direct URL → "insufficient privileges".

### 3.6 Reporting (INT-016)

**Criteria proven:** INT-016-C7 (regional dashboards filter by region).

**Scene J — Team Manager Dashboard region isolation.**
1. Log in as an APAC Regional Ops Manager test user.
2. Open Analytics → PTSF Dashboards → Team Manager Dashboard.
3. Confirm every component shows APAC-only rows (or the dashboard prompts the admin to build the reports if they weren't part of the metadata deploy — INT-016-C5 is an accepted gap; see runbook `intents/INT-016/`).

## 4. Recording sign-offs

After each scene:
1. Open the relevant `intents/INT-NNN/test-script.md`.
2. Update the Sign-off cell for each criterion to `<name> / <date> / pass` (or `/ fail / <report>`).
3. Or run `/ql-record-test-execution INT-NNN` which drafts a persistent execution report under `intents/INT-NNN/test-evidence/` and fills the cell for you.

For a failure: capture the actual vs expected, and let `/ql-diagnose` route it to a fix branch.

## 5. What this test plan does NOT cover

- **Real IdP / SAML end-to-end (INT-002-C6, INT-003-C4)** — needs PTSF IT to hand over EMEA AD metadata and Facebook Dev App credentials. See runbooks under `intents/INT-002/` and `intents/INT-003/`.
- **Real HIC vendor callout (INT-007-C9)** — accepted gap; the mocked test suite covers the mechanism, but a live vendor call awaits Q-007-1.
- **TAMS migration + cutover (INT-018)** — production cutover, not a functional test. See runbook `intents/INT-018/`.
- **Persona provisioning (INT-002 JIT handler + INT-003 self-registration)** — needs upstream IdP + Facebook OAuth credentials.

The gaps above are all documented as `📋 accepted-gap` in each intent's test script and pass `coverage --gate` because they carry a named accepter and a pointer.

## 6. Quick reference — seed IDs

| Record | Id | Notes |
|---|---|---|
| Patient EMEA | 003oB000000eiTlQAI | latest seed run |
| Patient AMER | 003oB000000eiWzQAI | |
| Patient APAC | 003oB000000eiaDQAQ | |
| Practitioner EMEA | 003oB000000eiVNQAY | |
| Practitioner AMER | 003oB000000eiYbQAI | |
| Practitioner APAC | 003oB000000eibpQAA | |
| App EMEA Draft | a05oB000002vrEXQAY | ready to submit |
| App AMER Submitted | a05oB000002vrG9QAI | ready for HIC-completed event |
| App APAC Awaiting_Practitioner | a05oB000002vrHlQAI | has assignment attached |
| App EMEA Approved | a05oB000002vrJNQAY | terminal state |
| Assignment APAC | a03oB000000eidRQAQ | ready for SLA backdating |
