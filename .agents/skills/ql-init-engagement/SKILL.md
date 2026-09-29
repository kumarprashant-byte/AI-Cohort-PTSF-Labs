---
name: ql-init-engagement
disable-model-invocation: true
description: Seed a new AI-native delivery engagement workspace from this plugin — scaffold, engine scripts, CI, PR template, and the vendored ql-* skills — into a target directory.
produces: A scaffolded engagement repo in the target dir — README, AGENTS.md (managed region + Engagement notes) + CLAUDE.md (@AGENTS.md pointer), package.json, .gitignore, CI workflows (incl. the scheduled skills-update PR workflow), PR template, the engine scripts, the vendored ql-* skills in .claude/skills/ + skills-lock.json, and empty scopezilla/ intents/ delivery/ decisions/ scaffolding. No commit (you review the diff).
---

# Init engagement — scaffold a new AI-native delivery workspace

You are seeding a new AI-native delivery engagement repo from this plugin's templates and skill snapshots. The target may be the current working directory (in-place mode) or a sibling of a Scopezilla project (kickoff-from-scopezilla mode).

This skill is a one-shot. Don't snapshot itself into the target.

## Step 1 — Detect context

Inspect cwd for Scopezilla source markers:

- `./.project-metadata.json` exists, AND
- `./outputs/quantum-leap/` exists.

If both are present, treat cwd as a **Scopezilla source** — the engagement repo must be a separate folder. Read `project_name` from `.project-metadata.json` to suggest a default folder name.

Otherwise, treat cwd as the candidate **in-place target**.

## Step 2 — Resolve the target directory

Use `AskUserQuestion` to confirm the target. Default suggestions:

- **Scopezilla mode:** `../<project-name>-engagement` (sibling of cwd). Offer options to use the default, pick a different sibling name, or specify an absolute path.
- **In-place mode:** `.` (cwd). Offer options to use cwd, or specify a different path.

Resolve to an absolute path. If the target doesn't exist, create it (`mkdir -p`). If it exists and is non-empty, ask the user before continuing — let them pick **abort**, **proceed and let me confirm each overwrite**, or **proceed and overwrite**.

Record the resolved target as `$TARGET` for the rest of the skill.

## Step 3 — Pre-flight on target

