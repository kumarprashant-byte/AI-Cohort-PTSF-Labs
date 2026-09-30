# INT-013 — Deployment runbook

**Intent:** `intents/INT-013/intent.md` · **Design:** `intents/INT-013/design.md` · **Test script:** `intents/INT-013/test-script.md` · **Resequence decision:** `decisions/2026-09-30-INT-013-resequence-to-phase-3.md`

## Prerequisites

- **INT-004 ✅** — Medical_History__c Private OWD + Restriction Rule (the row-level denial this app relies on for C3).
- **INT-005 ✅** — `Assessor_Base` permission set (the app-visibility anchor).
- **Subsidy_Application__c** exists (any prior intent that created it).

## Metadata deploy (two-pass on a fresh org)

The permission set references the CustomApplication, so the app must land first.

**Pass 1 — CustomApplication, tabs, list views:**
```bash
sf project deploy start \
  --source-dir force-app/main/default/applications \
  --source-dir force-app/main/default/tabs \
  --source-dir force-app/main/default/objects/Subsidy_Application__c/listViews \
  --target-org <alias>
```

**Pass 2 — permission set (adds app + tab visibility to Assessor_Base):**
```bash
sf project deploy start \
  --source-dir force-app/main/default/permissionsets/Assessor_Base.permissionset-meta.xml \
  --target-org <alias>
```

**Verified:** pass 1 `0AfoB000000ypXVSAY`; pass 2 clean on `epic.out.e68d765f4115@orgfarm.salesforce.com` — 2026-09-30.

**Components:** 1 CustomApplication (`Application_Review`, Console/Lightning), 3 CustomTabs (`Subsidy_Application__c`, `Assessment__c`, `HIC_Check__c`), 2 ListViews (`Subsidy_Application__c.My_Queue`, `Subsidy_Application__c.Open_Applications`), 1 PermissionSet edit (`Assessor_Base` — added `applicationVisibilities` + 3 `tabSettings`).

## Setup steps (not in the metadata deploy)

None. The permission-set edit assigns the app + tabs to Assessor_Base users automatically. Users already assigned to `Assessor_Base` (or any Region × Assessor PSG that composes it) will see **Application Review** in the App Launcher on next page load.

## How to open the console

1. Log in as a user with `Assessor_Base` assigned (directly or via a Region × Assessor PSG).
2. App Launcher → **Application Review**.
3. Primary workspace opens on the Subsidy Applications tab; sub-tabs open per record.

## Deferred / follow-ons

- **Utility bar** — no utility items ship in this intent. INT-014 (Determine Subsidy) and INT-012 (Escalate to Manager) each add their launcher via a metadata edit to `Application_Review.app-meta.xml`. Test-script criteria INT-013-C4 and C5 are 📋 with those intents as accepters.
- **Regional Queue list view** — waits for `Subsidy_Application__c.Region__c` from INT-020. Criterion INT-013-C7 is 📋 pointing at INT-020.
- **SLA Breached list view** — waits for an SLA-breach stamp field on `Assignment__c` (INT-010 follow-on). Criterion INT-013-C8 is 📋.
- **Manual scene B (acceptance walkthrough)** — INT-013-C10 is 👁 _pending_; a human tester runs `intents/INT-013/test-script.md` Scene B.

## Rollback

The app is opt-in (Assessor_Base visibility). To fully unwind:

1. Remove `<applicationVisibilities>` and the three `<tabSettings>` blocks from `Assessor_Base.permissionset-meta.xml`; redeploy the permset.
2. Destructive deploy: `CustomApplication:Application_Review`, then `CustomTab:{Subsidy_Application__c,Assessment__c,HIC_Check__c}`, then the two `ListView` records.

The three custom objects (`Subsidy_Application__c`, `Assessment__c`, `HIC_Check__c`) are prior intents' scope — leave them.
