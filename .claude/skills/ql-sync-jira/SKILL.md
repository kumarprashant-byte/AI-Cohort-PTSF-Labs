---
name: ql-sync-jira
disable-model-invocation: true
description: Project this engagement's scope and delivery status one-way into your project tracker (Jira today, via the Atlassian MCP or an API token); the repo stays canonical and the tracker never writes scope back.
produces: Jira issues via the Atlassian MCP or the REST API (epics, stories, sub-tasks, status transitions, evidence comments, scope-drift labels) + `delivery/jira.config.json` (mappings + chosen transport, no secrets) on first setup. One-way — never writes scope back into the repo.
---

# Sync Jira — project scope + delivery status (one way)

You are projecting this engagement into Jira so delivery leads, sponsors, and the PMO can report on it. This is a **one-way mirror**: the repo is the canonical system of engagement (the living `intents/` are the WHAT; `delivery/intent-ledger.md` is the STATUS), and Jira is the parallel system of record for **reporting**. Per the methodology's "no tracker shadowing" principle, scope never flows back *from* Jira — see "The read boundary."

The whole flow is tracker-agnostic: **build desired state → look up what exists → show the diff → confirm → apply**. You are the human checkpoint before anything is written to the tracker. Only the *lookup/apply primitives* and the *concept mapping* differ by tracker — everything else in this skill is identical either way.

> **Harness note.** The confirm-before-push steps use `AskUserQuestion`. In a harness without it, ask the same question as plain text with the options enumerated — the shape of the question matters, the tool doesn't.

## Tracker adapters — the seam (see decisions/0046)

