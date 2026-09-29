---
name: ql-analyze-intents
disable-model-invocation: true
description: Read-only cross-intent consistency sweep over the whole set — overlap, contradiction, terminology drift, undeclared dependencies, seam gaps — reporting and routing fixes.
produces: No file — a portfolio consistency verdict + findings by severity (overlap / contradiction / terminology drift / undeclared dependency / seam gap), each routed to /ql-refine-intent or /ql-capture-intent. Read-only over scope; never edits an intent.
---

# Analyze intents — a cross-intent consistency sweep

`/ql-vet-intent` asks *is this ONE intent ready to build against?* — it reads a single intent in isolation and, by its own design, does **not** compare it to the others. `node scripts/intent-ledger.mjs validate` checks the *structural* floor — every file parses, dependencies resolve to real ids, no phase inversions. Between them sits a question neither answers: **do the intents, read as a set, agree with each other?**

Two intents that overlap build the same thing twice. A guardrail in one that contradicts another's build target ships a conflict nobody caught until UAT. The same object called "Application" here and "Case" there quietly fractures the data model. A dependency that's real but undeclared breaks the build order. A capability that falls between two intents — owned by neither — is the gap that surfaces as "wait, who's building that?" three weeks in. On a **phased portfolio of dozens of intents** these cross-cutting problems are invisible to any single-intent check — and they compound as the set grows.

This skill is the **portfolio-level consistency sweep** — spec-quality applied across the *whole set* rather than to one intent. It reasons over every intent at once, reports findings by severity, and routes each fix to `/ql-refine-intent` (a known edit) or `/ql-capture-intent` (a genuine gap that should become a new intent). It's an **advisory reader** (AGENTS.md → When to reach for which skill): it reports and routes, never edits an intent.

> **Advisory, not a gate.** Structural integrity across the set (deps resolve, no phase inversion) is objective and already a CI gate (`validate`); *semantic* agreement — does this guardrail contradict that build target, are these two intents really the same scope — is judgement, so this *informs* the Trusted Guide and never refuses to build.

## Where it sits

`/ql-vet-intent` runs *inside* the build loop — one intent, right before you build it. `/ql-analyze-intents` runs *between* builds, over the whole set — the natural moments are:

- **After `/ql-ingest-scopezilla`** (first ingest or a reconcile) — a fresh batch of scoped intents is exactly where overlaps and terminology drift arrive.
- **After a batch `/ql-capture-intent`** — several intents drafted from one meeting are prone to overlapping each other or an existing intent.
- **Before a phase kickoff** — confirm the phase's intents agree with each other and with what's already delivered before anyone starts building.
- **As a periodic scope health check** — any time the set has grown and you want to know it's still coherent.

