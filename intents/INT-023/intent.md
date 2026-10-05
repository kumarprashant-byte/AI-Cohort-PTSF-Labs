---
id: INT-023
phase: 4
epic: E05
confidence: draft
origin: local
title: Practitioner-requested specialist sub-assessment
---

# INT-023 — Practitioner-requested specialist sub-assessment

## Outcome

A practitioner on an open assessment can request a specialist sub-assessment; the sub-assessment is routed to a specialist, completed independently, and the outcome merges back into the parent assessment so the Assessor sees one combined picture.

## Build target

- `Assessment__c` self-relationship (or `Sub_Assessment__c`) tying child specialist assessments to the parent, with a Specialty picklist and request reason on the child
- A Request-specialist-sub-assessment action on the practitioner Assessment LWC — opens a modal, captures specialty + reason, creates the child record
- Routing reuses INT-009's assignment logic filtered to the chosen specialty and region
- The specialist completes their own `Assessment__c` in their own community home; on submission, their findings surface as a read-only panel on the parent assessment record page
- The parent assessment cannot move to `Pending Review` until every requested sub-assessment is in `Submitted` or `Declined`
- Audit trail on the parent: who requested, who was assigned, when the sub-assessment merged back

## Guardrails

- Must not let the requesting practitioner edit the specialist's findings — the merged panel on the parent is read-only
- Must not route to a specialist outside the patient's region unless the requester explicitly flags cross-region on the request
- Must not block the parent assessment indefinitely — surface aged sub-assessments to the Team Manager at the same 15-day threshold INT-012 already uses for primary assessments

## Out of scope

- Must not change the base Assessment LWC data model (INT-011 owns it) — this intent extends via self-relationship; no form rewrite
- Must not implement a separate compensation flow for specialists — that belongs with the subsidy work, not here

## Acceptance

A practitioner with an accepted oncology assignment opens the Assessment LWC, submits the primary panel, then requests a Radiology sub-assessment with a reason. A radiology specialist in-region sees the new Assignment on their home, opens it, completes the radiology form, and submits. The requesting practitioner refreshes the parent assessment and sees a Radiology Findings panel (read-only) carrying the specialist's name, timestamp, and conclusions. The parent assessment only becomes eligible for `Pending Review` after this submission lands.

## Success criteria

- SC-1: A parent assessment with any open sub-assessment cannot be submitted to `Pending Review` — attempting it returns a user-visible validation message.
- SC-2: A specialist's submitted findings appear on the parent assessment within the next page refresh, read-only to the requesting practitioner.
- SC-3: A sub-assessment pending longer than 15 days generates the same Team Manager escalation INT-012 produces for primary assessments.
- SC-4: Cross-region routing fires only when the request explicitly flags it; same-region is the default behavior.

## Dependencies

### Internal
- INT-009 — reuses the assignment logic (specialty + region filter)
- INT-011 — extends the Assessment LWC and `Assessment__c` object; INT-011's deferred specialist-referral slice is closed by this intent
- INT-012 — reuses the 15-day escalation mechanism for aged sub-assessments

### External
_none_

## Open questions

- Q-023-1: Can a specialist chain a further sub-assessment to another specialist (depth > 1), or is one hop the limit? (resolver: PTSF Clinical Lead)
- Q-023-2: If the primary assessment is withdrawn, do pending sub-assessments auto-close or stay open for the specialist to complete and bill? (resolver: PTSF Program Sponsor)

## Grounding

- INT-011 was delivered partial (`local/INT-011+partial-per-decision-2026-09-29-INT-011-specialist-referral-deferred`); this intent completes the merge-back loop that was deferred there.
