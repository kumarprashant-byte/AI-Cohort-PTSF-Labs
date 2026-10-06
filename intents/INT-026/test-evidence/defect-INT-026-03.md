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

# Defect — INT-026-C1 — SysAdmin reaches ContentDocumentLink attached to Medical_History__c

**Criterion:** INT-026-C1 — For every PTSF-internal profile × in-platform surface (…, ContentDocument search), a `Medical_History__c` read returns zero rows (SC-1)
**Found by:** Prashant Kumar · 2026-10-06 · ptsf · `scope/INT-026-finish` @ `685ac28`

## Expected result

A System Administrator profile user, querying `ContentDocumentLink` where the LinkedEntityId points at a `Medical_History__c`, reaches zero attachment rows.

## Actual result

`PhiBlockoutContentDocumentTest.systemAdministratorCannotReachMedicalHistoryAttachmentsViaContentDocumentLink` fails:

> PHI blockout breach: "System Administrator" reached 1 ContentDocumentLink row(s) attached to Medical_History__c. Expected: 0, Actual: 1

The four non-admin internal profiles on the same test class pass. The admin path is the sole failure.

## Steps to reproduce

1. Deploy `scope/INT-026-finish` @ `685ac28` to a sandbox.
2. Run `sf apex run test --class-names PhiBlockoutContentDocumentTest --result-format human --wait 10`.
3. Observe `systemAdministratorCannotReachMedicalHistoryAttachmentsViaContentDocumentLink` failing — SysAdmin reaches 1 CDL row.

Test run id: `707oB000001WKkb` (also seen in `707oB000001WKfl`).

## Severity rationale

Major — same scope question as defect-INT-026-01 and -02 (sysadmin PHI reach), on the attachment surface. ContentDocumentLink is a particularly sensitive leak path because the attachment itself (clinical scan, patient document) typically contains the richer PHI payload. If C1's wording stands as "every profile," this is the one of the three sysadmin defects where the exposure is most consequential and the hardest to fix declaratively.
