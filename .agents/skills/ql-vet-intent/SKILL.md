---
name: ql-vet-intent
description: >-
  Grade whether one living intent is ready to build against — a concrete build target, provable acceptance, honest open questions, acknowledged cascading work, and small enough to build as one usable increment. An advisory reader: routes fixes to /ql-refine-intent or /ql-capture-intent, never edits scope. The pre-build reflex between /ql-check-scope and /ql-test-script. Triggers — "vet this intent", "is INT- ready to build", "is the acceptance provable", "/ql-vet-intent".
produces: No file — a build-readiness verdict + findings by severity, with fixes routed to /ql-refine-intent or /ql-capture-intent. Read-only over scope; never edits the intent.
---

# Vet an intent — is it ready to build against and prove?

`/ql-check-scope` answers *should I build this?* `/ql-test-script` answers *how will I prove it?* Between them sits a question nothing else asks: **is the Intent itself well-formed enough to build against and prove?** A vague `build target`, an unprovable `acceptance`, a silent gap filled with a guess instead of an open question — each one quietly breaks the trust chain *before* a line is built, and surfaces later as a fuzzy test script, a "done" that isn't proven, or scope absorbed off a comment.

This skill is the **build-readiness check** — spec-quality applied to one living intent. It grades the intent against the dimensions below, marks each finding by how badly it hurts, and routes the fixes to `/ql-refine-intent` (a known edit) or `/ql-capture-intent` (silence that should become a new intent). It's an **advisory reader** (AGENTS.md → When to reach for which skill): it grades and routes, never edits the intent.

> **Advisory, not a gate.** Structural well-formedness is objective and *is* a CI gate (`validate`); prose quality is judgment, so this *informs* the Trusted Guide and never refuses to build.

## Where it sits in the build loop

```
/ql-start-intent → /ql-check-scope → /ql-vet-intent → /ql-design-intent → /ql-test-script
                should I       is it ready    how to build     here's how
                build it?      to build       it (non-trivial) I'll prove it
                               against?
```

A weak intent makes a weak test script — `/ql-test-script` decomposes the `acceptance` into provable `INT-00x-Cy` criteria, so if the acceptance is vague the criteria are vague. Vetting first is what makes the proof plan sharp. (`/ql-design-intent` sits between vet and test-script for non-trivial intents — see Step 4.)

## Step 1 — Resolve the intent and run the structural check

Take the `INT-00x` id (or, mid-`/ql-start-intent`, the one being opened). Read `intents/INT-NNN/intent.md` — the full living intent. Then run the objective structural layer first, so you're not hand-judging something the toolchain already flags:

```bash
node scripts/intent-ledger.mjs validate    # parses? required sections present? deps resolve? no phase inversions?
```

`validate` covers the *mechanical* floor — frontmatter, the canonical `## ` headings, internal-dependency integrity, duplicate ids. **If it fails, stop and fix that first** (or route to `/ql-refine-intent`); a malformed file makes everything below unreliable. What `validate` *can't* judge — whether the prose is concrete, provable, and honest — is this skill's job. Don't re-report what `validate` already caught; build on top of it.

If the engagement is **grounded** (regulated / ARB-governed — any intent carries a `## Grounding` section), also check where this intent sits on traceability, so the *Grounding conformance* dimension has the machine read in hand:

```bash
node scripts/intent-ledger.mjs conformance INT-00x   # is THIS intent grounded? (no --gate — read-only report)
```

This is a no-op in a commercial engagement (nothing is grounded); skip the dimension entirely there.

## Step 2 — Grade the intent against the readiness dimensions

Reason over the one intent's prose. This is a judgement task, not a grep — read `build target`, `guardrails`, `out of scope`, `acceptance`, `success criteria` (if present), `dependencies`, and `open questions` together, and assess each dimension. Also load the co-located `test-script.md` when it exists — the *Answered-question propagation* dimension cross-checks it. For every issue, capture: **which section**, **what's wrong**, **severity**, and **the concrete fix** (including which skill makes it).

