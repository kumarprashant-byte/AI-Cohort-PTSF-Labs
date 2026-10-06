---
id: INT-027
phase: 1
epic: E09
confidence: draft
origin: local
title: PHI blockout Layer 2 — off-platform APIs + CI matrix
---

# INT-027 — PHI blockout Layer 2 — off-platform APIs + CI matrix

## Outcome

The Medical_History__c denial-path proof extends from in-platform surfaces (INT-026) to the off-platform API surface a client or script could reach the data from — REST, SOAP, Tooling, Weekly Export, Data Loader — so the "PTSF internal users cannot see medical history" promise holds across every integration path, not only the UI.

## Build target

- A Node runner (jsforce + JWT bearer flow) that queries `Medical_History__c` as each PTSF-internal profile against five off-platform API surfaces (REST query, SOAP query, Tooling API, Weekly Export, Data Loader bulk API)
- A single Connected App `PHI_Blockout_Matrix_CI` with pre-authorized users per profile, six per-profile signing certificates stored as GitHub Actions secrets (per `decisions/2026-10-06-INT-026-design-q-resolution.md`)
- GitHub Actions workflows: `phi-blockout-matrix.yml` (per-PR, scratch-org, path-filtered on INT-004 metadata) and `phi-blockout-nightly.yml` (sandbox, 90-day retention)
- An orchestrator that merges Layer 1 (INT-026) and Layer 2 cells into one CSV + Markdown matrix report in `delivery/compliance-evidence/`, failing the build on any red cell
- Opaque-denial assertion: an API cell is green only when the response is a zero-row result or an error payload that leaks no record id, no field name, no sObjectType

## Guardrails

- Must not weaken INT-004's model or INT-026's Layer 1 to make the API test easier
- Must not log PHI into the test report — pass/fail only, never record samples (same guardrail as INT-026)
- Must not use a bypass/integration profile for the test runners — each cell runs as a real PTSF-internal profile holder
- Secrets stay in GitHub Actions `env:` (data), never inline `${{ }}` in `run:` (prevents shell interpolation of credentials)

## Out of scope

- Must not test OIDC federated-credentials migration — captured as a separate follow-on from `decisions/2026-10-06-INT-026-design-q-resolution.md`
- Must not test Shield encryption key management
- Must not re-run or re-prove INT-026's Layer 1 (in-platform surfaces) — this intent composes with it

## Acceptance

For every PTSF-internal profile × off-platform API surface cell (5 × 5 = 25 cells), a `Medical_History__c` query returns zero rows or an opaque `INSUFFICIENT_ACCESS` error. The PR workflow runs the full matrix against a scratch org on every change touching INT-004 metadata; the nightly workflow runs against the long-lived build sandbox. The CSV + Markdown report is produced per run, retains 90 days nightly, and is signed by the Compliance Officer before it stands as evidence.

## Success criteria

- SC-1: Every (profile × off-platform API surface) cell for a PTSF-internal profile returns zero `Medical_History__c` rows.
- SC-2: No API cell returns an error that discloses a record id (15/18-char), field API name, or sObjectType.
- SC-3: The CI job fails the build when any INT-004 or INT-026 metadata change breaks any Layer 2 cell.
- SC-4: The nightly run against the build sandbox produces the same report shape as the PR run for the same commit.

## Dependencies

### Internal
- INT-004 — the security model under test
- INT-026 — Layer 1 (in-platform surfaces); this intent composes with its orchestrator and shared factory

### External
- PTSF IT | provision 13 GitHub Actions secrets (`SF_DEVHUB_AUTH_URL`, `SF_SANDBOX_AUTH_URL`, `SF_PHI_MATRIX_CLIENT_ID`, 5 × `SF_JWT_KEY_<PROFILE>`, 5 × `SF_JWT_USER_<PROFILE>`) | owner: PTSF IT
- PTSF IT | create the `PHI_Blockout_Matrix_CI` Connected App with pre-authorized users per profile and attach six signing certificates | owner: PTSF IT
- PTSF Compliance Officer | sign the first green matrix report | owner: PTSF Compliance

## Open questions

- Q-027-1: Migrate the JWT-bearer flow to GitHub OIDC federated credentials once the baseline is green? (deferred from `Q-design-026-2`; resolver: PTSF IT + Security)

## Grounding

- INT-026 (🔧 In progress, narrowed to Layer 1 per `decisions/2026-10-06-INT-026-narrow-to-layer-1.md`) carries the in-platform denial-path proof. The Layer-2 harness code and workflows live on `feature/INT-026-layer-2-matrix` at `f34f1f1` and move to this intent on first build.
