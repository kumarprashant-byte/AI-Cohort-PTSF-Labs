# BLD-NNNN — <standing architecture premise, one line>

**Date:** YYYY-MM-DD · **Status:** accepted · **Source:** build-authored · **Supersedes:** <inherited ADR id, or omit> · **Deviation:** <pending-ARB | accepted-by-ARB (YYYY-MM-DD, who) | omit>

> Copy this file to `decisions/architecture/BLD-NNNN-<short-slug>.md`. This is a
> **numbered architecture ADR** — a load-bearing premise other decisions cite
> (single-org, LWR-over-Aura, PII-residency), NOT the answer to a one-off question
> (that's a dated build note — see `../TEMPLATE.md`). Most engagements have none of
> these; this is default-zero, earned, not a journal.
>
> **Numbering:** build-authored ADRs use `BLD-NNNN` so their numbers can never
> collide with Scopezilla-inherited ADRs (which keep their `00XX` ids and live
> read-only under `scopezilla/decisions/`). Next `BLD-` number = highest existing + 1.
>
> **The header line is machine-read** by `intent-ledger.mjs conformance` — keep the
> `**Key:** value` shape, ` · `-separated, on the line(s) right under the title.
> Include **Supersedes:** and **Deviation:** ONLY when this ADR overrides an
> inherited premise; a fresh premise omits both. Never edit an inherited ADR — the
> supersede edge is one-directional from this `BLD-` record. ARB sign-off is a
> human hand-edit: flip `Deviation: pending-ARB` → `accepted-by-ARB (YYYY-MM-DD, <who>)`.
> Delete this quote block when you copy.

## Context

The forces that make this a *standing* premise — why it governs future choices and
which intents/epics it constrains. If it supersedes an inherited premise, name that
premise and why the build must stray from it.

## Decision

The premise, stated as a rule future work can be checked against.

## Consequences

What building under this premise commits you to, and what it forecloses. If it's a
deviation pending ARB, note what the ARB is being asked to accept.