| Dimension | The question it asks | What a finding looks like |
|---|---|---|
| **Provability** *(the big one)* | Does each `acceptance` clause decompose into something a `INT-00x-Cy` criterion can actually prove — ✅ automated or 👁 a manual walkthrough? Is success **observable and specific**, or a claim no test could fail? **Flag the defect, never the format.** The finding is *unprovable acceptance* — a vague outcome, a claim no test could fail — regardless of whether it's written as prose or Given/When/Then. A concrete walkthrough with a named actor and an observable result is provable; so is a GWT grid; so, equally, is neither if the outcome is fuzzy. Do **not** flag the *absence* of GWT, or the *absence* of a `## Success criteria` section — those are optional aids, not requirements, and flagging their absence is the "you didn't use my preferred structure" mistake. Only flag what a criterion genuinely cannot prove. | "Acceptance says 'works reliably' — no observable pass/fail. Rewrite it as a concrete walkthrough with a named actor and an observable outcome (or GWT scenarios if the behavior has discrete branches), so each clause becomes a testable `INT-00x-Cy` row." An unprovable acceptance is the exact failure the whole apparatus exists to prevent. |
| **Buildability / clarity** | Is `build target` a concrete, buildable Salesforce outcome — or an aspiration with unquantified adjectives (*seamless, fast, intuitive, robust, scalable*) and undefined nouns? | "'Seamless intake experience' isn't buildable. Which object, which flow, which user action?" Flag every vague adjective the way spec-kit flags placeholders. |
| **Honest silence** | Where the intent is **silent** on something the build needs, is there a `Q-xxx` open question — *not* an invented guardrail? And conversely, is a genuinely **blocking** question flagged as gating, so nobody builds on an undecided requirement? | "Build target implies a dedupe rule but none is stated, and there's no open question — this is a silent gap. Add a `Q-xxx`, don't let the build guess." |
| **Answered-question propagation** *(only when a question reads ANSWERED)* | When an `## Open questions` entry is marked `ANSWERED:`, did the answer actually propagate — or does a downstream location still read as if the question were open? Cross-check that answered `Q-xxx` id against the intent's own `build target`/`guardrails`/`acceptance` **and**, when a co-located `test-script.md` exists, its criteria — flag any criterion still marked ⛔/⚠️ citing that `Q-xxx`, and any build-target/acceptance text the answer superseded but that wasn't updated. Drift detection **can't** catch this (it fires when text *changes*; this is text failing to change *when it should have*), so it's this dimension's job. | "Q-003 reads `ANSWERED: use the CaseType picklist`, but test-script criterion INT-012-C4 is still `⛔ blocked: Q-003` and the build target still names the old free-text field. Route to `/ql-refine-intent` to fold the answer into the build target, then re-run `/ql-test-script` so C4 becomes provable." A ⚠️ (the intent contradicts itself in writing); ⛔ when the stale spot is a core build target the whole intent hangs on. |
| **Cascading consequences** *(our distinctive dimension)* | Does a Salesforce `build target` acknowledge the ancillary work it *requires to be usable* — FLS on the right permission sets, an app slot, a Lightning page / layout / list view, the profile/perm-set access — or is it silently narrow? **And does it assume org configuration that no intent establishes?** On a greenfield org, standard-cloud preconditions (a Default Case Owner, an Org-Wide Email Address, Business Hours, a queue) don't exist until someone sets them — an intent that silently assumes one ships a build that deploys clean and doesn't work. Flag the *assumption*, not a checklist: only where this intent's own prose leans on it. Don't recite a remembered per-cloud prerequisite list — that's a platform fact to confirm in Salesforce docs at design time, not a rubric. | "New `Case` field, but nothing about FLS or which permission sets get it — a field nobody can see isn't a usable increment. Name it in scope or as a deferred." Or: "Acceptance says an unassigned case 'routes to the support queue', but no intent establishes a Default Case Owner or that queue — on a fresh org this has nowhere to route. Name it, or add a `Q-xxx` for who owns it." A *usable* increment is the bar (see AGENTS.md → Cascading consequences). |
| **Dependency soundness** | Does the prose lean on another team or system (NetSuite, Billing, an external API) that the `## Dependencies` section doesn't declare? Or an internal ordering on another intent that isn't listed? | "Build target says 'sync to NetSuite' but `### External` is `_none_`. Declare the dependency so it's lined up before the build needs it." Semantic layer above `validate`'s structural dep check. |
| **Boundary clarity** | Is the `build target` ↔ `out of scope` line actually drawn, so a reviewer knows what's deferred vs forgotten? Is `confidence` honest for how thin the intent is (a sketch shouldn't read `confidence: high`)? | "No `out of scope` entries and the build target is broad — is the POC/production line drawn, or just unstated?" |
| **Single buildable increment** *(tracer-bullet test)* | Is this buildable as **one usable, demoable increment** in a reasonable working session — or is it really several intents wearing one id? An intent too big to prove as a single coherent slice hides scope and defers its proof to the end. Judge scope size, not word count. | "This intent bundles a new object, a Flow, an integration, and a portal page — four demoable slices under one id. Route to `/ql-refine-intent` to split it (or `/ql-capture-intent` for the pieces that are their own capability), so each builds and proves as one increment." Distinct from *Scannability* (prose length) — this is scope size. A ⚠️ when the build is deferrable-but-soft, ⛔ when it genuinely can't be built or proven as one unit. |
| **Scannability / bloat** | Is the intent lean enough to build to — or has repeated refinement accreted source detail, rationale, mechanics, and duplicated constraints until the scope is buried? Judge the *content mix*, not the length: a tight 1,800-word intent with genuinely-discrete guardrails is fine; a 900-word one that tangles rationale and mechanics into scope is not. (Rough tell: past ~1,000–1,500 words, take a look.) | "This intent mixes March-call chronology and field-level mechanics into the build target, and restates the same constraint in Guardrails and Acceptance. Route to `/ql-refine-intent` to compress — mechanics → design.md, chronology → a decision record, dedup the constraint." A bloated intent is harder to build to, not more complete. |
| **Ethically grounded** *(only when the build warrants it)* | **Gate first:** this dimension is live only when the intent touches **personal/protected data** or drives an **automated decision about a person** — a routing rule off applicant data, an eligibility auto-decision, anything acting on customer PII. Everything else (a list view, a layout tweak, an internal admin field) warrants **no** finding; it is **not** a checklist to staple onto every intent, and manufacturing one is the "you didn't use my preferred structure" mistake. When it *is* live, read the prose for the ground rules the build needs, using these AUP categories as **the thing to look for — not a form to fill**: (a) a **human-override** path for a decision with legal/significant effect on a person; (b) inference/prediction of a **protected characteristic** (race, religion, health, etc.); (c) **biometric identification / facial recognition**; (d) individualized **regulated advice** (legal/medical/financial) presented without a disclaimer; (e) **PII handling** — how personal data is scoped, stored, restricted. You **flag the tension for the human, you don't adjudicate it** — the same line the *Grounding conformance* row holds; the call on whether a safeguard is adequate is the Trusted Guide's, not yours. | "Auto-routes cases off applicant demographic data but says nothing about who can override a misroute, or how the PII is handled — add a human-override guardrail and a PII-handling note to §3 Guardrails." A missing override/safeguard on a build that infers a protected characteristic, uses biometrics, or auto-decides about a person is a ⛔; a softer gap (PII handling unstated where the build only reads PII, a regulated-advice disclaimer absent) is a ⚠️; irrelevant on a build that touches neither. |
| **Grounding conformance** *(only when the engagement carries grounding)* | Does the intent carry a `## Grounding` link — a requirement ID and/or the approved-architecture reference — and does the `build target` **read as conformant** with that approved architecture, or does it quietly deviate? Scope this to engagements where grounding is *present at all* (any intent carries `## Grounding`); in an engagement with no grounding anywhere, warrant **no** finding. Verification of actual conformance is a human/ARB call — you flag the *tension* for ratification, you don't adjudicate it. | "Other intents here carry `## Grounding` but INT-012 has none — if this engagement needs requirements traceability, add the link via `/ql-refine-intent` (the `conformance` report flags it as an untraceable delivered increment)." Or: "Build target proposes a custom REST callout, but the grounded architecture (`Architecture: ARB design §4.2`) specifies Platform Events — surface the deviation for ARB ratification, don't silently build past it." |

