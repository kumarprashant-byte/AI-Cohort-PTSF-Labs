---
name: ql-resync
disable-model-invocation: true
description: Re-pull the latest plugin-authored content into this engagement repo — engine scripts, the AGENTS.md managed region, and (opt-in) scaffold files — diffed and re-copied only where you approve.
produces: Refreshed plugin-owned content in the repo — engine scripts, the AGENTS.md managed region, and (opt-in) scaffold files — only where you approve, plus a `.claude/.launchpad.json` marker. Never touches engagement notes; no commit.
---

# Resync — pull the latest from the plugin

You are refreshing this engagement repo against the current `quantum-leap-launchpad` plugin. The plugin is the upstream source of truth for everything it authored; this skill reconciles the engagement repo's copies against it, item by item, and re-copies only the plugin-owned parts you approve. This is the supported channel for getting updates after `/ql-init-engagement` has already run.

**This skill lives in the plugin and is *not* snapshotted into engagement repos.** Its whole job is to copy *from* the plugin *into* the repo, so it can only run when the plugin is installed and active — a snapshotted copy would either be unable to run (no source) or be a stale copy doing the job of de-staling everything else. So like `init-engagement`, `docs`, and `ship`, it stays plugin-only. (If you reached this skill, the plugin is installed — good.)

## What resync reconciles — three source→destination roots

