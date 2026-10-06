---
intent: INT-024
phase: 2
authored: 2026-10-06
---

# INT-024 — Design

**Intent:** Subsidy calculator — distance × transport decision table and manual override
**Status:** Draft — awaits Trusted Guide ratification.

## Shape

```
Assessor Service Console (INT-013)
   └─ Subsidy_Application__c record page
        └─ faqSubsidyCalculator LWC
              │ click: Recalculate
              ▼
        AssessorSubsidyController.recalculate(recordId)         [@AuraEnabled, with sharing]
              │ reads parent Patient__c + Facility__c geocoded addresses
              │ computes Distance_Km__c via Haversine (great-circle)
              │ loads matching Subsidy_Determination_Rule__c row
              │ returns { distanceKm, proposedAmount, ruleName }
              ▼
        Panel updates Distance_Km__c + Proposed_Amount__c in-page (unsaved — SC-1)
              │
              │ Assessor types Approved_Amount__c (may differ)
              │ If differs, must enter Adjustment_Reason__c
              │ Standard save
              ▼
        Validation rule enforces override reason (SC-2)
        Decision_Source__c formula resolves to calculator | manual (SC-3)
              │
              ▼
        INT-014 Determine_Subsidy threshold Approval Process consumes Approved_Amount__c
```

## Brownfield reconciliation — field reuse (critical)

INT-014's local-build delivery already shipped several of this intent's named fields on `Subsidy_Application__c`. **Reuse the existing names rather than mint duplicates.** Flagging as `Q-design-1` for ratification; recommended disposition on the right.

| Intent names | Already in `force-app` | Disposition |
|---|---|---|
| `Proposed_Amount__c` | ✅ Currency(16, 2) | **Reuse** |
| `Approved_Amount__c` | ✅ Currency(16, 2) | **Reuse** |
| `Transport_Type__c` on Subsidy_Application__c | ✅ picklist | **Reuse** (confirm value set includes `air`, `long-distance ground`, `local ground`, `patient-provided` — see `Q-design-2`) |
| `Distance_From_Patient__c` | `Distance_Km__c` Number(7, 2) | **Reuse `Distance_Km__c`** (same semantics, shipped name wins). Intent prose edit routed through `/ql-refine-intent`. |
| `Override_Reason__c` | `Adjustment_Reason__c` LongTextArea | **Reuse `Adjustment_Reason__c`** (same semantics, shipped name wins). Intent prose edit routed through `/ql-refine-intent`. |
| `Decision_Source__c` | not present | **Create** (formula or picklist — see below) |

## Data model additions

### `Subsidy_Application__c` — new field

- **`Decision_Source__c`** — Formula(Text), result: `IF(Approved_Amount__c = Proposed_Amount__c, "calculator", "manual")`. Formula not picklist, because it's a pure derivation of two existing fields — one source of truth, no sync bug possible. Satisfies SC-3 by construction (no automation to maintain).

### `Subsidy_Determination_Rule__c` — new fields (extend INT-014's reference table)

- **`Distance_Min_Km__c`** — Number(7, 2), nullable. Inclusive lower bound of the distance band this rule row applies to.
- **`Distance_Max_Km__c`** — Number(7, 2), nullable. Exclusive upper bound. A `NULL` upper bound means "and above."
- **`Base_Amount__c`** — Currency(16, 2). Base subsidy for this `Region__c` × `Transport_Type__c` × distance band. The existing `Multiplier__c` is retained and composes: `Proposed_Amount__c = Base_Amount__c × Multiplier__c`.

Rule key becomes `(Region__c, Transport_Type__c, Distance_Min_Km__c)` — rows are seeded one per band per transport type per region. A missing rule row for a given tuple is a hard error (Apex throws, caught by LWC, surfaced to Assessor). No implicit zero.

### Validation rule — `Subsidy_Application__c.Override_Needs_Reason`

```
AND(
  NOT(ISBLANK(Approved_Amount__c)),
  NOT(ISBLANK(Proposed_Amount__c)),
  Approved_Amount__c <> Proposed_Amount__c,
  ISBLANK(Adjustment_Reason__c)
)
```

Error message: *An Adjustment Reason is required when the Approved Amount differs from the Proposed Amount.* Satisfies SC-2.

