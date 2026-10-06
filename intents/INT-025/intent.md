---
id: INT-025
phase: 5
epic: E12
confidence: draft
origin: local
title: LDV scale-soak proving 5M patients and 50% year-on-year growth
---

# INT-025 — LDV scale-soak proving 5M patients and 50% year-on-year growth

## Outcome

The system is proven at the target scale — 5M patients today and the 50% year-on-year growth projection — before any region cuts over, so INT-001's LDV baseline is backed by evidence instead of design intent.

## Build target

- Representative data generation: 5M Contact rows (patients), ~15M `Subsidy_Application__c` (3-year history), ~45M `Assessment__c`, ~90M `Audit_Log__c`, with realistic region/office distribution
- A scale-soak environment: Full Sandbox refreshed from the generated dataset, PHI model enforced per INT-004
- Load scripts (SOQL + Apex callouts) exercising the top 20 user flows: patient onboarding, HIC prefill, specialist assignment, assessment submission, subsidy determination, assessor console search
- Per-flow p95 and p99 latency targets, baselined against TAMS where numbers exist, else negotiated with the Program Sponsor
- Selectivity verification: every indexed query stays below the 10% / 300k row selectivity thresholds at year-2 volumes (~7.5M patients)
- Governor-limit headroom report per flow: SOQL rows, DML rows, CPU, heap
- A pass/fail dashboard per flow with measured p95, p99, and governor headroom
- Rerun cadence: the soak is repeatable from one command so a quarterly refresh keeps the proof current

## Guardrails

- Must not use synthetic data that bypasses INT-004's PHI security model — generation respects Private OWD, Apex-managed sharing, and Restriction Rules
- Must not change production thresholds (indexes, skinny tables) without a corresponding INT-001 update — the soak *discovers* the need; INT-001 *persists* the fix
- Must not sign off the soak on year-1 volume alone — the 50% YoY projection (year 2 ≈ 7.5M patients) is part of the acceptance

## Out of scope

- Must not include UI/accessibility performance testing — if the program wants that proved, raise it as a new intent
- Must not scale-test the TAMS source side of migration — INT-017/INT-018 own migration volume

## Acceptance

Starting from a Full Sandbox hydrated to 5M patients at year-1 volumes, the soak suite runs end-to-end: every top-20 flow lands under its p95 target, every indexed query is selective, and governor-limit headroom is ≥ 30% on every DML path. The suite then runs again at year-2 projected volume (~7.5M patients) and the same thresholds hold. The Program Sponsor signs the scale-soak report, and the signed report is attached to INT-001 as the LDV-baseline evidence.

## Success criteria

- SC-1: Every top-20 flow lands below its agreed p95 latency target at 5M patients (year 1) AND at 7.5M patients (year 2 projection).
- SC-2: Every indexed SOQL query in the audited paths is selective (below 10% / 300k row thresholds) at year-2 volume.
- SC-3: Every DML path leaves at least 30% governor-limit headroom (SOQL rows, DML rows, CPU, heap) at year-2 volume.
- SC-4: The soak is rerunnable from one command, with pass/fail output a non-engineer can read.

## Dependencies

### Internal
- INT-001 — this intent proves INT-001's LDV baseline design
- INT-004 — the generated data must flow through INT-004's PHI model, not around it
- INT-017 — the migrated-row shape (regional distribution, origin office) informs realistic data generation

### External
- Salesforce Licensing | Full Sandbox refresh window and storage headroom at 5M+ patient volume | owner: PTSF IT

## Open questions

- Q-025-1: What are the per-flow p95/p99 latency targets? TAMS baselines are our best anchor — do we have them, or do we set targets from Program Sponsor expectations? (resolver: PTSF Program Sponsor + Technical Architect)
- Q-025-2: Does the 50% YoY projection apply only to patient count, or does transaction volume (applications, assessments) also grow 50% YoY? The multiplier shapes year-2 data generation. (resolver: PTSF Operations Lead)
- Q-025-3: Which quarter after go-live is the first rerun? A soak that only runs once is design intent, not a baseline that holds. (resolver: PTSF Program Sponsor)

## Grounding

- INT-001 captured the LDV baseline (skinny table + selective indexes on `Subsidy_Application__c`, Big Object archival design). That was design; this intent is the proof.
