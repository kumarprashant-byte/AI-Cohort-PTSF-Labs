---
name: ql-start-intent
description: >-
  Open one intent to build — clear context, confirm it's in scope, cut its feature branch, flip the ledger to in-progress, and draft its test script. The front of the per-intent build loop, chaining /ql-check-scope, /ql-vet-intent, /ql-design-intent, and /ql-test-script. This owns "build INT-" (opening the intent to build); for the architecture/approach only, use /ql-design-intent. Triggers — "start an intent", "build INT-", "/ql-start-intent".
produces: A `feature/INT-00x-slug` git branch + the intent's ledger row flipped to In progress; chains /ql-design-intent and /ql-test-script, which write the design.md and test-script.md. No commit of built code (the build is yours from there).
---

# Start an intent — open one unit of work the right way

This skill opens **one unit of work** — a single intent — so it begins on its own branch, with its ledger row flipped and its proof plan drafted, in a fresh context. It's the front of the per-intent loop: it doesn't re-implement `/ql-check-scope`, `/ql-vet-intent`, `/ql-design-intent`, or `/ql-test-script`, it *sequences* them and adds the three things nothing else does — the context-clear nudge, the feature branch, and the ledger flip.

Why this matters: an intent that starts on the wrong branch (or on top of the last intent's branch), without its ledger row moved or its proof plan drafted, is already off the trust chain before a line is built. This skill makes the disciplined start the easy one.

**The lane.** You build to Intent on a feature branch and take it as far as a **PR into `develop`** (the integration line). That's where your autonomy ends. Cutting `release/*` branches and promoting to production are the **Trusted Guide's** calls — the human owns the release gate and the customer. Don't open release branches or push toward prod on your own.

## Step 1 — Clear context first (advisory)

A fresh intent deserves a fresh context. If this session already carries work from another intent, a debugging thread, or a long exploration, **recommend the user run `/clear`, then re-invoke `/ql-start-intent INT-00x`** — stale build state from the last unit of work leaks bugs and false assumptions into the next one. A skill can't clear its own context; this boundary is the one place the nudge reliably lands, so surface it rather than skip it.

If the session is already clean (you've just started, or just finished a `/clear`), say so and continue.

## Step 2 — Resolve the intent

Take the `INT-00x` id from the user. Confirm it exists and read its identity:

```bash
node scripts/intent-ledger.mjs hash INT-00x   # prints "INT-00x  <hash>  <title>"
```

If the id doesn't match, stop and list the intents (`node scripts/intent-ledger.mjs hash` with no id). If no id was given, list them and ask which one.

Then read the full intent from `intents/INT-NNN/intent.md` (the living canonical Intent). You need its `phase`, `title`, and a short slug derived from the title for the branch name. Keep the slug lowercase, hyphenated, a few words (e.g. INT-005 "Allocate the closest qualified practitioner" → `practitioner-allocation`).

## Step 3 — Scope reflex

Before building anything, confirm the intent is actually buildable now — run the `/ql-check-scope` reasoning against it (invoke the skill, or apply its logic): is it **current-phase** (not a future-phase intent you'd be building early), **not already ✅ Delivered** in the ledger, and **not gated on an unanswered open question** (`Q-00x`, cross-checked against `decisions/`)? If it's deferred, delivered, or blocked, say so and stop — don't open a branch for work that shouldn't start.

```bash
node scripts/intent-ledger.mjs drift   # also confirms the intent isn't already delivered/drifted
```

## Step 4 — Readiness reflex

`/ql-check-scope` settled *should I build this?* — now confirm *is the intent ready to build against?* Run the `/ql-vet-intent` reasoning against it (invoke the skill, or apply its logic): is the `build target` concrete, the `acceptance` provable, the silence honest (open questions, not guesses), the cascading Salesforce work and dependencies acknowledged? If it surfaces a **⛔ Not ready** finding — an unprovable acceptance, a silent gap on a core requirement, a build target too vague to implement — surface it and **pause**: the fix is a human-ratified edit via `/ql-refine-intent` (or `/ql-capture-intent` for a gap that's really its own intent), not something to power through. A buildable-with-caveats verdict is fine to proceed on with the caveats named. This keeps the proof plan in Step 7 sharp — a vague intent makes a vague test script.

## Step 5 — Cut the feature branch

One branch per intent, named `feature/INT-00x-slug` (e.g. `feature/INT-005-practitioner-allocation`).

**Adapt the base/target to the repo's actual pipeline** — read what's there, don't assume:

```bash
git branch -a            # is there a develop branch?
ls .github/workflows/    # are the feature-ci_* workflows present?
```

- **Full pipeline** (a `develop` branch exists, or `feature-ci_*.yml` workflows are present): base the branch off `develop` and target your eventual PR at `develop`. This is the canonical flow — `feature/* → develop → release/* → main → prod`.
- **Simple flow** (only `main`, with `sf-validate.yml` + `sf-deploy.yml`, e.g. a repo seeded before the four-workflow pipeline): base off `main` and target `main`.

State which you chose and why ("Found a `develop` branch and `feature-ci_*` workflows — basing off `develop`."). Make sure the base is up to date first:

```bash
git checkout develop && git pull   # or main, per the above
git checkout -b feature/INT-00x-slug
```

**Push the branch if anything beyond this local checkout will build on it.** `git checkout -b` creates the branch *locally only* — a teammate or an external build tool that reads the remote repo can't see it until it's pushed:

```bash
git push -u origin feature/INT-00x-slug
```

For cross-cutting foundation work that maps to no single intent, `feature/phase-N-foundation` is the fallback name — but prefer per-intent branches.

**When the build happens in an external tool** (a builder that reads the remote git repo rather than this Claude Code session), the branch cut is a mechanical step you can hand *to that tool* rather than doing it here — and doing so removes the "was the branch ever pushed?" failure mode, since a branch the build tool creates is born on the remote where the tool can use it. In that setup, keep every trust-significant act in this session — the scope gate (Step 3), readiness (Step 4), design ratification (Step 7), and the ledger `start` flip (Step 6) — and treat the **ledger flip as the "go" signal, not the branch**. The build tool then cuts and pushes `feature/INT-00x-slug` (to the naming convention above) as its first build action. Either way the branch name follows the convention so CI and `deliver --pr` line up.

## Step 6 — Flip the ledger to in-progress

```bash
node scripts/intent-ledger.mjs start INT-00x [--pr <ref>]
```

This is the ledger write that **opens** the work (`deliver`, `retire` and `reverify` are its lifecycle siblings) — it flips the row to 🔧 In progress, is idempotent, and refuses to reopen a ✅ Delivered or 🔄 Needs re-verify row. Pass `--pr` once you have a PR number; it's fine to start without one and add it when the PR opens. If `start` warns the intent isn't ratified, ask the Trusted Guide now — they've just read it with you in Step 4 — and record it with `node scripts/intent-ledger.mjs ratify INT-00x --by "<their name>"`. Never ratify it yourself; `deliver` refuses a draft with no ratification or a stale one (a missing record only warns). If the engagement reports through Jira, `/ql-sync-jira start INT-00x` is the scoped, transition-only path that flips the ledger *and then* the Jira story (ledger first, always).

> **Start the intent when the *work* begins — including design review — not when coding begins.** The ledger's statuses (⬜ / 🔧 / ✅ / 🔄 / 🚫) track the *delivery lifecycle* — not started, building, delivered, drifted, retired — not a project-management workflow, and it stays lean rather than becoming a Jira. So the 🔧 **In progress** flip happens *here, at the front of the loop* — **before** `/ql-design-intent` (Step 7). If your team reviews design up front (a senior IA designs, an associate builds), that design-review window is correctly **In progress**, and — because this flip precedes design — it's visible in the ledger and any Jira projection from the moment design starts, not only once code lands. If a story feels like it needs a distinct "in design vs. in build" status, that's a signal to *sequence the start here* — don't add a PM-workflow state (a lifecycle state like 🚫 Retired earns its place; a process substate doesn't).

## Step 7 — Design the approach (when it's non-trivial)

If the intent is more than a trivial change — a new object, a sharing/FLS change, an integration, anything with Apex — hand off to `/ql-design-intent` to propose the Salesforce build approach **before** you build: the data model, the sharing & security (with the cascading app/page/layout work), the automation choice (standard-first), the integration pattern, and the alternatives considered. It writes `intents/INT-00x/design.md` (beside the intent) for the Trusted Guide to **ratify before the build starts** — catching a wrong relationship type or a should-be-declarative-Apex call while it's cheap, not at PR time. `/ql-design-intent` loads the intent's **neighborhood** (what's already built + the downstream cone that will build on this) as its second step, so forward-looking design is covered on this path. A genuinely trivial intent (a field, a list view) skips this — say so and move on. Don't reproduce the design work here; invoke the skill.

**If the intent is trivial and skips `/ql-design-intent`, still take the 10-second neighbor glance** — a "trivial" field or list view can still need to sit on the right (already-delivered) object, or be the thing a future intent hangs off:

```bash
node .claude/skills/ql-check-scope/scope-digest.mjs --neighbors INT-00x \
  || node .agents/skills/ql-check-scope/scope-digest.mjs --neighbors INT-00x \
  || node "${CLAUDE_PLUGIN_ROOT}/skills/ql-check-scope/scope-digest.mjs" --neighbors INT-00x
```

Read it for two things only: build **consistent with** what's ✅ Delivered upstream (reuse the object/permission set, don't reinvent), and note anything in the downstream cone or epic siblings that your trivial change should not quietly preclude. If it surfaces something non-trivial, that's the signal the intent wasn't so trivial — reconsider `/ql-design-intent`. This is the one place forward/past scope enters the trivial path, so don't skip it.

**And take the lightweight existing-org check** — a "trivial" field or list view is *exactly* what a brownfield org already has, so the trivial path is where duplication is most likely (ADR `decisions/0005`). Name the concrete metadata this intent will create/touch, then look for it — **local repo metadata first** (search `force-app/**` per `sfdx-project.json`; always available, no auth), then a **targeted org query** if an org's reachable (e.g. `sf sobject describe --sobject <Object> --json` for a field, tooling-API for existing automation — prefer the loaded DX MCP `metadata`/`data` tools, `sf` CLI as the floor). This is best-effort, not a dump. If no source is reachable, say **`⚠ org not consulted`** and ask the human to confirm before building — never assume it's absent.

Then **present what you found with a recommendation and let the human decide** (grill posture, not auto-halt). Weight by reversibility: if it looks like a **collision** or a **structural duplicate** (or it exists in the org but not the repo — untracked), **stop** — this intent wasn't so trivial; route to `/ql-design-intent` (collision → `Q-design-x`) or `/ql-refine-intent` (extend, don't create). If it's a **clean match** (reuse it) or **genuinely different**, note the one-line disposition and proceed. **When unsure, treat it as hard-to-reverse and stop** — a false stop costs 30 seconds; a false proceed ships a duplicate. Either way, the disposition goes in the PR's **Existing-org consultation** line so it's visible at review.

**And, only if the engagement carries inherited architecture premises, take the conformance glance (decisions/0009).** Check whether `scopezilla/decisions/` exists (`Source: scopezilla-inherited` ADRs — single-org, LWR-over-Aura, reuse-over-customization, PII-residency). If it doesn't, this whole step is silent — a commercial engagement has no premises to conform to; move on. If it does, ask the one question even a trivial change has to pass: **does what I'm about to build cut against a standing premise?** Most trivial changes don't (a list view rarely contradicts LWR-over-Aura) — but "over-customize for one team when reuse was the premise" can hide in something that *felt* trivial. If it might stray, that's the signal it wasn't trivial: **push back, and route to `/ql-design-intent`** so the deviation is judged and — if it stands — declared as a `BLD-` ADR before the build. Never build silently past an approved premise; a silent deviation is the one forbidden case. (This is a glance on the trivial path; `/ql-design-intent` does the full evaluation on the non-trivial path via its neighbors step.)

## Step 8 — Draft the test script up front

Hand off to `/ql-test-script` to draft this intent's proof plan **before** you build — `intents/INT-00x/test-script.md` (beside the intent), decomposing every guardrail, acceptance clause, and out-of-scope denial into discrete criteria marked by how each is proven. Building against the proof plan (rather than writing it after) is what keeps "done" meaning *proven*. With a ratified design in hand (Step 7), the proof plan is drafted against a real approach, not guessed. Don't reproduce that work here — invoke the skill.

## Step 9 — Orient the build

Briefly point the user at what carries the work from here:

- **The vendored Salesforce build-skill library is your execution layer.** The engagement repo already carries `forcedotcom/sf-skills` (installed by `/ql-setup`) — when the build calls for generating Apex, a permission set, metadata, an LWC, or running a deploy, reach for the matching skill rather than hand-rolling. Discover the right one by its `domain-noun-verb` name (`platform-apex-generate`, `platform-permission-set-generate`, `platform-metadata-deploy`, …); the `ql-*` skills govern *to Intent*, sf-skills *execute*. Don't rely on a hardcoded list — the library moves; find the skill that fits the task at hand. (decisions/0032)
- **`delivery/build-notes.md`** — skim the recurring Salesforce deploy/Flow/Apex traps before building a new automation/lifecycle intent. **Write side:** if you fight through a *repeated* trap (more than one attempt to get a deploy/Flow/Apex step working) whose fix is general enough to bite the next intent, **propose appending a one-line gotcha back to it** — the human approves. Per-increment specifics stay in the phase `README.md` "Gotchas"; this file is for what bites the *next* intent. (decisions/0033)
- **The PR template's §2 traceability matrix** — the centerpiece of the eventual PR; it *references* the `INT-00x-Cy` criteria from the test script rather than re-deriving proof.
- **The lane, restated:** build to a PR into `develop`; that's where you stop. `release/*` and prod promotion belong to the Trusted Guide.

## What this does NOT do

- It does **not** cut `release/*` branches or promote to production — those are the human's (see **The lane**, above Step 1).
- It does **not** re-implement `/ql-check-scope`, `/ql-vet-intent`, `/ql-design-intent`, or `/ql-test-script` — it sequences them.
- It does **not** edit the intent itself (`intents/INT-NNN/intent.md`) — refining scope is `/ql-refine-intent` / `/ql-capture-intent`. The only write here is the ledger `start` in Step 6.
- It does **not** build the intent. It opens the unit of work cleanly; the build is yours from there.
- It does **not** close the intent out. When the build is deployed to its build org and before you open the PR: if the intent's test script has **`org-probe` ✅** criteria, run **`/ql-verify-build INT-00x`** so the org earns those marks (it queries the build org and writes commit-pinned evidence — the automated twin of `/ql-record-test-execution`'s manual sign-off, decisions/0031); run `node scripts/intent-ledger.mjs preflight INT-00x` for a ready-to-deliver readout (it runs the coverage + drift checks CI would, so an unproven ✅ or a drifted stamp is caught before the PR round-trip — advisory, never a gate); then, as you assemble the PR, `node scripts/intent-ledger.mjs deliver INT-00x --pr <ref>` is the closing bookend — it flips the row to ✅ Delivered, stamps the scope hash, and refreshes the delivery index in one write (see the PR template's §2). `start` opens; `deliver` closes.
