---
intent: INT-026
scope_hash: 8e4386d466b8
authored: 2026-10-06
---

# INT-026 — Design

**Intent:** PTSF-internal PHI blockout — provable denial path on Medical_History__c
**Source intent:** `intents/INT-026/intent.md`

## Approach

This intent builds a **test harness**, not a feature. The deliverable is an executable denial-path matrix: for every (profile × surface) cell, Medical_History__c is unreachable to PTSF-internal users; for the Compliance Officer with the `PHI Emergency Access` PS, it is reachable AND an `Audit_Log__c` row is written in the same transaction. The matrix runs in CI on every change to INT-004's metadata.

## Harness architecture

Two layers, one orchestrator:

- **Layer 1 — Apex test classes (in-platform surfaces).** Record-page / related-list / list view / standard+custom report / dashboard / SOSL / ContentDocument search are all queryable from Apex `System.runAs(user)` blocks. One test class per surface, parameterized over the profile list; each cell asserts zero rows returned AND no exception that discloses record existence.
- **Layer 2 — External Node test runner (off-platform surfaces).** REST / SOAP / Tooling API / Weekly Export / Data Loader API cannot be exercised from Apex; they run as a Node suite using `jsforce` with per-profile JWT auth. Each cell asserts the API response is zero-rows / `INSUFFICIENT_ACCESS` without id disclosure.
- **Orchestrator — `scripts/phi-blockout-matrix.mjs`.** Invokes Layer 1 via `sf apex run --test`, Layer 2 via `node`, aggregates the two reports into one pass/fail-per-cell matrix (CSV + Markdown), emits non-zero exit on any cell failure. The matrix report is the acceptance evidence.

## Profiles under test

Sourced from INT-005's role/profile model. Fixtures seed one test user per profile; permission assignments are declarative (PermSetAssignment metadata, not DML in test setup):

- System Administrator (with "View All Data" — the hardest case; must still be blocked by Restriction Rule)
- Assessor
- Team Manager
- Regional Ops Manager
- Standard User (read-only clone baseline)
- Compliance Officer **with** `PHI Emergency Access` PS (positive-path cell — must succeed + log)

Q-026-1 governs whether non-prod-only profiles (Partial / Developer Pro sandbox templates) get the same coverage; default here is Full Sandbox + prod profile list.

## Break-glass same-transaction assertion

The Compliance Officer cell is distinct from the deny cells. The test:

1. Assigns `PHI Emergency Access` via the sanctioned `Assign_Break_Glass_PS` Flow (INT-004 design.md §Automation) with a Reason input.
2. Queries one `Medical_History__c` row as the Compliance Officer.
3. In the **same test method** (which is one transaction), queries `Audit_Log__c WHERE Action__c = 'Break_Glass_Grant' AND User__c = :complianceOfficerId AND Timestamp__c >= :testStart` and asserts exactly one row.
4. The read-without-paired-log case is a test failure.

Same-transaction is enforced by not committing between steps (Apex test methods run in one transaction by default; `Test.startTest()/stopTest()` bounds async). The audit insert is the `AuditPermissionSetAssignmentTrigger` writing in the PSA DML's transaction — INT-004 owns this trigger; this test proves it.

**Q-026-2 scope.** If the test must also prove *time-bounded expiry* of the grant, this harness owns the clock-advance test (System.setMockDate or an explicit `Expires_At__c` field read on PSA); INT-004 owns the mechanism. Default: the harness proves the write; expiry stays with INT-004 unless Q-026-2 lands here.

## CI integration

- **Trigger (path filter on `feature-ci_pr-validation.yml` and `feature-ci_deploy.yml`):** any change under `force-app/main/default/{objects/Medical_History__c,restrictionRules,permissionsets/PHI_Emergency_Access,sharingRules,profiles}/**` runs the matrix as a required check.
- **Job:** `phi-blockout-matrix` — spins up a scratch org from `config/project-scratch-def.json` + a `scratch-org-with-phi.json` variant that enables Shield + Restriction Rules, deploys the metadata, seeds the profile users, runs the orchestrator, uploads the matrix report as a workflow artifact, fails the build on any red cell.
- **Local dev loop:** `npm run phi-blockout-matrix -- --org <alias>` runs the same orchestrator against a long-lived build sandbox so the suite is debuggable without CI round-trips.

