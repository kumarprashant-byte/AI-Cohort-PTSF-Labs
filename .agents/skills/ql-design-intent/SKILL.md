---
name: ql-design-intent
description: >-
  Propose the Salesforce build approach for one intent before building it — data model, sharing/security, automation (standard-first), integration, and alternatives — and, in a grounded engagement, conformance to the approved architecture. Writes a co-located, human-ratified design.md so architecture is reviewed before code exists, not at PR time. Optional but recommended for non-trivial intents; trivial ones skip it. This is the *how to build* step — to open and build the intent use /ql-start-intent. Triggers — "design this intent", "what's the architecture for INT-", "/ql-design-intent".
produces: A co-located, human-ratified `intents/INT-00x/design.md` (scope-hash stamped) + a `decisions/` record for material architecture calls. No commit; doesn't build or edit the intent.
---

# Design an intent — propose the build approach before you build

The build loop runs `/ql-check-scope → /ql-vet-intent → /ql-design-intent → /ql-test-script → build`. This skill fills the step that nothing else does: **a reviewed design before the code exists.** `/ql-vet-intent` confirms the intent is *ready to build against*; this proposes *how* to build it on the Salesforce platform — and puts that approach in front of the Trusted Guide while changing it is still cheap.

Without this step, the first time a human sees the architecture — the object model, the sharing approach, whether this is a Flow or an Apex trigger, the integration pattern — is at **PR review, after the build.** On Salesforce that's expensive: a junction object that should have been master-detail, custom Apex that should have been a standard capability, an automation in the wrong place — all far cheaper to catch at design time than to rework after they're built and the tests are green against the wrong shape. This is the "standard-first, no custom you'll regret" principle given an artifact: the regret gets caught *before* it's committed to code.

> **Authorship stays human — for the approach, too.** You (the agent) *propose* the design; the Trusted Guide *ratifies* it. Same posture as Intent itself. You draft the design.md, show it, and let them approve or redirect before the build proceeds. You don't lock an architecture and start building on your own say-so — a wrong approach ratified by a human is a decision; a wrong approach the agent just ran with is rework. Sweep the design.md prose against `.claude/prose-style.md` before showing it.

## When to reach for it (optional but recommended)

Not every intent needs a design doc. A single new field + its FLS doesn't; a new object with a sharing model does. Reach for it — and `/ql-vet-intent` will nudge you toward it — when the intent's build target crosses any of these lines:

- **A new object**, or a relationship decision (master-detail vs lookup, a junction).
- **A sharing / security change** — who sees what, a new permission set, FLS that ripples across personas.
- **An integration** — an external system, a callout, a platform event, a named credential.
- **Apex** — a trigger, a service class, a batch/queueable, anything where the standard-vs-custom call matters.
- **Anything you'd want a second architect to sign off on** before you spent a day building it.

A trivial intent (a field, a list view, a validation rule with an obvious shape) can skip straight to `/ql-test-script`. Say so rather than manufacturing a design doc for work that doesn't need one.

## What you produce

One file per intent, **co-located with the intent it designs** — `intents/INT-NNN/design.md`, beside `intent.md` and `test-script.md`:

```markdown
---
intent: INT-001
scope_hash: 59b99f9ee762   # node scripts/intent-ledger.mjs hash INT-001 — at authoring
authored: 2026-06-04
---

# INT-001 — Design

**Intent:** Grant practitioner access to medical history only while assigned to an open application
**Source intent:** `intents/INT-001/intent.md`

## Data model
Objects and fields touched or created. Relationship choices (master-detail vs lookup vs
junction) WITH the reason. Note what's standard vs custom.

## Sharing & security
The sharing model (OWD, sharing rules, Apex-managed sharing, restriction rules). Which
permission set(s) grant access, and the FLS implications. The **cascading consequences**
this implies: app slot, Lightning page / layout / list view, profile/perm-set updates —
the work that makes the increment *usable*, not just compiling (see AGENTS.md).

## Automation approach
Declarative-first: validation rule vs Flow vs Apex trigger vs Apex service — and **why not
something simpler**. Standard platform capability before custom. Governor-limit exposure if
it's bulk/recursive.

## Integration (if any)
External systems, the pattern (platform event / callout / named credential / MuleSoft), and
what rides the metadata deploy vs. what goes in `delivery/deploy-runbook.md`. Tie each to the
intent's `## Dependencies` (an external dependency here should already be declared there — if
it isn't, flag it back to `/ql-refine-intent`).

