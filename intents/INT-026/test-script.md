---
intent: INT-026
phase: 1
proof_hash: 0ba3b9d1d481
authored: 2026-10-07
---

# INT-026 — Test script

**Intent:** PTSF-internal PHI blockout — in-platform denial-path proof on Medical_History__c
**Source intent:** `intents/INT-026/intent.md`
**Design:** `intents/INT-026/design.md` (pre-narrowing — Layer 2 + SysAdmin + Apex-provable read; stale against the refined intent, flagged for a follow-on refine)

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-026-C1 | Every (non-admin PTSF-internal profile × in-platform surface) returns zero `Medical_History__c` rows (SC-1, acceptance). 4 profiles × 8 surfaces = 32 cells. | `PhiBlockoutRecordPageTest.{assessor,teamManager,regionalOpsManager,standardUser}CannotReadMedicalHistoryViaRecordPageQuery` · `PhiBlockoutRelatedListTest.{…}CannotReadMedicalHistoryViaRelatedListQuery` · `PhiBlockoutListViewTest.{…}CannotReadMedicalHistoryViaListViewQuery` · `PhiBlockoutStandardReportTest.{…}CannotReadMedicalHistoryViaStandardReportQuery` · `PhiBlockoutCustomReportTest.{…}CannotReadMedicalHistoryViaCustomReportQuery` · `PhiBlockoutDashboardTest.{…}CannotReadMedicalHistoryViaDashboardQuery` · `PhiBlockoutSoslTest.{…}CannotReadMedicalHistoryViaSoslSearch` · `PhiBlockoutContentDocumentTest.{…}CannotReachMedicalHistoryAttachmentsViaContentDocumentLink` | ✅ | (CI) |
| INT-026-C2 | No denial-path cell returns an error that discloses record existence or field names (SC-2). | Shared assertion `PhiBlockoutTestFactory.assertDenialIsOpaque(result)` applied in every C1 cell — asserts zero rows and that any exception message carries no 15/18-char Salesforce Id, no `Diagnosis__c`/`Medication__c`/`Allergy__c`/`Notes__c`/`Diagnosis_Code__c`/`Encounter_Date__c` string. | ✅ | (CI) |
| INT-026-C3a | Assigning `PHI_Emergency_Access` to a Compliance Officer writes exactly one `Audit_Log__c` with `Action__c='Break_Glass_Grant'` in the same transaction as the PSA (SC-3a). | `PhiBreakGlassAuditSameTxnTest.psaWritesAuditInSameTransaction` — bounded by `Test.startTest()/stopTest()`; asserts exactly one matching row keyed by officer id + timestamp. The read side is NOT asserted here (moved to C3b). | ✅ | (CI) |
| INT-026-C3b | A named Compliance Officer activates the session-based `PHI Emergency Access` PS in the build sandbox and reads one `Medical_History__c` record end-to-end (SC-3b). Session-based activation (`hasActivationRequired=true`) is not Apex-exercisable. | Manual scene A — recorded via `/ql-record-test-execution`; evidence under `intents/INT-026/test-evidence/`. | 👁 | _pending Compliance Officer sign-off_ |
| INT-026-C4 | SysAdmin PHI access is governed by compensating controls, not by this suite (grounding, out-of-SC-1). The suite does **not** include SysAdmin cells — a SysAdmin test method appearing on any `PhiBlockout*Test` class is a build-time regression. | Repo-grep assertion in CI (`scripts/assert-no-sysadmin-cells.sh`): fails the build if any file under `force-app/main/default/classes/PhiBlockout*Test.cls` matches `systemAdministrator` / `SysAdmin` / `System Administrator`. Keeps the narrowing enforced in code, not just prose. | ✅ | (CI) |
| INT-026-C5 | The denial-path suite fails CI on any red cell when INT-004 metadata changes (SC-4). | `.github/workflows/feature-ci_pr-validation.yml` runs `sf project deploy start --test-level RunSpecifiedTests --tests PhiBlockoutRecordPageTest,PhiBlockoutRelatedListTest,PhiBlockoutListViewTest,PhiBlockoutStandardReportTest,PhiBlockoutCustomReportTest,PhiBlockoutDashboardTest,PhiBlockoutSoslTest,PhiBlockoutContentDocumentTest,PhiBreakGlassAuditSameTxnTest` with a path filter on `force-app/main/default/{objects/Medical_History__c,permissionsets/PHI_Emergency_Access,profiles,sharingRules}/**` — a red Apex cell blocks the PR. | ✅ | (CI) |
| INT-026-C6 | The suite produces no PHI samples in test output (guardrail G3). | Apex tests emit pass/fail only — assertion messages reference profile name and surface, never the seeded record's PHI field values. Shared helper `assertDenialIsOpaque` enforces this on the exception path; test factories never log the record. | ✅ | (CI) |
| INT-026-C7 | The test runner is granted no permission a production user wouldn't have (guardrail G2). | `PhiBlockoutTestFactory.denyUserFor(roleName)` creates each non-admin test user with their production permission set only (Assessor_Base / AMER_Team_Manager / AMER_Regional_Ops_Manager / none for Standard User) and no extra Modify-All or View-All grants — asserted by inspection of the factory (reviewed at PR) and by the fact that if a factory grant leaked, C1 cells for the affected profile would turn green when they shouldn't. | ⚠️ | _enforcement is implicit — a factory audit is the C7 proof; add `PhiBlockoutTestFactoryAuditTest` as a follow-on if the implicit check isn't trusted_ |
| INT-026-C8 | A fresh green CI matrix for this intent is signed by the PTSF Compliance Officer and attached to INT-004 as its C5 delivered-security evidence (acceptance). | Signed PDF (or wet-signed scan) committed to `delivery/compliance-evidence/`; pointer added to INT-004's test-script.md as its C5 Restriction-Rule evidence replacement. | 👁 | _pending Compliance Officer sign-off (gated on first green CI run of C1–C6)_ |
| INT-026-C9 | The suite is runnable locally against the build sandbox and produces the same pass set as CI (local-reproducibility). | A developer other than the author runs `sf apex run test --class-names PhiBlockoutRecordPageTest,PhiBlockoutRelatedListTest,PhiBlockoutListViewTest,PhiBlockoutStandardReportTest,PhiBlockoutCustomReportTest,PhiBlockoutDashboardTest,PhiBlockoutSoslTest,PhiBlockoutContentDocumentTest,PhiBreakGlassAuditSameTxnTest --synchronous --result-format human --wait 10` against the build sandbox, confirms the pass set matches CI for the same commit, records result in Manual scene B. | 👁 | _pending second-developer run_ |

