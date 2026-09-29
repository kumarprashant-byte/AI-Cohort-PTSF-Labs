---
name: ql-refine-intent
description: >-
  Make one governed, recorded edit to an existing living intent — relabel, resequence, reclassify, edit its build target/guardrails/acceptance/out-of-scope, add a dependency, or compress a bloated intent back to scope. This edits the human-owned Intent itself; it is NOT for when a build or implementation doesn't match the intent (that's a defect — use /ql-diagnose; never change Intent to fit broken code). Use when you know which intent to change and what scope wording to change. Triggers — "refine intent", "reword this intent", "resequence INT-", "compress this intent", "/ql-refine-intent".
produces: An edited `intents/INT-NNN/intent.md` + a `decisions/` record, re-validated; refreshes the README delivery index, and flips the ledger row to Needs re-verify if the edit drifted a delivered intent. No commit.
---

# Refine an intent — a governed edit to the living scope

The intents under `intents/INT-NNN/intent.md` are **living**: Scopezilla drafts them, but the Trusted Guide owns them and refines them in-repo as the engagement learns. This skill makes one such edit *disciplined* — so a change to scope is always deliberate, recorded, and re-validated, never a silent hand-edit that the rest of the trust chain can't see.

This is the targeted-edit door: you already know **which** intent and **what** to change. For unsorted input — meeting notes, a transcript, an ask that might create *or* change intents — start with **`/ql-capture-intent`**, which extracts the candidates and routes the targeted ones back through this skill's mechanics. If instead the change is *exploratory* — you don't yet know the edit, or it's several intents that need reshaping against the real source (the codebase, the Scopezilla mirror, discovery context) in a working session — that's **`/ql-grill-intents`**, which grills the set interactively and routes each ratified edit back through this skill. Come here when the edit is known; go there when it needs to be worked out.

> **Authorship stays human.** You (the agent) draft the edit and prepare the record; the change to Intent is the Trusted Guide's call. Propose, show the diff, let them ratify — then record it with `node scripts/intent-ledger.mjs ratify INT-NNN --by "<their name>"`. A scope edit leaves any earlier ratification stale, and `deliver` refuses stale. You never quietly redefine scope. Sweep the edited prose against `.claude/prose-style.md` before you show it — refinement should leave the intent cleaner, not just changed.

## When each refinement applies (the cases from the field)

| Situation | Refinement |
|---|---|
| "Release Planning" isn't really an intent — it's a delivery-management capability | **Demote / relabel.** Retire it as an intent (or rewrite it into a real outcome). Record why. |
| The intent assumes a Salesforce build, but the work actually lives in another system | **Reclassify.** Often the right move is: this isn't a build intent, it's an **external dependency** on another intent. Rewrite accordingly. |
| The duplicate-rule intent is sequenced first, but the team wants a demo-able app first | **Resequence.** Change `phase:` in frontmatter. (The scope hash ignores phase, so this never trips false drift.) |
| The title / build target / a guardrail / acceptance is wrong or imprecise | **Edit it.** These four sections *and the title* are the scope hash — editing any of them *does* trip drift on a delivered intent (see below). |
| Another team or system must be ready first; another intent must ship first | **Add a dependency** (external / internal) to the `## Dependencies` section. |
| The intent has bloated — repeated updates piled on source detail, rationale, mechanics, and duplicated constraints until it's hard to scan and build to | **Compress** (Step 2b). Trim it back to what defines the scope; route the rest to its right home. |

## Step 1 — Locate and read the intent

Take the id from the user (e.g. `INT-007`). Read `intents/INT-NNN/intent.md`. If it doesn't exist, list intents (`node scripts/intent-ledger.mjs hash`) and ask. Note its current ledger status — `node scripts/intent-ledger.mjs drift` / the ledger row — because **refining a Delivered intent has consequences** (Step 4).

