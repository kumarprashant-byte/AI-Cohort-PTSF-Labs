---
name: ql-capability-map
disable-model-invocation: true
description: Generate a self-contained, offline interactive capability map of the whole scope — Phase to Epic to Intent — to present or walk a client through. Read-only; never edits scope.
produces: >-
  `delivery/capability-map.html` — a self-contained, offline interactive Phase to Epic to Intent map. Read-only over scope; a derived view recomputed each run, never edits an intent.
---

# Capability map — see and present the whole scope

This produces one self-contained HTML file — `delivery/capability-map.html` — that lays out the engagement as **Phase → Epic → Intent (capability)**, color-coded by phase, with click-to-drill-down panels. No server, no network, no dependencies: it opens from `file://` and works offline in a conference room. It's built for the **Intent & Align** phase — an Intent Architect walking a Product Owner through scope, or facilitating an intent gap-closing session.

It is a **derived view**, the same family of artifact as the README delivery index: computed fresh from canonical sources every run, never hand-maintained. It is strictly **read-only over scope** — it displays and helps you interrogate the intents; it never edits one. Refinement still flows through `/ql-refine-intent` and `/ql-capture-intent` (the governed, ratified paths).

## What it reads (all read-only)

- `intents/INT-NNN/intent.md` — the living canonical intents (the capabilities), including their internal dependencies. **This is the structural authority:** each intent's own `phase:`/`epic:` frontmatter decides which phase band and epic column it lands in.
- `scopezilla/data/epics.json` — epic names, descriptions, confidence, KB sources (**enrichment** for the columns the intents define)
- `scopezilla/data/roadmap.json` — phase names and the preferred epic column order (**enrichment + ordering**, not placement)
- `delivery/intent-ledger.md` — per-intent delivery status, overlaid as a badge
- `AGENTS.md` (ENGAGEMENT block) — optional; the "Client / project" line becomes the map title

**Why the intents drive structure, and the mirror only enriches.** `scopezilla/` is a read-only snapshot refreshed only by `/ql-ingest-scopezilla`; the living intents are refined in-repo continuously (`/ql-refine-intent`, `/ql-capture-intent`). So when scope is restructured in-repo — an intent re-homed to a different phase or epic — the mirror lags until the next reconcile. If the map read structure *from the mirror*, it would render the stale skeleton and silently contradict the very intents it claims to visualize. Instead the intent always wins on placement; the mirror supplies the phase/epic *names*, descriptions, KB sources, and preferred column order for whatever the intents define. Where they diverge — an intent in a phase the mirror doesn't schedule its epic in, or an epic the mirror doesn't know at all — the map **follows the intent and surfaces the divergence as a data note** telling you to run `/ql-ingest-scopezilla` to reconcile the mirror. A capability is never demoted to an "unmapped" ghost just because the frozen mirror hasn't caught up.

## Step 1 — Regenerate

Run from the engagement repo root (the generator is vendored with this skill into the harness's skills dir — `.claude/skills/` or `.agents/skills/` — so the chain tries both, then falls back to the plugin for a plugin-only checkout). It reads the repo from your current directory and writes the map there:

```bash
node .claude/skills/ql-capability-map/capability-map.mjs --open \
  || node .agents/skills/ql-capability-map/capability-map.mjs --open \
  || node "${CLAUDE_PLUGIN_ROOT}/skills/ql-capability-map/capability-map.mjs" --open
```

It writes `delivery/capability-map.html` and prints the `file://` URL plus a one-line summary (intents · epics · phases) and any data notes. `--out <file>` writes somewhere else.

If the script exits with **"No intents/ directory yet"** or **"Missing … Run /ql-ingest-scopezilla"**, scope hasn't been ingested into this repo yet — run `/ql-ingest-scopezilla` first, then re-run this. (The map can only show what's been ingested; it never invents scope.)

## Step 2 — Open it

Open the printed `file://` URL in a browser (or `open delivery/capability-map.html` on macOS). Each phase is a band; each epic a column; each intent a card you can click for its full panel (build target, acceptance, dependencies, ledger status).

## Step 3 — Read what it surfaces, then facilitate

Before presenting, skim the summary line and the footer **data notes** — these are signals worth knowing going in, not bugs in the map:

- **Low-confidence epics/intents** (Assumed / Draft) — the parts of scope still to be validated with the Product Owner. These are exactly the conversations a gap-closing session exists to have.
- **Unanswered open questions** carried on intents — decision points blocking lock-down.
- **Dependency cycles** between intents (A depends on B *and* B depends on A) — when surfaced, they mean sequencing isn't yet settled; intents within an epic fall back to ID order. Worth flagging to the architect as a resequencing candidate, not something this skill fixes.
- **Mirror-reconcile notes** ("placed in phase N per the intent, but the mirror schedules its epic in phase M", or "epic X isn't in the mirror") — the intents have been restructured in-repo since the last `/ql-ingest-scopezilla`. The map is showing the *current* intent structure (correct); the note is telling you the read-only `scopezilla/` mirror is behind. Run `/ql-ingest-scopezilla` to reconcile the mirror when convenient — the map is right either way, but reconciling clears the notes and restores the mirror's epic/phase names.

Use the drill-down live: when the PO questions a capability, open its card and ground the discussion in the actual build target and acceptance. When the session surfaces a change, **don't edit scope here** — route it: a correction to a known intent → `/ql-refine-intent`; net-new scope from the discussion → `/ql-capture-intent`. Both record a decision and re-validate. Then **re-run Step 1** so the map reflects the ratified change.

## What this does NOT do

- It does **not** edit, create, or resequence intents. It's a read-only view; scope changes go through `/ql-refine-intent` / `/ql-capture-intent`, which the Trusted Guide ratifies.
- It does **not** refresh the Scopezilla mirror or ingest new scope — that's `/ql-ingest-scopezilla`. The map only renders what's already in the repo.
- It does **not** update on its own. It's a snapshot at the moment you run it; re-run after any refinement to see the current shape.
- It does **not** decide confidence or status — it displays what the intents, epics, and ledger already record.
