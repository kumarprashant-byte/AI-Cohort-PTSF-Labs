---
name: ql-drive-meshmesh
disable-model-invocation: true
description: Drive a MeshMesh build agent over its remote MCP server — preflight, plan, human-approve, build, monitor, and pull results back. Returns facts, makes no governance decisions.
produces: No file of its own — returns facts to the caller (approved plan text, agent status, the report artifact as markdown, and the local paths of metadata retrieved from the org via `sf project retrieve`). Governance and scope write-back are the wrapper's job, not this skill's.
---

# Drive MeshMesh over MCP — the build-engine primitive

MeshMesh Studio exposes a **remote MCP server** that lets an outside agent (this session) drive its Salesforce-aware build agents: start one, read its plan, approve, switch plan→build, watch it work, and pull what it produced. This skill is the **intent-free mechanics** of that loop — nothing more.

**What this is and isn't.** This is a *primitive*, not a delivery move. It carries **no** governance: no phase gate, no intent ledger, no conformance check, no scope write-back. It runs the loop and **returns facts** — the plan text, the agent status, the report markdown, the paths of the metadata it retrieved. A skill that *wraps* this one decides what those facts mean:

- **Launchpad delivery skills** wrap it in governance (phase gates, the ledger, conformance) — the build satisfies a ratified Intent and its evidence lands in the trust chain.
- **Scopezilla's `prototype`** installs just this skill on-demand and wraps it in learn-and-write-back — a throwaway POC whose retrieved metadata is *evidence*, never a deliverable (Scopezilla ADR `0038`).

Keep that line clean: **this skill never edits scope, marks anything "done," or speaks for the wrapper.** If you're tempted to update a ledger row or write a decision here, that belongs in the wrapper.

