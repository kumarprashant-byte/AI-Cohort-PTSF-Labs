# Tracker adapter contract

How to add a project-tracker adapter to `/ql-sync-jira` **without changing the sync flow** (see `decisions/0046`). Read this only when adding a tracker; the Jira adapter is the worked example — everything in `SKILL.md` below the "Tracker adapters" section *is* the Jira adapter.

The projection is tracker-neutral. The skill owns the flow; an adapter owns only the tracker-specific pieces. `tracker` in `delivery/jira.config.json` selects the adapter (default `"jira"`).

## What the skill owns — an adapter never touches these

`build desired state → look up what exists → show the diff → confirm → apply`, plus: desired state built from the repo (`intents/`, `intent-ledger.md`, `scopezilla/data/epics.json`); **label/tag-anchored identity** (never summary text); **ledger-is-canonical** (the repo is the only writer of delivery status); the **scope hash** (always `node scripts/intent-ledger.mjs hash …`, never reimplemented); the dry-run-then-confirm checkpoint; and the **one-way read boundary** (a tracker read never authors repo scope). Building on these is the whole point — an adapter that reimplements any of them is wrong.

## What an adapter provides

1. **Primitive set** — the operations the flow calls, implemented for this tracker. The flow names the abstract op; the adapter maps each to a tool/subcommand (Jira maps them to MCP tools or `scripts/jira-rest.mjs` subcommands — see the transport table in `SKILL.md`):

   | Abstract op | Purpose |
   |---|---|
   | reachability probe | confirm the transport is live and the target project/space is visible |
   | discovery | list issue/item types + fields (to fill config) |
   | find-existing | query items by **durable identity tag** (the idempotency lookup) |
   | list-states | the transitions/states available on an item |
   | create / edit | create a missing item, update a changed one |
   | set-state | move an item to the mapped status |
   | comment | attach delivery evidence |

2. **Concept mapping** — how the three projected levels land in this tracker's hierarchy: **epic → ?**, **intent → ?**, **open-question → ?**, including how children link to parents, and the ledger-token → tracker-status map (`⬜ 🔧 ✅ 🔄`). Jira: Epic / Story / Sub-task, parent-linked, `status_map` in config.

3. **Identity mechanism** — a durable, queryable tag equivalent to Jira's `intent:<id>` / `epic:<id>` / `open-question:<id>` labels. Idempotency depends on it: re-running must find what exists, never duplicate. If the tracker has no labels, the adapter must define an equally durable identity (a custom field) and its find-existing primitive must query *that*.

4. **Config keys** — the adapter reads its own keys from the (secret-free, committed) config: project/space id, the type + status maps, discovered field ids, and any transport selector. **Credentials are env-only, never in the file** (mirror the Jira `JIRA_API_TOKEN` rule).

5. **Transports (optional)** — an adapter may reach its tracker more than one way (Jira has MCP and API), selected by an adapter-owned key. Multiple transports must be **behaviorally identical** — swapping the pen never changes what's drawn (`decisions/0011`).

## Invariants every adapter honors

- **One-way.** Never writes scope, status, or answers back into the repo.
- **Zero-dep for any shipped script.** A transport script talks to the service over plain `node`/`fetch`, no client library, no `npm install` (the `jira-rest.mjs` bar, `decisions/0011`).
- **Identity by tag, not summary text.**
- **No push without the dry-run + explicit confirm.**
- **Resilience:** each create/edit/transition/comment is independent (log-and-continue); the next run retries only what's missing via the find-existing lookup.
- **Graceful degradation:** if the tracker rejects a parent link or a field write, create the item without it and report it — label/tag identity still lets a later run backfill.
- **Never run from CI** — always human-validated.

## Adding a tracker (checklist)

1. Implement the primitive set — either an MCP, or a zero-dep engine script. A script primitive ships as a **template engine script** invoked **repo-relative** (`node scripts/<tracker>-rest.mjs …`), exactly like Jira's `scripts/jira-rest.mjs` — *not* co-located with the skill (mind the path-form rule: template scripts are repo-relative, co-located skill scripts use the vendored `.claude/skills/` \|\| `.agents/skills/` \|\| `${CLAUDE_PLUGIN_ROOT}` fallback).
2. Define the concept mapping + identity mechanism above.
3. Add the adapter's config block to `delivery/jira.config.example.json` (mark its keys like the Jira ones), keeping the file secret-free.
4. Add a `tracker: "<name>"` branch in `SKILL.md` that routes the flow's abstract ops to your primitives.
5. Document it here as a sibling to the Jira example.

No step changes the flow. If you find yourself editing the build-desired-state, identity, ledger, scope-hash, or confirm logic, stop — that's the skill's, not the adapter's.