## Alternatives considered
What else was on the table, and why this approach won. The "simpler alternative rejected
because…" note — the guard against over-design AND the record of why the standard path
wasn't taken, if it wasn't.

## Architecture conformance (grounded / ARB-governed engagements only)
Only when the intent carries a `## Grounding` link (a requirement ID / approved-architecture
reference) **or** the engagement carries inherited architecture ADRs (`scopezilla/decisions/`,
`Source: scopezilla-inherited`). State how this approach CONFORMS to the approved architecture
and the inherited premises — or, where it deviates, say so plainly and route it to the Trusted
Guide / ARB for ratification. A deviation is not forbidden; a SILENT deviation is. Cite the
grounded requirement/architecture and the specific premise (`0004`) you're conforming to (or
departing from). When a deviation stands, this design must have authored the `BLD-NNNN`
superseding ADR (Step 6b) — reference it here. Omit this section entirely in a commercial
engagement with no grounding and no inherited ADRs.

## Neighboring & future scope
How this approach accommodates what's ALREADY built (reuse it, stay consistent) and
what will build ON this later (the downstream cone + epic siblings from Step 2) — the
relationship/object choices that leave room for future intents, and any place a future
intent needs a shape this build would preclude (flagged, not silently cornered).

**Existing org (brownfield):** what already exists in the customer org / repo metadata
that this intent lands on — and the disposition for each (reuse / extend / collision →
Q-design-x / genuinely-different). Note `⚠ org not consulted` if no source was reachable.
Flag anything present in the org but NOT in the repo (untracked).

## Build sequence (when ordering isn't the default cascade)
_Include only when the build order is non-obvious or a step must deploy on its own — a
near-circular dependency, a data migration wedged mid-build, a separate deploy. Omit when the
order is the standard cascade (Step 5 covers why). A short ordered list; tie any separate deploy
to_ `delivery/deploy-runbook.md`_._

## Open design questions
- Q-design-1: <anything the Trusted Guide must settle before the build starts>
```

## Step 1 — Resolve the intent and confirm it's ready

Take the intent id (e.g. `INT-001`). Load it and confirm it exists:

```bash
node scripts/intent-ledger.mjs hash INT-001   # prints "INT-001  <hash>  <title>"
```

Read the full intent from `intents/INT-NNN/intent.md` — `build_target`, `guardrails`, `out_of_scope`, `acceptance`, and especially `## Dependencies`. If `/ql-vet-intent` hasn't been run, run its reasoning first (or invoke it): **don't design against an intent that isn't ready** — a ⛔ Not-ready finding means the *what* is still in flux, and designing the *how* on top of it is wasted. If the id doesn't match, stop and list intents (`node scripts/intent-ledger.mjs hash`).

## Step 2 — Load the neighborhood: what's built, what will build on this

As the **master builder**, you know the neighborhood before you pour a foundation. This is the step that keeps a design from **painting future scope into a corner** — the failure the per-intent loop otherwise invites, because designing one intent in isolation is blind to the intent three phases out that hangs an object off the one you're modeling now. Before you choose a single object or relationship, load the intent's neighborhood:

```bash
node .claude/skills/ql-check-scope/scope-digest.mjs --neighbors INT-NNN \
  || node .agents/skills/ql-check-scope/scope-digest.mjs --neighbors INT-NNN \
  || node "${CLAUDE_PLUGIN_ROOT}/skills/ql-check-scope/scope-digest.mjs" --neighbors INT-NNN
```