## Apex surface

### `AssessorSubsidyController` (`with sharing`, API 61.0)

```apex
public class AssessorSubsidyController {

    public class CalculationResult {
        @AuraEnabled public Decimal distanceKm;
        @AuraEnabled public Decimal proposedAmount;
        @AuraEnabled public String ruleName;         // DeveloperName of the matched Rule row (for audit/debug)
        @AuraEnabled public String basis;            // e.g. "EMEA · air · 100-200km → 1,500 EUR × 1.6"
    }

    @AuraEnabled
    public static CalculationResult recalculate(Id applicationId) { … }

    // Internal — Haversine great-circle distance in km from two Address values.
    @TestVisible
    static Decimal haversineKm(Decimal lat1, Decimal lon1, Decimal lat2, Decimal lon2) { … }

    // Internal — resolve the rule row for the (region, transport, distance) tuple.
    @TestVisible
    static Subsidy_Determination_Rule__c resolveRule(String region, String transportType, Decimal distanceKm) { … }
}
```

Behavior:

1. Loads the `Subsidy_Application__c` with Patient__r (Address) and Facility (per INT-014 flow — if facility is on another parent, resolve from there). `⚠ Q-design-3` — the current schema is ambiguous on which parent carries the Facility address.
2. Computes `distanceKm` from the two geocoded addresses via Haversine. If either address is not yet geocoded (`Latitude`/`Longitude` null), falls back to the record's existing `Distance_Km__c` if present; else throws `AuraHandledException("Address geocoding incomplete — enter distance manually.")`.
3. Resolves `Subsidy_Determination_Rule__c` for `(Region__c, Transport_Type__c, Distance_Min_Km__c ≤ distanceKm < Distance_Max_Km__c OR Distance_Max_Km__c IS NULL)`. One row expected; multiple is a config error (throws); zero is a config error (throws).
4. Returns `{ distanceKm, proposedAmount = Base_Amount__c × Multiplier__c, ruleName, basis }`. **Does not write the record** — the LWC applies the values to the form and the Assessor saves (SC-1).

### Alternatives considered (per Q-024-1)

- **Business Rules Engine (BRE)** — correct tool semantically, but adds licensing (Decision Tables are part of Industries BRE / OmniStudio runtime). PTSF has no other BRE-driven work; one calculator doesn't justify the SKU. **Rejected on cost.**
- **Flow Decision Matrix** — would need to loop over `Subsidy_Determination_Rule__c` rows and compare `Distance_Min_Km__c`/`Max_Km__c`, which is clunky in Flow (no range operator in Decision elements). Doable but less readable than ~30 lines of Apex. **Rejected on complexity.**
- **Pure Apex with SOQL on `Subsidy_Determination_Rule__c`** — chosen. Admin-maintainable (SC-4: edit rule rows, no deploy). The Apex method is thin enough that the "Flow-wrapped" wording in the intent is satisfied by exposing `recalculate` as `@InvocableMethod` as well — any future Flow can call it. The LWC is the primary caller.

Captured as a decision record (Step: `decisions/2026-10-06-INT-024-apex-over-bre.md`) at ratification.

## LWC — `assessorSubsidyCalculator`

Targets: `lightning__RecordPage` only (Subsidy_Application__c), API 61.0.

Renders:
- Current `Transport_Type__c` (bound to the record page; changes propagate to Recalculate).
- Current `Distance_Km__c` + `Proposed_Amount__c` (read-only display).
- **Recalculate** button → calls `recalculate`, writes result into `Proposed_Amount__c` + `Distance_Km__c` on the form via `lightning-record-edit-form` (unsaved — SC-1).
- `basis` string under the button so the Assessor sees how the number was reached.
- Approved_Amount + Adjustment_Reason are standard record fields on the page layout — the LWC does not own them.

## Permissions

Extend `Assessor_Base.permissionset-meta.xml`:
- `fieldPermissions` R/E on `Subsidy_Application__c.Decision_Source__c` (read only — formula)
- `fieldPermissions` R/E on `Subsidy_Determination_Rule__c.Distance_Min_Km__c`, `Distance_Max_Km__c`, `Base_Amount__c` (read for Assessor; admin-only edit via a separate `Subsidy_Rule_Admin` permset — out of scope here, flagged in `## Follow-ups`)
- `classAccess` for `AssessorSubsidyController`
- Existing Case R/C/E unchanged.