Customers mandate the tracker the same way they mandate the harness, so the projection is **tracker-neutral behind a per-tracker adapter**. An adapter supplies the tracker-specific pieces — the lookup/apply primitives, the concept mapping (epic / intent / open-question → that tracker's hierarchy), the identity mechanism, and the config keys it reads — while the flow above, label-anchored identity, the ledger-is-canonical rule, and the scope hash stay the same. The `tracker` key in `jira.config.json` selects the adapter (default `"jira"` if absent).

**Jira is the adapter shipped today**, and everything below *is* the Jira adapter. Adding another tracker is drop-in adapter work, no change to the flow — the contract is in the co-located `references/adapter-contract.md` (in this skill's own dir: `.claude/skills/ql-sync-jira/references/adapter-contract.md`, or `.agents/skills/ql-sync-jira/references/adapter-contract.md` on other harnesses, or `${CLAUDE_PLUGIN_ROOT}/skills/ql-sync-jira/references/adapter-contract.md` on a plugin-only checkout). (Jira's own MCP-vs-API split below is a *transport* choice *within* the Jira adapter, not a second adapter.)

## The Jira adapter's transports — two pens, one projection (see decisions/0011)

Jira can be reached two ways, and **which one you use is the customer's call, not ours** — some enterprise tenants block third-party MCP OAuth apps but allow create-your-own API tokens; others are the reverse. The `transport` key in `jira.config.json` picks the pen. **Swapping the pen must not change what's drawn** — the desired state, identity, ledger-is-canonical rule, and scope hash are the same.

| Operation | `transport: "mcp"` (Atlassian Remote MCP) | `transport: "api"` (`scripts/jira-rest.mjs`, Jira Cloud REST v3) |
|---|---|---|
| Reachability probe | `getVisibleJiraProjects` | `node scripts/jira-rest.mjs projects` |
| Project field/type discovery | `getJiraProjectIssueTypesMetadata`, `getJiraIssueTypeMetaWithFields` | `node scripts/jira-rest.mjs meta --project <KEY>` |
| Find existing issues (JQL) | `searchJiraIssuesUsingJql` | `node scripts/jira-rest.mjs search --jql "<JQL>" --fields key,labels,status,<hashField>` |
| Available transitions | `getTransitionsForJiraIssue` | `node scripts/jira-rest.mjs transitions <KEY>` |
| Create issue | `createJiraIssue` | `node scripts/jira-rest.mjs create-issue --json '{…fields…}'` |
| Edit issue | `editJiraIssue` | `node scripts/jira-rest.mjs edit-issue <KEY> --json '{…fields…}'` |
| Transition | `transitionJiraIssue` | `node scripts/jira-rest.mjs transition <KEY> --status "<name>"` |
| Comment | `addCommentToJiraIssue` | `node scripts/jira-rest.mjs comment <KEY> --body "<markdown>"` |

For the API transport, the issue **body** goes in the `fields` payload as `body_markdown` (the *same* markdown you'd hand the MCP with `contentFormat:"markdown"`) — the script converts it to ADF. Parent link and custom fields go in the same `fields` payload (e.g. `{"summary":"…","issuetype":{"name":"Story"},"labels":["intent:INT-001"],"parent":{"key":"ABC-12"},"customfield_10014":"<hash>","body_markdown":"…"}`). Read the whole skill with the transport substitution in mind; the steps below name the MCP tool, and the table is how you translate each to the API subcommand.

## Prerequisite — the right adapter, then a working transport

**First, confirm the adapter.** Read the `tracker` key from `jira.config.json` (default `"jira"` if absent). **`jira` is the only adapter shipped today** — if `tracker` is set to anything else, stop and tell the user that adapter isn't built yet (adding one is `references/adapter-contract.md`); do **not** proceed into the Jira operations below with a non-Jira tracker. Everything from here down is the Jira adapter.

Then determine the transport from `jira.config.json`'s `transport` key (default `"mcp"` if the config predates this field), and confirm it's live:

**If `transport: "mcp"`** — needs the Atlassian Remote MCP server (wired in by `/ql-setup`, endpoint `https://mcp.atlassian.com/v1/mcp`). Auth is a one-time browser OAuth. Do the checks through *your harness's* MCP mechanism — the tool names below are the same on any harness; only the status/auth commands differ:
1. Confirm the server is live via the harness's MCP status command — Claude Code: `claude mcp list` (expect `atlassian` connected); opencode: `opencode mcp list`; other harnesses: their MCP list/status mechanism. If it's missing, run `/ql-setup` and restart the harness.
2. Confirm you're authenticated: the first Atlassian tool call triggers the OAuth browser flow. If tools 401, complete the one-time login via the harness's MCP auth — Claude Code: `/mcp`; opencode: `opencode mcp auth atlassian`; other harnesses: their MCP auth flow.
3. Confirm reach (this is also the real tool-exposure probe): call **`getVisibleJiraProjects`**. If it isn't callable, the MCP tools aren't actually exposed in this harness — recheck steps 1–2. If the target project isn't listed, the signed-in account can't see it — stop and sort out access. If the user has more than one Atlassian site, confirm which site the project lives on here.

**If `transport: "api"`** — needs a Jira API token in the environment (never committed):
1. Confirm the env is set: `JIRA_EMAIL` + `JIRA_API_TOKEN` (create a token at id.atlassian.com/manage-profile/security/api-tokens), and `base_url` in `jira.config.json` (the customer's `…atlassian.net`). If any are missing, tell the user exactly which and stop.
2. Confirm reach: `node scripts/jira-rest.mjs projects`. If it errors on auth (401/403), the token/email are wrong or the account lacks access. If the target project isn't listed, the account can't see it — sort out access before projecting.

First separate a *fixable misconfig* from *no transport at all*: if the chosen transport just needs a correction the user can make now (a missing `JIRA_API_TOKEN`, wrong email, a project the account can't see), the checks above already told them exactly what to fix — that's the path, not offline. Offline mode is the fallback only when **neither** transport can be reached and there's nothing the user can quickly fix (OAuth denied by the tenant, network block, or no `jira.config.json` at all).

In that case, fall back to **offline mode** automatically — don't stop. Offline mode builds the same desired state from the repo (Step 1 is identical) and skips the JQL lookup (Step 2) by treating Jira as empty: every item in the desired state is a `CREATE`. The result is a **preview** of what the first live run would create — review it, then push it by re-running `/ql-sync-jira` live once a transport is available (the live run does the JQL lookup, so it dedupes against anything that already exists). See **Offline mode** below for the full behavior. Route the user to `/ql-setup` if they want to establish a live transport.

## Offline mode — full plan without Jira access

When neither transport is reachable (auth failure, network block, OAuth denied, or `jira.config.json` missing entirely), the skill still has everything it needs for the plan: the living intents, the ledger, and the Scopezilla epics are all in the repo. Offline mode computes the complete projection plan from those sources — identical to Steps 1–3 of the live flow, with one simplification: no JQL lookup, so Jira is assumed empty and every item is a `CREATE`.

**What changes in offline mode:**

- **Step 1 (desired state)** — identical. Read `scopezilla/data/epics.json`, all `intents/INT-NNN/intent.md`, and `delivery/intent-ledger.md` exactly as in the live flow.
- **Step 2 (JQL lookup)** — skipped. The in-memory `label → issue key` map starts empty. No transport needed.
- **Step 3 (plan)** — every item is `CREATE` (no `UPDATE`, no `TRANSITION`, no `COMMENT` — those require knowing what already exists). The plan is still sorted: epics first, stories under them, sub-tasks under stories.
- **`jira.config.json` absent** — proceed with defaults (`project_key: "UNKNOWN"`, `issue_types: {epic:"Epic", intent:"Story", open_question:"Sub-task"}`) and **flag each assumption explicitly** in the plan output so the user can correct them before executing.
- **Step 4 (apply)** — not offered in offline mode. The plan is read-only; no transport means nothing can be pushed. Tell the user clearly: "This plan is ready to execute once a Jira transport is available — run `/ql-sync-jira` again with MCP or API token configured to push it."

**What the output looks like:**

> ⚠️ **Offline mode** — neither transport is reachable. Treating Jira as empty; all items are CREATEs.
>
> Using defaults: `project_key: UNKNOWN` (update `delivery/jira.config.json` before pushing).
>
> ```
> CREATE epic E01 "Patient Portal & Onboarding" (phase 1–3)
> CREATE story INT-001 "…" → epic E01
> CREATE sub-task Q-001 "…" → INT-001
> …
> ```
>
> **101 operations total** (10 epic CREATEs, 25 story CREATEs, 66 sub-task CREATEs).
>
> To push: configure a transport (`/ql-setup`) then re-run `/ql-sync-jira`. The first live run will create everything shown above; subsequent runs update only what changed.

The plan is the artifact — a preview to share with a PM or paste into a ticket before Jira access is sorted. **Push it by re-running `/ql-sync-jira` live, not by hand.** The live run anchors identity on durable `intent:<id>` labels and does the JQL lookup that dedupes against existing issues; hand-creating issues from this one-line plan skips both, so the labels are lost and the next live run can't tell your manual issues from missing ones — it duplicates them.

## Configuration — `delivery/jira.config.json` (mappings + transport, no secrets, no auth)

The config carries only the **project-specific mappings** and the chosen **transport** — never credentials (OAuth handles auth for MCP; the API token lives in `JIRA_API_TOKEN`, never here). See `delivery/jira.config.example.json` for the shape:

| Key | Meaning |
|---|---|
| `tracker` | which project-tracker adapter drives the projection — `"jira"` (default if absent; the only adapter shipped today, see `references/adapter-contract.md`) |
| `transport` | **Jira adapter** — `"mcp"` or `"api"`, which pen writes the projection (default `"mcp"` if absent) |
| `base_url` | **API transport only** — the customer's Jira site, e.g. `https://acme.atlassian.net`. Omit/blank for MCP (OAuth resolves the site) |
| `project_key` | e.g. `PTSF` — the Jira project everything is projected into |
| `issue_types` | Jira issue-type **names** per level: `{ epic, intent, open_question }` (defaults `Epic` / `Story` / `Sub-task`) |
| `status_map` | ledger token → Jira workflow **status name**: `{ "⬜": "To Do", "🔧": "In Progress", "✅": "Done", "🔄": "To Do", "🚫": "Won't Do" }` (🚫 = a retired/de-scoped intent — map it to the project's terminal *cancelled* status, not its *done* one) |
| `fields` | discovered **custom-field IDs** by name: `{ scope_hash, intent_id }` (optional stamps; identity still works via the `intent:<id>` label if absent) |
| `labels` | label prefixes: `{ intent_prefix: "intent:", open_question_prefix: "open-question:", scope_drift: "scope-drift" }` |

If `jira.config.json` doesn't exist, create it from the example: ask the user for `project_key` and confirm the `transport` (`/ql-setup` should already have recorded the reachable one — carry it forward; only re-probe if it's absent), then **discover the field IDs** rather than asking. On MCP, call **`getJiraProjectIssueTypesMetadata`** for the project and **`getJiraIssueTypeMetaWithFields`** for the Story issue type; on API, `node scripts/jira-rest.mjs meta --project <KEY>`. Either way you get issue types and their fields — match field IDs by name ("Scope Hash" → `scope_hash`, "Intent ID" → `intent_id`). Record what you find; leave a field blank if the project has no such custom field (the projection degrades to label-only identity for it). Commit `jira.config.json` — it holds no secrets.

**Don't trust the example `status_map` status names — discover them too.** The names in the table above (`To Do` / `In Progress` / `Done`) are Jira's *defaults*; many projects run a customized workflow with different names (Open / Closed, or bespoke states), and a `status_map` pointing at a status that doesn't exist fails the transition at push time (Step 4) — and discovering the real names up front is cheaper than catching it at the Step 3 transition check. When first creating the config, read the transitions of any existing issue in the project (MCP: **`getTransitionsForJiraIssue`**; API: `node scripts/jira-rest.mjs transitions <KEY>`) to see the *actual* target status names, and map each ledger token (`⬜ 🔧 ✅ 🔄 🚫`) to a real one. Pick the project's terminal done-category status for `✅` — it's often **`Closed`**, not `Done` — and its terminal *cancelled* status (e.g. `Won't Do`) for `🚫`.

## Step 1 — Build the desired state (from the repo, offline)

Read the canonical sources and compute the set of issues that *should* exist:

- **`scopezilla/data/epics.json`** → one **Epic** per epic that actually has intents (skip orphan epics). Label `epic:<epic_id>`. (Epics live in the upstream mirror — they aren't per-file living intents.)
- **The living intents (`intents/INT-NNN/intent.md`)** → one **Story** per intent, under its epic. Labels `intent:<id>` and `phase:<N>`. Stamp the `scope_hash` (`node scripts/intent-ledger.mjs hash INT-00x`) and `intent_id` custom fields if those IDs are configured.
  - **Story body = the full intent statement, every story, same shape.** Not a one-line summary — mirror the complete intent so a stakeholder reading Jira sees what the repo holds. Build the body from the intent file (never retype scope by hand — transcription drifts), in this fixed structure:
    - A header line: `**<INT-id>** · Phase <N> · Epic <epic_id> · Confidence: <confidence>`
    - `**Outcome:**` (the `outcome.summary`)
    - `**Build target:**` (the `build_target`)
    - `**Guardrails:**` (the `guardrails[]` as a bullet list)
    - `**Out of scope:**` (the `out_of_scope[]` as a bullet list)
    - `**Acceptance:**` (the `acceptance` walkthrough)
    - A footer: `_Projected from Scopezilla (<INT-id>). Scope hash: <hash>. Repo is canonical; do not edit scope here._`
  - **Pass the body as markdown.** On MCP, set `contentFormat: "markdown"` on `createJiraIssue`/`editJiraIssue`. On API, put the markdown under `body_markdown` in the `fields` payload — `jira-rest.mjs` converts it to ADF (REST v3's description field is ADF, not a markdown string). Either way it's the *same* markdown body. (Rich-text **custom** fields like an "Acceptance Criteria" field are ADF, not markdown — if you ever write one, pass a `{type:doc,version:1,…}` document, not a string. The Story *description* takes markdown fine on both transports.)
  - This fixed shape is what keeps every story uniform: an under-specified body is exactly how stories drift into two formats (a short summary on some, the full statement on others). One structure, sourced from canonical data, for all.
- **unanswered `open_questions[]`** (where `answer == null`) → one **Sub-task** per question, under the intent's story. Label `open-question:<Q-id>`.
- **`delivery/intent-ledger.md`** → per-intent delivery status. Parse the markdown table: find the `Intent`, `Status`, `hash`, `PR`, and `Evidence` columns by header. Map the status cell to a token:
  - `🚫` or "retired" → **🚫** (a de-scoped intent — transition to the terminal cancelled status, don't clear the `scope-drift` handling; it carries no live hash)
  - `✅` or "delivered" → **✅**
  - `🔄` or "re-verify" → **🔄** (also add the `scope-drift` label to that story)
  - `🔧` or "progress" → **🔧**
  - otherwise → **⬜**

**Scope hash — reuse the ledger helper, never hash inline.** The value stamped into Jira must match what CI drift-checks against, so compute it with the existing script:

```bash
node scripts/intent-ledger.mjs hash INT-00x
```

(That hash is the first 12 chars of SHA-256 over the canonicalized `{title, build_target, guardrails, out_of_scope, acceptance}` — the script is the source of truth; don't reimplement it here.)

## Step 2 — Look up what already exists (idempotency)

Identity is anchored on the durable **`intent:<id>` / `epic:<id>` / `open-question:<id>` label**, never on summary text — so re-running never duplicates. Do **one batched JQL search** at the top of the run rather than a query per item:

```
project = "<KEY>" AND labels IN ("intent:INT-001", "intent:INT-002", …, "epic:E01", …, "open-question:Q-001", …)
```

Call **`searchJiraIssuesUsingJql`** with that query, requesting the `key`, `labels`, `status`, and (if configured) the `scope_hash` field. Build an in-memory `label → issue key` map from the result. That map is the whole idempotency mechanism — there is **no `jira-map.json` file** to read or commit. A lost mapping self-heals on the next run because the labels are durable in Jira.

## Step 3 — Compute and show the plan (dry run, writes nothing)

Diff desired state against what the JQL lookup found. Emit one line per operation, grouped:

- `CREATE epic <id> "<summary>"`
- `CREATE story <id> "<summary>" → epic <epicId>`
- `CREATE sub-task <id> "<question excerpt>…" → <intentId>`
- `UPDATE <key> (…)` — summary/body/scope_hash changed
- `TRANSITION <key> → <statusName> (<token>)`
- `LABEL <key> +scope-drift`
- `COMMENT <key> (delivery evidence)`

Show the user the diff and call out:

- How many issues would be **created** vs **updated** (first run creates everything; later runs are mostly updates/transitions).
- Any **TRANSITION** whose target status isn't in the project's workflow — check with `getTransitionsForJiraIssue` before pushing; a missing status means `status_map` needs fixing.
- Any **scope-drift** labels — these come from ledger rows flipped to 🔄 by `reverify` after `drift` caught a scope change. That's a real signal: the delivered build may no longer match the intent's current scope. Surface it; don't paper over it.

This step makes no writes.

## Step 4 — Confirm, then apply

Use `AskUserQuestion` to confirm: **push to Jira now** or **stop here**. Only on explicit confirmation, apply the diff via the MCP, in dependency order so parents exist before children:

1. **Epics** — `createJiraIssue` (type from `issue_types.epic`, summary, body, label `epic:<id>`) for missing ones; `editJiraIssue` for changed ones. Record each new key in the in-memory map immediately.
2. **Stories** — `createJiraIssue` (type `issue_types.intent`, summary, body, labels `intent:<id>`+`phase:<N>`, **parent = the epic's key**, and the `scope_hash`/`intent_id` custom fields) / `editJiraIssue`. Parent linking and custom fields go in the `fields` payload.
3. **Sub-tasks** — `createJiraIssue` (type `issue_types.open_question`, **parent = the story's key**, label `open-question:<id>`) for each unanswered question.
4. **Transitions** — for each story, `getTransitionsForJiraIssue` then `transitionJiraIssue` to the `status_map` target.
5. **Scope-drift labels** — `editJiraIssue` adding `scope-drift` to stories whose ledger token is 🔄.
6. **Delivery comments** — for each ✅ story with a PR or evidence, `addCommentToJiraIssue`:
   `Delivered[ in <PR>]. Scope hash at delivery: <hash>.` plus, if present, a blank line then `Evidence: <evidence>`.

**Resilience.** Treat each create/transition/comment as independent — if one fails, log it and keep going; the next run retries only what's missing (the JQL lookup finds whatever succeeded). Don't abort the whole push on a single failure.

**Graceful degradation.** If a project rejects a **parent link** or a **custom-field write** in the `fields` payload (some Jira configurations restrict these via the API), don't fail the issue: create it without the parent / without the stamp, and **report it clearly** in the summary so the user knows stories landed unparented or without `scope_hash`. The label-anchored identity still holds, so a later run can backfill once the field/parent is permitted.

Do **not** auto-commit. The user reviews the result.

## Step 5 — Summary

Report: counts (created / updated / transitioned / labeled / commented), any failures with their reason, any **degradation** (unparented stories, skipped custom-field stamps) and why, and any `status_map`/field gaps the user should fix in `jira.config.json`. If a `scope-drift` label was applied, restate which intents need re-verification (the ledger row + the drift, not a Jira decision). Remind the user to commit `jira.config.json` if it was created/changed.

## Start-work mode — mark one intent in progress (`/ql-sync-jira start INT-00x`)

A scoped, single-intent path for the moment you *begin* building an intent — far lighter than a full projection. It does **two** things, in this order, and never the second before the first:

**1 — Flip the ledger first (canonical).** Run the ledger helper so the repo records it:

```bash
node scripts/intent-ledger.mjs start INT-00x          # add --pr <branch-or-PR> to record it too
```

That command is the only writer of delivery status; it flips the row `⬜ → 🔧 In progress` (idempotent, and it refuses to reopen a `✅ Delivered` or `🔄 Needs re-verify` row — that's drift, not start-work). **If it refuses or the intent isn't in the ledger, stop** — don't transition Jira. The ledger leads; Jira follows. Never transition Jira ahead of the ledger.

**2 — Project that one intent (transition-only).** Then mirror just this story into Jira:

1. **Precondition.** `delivery/jira.config.json` exists and its `transport` is working (same Prerequisite section above — MCP connected, or the API env set + reachable). If the config is missing, run the config-creation/discovery flow first. If neither transport is available, stop — start-work mode requires a live transport because it needs to find and transition an existing story; there is no offline path for a single-intent transition (unlike the full projection, which can plan all CREATEs without Jira access).
2. **Look up the one story.** `searchJiraIssuesUsingJql` with a single-label query — `project = "<KEY>" AND labels = "intent:INT-00x"` — requesting `key`, `labels`, `status`.
   - **Not found?** This intent hasn't been projected to Jira yet. Don't create a lone story here — story creation needs the parent epic and full field machinery, which is the batch path's job. Tell the user and offer to run the **full `/ql-sync-jira`** first; it creates the story (and epic), after which start-work mode can transition it.
3. **Dry run (writes nothing).** Show the plan — `getTransitionsForJiraIssue` to confirm the target is reachable:
   - `TRANSITION <key> <currentStatus> → <status_map['🔧']> (🔧)`
   - *(optional, default off)* `COMMENT <key> "Work started[ on <branch/PR>]."` — offer it; it's harmless reporting context, not authority. Include the branch/PR only if known (e.g. from `--pr`).
   - If `status_map['🔧']` isn't among the issue's available transitions, surface it as a `jira.config.json` gap — same handling as the batch path's Step 3.
   - **No `ASSIGN`.** Assignee is Jira-side workflow data; auto-assigning from the repo would make the repo author a Jira people-field — that softens the one-way boundary. Leave assignment to humans in Jira.
4. **Confirm, then apply.** `AskUserQuestion`: push now or stop. Only on confirm: `transitionJiraIssue` to the target, and `addCommentToJiraIssue` if the comment was opted in. Treat each as independent (log-and-continue), like the batch path.
5. **Summary.** Report the transitioned key, any `status_map` gap, and restate that the ledger is canonical — Jira just reflects it.

Operations used are the same handful the batch path uses — find the story (JQL search), read transitions, transition, optionally comment — mapped to the config's transport via the table at the top (MCP tools `searchJiraIssuesUsingJql` / `getTransitionsForJiraIssue` / `transitionJiraIssue` / `addCommentToJiraIssue`, or the matching `jira-rest.mjs` subcommands). No create path either way.

## How open questions work (the "no tracker shadowing" boundary)

Unanswered `open_questions` are projected as sub-tasks so stakeholders can see what's blocking. When an answer is decided, it is authored as a `decisions/YYYY-MM-DD-<slug>.md` file (the existing convention) and reflected into the living intent via `/ql-refine-intent`. The next projection run then closes the sub-task. The authoritative answer source is `decisions/` — exactly what `/ql-check-scope` greps (`grep -rn "Q-00x" decisions/`). **Never** copy an answer out of a Jira field back into the repo.

## Test-script criteria (forward note — not yet projected)

Intents drafted with `/ql-test-script` carry individually-addressable validation criteria (`INT-00x-Cy`) in `intents/INT-00x/test-script.md`. Those ids are a deliberate **export seam**: the natural next mapping is intent → Story, **criterion → sub-task / test case**, automated evidence → comment, a drifted script → the `scope-drift` label (same as a drifted ledger row). This is **not** projected today — the criterion artifact is stable, but the downstream testing-tool/Jira test-management surface is still in flux, so we don't couple to one yet. When it firms up, map it here the same one-way way (repo canonical; a sign-off *result* is evidence that can ride back as a comment, but never as authority). Until then, `/ql-sync-jira` projects intents and open questions only.

## The read boundary (reads inform; reads don't author)

This is one-way on **authority**, not a ban on reading. Three kinds of Jira read:

- **Reconciliation reads — fine.** The JQL label lookup in Step 2 reads Jira to diff desired vs. actual. It lands in a transient in-memory map, never in scope. This is core to idempotency.
- **Interactive reads — fine.** "What's the status of PTSF-412," "show me everything labeled `phase:2`," "who's assigned this." Just ask — the Atlassian MCP's read tools (`getJiraIssue`, `searchJiraIssuesUsingJql`) are right there. The read lands in the conversation; nothing in the repo changes.
- **Authority reads — the violation.** Reading a status, an open-question answer, or a scope edit *out of Jira* and writing it into the living intents or `delivery/intent-ledger.md`. That makes Jira a writer of truth — tracker shadowing.

The trap wears a helpful hat: someone moves a ticket to Done or drops an answer in a Jira comment, and the natural urge is "pull it back so the repo's in sync." Resist it. **Jira being ahead means the *repo* is stale** — author the `decisions/` file (for answers) or update `delivery/intent-ledger.md` (for status), then let the next projection push the truth back down to Jira. The repo leads; Jira follows.

## What NOT to do

- **Don't** read scope, status, or answers *from* Jira into the repo (the authority-read violation above). Reconciliation and interactive reads are fine.
- **Don't** make the ledger or the living intents defer to Jira. `delivery/intent-ledger.md` remains the only writer of delivery status; the existing `intent-ledger.mjs` drift machinery is unchanged.
- **Don't** push without showing the plan diff and getting confirmation.
- **Don't** edit the living intents to make a projection look right — scope changes are deliberate, recorded edits via `/ql-refine-intent` / `/ql-capture-intent`, never a side-effect of reporting.
- **Don't** anchor identity on summary text. Always use the `intent:<id>` / `epic:<id>` / `open-question:<id>` labels.
- **Don't** reimplement the scope hash — shell out to `node scripts/intent-ledger.mjs hash`.
- **Don't** run the projection from CI. It's always human-validated.
- **Don't** transition an intent in start-work mode before flipping its ledger row, and don't assign or create issues there — it's ledger-first and transition-only.