| What | Plugin source | Engagement destination | Reconcile mode |
|---|---|---|---|
| Engine scripts | `${CLAUDE_PLUGIN_ROOT}/templates/scripts/<file>` | `./scripts/<file>` | whole-file |
| `AGENTS.md` managed region | `${CLAUDE_PLUGIN_ROOT}/templates/AGENTS.md` (the `LAUNCHPAD:MANAGED` region) | `./AGENTS.md` (same markers; migrated from `./CLAUDE.md` if that's where it still lives) | **region-only** (preserves everything outside the markers) |
| Scaffold templates (opt-in) | `${CLAUDE_PLUGIN_ROOT}/templates/<path>` | `./<path>` | whole-file |

**Skills are deliberately NOT in this table.** The `ql-*` operating skills are **vendored** into `.claude/skills/` (see the plugin's `decisions/0012`), but they're kept current by **`npx skills update`** — the belt (plugin SessionStart nudge) and suspenders (scheduled CI PR) paths — not by `/ql-resync`. The two mechanisms stay cleanly separate: **skills → the skills tool; committed content → `/ql-resync`.** `/ql-resync` must **never** move, delete, or overwrite the vendored `ql-*` skills or `skills-lock.json`. (It *does* offer to clean up a *legacy* pre-`ql-` snapshot — bare-named dirs + `.snapshot.json` — from repos seeded under the old model; that's a different, retired artifact — see Step 2b.) What `/ql-resync` keeps current is the plugin-authored **content** that genuinely lives in the repo because it runs without a Claude session (CI/hooks) or is loaded as project memory.

**Why each matters:**

- **Engine scripts** — some conventions are inert without a helper script `/ql-init-engagement` laid down once (`scripts/intent-ledger.mjs` drives the intent-ledger convention + CI; `scripts/check-fls.mjs` drives the FLS guard; `scripts/check-plugin-installed.mjs` is the SessionStart nudge that reminds teammates to install the plugin). These run on bare `node` with no Claude session, so they must be committed — and a repo seeded before one existed has the convention but no engine, and it silently fails to run.
- **`AGENTS.md` managed region** — the build ethos and working conventions live between `<!-- LAUNCHPAD:MANAGED:BEGIN -->` and `<!-- LAUNCHPAD:MANAGED:END -->` in `AGENTS.md` (canonical since `decisions/0026`; `CLAUDE.md` is just `@AGENTS.md`). These evolve upstream, and an engagement repo that never refreshes them slowly drifts from how the practice wants the agent building. Resyncing rewrites *only* that region — the H1, the `ENGAGEMENT` block (owned by `/ql-ingest-scopezilla`), and the "Engagement notes" section are outside it and are never touched. A repo seeded **before** `0026` still carries the region in `CLAUDE.md`; the first resync **migrates** it to `AGENTS.md` (Step 3c) and leaves `CLAUDE.md` as the `@AGENTS.md` pointer.
- **Scaffold templates (opt-in)** — the PR template, CI workflows, `.claude/settings.json`, `delivery/build-notes.md`, and `delivery/deploy-runbook.md` ship verbatim and also improve upstream. These are **off by default** in the confirm step: they're lower-churn and an engagement is more likely to have locally tuned a workflow or settings file, so the user opts in per item rather than getting them swept along.

## Step 1 — Read the resync marker (optional)

Read `./.claude/.launchpad.json` if it exists — a lightweight marker `/ql-resync` writes to record `{ plugin_version, last_resync_date, previous_version }`. It is **not required**: unlike the old model, `/ql-resync` no longer keys off a snapshot file, so its absence is fine (a repo seeded under the new model, or never resynced, simply has no marker yet). Use it only for the "you were on X, plugin is now Y" line in the summary.

> **Legacy note.** Older repos instead have `./.claude/skills/.snapshot.json` (with a `snapshot_skills` array). That's the old snapshot model. If you find it, read its `plugin_version` for the summary, but treat it as legacy — Step 2b offers to remove it and replace it with the lightweight marker.

## Step 2 — Locate the plugin source

The plugin root is `${CLAUDE_PLUGIN_ROOT}`. Verify `${CLAUDE_PLUGIN_ROOT}/templates/` exists. If `${CLAUDE_PLUGIN_ROOT}` is unset or missing, abort:

> Plugin source not found. Make sure the `quantum-leap-launchpad` plugin is installed and active in this Claude Code session. (`/ql-resync` runs from the plugin — it isn't snapshotted into the repo.)

Read `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` for the current plugin version. Best-effort: capture the source commit SHA via `git -C "${CLAUDE_PLUGIN_ROOT}" rev-parse HEAD` (leave `null` if not a checkout).

## Step 2b — Detect & offer to remove a *legacy* skill snapshot (never the vendored skills)

Two very different things can live in `./.claude/skills/`, and telling them apart is critical — removing the wrong one deletes the engagement's working skills:

- **Vendored skills (current model — LEAVE ALONE).** `ql-`-prefixed dirs (`ql-setup`, `ql-check-scope`, …) alongside a `./skills-lock.json`. These are the operating skills, committed into the repo on purpose (`decisions/0012`). They are updated by `npx skills update`, **not** by `/ql-resync`. Do **not** move, delete, or reconcile them here. This is the normal, healthy state — say nothing about it.
- **Legacy snapshot (retired model — offer to remove).** *Bare-named* dirs (`setup`, `check-scope`, … with **no** `ql-` prefix) and/or a `./.claude/skills/.snapshot.json` with a `snapshot_skills` array. This is the pre-`ql-` hand-copied mirror. Its bare names now collide with the vendored `ql-*` set is *not* the issue (names differ) — rather, they're stale duplicates under old names that no longer route to anything, and the `.snapshot.json` misleads tooling. Offer to clear them.

**Detection (must be precise):** a legacy snapshot is present iff `./.claude/skills/.snapshot.json` exists **OR** `./.claude/skills/` contains a *bare* (non-`ql-`-prefixed) launchpad skill dir (`setup`, `ingest-scopezilla`, `check-scope`, `test-script`, `sync-jira`, `contribute-to-launchpad`, `resync-skills`). The presence of `ql-*` dirs is **not** a legacy signal — those are the vendored skills and are expected.

If (and only if) a legacy snapshot is detected, explain it and **offer to remove it** (don't force):

> This repo has a *legacy* skill snapshot in `.claude/skills/` (bare-named dirs / `.snapshot.json` from a pre-`ql-` seeding). The current model vendors the `ql-*` skills instead. I can remove just the legacy bits: the bare-named launchpad skill dirs + `.snapshot.json`, and the old `check-skills-freshness.mjs` hook if present. Your vendored `ql-*` skills and any engagement-authored skills stay untouched. If no vendored `ql-*` skills are present yet, Step 2c will offer to vendor them (`npx skills add`) so the repo isn't left with no operating skills.

On approval, move-aside-remove (never `rm -rf`): only the **bare-named** launchpad skill dirs + `.snapshot.json` from `./.claude/skills/`, plus a stale `./scripts/check-skills-freshness.mjs` if present. **Never remove a `ql-*` dir** (that's a vendored skill) and **leave any engagement-authored skills** alone (e.g. a `sprint-retro/` the team promoted locally). If removing `check-skills-freshness.mjs`, note that `check-plugin-installed.mjs` (Step 3d) replaces it and the `.claude/settings.json` SessionStart wiring should point at the new name.

```bash
TRASH=/tmp/quantum-leap-resync-trash/$(date +%s)
mkdir -p "$TRASH/legacy-skills"
# ONLY bare-named (pre-ql-) launchpad skill dirs — never a ql-* vendored skill.
for skill in setup ingest-scopezilla check-scope test-script sync-jira contribute-to-launchpad resync-skills; do
  [ -e "./.claude/skills/$skill" ] && mv "./.claude/skills/$skill" "$TRASH/legacy-skills/$skill"
done
[ -e "./.claude/skills/.snapshot.json" ] && mv "./.claude/skills/.snapshot.json" "$TRASH/legacy-skills/.snapshot.json"
[ -e "./scripts/check-skills-freshness.mjs" ] && mv "./scripts/check-skills-freshness.mjs" "$TRASH/check-skills-freshness.mjs"
```

(`resync-skills` is in the loop because the oldest snapshots carried that now-renamed skill.) The loop lists only bare names, so a `ql-*` dir can never match. Mention `$TRASH` in the summary.

## Step 2c — Self-heal a repo with no vendored skills (initial vendor)

The one narrow skills exception in `/ql-resync`, and it exists because pre-`decisions/0012` repos never got the vendored skills at all: their operating skills lived only in the Claude Code plugin cache, so `AGENTS.md`'s promise ("vendored at `.claude/skills/`, any harness reads them on clone") was silently false there — a non-Claude harness (Cursor, Codex, …) saw *none* of the `ql-*` skills. This is the reported gap (issue #99). Removing a legacy snapshot in Step 2b makes it worse: the repo can end up with **no** operating skills at all.

**`npx skills update` does NOT fix this** — it refreshes skills already tracked in `skills-lock.json`; with none tracked it's a no-op. The initial vendor is `npx skills **add**`.

**Detection:** `./.claude/skills/` contains **no** `ql-*`-prefixed dir **OR** there is no `./skills-lock.json`. (Either signals the skills were never vendored here.)

If detected, offer (don't force) the initial vendor — the same command `/ql-init-engagement` uses:

```bash
npx -y skills add https://git.soma.salesforce.com/dgerow/quantum-leap-launchpad.git --yes
```

This clones the plugin (system `git`, inheriting the user's git.soma creds), installs every `ql-*` skill into `./.claude/skills/` (plus any other detected harness dir — `.agents/skills/` for Cursor/Codex/opencode) symlinked to one canonical copy, and writes `./skills-lock.json` so the belt/suspenders paths can track updates from here on. Maintainer-only skills (`ship`/`docs`/`review-pr`) carry `metadata.internal: true` and are skipped.

**If `npx skills` isn't reachable** (offline / user declines), fall back to a plain recursive copy of `${CLAUDE_PLUGIN_ROOT}/skills/ql-*` into **both** `./.claude/skills/` **and** `./.agents/skills/` (so non-Claude harnesses — which read `.agents/skills/` — see them too) and note that `skills-lock.json` wasn't written, so `npx skills update` won't track them until the user re-runs `add`. Never block the resync on this. This is a one-time **bootstrap** of vendoring — ongoing refreshes still go through `npx skills update`, not `/ql-resync`.

## Step 3b — Diff each engine script

In-scope engine scripts and what needs them:

| Script | Source | Needed by |
|---|---|---|
| `scripts/intent-ledger.mjs` | `${CLAUDE_PLUGIN_ROOT}/templates/scripts/intent-ledger.mjs` | intent-ledger convention (CLAUDE.md), CI, scope-hash for `sync-jira` |
| `scripts/check-fls.mjs` | `${CLAUDE_PLUGIN_ROOT}/templates/scripts/check-fls.mjs` | FLS pre-commit guard |
| `scripts/check-plugin-installed.mjs` | `${CLAUDE_PLUGIN_ROOT}/templates/scripts/check-plugin-installed.mjs` | SessionStart "plugin installed?" nudge |
| `scripts/jira-rest.mjs` | `${CLAUDE_PLUGIN_ROOT}/templates/scripts/jira-rest.mjs` | `/ql-sync-jira` API-token transport (Jira Cloud REST v3) |
| `scripts/fix-skill-symlinks.mjs` | `${CLAUDE_PLUGIN_ROOT}/templates/scripts/fix-skill-symlinks.mjs` | `/ql-setup` Windows step — repairs vendored-skill symlinks git checked out as plain files |

For each, compare the plugin's template copy against the engagement copy:

```bash
for f in intent-ledger.mjs check-fls.mjs check-plugin-installed.mjs jira-rest.mjs fix-skill-symlinks.mjs; do
  if [ ! -f "./scripts/$f" ]; then echo "$f  MISSING locally — will seed"
  else diff "${CLAUDE_PLUGIN_ROOT}/templates/scripts/$f" "./scripts/$f" >/dev/null \
    && echo "$f  Unchanged" || echo "$f  Differs — see diff"; fi
done
```

Categorize like skills: **Unchanged**, **Plugin newer** (safe update), **Local edits** / **Both diverged** (a hand-edited engagement script — updating overwrites it; print the diff and warn), or **Missing locally** (the gap this step exists to close — seeding it is always safe).

Only reconcile scripts in the table — they're plugin-owned. Leave any other `scripts/*.mjs` (engagement-authored helpers) alone.

> **Don't touch `package.json`.** The shipped scripts run on bare `node` with no dependencies. `sf project generate` owns `package.json`, so resync stays out of it — it only reconciles the script files themselves.

## Step 3c — Migrate (if needed), then diff the `AGENTS.md` managed region

**First, the one-time `CLAUDE.md` → `AGENTS.md` migration (`decisions/0026`).** The region is now canonical in `AGENTS.md`. If this repo was seeded before that move, the region is still in `./CLAUDE.md` and there's no `./AGENTS.md` carrying it. Detect and migrate before diffing:

- **`./AGENTS.md` already has a `LAUNCHPAD:MANAGED` region** → already migrated (or seeded post-`0026`). Skip straight to the diff below, against `./AGENTS.md`.
- **Region is in `./CLAUDE.md`, not in any `./AGENTS.md`** → migrate, move-aside first (back up `./CLAUDE.md` to `$TRASH`). **The invariant: lose nothing.** By the end, the region must be in `./AGENTS.md` (so every harness reads it) and `./CLAUDE.md` must *start* with a bare `@AGENTS.md` import (so Claude Code reads it) — and no byte of the user's content is discarded.
    1. If there is **no `./AGENTS.md`**: move the entire `./CLAUDE.md` body (H1, `ENGAGEMENT` block, region, "Engagement notes", and any other prose) into a new `./AGENTS.md`, unchanged. Then `./CLAUDE.md` = `@AGENTS.md`. (The common case for a launchpad-seeded engagement.)
    2. If there **is** a `./AGENTS.md` already (their own): the goal is one canonical file with no duplication and no loss.
        - Splice the **region** into `./AGENTS.md` after its H1 (or replace an existing region there), leaving their prose outside the markers.
        - The `ENGAGEMENT` block: if `./AGENTS.md` has none, move CLAUDE.md's into it (between H1 and the region); if `./AGENTS.md` already has one, keep **AGENTS.md's** and note the CLAUDE.md copy is superseded (don't create a second).
        - "Engagement notes": if `./AGENTS.md` has no notes section, move CLAUDE.md's over; if it already has one, **append** CLAUDE.md's notes under it (merge, don't duplicate the heading).
        - **Any *other* CLAUDE.md prose you did not move** (user-authored guidance that isn't the region/ENGAGEMENT/notes): do **not** delete it — leave it in `./CLAUDE.md` *below* the `@AGENTS.md` import. When unsure whether a chunk is plugin-region or user prose, leave it in CLAUDE.md; never discard.
    3. `./CLAUDE.md` ends as: the bare `@AGENTS.md` import (un-backticked) on the first content line, optionally a comment, then any leftover user prose from step 2.
    4. Show the migration plan (which content moves where, what stays in CLAUDE.md) and confirm before writing. Then continue to the diff below, now against `./AGENTS.md`.

  (Until a repo migrates, the plugin's gate + drift hooks still read `CLAUDE.md` as a fallback, so nothing breaks in the meantime — the migration just closes the harness-portability gap.)

The build ethos + working conventions in the engagement `./AGENTS.md` live between two markers:

```
<!-- LAUNCHPAD:MANAGED:BEGIN ... -->
<!-- LAUNCHPAD:MANAGED:VERSION <x.y.z> sha256=<hex> -->
... plugin-authored ethos + conventions ...   ← "the body"
<!-- LAUNCHPAD:MANAGED:END -->
```

The `VERSION` line carries two stamps: the plugin release the region came from (human-readable) and a `sha256` of **the body** — the bytes strictly *between* the `VERSION` line and the `END` marker. The hash is the exact, cheap drift signal; the version is for the human-facing summary.

**First, compare by hash.** Compute the body hash on both sides and compare — this is exact and avoids a noisy diff when nothing changed:

```bash
managed_body_hash() {  # $1 = file containing a LAUNCHPAD:MANAGED region
  awk '/LAUNCHPAD:MANAGED:VERSION/{f=1;next} /LAUNCHPAD:MANAGED:END/{f=0} f' "$1" \
    | shasum -a 256 | cut -c1-16
}
PLUGIN_HASH=$(managed_body_hash "${CLAUDE_PLUGIN_ROOT}/templates/AGENTS.md")
LOCAL_HASH=$(managed_body_hash ./AGENTS.md)
```

If `LOCAL_HASH == PLUGIN_HASH`, the region is **Unchanged** — done, no diff needed. (Also read the `sha256=` stamp in the local marker; if it disagrees with the recomputed `LOCAL_HASH`, the region was hand-edited after it was stamped — treat as **Local edits inside the region** below, and trust the *recomputed* hash, never the stale stamp.) If the hashes differ, produce the human-readable diff for the rescue view:

```bash
sed -n '/LAUNCHPAD:MANAGED:BEGIN/,/LAUNCHPAD:MANAGED:END/p' "${CLAUDE_PLUGIN_ROOT}/templates/AGENTS.md" > /tmp/managed-region-plugin.md
sed -n '/LAUNCHPAD:MANAGED:BEGIN/,/LAUNCHPAD:MANAGED:END/p' ./AGENTS.md > /tmp/managed-region-local.md
diff /tmp/managed-region-local.md /tmp/managed-region-plugin.md
```

Categorize:

- **No markers found in *either* `AGENTS.md` or `CLAUDE.md`** (so the `0026` migration above didn't fire — there was no region to move) — this repo predates the managed-region convention entirely. This is a **one-time migration**, and it must be **wrap-in-place**, NOT insert-a-fresh-region. Do the wrap in `./AGENTS.md` (creating it if absent, and leaving `./CLAUDE.md` as/adding the `@AGENTS.md` pointer). Why: in a legacy repo the plugin-authored conventions are typically *edited in place* by the engagement — a build-notes bullet that names this engagement's actual gotchas, an extra sentence on a guard script, etc. If you insert a fresh region and leave the old prose below it, you (a) duplicate every section and (b) set a trap — the next resync sees the fresh region as "matching" and silently discards the engagement's real edits stranded in the stale prose outside it. So instead:
    1. **Identify the plugin-authored span** in the local `CLAUDE.md`: it starts at the first line *after* the `ENGAGEMENT:END` block (skip blank lines) and runs to the end of the file (or to the first clearly engagement-authored trailing section, if one exists — when unsure, include it; the next step will surface it).
    2. **Wrap that span in place, unchanged**, with the two markers. Stamp the `VERSION` line with **the repo's *current* snapshot version** (from `.snapshot.json`), *not* the plugin's version, and `sha256=` with the hash of the span you just wrapped (`managed_body_hash` on the file after wrapping). Do not alter a byte of the wrapped prose. Append an empty "## Engagement notes" section after the `END` marker if one isn't already present.
    3. Now the region exists at the old version. **Re-run the normal region diff** (Step 3c) against the plugin — it will correctly report **Plugin newer** (and, where the engagement edited the conventions, **Local edits inside the region**), print the diff, and let the user rescue their woven-in edits into "Engagement notes" before approving the swap.

    Show the user the wrap plan (which span becomes the region, stamped at which version) and confirm before writing. The wrap step never deletes or reorders prose; it only adds the two markers + the notes section.
- **Unchanged** — body hashes match (the hash check above already settled this; no diff needed).
- **Plugin newer** — hashes differ and the local body is the plugin's prose at an older version (no woven-in local edits in the diff). Safe update.
- **Local edits inside the region** — someone hand-edited between the markers (they shouldn't have — the markers say so). Print the diff and warn that resync will overwrite it; their edits belong in "Engagement notes" outside the region. Let them opt in or skip.

**Whatever you do, only ever rewrite the bytes between (and including) the two markers.** Everything outside — the H1, the `ENGAGEMENT` block, the "Engagement notes" section, any other prose the engagement added below the `END` marker — is preserved exactly.

## Step 3d — Diff the scaffold templates (opt-in)

These plugin-authored files ship verbatim (no engagement-specific tokens) and can drift from improved upstream versions:

| File | Source | Destination |
|---|---|---|
| PR template | `${CLAUDE_PLUGIN_ROOT}/templates/.github/pull_request_template.md` | `./.github/pull_request_template.md` |
| Review guidance | `${CLAUDE_PLUGIN_ROOT}/templates/REVIEW.md` | `./REVIEW.md` |
| CI: trust chain (always-on) | `${CLAUDE_PLUGIN_ROOT}/templates/.github/workflows/intent-trust-chain.yml` | `./.github/workflows/intent-trust-chain.yml` |
| CI: skills update (always-on) | `${CLAUDE_PLUGIN_ROOT}/templates/.github/workflows/skills-update.yml` | `./.github/workflows/skills-update.yml` |
| CI: validate (deploy option A) | `${CLAUDE_PLUGIN_ROOT}/templates/.github/workflows/sf-validate.yml` | `./.github/workflows/sf-validate.yml` |
| CI: deploy (deploy option A) | `${CLAUDE_PLUGIN_ROOT}/templates/.github/workflows/sf-deploy.yml` | `./.github/workflows/sf-deploy.yml` |
| Claude settings | `${CLAUDE_PLUGIN_ROOT}/templates/.claude/settings.json` | `./.claude/settings.json` |
| Prose style | `${CLAUDE_PLUGIN_ROOT}/templates/.claude/prose-style.md` | `./.claude/prose-style.md` |
| Build notes | `${CLAUDE_PLUGIN_ROOT}/templates/delivery/build-notes.md` | `./delivery/build-notes.md` |
| Deploy runbook | `${CLAUDE_PLUGIN_ROOT}/templates/delivery/deploy-runbook.md` | `./delivery/deploy-runbook.md` |
| Backlog inbox | `${CLAUDE_PLUGIN_ROOT}/templates/intents/BACKLOG.md` | `./intents/BACKLOG.md` |

Diff each (whole-file) and categorize like scripts. **`build-notes.md`, `deploy-runbook.md`, `intents/BACKLOG.md`, and `REVIEW.md` are special:** engagements *edit* them (engagement-specific gotchas / runbook steps / parked ideas / tuned review passes, nit cap, and do-not-report list), so they will almost always show as **Local edits**. Never overwrite them wholesale — if the plugin's copy has new general content the engagement is missing (e.g. an updated backlog header), surface it as "the plugin's version adds X; consider merging by hand" rather than offering a clobbering swap. If `intents/BACKLOG.md` is simply **missing** locally (an engagement seeded before it shipped), seeding the header-only file is safe — but once it has parked lines, it's append-only like the others. The PR template, workflows, and settings are safe whole-file swaps when the user opts in.

> **Migration note (repos seeded before the #57 split — see `decisions/0012`).** Older repos carry the trust-chain gates *inside* `sf-validate.yml`, and have no `intent-trust-chain.yml`. When you seed the new (deploy-only) `sf-validate.yml`, you **must** also seed `intent-trust-chain.yml` in the same pass — otherwise the trust-chain gates vanish from CI. Treat these as a **linked pair**: if the repo lacks `intent-trust-chain.yml`, seeding it is always safe (it's the always-ships gate), and flag that `sf-validate.yml`'s update is *only* safe alongside it. Also seed `skills-update.yml` if missing (the suspenders path for vendored-skill updates). If the repo uses the multi-stage `feature-*` pipeline, it may not have `sf-validate.yml`/`sf-deploy.yml` at all — that's fine; `intent-trust-chain.yml` + `skills-update.yml` still apply.

## Step 4 — Show the user and confirm

Print a combined per-item summary, grouped:

```
LEGACY SNAPSHOT (only if bare-named dirs / .snapshot.json found — NOT the vendored ql-* skills)
  .claude/skills/ (bare setup, check-scope, … + .snapshot.json)  → offer to remove (pre-ql- snapshot; vendored ql-* skills untouched)
SCRIPTS
  intent-ledger.mjs          Unchanged
  check-fls.mjs              Plugin newer
  check-plugin-installed.mjs MISSING locally — will seed
AGENTS.md MANAGED REGION
  build ethos + conventions   Plugin newer (region 0.17.0 → 0.18.0)
SCAFFOLD TEMPLATES (opt-in)
  pull_request_template.md    Plugin newer
  sf-validate.yml             Unchanged
  build-notes.md              Local edits (append-only — merge by hand)
```

If any item is in **Local edits** or **Both diverged**, print its diff verbatim and warn that resync will overwrite local changes — they should copy out anything worth keeping first.

Use `AskUserQuestion` to choose the scope. Offer:

- **Recommended: scripts + CLAUDE.md region that are behind** (the core trust/operating layer), plus removing a legacy skill snapshot if one was found, skipping anything with local edits. **If the managed region updates and `REVIEW.md` is missing locally, seed it in the same pass** — the region points reviewers at `REVIEW.md`, so a region update without the file leaves a dangling pointer (the same linked-pair logic as `intent-trust-chain.yml`). Seeding a *missing* `REVIEW.md` is always safe; an *existing* (tuned) one is never touched here.
- **Everything that's behind, including opt-in scaffold templates** (still skipping append-only files and local-edit items unless separately confirmed).
- **Let me pick per item.**
- **Abort.**

Default the scaffold templates to *off* unless the user chose "everything" or picked them explicitly. Edit-in-place files (`build-notes.md`, `deploy-runbook.md`, `intents/BACKLOG.md`, `REVIEW.md`) are never auto-swapped, even under "everything" — but a *missing* `intents/BACKLOG.md` (header-only) or `REVIEW.md` is safe to seed. **A missing `REVIEW.md` is seeded even under "Recommended" whenever the managed region updates** — the region references it, so the file must exist for the pointer to resolve (linked pair, above).

## Step 5 — Apply

Use a single trash dir for all move-asides:

```bash
TRASH=/tmp/quantum-leap-resync-trash/$(date +%s)
mkdir -p "$TRASH"
```

**Legacy skill snapshot** (if found and approved in Step 2b): move-aside the *bare-named* launchpad skill dirs + `.snapshot.json` + stale `check-skills-freshness.mjs` as shown in Step 2b. No copy-back — the current `ql-*` skills are vendored and updated by `npx skills update`, not seeded here. Never touch a `ql-*` dir.

**Scripts** (back up, then copy):

```bash
mkdir -p ./scripts
for f in <approved scripts>; do
  [ -f "./scripts/$f" ] && cp "./scripts/$f" "$TRASH/$f"
  cp "${CLAUDE_PLUGIN_ROOT}/templates/scripts/$f" "./scripts/$f"
done
```

**AGENTS.md managed region** (if approved): first apply the `CLAUDE.md`→`AGENTS.md` migration from Step 3c if it hasn't run yet (back up `./CLAUDE.md`, move/splice the region into `./AGENTS.md`, leave `./CLAUDE.md` as the `@AGENTS.md` pointer). Then back up `./AGENTS.md` to `$TRASH/AGENTS.md` and replace *only* the marker-delimited region in place, leaving every byte outside the markers untouched. Do this with a careful in-place edit (read the file, find `LAUNCHPAD:MANAGED:BEGIN` and `LAUNCHPAD:MANAGED:END`, splice the plugin's region — copied **verbatim, including its `VERSION`+`sha256` marker line** — between the surrounding content). Copying the plugin's marker verbatim is what carries the new version and hash stamp into the repo, so the next resync reads them correctly; don't recompute or hand-edit the stamp here. Verify after writing that the H1, the `ENGAGEMENT` block, and the "Engagement notes" section are all still present and unchanged. If the local file had no markers, insert the region after the H1 / `ENGAGEMENT` block as described in Step 3c instead of replacing.

**Scaffold templates** (if approved, whole-file, back up then copy):

```bash
for path in <approved template paths>; do
  mkdir -p "$(dirname "./$path")"
  [ -f "./$path" ] && cp "./$path" "$TRASH/$(echo "$path" | tr / _)"
  cp "${CLAUDE_PLUGIN_ROOT}/templates/$path" "./$path"
done
```

The Claude Code sandbox blocks `rm -rf` and `rsync --delete`; `mv`/`cp` to `$TRASH` is the accepted alternative. Mention `$TRASH` in the summary.

## Step 6 — Update the resync marker

Write the lightweight `./.claude/.launchpad.json` (create `.claude/` if needed). It is **not** a snapshot of skills — just a record of when this repo last took plugin content and from which version, for the next run's summary line:

```json
{
  "plugin_version": "<from ${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json>",
  "last_resync_date": "<ISO 8601 timestamp>",
  "previous_version": "<the plugin_version from the marker (or legacy .snapshot.json) before this run, or null>"
}
```

Carry the previous version forward so the user can see what they moved off of. If a legacy `.snapshot.json` was removed in Step 2b, this marker replaces it.

## Step 7 — Summary

Print:

- Old plugin version → new plugin version
- **Legacy snapshot:** removed (which skill dirs + `.snapshot.json` + stale hook) / none found / left in place (user declined)
- Engine scripts updated / **seeded** (were missing) / skipped / warnings
- AGENTS.md managed region: migrated from CLAUDE.md (first resync post-0026) / updated (region version old → new) / inserted (was missing) / skipped
- Scaffold templates: updated / skipped / append-only files flagged for hand-merge
- Path to `$TRASH` for backup recovery
- Suggested next steps:
  - **Skills are vendored in `.claude/skills/` and update separately** — via `npx skills update` (or the scheduled CI PR, or the plugin's belt nudge for Claude users), not `/ql-resync`. If they're behind, run `npx skills update`; this skill only reconciled repo *content*. **The one exception is Step 2c's initial vendor** (`npx skills add`) for a repo that had *no* vendored skills — `update` can't bootstrap what was never tracked.
  - **Commit the updated/seeded files** so CI and teammates pick them up (a newly seeded engine or refreshed convention isn't durable until committed). The shipped scripts run on bare `node` — no runtime deps.
  - If the AGENTS.md region changed, skim the new ethos/conventions — they govern how you build.
  - **Orphaned `scripts/jira-sync.mjs`?** Older engagements (plugin < 0.12.0) seeded one for `/ql-sync-jira` that lazily imported `jira.js` (a dependency) — it's retired and resync no longer reconciles it, so it won't delete a stale local copy. Safe to remove by hand (move-aside, not `rm -rf`). Its replacement, when the API transport is used, is the zero-dep `scripts/jira-rest.mjs` (seeded/reconciled above); the MCP transport needs no script at all. Don't confuse the two — the old one carried a dependency, which is exactly why it was killed.

## What NOT to do

- **Don't** reconcile, move, delete, or overwrite *existing* vendored `ql-*` skills in `.claude/skills/` or `skills-lock.json`. Those are updated by `npx skills update` (belt-and-suspenders), a separate mechanism. `/ql-resync` only reconciles repo-resident *content* (scripts, CLAUDE.md region, scaffold) and offers to remove a *legacy pre-`ql-` snapshot* — never the current vendored skills. **The sole skills action it may take is Step 2c's initial `npx skills add`** when *none* are vendored yet — a one-time bootstrap, never a reconcile of existing ones.
- **Don't** auto-commit. Let the user review the diff.
- **Don't** silently overwrite hand-edited scripts, the CLAUDE.md region, or scaffold files. Always warn and let the user opt in per item.
- **Don't** remove engagement-authored skills or vendored `ql-*` skills from `.claude/skills/` — only the *bare-named* (pre-`ql-`) launchpad dirs the old snapshot model left behind. A skill the team promoted locally is theirs; a `ql-*` dir is a vendored operating skill.
- **Don't** ever write outside the `LAUNCHPAD:MANAGED` markers when reconciling `AGENTS.md`. The H1, the `ENGAGEMENT` block, "Engagement notes", and any other prose the repo already had are not yours to touch. (During the `CLAUDE.md`→`AGENTS.md` migration, move/splice the region only — never wrap the user's existing `AGENTS.md` prose in the markers.)
- **Don't** wholesale-overwrite append-only files (`build-notes.md`, `deploy-runbook.md`) — surface missing general content for hand-merge instead.
- **Don't** reconcile scripts or files outside the in-scope tables — engagement-authored content is not plugin-owned; leave it alone.
- **Don't** touch `package.json` / lockfiles or `npm install` here. The shipped scripts are dependency-free; `sf project generate` owns `package.json`.
- **Don't** use `rm -rf` or `rsync --delete`.
