---
id: INT-026
phase: 1
epic: E09
confidence: draft
origin: local
title: PTSF-internal PHI blockout — provable denial path on Medical_History__c
---

# INT-026 — PTSF-internal PHI blockout — provable denial path on Medical_History__c

## Outcome

The "PTSF internal users cannot see medical history" promise is proved by test, under every surface a user could reach the data from, so INT-004's Restriction Rule is backed by evidence instead of trust in the config.

## Build target

- An automated denial-path test suite exercising every surface a PTSF internal user could use to reach `Medical_History__c`: record page, related list, list view, report (standard and custom), dashboard, API query (REST + SOAP + Tooling), data export (Weekly / Dataloader), ContentDocument search, SOSL global search
- One test per profile in scope: System Administrator (with View All), Assessor, Team Manager, Regional Ops, read-only clones
- A CI job that runs the suite on every change touching INT-004's metadata (sharing settings, Restriction Rules, permission sets, affected profiles)
- Break-glass path tested too: a Compliance Officer with the `PHI Emergency Access` permission set CAN see the record, the `Audit_Log__c` write is in the same transaction, and the grant is time-bound
- A pass/fail per surface x per profile matrix report, published to the compliance evidence folder
- A denial-path failure blocks the build — the test IS the acceptance evidence, not a nice-to-have

## Guardrails

- Must not weaken INT-004's model to make the test easier — if a surface leaks, INT-004 is wrong and must be fixed
- Must not grant the test runner any permission production users don't have — each test runs as the actual profile under test
- Must not log PHI into the test report — pass/fail only, never record samples

## Out of scope

- Must not test Shield encryption key management — separate control, separate evidence
- Must not test practitioner access during an open assignment — INT-004's positive path already proves it

## Acceptance

The denial-path matrix runs green: for every (profile x surface) cell where the profile is a PTSF internal, `Medical_History__c` is unreachable — 0 rows returned, no error disclosure, no sideways leak via related lists or SOSL. For the Compliance Officer with the break-glass permission set, the record IS reachable AND an `Audit_Log__c` row is confirmed written in the same transaction. The matrix is signed by the Compliance Officer and attached to INT-004 as its delivered-security evidence.

## Success criteria

- SC-1: Every (profile x surface) cell for a PTSF-internal profile returns zero `Medical_History__c` rows.
- SC-2: No surface returns an error that discloses record existence or field names (no "insufficient privileges" with a record id, no 404 that leaks).
- SC-3: The break-glass grant for a Compliance Officer writes an `Audit_Log__c` row in the same transaction as the first read; a read without the paired log is a test failure.
- SC-4: CI fails the build when any INT-004 metadata change breaks any denial-path cell.

## Dependencies

### Internal
- INT-004 — the security model this intent proves

### External
_none_

## Open questions

- Q-026-1: Which non-production profiles need the same denial-path proof — only Full Sandbox, or Partial / Developer Pro too? CI cost vs. coverage. (resolver: PTSF Compliance Officer + Technical Architect)
- Q-026-2: Does the break-glass test need to prove the grant *expires* (time-bound)? If yes, this intent owns the time-bound mechanism's test; INT-004 owns the mechanism itself. (resolver: PTSF Compliance Officer)

## Grounding

- INT-004 (✅ Delivered) implemented Private OWD + Apex-managed sharing + Restriction Rules + the break-glass permission set. INT-004's acceptance walked the positive path and the SysAdmin-blocked path, but did not establish a repeatable multi-surface denial matrix. This intent closes that gap.