(The generator is vendored with `/ql-check-scope` into the harness's skills dir — `.claude/skills/` or `.agents/skills/` — so the chain tries both, then falls back to the plugin for a plugin-only checkout.)

It prints a compact, focused digest — not the whole intent set — of three things:

- **BUILT ON** — the upstream intents this one depends on, tagged with delivery status. A ✅ Delivered upstream is a shape you must **build consistent with and reuse**, not reinvent — the same object, the same permission set, the same automation entry point where it fits.
- **BUILDS ON THIS** — the downstream forward cone: future intents that (transitively) depend on this one. This is the core of forward-looking design. Read each one's build target and ask: *does my data model / relationship / sharing choice leave room for it?* A lookup where a later intent needs a master-detail roll-up, a per-record flag where a later intent needs a related object — decide it now, with the future intent in view, not at the PR where that intent finally lands.
- **EPIC SIBLINGS** — intents in the same epic with no declared dependency. The honest proxy for "probably touches the same objects" that the dependency graph can't see — scan them for shared objects/fields you should design for once.

The neighbors digest also prints this intent's **GROUNDING** (its approved requirement/architecture link) when the engagement is grounded. In a regulated / ARB-governed engagement, that grounded architecture is the standard your approach must conform to — read it before you choose the data model, and fill the design's **`## Architecture conformance`** section against it (conform, or flag the deviation for ARB ratification — never build silently past the approved design).

**Read the inherited architecture premises, too (decisions/0009).** Beyond per-intent grounding, a grounded engagement carries **standing architecture premises** the whole build must honor — the ADRs mirrored read-only into `scopezilla/decisions/` (`Source: scopezilla-inherited`): single-org, LWR-over-Aura, reuse-over-per-program-customization, PII-residency, and the like. **This is the detector for a *silent* deviation** — the dangerous case the `conformance` report can't see, because it only audits deviations that were already declared. So before you settle the approach, read every inherited premise this intent's build could touch and judge honestly: does the approach conform? If it strays — you're forced to (an agent-tooling gap, a platform limit) or you're choosing to after weighing it — **push back first** (is there a conforming approach? say so and prefer it). If the stray still stands, it is a **deviation**, and a deviation must be *declared*, never silent: author the `BLD-NNNN` superseding ADR in Step 6b and reference it in `## Architecture conformance`. Skip this entirely when `scopezilla/decisions/` is absent (commercial engagement, default zero — no premises to conform to).

Fold what you learn into the design's **Data model / Sharing / Automation** sections, and — critically — where a future intent needs a shape this build would **preclude**, say so explicitly in **`## Neighboring & future scope`** and (if it forces a real trade-off) raise it as a `Q-design-x`. Flagging a corner is in-scope; silently picking an approach that boxes in INT-011 is exactly the trust-chain erosion this step exists to prevent. You are **not** building the future intents now (that's scope creep — `/ql-check-scope` still governs); you're *designing so they remain buildable*.

### PRESENT IN ORG — what already exists that this intent lands on (brownfield)

The digest above knows *our* scope — it is blind to the **customer's existing org**. Most engagements are brownfield: the org (and often this repo's metadata) already holds objects, fields, automation, and sharing config this intent lands on top of. Designing against a blank slate is how a design reinvents a field that exists, or proposes a Flow that collides with an existing trigger — caught only when it fails in the sandbox. So before you choose the data model, **consult what's already there** (ADR `decisions/0005`). Two sources, cheapest-and-always-available first — this is questions-first, not a fixed command; prefer the loaded DX MCP `metadata`/`data` tools and fall back to the `sf` CLI floor shown here:

1. **Local repo metadata first** (always available, no org auth) — search `force-app/**` (per `sfdx-project.json`) for the objects/fields/automation this intent names. A plain file search; the repo is the source of truth for metadata.
2. **Live org query second** (when an org is reachable) — what's actually *deployed*. What to find out, not how:
   - *Does this object/field already exist?* — `sf sobject describe --sobject <Object> --json` (read `.fields[].name`), `sf org list metadata --metadata-type CustomObject`.
   - *Existing automation on this object I'd collide with?* — tooling API: `sf data query --use-tooling-api -q "SELECT DeveloperName FROM FlowDefinition"`, likewise `ApexTrigger` (filter `TableEnumOrId`), `ValidationRule`.
   - *The shape of what exists*, when reuse is on the table — describe/retrieve the specific component.
3. **Neither reachable?** Record **`⚠ org not consulted`** in the design and flag it for a human-confirm — never guess that something doesn't exist.

**The org-vs-repo delta is its own signal.** Something present in the *org* but not the *repo* is **untracked** — a bigger flag than plain existence (you'd build against something source control doesn't know about). Call it out distinctly; it leans toward stop-and-surface.

**Then apply the dispositions — grill posture, human decides.** You present what you found *with a recommendation*; the Trusted Guide decides. Weight the ceremony by how hard the mistake is to reverse:

