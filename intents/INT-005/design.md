---
intent: INT-005
scope_hash: 3a454bd1c005
authored: 2026-09-29
---

# INT-005 — Design

**Intent:** Regional user model and role hierarchy
**Source intent:** `intents/INT-005/intent.md`

## Data model

- **`User.Region__c`** — restricted picklist, values `APAC` / `EMEA` / `AMER`. Standard-object custom field. Mirrors `Contact.Region__c` exactly (already in the repo — scaffolded during INT-009) so downstream sharing on custom objects (INT-020) reads a single canonical region value regardless of whether the owning record is a User or Contact.
- **`Contact.Region__c`** — already exists, reused as-is. No change.
- No new custom objects. Region is a picklist, not a lookup, because the three regions are finite, stable, and the parity with `Contact.Region__c` is enforced by keeping the picklists identical.

## Sharing & security

- **OWD:** unchanged. No OWD changes here — INT-020 owns the region-scoped OWD on Subsidy_Application__c / Assignment__c / Assessment__c once those exist.
- **Role hierarchy** (the intent's "role hierarchy modeled per region"):

  ```
  PTSF_Global (root)
  ├── APAC_Regional_Ops_Manager
  │   └── APAC_Team_Manager
  │       └── APAC_Assessor
  ├── EMEA_Regional_Ops_Manager
  │   └── EMEA_Team_Manager
  │       └── EMEA_Assessor
  └── AMER_Regional_Ops_Manager
      └── AMER_Team_Manager
          └── AMER_Assessor
  ```

  The three regional branches sit as siblings under a single root; there is **no parent-child edge between regions**. This structurally enforces the intent's guardrail *"a role-hierarchy grant must not cross regions"* — a role-hierarchy grant only rolls up within one branch, so APAC's Team Manager never inherits records owned by an EMEA Assessor. The `PTSF_Global` root exists so records owned by cross-region users (SysAdmin, service accounts) have a home; nobody with day-to-day data ownership sits at the root.

- **Permission Set Groups** — 9 PSGs, one per Profile × Region:

  | Region | Assessor | Team Manager | Regional Ops Manager |
  |---|---|---|---|
  | APAC | `APAC_Assessor` | `APAC_Team_Manager` | `APAC_Regional_Ops_Manager` |
  | EMEA | `EMEA_Assessor` | `EMEA_Team_Manager` | `EMEA_Regional_Ops_Manager` |
  | AMER | `AMER_Assessor` | `AMER_Team_Manager` | `AMER_Regional_Ops_Manager` |

  Each PSG composes two permission sets:
  - A **role permission set** (`Assessor_Base`, `Team_Manager_Base`, `Regional_Ops_Manager_Base`) carrying the role's object/field access baseline. Three PSs total, not nine — the role's access rights don't change by region.
  - A **region marker permission set** (`Region_APAC`, `Region_EMEA`, `Region_AMER`) — thin, carries no CRUD/FLS. Its only job is to be readable in future criteria (a `Setup.Owner has Permission Set: Region_APAC` filter, or a Flow branch). This gives INT-020's criteria-based sharing rules a stable handle even if `User.Region__c` gets renamed or extended, and gives us a lever if a user needs a *secondary* region (Q-design-2 flags this).

  Total: 3 role PSs + 3 region PSs + 9 PSGs.

- **FLS on `User.Region__c`:** read for the three role permission sets (so assessors can see their own region on their user record); write only for System Administrator. The picklist is set by admin/HR on user provisioning, not by end users.

- **Cascading consequences**:
  - Add `User.Region__c` to the **User page layout** (`User Layout`).
  - Add `Contact.Region__c` to any Contact page layout that shows regional context (Practitioner layout — created for INT-009).
  - No app-slot or Lightning-page changes; role hierarchy and PSGs render in Setup natively.
  - PSA (permission-set-group assignment) records get created per test/persona user in the runbook — not in metadata deploy (assignments belong to the org, not the repo).

## Automation approach

None. This is a **config-only** intent — custom field, roles, permission sets, permission set groups. Standard-first: no Flow, no Apex, no validation rule (the picklist is `restricted`, so the platform enforces valid values).

## Integration

None.

## Alternatives considered

- **Region as a custom object with a lookup on User/Contact** — rejected. The three regions are finite and rarely change; a lookup buys nothing and would force a lookup filter everywhere. A restricted picklist with parity across User/Contact is the standard-first call. Reconsider only if regions become dynamic (e.g. sub-regions, dozens of countries).
- **A single flat role (`PTSF_All`) with no regional branching, letting sharing rules alone enforce region** — rejected. The intent's guardrail *"role-hierarchy grant must not cross regions"* is met most robustly by *structure*: three parallel branches make it impossible by construction, rather than defensively via sharing-rule tuning. Also loses the standard "Regional Ops Manager sees their region's Team Managers' data" grant that this design gets from the platform for free.
- **One combined permission set per Profile × Region (9 PSs, no PSGs)** — rejected. Duplicates the role's access rights across three copies per role, so every access change is a three-way edit. Composing `Assessor_Base + Region_APAC` in a PSG keeps role access single-sourced.
- **Skip the `Region_<X>` marker permission sets and rely only on `User.Region__c`** — rejected as marginal. The marker PS is cheap (empty PS, no fields), and INT-020's criteria-based sharing rules gain a stable dependency that doesn't move if the picklist is renamed. Willing to drop if the Trusted Guide sees it as ceremony.

## Neighboring & future scope

**BUILT ON:** none delivered upstream — this is greenfield foundation.

**BUILDS ON THIS:**
- **INT-020** (Region scoping and OWD sharing on subsidy/assignment/assessment) — the direct consumer. Reads `User.Region__c` (or the `Region_<X>` PS) via criteria-based sharing rules on Subsidy_Application__c / Assignment__c / Assessment__c. This design leaves both handles available; INT-020 picks. **Not cornered.**
- **INT-010** (3-business-day SLA with regional Business Hours) — reads the assignment's practitioner region via Contact.Region__c (already in repo) to pick regional Business Hours. This design doesn't move that; nothing to preclude.
- **INT-004 / INT-009 / INT-019** (already ✅ Delivered) — none read User.Region__c or the role hierarchy today; INT-004's PHI Restriction Rule is orthogonal. No collision.

**Existing org (brownfield):**
- `Contact.Region__c` — **reuse**, exists in the shape this intent wants (picklist APAC/EMEA/AMER, unrestricted). *Note-and-proceed.*
- `User.Region__c` — **create**. Not in `force-app/**`.
- Roles (`force-app/main/default/roles/`) — none in repo; live org not consulted (`⚠ org not consulted` for the sandbox — the target org likely has default roles from provisioning; the runbook will state that our 10 new roles are additive and won't collide with a stock hierarchy).
- Permission Set Groups (`force-app/main/default/permissionsetgroups/`) — none in repo.

## Build sequence

Standard cascade applies (field → FLS → layout → roles → base PSs → region marker PSs → PSGs → assign to test users via runbook). No non-obvious ordering. Omitted.

## Open design questions

- **Q-005-1** (from `intent.md`): which profiles get regionalized — just the three named in the Build target (Regional Ops Manager, Team Manager, Assessor), or every internal profile including Compliance Officer / System Administrator? **Working answer for this build:** the three named. Compliance Officer and System Administrator stay unregionalized (they're cross-region by role). If the Trusted Guide wants them regionalized, that's a follow-on refinement — record the answer as a decision and add PSGs at that time. This intent proceeds with 3 profiles × 3 regions = 9 PSGs.
- **Q-design-2:** does any user need a **secondary region** (e.g. an assessor covering APAC + EMEA temporarily)? Impacts whether Region is a picklist (single) or a multi-select. Working assumption: no — the `Region_<X>` marker PS approach means we can grant a secondary region via a *second PSG assignment* without changing the picklist. Flag only; not blocking.
- **Q-design-3:** on the sandbox, does the standard role hierarchy already exist (from org provisioning), and if so does our 10-role tree sit alongside it or replace it? Working assumption: sit alongside (additive). Runbook step will confirm at deploy time.
