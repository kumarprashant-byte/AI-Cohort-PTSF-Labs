<!-- Un-committed ideas, NOT Intent. This is a pre-capture inbox: park a raw idea here in
     seconds so it isn't lost, and come back later. Nothing here is scope — it has no ID, no
     ledger row, no scope hash, and CI never touches it (the intent ledger only walks
     INT-NNN/ dirs, so this file is invisible to `validate`, `drift`, and coverage).

     One idea per line, freeform:  - <one-line idea> — <source, if known>
     Source is best-effort (whoever/whenever it came up); leave it blank rather than hunt for it.
     No status, no priority, no owner, no table — keep it a flat list on purpose.

     Graduate a line into real Intent with `/ql-capture-intent` (it reads this file, classifies each
     line against existing intents, drafts the keepers as `draft` intents seeding the decision
     record from the source note here, and deletes the graduated line). Add lines by hand, or let
     `/ql-capture-intent` park candidates here when you paste notes but aren't ready to commit them. -->

# Backlog — un-committed ideas

_Pre-Intent inbox. Park ideas here fast; graduate them into living Intent via `/ql-capture-intent`._

- Fix YAML parse error on `.github/workflows/feature-ci_pr-validation.yml` line 160 col 14 ("An expression was expected") — latent on develop since engagement bootstrap commit `35faf95`; blocks the PR-validation workflow from running at all when it is actually exercised — from 2026-10-06 INT-026 Layer-2 CI run
- Add two-speed gate to `.github/workflows/feature-deploy` (push-trigger) so an intent-only push doesn't fail on `Missing required secret: SFDX_URL`; mirror the `steps.changes.outputs.deploy` pattern already in `feature-ci_pr-validation.yml` — from 2026-10-06 INT-026 scope-branch push
- Provision the 13 GitHub Actions secrets INT-027 needs (`SF_DEVHUB_AUTH_URL`, `SF_SANDBOX_AUTH_URL`, `SF_PHI_MATRIX_CLIENT_ID`, 5 × `SF_JWT_KEY_<PROFILE>`, 5 × `SF_JWT_USER_<PROFILE>`) — owned by PTSF IT; INT-027 blocks on this
