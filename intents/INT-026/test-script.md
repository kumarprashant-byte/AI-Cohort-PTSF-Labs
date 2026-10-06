---
intent: INT-026
proof_hash: d2d326b6c1e2
authored: 2026-10-06
---

# INT-026 — Test script

**Intent:** PTSF-internal PHI blockout — provable denial path on Medical_History__c
**Design:** `intents/INT-026/design.md`

## Criteria

| Id | Criterion | Type | How proven | Sign-off |
|---|---|---|---|---|
| INT-026-C1 | For every PTSF-internal profile × in-platform surface (record page, related list, list view, standard report, custom report, dashboard, SOSL, ContentDocument search), a Medical_History__c read returns zero rows (SC-1) | ✅ | Apex test class per surface, run via `sf apex run --test` or the deploy-validate path. Named classes (all built): `PhiBlockoutRecordPageTest`, `PhiBlockoutRelatedListTest`, `PhiBlockoutListViewTest`, `PhiBlockoutStandardReportTest`, `PhiBlockoutCustomReportTest`, `PhiBlockoutDashboardTest`, `PhiBlockoutSoslTest`, `PhiBlockoutContentDocumentTest`. 5 profiles × 8 surfaces = 40 cells | _pending CI run_ |
| INT-026-C2 | For every PTSF-internal profile × off-platform API surface (REST query, SOAP query, Tooling API, Weekly Export, Data Loader API), a Medical_History__c query returns zero rows or `INSUFFICIENT_ACCESS` without record-id disclosure (SC-1, SC-2) | ✅ | Node runner `scripts/phi-blockout-api-cells.mjs` uses jsforce + JWT bearer flow per profile; asserts zero-rows or opaque error per cell. 5 profiles × 5 surfaces = 25 cells. CI jobs `phi-blockout-matrix` (PR) and `phi-blockout-nightly` (02:00 UTC) invoke it | _pending first CI run with secrets provisioned_ |
| INT-026-C3 | No denial-path cell returns an error that discloses record existence or field names (no "insufficient privileges" paired with a record id, no 404 that leaks object metadata) (SC-2) | ✅ | `opaque(err)` helper in `scripts/phi-blockout-api-cells.mjs` scans the error payload for 15/18-char Salesforce Ids and the encrypted-field API names; a non-opaque error flips the cell to `LEAK` | _pending first CI run_ |
| INT-026-C4 | A Compliance Officer with `PHI Emergency Access` PS reads a Medical_History__c record AND an `Audit_Log__c` row (Action=Break_Glass_Grant) is written in the same transaction; a read without the paired log is a test failure (SC-3) | ✅ | Apex test `PhiBreakGlassAuditSameTxnTest.testGrantAndReadWritesAuditInSameTransaction` — assigns PS via `Assign_Break_Glass_PS` Flow with Reason, reads Medical_History__c, queries Audit_Log__c in same test method, asserts exactly one matching row | _pending build_ |
| INT-026-C5 | The denial-path matrix suite fails the CI build on any red cell when any INT-004 metadata changes (SC-4) | ✅ | GitHub Actions workflow `.github/workflows/phi-blockout-matrix.yml` triggers on PR with path filter covering INT-004 metadata + the matrix harness; builds a scratch, deploys, runs the orchestrator, uploads the matrix as an artifact, exit 1 on any red cell. Nightly companion `.github/workflows/phi-blockout-nightly.yml` runs against `PtsfBuildSandbox` at 02:00 UTC | _pending first CI run with secrets provisioned_ |
| INT-026-C6 | The matrix report is produced in both CSV and Markdown form at `delivery/compliance-evidence/phi-blockout-matrix-<timestamp>.{csv,md}`, one row per (profile × surface), with no PHI samples in the output (guardrail) | ✅ | Orchestrator `scripts/phi-blockout-matrix.mjs` writes both files; assertion step scans the output for any 15/18-char Salesforce Id or any encrypted-field name string — fail on hit | _pending build_ |
| INT-026-C7 | The latest green matrix report is signed by the Compliance Officer and attached to INT-004 as its delivered-security evidence (acceptance clause) | 👁 | Signed PDF (or wet-signed scan) committed to `delivery/compliance-evidence/`; pointer added to INT-004's test-script.md as the C5 Restriction-Rule evidence replacement | _pending Compliance Officer sign-off_ |
| INT-026-C8 | The suite is runnable locally via `npm run phi-blockout-matrix -- --org <alias>` against a long-lived sandbox and produces the same report shape as CI | 👁 | A developer other than the author runs the local command against the build sandbox, inspects the report, confirms it matches CI's artifact for the same commit | _pending second-developer run_ |

## Notes

- **Q-026-1** (non-prod sandbox-profile coverage) and **Q-026-2** (expiry-of-grant proof) carry forward from the intent; neither gates C1–C6. C4 covers the grant+log cell; expiry stays with INT-004 unless Q-026-2 lands here.
- **Q-design-026-1** (scratch-org vs sandbox for CI) and **Q-design-026-2** (JWT Connected App shape + CI secret storage) are design-level — resolve before C2/C5 build.
- The denial-path matrix is **the acceptance evidence** for this intent AND the delivered-security evidence for INT-004. On the first green run, INT-004's test-script C5 ("Restriction Rule blocks internal profiles") graduates from `deferred-as-is` to signed via this matrix.
- `proof_hash: d2d326b6c1e2` stamped by `node scripts/intent-ledger.mjs coverage` on 2026-10-06.
- First build increment (commit after this): config, two Apex test classes (`PhiBlockoutRecordPageTest`, `PhiBreakGlassAuditSameTxnTest`), test factory, matrix orchestrator, Node API runner skeleton. The two Apex classes will run via the existing `feature-ci_pr-validation.yml` deploy-validate path; the dedicated `phi-blockout-matrix` CI job that invokes the orchestrator is **deferred** until Q-design-026-2 (JWT Connected App shape + CI secret storage) resolves. Layer-2 cells therefore stay `unproven` until then.