Be conservative and specific — quote the offending text, don't editorialize. A clean intent should pass with few or no findings; say so plainly rather than manufacturing nitpicks. The goal is a *buildable, provable* intent, not a maximally annotated one.

## Step 3 — Severity, in our vocabulary

Mark each finding with the same markers the test script uses, so readiness reads consistently across the trust chain:

- **⛔ Blocks build** — building now means guessing at scope or shipping something unprovable. Resolve before `/ql-test-script`. (Unprovable acceptance, a silent gap on a core requirement, a build target too vague to implement, missing privacy/human-override ground rules on an intent that acts on personal data or auto-decides about a person.)
- **⚠️ Weakens proof** — buildable, but the proof plan or the increment will be soft until fixed. (Undeclared dependency, unacknowledged cascading work, a fuzzy-but-inferable acceptance clause.)
- **💡 Polish** — won't hurt the build; sharpens the intent. (Wording, a missing out-of-scope line where the boundary is otherwise clear, confidence slightly optimistic, a bloated intent that's still buildable but hard to scan.)

Soft-cap the list: if you're past ~10 findings, prioritize by severity and merge near-duplicates — a wall of nits buries the ⛔ that matters.

## Step 4 — Report with a readiness verdict and routes

Lead with a one-line verdict, then the findings table, then the routes:

