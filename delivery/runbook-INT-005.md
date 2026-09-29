# INT-005 — Deployment runbook

**Intent:** `intents/INT-005/intent.md` · **Design:** `intents/INT-005/design.md` · **Test script:** `intents/INT-005/test-script.md`

## Metadata deploy (rides the PR)

```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/User \
  --source-dir force-app/main/default/roles \
  --source-dir force-app/main/default/permissionsets/Assessor_Base.permissionset-meta.xml \
  --source-dir force-app/main/default/permissionsets/Team_Manager_Base.permissionset-meta.xml \
  --source-dir force-app/main/default/permissionsets/Regional_Ops_Manager_Base.permissionset-meta.xml \
  --source-dir force-app/main/default/permissionsets/Region_APAC.permissionset-meta.xml \
  --source-dir force-app/main/default/permissionsets/Region_EMEA.permissionset-meta.xml \
  --source-dir force-app/main/default/permissionsets/Region_AMER.permissionset-meta.xml \
  --source-dir force-app/main/default/permissionsetgroups \
  --target-org <alias>
```

**26 components:** 1 CustomField (User.Region__c), 10 UserRoles, 6 PermissionSets, 9 PermissionSetGroups.

**Verified deploy:** `0AfoB000000yixRSAQ` on `orgfarm-5f9310b41f.test2.my.pc-rnd.salesforce.com` — 2026-09-29.

## Setup steps (not in the metadata deploy)

### 1. Add Region to the User page layout

Setup → Object Manager → User → Page Layouts → **User Layout** → drag **Region** onto the *Additional Information* section → Save.

_Rationale:_ the field deploys but only shows on a layout it's placed on. Standard User layout is org-specific, hence a manual step.

### 2. Provision test users for manual scenes A and B

For **Scene A — APAC Assessor** (test-script criterion C6):

```
Username:        apac.assessor@ptsf.test.invalid
Profile:         Standard User
Role:            APAC Assessor
Region__c:       APAC
Permission Set Group Assignment: APAC_Assessor
```

For **Scene B — EMEA Regional Ops Manager** (criterion C7):

```
Username:        emea.rom@ptsf.test.invalid
Profile:         Standard User
Role:            EMEA Regional Ops Manager
Region__c:       EMEA
Permission Set Group Assignment: EMEA_Regional_Ops_Manager
```

Set a temporary password and email it to whoever runs the manual scene, or use *Login as user*.

## Rollback

Metadata is additive. If rollback is needed:

1. Unassign PSGs from any users.
2. Destructive deploy the 26 components:
   ```bash
   sf project deploy start --pre-destructive-changes destructiveChanges.xml \
     --manifest package-empty.xml --target-org <alias>
   ```
   `destructiveChanges.xml` lists each type/member. Roles must be reassigned off before the UserRole delete succeeds.

## Deferred / follow-ons

- **Compliance Officer / SysAdmin regionalization** — deferred per `decisions/2026-09-29-INT-005-Q-005-1-profile-scope.md`. Additive if reversed.
- **Secondary-region grant** (Q-design-2) — the `Region_<X>` marker PS design allows a second PSG assignment without a picklist change. No action until a real case appears.
- **Sandbox stock-role coexistence** (Q-design-3) — the 10 new roles deployed alongside the org's existing roles without collision; no rework needed.
