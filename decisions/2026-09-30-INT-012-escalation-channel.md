# 2026-09-30 — INT-012 escalation channel: Task (pragmatic default)

**Intent:** `intents/INT-012/intent.md`
**Related:** Q-012-1 (open question — escalation channel: Task, Case, or Chatter post?) UNANSWERED

## Context

INT-012's build target names **Task** as the escalation channel. Its `out_of_scope` explicitly says "Must not build a chatter-post variant — Task is the ratified channel *(subject to G0501 confirmation)*". But its `## Open questions` still carries Q-012-1 as UNANSWERED, with PTSF Ops leadership named as the resolver.

The build is time-sensitive; waiting on Ops leadership to formally settle Q-012-1 would block phase-3 automation on a channel choice the intent has already de facto made in its build target.

## Decision

Ship the Flow creating a **Task** (as the build target directs). Record Q-012-1 as ANSWERED-by-build-default: Task.

If Ops leadership later flips the channel to Case or Chatter, `/ql-refine-intent` amends the intent, `/ql-refine-intent` re-verify flows through the ledger, and the Flow's create step swaps object (a metadata edit).

## Consequences

- **Ledger:** INT-012 is delivered against a Task-channel design. A later channel change trips `drift` on the ✅ Delivered row until the Flow is rebuilt and re-verified.
- **Cascading:** INT-013's utility bar "Escalate to Manager" (C5 gap on INT-013) becomes a manual invocation of the same escalation shape — should also produce a Task once wired.
- **Team Manager routing gap:** independent of this decision — 📋 in INT-012's test script (C4), routed to INT-005 + INT-020.
