---
intent: INT-014
phase: 4
proof_hash: 42242f6ff64b
authored: 2026-09-30
---

# INT-014 — Test script

**Intent:** Subsidy determination Flow with regional threshold approval
**Phase:** 4 · **Source intent:** `intents/INT-014/intent.md` · **Design:** `intents/INT-014/design.md` · **Mechanism decision:** `decisions/2026-09-30-INT-014-mechanism.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-014-C1 | `Subsidy_Determination_Rule__c` object exists with Region__c, Transport_Type__c, Multiplier__c, Threshold__c fields of correct types (design § Data model) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-014-C2 | Subsidy_Application__c has Region__c, Transport_Type__c, Distance_Km__c, Proposed_Amount__c, Approved_Amount__c, Adjustment_Reason__c with correct types (build target) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-014-C3 | Flow `Determine_Subsidy` is Active — Screen Flow on Subsidy_Application__c context (build target) | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-014-C4 | Flow includes an Approved_Amount stamp gated on Proposed <= Rule.Threshold (guardrail 1 — must not commit an amount that skips approval where required) | org-probe (flow XML inspection) | ✅ | (verify — green, 2026-09-30) |
| INT-014-C5 | Utility bar item on Application_Review app launches the `Determine_Subsidy` Flow (closes INT-013 C4 gap) | Manual scene C (Setup click-through — see runbook § Setup steps) | 👁 | _pending_ |
| INT-014-C6 | Approval Process routing to EMEA Team Manager (acceptance walkthrough) | 📋 accepted by Prashant Kumar — INT-014-follow-on after INT-005 + INT-020 (Team Manager users + Region model) | 📋 | — |
| INT-014-C7 | End-to-end (under threshold): EMEA app, Air, 300 km, multiplier 1.0, threshold 500 → Proposed_Amount__c=300, Approved_Amount__c=300 stamped (acceptance walkthrough — under-threshold half) | Manual scene A | 👁 | _pending_ |
| INT-014-C8 | End-to-end (over threshold): EMEA app, Air, 1800 km, multiplier 1.0, threshold 1500 → Proposed_Amount__c=1800, Approved_Amount__c stays **null** with over-threshold screen note (guardrail 1) | Manual scene B | 👁 | _pending_ |

## Automated proofs to write

None — Flow + object + fields. Structural via org-probe; end-to-end via manual scenes.

## Org assertions

- **INT-014-C1** (rule object):
  - `object-exists(Subsidy_Determination_Rule__c)`
  - `field-exists(Subsidy_Determination_Rule__c.Region__c)`, `field-type(…, Picklist)`
  - `field-exists(Subsidy_Determination_Rule__c.Transport_Type__c)`, `field-type(…, Picklist)`
  - `field-exists(Subsidy_Determination_Rule__c.Multiplier__c)`, `field-type(…, Number)`
  - `field-exists(Subsidy_Determination_Rule__c.Threshold__c)`, `field-type(…, Currency)`
- **INT-014-C2** (subsidy-app fields):
  - `field-exists(Subsidy_Application__c.Region__c)`, `field-type(…, Picklist)`
  - `field-exists(Subsidy_Application__c.Transport_Type__c)`, `field-type(…, Picklist)`
  - `field-exists(Subsidy_Application__c.Distance_Km__c)`, `field-type(…, Number)`
  - `field-exists(Subsidy_Application__c.Proposed_Amount__c)`, `field-type(…, Currency)`
  - `field-exists(Subsidy_Application__c.Approved_Amount__c)`, `field-type(…, Currency)`
  - `field-exists(Subsidy_Application__c.Adjustment_Reason__c)`, `field-type(…, LongTextArea)`
- **INT-014-C3** (flow active):
  - `flow-active(Determine_Subsidy)`
- **INT-014-C4** (threshold gating):
  - metadata inspection of the Flow XML — decision `Under_Threshold` compares Adjusted vs Rule.Threshold; only the under-threshold branch stamps `Approved_Amount__c`
- **INT-014-C5** — not org-probe; the Metadata API's supported utility-bar Flow component (a `flowruntime:*` variant) rejected on this org — a native FlexiPage wrapping a Flow doesn't declare the interface the utility-bar region requires. The App Builder UI adds it cleanly, so this graduates to a Setup click-through (Manual scene C) rather than a deploy-time assertion. Tracked as an engagement gotcha to fold into `delivery/build-notes.md`.

## Manual validation scenes

### Scene A — Under-threshold auto-stamp (criterion C7)
1. Seed a `Subsidy_Determination_Rule__c` record: Region=EMEA, Transport_Type=Air, Multiplier=1.0, Threshold=500.
2. As an Assessor persona, open a Subsidy_Application__c set to Region=EMEA.
3. Click the utility-bar item "Determine Subsidy" — the Screen Flow launches inside the console.
4. Enter Transport_Type=Air, Distance_Km=300. Compute; do not adjust. Confirm.
5. Confirm on the record: `Proposed_Amount__c = €300`, `Approved_Amount__c = €300`, `Transport_Type__c = Air`, `Distance_Km__c = 300`.
**Expected:** both amounts stamped equal; auto-approve within limits. **Sign-off:** _name / date / pass·fail_.

### Scene C — Utility bar Setup wire-up (criterion C5)
1. Setup → App Manager → **Application Review** → Edit → Utility Items → **Add Utility Item** → Flow.
2. Choose Flow **Determine Subsidy**; label "Determine Subsidy"; icon `utility:money`; panel 480 × 560; **Pass record ID into this variable: `recordId`**. Save.
3. Open the Application Review console; click the "Determine Subsidy" utility item — the Screen Flow opens with the current Subsidy_Application__c record's Id passed in.
**Expected:** the item is present and launches the Flow against the open record. **Sign-off:** _name / date / pass·fail_.

### Scene B — Over-threshold, approval required (criterion C8)
1. Same rule as Scene A (threshold €500) — this time Distance_Km=1800 (proposed €1800).
2. Complete the Flow.
3. Confirm: `Proposed_Amount__c = €1800`, `Approved_Amount__c` is **null**, and the Flow's final screen carried the "Over threshold — submit for approval" note.
**Expected:** the guardrail holds; nothing commits the approved amount. **Sign-off:** _name / date / pass·fail_.

## Deliberately not tested (out of scope)

- Payment-system integration — intent's `out_of_scope` excludes it (G0603).
- Approval-Process routing to a Team Manager — 📋 C6 (INT-014-follow-on).
- Real Practitioner.Distance_From_Patient calculation — 📋 to INT-005+INT-020 (Distance is not a Contact field; needs geocode from INT-006).