> **Confirm you're editing the latest copy of *this* intent (warn, don't block).** On a parallel team, this exact intent may have moved on the shared branch since your session started — editing a stale copy silently overwrites that change. Run:
>
> ```bash
> node scripts/intent-ledger.mjs currency INT-NNN
> ```
>
> If it flags the intent as **changed on the shared branch** (a hash divergence), stop and offer to `git pull --rebase` before editing, then re-read the file. This is a **loud warning, not a wall** — you can proceed if you know the change is yours to make (offline/VDI degrades cleanly; CI `drift` remains the backstop). The point is that overwriting a teammate's edit becomes a *conscious* choice, never a silent one.

> **Reopening a *delivered* intent is a deliberate call — offshoots usually want a new intent.** If the row is ✅ Delivered, first ask whether this is really a *correction to the delivered scope* (refine here — and accept the drift flag that follows, per Step 4) or an **offshoot / follow-on** (the content for pages you shipped, a phase-2 capability). An offshoot is almost always cleaner as a **new intent citing this one** (`/ql-capture-intent`) than as a reopen — "closed is closed" is the default. Reopening isn't forbidden (some projects want it), but say which one you're doing and why, and let the human choose. This mirrors the disposition default in `/ql-capture-intent` Step 3.

## Step 2 — Make the edit

Edit the file directly. Keep the format intact — the toolchain parses it:

- **Frontmatter** (`id`, `phase`, `epic`, `confidence`, `origin`, `title`). Resequencing = change `phase:`. Relabelling = change `title:`. **Don't change `id`** — it's the join key for the ledger, test script, PRs, and Jira; renumbering orphans all of them.
- **Canonical sections** — keep the exact `## ` headings: `Outcome` (optional), `Build target`, `Guardrails`, `Out of scope`, `Acceptance`, `Success criteria` (optional), `Dependencies`, `Open questions`. Guardrails / Out of scope / Success criteria are bullet lists; Build target / Acceptance are prose.
- **Outcome** (optional) — the business "why" carried through from Scopezilla's `outcome` field: a one-line `summary` (the change in the world this intent produces), optionally followed by `- Baseline:` / `- Target:` / `- Window:` metric bullets when a real, measured baseline exists. It's context, not a build instruction — **excluded from the scope hash** (editing or backfilling it never trips drift), and not required (many intents have only a summary, or none). Don't fabricate a metric; omit the bullets when there's no real baseline. The measurable, *provable* criteria a test can fail live in `Success criteria`, not here.
- **Success criteria** (optional) — measurable, technology-agnostic outcomes (`- SC-1: …`) separated from the prose `Acceptance` walkthrough: *what* must be objectively true, stated so a test could fail it ("revocation observable within one page refresh", "zero leaked rows via SOQL"), not *how* it's built. It is **excluded from the scope hash** and is **not required** (a thin intent may have none). It's the natural home for the "is this provable?" rigor `/ql-vet-intent` checks; `/ql-test-script` turns each `SC-x` into a proof criterion. **One honesty caveat:** *weakening or removing* an `SC-x` is exactly the silent scope-softening this skill exists to prevent — record a `decisions/` entry saying what you loosened and why, and re-confirm a delivered build still holds. Editing an SC never trips `drift`; on a ✅ Delivered intent it also silently changes what the test script must prove — see Step 4 for the delivered-intent re-check.
- **Dependencies** — under `## Dependencies`, `### Internal` is bullets that start with an intent id (`- INT-003 — reason`); `### External` is bullets in the form `- System name | what's needed | owner: Owner Name`. External dependencies are the cross-team asks the delivery lead lines up before the build needs them.

**Demoting an intent that isn't really an intent:** prefer rewriting it into the real outcome if there is one. If it genuinely shouldn't exist, retire it: write the decision (Step 3), then run `node scripts/intent-ledger.mjs retire INT-NNN --decision decisions/<file>.md`. That flips the row to 🚫 Retired, keeps its PR history, and drops it from drift and coverage. Keep `intent.md` — it's the record of what was de-scoped. Never delete the directory or hand-delete the row; that erases the traceability `retire` exists to keep.