It complements `/ql-capability-map` (which *visualizes* the whole scope) by *interrogating* it. It does not replace `/ql-vet-intent` — a clean sweep here says the intents agree with each other, not that any one of them is individually ready to build (that's still `/ql-vet-intent`, per intent).

## Step 1 — Load the whole set and run the structural check first

Run from the engagement repo root. First the objective structural layer, so you don't hand-judge what the toolchain already flags:

```bash
node scripts/intent-ledger.mjs validate    # every file parses, deps resolve, no phase inversions, no duplicate ids
```

If `validate` fails, **stop and fix that first** (or route to `/ql-refine-intent`) — a malformed intent file makes the semantic reasoning below unreliable, and it's a CI gate regardless. Don't re-report what `validate` already caught (a dependency that points at a non-existent id, a phase inversion) — that's its job. This skill builds on top of it.

Then load the full digest — every intent, all phases, with build target, out-of-scope, dependencies, and open questions in one view:

```bash
node .claude/skills/ql-check-scope/scope-digest.mjs --deps \
  || node .agents/skills/ql-check-scope/scope-digest.mjs --deps \
  || node "${CLAUDE_PLUGIN_ROOT}/skills/ql-check-scope/scope-digest.mjs" --deps
```

The `--deps` view groups the declared internal (build-order) and external (cross-team) dependencies so you can see the dependency graph the intents *declare* — which you'll compare against the dependencies their prose *implies* (dimension D below). This is the same digest `/ql-check-scope` uses; here you read it across the whole set rather than against one piece of feedback.

## Step 2 — Sweep for cross-intent inconsistencies

This is a reasoning task, not a grep — intents are prose, so the conflicts are semantic. Read the set as a whole and look for each dimension below. For every finding, capture: **which intents** (always a pair or group — this is cross-intent by definition), **what the conflict is** (quote both sides), **severity**, and **the concrete fix** (including which skill makes it).

| Dimension | The question it asks | What a finding looks like |
|---|---|---|
| **Overlap / duplication** | Do two intents build the **same capability**, or does one's `build target` substantially contain another's? Distinguish genuine duplication (build it twice) from a legitimate dependency (one builds on the other) or a deliberate phase split (POC now, real later). | "INT-012 'dedupe Contacts on email' and INT-027 'block duplicate Contacts' describe the same rule. Merge, or one should depend on the other — not two separate builds." |
| **Contradiction** | Does one intent's `guardrail` or `acceptance` **conflict** with another's `build target` or `out_of_scope`? A thing one intent forbids that another requires; a boundary they draw incompatibly. | "INT-005 guardrail says 'no external API calls from triggers'; INT-018 build target is 'call Billing API from the Opportunity trigger'. These can't both hold — reconcile the pattern." |
| **Terminology drift** | Is the **same real-world thing named differently** across intents (Application vs. Case vs. Request; Practitioner vs. Provider vs. Agent), or the **same name used for two different things**? This fractures the data model before it's built. | "INT-003 says 'Subsidy Application', INT-009 says 'Benefit Case' — same object? If so, one name across the set; if not, say how they differ. Left ambiguous, the build creates two objects." |
| **Undeclared dependency** | Does one intent's prose clearly **assume another has shipped** (references its object, its field, its automation) without declaring it under `## Dependencies → ### Internal`? `validate` checks declared deps resolve; it can't see a dependency the prose implies but never declares. | "INT-021 build target reads/writes `Assignment__c`, created by INT-014, but INT-021's `### Internal` is `_none_`. Declare INT-014 so the build order is right." |
| **Seam gap** | Is there a capability the set clearly needs that **falls between two intents and neither owns** — each assuming the other handles it? The classic "who's building the sharing rule?" gap. | "INT-007 grants access 'once assigned'; INT-011 revokes 'when assignment ends'. Neither owns the *sharing mechanism* both depend on — is it a missing intent?" |
| **Sequencing coherence** | Beyond `validate`'s phase-inversion check: do the **phases tell a buildable story**? A foundational object split across a later phase than the intents that use it; a phase that can't demo because its enabling intent is scheduled after it. | "INT-002 (phase 2) is the data model INT-015/016/017 (phase 1) all build on. Phase 1 can't ship without it — resequence INT-002 to phase 1." |

Be conservative and specific — **name both intents and quote the conflicting text.** A coherent set should pass with few or no findings; say so plainly rather than manufacturing conflicts. Two intents touching the same object is normal (that's what epics are); only flag it when it's genuine overlap, contradiction, or an undeclared dependency. The goal is a *coherent, buildable* set, not a maximally-annotated one.

## Step 3 — Severity, in our vocabulary

Mark each finding with the same markers `/ql-vet-intent` and the test script use, so consistency reads the same across the trust chain:

- **⛔ Blocks build** — building the set as-is means building something twice, shipping a contradiction, or fracturing the data model. Resolve before the affected intents are built. (Genuine duplication, a hard contradiction between a guardrail and a build target, an object named two ways.)
- **⚠️ Weakens the plan** — buildable, but the plan is soft until fixed. (An undeclared-but-inferable dependency, a seam gap that's probably covered elsewhere, terminology that's likely-but-not-certainly the same thing.)
- **💡 Polish** — won't break the build; tightens the set. (Wording aligned across intents, a phase order that works but reads awkwardly.)

Soft-cap the list: past ~10 findings, prioritize by severity and merge near-duplicates — a wall of nits buries the ⛔ that matters. On a large set, lead with the ⛔/⚠️ pairs and summarize the 💡 count.

## Step 4 — Report with a coherence verdict and routes

Lead with a one-line verdict, then the findings table, then the routes:

- **Verdict** — one of: **✅ Coherent** (no ⛔, at most minor ⚠️/💡) · **⚠️ Coherent with caveats** (⚠️ findings the human should weigh) · **⛔ Conflicts to resolve** (one or more ⛔ — reconcile before building the affected intents).
- **Findings** — a table: *Intents (the pair/group) · Conflict (both sides quoted) · Dimension · Severity · Fix*.
- **Routes** — for each fix, name the door, because **this skill doesn't edit intents**:
  - A **known edit to reconcile two intents** (align a name, add the missing dependency, sharpen a guardrail, resequence a phase, merge a duplicate) → `/ql-refine-intent` on the specific intent — it writes the decision record and re-validates. Two intents in conflict usually means one refine each; keep them as separate recorded edits so the trail is per-change.
  - A **seam gap that's really a missing capability** (neither intent owns it and it's a whole outcome, not a line) → `/ql-capture-intent` to draft the new intent (`origin: local`, `draft`) for the Trusted Guide to ratify.
  - A **systematic Scopezilla defect** (the generator emits overlapping intents or inconsistent naming every run) → offer to feed it upstream via the cross-repo handoff (see AGENTS.md), so the *next* engagement's draft is more coherent — not just this repo's copy patched.
  - **A batch worth reshaping interactively** (several conflicting/overlapping intents that need judgment and splitting, not a handful of one-line edits) → hand the flagged set to `/ql-grill-intents` — the interactive worker for exactly this findings list. (This is the reciprocal seam: `/ql-grill-intents` *calls* this skill to build a worklist when invoked blank; here you route a *produced* findings list back to it for a working session. Use it when the fixes are a sitting, not a one-liner.)
- **Delivered-intent caution** — if a reconciling edit would change an intent the ledger marks ✅ Delivered, say so: `/ql-refine-intent` will flip it to 🔄 Needs re-verify (the edit is a scope change to shipped work). Surface it; don't let the human make the edit blind to the re-verify it triggers.

Close by pointing back into the loop: once the ⛔ conflicts are reconciled (via the human-ratified edits), the set is coherent enough to build against — proceed per-intent through `/ql-vet-intent` → `/ql-design-intent` → `/ql-test-script` as usual.

## What this does NOT do

- It does **not** edit any intent (an advisory reader — see AGENTS.md). Every fix is routed to `/ql-refine-intent` or `/ql-capture-intent`, which write the decision record.
- It does **not** gate CI or block a build. It's advisory — `validate` is the objective cross-intent gate (structural); this is the *semantic* layer that informs the human, never refuses.
- It does **not** re-do `validate`'s job. Dependency resolution, phase inversions, duplicate ids, malformed files — those are structural, gated in CI, and this skill assumes they pass. It reasons about *meaning* across intents, not *form*.
- It does **not** grade a single intent's build-readiness — that's `/ql-vet-intent`, one intent at a time, inside the build loop. This is the whole-set complement; run both.
- It does **not** visualize the scope — that's `/ql-capability-map`. This interrogates the set for conflicts; the map draws it.
