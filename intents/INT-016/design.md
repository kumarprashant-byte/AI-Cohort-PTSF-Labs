---
intent: INT-016
scope_hash: c82cefe5a1ab
authored: 2026-09-30
---

# INT-016 — Design

**Intent:** Operational and executive reporting
**Source intent:** `intents/INT-016/intent.md`

## Data model
No new objects/fields. Reads existing fields on Subsidy_Application__c, Assignment__c, Assessment__c. Nothing on Medical_History__c is queried — guardrail 1 is enforced by omission, not by a probe.

## Sharing & security
Row-level scoping inherits INT-020's OWD-Private + regional sharing rules — reports honor OWD so a Regional Ops Manager sees only their region without any per-report filter.

## Automation approach
Pure declarative. Standard Report + Dashboard metadata. No Apex, no CRM Analytics for MVP.

## Alternatives considered
- CRM Analytics dashboards — deferred; the intent gates it on "if standard reports hit LDV", not yet demonstrated.
- Per-region filtered reports — rejected; layering `Region__c = APAC` on top of OWD would fight the sharing model.

## Neighboring & future scope
- Built on: INT-020 (Private OWD + regional sharing) — load-bearing.
- Existing org (brownfield): no `reports/`, `reportTypes/`, `dashboards/`, `folders/` in `force-app`. Greenfield.

## Open design questions
_none_