## Reporting

- `delivery/compliance-evidence/phi-blockout-matrix-<timestamp>.{csv,md}` — one row per (profile × surface), columns: expected, actual, outcome, evidence pointer (test method FQN or jsforce request id). Pass/fail only — the suite **must not log PHI samples** (guardrail).
- The Compliance Officer signs the latest green matrix; the signed PDF is attached to **INT-004's** delivered-security evidence (acceptance clause).

## Alternatives considered

- **Robot Framework / Selenium end-to-end for UI surfaces.** Rejected: fragile for record-page / related-list cells, slow in CI, and the real question is data visibility (Apex `runAs` + direct report-query API is the sharper test). UI remains covered by the report-query path (what the UI *could* render).
- **Pen-test engagement only.** Rejected: not repeatable per-deploy. A pen test is a point-in-time attestation; the matrix is a regression gate.
- **Permission-set audit metadata diff only** (compare PS to a golden file). Rejected: proves the config is unchanged, not that the config *denies*. The platform is the thing under test, not the metadata file.
- **A single Apex "mega-test" that iterates (profile × surface).** Rejected: a single failure masks the rest; one test per surface keeps the matrix green/red addressable.

## Cascading consequences

- The sanctioned break-glass assignment path (INT-004's `Assign_Break_Glass_PS` Flow) is a test prerequisite — this harness proves it works, so a regression on INT-004's trigger surfaces here first. INT-004's `drift` stamp will need `reverify` if the Flow shape changes materially (expected handoff).
- Test users seeded per profile must have **FLS off** on Medical_History__c fields by default — the harness fixture must not grant any extra permission the real user wouldn't have (guardrail).
- The matrix report under `delivery/compliance-evidence/` is a repo-tracked artifact and will accrete per run; add a `.gitignore` rule or rotate — keep only the latest signed one plus the current CI run's.

## Architecture conformance

Not applicable — commercial engagement, no inherited premises in `scopezilla/decisions/`.

## Neighboring & future scope

- **BUILT ON:** INT-004 (the subject under test — OWD, Restriction Rule, PHI PS, audit trigger, break-glass Flow). INT-005 (profile/role list the matrix enumerates).
- **BUILDS ON THIS:** any future intent that touches PHI access (regional-override, practitioner temporary share from INT-019) will add rows to this matrix rather than build its own harness. The orchestrator takes the profile list from a config file so adding a row is config, not code.
- **Existing org (brownfield):** INT-004 is delivered into the sandbox; this intent consumes it. `⚠ org not consulted` for the test-harness scaffolding itself (new scripts under `scripts/` + a new workflow job) — nothing pre-exists to collide with.

## Build sequence

1. Author `scripts/phi-blockout-matrix.mjs` orchestrator + profile config (`config/phi-blockout-profiles.json`).
2. Author Layer 1 Apex test classes (one per in-platform surface) under `force-app/main/default/classes/phi-blockout/`.
3. Author Layer 2 Node runner (`scripts/phi-blockout-api-cells.mjs`) with jsforce + JWT auth per profile.
4. Wire CI job in `.github/workflows/feature-ci_pr-validation.yml` with the metadata path filter.
5. First green matrix → sign-off from Compliance Officer → attached to INT-004 as its security evidence.

## Open design questions

- **Q-design-026-1:** Scratch-org vs. long-lived sandbox for CI runs. Scratch org = clean per run, slower (~15 min spin-up). Sandbox = fast, but drift risk if a prior test left state. Default: scratch org for `pr-validation`, sandbox for the nightly rerun. (resolver: Technical Architect)
- **Q-design-026-2:** JWT auth per profile needs one Connected App or one per profile. One Connected App with per-profile certificates is cleaner; needs a secret-storage decision for CI (GitHub OIDC → SF JWT exchange). (resolver: PTSF IT + Technical Architect)