- **Stop-and-route** (proceeding creates something hard to undo):
  - **Collision / conflict** (an existing trigger, an OWD that fights the sharing plan, a wrong-type field you'd migrate data off later) → raise a `Q-design-x`; the human settles it before build.
  - **Structural duplicate** (the thing exists but this intent would create a *differently-shaped* dupe — a second field where one should be extended, a lookup where the existing is master-detail) → route to `/ql-refine-intent` to correct the build target to "extend existing," not "create." Shipping the duplicate *is* the irreversible mistake.
  - **Untracked-in-org** (the delta above) → leans here; warrants a human look.
- **Note-and-proceed** (a recorded trace is enough): **clean-match reuse** (exists in exactly the shape the intent wants — build *on* it, record one line) and **genuinely different** (same name, different purpose — note *why*, proceed).
- **When unsure which side of the line you're on, treat it as hard-to-reverse and stop.** A false stop costs ~30 seconds; a false proceed ships the duplicate/collision. Bias toward surfacing.

Fold the findings and their dispositions into **`## Neighboring & future scope`** (§ below), and surface the stop-and-route ones to the Trusted Guide as `Q-design-x` / a `/ql-refine-intent` route. This is the same reuse-vs-rebuild call this step already owns — "standard-first, no custom you'll regret" — with "it already exists in the org" as brownfield's biggest source of regret.

## Step 3 — Ground platform decisions in authoritative docs

The whole value of this step is catching a wrong platform call early — so don't make the call from memory. When the design turns on a mechanic you're not certain of — what a relationship type allows, how Apex-managed sharing behaves, what a feature requires to be enabled, a governor limit, a metadata shape — **confirm it against official Salesforce documentation** (the **`salesforce-docs`** MCP if wired — `list` to pick the doc collection, `search` it to find the page, `fetch` to read the body; ground in `developer.salesforce.com` / `help.salesforce.com` / `architect.salesforce.com`). A design doc that confidently proposes something the platform doesn't support is worse than none — it gets ratified and then fails at build. Same reflex as the build conventions: look it up or flag it, don't guess.

What makes the search land: `search` runs over **one** `collection`, so call `list` first to find the right one (its names are the catalog entries, not a format you construct) and pass it to `search`. Quote exact phrases and include literal tokens verbatim — an API name (`getRecord`), an error string (`INVALID_FIELD_FOR_INSERT_UPDATE`), a permission name — so retrieval requires them. Then `fetch` the picked result's `id` for the full body.

**Don't cite a doc you didn't read — this is the guard against grounding a design on a hallucinated or misranked "fact."** Semantic search ranks by where a *phrase* appears, not where the *definitive* answer lives, so the top hit can be an incidental mention while the real answer sits lower (or the authoritative limit lands on a niche page instead of the canonical reference). Treat every hit as a **candidate to read, not an answer**: `fetch` the body, confirm it says what the excerpt implied, prefer the canonical `developer.salesforce.com` reference over a passing mention, respect the page's edition/version scope (don't generalize a release- or edition-specific limit past what the doc says), and cite the page you actually read (`[docs:<url>]`) — **never construct a URL yourself**; if the fetched body doesn't support the claim, it isn't grounded. Same read-before-cite discipline this step applies to KB atoms. If the docs MCP isn't wired, drop to the public doc sites directly — a missing docs MCP never blocks the design.

**Keep the docs MCP's lane narrow — it grounds a *fact*, not the *decision*.** Use it to confirm a **capability / limits** question (does the platform support X, what's the governor ceiling, what does a feature require to be enabled). It does **not** ground a prescriptive **architecture-decision fork** — Flow-vs-Apex, master-detail-vs-lookup, the standard-first call this step exists to make. That's the KB's curated judgment (next paragraph), which is the *first* reach when it's installed; the raw docs are a capability backstop below it, not a substitute for it.

