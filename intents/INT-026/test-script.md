---
intent: INT-026
authored: 2026-10-06
---

# INT-026 — Test script

**Intent:** PTSF-internal PHI blockout — in-platform denial-path proof on Medical_History__c
**Design:** `intents/INT-026/design.md`

## Criteria

| Id | Criterion | Type | How proven | Sign-off |
|---|---|---|---|---|
| INT-026-C1 | For every PTSF-internal profile × in-platform surface (record page, related list, list view, standard report, custom report, dashboard, SOSL, ContentDocument search), a `Medical_History__c` read returns zero rows (SC-1) | ⚠️ | Apex test classes `PhiBlockoutRecordPageTest`, `PhiBlockoutRelatedListTest`, `PhiBlockoutListViewTest`, `PhiBlockoutStandardReportTest`, `PhiBlockoutCustomReportTest`, `PhiBlockoutDashboardTest`, `PhiBlockoutSoslTest`, `PhiBlockoutContentDocumentTest` — 5 profiles × 8 surfaces = 40 cells; run via `sf project deploy start --test-level RunSpecifiedTests` in `feature-ci_pr-validation.yml` | Prashant Kumar / 2026-10-06 / fail (sysadmin surface on CustomReport/Dashboard/ContentDocument) — defect-INT-026-01.md · defect-INT-026-02.md · defect-INT-026-03.md (run `707oB000001WKkb`; 4 non-admin profiles × 8 surfaces green) |
| INT-026-C2 | No denial-path cell returns an error that discloses record existence or field names (SC-2) | ✅ | Shared assertion in `PhiBlockoutTestFactory` + `assertDenialForProfile` — asserts zero rows and that any surfaced exception message carries no 15/18-char Id, no `Diagnosis__c`/`Medication__c`/`Allergy__c`/`Notes__c`/`Diagnosis_Code__c` string | _pending CI confirmation_ |
| INT-026-C3 | A Compliance Officer with `PHI Emergency Access` PS reads a `Medical_History__c` record AND an `Audit_Log__c` row (`Action__c = 'Break_Glass_Grant'`) is written in the same transaction (SC-3) | ⛔ | Apex test `PhiBreakGlassAuditSameTxnTest.testGrantAndReadWritesAuditInSameTransaction` — bounded by `Test.startTest()/stopTest()`; asserts exactly one matching `Audit_Log__c` row keyed by officer id and timestamp | Prashant Kumar / 2026-10-06 / fail (positive-path read returns 0) — defect-INT-026-04.md (run `707oB000001WKkb`) |
| INT-026-C4 | The denial-path suite fails the CI build on any red cell when any INT-004 metadata changes (SC-4) | ✅ | `feature-ci_pr-validation.yml` runs `RunSpecifiedTests` and includes all `*Test.cls` touched by the delta; a red Apex cell fails `sf project deploy start --dry-run` and blocks the PR | _pending CI confirmation_ |
| INT-026-C5 | The matrix report is produced per CI run with no PHI samples (guardrail) | ✅ | The `sf apex run test --result-format json` output is the matrix — one row per `Class.Method`; the PHI-leak scan is intrinsic (the Apex tests never surface record data on pass) | _pending CI confirmation_ |
| INT-026-C6 | The latest green CI matrix is signed by the Compliance Officer and attached to INT-004 as its delivered-security evidence (acceptance clause) | 👁 | Signed PDF (or wet-signed scan) committed to `delivery/compliance-evidence/`; pointer added to INT-004's test-script.md as the C5 Restriction-Rule evidence replacement | _pending Compliance Officer sign-off_ |
| INT-026-C7 | The suite is runnable locally via `sf apex run test --class-names <classes> --synchronous` against the build sandbox and produces the same pass set as CI | 👁 | A developer other than the author runs the local command against the build sandbox, inspects the pass set, confirms it matches CI's result-set for the same commit | _pending second-developer run_ |

## Notes

- **Scope narrowed on 2026-10-06** — this intent is now Layer-1 only (in-platform surfaces). Off-platform API surfaces (REST / SOAP / Tooling / Weekly Export / Data Loader) and the dedicated `phi-blockout-matrix` + `phi-blockout-nightly` CI workflows move to **INT-027**. See `decisions/2026-10-06-INT-026-narrow-to-layer-1.md`.
- **Q-026-1** (non-prod sandbox-profile coverage) and **Q-026-2** (expiry-of-grant proof) carry forward from the intent; neither gates C1–C5. C3 covers the grant+log cell; expiry stays with INT-004 unless Q-026-2 lands here.
- The in-platform denial-path matrix is the acceptance evidence for this intent AND one half of the delivered-security evidence for INT-004 (INT-027 is the other half). On the first green CI run, INT-004's test-script C5 ("Restriction Rule blocks internal profiles") graduates from `deferred-as-is` to signed via this matrix.
- **Ratification note:** the scope edit on 2026-10-06 moved the scope hash; the prior `ratified: 2026-10-06 by Prashant Kumar @ 8e4386d466b8` stamp is stale and was removed. Re-ratify after this PR merges and before `deliver`.
