---
id: INT-026
phase: 1
epic: E09
confidence: draft
origin: local
title: PTSF-internal PHI blockout — in-platform denial-path proof on Medical_History__c
ratified: 2026-10-07 by Prashant Kumar @ 6c56f219d145
---

# INT-026 — PTSF-internal PHI blockout — in-platform denial-path proof on Medical_History__c

## Outcome

The "PTSF internal users cannot see medical history" promise is proved by test across every in-platform surface a user could reach the data from, so INT-004's Restriction Rule is backed by evidence instead of trust in the config. Off-platform API surfaces are proved separately by INT-027.

## Build target

- An automated Apex denial-path test suite exercising every in-platform surface a PTSF-internal non-admin user could use to reach `Medical_History__c`: record page, related list, list view, standard report, custom report, dashboard, SOSL global search, ContentDocument search
- One test method per non-admin profile in scope: Assessor, Team Manager, Regional Ops Manager, Standard User. System Administrator is explicitly excluded — Restriction Rules do not bind "View All Data" holders; admin access is governed by the compensating controls named in Grounding
- Break-glass path, Apex-provable half: assigning the `PHI Emergency Access` permission set to a Compliance Officer writes an `Audit_Log__c` row with `Action__c = 'Break_Glass_Grant'` in the same transaction as the assignment
- Break-glass path, 👁 manual half: a named Compliance Officer activates the session-based `PHI Emergency Access` permission set in a sandbox and reads a `Medical_History__c` record end-to-end — recorded via `/ql-record-test-execution`. The permission set is session-based (`hasActivationRequired=true`), so the read side cannot be exercised in Apex and must be proved by a human run

## Guardrails

- Must not weaken INT-004's model to make the test easier — if a surface leaks, INT-004 is wrong and must be fixed
- Must not grant the test runner any permission production users don't have — each test runs as the actual profile under test via `System.runAs`
- Must not log PHI into the test output — pass/fail only, never record samples

## Out of scope

- Must not test Shield encryption key management — separate control, separate evidence
- Must not test practitioner access during an open assignment — INT-004's positive path already proves it (INT-019 extends the positive side)
- Must not test off-platform API surfaces (REST / SOAP / Tooling / Weekly Export / Data Loader) — scoped to INT-027
- Must not build the GitHub Actions matrix workflow — scoped to INT-027

## Acceptance

The in-platform Apex suite runs green: for every (non-admin PTSF-internal profile × in-platform surface) cell, `Medical_History__c` is unreachable — 0 rows returned, no error disclosure, no sideways leak via related lists or SOSL. Apex-provable break-glass: assigning `PHI Emergency Access` to a Compliance Officer writes exactly one `Audit_Log__c` row with `Action__c = 'Break_Glass_Grant'` in the same transaction as the assignment. Manual break-glass: a named Compliance Officer activates the session-based permission set in a sandbox, reads a `Medical_History__c` record, and the run is recorded under `intents/INT-026/test-evidence/` with a human sign-off. The Apex test classes run green under `sf project deploy start --test-level RunSpecifiedTests` in CI.

## Success criteria

- SC-1: Every (non-admin PTSF-internal profile × in-platform surface) Apex cell returns zero `Medical_History__c` rows. System Administrator is out of SC-1 — covered by the compensating controls in Grounding.
- SC-2: No surface returns an error that discloses record existence or field names.
- SC-3a: Assigning the break-glass permission set to a Compliance Officer writes exactly one `Audit_Log__c` row with `Action__c = 'Break_Glass_Grant'` in the same transaction as the assignment. Apex-provable.
- SC-3b: A named Compliance Officer activates the session-based `PHI Emergency Access` permission set in a sandbox and reads a `Medical_History__c` record; the run is recorded with a human sign-off. 👁 manual — the session-based activation (`hasActivationRequired=true`) is not exercisable in Apex.
- SC-4: The suite runs green in the PR CI deploy-validate path on any change touching INT-004 metadata (profiles, Restriction Rules, permission sets, sharing settings).

## Dependencies

### Internal
- INT-004 — the security model this intent proves

### External
_none_

## Open questions

- Q-026-1: Which non-production profiles need the same denial-path proof — only Full Sandbox, or Partial / Developer Pro too? (resolver: PTSF Compliance Officer + Technical Architect)
- Q-026-2: Does the break-glass test need to prove the grant *expires* (time-bound)? If yes, this intent owns the time-bound mechanism's test; INT-004 owns the mechanism itself. (resolver: PTSF Compliance Officer)

## Grounding

- INT-004 (✅ Delivered) implemented Private OWD + Apex-managed sharing + Restriction Rules + the break-glass permission set. INT-004's acceptance walked the positive path and the SysAdmin-blocked path, but did not establish a repeatable multi-surface denial matrix. This intent closes that gap on the in-platform side; INT-027 extends it to off-platform API surfaces.
- **System Administrator excluded from SC-1 by platform design.** Restriction Rules do not apply to users with "View All Data" / "Modify All Data" ([Salesforce docs — Restriction Rule considerations](https://help.salesforce.com/s/articleView?id=sf.security_restriction_rule_considerations.htm)). Admin PHI access is governed by compensating controls: a short named-admin roster, Setup Audit Trail retention, and (if adopted) Shield Platform Encryption key separation. Those controls are owned outside this intent; see `decisions/2026-10-07-INT-026-vad-and-session-ps-refine.md`.
- **Break-glass read is session-based.** `PHI_Emergency_Access.permissionset-meta.xml` carries `<hasActivationRequired>true</hasActivationRequired>`. A `PermissionSetAssignment` alone does not activate it; the user must activate the session (UI or `SessionPermSetActivation`). `UserInfo.getSessionId()` is null in Apex tests, so the end-to-end read cannot be exercised in Apex — hence SC-3b is 👁 manual, not ✅ Apex.
