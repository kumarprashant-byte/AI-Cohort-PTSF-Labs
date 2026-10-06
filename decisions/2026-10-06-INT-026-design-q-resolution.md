# INT-026 — Resolve Q-design-026-1 (CI org strategy) and Q-design-026-2 (JWT auth shape)

**Date:** 2026-10-06 · **Deciders:** Prashant Kumar (acting Technical Architect + PTSF IT delegate for this engagement)

## Context

INT-026's design (`intents/INT-026/design.md`) left two Qs open that gate the Layer-2 Node API runner and the dedicated `phi-blockout-matrix` CI job:

- **Q-design-026-1** — Scratch org vs long-lived sandbox for CI runs of the matrix. Scratch gives clean per-run state (~15 min spin-up); sandbox is fast but risks drift from prior test state.
- **Q-design-026-2** — JWT auth shape for per-profile API calls: one Connected App or one per profile. And where secrets live (GitHub repo secrets vs OIDC → SF JWT exchange).

Both must be settled before Layer-2 cells graduate from `unproven` to real evidence.

## Options weighed

**Q-design-026-1:**
- (a) Scratch per PR, no nightly rerun — slowest feedback; cleanest state.
- (b) Long-lived sandbox for PR + nightly — fast; drift risk.
- (c) **Scratch for PR validation + sandbox for a nightly full matrix** — PR gets a clean-state proof; the nightly catches sandbox drift and provides a persistent evidence file the Compliance Officer signs.

**Q-design-026-2:**
- (a) One Connected App per profile — isolates certificates, 6× setup burden; a profile rename breaks only one app.
- (b) **One Connected App with per-profile pre-authorized users**, JWT bearer flow, per-profile certs loaded by the runner — fewer moving parts, standard Salesforce pattern.
- (c) GitHub OIDC → Salesforce JWT exchange — removes long-lived secrets, requires the OIDC trust configured on an SF Connected App, less documented path.

## Choice

**Q-design-026-1 → option (c): scratch for PR, sandbox for nightly.** `feature-ci_pr-validation.yml` already deploys to a scratch org for validation; the matrix job reuses that scratch. A separate `.github/workflows/phi-blockout-nightly.yml` runs the full matrix against the long-lived `PTSF Build Sandbox` at 02:00 UTC and uploads the signed evidence file. If scratch and sandbox disagree, that disagreement is itself a signal — flagged as a matrix anomaly.

**Q-design-026-2 → option (b) + GitHub repo secrets for now, with (c) as the roadmap.** One Connected App `PHI_Blockout_Matrix_CI` with pre-authorized users for each profile under test. Six per-profile certs stored as GitHub Actions secrets (`SF_JWT_KEY_SYSADMIN`, `SF_JWT_KEY_ASSESSOR`, `SF_JWT_KEY_TEAMMGR`, `SF_JWT_KEY_REGOPS`, `SF_JWT_KEY_STDUSER`, `SF_JWT_KEY_COMPLIANCE`). Runner reads the per-profile cert at auth time via `jsforce`. The OIDC migration (option c) is a follow-on intent once the pattern is proven.

## Consequences

- `intents/INT-026/design.md` is edited to record both resolutions inline (the Qs section drops those two entries). Not a scope change — hashed scope fields untouched; design-level only.
- Layer-2 Node runner (`scripts/phi-blockout-api-cells.mjs`) is unblocked. Next build increment: real jsforce JWT auth + REST/SOAP/Tooling/Export cell implementations.
- Dedicated CI jobs become drafter-ready: a `phi-blockout-matrix` job wired into `feature-ci_pr-validation.yml` (scratch target) and a new `phi-blockout-nightly.yml` (sandbox target).
- PTSF IT owes the Connected App metadata + six per-profile certs to the repo's `.github/secrets` configuration before the first green Layer-2 run. Flagged as an external dependency on INT-026.
- The OIDC migration will later be its own intent — flagged for the backlog so the trust-chain evolution is tracked rather than silently done.
