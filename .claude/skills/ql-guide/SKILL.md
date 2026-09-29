---
name: ql-guide
description: >-
  Map the Launchpad's skills to what you're trying to do — the whole flow (init → ingest → the per-intent build loop → deploy/report), the on-ramps that merge onto it, and which of the intent-shaping skills to reach for. Use when you're not sure which /ql- skill fits, what to do next, or how the pieces connect. Triggers — "which skill do I use", "what do I do next", "how do I start", "how does the launchpad flow work", "/ql-guide".
produces: No file — a recommendation of which skill(s) to run next for your situation, and how they hand off. Points you at the door; it doesn't do the work.
---

# Guide — which skill, and what's next

Tell me what you're trying to do and I'll point you at the right skill. Most work runs along **one spine**; a few **on-ramps** merge onto it, and the rest are views or maintenance. The build itself isn't a skill — you build (or `/ql-drive-meshmesh` drives a build agent); **deploy and release stay your call** as the Trusted Guide.

## The spine: scope → build → prove → hand off

1. **Set up the repo (once).** `/ql-init-engagement` scaffolds a new engagement repo; `/ql-setup` bootstraps its tooling and MCP wiring on first clone.
2. **Bring in scope.** `/ql-ingest-scopezilla` mirrors a Scopezilla project and transforms it into living intents. If the intents come out oversized, thin, or rough, add `--grill` for an interactive shaping session.
3. **Build one intent at a time.** `/ql-start-intent` is the front of the loop — it clears context, cuts the branch, flips the ledger, and **sequences the next four for you**: `/ql-check-scope` (should I build this now?) → `/ql-vet-intent` (is it ready to build against?) → `/ql-design-intent` (how to build it — non-trivial only) → `/ql-test-script` (how I'll prove it). Run `/ql-start-intent` and you get the whole chain; reach for one of the four alone only when that's all you need.
4. **Build, and diagnose.** Build to the design and the proof plan. When something doesn't work, `/ql-diagnose` — reproduce the bug with a red signal before theorising, then lock it down with a regression criterion.
5. **Prove it.** `/ql-verify-build` runs the structural `org-probe` assertions against the build org (the ✅ half — run it early and often); `/ql-record-test-execution` walks a human through the manual scenes (the 👁 half). Twins: one automated, one signed.
6. **Plan the deploy, hand off.** `/ql-generate-deployment-plan` works out what rides the deploy vs. what's a manual step. Then you open the PR into `develop`; cutting the release and promoting to prod are yours.

## On-ramps — a situation that generates work, then merges onto the spine

- **Notes, a transcript, or a stakeholder ask arrives** → `/ql-capture-intent` — dispositions each item (new intent / change / bundle a small fix / park / already-covered) and drafts the net-new ones for you to ratify.
- **You know one intent is wrong** → `/ql-refine-intent` — a governed, recorded edit to that one intent.
- **The intents may not agree with each other** → `/ql-analyze-intents` — a whole-set consistency sweep.
- **Tempted to act on PR feedback** → `/ql-check-scope` — the spine step doubling as a reflex.

## Which intent-shaping skill? (the five-door question)

They cluster, so pick by *what you have*:

- Grade **one** intent's build-readiness → `/ql-vet-intent`
- Grade the **whole set** for cross-intent conflicts → `/ql-analyze-intents`
- **Reshape** flagged/drifted intents interactively over the source → `/ql-grill-intents`
- Fix **one known** intent with a specific edit → `/ql-refine-intent`
- Turn **prose (notes/asks)** into intents, or park an idea → `/ql-capture-intent`

`/ql-vet-intent`, `/ql-analyze-intents`, and `/ql-check-scope` are **advisory readers** — they grade and route, they never edit scope. `/ql-refine-intent` and `/ql-capture-intent` are the two skills that actually write Intent (each human-ratified, each records a decision).

## Views & maintenance

- **Show the whole scope to a stakeholder** → `/ql-capability-map` (offline HTML map).
- **Report status outward** → `/ql-sync-jira` (one-way projection; the repo stays canonical).
- **Pull the latest plugin content into this repo** → `/ql-resync`. **Feed an improvement upstream** → `/ql-contribute-to-launchpad`.

## When to just ask

If your situation doesn't map cleanly to a door above, describe it — the goal is to route you, not to make you learn twenty skill names. When two doors seem to fit, name what you're holding (one intent vs. the whole set, prose vs. a known edit) and the choice usually falls out.

If the question is about the Launchpad itself — a skill erroring, an install snag, something that seems wrong — point them at [#help-quantum-leap-launchpad](https://salesforce-internal.slack.com/archives/C0B8D3MV6KB), and offer to write it up as an issue via `/ql-contribute-to-launchpad`.
