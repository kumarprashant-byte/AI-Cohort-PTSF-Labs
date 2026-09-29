---
name: ql-generate-deployment-plan
disable-model-invocation: true
description: Generate or update a per-intent deployment plan classifying each component as metadata deploy vs. manual step, in dependency-safe order, before standing the intent up on an org.
produces: >-
  A new or updated `intents/INT-00x/deployment-plan.md` co-located with the intent — a component-by-component deploy-vs-manual classification + ordered pre/deploy/post steps + sandbox-confirm open items. Idempotent — re-running reconciles against the current design/build state, preserving confirmed rows and updating changed ones. Also nudges rolling deployment-relevant manual steps into `delivery/deploy-runbook.md` and the delivering PR's §4. Does not deploy anything, edit the intent, or write the ledger.
---

# Deployment plan — classify what deploys vs. what's manual, idempotently

A deployment plan here is the durable answer to one question for a single intent: **of everything this intent builds, what rides the metadata deploy, and what has to be done by hand — before or after — for the deployed metadata to actually work?** It's the bridge between the design's *build sequence* (the ordered how) and `delivery/deploy-runbook.md` (the consolidated, cross-intent stand-up list). It lives beside the intent it serves: **`intents/INT-00x/deployment-plan.md`**.

It is **idempotent by design**. Salesforce metadata deployability is learned incrementally — you know some of it at design time, more once you've deployed to a sandbox and watched what didn't carry. So this skill is built to be **re-run at any point** (design → build → post-first-deploy), each run reconciling the plan against the current design/build/test-script state: adding newly-surfaced components, moving a row between 📦 and ⚙️ when a sandbox confirms it, and **never clobbering a row a human has already confirmed**. A plan regenerated from scratch every time would lose exactly the hard-won "we tested this — it deploys inactive" knowledge; this skill preserves it.

> **What stays human.** This skill *drafts and updates* the plan; it does not deploy, does not edit the intent (scope is `/ql-refine-intent`'s), and does not write the ledger. Deployability facts it can't confirm from docs/repo are flagged **sandbox-confirm**, not guessed — same honesty bar as the rest of the trust chain.

## Step 1 — Resolve the intent and read its neighborhood

Take the id (e.g. `INT-042`). Confirm it exists and read the sources that tell you what gets built and in what order:

```bash
node scripts/intent-ledger.mjs hash INT-042   # confirms the intent exists; prints title
```

Read, in this order (later ones sharpen the classification; missing ones just narrow what you can say):

1. **`intents/INT-00x/intent.md`** — the canonical scope. Guardrails and acceptance often name load-bearing gates (a break-glass/self-lockout sequence, a "before go-live" constraint) that become ordered steps here.
2. **`intents/INT-00x/design.md`** — the primary input. Its **Build sequence** (if present, with `M`/`R` markers) is most of your raw material; its Data model / Automation / Integration sections name the concrete metadata types. If there's no design yet, say so — you can still draft a plan from the intent, but it will be coarser and should say `⚠ no design.md yet — classification is provisional`.
3. **`intents/INT-00x/test-script.md`** — criteria often reveal manual/config-only steps (a persona assignment, a Setup toggle to verify) and external/validation gates that cap when a step can run.
4. **`intents/INT-00x/deployment-plan.md`** — **if it already exists, this is a reconcile, not a fresh write** (Step 4). Read it fully first.
5. **`delivery/deploy-runbook.md`** and **`delivery/build-notes.md`** — for the engagement's deploy conventions (deploy order gotchas like classes-before-Flows, the runbook legend) so this plan speaks the same language and rolls up cleanly.

## Step 2 — Enumerate the build components

From the design (build sequence + data-model/automation/integration) and the intent, list every discrete thing the build produces or changes. Don't merge distinct components — the whole value is per-component classification. Typical sources of a component:

- Each metadata artifact the build deploys (objects, fields, permission sets, TSPs, Apex classes + tests, Flows, reports/list views, settings metadata like `EventSettings`/`RealTimeEventSettings`, layouts, apps).
- Each **enablement** the metadata depends on (a feature/license toggle, a Setup switch).
- Each **binding/config** step that isn't in the metadata (a permission-set *assignment* — distinct from its *definition*; a scheduled job's *CronTrigger* — distinct from its Schedulable *class*; a named-credential secret; a recipient/endpoint value).
- Each **process gate** (an external sign-off, a "before go-live" swap, a sequencing gate tied to another intent).

## Step 3 — Classify each component: deploys, or manual?

