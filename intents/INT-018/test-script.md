---
intent: INT-018
phase: 5
proof_hash: 863ebd7615a6
authored: 2026-09-30
---

# INT-018 — Test script

**Intent:** Per-region cutover with 4-week dual-run
**Phase:** 5 · **Source intent:** `intents/INT-018/intent.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-018-C1 | Per-region cutover runbook exists in ordered sequence (build target) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-018.md | 📋 | accepted-gap |
| INT-018-C2 | Freeze window enforced for TAMS new-application intake (build target) | 👁 Manual scene A | 👁 | _pending_ |
| INT-018-C3 | 4-week dual-run window observed; no early closure (guardrail 2) | 👁 Manual scene B | 👁 | _pending_ |
| INT-018-C4 | Only one region cut over per weekend (guardrail 1) | 👁 Manual scene C | 👁 | _pending_ |
| INT-018-C5 | Rollback plan documented and rehearsed (build target) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-018.md | 📋 | accepted-gap |
| INT-018-C6 | AMER pilot cutover acceptance walkthrough (acceptance) | 👁 Manual scene D | 👁 | _pending_ |

## Manual validation scenes

### Scene A — Freeze window (C2)
1. On cutover eve, PTSF IT sets TAMS-<region> to no-new-applications mode.
2. Attempt to create a new application in TAMS-<region>; confirm the UI blocks it with the freeze notice.

### Scene B — Dual-run closure gate (C3)
1. On day 27, query TAMS for open applications in the region.
2. If any remain, confirm the runbook extends the window rather than closing on day 28.

### Scene C — One-region-per-weekend (C4)
1. On any given cutover weekend, confirm the delivery calendar has exactly one region scheduled.

### Scene D — AMER acceptance walkthrough (C6)
1. Friday night: cutover AMER-pilot per runbook.
2. Monday: new applications flow into Salesforce.
3. Day 24: last in-flight TAMS application closes.
4. Day 29: TAMS-AMER set read-only; Regional Ops Manager signs reconciliation report.

## Deliberately not tested (out of scope)
- TAMS hardware decommission — explicit out-of-scope; PTSF IT owns post-cutover.