**When the `kb-salesforce` MCP is installed, consult it first.** The curated architecture KB ([project-kb-salesforce](https://github.com/salesforce-internal/project-kb-salesforce)) carries the *how-to-build-it-right* layer the raw docs don't — patterns, **anti-patterns**, and decision frameworks with explicit "when to apply / when NOT to apply" guidance, exactly the standard-first judgment this step exists to apply. Use `kb_search` (filter by `capability` / `cloud` / `kind`, e.g. `kind: anti_pattern` to check the approach you're about to propose against a known trap), `kb_get` to read the full atom, and `kb_related` to traverse curated see-also links. Cite the atom id (`KA-XXXX`) in the design's *Alternatives considered* or a `decisions/` record when it drove a call — and note its `captured_at` when a decision leans hard on one atom, because the KB updates only by manual `git pull` and a local clone can lag; a call resting on a stale atom is a flag for the Trusted Guide, not a silent fact. When a mechanic is time-sensitive (a recently-GA feature, a limit that's changed), confirm the atom against the live doc site rather than trusting a possibly-old capture. The KB is **optional and degrades gracefully** — when it's not installed, drop to the doc sites above; a missing KB never blocks the design. (If its semantic layer is unavailable, `kb_search` still returns useful lexical hits — keep using it, just weight the ranking less.) And keep the lane strict: the KB grounds the **approach**, never the Intent — it informs Flow-vs-Apex or master-detail-vs-lookup; it never redefines what the intent asks for.

**When reading can't settle a fork, spike it in a throwaway scratch org.** Some design questions turn on *runtime behavior* no doc states — whether bulk sharing recalculation stays under the governor limit at this volume, which order two record-triggered Flows fire, whether a rollup performs. When a fork like that blocks the design and neither docs nor the KB answer it, answer it empirically: stand up a **scratch org**, build the smallest thing that settles the one question, fold the answer into `design.md` (and a `decisions/` note if it drove the call), and **discard the scratch org — never commit its metadata.** It's a probe, not the build; committing it would leak an unreviewed shape into the deploy. This is the in-build echo of scoping-time prototyping — `scopezilla:prototype` sharpens *scope*; this answers a *build-design* question — and it's a throwaway from day one: keep the answer, delete the org. Reach for it only when reading genuinely can't settle the fork; a spike is cheap, not free.

## Step 4 — Draft the design

Write `intents/INT-NNN/design.md` (the intent's directory already exists). Stamp the **current** scope hash into the frontmatter:

```bash
node scripts/intent-ledger.mjs hash INT-NNN    # copy the 12-char hash into scope_hash:
```

The stamp ties the design to the version of the intent it was drawn for — like the test script. If the intent's scope later moves, the design (and its proof plan) should be revisited; the stamp makes that checkable. Set `authored:` to today.

Fill each section from what the intent actually supports. Be concrete and Salesforce-specific — name the objects, the relationship types, the permission sets, the automation tool. Where the intent is silent on something the design needs, write an **`## Open design questions`** `Q-design-x` rather than inventing a requirement — an honest gap beats a fabricated one, exactly as in the intent itself. **Standard-first**: if you're proposing custom (Apex, a custom object where a standard one fits), the "Alternatives considered" section must say why the standard path doesn't work.

## Step 5 — Surface cascading consequences (and sequence them when the order isn't obvious)

This section earns its place. A Salesforce design that lists a new object/field but ignores what it takes to *use* it isn't a design — it's a half-plan that ships an unusable increment. Walk the ripple explicitly: FLS on the right permission sets, the app slot, the Lightning page / page layout / list view, the profile/permission-set access, the tests new Flows/Apex imply. Put the in-scope ancillary work in the design and flag the rest for the PR's deferred section. The bar is a *usable* increment (see AGENTS.md → Cascading consequences).

**The ripple includes org configuration the design *assumes*, not just metadata it creates.** A standard-object build often depends on org-level setup that isn't anyone's build target and isn't in the metadata deploy — a Default Case Owner, an Org-Wide Email Address, Business Hours, a queue, a case-assignment default. On a **greenfield org these do not exist yet**, so the increment deploys clean and still doesn't work: the real failure mode this catches. Ask, for this design: *what must already be true about the org for this to behave?* Name each precondition, whether it exists in the target org (check, don't assume), and route it to `delivery/deploy-runbook.md` — the ordered list a fresh org is stood up from. Catching it here is the point; the runbook is otherwise filled *reactively* from each PR's §4, which means the first person to discover a missing prerequisite is whoever is debugging it.

Don't work from a remembered list of a cloud's prerequisites. Which setup a given feature requires is a **platform fact** that changes by release — confirm it against Salesforce documentation (`AGENTS.md` → *don't build Salesforce from memory*) rather than reciting a checklist. If a precondition is genuinely someone else's decision (who *should* own unassigned cases?), it's a `Q-design-x`, not a guess.

**When the build order isn't obvious, sequence it into `## Build sequence`.** The standard cascade — object/fields before their FLS, FLS before the app/page/layout/list-view that surfaces them, those before the automation and its tests, config and data last — is a given; don't spend a section restating it. Reach for the section when the ordering is genuinely non-obvious or a step must deploy on its own: a data migration wedged mid-build, a near-circular dependency, anything that ties to `delivery/deploy-runbook.md`. Then a short ordered list earns its place; a rote copy of the default cascade is boilerplate the reader already knows.

## Step 6 — Present for ratification, then hand off

Show the design to the Trusted Guide and let them ratify or redirect — **the approach is theirs to approve.** Surface the calls that matter (the relationship choice, the standard-vs-custom decision, the sharing model) rather than burying them. Then:

- **Record the material architecture calls in `decisions/`.** In AI-native delivery terms an architecture choice *is* a Decision — so when a ratified design makes a real one (the relationship model, the sharing approach, standard-vs-custom, the integration pattern), write it to `decisions/YYYY-MM-DD-<slug>.md`: the `design.md` is the working *approach*, the decision file is the *why this over the alternatives* that belongs in the engagement's permanent record. Don't let `design.md` become a parallel architecture log that competes with `decisions/` — the design proposes, the decision records the ratified call. (A genuinely routine design that settles nothing notable — wiring an obvious field — needs no decision file; the bar is "a call future-you would want to look up," same as any other decision.)
- **If a `Q-design-x` blocks the build**, it's an action item for the human, not something to guess past.
- **Hand off to `/ql-test-script`** — now that the approach is agreed, the proof plan is drafted against a real design (which tests, against which objects, which manual scenes for which UI surfaces). A design ratified, then proven: that's the sequence.

## Step 6b — Declare a deviation from an inherited premise (only when one stands)

Fires **only** when Step 2 found this approach must deviate from an inherited architecture premise (`scopezilla/decisions/`, `Source: scopezilla-inherited`) and, after you pushed back, the Trusted Guide accepts the stray. A deviation that stands must be **declared**, so the `conformance` report can prove it later got an ARB signature — a silent one is the single forbidden case. Author a **build-authored architecture ADR** — this is a first-class `decisions/architecture/` record, distinct from the routine `decisions/YYYY-MM-DD-*.md` build note in Step 6:

```markdown
# BLD-NNNN — <the deviating premise, in our words>
**Date:** YYYY-MM-DD · **Source:** build-authored · **Supersedes:** 0004 · **Deviation:** pending-ARB
## Context      — why we're forced to / choosing to deviate; the pushback that happened first
## Decision     — the standing rule we're adopting instead, in our words
## Consequences — what this cascades into; what reverting it would cost
## Grounds      — the inherited premise (0004) it departs from, and the reason it can't be met as written
```

- **Numbering:** `BLD-NNNN`, next free number **in the `BLD-` sequence** (eyeball `decisions/architecture/` for the highest `BLD-` and add one). Inherited ADRs keep Scopezilla's `00XX` numbers; the `BLD-` prefix is a separate namespace so the two can never collide across re-ingests.
- **`Supersedes:`** names the **live** inherited ADR id(s) this departs from — this is the edge the `conformance` report reads. (A premise SZ already retired during scoping — `Status: superseded-by-NNNN` — is historical, not standing; there's nothing to deviate from, so don't supersede it.) **Do not edit the inherited ADR** (it's read-only provenance in `scopezilla/decisions/`, re-mirrored on ingest; editing it would look like drift and could be reverted). The link is one-directional, from the `BLD-` ADR only.
- **`Deviation: pending-ARB`** is the open state. The ARB sign-off is an **accountability act that stays human** — you draft the record pre-filled `pending-ARB`; when the ARB signs, a human flips it by hand to `accepted-by-ARB (YYYY-MM-DD, <who>)`. There is no skill for the flip, by design. Tell the Trusted Guide plainly: "this deviation needs ARB sign-off — flip the `Deviation:` line to `accepted-by-ARB` with the date once they approve."
- Reference the `BLD-NNNN` id from the design's `## Architecture conformance` section.

## What this does NOT do

- It does **not** build the intent or write metadata. It proposes the approach; the build is yours from there, against the ratified design.
- It does **not** edit the intent (`intents/INT-NNN/intent.md`). If designing reveals the *what* is wrong or a dependency is undeclared, route to `/ql-refine-intent` — design proposes *how*, it doesn't redefine scope.
- It does **not** ratify its own design. The approach is the Trusted Guide's to approve, like Intent itself — you draft and present, they sign off.
- It does **not** replace the PR review. It moves architecture review *earlier* (before code); the PR still validates the built result against the design and the proof plan.
- It is **not** mandatory. A trivial intent skips it. Don't manufacture a design doc for a single field.
