# INT-014 — Deployment runbook

**Intent:** `intents/INT-014/intent.md` · **Design:** `intents/INT-014/design.md` · **Test script:** `intents/INT-014/test-script.md` · **Mechanism decision:** `decisions/2026-09-30-INT-014-mechanism.md`

## Prerequisites

- **INT-013 ✅** — Application_Review console app exists.
- **INT-005 ✅** — Assessor_Base perm set exists.

## Metadata deploy (single pass)

```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Subsidy_Determination_Rule__c \
  --source-dir force-app/main/default/objects/Subsidy_Application__c \
  --source-dir force-app/main/default/flows/Determine_Subsidy.flow-meta.xml \
  --source-dir force-app/main/default/applications/Application_Review.app-meta.xml \
  --source-dir force-app/main/default/permissionsets/Assessor_Base.permissionset-meta.xml \
  --target-org <alias>
```

**Verified:** `0AfoB000000yqF3SAI` clean on `epic.out.e68d765f4115@orgfarm.salesforce.com` — 2026-09-30.

**Components:** 1 CustomObject (`Subsidy_Determination_Rule__c` + 4 fields) · 6 CustomFields on `Subsidy_Application__c` (`Region__c`, `Transport_Type__c`, `Distance_Km__c`, `Proposed_Amount__c`, `Approved_Amount__c`, `Adjustment_Reason__c`) · 1 Screen Flow (`Determine_Subsidy`, Active) · PermissionSet FLS grants on `Assessor_Base`.

## Setup steps (manual, post-deploy)

### 1. Wire the Screen Flow onto the Application Review utility bar (closes INT-013 C4)

The Metadata API's supported utility-bar-with-Flow shape is fussy — the App Builder UI does it cleanly, but a FlexiPage of `type=UtilityBar` containing a `flowruntime:flow` item is rejected as "component doesn't implement any of the region's allowed interfaces". So this is a Setup click-through, tracked as INT-014-C5 (Manual scene C):

1. Setup → **App Manager** → **Application Review** → **Edit**.
2. **Utility Items (Desktop Only)** → **Add Utility Item** → **Flow**.
3. **Flow** = `Determine Subsidy`. **Label** = `Determine Subsidy`. **Icon** = `utility:money`. **Panel Width** = 480, **Panel Height** = 560.
4. **Pass record ID into this variable**: choose the Flow's `recordId` input variable.
5. Save the app.

### 2. Seed reference-table rules

At least one Subsidy_Determination_Rule__c row per Region × Transport_Type the org supports. Ops maintains these at runtime; there is no seed script — the intent's guardrail 2 (no global fallback) means Assessors will hit the "No rule" screen if a combo is missing, by design.

## How it works

1. Assessor opens a Subsidy_Application__c in the Application Review console.
2. Clicks the utility-bar item "Determine Subsidy" → Screen Flow launches with `recordId` = the current record.
3. Flow reads `Subsidy_Application__c.Region__c`, prompts for Transport_Type + Distance_Km, looks up the matching `Subsidy_Determination_Rule__c`.
4. If no rule: end screen with an explanation. No amount is written.
5. If a rule exists: compute `Proposed = Distance × Multiplier`; assessor reviews and optionally adjusts (with reason).
6. **Decision:** `Adjusted <= Rule.Threshold` → stamp both `Proposed_Amount__c` and `Approved_Amount__c` (auto-approve within limits). Otherwise → stamp `Proposed_Amount__c` only, leave `Approved_Amount__c` null, and surface "submit for approval" — the guardrail against committing an amount that skips approval where required.

## Deferred / follow-ons

- **Approval Process (C6)** — routing to a regional Team Manager needs the role hierarchy (INT-005 completion of Team Manager users) plus a real Region model (INT-020). Ships as a follow-on intent once both land.
- **Practitioner.Distance_From_Patient auto-compute** — the intent's phrasing implied the Flow reads distance from the practitioner's Contact record. Today Distance is not modelled on Contact; Loqate geocoding rides INT-006. Assessor types the distance manually until then.
- **Manual scenes A + B + C** (C5, C7, C8) — 👁 _pending_; tester runs `intents/INT-014/test-script.md`.

## Rollback

Destructive deploy in order: Flow (`Determine_Subsidy`) → the six Subsidy_Application__c fields → Subsidy_Determination_Rule__c object (which drops its fields). Assessor_Base FLS entries auto-drop when the fields drop.
