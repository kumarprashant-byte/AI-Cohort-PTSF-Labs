---
intent: INT-026
criterion: INT-026-C1
severity: major
status: open
found_by: Prashant Kumar
found_at: 2026-10-06
environment: ptsf (orgfarm epic.out.e68d765f4115)
branch: scope/INT-026-finish
commit: 685ac283e5a1be22296b3f7d3d9c4c5fd26d4f24
---

# Defect — INT-026-C1 — SysAdmin bypasses PHI blockout on dashboard-shape aggregate query

**Criterion:** INT-026-C1 — For every PTSF-internal profile × in-platform surface (record page, related list, list view, standard report, custom report, dashboard, SOSL, ContentDocument search), a `Medical_History__c` read returns zero rows (SC-1)
**Found by:** Prashant Kumar · 2026-10-06 · ptsf · `scope/INT-026-finish` @ `685ac28`

## Expected result

A System Administrator profile user, running a dashboard-shape aggregate (`SELECT COUNT()`) query against `Medical_History__c`, sees zero rows in the aggregate.

## Actual result

`PhiBlockoutDashboardTest.systemAdministratorCannotReadMedicalHistoryViaDashboardQuery` fails:

> PHI blockout breach: "System Administrator" saw 1 Medical_History__c rows via dashboard-shape aggregate query. Expected: 0, Actual: 1

The four non-admin internal profiles on the same test class pass. The admin path is the sole failure.

## Steps to reproduce

1. Deploy `scope/INT-026-finish` @ `685ac28` to a sandbox.
2. Run `sf apex run test --class-names PhiBlockoutDashboardTest --result-format human --wait 10`.
3. Observe `systemAdministratorCannotReadMedicalHistoryViaDashboardQuery` failing — SysAdmin aggregate returns 1.

Test run id: `707oB000001WKkb` (also seen in `707oB000001WKfl`).

## Severity rationale

Major — same shape as defect-INT-026-01 (sysadmin bypass), on a different surface. Treat as one scope call: narrow C1 to non-admin internal profiles, or layer a VAD-aware blockout. Both defects stand or fall together.
