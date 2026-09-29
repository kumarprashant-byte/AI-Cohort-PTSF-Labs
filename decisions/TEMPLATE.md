# <one-line decision title>

**Date:** YYYY-MM-DD · **Deciders:** <who ratified this>

> Copy this file to `decisions/YYYY-MM-DD-<short-slug>.md` and fill it in. This is
> the format for a **dated build note** — the resolved answer to a point-in-time
> question (a scope cut, an integration pattern, a "we tried X, chose Y"). For a
> *standing architecture premise* that other decisions cite — one whose reversal
> re-shapes multiple intents — use `decisions/architecture/TEMPLATE.md` instead
> (a numbered `BLD-NNNN` ADR). Delete this quote block when you copy.

## Context

What prompted this — the review, demo, stakeholder call, or build question. What
constraint or ambiguity forced a choice. Link the intent(s) it touches:
`intents/INT-NNN/intent.md`.

## Options

The alternatives you actually weighed, each with its real trade-off. Two or three
is normal; if there was only ever one path, say so and why.

## Choice

What you decided, stated plainly. If it changes scope, say which intent and route
the edit through `/ql-refine-intent` (this record is the *why*; the intent file is
the *what*).

## Consequences

What this ripples into — a shifted dependency, a phase-plan change, a delivered
intent that now needs re-verify, follow-up work to track. Name the downstream cost,
not just the upside.
