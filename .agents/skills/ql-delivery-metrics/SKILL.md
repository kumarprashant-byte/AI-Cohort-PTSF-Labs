---
name: ql-delivery-metrics
description: Show within-engagement delivery metrics for the intents — scope churn, revision count, time-to-stable, and open-question trajectory — a read-only view derived from git history. Use when you want to see delivery pace, how much an intent iterated, or where scope is still settling. Triggers — "delivery metrics", "scope churn", "how much did this intent iterate", "how long did intents take", "/ql-delivery-metrics".
produces: >-
  A console table (or `--json`) of per-intent delivery signals — scope churn, revisions, time-to-stable, open-question trajectory — with an honesty marker per row. Read-only; a derived view recomputed each run, never edits an intent.
---

# Delivery metrics — see how the intents are actually progressing

This surfaces **Tier-1 within-engagement delivery signals** (decisions/0043) computed from git history: for each intent, how much its scope actually churned, how many times it was revised, how long the *what* kept moving, and how its open questions burned down. It's for a **Trusted Guide** taking stock of pace — "which intents are still settling?", "how much did this one iterate before it stabilized?".

It is a **presenter, not an interpreter.** Your job here is to run the command and relay what it prints — including its honesty markers — verbatim. Do **not** editorialize the numbers, judge whether a value is "good" or "bad", or infer a cause. Interpretation and narration are deliberately deferred (0043) until the numbers have proven themselves in the field; a skill talking over unproven numbers is worse than none.

## What each metric means

- **Scope Δ (scope changes)** — how many times the intent's *hashed scope* actually moved across its history. This uses the **same scope hash the drift gate uses** (the five fields: title, build target, guardrails, out-of-scope, acceptance), so a cosmetic edit — a typo, a dependency, an open-question tweak — is **not** counted. This is the honest "how much did we iterate on the WHAT".
- **Revisions** — total commits touching `intent.md`. The ratio of Scope Δ to revisions says whether edits were substance or polish.
- **Time-to-stable** — days from the intent's first commit to its last scope-changing edit. How long the scope kept moving.
- **Open Qs (now/peak)** — current vs. peak open-question count; `✓burned` means they went to zero.

## Run it

From the engagement repo root (the engine script ships into the repo at `scripts/`, so the path is repo-relative in every harness):

```bash
node scripts/intent-ledger.mjs metrics            # table, all intents
node scripts/intent-ledger.mjs metrics INT-014    # one intent
node scripts/intent-ledger.mjs metrics --json     # machine-readable
```

If it prints **"intents/ not present yet"**, scope hasn't been ingested — run `/ql-ingest-scopezilla` first. The command is read-only and never gates on what it finds (only a filter naming no real intent exits non-zero).

## Read the honesty markers before you relay

Every row carries a **Coverage** marker. Surface it — never drop it, and never present a partial/unknown number as if it were solid:

- **full** — clean multi-revision history, every revision parsed. Trust the numbers.
- **partial** — some history was skipped or is suspect; the `↳` note says why. Cases: a revision that couldn't be parsed at its commit (skipped, so churn is computed over the rest); a **shallow clone** (history truncated — common in CI); a **rename-truncated** history (pre-rename revisions unreadable); a **single-commit / possibly-squashed** history; or a **dirty working tree** (uncommitted edits ahead of the history counted). In every partial case the count can only **undercount** — relay the note.
- **unknown** — no git history for this intent (uncommitted), or not a git work tree. The **history-derived** numbers (scope Δ, time-to-stable) show as `—` (and are `null` in `--json`), never `0` — say the data isn't there rather than implying zero churn. The open-question count still reflects the *current file* (it's a present-state reading, not history), so it may show a real number even on an unknown row.

The command never fabricates a number — a gap is always surfaced as partial/unknown. Preserve that when you relay it.

**Run it from any branch — the numbers don't change with your checkout.** It reads the intent's real file-change history, so an intent iterated on a feature branch and merged into `develop`/`main` reports the same churn and revisions whether you run from the feature branch or the integration branch. (A branch-internal edit-and-revert that netted to no change reads as unchanged once merged — the churn that was *kept* is what's counted; nothing is inflated.)

One limitation it *cannot* self-detect: a **squash-merge workflow** collapses a PR's revisions into one commit. A single squashed commit is flagged `partial` (single-commit history), but an intent delivered across *several* squashed PRs shows multiple commits and can read `full` while still undercounting the within-PR churn each squash hid. If you know the engagement squashes PRs, read churn as a floor, not an exact count.

## What this does NOT do

- It does **not** edit, create, or resequence intents. Scope changes go through `/ql-refine-intent` / `/ql-capture-intent`.
- It does **not** interpret or grade the numbers, or explain *why* an intent churned — that judgment is the Trusted Guide's, and the narration layer is deferred (0043).
- It does **not** report build cycle time, throughput, or time-to-prod yet — those are Tier-2 (they need transition timestamps the tool doesn't record today).
- It does **not** reach GitHub or any network — it reads local git history only.
