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
- Enable org-level "Enable Set Audit Fields upon Record Creation and Update Records with Inactive Owners User Permissions" in ptsf orgfarm (Setup → User Interface — must be done via Setup UI, not metadata deploy); then assign `SetAuditFields` user permission to `PTSF_Admin_Fls_Overrides` so seed/backdate scripts can set `CreatedDate` — INT-012 Scene A blocks on this — from 2026-10-06 INT-012 manual walk
- ~~Seed `Treatment_Type__c` records (Oncology, Cardiology, Orthopaedic, General) + a lineage of Subsidy Application → Assignment → Assessment in ptsf orgfarm~~ — **done 2026-10-06** (4 TT rows, 1 lineage: Assessment `a07oB000001WKiz`). Backdating still blocks on the audit-fields toggle above
- Attempt UserInterfaceSettings metadata deploy (`enableSetAuditFieldsUponCreation=true`) to unblock INT-012 Scene A backdate — flagged as a shared-config change requiring human approval before deploy — from 2026-10-06
- Provision an Experience Cloud community site in ptsf orgfarm and create practitioner community user `apac.practitioner@ptsf.test.invalid` with `Practitioner_Access` PSG — INT-011 Scene A blocks on this — from 2026-10-06 INT-011 manual walk