**Deliberately not tested (out of scope):**

- Shield Platform Encryption key management — separate control, separate evidence (OOS line 1).
- Practitioner access during an open assignment — INT-004 / INT-019 own it (OOS line 2).
- Off-platform API surfaces (REST / SOAP / Tooling / Weekly Export / Data Loader) — INT-027 (OOS line 3).
- GitHub Actions matrix workflow / Node Layer-2 runner — INT-027 (OOS line 4).
- Grant *expiry* / time-bounded break-glass — stays with INT-004 unless Q-026-2 lands here.
- Non-prod sandbox profile templates (Partial / Developer Pro) — gated on Q-026-1.

## Automated proofs to write

> Classes exist on `feature/INT-026-phi-blockout-proof` with pre-narrowing shape; the re-draft removes SysAdmin methods and splits the break-glass test. **Each class drops its `systemAdministrator*` method.** Each class keeps the four non-admin methods calling `assertDenial(profileName)`.

- **`PhiBlockoutRecordPageTest.{assessor,teamManager,regionalOpsManager,standardUser}CannotReadMedicalHistoryViaRecordPageQuery`** — `System.runAs(denyUserFor(profile))` → `[SELECT COUNT() FROM Medical_History__c WHERE Id = :seedId]` returns 0; assertion via shared `assertDenialIsOpaque`.
- **`PhiBlockoutRelatedListTest.*`** — related-list-shape SOQL joining via `Patient__c` → 0 rows per non-admin profile.
- **`PhiBlockoutListViewTest.*`** — list-view-shape (filterable fields in `WHERE`) → 0 rows per non-admin profile.
- **`PhiBlockoutStandardReportTest.*`** — standard-report-shape (grouping by `CreatedDate`) → 0 rows per non-admin profile.
- **`PhiBlockoutCustomReportTest.*`** — custom-report-shape (`WHERE Diagnosis_Code__c != NULL`) → 0 rows per non-admin profile.
- **`PhiBlockoutDashboardTest.*`** — `SELECT COUNT(Id) FROM Medical_History__c` aggregate → 0 per non-admin profile.
- **`PhiBlockoutSoslTest.*`** — `[FIND :term IN ALL FIELDS RETURNING Medical_History__c(Id)]` with `Test.setFixedSearchResults(new List<Id>{seedId})` → the user's `runAs` block returns 0 rows per non-admin profile. (Without `setFixedSearchResults`, SOSL returns empty in tests regardless of sharing — that was the pre-narrowing false-green; this fixture forces the search to be fed the seed id and then verifies the sharing/restriction layer still denies it.)
- **`PhiBlockoutContentDocumentTest.*`** — `SELECT COUNT() FROM ContentDocumentLink WHERE LinkedEntityId IN (SELECT Id FROM Medical_History__c)` → 0 per non-admin profile.
- **`PhiBreakGlassAuditSameTxnTest.psaWritesAuditInSameTransaction`** — insert `PermissionSetAssignment(AssigneeId=officer.Id, PermissionSetId=:phiEmergencyAccessPsId)` within `Test.startTest()`; `Test.stopTest()` flushes; assert exactly one `[SELECT Id FROM Audit_Log__c WHERE Action__c='Break_Glass_Grant' AND User__c=:officer.Id AND Timestamp__c >= :testStart]`. The method **does not** attempt `System.runAs(officer)` + Medical_History__c read — that's C3b (manual).
- **`PhiBlockoutTestFactory.assertDenialIsOpaque(Exception e, Integer rowsSeen, String profileName, String surfaceName)`** — new shared helper: asserts `rowsSeen == 0`; if `e != null`, asserts `e.getMessage()` has no 15/18-char Id, no PHI field API name. Called at the end of every C1 `assertDenial`.
- **`scripts/assert-no-sysadmin-cells.sh`** — repo-grep guardrail for C4: fail the build if any `PhiBlockout*Test.cls` references `systemAdministrator` / `SysAdmin` / `System Administrator`. Wired as a step in `feature-ci_pr-validation.yml` before the Apex run.

