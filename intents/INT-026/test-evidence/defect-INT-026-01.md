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

# Defect — INT-026-C1 — SysAdmin bypasses PHI blockout on custom-report-shape SOQL

**Criterion:** INT-026-C1 — For every PTSF-internal profile × in-platform surface (record page, related list, list view, standard report, custom report, dashboard, SOSL, ContentDocument search), a `Medical_History__c` read returns zero rows (SC-1)
**Found by:** Prashant Kumar · 2026-10-06 · ptsf · `scope/INT-026-finish` @ `685ac28`

## Expected result

A System Administrator profile user, running a custom-report-shape SOQL against `Medical_History__c`, sees zero rows.

## Actual result

`PhiBlockoutCustomReportTest.systemAdministratorCannotReadMedicalHistoryViaCustomReportQuery` fails:

> PHI blockout breach: "System Administrator" saw 1 Medical_History__c rows via custom-report-shape SOQL. Expected: 0, Actual: 1

The other four PTSF-internal profiles on the same test class (`assessor`, `regionalOpsManager`, `standardUser`, `teamManager`) pass. Only the System Administrator profile bypasses the blockout on this surface.

## Steps to reproduce

1. Deploy `scope/INT-026-finish` @ `685ac28` to a sandbox.
2. Run `sf apex run test --class-names PhiBlockoutCustomReportTest --result-format human --wait 10`.
3. Observe `systemAdministratorCannotReadMedicalHistoryViaCustomReportQuery` failing — SysAdmin sees 1 row.

Test run id: `707oB000001WKkb` (also seen in `707oB000001WKfl`).

## Severity rationale

Major — a sysadmin bypass of the PHI blockout is a regulatory concern (PTSF compliance). It is not blocking because the Restriction Rule and sharing shape still deny the four non-admin internal profiles the acceptance walkthrough names; the admin path is the known-expected one Restriction Rules can't close by themselves (admins hold "View All Data" / "Modify All Data"). The real question for ratification is whether the C1 criterion wording should narrow to the four non-admin profiles (and treat admin as a separately-governed break-glass surface audited elsewhere), or whether a Restriction Rule layered with a VAD-aware shape is in scope. That is a scope call for the Trusted Guide; filed as `open` pending that call rather than silently narrowing the criterion.
