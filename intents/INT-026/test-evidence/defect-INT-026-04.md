---
intent: INT-026
criterion: INT-026-C3
severity: major
status: open
found_by: Prashant Kumar
found_at: 2026-10-06
environment: ptsf (orgfarm epic.out.e68d765f4115)
branch: scope/INT-026-finish
commit: 685ac283e5a1be22296b3f7d3d9c4c5fd26d4f24
---

# Defect — INT-026-C3 — Break-glass positive path returns zero rows for Compliance Officer

**Criterion:** INT-026-C3 — A Compliance Officer with `PHI Emergency Access` PS reads a `Medical_History__c` record AND an `Audit_Log__c` row (`Action__c = 'Break_Glass_Grant'`) is written in the same transaction (SC-3)
**Found by:** Prashant Kumar · 2026-10-06 · ptsf · `scope/INT-026-finish` @ `685ac28`

## Expected result

A Compliance Officer user, after being assigned the `PHI_Emergency_Access` PS, reads exactly one `Medical_History__c` row — and the same transaction writes an `Audit_Log__c` row with `Action__c = 'Break_Glass_Grant'`.

## Actual result

`PhiBreakGlassAuditSameTxnTest.testGrantAndReadWritesAuditInSameTransaction` fails on the positive-path assertion:

> Break-glass positive path broken: Compliance Officer with PHI_Emergency_Access saw 0 rows instead of 1. Expected: 1, Actual: 0

The audit-write side can't even be asserted because the read side is dark. The positive path is the gate — the audit guarantee is nothing without a working read.

## Steps to reproduce

1. Deploy `scope/INT-026-finish` @ `685ac28` to a sandbox.
2. Run `sf apex run test --class-names PhiBreakGlassAuditSameTxnTest --result-format human --wait 10`.
3. Observe `testGrantAndReadWritesAuditInSameTransaction` failing — Compliance Officer sees 0 rows after PSA.

Test run id: `707oB000001WKkb` (also seen in `707oB000001WKfl`).

## Severity rationale

Major — this is C3's whole claim: break-glass grant works + audit writes. Zero rows read means either (a) the `PHI_Emergency_Access` PS doesn't carry the sharing to see the test's seeded `Medical_History__c` row, or (b) the test seeds the row as the wrong owner, or (c) PermissionSetAssignment within the same transaction isn't effective for the queried user context. Likely a factory/seed issue (the test setup, not the shipped PS), since C3's structural assertions in INT-004 passed on deploy. Diagnose before narrowing scope.