- If `$TARGET/.git` is missing, offer to run `git init` inside it. Don't force.
- If any of `$TARGET/README.md`, `$TARGET/AGENTS.md`, `$TARGET/CLAUDE.md`, `$TARGET/REVIEW.md`, `$TARGET/.claude/settings.json` already exist, list them and confirm before any later step would overwrite them. (A pre-existing `AGENTS.md` is common and is *merged*, not overwritten — see Step 4a.) Use the move-aside pattern (Step 4a) — never `rm -rf`. (A pre-existing `$TARGET/.claude/skills/` **with a `.snapshot.json`** is the *legacy* per-repo snapshot — don't touch it here; mention it so `/ql-resync` can reconcile it later. A `.claude/skills/` that is instead a set of vendored `ql-*` skills from a prior `npx skills add` is fine to refresh in Step 5.)

## Step 4 — Copy templates

Recursively copy `${CLAUDE_PLUGIN_ROOT}/templates/` into `$TARGET`:

```bash
cp -R "${CLAUDE_PLUGIN_ROOT}/templates/." "$TARGET/"
```

The trailing `/.` matters — it copies the *contents* of `templates/`, including dotfiles (`.gitignore`, `.github/`, `.claude/settings.json`), without nesting under a `templates/` subdir.

Preserve `.gitkeep` files so `intents/`, `scopezilla/`, `delivery/`, `decisions/` stay tracked as empty dirs.

### Step 4a — `AGENTS.md` is canonical; `CLAUDE.md` just imports it — and don't clobber an existing `AGENTS.md`

Since `decisions/0026` the always-on instruction layer is canonical in **`AGENTS.md`** (every harness reads it), and `CLAUDE.md` is reduced to a one-line `@AGENTS.md` import so Claude Code — which reads `CLAUDE.md`, not `AGENTS.md` — picks up the same block. The plugin ships both: `templates/AGENTS.md` (the managed region + Engagement notes) and `templates/CLAUDE.md` (the `@AGENTS.md` pointer). The blind `cp -R` lands both correctly **when the target has neither file**. Two cases need care:

**The `AGENTS.md` merge (the common brownfield case — e.g. the target already has an `AGENTS.md`).** Many repos already ship an `AGENTS.md`. Overwriting it would destroy their real guidance. Instead, **inject** the plugin's managed region beside their content — the *same move* the old flow made for a pre-existing `CLAUDE.md`, retargeted to `AGENTS.md`. Before the `cp -R` (or by restoring their file from the move-aside trash afterward):

- **Target has no `AGENTS.md`** → the copied `templates/AGENTS.md` is exactly right as-is. Nothing to do.
- **Target already has an `AGENTS.md`** → keep *their* file as the base and splice the plugin's managed region into it. Extract the region from `${CLAUDE_PLUGIN_ROOT}/templates/AGENTS.md` (the `LAUNCHPAD:MANAGED:BEGIN`…`END` span, including its `:VERSION` stamp) and insert it into their file:
    - If their file already contains `LAUNCHPAD:MANAGED` markers (rare — they'd been seeded before), replace that region in place and stop.
    - Otherwise insert the region just **after** their H1 (and after an `ENGAGEMENT` block if `/ql-ingest-scopezilla` later adds one — for now, after the H1). **Never wrap their existing prose in the markers** — their content is theirs, not plugin-owned, and must stay *outside* the region so `/ql-resync` never overwrites it. (This is the opposite of the legacy-launchpad-repo migration in `/ql-resync`, where the existing prose *is* the plugin's content and gets wrapped. Here it isn't, so it doesn't.)
    - Leave all of their other content exactly where it is, below the region.

Show the user the plan ("your `AGENTS.md` is kept; the launchpad build conventions are inserted as a managed block after your H1") and confirm before writing. Use the move-aside pattern for the backup. The result reads: their H1 → the managed region → their original content — and a later `/ql-ingest-scopezilla` adds its `ENGAGEMENT` block between the H1 and the region (Step 5 of that skill), still outside the markers.

**The `CLAUDE.md` pointer.** `CLAUDE.md` must end up containing the bare `@AGENTS.md` import (un-backticked, so Claude Code resolves it):

- **Target has no `CLAUDE.md`** → the copied `templates/CLAUDE.md` (the pointer) is exactly right.
- **Target already has a `CLAUDE.md`** (their own hand-written one) → **don't overwrite it.** Keep their file and ensure a bare `@AGENTS.md` import line is present (add it near the top if missing). Their content stays; Claude Code now also loads `AGENTS.md`. Never move their prose into `AGENTS.md` — just wire the import.

This also lands `scripts/check-fls.mjs` — the non-blocking FLS guard wired up in Step 4b — `scripts/intent-ledger.mjs`, the scope↔delivery ledger helper, `scripts/check-plugin-installed.mjs`, the SessionStart nudge that reminds anyone who opens the repo without the `quantum-leap-launchpad` plugin to install it (wired in `.claude/settings.json`), and `delivery/jira.config.example.json`, the mappings template for the one-way Jira projection (driven by `/ql-sync-jira`). The ledger file itself (`delivery/intent-ledger.md`) is not shipped empty; `/ql-ingest-scopezilla` seeds it from `intents.json` once scope is present. The trust-chain gates in `intent-trust-chain.yml` no-op until then. The Jira projection is inert until the user runs `/ql-sync-jira` (which generates `delivery/jira.config.json`) — `jira.config.example.json` documents the config shape in the meantime, and `/ql-setup` chooses the transport. It reaches Jira over whichever transport the customer's tenant permits: the Atlassian Remote MCP (default, no engine script — `/ql-setup` wires the `atlassian` server into `.mcp.json`) or a Jira API token (via the zero-dep `scripts/jira-rest.mjs`, also landed here, for tenants that block third-party MCP OAuth but allow tokens — see decisions/0011). It also lands two starter delivery docs: `delivery/build-notes.md` (recurring Salesforce deploy/Flow/Apex gotchas) and `delivery/deploy-runbook.md` (the ordered, deployment-relevant manual steps — Setup toggles, Setup-data the code reads, scheduled jobs — that a fresh org needs but that can't ride the metadata deploy; demo-data seeding stays out).

## Step 4b — Recommend wiring the FLS guard (cascading-consequences backstop)

`scripts/check-fls.mjs` (copied in Step 4) warns when a custom field has no Field-Level Security in any permission set — the cheapest-to-miss ripple from the "Cascading consequences" convention in `CLAUDE.md`. It runs in two places; CI is automatic, the local hook needs one line of wiring:

- **CI (automatic):** `templates/.github/workflows/intent-trust-chain.yml` already calls it as a non-blocking annotation on `force-app/**` PRs (this always-ships workflow carries the FLS advisory + the trust-chain gates, independent of which deploy pipeline the repo uses). Nothing to do.
- **Local pre-commit (recommend wiring):** the husky + lint-staged stack comes from `sf project generate`, which **owns and overwrites `package.json`** — so the template can't ship the entry without it being clobbered. Instead, *recommend* adding it to whatever `package.json` exists in `$TARGET` after the DX scaffold is present. Add this key to the existing `lint-staged` object (don't clobber sibling entries):

  ```json
  "**/objects/**/fields/*.field-meta.xml": ["node scripts/check-fls.mjs"]
  ```

  If `$TARGET/package.json` has no `lint-staged` block yet (DX scaffold not generated, or in-place target predates it), don't fabricate the whole husky setup — just note in the summary that the local hook can be wired after `/ql-setup`, and that CI covers it regardless. Never block the init on this.

## Step 4c — Jitter the weekly skills-update cron (spread the herd)

The shipped `skills-update.yml` runs weekly on a fixed `0 13 * * 1`. If every engagement repo keeps that default, hundreds of them hit the git host at the same Monday-13:00-UTC minute. Spread it by deriving a stable per-repo minute + hour from `$TARGET` (stable so re-running init doesn't churn it):

```bash
node -e '
  const fs=require("fs"), path=require("path"), crypto=require("crypto");
  const target=process.argv[1];
  const f=path.join(target, ".github/workflows/skills-update.yml");
  if(!fs.existsSync(f)) process.exit(0);
  const h=crypto.createHash("sha256").update(target).digest();
  const minute=h[0]%60, hour=6+(h[1]%12);   // 06:00–17:59 UTC window
  let s=fs.readFileSync(f,"utf8");
  const before=s;
  s=s.replace(/cron:\s*"0 13 \* \* 1"/, `cron: "${minute} ${hour} * * 1"`);
  if(s!==before){ fs.writeFileSync(f,s); console.log(`skills-update cron → "${minute} ${hour} * * 1" UTC (jittered per repo)`); }
' "$TARGET"
```

Harmless if the file is absent or already customized (the replace only fires on the exact default). Report the jittered time in the summary.

## Step 5 — Vendor the operating skills into the repo (harness-neutral)

The engagement repo **carries its own committed copy** of the `ql-*` operating skills, vendored into `.claude/skills/` (and every other harness dir the user has) via the open Agent Skills CLI. This is the harness-neutral distribution model (see `decisions/0012`): the skills are **in the repo**, so any agent — Claude Code, Cursor, Codex, Copilot — picks them up on clone, and the work is **reproducible** (a given commit pins one skill behavior). The Claude Code plugin still works too (belt-and-suspenders); vendoring is what lets *non-Claude* harnesses use the skills at all.

Vendor them with the `skills` CLI, pointed at the plugin's git source:

```bash
# Run with $TARGET as the working directory — `skills add` vendors into the CWD's
# harness dirs, and in Scopezilla mode the CWD is the source project, not $TARGET.
(cd "$TARGET" && npx -y skills@1.5.25 add https://git.soma.salesforce.com/dgerow/quantum-leap-launchpad.git --yes)
```

- This clones the plugin repo (system `git`, so it inherits the user's git.soma credentials — the same auth `git clone` already uses) and installs every `ql-*` skill into `$TARGET/.claude/skills/` plus any other detected harness dirs, symlinked to one canonical copy.
- It writes `$TARGET/skills-lock.json` recording each skill's **source (the git URL) + content hash** — this is what the belt (plugin SessionStart nudge) and suspenders (the scheduled `skills-update` CI workflow, landed in Step 4) key off to detect and pull updates. Use the git URL as the source (not `${CLAUDE_PLUGIN_ROOT}`), so `npx skills update` resolves on every teammate's and CI's machine, not just yours.
- The 3 maintainer-only skills (`ship`/`docs`/`review-pr`) are **not** installed — they carry `metadata.internal: true`, which the CLI skips. Only the `ql-*` engagement skills land.

The engagement's `setup` script (`templates/package.json`) also runs `npx skills add forcedotcom/sf-skills` — the Salesforce build-skill library. Both source sets live side-by-side in `.claude/skills/` and are refreshed by the same update paths; the `ql-` prefix keeps our skills collision-free next to theirs.

**If `npx skills` isn't reachable** (offline, or the user declines the network call), fall back to a plain recursive copy of `${CLAUDE_PLUGIN_ROOT}/skills/ql-*` into **both** `$TARGET/.claude/skills/` **and** `$TARGET/.agents/skills/` (so non-Claude harnesses — which read `.agents/skills/` — see them too) and note in the summary that `skills-lock.json` wasn't written, so `npx skills update` won't track them until the user re-runs the `add`. Never block the init on this — vendored-but-not-lock-tracked still works for every harness; it just misses auto-update.

Capture the plugin version for the summary: read `version` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

If the target already has a `.claude/skills/` from an **older, pre-0012 seeding** (the legacy per-repo snapshot with a `.snapshot.json`), leave it for `/ql-resync` to detect and reconcile — it knows the old shape; don't hand-delete it here.

## Step 7 — Offer to chain into ingest-scopezilla (Scopezilla mode only)

If we're in Scopezilla mode, the user has the source path right there (it's the original cwd). Ask whether to chain — yes / no.

If yes, tell the user:

```
Next: cd "$TARGET" && claude    # open Claude Code in the engagement repo
Then run: /ql-ingest-scopezilla <original-cwd>
```

Do not attempt to `cd` and re-invoke from this skill — Claude Code sessions are bound to the cwd they started in. The user needs to open a session in the new target.

## Step 8 — Summary

Print a Deliverables block with absolute paths:

```
**Deliverables**
- `$TARGET/README.md`
- `$TARGET/AGENTS.md` (canonical instruction layer — managed region + Engagement notes)
- `$TARGET/CLAUDE.md` (`@AGENTS.md` import, so Claude Code reads the same block)
- `$TARGET/package.json`
- `$TARGET/.gitignore`
- `$TARGET/.github/workflows/`
- `$TARGET/.github/pull_request_template.md`
- `$TARGET/REVIEW.md` (build-PR review guidance — the reviewer side of the PR)
- `$TARGET/scripts/check-fls.mjs`
- `$TARGET/scripts/intent-ledger.mjs`
- `$TARGET/scripts/jira-rest.mjs`
- `$TARGET/delivery/jira.config.example.json`
- `$TARGET/.claude/settings.json`
- `$TARGET/.claude/skills/ql-*` (the vendored operating skills) + `$TARGET/skills-lock.json`
- `$TARGET/scripts/check-plugin-installed.mjs`
- `$TARGET/scripts/fix-skill-symlinks.mjs` (Windows vendored-skill symlink repair, invoked by `/ql-setup`)
- `$TARGET/intents/` (empty but for `BACKLOG.md`, the pre-Intent idea inbox — filled with living per-intent files by `/ql-ingest-scopezilla`)
- `$TARGET/scopezilla/` (empty)
- `$TARGET/delivery/` (empty)
- `$TARGET/decisions/` (empty)
```

Then a **How the skills stay current** note — the skills are vendored in the repo (so every harness has them on clone); two paths keep them fresh, and neither is required for the skills to *work*:

```
**Skills are vendored into your harness's skills dir — `.claude/skills/` (Claude Code) / `.agents/skills/` (Cursor, Codex, opencode) — read on clone.** They update two ways (belt-and-suspenders):
  • Claude Code users: install the plugin once — it nudges you when skills are behind:
      /plugin marketplace add https://git.soma.salesforce.com/dgerow/quantum-leap-launchpad.git
      /plugin install quantum-leap-launchpad@quantum-leap-launchpad
  • Any harness / no plugin: the scheduled CI workflow opens a "skills update" PR when the upstream changes; or run `npx skills update` yourself anytime.
```

Then next steps:

1. `cd "$TARGET"` and open in your agent (Claude Code, Cursor, …)
2. Run `/ql-setup` — installs tooling (sf CLI, pi-coding-agent, sf-pi, forcedotcom/sf-skills) and wires up `.mcp.json`
3. Run `/ql-ingest-scopezilla <path>` (skip if already chained in Step 7)

Then a one-time **help channel** line — the room where release notes are posted and where feedback/issues go, so the user stays current and can reach help:

```
💬 If you're not already in #help-quantum-leap-launchpad, it's worth joining — that's where launchpad release notes land and where you report issues or share feedback: https://salesforce-internal.slack.com/archives/C0B8D3MV6KB
```

## What NOT to do

- **Don't** write a `.snapshot.json` into `$TARGET/.claude/skills/` — that's the *legacy* per-repo snapshot model (a hand-copied, version-stamped mirror). The new model vendors via `npx skills` with a `skills-lock.json` (source + content hash) instead, so updates are tracked. Vendoring the `ql-*` skills is now correct and expected (see `decisions/0012`); the collision problem the old warning worried about is solved by the `ql-` prefix + `metadata.internal` on maintainer skills.
- **Don't** modify the source Scopezilla project. This skill only writes to `$TARGET`.
- **Don't** auto-commit. The user reviews the diff first.
- **Don't** install npm packages or run `/ql-setup` from here. That's the user's first move after `cd $TARGET`.
- **Don't** use `rm -rf` or `rsync --delete`. Use the move-aside pattern.
