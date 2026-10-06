---
id: INT-024
phase: 4
epic: E06
confidence: draft
origin: local
title: Subsidy calculator — distance x transport decision table and manual override
---

# INT-024 — Subsidy calculator — distance x transport decision table and manual override

## Outcome

The Assessor sees a proposed subsidy computed from patient-to-facility distance and the chosen transport type, can override with a reason, and the system remembers both the proposal and the override for audit.

## Build target

- `Transport_Type__c` picklist on `Subsidy_Application__c` (air, long-distance ground, local ground, patient-provided) with per-region multipliers stored on `Subsidy_Determination_Rule__c` (reused from INT-014)
- `Distance_From_Patient__c` computed from patient address to facility address (standard Salesforce geocoding; no vendor)
- A decision table (lookup-first, Flow-wrapped) that returns `Proposed_Amount__c` = base x transport multiplier x distance band
- Fields on `Subsidy_Application__c`: `Proposed_Amount__c`, `Approved_Amount__c`, `Override_Reason__c`, `Decision_Source__c` (= `calculator` | `manual`)
- A Recalculate-subsidy action on the review page so an Assessor can refresh the proposal if transport type changes mid-review
- The amount this intent proposes feeds INT-014's threshold Approval Process — this intent *proposes*, INT-014 *approves*

## Guardrails

- Must not auto-commit the proposed amount — the Assessor confirms or overrides before INT-014's approval path runs
- Must not use a global distance band — per-region bands drive it, from the same `Subsidy_Determination_Rule__c` source table as transport multipliers
- Must not skip the override reason when `Approved_Amount__c` differs from `Proposed_Amount__c` — a validation rule enforces it

## Out of scope

- Must not integrate to a mapping/geocoding vendor — relies on existing Salesforce address geocoding; if that's insufficient, surface the gap, don't scope the vendor here
- Must not re-implement the regional threshold Approval Process (INT-014 owns it)

## Acceptance

An Assessor opens an EMEA application where the patient lives 180km from the facility and transport type is `long-distance ground`. The calculator proposes 1,200 EUR. The Assessor changes transport type to `air` with clinical justification, clicks Recalculate, sees 2,400 EUR proposed, approves with the override reason captured. INT-014's threshold Approval Process routes the application to the EMEA Team Manager because 2,400 EUR exceeds the EMEA 1,500 EUR threshold. Both `Proposed_Amount__c` (1,200) and `Approved_Amount__c` (2,400) are persisted; `Decision_Source__c` reads `manual`.

## Success criteria

- SC-1: Changing `Transport_Type__c` and clicking Recalculate updates `Proposed_Amount__c` within the current page view, without saving the record.
- SC-2: Saving `Approved_Amount__c` != `Proposed_Amount__c` with a blank `Override_Reason__c` returns a user-visible validation error.
- SC-3: `Decision_Source__c` is `calculator` whenever `Approved_Amount__c` == `Proposed_Amount__c`, else `manual`.
- SC-4: Per-region bands and multipliers are maintainable by an admin role without a deploy — editing `Subsidy_Determination_Rule__c` records changes behavior.

## Dependencies

### Internal
- INT-013 — the Assessor Service Console is the surface this calculator renders on
- INT-014 — propose/approve seam; INT-014 consumes `Approved_Amount__c` for threshold routing

### External
_none_

## Open questions

- Q-024-1: Decision mechanism: a Flow-wrapped lookup table (default), Salesforce Business Rules Engine, or a Decision Matrix in Flow? BRE adds licensing — confirm with Finance. (resolver: PTSF Program Sponsor + Technical Architect)
- Q-024-2: Who maintains the distance bands and transport multipliers after go-live — Regional Ops Manager (data) or a central admin team? (resolver: PTSF Operations Lead)

## Grounding

- Resolves gap G0601 (subsidy decision-support mechanism — BRE vs Flow vs reference table).
- INT-014 already included a distance x transport sketch in its build target; this intent decomposes that sketch into a provable calculator with override discipline.
