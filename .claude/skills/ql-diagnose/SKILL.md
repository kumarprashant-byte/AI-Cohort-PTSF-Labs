---
name: ql-diagnose
description: >-
  Diagnose why a build doesn't satisfy an intent — get a signal that goes red on THIS bug before theorising a fix, on Salesforce's own ladder, fix until it goes green, then lock it down with a regression criterion so it can't silently come back. Use when a build, a test, or org behavior is wrong, flaky, or doesn't match an intent's acceptance — this owns "the implementation doesn't match the intent" (a defect to fix), not editing the intent (that's /ql-refine-intent). Triggers — "diagnose this", "why is this failing", "the implementation doesn't match the intent", "it's intermittent", "/ql-diagnose".
produces: >-
  No artifact of its own — a reproducing signal, a fix, and a NEW regression criterion added to the intent's `test-script.md` (an `INT-00x-Cy` row or an `## Org assertions` predicate) so the bug is proven closed henceforth. When the bug surfaced in manual QA, drafts/updates the defect record for `/ql-record-test-execution`. No commit.
---

# Diagnose — reproduce it before you fix it

A build that doesn't satisfy an intent is a **trust-chain break**: a proof criterion that reads ✅ but doesn't hold, a Flow that fires wrong, sharing that doesn't cascade, a governor limit that trips at bulk. Fixing it by guessing is how the same bug comes back at UAT. This skill imposes one discipline: **no theory until you have a signal that goes red on *this* bug** — then fix until it goes green, and leave a regression criterion behind so it stays fixed.

It's the diagnosis discipline the build loop otherwise lacks — the step between "the org/test is wrong" and `/ql-record-test-execution` (which *records* a proven defect). This skill *finds* the cause; that one documents it.

## The rule: get the loop red first

Before proposing any cause, build the **tightest feedback loop** you can — one command or query that **already fails on this exact bug**, and would pass if it were fixed. Reading code to theorise is slower and wronger than watching a signal. If you can't yet make something go red on the bug, that *is* the first task; don't skip to a fix.

## Step 1 — Reproduce it: climb the Salesforce ladder

Reach for the cheapest rung that reproduces the bug, in order:

- **A failing Apex test** — for logic, trigger, sharing (`runAs`), or bulk behavior. The gold standard: it's the loop *and* the eventual regression criterion. Write the smallest test that asserts the intent's expected behavior and watch it fail.
- **Anonymous Apex** (`sf apex run`) — a fast probe when a full test is heavy: reproduce a calculation, a callout, a DML result, a sharing recalculation in a few lines against the build org.
- **A SOQL probe** (`sf data query`, Tooling API for metadata) — when the bug is *org state*: query the records/permissions/metadata the intent expects and compare to what's there. Differential: what did the build produce vs. what the intent requires?
- **Debug logs / instrumentation** — when the *path* is the mystery (which automation fired, in what order, why a value is wrong): set a trace flag, run the scenario, read the log. Salesforce's order-of-execution is a frequent culprit — a Flow and a trigger fighting, a recursive update.
- **The org as the running system** — reproduce the user-facing symptom in the UI as the affected persona (`runAs`/login) when nothing smaller captures it.

Name what you're confirming, resolve *how* at runtime (DX MCP tools first, `sf` CLI floor). A bug you can't yet reproduce is not yet diagnosed — say so rather than guessing.

## Step 2 — Narrow to the cause with the loop, not by reading

With a red signal in hand, change one thing at a time and re-run it. Let the loop — not a theory — tell you when you've found the cause. Ground any platform mechanic you're unsure of in the docs (AGENTS.md → *don't build Salesforce from memory*); an intermittent/bulk bug usually means a governor limit, a recursion, or an order-of-execution assumption, so probe at realistic volume (200 records), not one.

## Step 3 — Fix, and watch the loop go green

Apply the fix and confirm the same signal that went red now passes. A fix that doesn't turn your reproducing signal green isn't confirmed — it's another theory.

## Step 4 — Lock it down: mint a regression criterion

A fix without a regression check is unproven the moment the next build lands. Leave the bug **provable henceforth**:

- Add a criterion to the intent's `intents/INT-00x/test-script.md` that fails on this bug — an `INT-00x-Cy` row backed by the Apex test from Step 1 (✅), or an `## Org assertions` predicate for a structural bug (`org-probe`, verified by `/ql-verify-build`). Re-run `/ql-test-script` or add the row directly; the id is the join key across the ledger and the PR §2 matrix.
- When the bug **surfaced in manual QA**, this is the diagnosis upstream of `/ql-record-test-execution`: draft or update `test-evidence/defect-INT-00x-NN.md` (expected vs. actual + the repro you found) and, once the retest passes, that skill closes it.

The regression criterion is what turns "I fixed it" into "it's proven fixed" — the same *shipped = proven* bar the whole trust chain holds.

## What this does NOT do

- It does **not** fix by theory. No proposed cause without a signal that reproduces the bug first.
- It does **not** edit the intent's scope. If diagnosis reveals the *intent* is wrong (the acceptance asked for the wrong thing), route to `/ql-refine-intent` — a bug in the build and a bug in the scope are different repairs.
- It does **not** sign off the fix. The regression criterion proves it; a human still ratifies delivery (`/ql-record-test-execution` for the 👁 half, CI/`/ql-verify-build` for the ✅ half).
- It is **not** a general profiler or a tech-debt sweep — it diagnoses a specific bug against a specific intent.