## Seed data

Add CustomMetadata-style seeds? No — `Subsidy_Determination_Rule__c` is a regular custom object (not `__mdt`) because the intent requires admin editability without a deploy (SC-4). So seeded via a post-deploy data script, not metadata. Deploy plan step 4.

Minimum seed set to prove the acceptance walkthrough:
- EMEA · air · 100–300km · Base 1,500 EUR · Mult 1.6 → 2,400 EUR ✓
- EMEA · long-distance ground · 100–300km · Base 1,000 EUR · Mult 1.2 → 1,200 EUR ✓

Full seed matrix (all regions × transport × distance bands) is operational data — out of scope here (flagged as follow-up).

## Deployment plan

1. Add `Distance_Min_Km__c`, `Distance_Max_Km__c`, `Base_Amount__c` to `Subsidy_Determination_Rule__c`.
2. Add `Decision_Source__c` formula to `Subsidy_Application__c`.
3. Add validation rule `Override_Needs_Reason` on `Subsidy_Application__c`.
4. Seed 2 rule rows via `delivery/scripts/INT-024-seed-rules.apex` (`sf apex run`).
5. Deploy `AssessorSubsidyController` + test class.
6. Deploy `assessorSubsidyCalculator` LWC.
7. Extend `Assessor_Base` permset.
8. Place the LWC on the `Subsidy_Application__c` Lightning Record Page via App Builder (manual Setup step — captured in `delivery/deploy-runbook.md`).

Steps 1–7 are metadata-deployable in one shot; step 4 is a `sf apex run` after metadata lands; step 8 is a manual Setup step.

## Open design questions

- **Q-design-1** — Field reuse (`Distance_Km__c` for `Distance_From_Patient__c`, `Adjustment_Reason__c` for `Override_Reason__c`). Recommended: reuse. Needs intent prose edit via `/ql-refine-intent` to formalize. (Resolver: Trusted Guide)
- **Q-design-2** — Confirm `Subsidy_Application__c.Transport_Type__c` picklist includes all four values from the intent (`air`, `long-distance ground`, `local ground`, `patient-provided`). Deploy-time probe. (Resolver: build step 1 verification)
- **Q-design-3** — Facility address source. Where does the facility live on `Subsidy_Application__c` — a direct lookup, or inherited from `Assignment__c`/practitioner? If no facility yet, the calculator falls back to manual `Distance_Km__c` entry; design covers that fallback. (Resolver: Trusted Guide — may become a prerequisite intent)
- **Q-024-1 (parent)** — BRE vs Flow vs Apex-lookup. **Design recommends Apex-over-SOQL-on-custom-object**; written up for ratification.
- **Q-024-2 (parent)** — Rule maintenance ownership. Design assumes Regional Ops Manager edits rule rows directly; no change needed in this intent if that's confirmed.

## Risks

- **Geocoding async timing.** Standard Salesforce geocoding (data integration rules on `Patient__c.Address`) can lag minutes behind record creation. The design handles it (fall-through to manual distance), but in the acceptance walkthrough both parent addresses must be geocoded. The test script's manual Scene A should allow a seeded, pre-geocoded patient and facility.
- **Rule table completeness.** A missing rule row for a `(region, transport, distance)` tuple is a hard error. The seed covers the acceptance walkthrough; broader coverage is operational and out of scope here.
- **Decision_Source__c as formula.** If a future requirement needs the decision basis to be `calculator` even when amounts match by coincidence, the formula gives the wrong answer. Current semantics (SC-3) make them equivalent, so no risk today — flag if that changes.

## Follow-ups

- A `Subsidy_Rule_Admin` permission set for Regional Ops Managers to edit `Subsidy_Determination_Rule__c` records at runtime (currently gated to sysadmin via OWD + no permset grant).
- Full regional rule seed (all 3 regions × 4 transport × ~3 distance bands = ~36 rows).
- Intent prose edits via `/ql-refine-intent`: rename `Distance_From_Patient__c` → `Distance_Km__c` and `Override_Reason__c` → `Adjustment_Reason__c` in the intent body.
