---
name: ql-check-scope
description: >-
  Check whether a piece of PR feedback or proposed work is already covered by a future-phase intent, explicitly out of scope, or gated on an open question — before you build it. An advisory reader: routes net-new scope to /ql-capture-intent, never builds or edits scope itself. Triggers — "is this already in scope", "will this be built later", "check scope", "/ql-check-scope".
produces: No file — a build / defer / flag verdict per feedback item (routes net-new scope to /ql-capture-intent). Read-only over scope.
---

# Check scope — is this feedback already future scope?

PR feedback often describes work that a **later-phase intent already covers**, or that's been **explicitly deferred**, or that hinges on an **open question the customer hasn't answered yet**. Building it now means wasted work that gets rebuilt, or premature work on an undecided requirement. This skill answers "should I build this, defer it, or flag it?" by grounding the call in the canonical intent set.

It is a reasoning task, not a grep — PR feedback is prose and intents are prose, so the match is semantic. The helper script just loads complete, phase-tagged intent data so you reason against all of it.

## Inputs

- **The feedback / proposed work** — the reviewer comment, or a description of what you're about to build. The user usually pastes it or it's in the current PR.
- **The current phase** — what phase this PR belongs to. Infer from the branch name, the PR's `Phase:` header (the PR template has one), or the most recent `delivery/phase-N/`. If unclear, ask.

## Step 1 — Load the intent digest

Run from the engagement repo root:

```bash
node .claude/skills/ql-check-scope/scope-digest.mjs --phase <current-phase> \
  || node .agents/skills/ql-check-scope/scope-digest.mjs --phase <current-phase> \
  || node "${CLAUDE_PLUGIN_ROOT}/skills/ql-check-scope/scope-digest.mjs" --phase <current-phase>
```

The script is **vendored with this skill**, so a repo-relative path works in any harness. `npx skills` vendors to the harness's own dir — `.claude/skills/` for Claude Code, `.agents/skills/` for the shared-standard harnesses (Cursor, Codex, opencode, …) — so the invocation tries both, then the `${CLAUDE_PLUGIN_ROOT}` fallback for running from the plugin with no vendored copy (a maintainer checkout, or a pre-`ql-` repo mid-transition). This prints every intent (all phases) with its build target, `out_of_scope` list, dependencies, and open questions. Intents after `<current-phase>` are tagged `⟵ FUTURE PHASE`. Canonical source is the living intents under `intents/INT-NNN/intent.md` (see AGENTS.md). Add `--deps` to also print the cross-intent dependency view.

## Step 2 — Classify the feedback

Compare the feedback's *intent* (the behavior/outcome it asks for) against the digest. Land it in one of these buckets:

1. **COVERED BY FUTURE INTENT** — it matches the `build_target` of a later-phase intent. → **Defer.** Name the intent (e.g. "INT-003, Phase 2"). Don't build it in this PR.
2. **EXPLICITLY OUT OF SCOPE** — it appears in some intent's `out_of_scope`. → **Defer**, and say which intent deferred it and why (often "POC mock; real integration is production-phase").
3. **GATED ON AN OPEN QUESTION** — it depends on an unanswered `Q-00x`. → **Flag, don't build.** The requirement isn't decided. (Caveat below — cross-check decisions/.)
4. **IN SCOPE FOR THIS PHASE** — it's part of a current-phase intent's build target or a reasonable acceptance detail. → **Build it.**
5. **NET-NEW, NO INTENT** — nothing in the digest covers it. → **Flag to the architect, then capture it as Intent before building.** It may genuinely belong in scope — but scope is ratified, not absorbed from a PR comment. The Trusted Guide ratifies it, then `/ql-capture-intent` records it as a new living intent (`origin: local`, `confidence: draft`) with a decision citing where it came from. Building net-new behavior with no intent behind it is exactly the silent scope drift the trust chain exists to prevent — surface it and capture it for ratification, don't just build it.
6. **ALREADY DELIVERED** — it matches a current- or prior-phase intent that the ledger marks ✅ Delivered. → **Don't rebuild.** Point at the ledger row (intent id + PR). If the feedback asks to *change* delivered behavior, that's either net-new scope (bucket 5) or — if the intent's own text changed upstream — scope drift; see Step 3.

## Step 3 — Cross-check against the delivery ledger and decisions/

### 3a — Is it already built? (the backward link)

The digest tells you what's *in scope*; `delivery/intent-ledger.md` tells you what's *already delivered*. Before treating current/prior-phase feedback as buildable, check the ledger so you don't propose rebuilding something a merged PR already shipped:

```bash
node scripts/intent-ledger.mjs drift   # also flags any delivered intent whose scope moved
```

If the matched intent's row is ✅ Delivered, route to bucket 6. If `drift` reports the intent as 🔄 (its scope hash no longer matches the current intent text), the delivered build may no longer satisfy the intent — say so explicitly; that's a re-verify, not a fresh build.

### 3b — Cross-check open questions against decisions/

An open question may already be **answered in a local decision file** even though the intent still shows it `UNANSWERED` (e.g. Q-001/Q-002 were resolved in `decisions/2026-05-29-phase-1-plan-mode.md`). Before treating something as "gated on an open question," grep `decisions/` for the `Q-00x` id:

```bash
grep -rn "Q-001" decisions/
```

If the decision answers it, treat it as decided and note the decision file. If scope genuinely shifted, refine the intent in-repo with `/ql-refine-intent` (recording a decision), or — for an answer that should also flow back to the source — feed it upstream; either way the change is deliberate and recorded, never a silent edit.

## Step 4 — Report

Give a short verdict per feedback item:

- **Item** (quoted) → **Bucket** → **Action** (build / defer / flag / don't-rebuild) → **Evidence** (intent id + phase, or out-of-scope line, or Q-id + decision file, or ledger row + PR, or "no matching intent").

Be decisive where the digest is clear; flag uncertainty where the match is fuzzy. The goal is to stop the user building Phase-2+ work inside a Phase-1 PR, rebuilding something already delivered, or letting net-new scope vanish instead of routing to the architect.

## What this does NOT do

- It does **not** watch PR comments automatically or fire on its own — you invoke it.
- It does **not** decide or author net-new scope. It surfaces candidates and routes them; the Trusted Guide ratifies, and `/ql-capture-intent` records the new intent. This skill classifies — it doesn't create.
- It does **not** edit intents itself. When the verdict is "this needs to become / change an intent," that's `/ql-capture-intent` or `/ql-refine-intent` — each writes a decision record. `/ql-check-scope` only reads.