- **Verdict** — one of: **✅ Ready to build** (no ⛔, at most minor ⚠️/💡) · **⚠️ Buildable with caveats** (⚠️ findings the human should weigh) · **⛔ Not ready** (one or more ⛔ — fix before building).
- **Findings** — a table: *Section · Finding (quoted) · Severity · Fix*.
- **Routes** — for each fix, name the door, because **this skill doesn't edit the intent**:
  - A **known edit to this intent** (sharpen acceptance, declare a dependency, draw the out-of-scope line, fix confidence) → `/ql-refine-intent` — it writes the decision record and re-validates.
  - A **bloated intent** (scope buried in rationale/mechanics/duplication) → `/ql-refine-intent`'s compression pass (Step 2b) — it trims to scope and routes mechanics to design.md, chronology to a decision record, and any independently-deliverable outcome to `/ql-capture-intent`.
  - **Silence that's really a new intent** (the gap is a whole capability, not a missing line) → `/ql-capture-intent`.
  - **A findings list worth working interactively** (this intent is oversized/thin enough to reshape in a sitting, or it's one of several flagged that want a working session) → `/ql-grill-intents` — the interactive worker for the findings, which splits/rebuilds with the human and routes each edit back through refine/capture. (Reciprocal seam: a blank `/ql-grill-intents` *calls* this skill to find its worklist; here you route a *produced* finding to it. Use it over one-by-one refine when the fix is a conversation, not a one-liner.)
  - A **blocking open question** → flag it for the Trusted Guide / customer; don't build the dependent behavior until it's answered (cross-check `decisions/` first — it may already be settled).
  - A **systematic Scopezilla defect** (the generator emits this class of vagueness every time) → offer to feed it upstream via the cross-repo handoff (see AGENTS.md), so the *next* engagement's draft is better.
- **Design nudge** — if the intent is **non-trivial** (its build target implies a new object, a sharing/FLS change, an integration, or Apex), recommend running `/ql-design-intent` next, *before* `/ql-test-script` — the architecture is worth a reviewed `design.md` the Trusted Guide ratifies before the build, not a PR-time surprise. A trivial intent (a field, a list view, an obvious validation rule) skips straight to the proof plan; say which and why.
- **Brownfield nudge** — if the build target names metadata a live customer org likely already has (a field/object/automation on a standard object), note that `/ql-design-intent` (or the trivial-path check in `/ql-start-intent`) will **consult the existing org** before building, so a duplicate or collision is caught at design time, not in the sandbox (ADR `decisions/0005`). One line — the consult itself lives in those skills, not here.

Close by restating the loop: once the ⛔ findings are resolved (via the human-ratified edit), proceed to `/ql-design-intent` for a non-trivial intent (then `/ql-test-script`), or straight to `/ql-test-script` for a trivial one — turning the now-sharp acceptance into the proof plan.

## What this does NOT do

- It does **not** edit the intent (an advisory reader — see AGENTS.md). Every fix is routed to `/ql-refine-intent` or `/ql-capture-intent`, which write the decision record.
- It does **not** gate CI or block the build. It's advisory — `validate` is the objective gate; this is judgement that *informs* the human, never refuses.
- It does **not** ratify or promote a `draft`. Grading a draft as "ready" doesn't make it committed Intent — that's still the human's call (via `/ql-refine-intent`).
- It does **not** check the intent against *other* intents (duplicate scope, contradictory guardrails across the set). That cross-intent consistency sweep is `/ql-analyze-intents` (the whole-set complement) — this skill vets **one** intent in isolation.
- It does **not** write or run the proof plan — that's `/ql-test-script`. It checks whether the intent is *ready* for one.
