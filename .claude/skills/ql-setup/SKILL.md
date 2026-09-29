---
name: ql-setup
disable-model-invocation: true
description: Set up (or re-sync) this AI-native delivery engagement workspace — installs the toolchain and wires up `.mcp.json`. Run on first clone or any time tooling drifts.
produces: >-
  `.mcp.json` (Salesforce DX + Atlassian + salesforce-docs MCP servers), and — when opencode is present — a committed `opencode.json` `mcp` block with the same servers in opencode's format; plus the installed toolchain (sf CLI, pi, sf-skills) and `sfdx-project.json` if it was missing. No engagement content — that's /ql-ingest-scopezilla.
---

# Setup — AI-native delivery engagement workspace

You are setting up an AI-native delivery engagement workspace. This is the very first thing a consultant runs after cloning the repo. This skill is the single bootstrap entry point — it runs the npm installs itself in Step 1, so don't tell the user to run `npm run setup` separately (that would double-install). Re-running is safe; the npm script is idempotent.

## Prereq

**Node ≥ 22.20.** If `node --version` is missing or older, point the user at https://nodejs.org or `nvm install 22`. Don't try to install Node yourself.

## Step 1 — Run the npm setup script

```bash
npm run setup
```

That handles the stable installs in one go:
- `@salesforce/cli` (npm global)
- `@earendil-works/pi-coding-agent` (npm global)
- `sf-pi` extension (`pi install git:github.com/salesforce/sf-pi`)
- `forcedotcom/sf-skills` agent skills (`npx skills add ...`)

Stream the output. If it fails, the most common cause is a stale npm cache or Node too old.

If the project's `package.json` was overwritten by `sf project generate` and the `setup` script is missing, restore it by merging in:

```json
"scripts": {
  "setup": "npm install -g @salesforce/cli @earendil-works/pi-coding-agent && pi install git:github.com/salesforce/sf-pi && npx -y skills@1.5.25 add forcedotcom/sf-skills"
},
"engines": { "node": ">=22.20" }
```

## Step 1b — Make the launchpad skills available to your agent

