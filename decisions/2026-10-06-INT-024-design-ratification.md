# 2026-10-06 — INT-024 design ratification + Q-design answers

**Intent:** `intents/INT-024/intent.md`
**Design:** `intents/INT-024/design.md`
**Ratified by:** Prashant Kumar (Trusted Guide)
**Date:** 2026-10-06

## Context

INT-024 opened on 2026-10-06. Design pass surfaced four open questions (two parent `Q-024-*` from the intent, three `Q-design-*` from brownfield reconciliation and schema reading). This record captures the answers the Trusted Guide ratified before the build started.

## Decisions

- **Q-design-1 — Field reuse.** Reuse the field names already shipped by INT-014:
    - `Distance_Km__c` (not a new `Distance_From_Patient__c`)
    - `Adjustment_Reason__c` (not a new `Override_Reason__c`)
    - `Proposed_Amount__c`, `Approved_Amount__c`, `Transport_Type__c` on `Subsidy_Application__c` — already present, reuse.
    - **New only:** `Decision_Source__c` on `Subsidy_Application__c` (formula).
    - **Follow-up:** intent prose edits via `/ql-refine-intent` to replace `Distance_From_Patient__c` → `Distance_Km__c` and `Override_Reason__c` → `Adjustment_Reason__c` in the build target.

- **Q-design-2 — `Transport_Type__c` picklist values.** The shipped picklist on both `Subsidy_Application__c` and `Subsidy_Determination_Rule__c` is `Air / Rail / Road / Sea` — not the intent's `air / long-distance ground / local ground / patient-provided`. Build uses the shipped values; acceptance walkthrough maps "long-distance ground" → `Road`. **Follow-up:** intent prose edit to reconcile the two value sets (either extend the picklist with `Local Ground` / `Patient Provided`, or reword the intent). Shipped-schema wins for v1 — we don't want two divergent value sets in-flight.

- **Q-design-3 — Facility address source.** `Subsidy_Application__c` carries no Facility reference today (Patient = Contact lookup only). v1 drops the Haversine/geocoding path and uses the manually entered `Distance_Km__c` field. Test criterion C10 (Haversine fixture) is removed from the proof plan. **Follow-up:** when a Facility model lands (likely with INT-023 or a dedicated intent), add the `distanceFromGeocode()` branch to `AssessorSubsidyController.recalculate` and re-introduce the Haversine test.

- **Q-024-1 — Decision mechanism.** Apex-over-SOQL on the extended `Subsidy_Determination_Rule__c` object. Rejected BRE (licensing SKU not justified for one calculator) and Flow Decision Matrix (no range operator — clumsy). The thin Apex method keeps the proof plan clean, the admin can edit rule rows without a deploy (SC-4), and exposing it as `@InvocableMethod` later satisfies the intent's "Flow-wrapped" wording if ever needed.

- **Q-024-2 — Rule maintenance ownership.** Not blocking the v1 build. Design assumes Regional Ops Manager edits rule rows at runtime; a dedicated `Subsidy_Rule_Admin` permset is a follow-up (currently gated to sysadmin via OWD + no permset grant).

## Consequences

- Design is cleared to build without further Trusted Guide gates.
- Intent prose edits (Q-design-1, Q-design-2 follow-ups) are deferred as `/ql-refine-intent` work — scope hash will re-drift on INT-024 when they land, and this record is the pointer for `reverify`.
- Haversine helper and test are dropped from v1 scope; follow-up noted in intent/design/test-script as geocoding becomes available.
- Proof plan drops C10 (Haversine fixture); remaining 12 criteria stand.
