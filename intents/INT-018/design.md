---
intent: INT-018
scope_hash: 570be557cf40
authored: 2026-09-30
---

# INT-018 — Design

**Intent:** Per-region cutover with 4-week dual-run
**Source intent:** `intents/INT-018/intent.md`

## Delivery posture — pure runbook intent
No metadata. Everything is process: freeze windows, dual-run governance, read-only flip, sign-off gates. Owned by delivery + PTSF Ops; agent lane is drafting the runbook.

## Sequence
Smallest AMER → mid-size EMEA → largest APAC. Never two regions on the same weekend (guardrail 1). 4-week dual-run per region (guardrail 2).

## Neighboring & future scope
- **Built on:** INT-017 (ETL delivers the historical data before cutover); every phase-1-4 intent (the target org must be able to run the business by the time cutover starts).