This is the core judgement. For each component, decide whether it **rides the metadata deploy** or must be **done by hand**, and if manual, what kind and when. Use this taxonomy (the same legend the plan file uses):

- **📦 metadata deploy** — a metadata component that deploys via the Metadata API / `sf project deploy` and behaves once deployed.
- **⚙️ Setup UI** — a Setup toggle/config that isn't in deployable metadata, or a metadata item that deploys but needs a Setup action to *take effect* (e.g. activation, enablement verification).
- **▶️ anon Apex** — a one-off script step (`System.schedule(...)` for a CronTrigger, a backfill the CLI can't express).
- **🔑 license/feature** — a licensed feature or org-perm that must be enabled first (often ⛔ irreversible; usually **pre-deploy**).
- **👤 process/human gate** — a sign-off, a cross-intent sequencing gate, a "confirm with the customer" step.

**The recurring traps — split these, don't merge:**

| Looks like one thing | Is actually |
|---|---|
| "Deploy the permission set" | 📦 the **definition** rides the deploy · ❌ the **assignment** is manual, post-deploy (`sf org assign permset`) |
| "Deploy the scheduled job" | 📦 the Schedulable/Batch **class** rides the deploy · ❌ the **schedule** (CronTrigger) is ▶️ `System.schedule`, post-deploy |
| "Deploy the settings" | Settings metadata may deploy the **value** but not **enable the feature** — the enablement is 🔑, pre-deploy |
| "Deploy the notification/endpoint" | 📦 the policy/config rides · ❌ the real **recipient/secret/endpoint value** is often ⚙️/👤, pre-go-live (placeholder for build) |
| "Deploy the TSP / policy" | 📦 deploys · ⚠️ but **activation state on deploy** may be inactive → ⚙️ activate (confirm — see below) |

**When you can't confirm deployability, flag it — don't guess.** Whether a given settings-metadata deploy *enables* a feature, or whether a policy deploys **Active** vs. inactive, is often not cleanly documented. Ground it where you can: check the **local repo** (`force-app/**`) for the same metadata type already deployed, query a **reachable sandbox**, or reach for the **`salesforce-docs`** MCP if wired (`search` the right doc collection, `fetch` the body) against `developer.salesforce.com`. If it still isn't confirmable, put the component in the plan with its **best-guess** placement **and** an entry under *Open items to confirm in the sandbox* saying which way it might move. This mirrors AGENTS.md's "ground platform work, don't build from memory" — an unknown like this belongs in *Open items to confirm in the sandbox* rather than asserted as a confident row.

## Step 4 — Write or reconcile the file (idempotent)

Write **`intents/INT-00x/deployment-plan.md`**. If it doesn't exist, create it from the structure below. **If it exists, reconcile — don't overwrite blindly:**

- **Preserve human-confirmed rows.** A row whose note records a *confirmed* fact ("sandbox-confirmed: deploys inactive", a checked-off manual step, a resolved Open item) is hard-won — keep it. Update only the parts the current design/build actually changed.
- **Add** components that newly appear in the design/build; **update** rows whose classification the design changed; **resolve** an Open item when the source now settles it (move the row to its confirmed placement and note it). **Flag** a row as possibly-stale if the design moved under it, rather than silently rewriting a confirmed note.
- **Never drop** a manual step that's still real just because it's not in the latest design prose — if you think a previously-listed step is obsolete, surface it for the human, don't delete it silently (same rule as the test-script/compression guardrails: losing a load-bearing step is the drift we prevent).
- Note what changed since the last run in a short line at the top of your report (Step 5), so re-runs are auditable.

**File structure** (adapt to the intent — omit sections that don't apply, keep the legend and the three ordered phases):

```markdown
# INT-00x — Deployment plan

**Intent:** `intents/INT-00x/intent.md` · **Design:** `intents/INT-00x/design.md`
**Purpose:** what rides the metadata deploy (📦) vs. what is a manual pre-/post-deploy step, for the INT-00x build.

> Rolls up into `delivery/deploy-runbook.md` on delivery; each manual step also lands in the delivering PR's §4.
> **Legend:** 📦 metadata deploy · ⚙️ Setup UI · ▶️ anon Apex · 🔑 license/feature · 👤 process/human gate · ⛔ irreversible · 🔁 reversible.

## Summary — what deploys vs. what doesn't
| Component | Rides deploy? | Type | Note |
|---|---|---|---|
| … | ✅ 📦 / ⚠️ / ❌ | … | confirmed facts + cross-refs to gates/criteria |

## PRE-deploy manual steps (must happen first)
1. 🔑/👤 … (enablements, confirmations the deploy depends on)

## The metadata deploy (📦)
N. `sf project deploy start -o <org>` — in dependency-safe order (classes/fields before referencing Flows, per build-notes.md): …

## POST-deploy manual steps
- P1. ⚙️/▶️/👤 … (assignments, activations, recipient swaps, schedule, enforcement gates)

## Open items to confirm in the sandbox (grounding honesty)
- A — … (which way the row moves once confirmed)
```

Keep the ordering **load-bearing and explicit**: pre-deploy enablements before the deploy; within post-deploy, respect gates (a self-lockout sequence, a "before go-live" swap, a cross-intent validation gate). Restate the one or two hard gates in a short callout, the way the design's build sequence does.

**Write every step in plain human language** — the same readability bar as an intent statement, because a step is read and run by a Salesforce admin *and* an agent. Each step is a clear imperative action ("Assign the `X` permission set to the integration user"), not undecoded internal shorthand (KA numbers, control-framework jargon) and not rationale woven into the action. The classification symbols (📦/⚙️/▶️/🔑/👤) are the only shorthand; the step text says plainly what to do, plus at most a one-line plain `Verify:`. If a step genuinely needs a *why*, keep it to one clause — the durable rationale lives in the design, not the step.

**No scope hash, no re-stamp.** Unlike the design/test-script, this plan is *not* stamped against the intent's scope hash — it's a deployment-mechanics artifact, not a scope-proof artifact, and re-running the skill is how it stays current. (If you want a stamp for drift-detection parity later, that's a `/ql-contribute-to-launchpad` enhancement, not a default.) Since it's design-mechanics only, updating it **never trips ledger drift** and needs no re-hash of the intent.

## Step 5 — Report and plug into the trust chain

Lead with the verdict, then the deltas, then the roll-up:

- **Verdict** — created, or reconciled (what changed: rows added / moved / Open items resolved / possibly-stale flags raised).
- **The deploy-vs-manual headline** — one or two sentences: what rides the deploy, and the manual steps that matter most (the pre-deploy enablement, the post-deploy gates).
- **Sandbox-confirm items** — list what you couldn't confirm and which way each would move the plan. If you *did* confirm something this run (via repo/sandbox/docs), say so and note the row is now settled.
- **Roll-up nudges** (offer, don't auto-do): when the intent nears delivery, the deployment-relevant manual steps roll into `delivery/deploy-runbook.md`, and each lands in the delivering PR's §4 "Done manually / outside this diff". Offer to draft those. **Roll up by *transforming* into the runbook's execution-ordered sections — never paste the plan's per-intent blocks in.** The runbook is a hand-to-an-admin execution list, so:
  - **Merge into the runbook's existing ordered sections** (features/toggles → deploy → Setup-data → jobs) by *execution order*, not appended as an intent-labeled section.
  - **One step = one line item or table row, never a heading.** Carry the intent id as a tag on the line (`(INT-042)`), not as a section header.
  - **Strip the classification rationale** — the runbook says *do this*; the *why* stays in the per-intent plan (link it). Keep at most a one-line `Verify:` check; drop the explanatory prose.
  - **Dedup before adding** — if an equivalent step is already in the runbook, don't re-add it. Rolling up is idempotent, like the plan itself.
  A **`👤` go-live gate** — a prerequisite that must be true before go-live and that no deploy step owns (a prod URL/token swap, an external approval) — rolls into the runbook's **`## Go-live gate`** section as a checkbox, surfaced any time by `node scripts/intent-ledger.mjs golive` (advisory, never blocks — decisions/0040).

## What this does NOT do

- It does **not** deploy anything or run `sf` commands that change an org — it plans the deploy, it doesn't execute it. (Read-only org/sandbox *queries* to confirm deployability are fine and encouraged.)
- It does **not** edit the intent or design scope — if classifying reveals the *design* is wrong (a component that can't be built as designed), surface it and route to `/ql-design-intent` / `/ql-refine-intent`; don't fix it here.
- It does **not** write `delivery/intent-ledger.md` or `delivery/deploy-runbook.md` automatically — it drafts the per-intent plan and *offers* to roll deployment-relevant steps into the runbook; the ledger stays `intent-ledger.mjs`'s.
- It does **not** guess deployability to look finished — an unconfirmed fact is a sandbox-confirm Open item, not a confident row.
```
