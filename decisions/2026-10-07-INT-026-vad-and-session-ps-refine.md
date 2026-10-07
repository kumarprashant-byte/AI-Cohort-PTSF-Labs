---
date: 2026-10-07
intent: INT-026
author: Prashant Kumar (drafted by agent, pending human ratification)
---

# INT-026 — Narrow SC-1 to non-admin profiles; split SC-3 into Apex-provable + 👁 manual

## Context

INT-026 Apex suite run `707oB000001WKkb` on `scope/INT-026-finish` @ `685ac28` surfaced four failures (defect-INT-026-01..04). Root cause for all four is platform behavior, not a code bug:

- Defects 01–03 (SysAdmin bypasses blockout on CustomReport, Dashboard, ContentDocument surfaces): Restriction Rules do not bind users with "View All Data" / "Modify All Data" ([docs](https://help.salesforce.com/s/articleView?id=sf.security_restriction_rule_considerations.htm)). The three failing surfaces are plain SOQL that correctly returns the seeded row for a VAD holder. The other five SysAdmin cells on the same suite "pass" only because their shapes (SOSL without `Test.setFixedSearchResults`, filters the seed doesn't match) coincidentally return empty — those are false-green and must be strengthened or removed under this refine.
- Defect 04 (Compliance Officer break-glass positive-path reads 0 rows): `PHI_Emergency_Access.permissionset-meta.xml` carries `<hasActivationRequired>true</hasActivationRequired>` — session-based activation. In Apex tests, `UserInfo.getSessionId()` is null, so session activation cannot be exercised; a plain `PermissionSetAssignment` leaves the permission set inactive. The read side is not Apex-provable with the shipped (correct) PS design.

Narrowing C1 and splitting C3 reflects what the shipped INT-004 model actually guarantees. Both changes track platform reality rather than relaxing the trust bar.

## Change

### INT-026 build target
- **Before:** "every profile … System Administrator (with View All), Assessor, Team Manager, Regional Ops, Standard User". Break-glass "tested in Apex: … CAN see the record, and the Audit_Log__c write lands in the same transaction as the read".
- **After:** non-admin profiles only (Assessor, Team Manager, Regional Ops Manager, Standard User). System Administrator explicitly excluded. Break-glass splits into an Apex-provable half (PSA → Audit_Log same transaction) and a 👁 manual half (session activation + read in a sandbox, recorded via `/ql-record-test-execution`).

### INT-026 acceptance
- Narrows the Apex matrix to non-admin cells; adds the manual break-glass sign-off as part of acceptance.

### INT-026 success criteria
- **SC-1:** scoped to non-admin profiles; SysAdmin called out as out-of-SC-1.
- **SC-3** split into **SC-3a** (Apex-provable PSA → Audit_Log same-transaction) and **SC-3b** (👁 manual end-to-end read with session activation).
- SC-2 and SC-4 unchanged.

### INT-026 grounding
- Added two notes: the VAD platform behavior citation + the compensating-control stack governing admin access; the session-based PS behavior citation explaining why SC-3b is 👁 and not ✅.

### Stale ratification stamp
- The working-copy `ratified: 2026-10-06 by Prashant Kumar @ 51e72110fb87` frontmatter line was removed as part of this edit. The hash moved; the stamp was already stale. Re-ratify once this refine is accepted.

## Consequences

- **No drift on the ledger** — INT-026 is 🔧 In progress, not ✅ Delivered. Scope hash moves cleanly.
- **Test script needs re-draft via `/ql-test-script`.** Current test-script.md (on `feature/INT-024-subsidy-calculator`) references defects filed against the old criteria. The re-drafted script should:
  - Scope C1's matrix to the 4 non-admin profiles × 8 surfaces = 32 cells.
  - Strengthen or drop the 5 false-green SysAdmin cells (SOSL, RecordPage, RelatedList, ListView, StandardReport) — either by (a) extending them to actually probe the row or (b) removing SysAdmin entirely from the suite consistent with the narrowed SC-1.
  - Split C3 into a C3a (Apex: PSA → Audit_Log same-transaction, PhiBreakGlassAuditSameTxnTest asserts the audit side only) and a C3b (👁 manual, recorded via `/ql-record-test-execution`).
  - Drop defect-INT-026-01..03 as "resolved by scope refine" with pointer to this decision; keep defect-INT-026-04 pointing here for the C3 split.
- **Compliance Officer sign-off (now C6, pending) stays as the acceptance evidence attaching this intent's green matrix to INT-004.**
- **Dependencies, phase, open questions unchanged.** Q-026-1 and Q-026-2 still carry forward.
- **No admin-side control work is created by this refine.** The compensating controls named in Grounding (named-admin roster, Setup Audit Trail retention, Shield PE if adopted) are governed outside this intent; if the Compliance Officer wants a formal audit of that stack, that's a new intent via `/ql-capture-intent`, not an INT-026 scope expansion.

## Links

- `intents/INT-026/intent.md`
- `intents/INT-026/test-script.md` (needs re-draft)
- `feature/INT-024-subsidy-calculator`: defect-INT-026-01.md · defect-INT-026-02.md · defect-INT-026-03.md · defect-INT-026-04.md
- Salesforce docs: Restriction Rule considerations — https://help.salesforce.com/s/articleView?id=sf.security_restriction_rule_considerations.htm
- Salesforce docs: Session-based Permission Sets — https://help.salesforce.com/s/articleView?id=sf.perm_sets_session_based_overview.htm