> **This capability is young and will mature.** The facts below are pinned to the 2026-08-18 eval; the MeshMesh MCP surface, the ECA path, and the auth flow are all moving. **So at the start of every drive — before Step 1 — fetch `llms-full.txt` first** (`WebFetch` in Claude Code, or your harness's web-fetch / `curl`) and reconcile the steps below against it: trust the live server over this body for the **tool surface only** — tool names, modes, params — and flag drift so the skill gets corrected. It does **not** override the plan→approve→build sequence or the safety gates; those are this skill's, not the docs'. **Auth is also excepted:** the docs' auth section is wrong (see Step 0), so the skill wins there. If the docs can't be fetched (offline, proxy, allowlist), **don't stall** — proceed off the pinned facts below and say you're running unreconciled.

## Inputs

Whether a wrapper or a human invokes this, the primitive needs:

- **The build ask** — natural-language description of what to build. From a wrapper, this is derived from an intent's build target + acceptance (delivery) or an epic (prototype); from a human, they state it.
- **The target org alias** — the local `sf` alias used for the metadata retrieve in Step 6b. **It must be authed to the same org the MeshMesh vault connection builds into** (see Step 1) — that identity match is what makes the org the seam. If you don't have one, say so; the build can still run, but 6b can't.
- **Optional scope context** — an intent's build target/acceptance or a design note, attached as References (Step 2) to ground the plan. Keep it to what the build needs.

## Step 0 — The MCP server (once per machine)

MeshMesh isn't wired by `/ql-setup`. Add the server if it's absent:

- **Claude Code:** `claude mcp add --transport http meshmesh https://gateway.meshmesh.io/mcp`
- **opencode:** an `mcp` block in `opencode.json` — `"meshmesh": {"type": "remote", "url": "https://gateway.meshmesh.io/mcp"}` (opencode uses `remote`, not Claude's `http` — see the plugin's `decisions/0029`).

**Auth quirk — the docs are wrong about this, so don't fight the `/mcp` browser flow.** The published docs claim the standard `/mcp` OAuth browser redirect, but in practice the server hands back its **own `authenticate` tool** (it returns an authkit URL) plus a `complete_authentication` tool; `/mcp` launches no browser. Call `authenticate`, open the URL it returns, then `complete_authentication`. `get_user_details` confirms who you're connected as.

Endpoint facts: `POST https://gateway.meshmesh.io/mcp` (Streamable HTTP, stateless — `GET`/`DELETE` return 405).

**MeshMesh docs:** the full agent-readable dump is <https://docs.meshmesh.io/llms-full.txt> — fetch it at the start of every drive (see the callout above; `WebFetch` or your harness's fetch / `curl`) to reconcile the tool surface; the human pages are <https://docs.meshmesh.io/mcp> and <https://docs.meshmesh.io/mcp/connect>. Trust *this* skill over their **auth** section (see the Auth quirk above).

## Step 1 — Preflight the connection (never assume one)

MCP-driven **build** needs the MeshMesh agent to reach a Salesforce org, and that org must be a **server-side (vault) connection** — the only kind `list_connections` returns.

```
get_user_details            # who am I connected as?
list_connections            # the server-side orgs an agent can be attached to
```

**THE CONNECTION CONSTRAINT.** An org connected through the MeshMesh desktop/web app uses **desktop-only credentials the remote gateway cannot use**. Those never appear in `list_connections`. A build over MCP requires an **External Client App (ECA) connector** (refresh token stored server-side — a MeshMesh feature since 2026-07-24). *(In the 2026-08-18 eval, ECA setup hit a client-side error — `Cannot read properties of undefined (reading 'length')` — **unconfirmed whether env-specific; do not assume the ECA path is broken.**)*

Decide from what `list_connections` returns:

- **A usable server-side org exists** → note its connection id, and `get_connection <id>` to read its **org identity** (instance URL / org id). **Match that against a local `sf` alias** (`sf org list`) — the retrieve in Step 6b pulls from *that org*, so the local alias and the vault connection must be the **same org**, or 6b retrieves from the wrong place (or nothing). If no local alias matches, say so now; the build can still proceed, but call out that metadata pull-back will need `sf org login` to that org first. Then proceed.
- **No usable server-side connection** → **degrade gracefully, don't fail.** Tell the caller plainly: MCP can still drive **planning** (Steps 2–3), but the **build itself must be human-triggered in the MeshMesh web app** because no server-side org is attachable. Offer the plan-over-MCP path and stop before Step 4's build. This is the sanctioned fallback, not an error — and not a dead-end: after the human builds in the web app, you can reconnect (`list_agents` → the results steps) to pull the report and retrieve metadata.

## Step 2 — Start in Plan mode

Always plan first — the human approves before anything changes.

```
start_agent  name:"<short name>"  prompt:"<the build ask>"  mode:"plan"
             connectionIds:[<id from Step 1, if building later>]
             referenceIds:[<optional — see below>]
```

`start_agent` returns an `agentId` — carry it through every later call.

**Optional scope context as References.** If the caller hands you scope context (an intent's build target + acceptance, a prototype's design note), attach it so the plan is grounded: `reference_create name:"…" content:"<markdown>"` → pass the returned id in `referenceIds` (or `attach_reference` to a running agent). Keep it to what the build needs; this is context, not the whole scope.

## Step 3 — Surface the plan for approval

Poll until the agent has a plan, then hand the **plan text** to the caller's approval gate:

```
get_agent_status  agentId:<id>     # running | waiting (question/approval) | finished + recent messages
get_plan          agentId:<id>     # the plan text, mode/phase, and whether it awaits approval
```

`get_agent_status` reports **four** wait states, not two — it can be waiting on a **question**, a **confirmation**, a **connection**, or **plan approval**. Handle each, don't just watch for approval:

- **waiting on a question / confirmation** → surface it to the human and relay their answer with `continue_agent agentId:<id> message:"<answer>"`. Don't answer build-shaping questions on your own.
- **waiting on a connection** → the agent needs an org attached; `attach_connection agentId:<id> connectionId:<id>` (from Step 1), then re-poll.
- **waiting on plan approval** → this is the gate below.

Return the plan verbatim — **the human approves it, not you.** For refinement in Plan mode:

- `edit_plan agentId:<id> instruction:"<what to change>"` — the agent revises its own plan; re-`get_plan` to see the result.
- `continue_agent agentId:<id> message:"<answer/direction>"` — answer a question or give direction while still planning.

Loop here until the caller explicitly approves. Do not advance to build on your own judgment that the plan "looks good."

## Step 4 — Build on explicit approval

**Confirm it's not production first.** Build mode makes real changes to the connected org. The Trusted Guide owns prod promotion (the Launchpad ethos) — so if the vault connection points at a production org (`get_connection` org identity from Step 1), stop and confirm explicitly with the human before building. Default target is a sandbox or scratch org.

Only after the caller approves **and** a server-side connection exists (Step 1):

```
continue_agent  agentId:<id>  mode:"build"  message:"Approved — proceed with the build."
```

`mode:"build"` switches plan→build **and** resumes in one call. (The tool's own description prose says "write" — the schema enum is `build`; use `build`.) Alternatively `switch_agent_mode agentId:<id> mode:"build"` then `continue_agent` — same result in two calls. If Step 1 found no server-side org, **do not reach this step**; you're on the plan-over-MCP fallback.

## Step 5 — Monitor and narrate

Poll `get_agent_status` and narrate progress for the caller. MeshMesh surfaces the agent's **self-correction** — in the eval it caught the screen-flow-lookup trap itself (retrieved a real flow from the org, switched to the `flowruntime:lookup` ComponentInstance, deactivated the Active version before redeploy, re-verified). That's worth showing; it's the signal the build is real.

**A build isn't only "running" or "finished."** It can pause mid-build on the same wait states as Step 3 — a **question** or a **confirmation**. Don't read a paused agent as "still working" and poll forever: when status shows a wait state, surface it and relay the human's answer with `continue_agent`, then resume polling. Only `finished` moves you to Step 6.

**If you lose the session** (context cleared, session ended, or you're reconnecting after a web-app build): `list_agents` recovers the `agentId`, then re-poll `get_agent_status` — the agent runs server-side and doesn't need this session alive. The agentId is the only handle you need to carry.

## Step 6 — Pull results back: two artifacts, two purposes

**Do both.** They answer different questions and neither substitutes for the other.

**6a — The report (narrative).** `list_artifacts agentId:<id>` → `get_artifact artifactId:<id>` for the "what was built + how to run it" markdown. This is for the demo and the wrapper's write-back. Return the markdown to the caller.

**6b — The metadata (source of truth), from the *org*.** Retrieve the built components **from the Salesforce org** — **not** by extracting MeshMesh's sandbox. The org is the seam; the sandbox is not. This requires the local `sf` alias to be authed to the **same org** the vault connection built into (the identity match from Step 1); if it isn't, `sf org login` to that org first, or skip 6b and return the report only.

```bash
sf project retrieve start --metadata <Type:Name> [--metadata <Type:Name> …] --target-org <alias>
```

Name what to retrieve from the report's (6a) component list, into the caller's local `force-app` project. If the report doesn't cleanly enumerate `Type:Name` (this surface is young — see the maturity note), fall back to a manifest (`--manifest package.xml`) or a broader retrieve by type, and reconcile against the report. Return the retrieved paths. If the target org differs from the MeshMesh connection, say so — the human decides which org is canonical.

## What this returns

A facts bundle for the wrapper — nothing interpreted:

- the **approved plan text** (Step 3),
- the final **agent status** (Step 5),
- the **report markdown** (6a),
- the **local paths** of metadata retrieved from the org (6b),
- or, on the fallback, the plan text plus a clear note that the build must be finished in the MeshMesh web app (Step 1).

## What this does NOT do

- **No governance.** No phase gate, no ledger flip, no conformance run, no PR. The wrapper owns all of that.
- **No scope write-back.** It never edits intents, writes a decision, or records a `prototype:` outcome. It returns facts; the wrapper turns them into scope or delivery.
- **No approval on your behalf.** The human approves the plan and owns whether the build proceeds. You surface, you don't sign.
- **No sandbox extraction.** Metadata comes back via `sf project retrieve` from the org, never by scraping MeshMesh's sandbox.