**Reclassifying SF→external:** rewrite the build target to what Salesforce actually does (often "consume / react to" rather than "build"), and add the external system as a `### External` dependency on whichever intent still owns the Salesforce-side behavior.

## Step 2b — Compress, when the intent has bloated

Refinement is additive by default — each update piles on, and nothing sheds weight. Over an engagement an intent can accumulate source detail, rationale, implementation mechanics, fixtures, and constraints duplicated across sections until it's a wall of prose that's *harder* to build to, not more complete. This is the intent-specific face of **"Be precise, not verbose"** (AGENTS.md): an intent should hold what *defines the scope*, and route everything else to its right home. Reach for this when an intent reads bloated (a rough tell: past ~1,000–1,500 words, or when scope is buried in rationale/mechanics) — or when `/ql-vet-intent` surfaces a scannability finding. **It's triggered, not mandatory:** a one-line dependency add or a resequence needs no compression pass; don't manufacture one.

Compression is **content redistribution, not deletion** — every rule below *moves* content to where it belongs, or removes a genuine duplicate. Keep only what changes an **outcome, constraint, boundary, dependency, or proof**:

- **Keep** — build target, guardrails, out-of-scope denials, acceptance, dependencies, open questions: the load-bearing scope. If cutting a sentence would lose something a build or a test acts on, it stays.
- **Move implementation mechanics & fixtures → `design.md`** — *how* to build it (objects, automation choice, sample data, field-level specifics) is design, not scope. If no `design.md` exists yet and the mechanics matter, that's the signal to run `/ql-design-intent`.
- **Move chronology & rationale → a dated `decisions/` record** — "we first tried X, then the client asked for Y in the March call" is provenance, not scope. It belongs in the decision trail (git history + `decisions/`), not accreted in the intent body.
- **Split independently-deliverable outcomes → separate intents via `/ql-capture-intent`** — if the intent has quietly grown to cover two things that could ship apart, that's not compression you do inline: route the split to `/ql-capture-intent` (it owns authoring new intents and the ratification that implies). Don't fork an intent id by hand here.
- **Dedup across sections** — the same constraint restated in Build target, Guardrails, *and* Acceptance is one constraint. State it once, in the section that owns it.

**This is still a governed edit, not a tidy-up.** Compression touches the hashed scope fields (build target / guardrails / out-of-scope / acceptance), so it runs through the *same* discipline as any refinement: it's a human-ratified change (show the before→after), it writes the Step 3 decision record (what moved where, and why), and it re-hashes and trips drift in Step 4 if the intent was ✅ Delivered. **The tripwire to respect:** compression must never quietly drop a load-bearing guardrail or soften a boundary under cover of "trimming." If you're unsure whether a line is noise or signal, it's signal — keep it, or surface the question. Moving text to design.md/decisions is safe; *losing* it is the silent scope drift this whole skill exists to prevent.

## Step 3 — Record the decision (always)

Every refinement gets a `decisions/YYYY-MM-DD-<slug>.md` entry — this is what keeps scope changes auditable instead of buried. Context (what prompted it — review, demo, stakeholder call), the change (which intent, before → after), and consequences (does it shift a dependency, a phase plan, a delivered build?). Git history shows *what* changed in the intent file; the decision says *why*. Link the intent: `intents/INT-NNN/intent.md`.

**Formalizing a deferred 👁 criterion** (a `deferred-as-is` Sign-off from `/ql-record-test-execution`): once the decision exists, append ` / → decisions/<this-file>.md` to that criterion's Sign-off cell in `test-script.md`. Until it carries that pointer, `coverage` treats the deferral as unrouted and gates a Delivered intent.

