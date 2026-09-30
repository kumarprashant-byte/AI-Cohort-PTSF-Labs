---
intent: INT-014
scope_hash: b4a09a4178cf
authored: 2026-09-30
---

# INT-014 — Design

**Intent:** Subsidy determination Flow with regional threshold approval
**Source intent:** `intents/INT-014/intent.md`

## Data model

New custom object **`Subsidy_Determination_Rule__c`** — reference table for the calculator (Setup-data, admin-maintained):
- `Name` (Text 80, e.g. `EMEA · Air · 2026`)
- `Region__c` (Picklist EMEA / AMER / APAC — same values used on Subsidy_Application__c below)
- `Transport_Type__c` (Picklist: Air / Rail / Road / Sea)
- `Multiplier__c` (Number 6,4) — euros per kilometre for this region+transport combination
- `Threshold__c` (Currency 16,2) — regional cap; a proposed amount above this needs manual approval

New fields on **`Subsidy_Application__c`**:
- `Region__c` (Picklist EMEA / AMER / APAC) — assessor-selected on the app; the real per-record Region wiring rides INT-020
- `Transport_Type__c` (Picklist Air / Rail / Road / Sea) — chosen in the Screen Flow, written back for audit
- `Distance_Km__c` (Number 6,2) — assessor-entered; the intent's phrasing "Practitioner.Distance_From_Patient" is 📋 to INT-005+INT-020 follow-on (Distance is not a Contact field today, and computing it needs Loqate/geocode from INT-006). MVP: the assessor types the distance.
- `Proposed_Amount__c` (Currency 16,2) — always stamped by the Flow
- `Approved_Amount__c` (Currency 16,2) — stamped by the Flow **only when Proposed <= Threshold** (auto-approve within limits); left null when over threshold so the Approval Process (📋) has to run before it commits

## Sharing & security

- `Subsidy_Determination_Rule__c` OWD Public Read-Only; Assessor perm set gets Read, System Admin creates/edits. Sharing follows the reference-table pattern — nothing PII, everyone reads.
- New Subsidy_Application__c fields granted on the `Assessor_Base` perm set (Read + Edit on all five).

## Automation approach

**Screen Flow `Determine_Subsidy`** (invocable from utility bar; takes a `recordId` input).
1. Get_Application — lookup Subsidy_Application__c by `recordId`; queried fields include Region__c.
2. Screen_Inputs — assessor picks Transport_Type (choice), enters Distance_Km (number).
3. Get_Rule — lookup Subsidy_Determination_Rule__c matching Region + Transport_Type; `getFirstRecordOnly=true`.
4. Rule_Found decision — if no rule, screen error and end (guardrail: never a global fallback).
5. Compute proposed via formula `Distance × Multiplier`.
6. Screen_Review — show computed amount, editable "Adjusted amount" (defaults to computed), "Adjustment reason" (required if adjusted).
7. Compare_To_Threshold decision — if Adjusted <= Rule.Threshold, stamp both Proposed_Amount__c and Approved_Amount__c; else stamp Proposed_Amount__c only and surface a screen note "Over threshold — submit for approval."
8. Save the Transport_Type + Distance_Km + Adjustment_Reason (when adjusted) back to the application.

**Approval Process** — 📋 accepted gap. Real routing to the EMEA Team Manager (the intent's acceptance walkthrough) needs:
- Team Manager Users per region (INT-005 + INT-020 role-hierarchy follow-on).
- A queue-or-user field on the Region model that Team Manager membership maps to.

Until then, the guardrail "must not commit a subsidy amount that skips the approval process where required" is honored by design: `Approved_Amount__c` stays null on over-threshold applications, and the Flow surfaces the "submit for approval" instruction. A later intent (call it INT-014-follow-on) authors the ApprovalProcess metadata once Region+Team-Manager exist.

## Integration (if any)

None. No payment-system integration — out of scope per the intent (G0603).

## Alternatives considered

- **Business rule engine (BRE / Decision Table)** — Q-014-1's first option. Rejected for MVP: a Custom-Object reference table gives admins the same maintainability with lower ceremony and no license concerns. When the ruleset grows to multi-factor (region × transport × season × distance-band), revisit.
- **CMDT for the multipliers** — attractive (deploys as metadata, no records to migrate) but changes require a deploy; the client's Ops team wants runtime edit. Ruled out.
- **Global threshold (a single formula constant)** — explicitly forbidden by guardrail 2.

Q-014-1 is resolved pragmatically to **this Flow-based calculator** per the intent's own title — recorded in `decisions/2026-09-30-INT-014-mechanism.md`.

## Neighboring & future scope

**Reused / built on:**
- INT-013's Application_Review console app — this Flow rides its utility bar (INT-013-C4 utility-item gap closes here).
- INT-008's `Status__c` state machine — this Flow does not transition Status (Assessor still manually moves to Practitioner_Assigned / Approved). Approval Process (📋) will drive `Status__c = 'Approved'`.

**Builds on this:**
- INT-020 — introduces the real Region model (object or record type) and OWD tightening. When it lands, the assessor-typed `Region__c` picklist here graduates to a lookup or record-controlled field.
- INT-005 — role hierarchy Team Manager users; unblocks the deferred Approval Process.

**Existing org (brownfield):** Neither `Subsidy_Determination_Rule__c` nor any of the five app-side fields exist in repo or org. No collision. Region as a picklist is a stand-in; INT-020 will remodel.

## Open design questions

_none_ — Q-014-1 resolved by decision record.
