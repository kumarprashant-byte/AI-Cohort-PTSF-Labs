---
id: INT-026
phase: 1
epic: E09
confidence: draft
origin: local
title: PTSF-internal PHI blockout — in-platform denial-path proof on Medical_History__c
ratified: 2026-10-06 by Prashant Kumar @ 51e72110fb87
---

# INT-026 — PTSF-internal PHI blockout — in-platform denial-path proof on Medical_History__c

## Outcome

The "PTSF internal users cannot see medical history" promise is proved by test across every in-platform surface a user could reach the data from, so INT-004's Restriction Rule is backed by evidence instead of trust in the config. Off-platform API surfaces are proved separately by INT-027.

## Build target

- An automated Apex denial-path test suite exercising every in-platform surface a PTSF internal user could use to reach `Medical_History__c`: record page, related list, list view, standard report, custom report, dashboard, SOSL global search, ContentDocument search
- One test method per profile in scope: System Administrator (with View All), Assessor, Team Manager, Regional Ops, Standard User
- Break-glass path tested in Apex: a Compliance Officer with the `PHI Emergency Access` permission set CAN see the record, and the `Audit_Log__c` write lands in the same transaction as the read

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

The in-platform Apex suite runs green: for every (profile × in-platform surface) cell where the profile is a PTSF internal, `Medical_History__c` is unreachable — 0 rows returned, no error disclosure, no sideways leak via related lists or SOSL. For the Compliance Officer with the break-glass permission set, the record IS reachable AND an `Audit_Log__c` row with `Action__c = 'Break_Glass_Grant'` is confirmed written in the same transaction as the first read. The Apex test classes run green under `sf project deploy start --test-level RunSpecifiedTests` in CI.

## Success criteria

- SC-1: Every (profile × in-platform surface) Apex cell for a PTSF-internal profile returns zero `Medical_History__c` rows.
- SC-2: No surface returns an error that discloses record existence or field names.
- SC-3: The break-glass grant for a Compliance Officer writes an `Audit_Log__c` row in the same transaction as the first read; a read without the paired log is a test failure.
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