This engagement's operating skills (the `ql-*` set — `/ql-ingest-scopezilla`, `/ql-check-scope`, `/ql-start-intent`, …) are **vendored into the repo** (into your harness's skills dir — `.claude/skills/` for Claude Code, `.agents/skills/` for other harnesses), so they work in **any** harness on clone (see the plugin's `decisions/0012`). How each agent picks them up, and how they stay current:

- **Claude Code** — the vendored skills load as project skills automatically. For the best experience, also install the `quantum-leap-launchpad` **plugin** (it adds a once-a-day nudge when the vendored skills fall behind upstream, plus `/ql-init-engagement` and `/ql-resync`):

  ```
  /plugin marketplace add https://git.soma.salesforce.com/dgerow/quantum-leap-launchpad.git
  /plugin install quantum-leap-launchpad@quantum-leap-launchpad
  ```

- **opencode, Cursor, Codex, Copilot, or any other agent** — the skills are already in the repo; nothing to install. These harnesses read their skills from `.agents/skills/` (opencode also reads `AGENTS.md` for the build conventions directly). If your agent keeps its skills in its own directory and the repo's copy isn't picked up, fan them into every detected harness dir with:

  ```bash
  npx -y skills@1.5.25 add . --yes    # re-vendors from the repo into each agent's skills dir
  ```

  **Joining on a non-Claude harness (e.g. opencode):** clone the engagement repo, then run `/ql-setup` — the vendored skills + `AGENTS.md` conventions are already present, and Step 1c below installs the opencode telemetry plugin. Note: **scaffolding a *new* engagement (`/ql-init-engagement`) and pulling committed-content updates (`/ql-resync`) run in Claude Code** (they read the plugin's templates), so a team with no Claude user does those steps another way (a teammate on Claude, or `npx skills add` + a manual template copy). Day-to-day build/validate/report skills run in any harness.

**Keeping them current (any harness):** the repo ships a scheduled CI workflow (`.github/workflows/skills-update.yml`) that opens a PR when the upstream skills change — review and merge to adopt. Or update on demand anytime with `npx skills update`. Nothing auto-applies; the merge/commit is the gate.

## Step 1c — Install the opencode telemetry plugin (only if opencode is present)

Claude Code users get usage telemetry from the installed plugin's hooks. **opencode has no plugin-marketplace equivalent**, so if the user builds with **opencode** we install its telemetry sibling per-machine (mirroring the Claude posture — telemetry lives on the machine, never committed into the customer repo). See `decisions/0028`. Skip this entirely if opencode isn't installed.

```bash
command -v opencode >/dev/null 2>&1 || { echo "opencode not installed — skipping its telemetry plugin"; }
```

If opencode **is** present, copy the plugin + its config into opencode's per-machine plugin dir. Resolve the source with the co-located-asset tri-path (vendored `.claude/`/`.agents/` first, `${CLAUDE_PLUGIN_ROOT}` fallback for a plugin checkout):

```bash
SRC=""
for c in ".claude/skills/ql-setup/opencode" ".agents/skills/ql-setup/opencode" "${CLAUDE_PLUGIN_ROOT}/skills/ql-setup/opencode"; do
  [ -f "$c/launchpad-telemetry.js" ] && { SRC="$c"; break; }
done
if command -v opencode >/dev/null 2>&1 && [ -n "$SRC" ]; then
  DEST="$HOME/.config/opencode/plugin"
  mkdir -p "$DEST"
  cp "$SRC/launchpad-telemetry.js" "$DEST/"                      # the plugin (required)
  [ -f "$SRC/.tracking-config.json" ] && cp "$SRC/.tracking-config.json" "$DEST/"  # telemetry endpoint config (optional)
  echo "Installed opencode telemetry plugin → $DEST (re-run /ql-setup to refresh)"
fi
```

If the telemetry config didn't come along, the plugin still writes the local usage log and just skips the POST — or set `LAUNCHPAD_TELEMETRY_ENDPOINT` to restore it. (`npx skills` does vendor the co-located `.tracking-config.json` — verified — so this is only a fallback.) To **opt out** of the network posts entirely while keeping the local log, set `LAUNCHPAD_TELEMETRY_ENDPOINT=""` (a defined-but-empty value disables posting).

It's **`.js`, not `.mjs`** — opencode's loader scans `.js`/`.ts` only (verified). The plugin **gates itself** to engagement repos (it fires only when the repo's `AGENTS.md`/`CLAUDE.md` carries the `LAUNCHPAD:MANAGED` marker) and is fire-and-forget — it never blocks or errors into an opencode session. Same ingest endpoint + payload as the Claude hooks (which since `decisions/0056` carries the engagement's git remote in the clear, but never scope or build content), tagged `surface: opencode`. It's per-machine, so re-running `/ql-setup` on a new machine (or after an update) refreshes it.

## Step 1d — Windows: make vendored-skill symlinks resolve

The vendored skills are stored as **symlinks** (one canonical copy at `.agents/skills/<name>/`, each harness dir linked to it — git tracks them as mode-120000 objects). That model is deliberate (no duplication, clean update diffs), but **on Windows `git clone` writes each symlink as a one-line text file** unless the machine can create symlinks — so Claude Code finds a file where it expects a skill directory and the skill never loads (it won't auto-trigger; you'd have to point at it by name). This is a known limitation of the `skills` CLI on Windows-committed repos ([vercel-labs/skills#1199](https://github.com/vercel-labs/skills/issues/1199)), not something the repo can fix by itself.

**On Windows, one-time prerequisite:** enable **Developer Mode** (Settings → Privacy & security → For developers → *Developer Mode*) — this grants symlink-creation rights **without admin** on Win10 1703+. Then set the global default so every future clone materializes links correctly:

```bash
git config --global core.symlinks true
```

**Then repair any skill links this repo already checked out as files** — surgical and safe (it only re-materializes paths git *itself* tracks as symlinks; skills you added by hand are never touched, and it never deletes a directory):

```bash
node scripts/fix-skill-symlinks.mjs          # repairs in place, sets core.symlinks=true on the repo
# node scripts/fix-skill-symlinks.mjs --check  # report-only (exit 1 if any are still broken)
```

Run it on every harness (macOS/Linux no-op cleanly — links already resolve). If it reports paths it *couldn't* fix, the machine still can't create symlinks (Developer Mode off, or a locked-down/MDM-managed box) — enable Developer Mode and re-run, or re-clone with `git clone -c core.symlinks=true <url>`. **Windows users should take skill updates via the CI `skills-update` PR + `git pull`, not local `npx skills update`** — that avoids the CLI's other open Windows bugs.

## Step 2 — Wire up the MCP servers

`.mcp.json` carries three servers: the **Salesforce DX** server (always), the **Atlassian** server (for `/ql-sync-jira` reporting), and **Salesforce Docs** (doc grounding — a stable shared URL, safe to commit).

### 2a — Salesforce DX (always)

This is the one piece that genuinely drifts (recommended toolsets, new flags like `--dynamic-tools` / `--allow-non-ga-tools`, `--orgs` defaults). Don't paste a stale config from memory.

1. `WebFetch` https://github.com/salesforcecli/mcp — read the current Claude Code config block.
2. Write `.mcp.json` at repo root matching the upstream recommendation. Sensible defaults:
   - `--orgs DEFAULT_TARGET_ORG`
   - `--toolsets` covering the toolsets a delivery pod actually needs (typically `orgs,metadata,data,users,testing` — but verify against the README).
3. If `.mcp.json` already exists, diff it against the current README recommendation and ask the user before overwriting.

### 2b — Atlassian (Jira reporting)

`/ql-sync-jira` projects scope + delivery status into Jira, and it can reach Jira **two ways** (see decisions/0011) — **which one depends on the customer's tenant policy**, so this step figures out which is available and records it. Some enterprise tenants block third-party MCP OAuth apps but allow create-your-own API tokens; others are the reverse. Don't assume MCP.

**Always ship the MCP server block** (it's inert until used) — add it alongside the Salesforce DX one in the same `.mcp.json`:

```json
"atlassian": { "type": "http", "url": "https://mcp.atlassian.com/v1/mcp" }
```

- Use the streamable-HTTP endpoint `https://mcp.atlassian.com/v1/mcp` (`type: "http"`). **Not** the older `…/v1/sse` endpoint — Atlassian deprecated SSE (sunset 30 June 2026). No `mcp-remote` npx shim is needed; Claude Code does remote OAuth natively.
- Auth is a one-time **browser OAuth** on first use (`/mcp` → Atlassian login), not an API token.

**Then figure out the transport** so `/ql-sync-jira` fails fast at config time, not at push time. Ask the user (or, if they already know their tenant blocks third-party OAuth apps, skip straight to API):

- **MCP available** (the common, default case) → nothing more to configure here; the OAuth happens on first `/ql-sync-jira`. The transport stays the default `"mcp"`.
- **MCP blocked, API token allowed** → the projection runs over `scripts/jira-rest.mjs` (Jira Cloud REST v3, zero-dep). It needs, at `/ql-sync-jira` time:
  - env vars `JIRA_EMAIL` + `JIRA_API_TOKEN` (a token from id.atlassian.com/manage-profile/security/api-tokens) — **never committed**; tell the user to export them (or add to a local, gitignored env file).
  - `base_url` (the customer's `…atlassian.net`) and `transport: "api"` in `delivery/jira.config.json` — non-secret, committed. `/ql-sync-jira` creates that config on first run; you can pre-seed `transport`/`base_url` now from `delivery/jira.config.example.json` so the choice is recorded.

Recording the transport now is the point: `/ql-sync-jira` reads it and confirms the right prerequisite up front, instead of dying mid-push when the MCP won't connect. A complete `.mcp.json` has these servers under `mcpServers` regardless of transport: `Salesforce DX` (from the README), `atlassian` (the block above), and `salesforce-docs` (below).

### 2c — Salesforce Docs (doc grounding)

The build loop grounds platform decisions in official Salesforce docs (`/ql-design-intent` Step 3, the build-conventions persona in `AGENTS.md`). The **`salesforce-docs`** MCP is the concrete tool for that — the **official Salesforce-hosted** docs server (`mcp.docs.salesforce.com`, no API key), covering Salesforce, MuleSoft, and Tableau docs. It exposes `list` (the catalog of doc collections — a slice is a collection/version/locale), `search` (ranked, document-atomic results over **one** collection), `fetch` (a full doc body by `id` or `url`, as text/markdown/html), and `answer`/`explain` (grounded synthesis, for non-agentic callers — an agent driving retrieval uses `search`+`fetch`). Like the `atlassian` block it's a **stable shared URL**, so it lives in the committed `.mcp.json`. Add it alongside the others (inert until a skill calls it):

```json
"salesforce-docs": { "type": "http", "url": "https://mcp.docs.salesforce.com/" }
```

- **The trailing slash is required** — the server rejects the slashless form.
- It's **optional and degrades gracefully** — a skill that can't reach it falls back to the public doc sites; a missing/blocked endpoint never blocks the work. See decisions/0016 and decisions/0054.
- Doc queries leave the machine to an official `*.salesforce.com` endpoint — low sensitivity (doc-search text, **no customer data or org context**), but flag it if the customer's tenant blocks outbound to it. If it's blocked, just omit the block; the skills fall back to public docs.
- Auth: none.

**Migrating a repo already wired to a retired endpoint.** If `.mcp.json` already carries a `salesforce-docs` server whose `url` is a **retired** launchpad endpoint — `https://salesforce-docs-76258744c9d7.herokuapp.com/api/mcp` (the old Salesforce Labs Heroku preview) — rewrite **only that URL** to `https://mcp.docs.salesforce.com/`, leaving every other server and key untouched. Only swap a URL that exactly matches one the launchpad shipped; a hand-picked or custom endpoint is the user's and is never touched. **If the repo already has a committed `opencode.json`, migrate its `salesforce-docs` URL the same way — regardless of whether `opencode` is installed on this machine.** That file is shared config an opencode teammate depends on, so its migration is *not* gated on the local `command -v opencode` check (which only guards *creating* the file in Step 2d); a Claude-only user re-running setup must still fix an existing `opencode.json` so a teammate doesn't silently lose grounding once the old endpoint dies. Once the Heroku preview goes dark a repo left on it silently loses doc grounding — this surgical swap is what prevents that. See decisions/0054.

### 2d — opencode's MCP config (only if opencode is present)

**opencode does not read `.mcp.json`** — it reads an `mcp` block in a repo-root **`opencode.json`**. So an opencode builder needs the same three servers in opencode's format, or they get no SF DX / Atlassian / docs MCP. Mirror the committed-`.mcp.json` posture exactly: MCP config is shared project tooling (stable URLs, no secrets), so it's **committed**, not per-machine — the opposite of the opencode *telemetry* plugin (Step 1c, per-machine) and the KB (Step 5, user-scope), which stay out of the repo for machine-path/deliverable reasons that don't apply here. See decisions/0029.

**Gate on `command -v opencode`** (same as Step 1c). Skip entirely if opencode isn't installed — a Claude-only pod that later adds an opencode user gets this when *they* run `/ql-setup`.

Write (or **merge** — never clobber; preserve any existing provider/model/mcp keys, same diff-before-overwrite rule as `.mcp.json`) `opencode.json` at repo root with the **same three servers**, translated to opencode's format. **The format differs from `.mcp.json` in three ways** (verified live against opencode 1.18.4, decisions/0029):

- Top-level key is **`mcp`**, not `mcpServers`.
- Remote (HTTP) servers use **`"type": "remote"`** — *not* Claude's `"type": "http"`. opencode auto-detects OAuth on remote servers.
- Local (stdio) servers use **`"type": "local"`** with a **single `command` array** (`[cmd, ...args]`) — *not* Claude's split `command` + `args`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "salesforce-dx": {
      "type": "local",
      "command": ["npx", "-y", "@salesforce/mcp", "--orgs", "DEFAULT_TARGET_ORG", "--toolsets", "orgs,metadata,data,users,testing"],
      "enabled": true
    },
    "atlassian":      { "type": "remote", "url": "https://mcp.atlassian.com/v1/mcp", "enabled": true },
    "salesforce-docs": { "type": "remote", "url": "https://mcp.docs.salesforce.com/", "enabled": true }
  }
}
```

**Translate the DX block from the same README you fetched in Step 2a — don't hard-code it.** It's the one server that drifts; one WebFetch drives both files. Take the README's `command`/`args` and fold them into opencode's single `command` array. The `atlassian` and `salesforce-docs` blocks are the stable shared endpoints from 2b/2c. Same graceful-degradation applies: `salesforce-docs` falls back to public docs if blocked, and `/ql-sync-jira` has the API-token REST transport (2b, decisions/0011) if the customer's tenant blocks the Atlassian MCP OAuth app.

## Step 3 — Generate the SFDX project (if missing)

If `sfdx-project.json` is absent, run `sf project generate --name . --manifest`. Otherwise skip.

## Step 4 — Verify the DX MCP server is live

Writing `.mcp.json` is not the same as the server running. Don't end setup at "the file exists" — confirm the Salesforce tools actually load, since this is the capability the whole engagement depends on. Two things bite people:

1. **It only loads after a restart.** Claude Code reads MCP config at startup, so a `.mcp.json` written during this session won't be active until Claude Code is restarted. There's no hot-reload (`/mcp` shows status and handles auth, but doesn't reload config).
2. **You approve the project server once.** On restart, Claude Code prompts to trust the project MCP servers declared in `.mcp.json` — tell the user to accept it. (The shipped `.claude/settings.json` deliberately does *not* auto-trust every project MCP server, so this one-time prompt is expected and healthy — it's the gate on a repo's `.mcp.json`.)

Have the user confirm health with:

```bash
claude mcp list
```

Read the status:
- **✅ connected (shows a tool count)** — good, the Salesforce tools are live.
- **⏸ Pending approval** — trust hasn't completed; restart Claude Code and accept the project-server trust prompt.
- **✗ Failed** — usual causes are Node too old (see Prereq) or a malformed `.mcp.json`; re-check Step 2 against the upstream README.

Distinguish two failure modes that look similar: the **server** connecting is separate from org-gated **tools** working. The server can be ✅ connected while metadata/data tools still error until `sf org login web` has authorized an org — that's expected, not a setup failure.

If `claude mcp list` is run before restarting and the server is missing or pending, that's expected for a just-written `.mcp.json` — tell the user to restart Claude Code, then re-run `claude mcp list` to confirm ✅.

The `atlassian` server should also appear in `claude mcp list` after restart. It won't have authenticated yet — its tools stay gated until the user completes the one-time browser OAuth via `/mcp` (Atlassian login). That OAuth only matters before the first `/ql-sync-jira`; if this engagement doesn't report through Jira, it can be skipped entirely.

**If you wrote `opencode.json` (Step 2d),** the opencode analog of `claude mcp list` is `opencode mcp list` — it reports status without a running TUI. Expect: `salesforce-docs` ✓ connected; `atlassian` ⚠ needs authentication (run `opencode mcp auth atlassian` for the one-time OAuth, the analog of Claude's `/mcp`); `salesforce-dx` ✓ once its `npx` package is cached (a first run can ✗ time out while `npx` downloads `@salesforce/mcp` — re-run after it's cached) and an org is authorized (`sf org login web`). Same "server connecting vs org-gated tools working" distinction as above.

**On any other harness (Cursor, Codex, a customer's own agent):** it reads MCP config from its *own* location, not `.mcp.json`/`opencode.json`. Configure the same three servers wherever that harness expects them, and verify with its own MCP list/status command — consult the harness's MCP docs for both (the repo doesn't scaffold non-Claude/opencode harnesses; the servers and OAuth model are the same, only the config location and verify command differ).

## Step 5 — Offer the curated architecture KB (optional, recommended)

This engagement can ground its design and build decisions in the **`project-kb-salesforce`** knowledge base — ~13.5k curated Salesforce architecture atoms (patterns, anti-patterns, decision frameworks) that `/ql-design-intent` and the build conventions reach for first when they're available. It's **optional but recommended**, and it is **not** wired into this repo's `.mcp.json`.

**Why it's not in `.mcp.json`:** the KB is a local stdio server whose command is a machine-specific absolute path (`<clone>/.venv/bin/python <clone>/mcp-server/server.py`). `.mcp.json` is committed and shared across the pod, so baking one person's path into it would break for everyone else. It's also a cross-engagement asset (Scopezilla grounds on the same KB). So it installs **once per machine** at **user scope** — where per-machine paths belong.

**Don't re-document their install here — delegate to it.** The KB repo owns its own setup (clone + deps + MCP registration) and keeps it current. Point the user at it:

- **Repo:** https://github.com/salesforce-internal/project-kb-salesforce
- **Fastest path:** it ships a Claude-Code "install it for me" prompt (README → *Option 0*). Or run its `./scripts/ql-setup.sh`, which installs deps via `uv`, links its `/advisor` skill, and registers the `kb-salesforce` MCP server at user scope.
- **`uv`** must be on PATH (the KB's setup prints install hints if it's missing).

**Two prereqs bite hard enough to name here — even though their docs own the fix — because a user who hits them gets a cryptic failure, not a helpful one:**

1. **Git LFS, installed *before* cloning.** The MCP server's semantic search depends on LFS-tracked blobs (`knowledge/onnx/model.onnx` ~86 MB, `knowledge/atom_vectors.npz`). Clone without Git LFS enabled and those arrive as broken pointer text — search silently degrades to lexical-only rather than erroring. (Note: this is the *opposite* of how Scopezilla uses the same repo — it sparse-clones only the markdown atoms and deliberately disables LFS. We need the blobs; it doesn't.)
2. **GitHub Enterprise (EMU) access to `github.com` — a *different host* than the `git.soma.salesforce.com` this plugin came from, and it needs more than one grant.** This is the single most common wall. Getting in takes: an EMU account grant (`GHEC_SFDC-emu_Users`) **and** a separate org-membership grant (`GHEC_salesforce-internal_Users`) — both via EIP at securityhub.internal.salesforce.com, manager-approved — **plus** a `gh auth login --hostname github.com` as your *EMU* identity. Miss the second grant and the clone 403s even with a valid EMU login. Request both grants early; they take 20-30 min to a few hours to provision.

Verify with `claude mcp list` → `kb-salesforce ✓ Connected`. Because it's user-scope, it's then available in every session (including general architecture questions via its own `/advisor` skill), not just this repo. **This is a pointer, not a blocker** — if the user skips it (or is still waiting on grants), setup is still complete; the skills fall back to public docs.

**It does not auto-update.** The MCP server reads atoms from the local clone on every call, so the content is only as fresh as the last `git pull` in that clone — there's no background refresh (that's on the KB's roadmap, not shipped). Tell the user: to pick up new atoms, `git pull --ff-only origin main` inside the clone (no re-register, no re-run of their setup); and a clone that's been sitting a while may serve stale guidance. This is why the skills that consult the KB are told to flag KB-grounded calls honestly rather than treat the KB as always-current.

## What NOT to do

- **Don't ask for engagement identity.** No prompts for client / project / sponsor / org alias. README and AGENTS.md ship with `(fill in)` placeholders edited by hand once those are real.
- **Don't add the KB to `.mcp.json`.** It's user-scope by design (Step 5) — a machine-specific path has no place in the committed, shared project config.
- **Don't preflight `sf` org auth.** The first command that needs an authorized org will surface its own prompt (`sf org login web --alias <alias>`). Setup is about tooling, not auth.

## After everything installs

Summarize for the user:

- Versions of `node`, `sf`, `pi` now installed.
- Whether the SFDX project was generated or already existed.
- The contents of `.mcp.json` (the DX, `atlassian`, and `salesforce-docs` servers) — **and `opencode.json` if opencode was present** (same three servers, opencode format) — and the DX MCP server's status from `claude mcp list` (or `opencode mcp list` for opencode; or a clear "restart Claude Code, then run `claude mcp list` to confirm ✅" if it hasn't loaded yet). Note that the `atlassian` server needs a one-time OAuth before `/ql-sync-jira` (`/mcp` in Claude Code, `opencode mcp auth atlassian` in opencode), and is optional if Jira reporting isn't used; `salesforce-docs` needs no auth and is optional (skills fall back to public docs if it's absent or blocked).
- **On Windows:** whether the vendored-skill symlink repair (Step 1d) ran clean, and — if any links couldn't be created — the Developer Mode prerequisite. (macOS/Linux: no-op, skip mentioning.)
- Next steps:
  1. **If the MCP server isn't ✅ yet, restart Claude Code and run `claude mcp list` to confirm** before doing org work.
  2. Fill in the engagement-detail placeholders in `README.md` and `AGENTS.md` when known.
  3. Drop any Scopezilla outputs into `./scopezilla/`.
  4. When ready to do dev work: `sf org login web --alias <alias>`.
  5. **Optional but recommended:** install the `project-kb-salesforce` architecture KB (Step 5) so design/build decisions ground in curated patterns. Skip it and skills fall back to public docs.
  6. **Join `#help-quantum-leap-launchpad`** — where launchpad release notes are posted and where you can ask for help, share feedback, or report an issue. Share the join link (see "Join the help channel" below): https://salesforce-internal.slack.com/archives/C0B8D3MV6KB

## Join the help channel

`#help-quantum-leap-launchpad` (Slack ID `C0B8D3MV6KB`) is where launchpad release notes are posted and where users ask for help, share feedback, and report issues. Getting the user into that room is how they stay current — so offer it, don't force it.

**Share the join link — don't add them yourself.** Nudge once, phrased so someone already in the channel can skip it ("if you're not already in it…"). You **can't reliably add them** (there's no dependable join API, and silently adding someone is the wrong posture regardless), so just offer the link and let them click:

> If you're not already in `#help-quantum-leap-launchpad`, it's worth joining — that's where release notes land and where you can report issues or share feedback: https://salesforce-internal.slack.com/archives/C0B8D3MV6KB

If they'd like to raise something now, offer to draft it so it's ready to paste. Never `@here`/`@channel`.

**Suppress the recurring nudge once it's handled.** If the user says they've joined, are already in the channel, or would rather not, write `joined` to `~/.quantum-leap-launchpad/help-channel-nudge` (the per-machine state file the SessionStart hook `check-help-channel.mjs` reads). Stamping `joined` stops the weekly nudge for good. (Absent that, the hook self-limits to a few weekly nudges anyway — this just ends it cleanly.)

## Maintenance note

The npm `setup` script in `package.json` is the source of truth for the stable installs. Bump versions there. The MCP step stays docs-driven on purpose — its config shape changes faster than the install commands do.