**When to write it: now, in the same working change as the intent edit — before any commit or PR, and never gated on PR approval.** The decision record and the edited `intent.md` are one change that lands together; the record is *why* the edit was made, so it can't lag behind the edit. Don't defer it to "after the PR is approved," and **don't ask the human to pick an interval or a timing** — there is no schedule to choose. (The `Decision record(s)` field in the PR template and the ARB `accepted-by-ARB` hand-edit are downstream *references to* a record that already exists — they are not when it gets created.) You draft the record as part of the refinement; the Trusted Guide ratifies the change, not a calendar for it.

## Step 4 — Re-validate and surface drift

```bash
node scripts/intent-ledger.mjs validate         # the file still parses, deps resolve, no phase inversions
node scripts/intent-ledger.mjs drift             # did this change a DELIVERED intent?
node scripts/intent-ledger.mjs index --write     # refresh the README delivery index (phase/title may have moved)
```

- **`validate` must pass.** If you renamed a heading or broke the dependency format, fix it now — a malformed intent file makes drift detection unreliable, and CI gates on `validate`.
- **Drift is the honest consequence, not a bug.** If you edited the **title / build target / guardrails / out-of-scope / acceptance** of an intent the ledger marks ✅ Delivered, its scope hash moved and `drift` fails on it. Acknowledge it in this same change: `node scripts/intent-ledger.mjs reverify INT-NNN --decision decisions/<this-file>.md` flips the row to 🔄 Needs re-verify (keeping the recorded hash + PR), after which `drift` reports it as acknowledged instead of failing. That is correct: you changed what "done" means, so the delivered build must be re-checked against the new text (and its test script re-confirmed via `/ql-test-script` → `coverage`). Surface this to the user as an action item. Once the build is re-verified against the new scope, `deliver INT-NNN` re-stamps it; never re-stamp without that re-verify.
- **Everything else is context and never trips drift** — the hash excludes phase, Outcome, Success criteria, Dependencies, Grounding, and Open questions. So resequencing, noting a cross-team dependency, or backfilling grounding on a delivered intent is cheap and safe. (The `drift` output prints this same boundary when it flags — the scope contract is those five hashed fields, nothing more.)
- **Success criteria are the exception to "safe" — drift-free but *proof-relevant*.** Editing an `SC-x` never trips drift, but every `SC-x` drives a `test-script.md` criterion (`/ql-test-script`), so the test script's `proof_hash` includes them: an SC edit leaves the ledger alone but flips the test script to 🔄 in `coverage` — refresh it with `/ql-test-script`. (A script still stamped with a legacy `scope_hash:` can't see SC edits; re-stamp it as `proof_hash` when you touch it.)

If the edit *sharpened* the intent's prose (build target / acceptance / scope boundary) — especially if you're acting on a `/ql-vet-intent` finding — it's worth a quick re-vet to confirm the change actually landed the readiness fix (the acceptance is now provable, the gap now has a `Q-xxx`) rather than just moved the words around. Optional, but it closes the loop: vet found it, refine fixed it, re-vet confirms it.

## Step 5 — Report

Tell the user: which intent changed, the before→after, the decision file, whether `validate` passed, whether the edit drifted a delivered intent (and the re-verify it implies), and whether the README index moved. If the change is really a Scopezilla *defect* — the generator emitted something systematically wrong (a non-intent like "Release Planning", or SF-assumed work that should be external) — say so and offer to feed it upstream via the cross-repo handoff (see AGENTS.md), so the *next* engagement's scoping output is better, not just this repo's copy.

## What this does NOT do

- It does **not** author brand-new intents from raw input — that's `/ql-capture-intent` (which calls back into these mechanics for the targeted changes it finds).
- It does **not** re-run Scopezilla or pull from upstream — refinement is in-repo. Upstream regeneration + reconcile is `/ql-ingest-scopezilla`.
- It does **not** mark a drifted Delivered intent "done" by re-stamping the hash on your own. Re-verification is a human-validated act; you prepare it, the Trusted Guide signs it.
- It does **not** sign off or close the loop in Jira — status projection is `/ql-sync-jira`, one-way.
