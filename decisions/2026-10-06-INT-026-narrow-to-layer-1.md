---
date: 2026-10-06
intents: [INT-026, INT-027]
---

# Narrow INT-026 to Layer 1; split Layer 2 (off-platform APIs + CI matrix) into INT-027

## Context

INT-026 was scoped as a two-layer PHI denial-path proof: Layer 1 Apex `System.runAs` tests across 8 in-platform surfaces × 5 profiles, and Layer 2 Node + jsforce + JWT bearer across 5 off-platform API surfaces × 5 profiles, with a dedicated `phi-blockout-matrix.yml` + `phi-blockout-nightly.yml` CI pair.

Layer 1 landed on `develop` through commit `e82561f` (PR #5) + ratification/design-Q resolution through `0aad6a2` (PR #6). Layer 2 was built on `feature/INT-026-layer-2-matrix` at `f34f1f1` but did not merge — the first attempt's workflow run failed, and the branch has external gates that cannot be moved from the agent side:

1. PTSF IT must provision 13 GitHub Actions secrets (`SF_DEVHUB_AUTH_URL`, `SF_SANDBOX_AUTH_URL`, `SF_PHI_MATRIX_CLIENT_ID`, 5 × `SF_JWT_KEY_<PROFILE>`, 5 × `SF_JWT_USER_<PROFILE>`).
2. PTSF IT must create the `PHI_Blockout_Matrix_CI` Connected App with pre-authorized users per profile and attach six signing certificates (per `decisions/2026-10-06-INT-026-design-q-resolution.md`).
3. Compliance Officer must sign the first green matrix report; second developer must run the local orchestrator against the build sandbox.

Holding INT-026 🔧 In progress until all three external dependencies clear would stall the acceptance evidence for a security-critical, in-platform promise that is already provable today.

## Decision

- INT-026 narrows to the in-platform (Layer-1) denial-path proof only. Scope hash moves. The prior `ratified: 2026-10-06 by Prashant Kumar @ 8e4386d466b8` stamp is stale and was removed from the intent frontmatter — re-ratify on the narrowed scope before `deliver`.
- INT-027 is captured as the Layer-2 follow-on: off-platform API surfaces (REST / SOAP / Tooling / Weekly Export / Data Loader), the `PHI_Blockout_Matrix_CI` Connected App, the dedicated `phi-blockout-matrix.yml` + `phi-blockout-nightly.yml` workflows, and the merged Layer-1 + Layer-2 matrix CSV + Markdown report with the 90-day nightly retention.
- The Layer-2 code on `feature/INT-026-layer-2-matrix` at `f34f1f1` is preserved (not merged, not deleted) — it will land under INT-027 once the external dependencies clear.
- `coverage` and `conformance` continue to treat INT-026 as the half-of-INT-004-evidence it is; INT-027's grounding links to this record so the full picture stays traceable.

## Consequences

- INT-026 is deliverable today once the Layer-1 Apex suite is CI-confirmed green on a PR touching the suite (C1–C5 flip from `_pending CI confirmation_` to a named `Class.method / <date> / pass — PR #<n>`). C6 (Compliance Officer sign-off) and C7 (second developer local run) remain 👁 awaiting sign-off — surfaced, never gated.
- INT-004's test-script C5 ("Restriction Rule blocks internal profiles") graduates in two steps now: a half-signature from INT-026 on first green CI, a full signature once INT-027 also lands green.
- The YAML parse error reported on `feature-ci_pr-validation.yml` line 160 col 14 — latent on `develop` since the engagement bootstrap (`35faf95`) and not caused by any INT-026 work — remains open. It is captured as a separate operational concern for `/ql-capture-intent` and is not blocking INT-026's narrowed scope. Flag to Trusted Guide.
- INT-027 inherits the design question OIDC migration (deferred `Q-design-026-2`) and the IT-provisioning external dependencies; the resolution record `decisions/2026-10-06-INT-026-design-q-resolution.md` continues to apply.