## Org assertions

_No `org-probe` criteria. INT-026 proves runtime denial behavior; the structural wiring (OWD Private, Restriction Rule shape, PS object/field permissions) is INT-004's org-probe surface._

## Manual validation scenes

### Scene A — Session-activated break-glass read (criterion C3b)

**Persona:** Named PTSF Compliance Officer with the `PHI_Emergency_Access` permission set assigned (session-based, inactive at session start).
**Setup:** The build sandbox has at least one `Medical_History__c` record seeded. The Compliance Officer has a `PermissionSetAssignment` to `PHI_Emergency_Access` but has not yet activated the session.

1. Log in to the build sandbox as the Compliance Officer.
2. Open **Settings → Advanced User Details → Session-Activated Permission Sets**. Confirm `PHI_Emergency_Access` is listed as *available but inactive*.
3. Navigate to a `Medical_History__c` record page by direct URL (`/lightning/r/Medical_History__c/<id>/view`). **Expected:** access denied (Restriction Rule in effect).
4. Return to Session-Activated Permission Sets. **Activate** `PHI_Emergency_Access` — record the activation reason the UI prompts for.
5. Return to the `Medical_History__c` record page. **Expected:** the record now renders; PHI fields are visible (Diagnosis, Medication, Allergy, Notes, Diagnosis_Code, Encounter_Date).
6. In Developer Console → Query Editor (or a report), run `SELECT Count(Id) FROM Audit_Log__c WHERE Action__c='Break_Glass_Grant' AND User__c = <officer-id> AND Timestamp__c >= <activation time>`. **Expected:** exactly one row.
7. Deactivate the permission set from Session-Activated Permission Sets. Return to the record page. **Expected:** access denied again.

**Expected overall:** PHI is unreachable before session activation, reachable after, audit row exists, deactivation restores denial. The run is recorded via `/ql-record-test-execution` under `intents/INT-026/test-evidence/`; the Compliance Officer signs.

**Sign-off:** _name / date / pass·fail / report-filename_

### Scene B — Local-reproducibility check (criterion C9)

**Persona:** PTSF developer other than the author of this intent.
**Setup:** Clone the repo at the commit CI last ran green on. Build sandbox credentials in `~/.sfdx` as alias `ptsf-build`.

1. `cd` to the repo root, confirm the branch head matches the CI commit.
2. Run:
   ```bash
   sf apex run test --class-names \
     PhiBlockoutRecordPageTest,PhiBlockoutRelatedListTest,PhiBlockoutListViewTest,\
     PhiBlockoutStandardReportTest,PhiBlockoutCustomReportTest,PhiBlockoutDashboardTest,\
     PhiBlockoutSoslTest,PhiBlockoutContentDocumentTest,PhiBreakGlassAuditSameTxnTest \
     --synchronous --result-format human --wait 10 --target-org ptsf-build
   ```
3. Confirm the local pass set matches CI's result set for the same commit (same method count green, same failures if any). Attach the output alongside the CI artifact link in the sign-off record.

**Expected:** local run and CI run agree. Discrepancy is a defect filed against INT-026.

**Sign-off:** _name / date / pass·fail / report-filename_
