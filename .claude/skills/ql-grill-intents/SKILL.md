---
name: ql-grill-intents
disable-model-invocation: true
description: Interactively reshape existing living intents in a source-grounded, human-ratified session — split an oversized one, rebuild a thin one, or reconcile an intent against the code.
produces: >-
  No file it authors directly — the actual edits land via /ql-refine-intent (edit / split / compress) and /ql-capture-intent (net-new offshoot), each with its own decision record and re-validation. This skill owns ONE session-level decision record (decisions/YYYY-MM-DD-intent-grill.md — what was confirmed / split / rebuilt / reconciled / escalated, sources by pointer). Runs the conditional scrub-verify pass when a dirty source was opened. No commit.
---

# Grill intents — reshape living scope in a source-grounded working session

The intents under `intents/INT-NNN/intent.md` are **living**: the Trusted Guide owns them and sharpens them as the engagement learns. `/ql-vet-intent` and `/ql-analyze-intents` *find* what's wrong (read-only, one intent / the whole set). This skill is their interactive **worker** — you sit down over the real source and reshape the flagged intents into buildable ones, one at a time, ratifying every call. It's the ingest grill (`/ql-ingest-scopezilla --grill`) unwelded from ingest and pointed at intents that *already exist*.

> **Decide and route — this skill never writes an intent file.** It drives `/ql-refine-intent` (a known edit: sharpen, split, compress, reclassify, add a dependency) and `/ql-capture-intent` (a genuine net-new outcome discovered mid-session). Those skills write the decision record, flip the ledger, and re-validate. This skill owns only the **session-level** decision record — the narrative of what the sitting shaped and why. Reimplementing refine's governed-edit discipline here would fork it (see `decisions/0021`).

## The one rule that governs the whole session — facts vs. decisions

**Every source establishes *facts* — what *is*. Every change to Intent is a *decision* the human owns.** Look up facts freely (read the code, the mirror, the notes); put every decision to the Trusted Guide and wait. This is the firewall that keeps the grill from *grading its own homework*:

- The **codebase** is an allowed, valuable source — the build teaches you an intent was oversized, thin, or missing a platform-forced dependency. But code reveals **what got built** (a fact); it **never authors the intent** (a decision). When code and intent disagree, surface it *bidirectionally* as a question — **"the code does X, the intent says Y — which is right?"** — and let the human resolve the direction: refine the intent, **or** log a build defect (a note / issue, not a refinement). Never rewrite an intent to match the code by default.
- **No source has precedence.** Scopezilla says X, the code shows Y, the session notes say Z — you surface the three-way tension and the human resolves it. You make the conflict *legible and contestable*; you don't settle it by rule.

> **Harness note.** The steps below use `AskUserQuestion`. In a harness without it, ask the same question as plain text with the options enumerated — the shape of the question matters, the tool doesn't.

## Step 1 — Establish the worklist

- **Explicit target named** ("grill INT-007", "grill phase 2", "grill these three") → that's the worklist. Read each `intents/INT-NNN/intent.md`.
- **No target ("grill my intents")** → don't grill blind and don't grill everything. Run the graders and propose *their* flagged set as the worklist:

  ```bash
  node scripts/intent-ledger.mjs validate    # structural floor first — a malformed file makes the rest unreliable
  ```

  Then reason with `/ql-vet-intent` (per intent) or `/ql-analyze-intents` (cross-set) as the finder, and propose the intents they flag (oversized, thin, vague, drifting, conflicting) via `AskUserQuestion`. The human trims. **Never re-litigate a clean intent** — grilling solid scope is friction with no payoff.

**Cap the session to a phase or an explicit set.** If the flagged set is larger than one sitting can hold (roughly a phase), say so and work it **phase-by-phase** rather than grinding dozens of prompts: *"14 intents flagged across 3 phases — that's more than one session. Start with phase 1's 5?"* Don't silently truncate; name what's deferred.

## Step 2 — Confirm the sources to ground against

Auto-detect what's present and confirm via `AskUserQuestion`; default to what's available:

- **In-repo Scopezilla mirror** (`scopezilla/`) — present after ingest. Clean.
- **Session content** — notes / a transcript / an ask the human provides this session.
- **The codebase / org** — the sfdx source in the repo, or the authed org (only offer if `sfdx-project.json` exists or an org is authed). Bounded by the facts/decisions firewall above.

Then **offer, never force,** the rich source:

> *If you have the original Scopezilla project handy (the full discovery notes / transcripts), point me at it and I can ground rebuilds in the richer source — same as ingest. (path, or skip)*

The upstream project is not in the repo and can't be auto-detected — the human supplies it only when they want the extra context. **Reading it flips on the full membrane + scrub** (Step 5).

## Step 3 — The session

Go intent by intent (frontier-rounds for a multi-intent worklist — group the questions whose prerequisites are settled, ask a round, let the answers reshape the tree, recompute; one-at-a-time relentless for a tiny 1–3 set). For each intent, form a view from the sources, then **talk it through** — the human ratifies every call. The four shapes are *judgment prompts*, not a routing table; the ~24-hour build-validate-demo cycle is the yardstick to reason against, not a gate:

- **Good as-is** → confirm it, move on. Don't re-litigate solid scope.
- **Oversized** (won't plausibly land in one build-validate-demo cycle) → **split** it into children with the human; each child carries the parent's provenance.
- **Thin / vague / drifting** → **tighten or rebuild** into a concrete build target with provable acceptance. This is the deepest read of any dirty source — hold the membrane.
- **Reconcile against the build** → where the code reveals the intent is wrong (or the build diverged), surface the bidirectional question so the human decides: a scope correction vs. a build defect.

**Lane boundary — grill reshapes; it does not originate.** A genuinely net-new outcome discovered mid-session (no intent covers it) is a **`/ql-capture-intent`** proposal, never something the grill silently absorbs. The pull to author brand-new scope is the signal you've left grill's lane. (Grill = existing intents → sharper; capture = raw input → new intents.)

## Step 4 — Route each ratified call

This skill decides *with* the human, then hands each edit to the door that writes it — so every change carries its own decision record and re-validation:

- **Known edit to one intent** (sharpen acceptance, tighten the build target, add a dependency, reclassify) → **`/ql-refine-intent`**.
- **Split an oversized intent** → **`/ql-refine-intent`** (its split routes independently-deliverable children out to `/ql-capture-intent` where they're genuinely new).
- **Compress a bloated intent** → **`/ql-refine-intent`** (Step 2b compression).
- **A net-new outcome** the session surfaced → **`/ql-capture-intent`**.
- **A build defect** (the build is wrong, not the intent) → a delivery note / issue; do **not** edit the intent to match.
- **A systematic Scopezilla defect** → offer to feed it upstream via the cross-repo handoff (see AGENTS.md), so the next engagement's draft is better.

Surface a **Delivered-intent caution** before any edit to a ✅ Delivered intent: `/ql-refine-intent` will flip it to 🔄 Needs re-verify (the edit is a scope change to shipped work). "Closed is closed" is the default — an offshoot of delivered work is usually cleaner as a new intent citing it (`/ql-capture-intent`) than a reopen. Let the human choose.

## Step 5 — The membrane, and the conditional scrub

The **pointer-not-quote membrane** always applies: what lands in a repo file (an intent, the session decision record) is *derived and clean* — a pointer to where it came from (an upstream intent id, an epic, "discovery session 2026-07-14"), **never** a lifted quote, a person's name, PII, or internal/commercial deal detail. The repo is often handed to the customer and git history is permanent. Hold context in the session; don't stage dirty source in a scratch file, not even a gitignored one.

The independent **scrub-verify pass is conditional** — run it only when a **genuinely dirty source was opened this session** (the upstream Scopezilla project, or sensitive pasted notes). A session grounded only on the clean mirror + in-repo code doesn't need it — nothing dirty was read, and a blind scrub is ceremony with no trust payoff. Code is not "dirty" for this purpose (the membrane already forbids landing it verbatim), though it can carry secrets — the same derived-prose-only rule covers it.

**When the scrub is warranted,** give a reader that **never saw the source** only the authored output — the new/changed `intents/` files and the session decision record, **never** the transcripts or any source path — and ask: *"These files are about to be committed to a repo handed to the customer. Flag anything that reads like a verbatim quote, a personal name, PII, or internal/commercial deal detail — judged purely on the face of these files."* Prefer a fresh-context subagent (in Claude Code, the `Explore` agent — clean context, read-only); if the harness can't, use a fresh session or an isolated re-read, and say which form you used. Resolve every finding before the files are considered landed.

## Step 6 — The session decision record

Write **one** `decisions/YYYY-MM-DD-intent-grill.md` (copy `decisions/TEMPLATE.md`) recording what the sitting **confirmed / split / rebuilt / reconciled / escalated** and **why** — sources cited **by pointer, never quoted** (the membrane applies here too). This is the narrative paper trail for the shaping; the *per-edit* decision records are written by `/ql-refine-intent` / `/ql-capture-intent` as they run. Sweep this record against `.claude/prose-style.md` before showing it.

## Step 7 — Close out

Report: how many intents were confirmed / split / rebuilt / reconciled / escalated; which doors the edits were routed through; whether the scrub-verify ran and what it flagged (or "not needed — no dirty source read"); any ✅ Delivered intents flipped to 🔄 Needs re-verify; and any Scopezilla upstream issue drafted. Then refresh the README delivery index if any routed edit changed the ledger: `node scripts/intent-ledger.mjs index --write`. Don't commit — the human reviews the diff.

## What this does NOT do

- It does **not** write or overwrite an intent file. Every edit routes to `/ql-refine-intent` or `/ql-capture-intent`, which own the governed edit, the decision record, and the drift/re-verify flip. Forking that discipline here breaks `decisions/0021`.
- It does **not** let a source redefine Intent. Sources establish facts; the human owns every decision. Rewriting an intent to match the code by default is the grading-its-own-homework failure the firewall exists to prevent.
- It does **not** originate scope. A net-new requirement is a `/ql-capture-intent` proposal or an upstream flag — the grill reshapes what exists.
- It does **not** grill clean intents, or grind a whole engagement in one sitting. It works a flagged set, capped to a phase; a larger set is worked phase-by-phase, never silently truncated.
- It does **not** duplicate the graders' checks. It *calls* `/ql-vet-intent` / `/ql-analyze-intents` to find the worklist; they stay the read-only finders.
- It does **not** commit. The human reviews the diff first.
