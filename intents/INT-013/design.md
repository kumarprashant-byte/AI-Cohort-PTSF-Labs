---
intent: INT-013
scope_hash: ebef5bab7440
authored: 2026-09-30
---

# INT-013 — Design

**Intent:** Assessor Service Console for application review
**Source intent:** `intents/INT-013/intent.md`

## Data model

No new objects or fields. This intent lands surfaces onto existing metadata:

- **`Subsidy_Application__c`** (INT-008 scope; today: `Patient__c`, `Previously_Declined_Practitioners__c`, `Status__c`, `Treatment_Type__c`) — primary tab.
- **`Assessment__c`** and **`HIC_Check__c`** — related lists on the record page.
- **`Contact`** (Practitioner) — reference card via lookup path through `Assignment__c.Practitioner_Contact__c`.
- **`Medical_History__c`** — intentionally absent from all surfaces (INT-004's Restriction Rule enforces even if it leaked).

## Sharing & security

- **App visibility** — `Application Review` app added to `Assessor_Base` permission set (`<applicationVisibilities>`). Other role permission sets do not get it.
- **Tab visibility** — `Subsidy_Application__c`, `Assessment__c`, `HIC_Check__c` custom tabs granted `Visible` on `Assessor_Base`.
- **FLS** — no new FLS. Existing INT-004 sharing (Medical_History__c Private OWD + Restriction Rule) is the load-bearing denial: even if a rogue related list or global search hit it, no rows return.
- **Cascading** — Regional_Ops_Manager_Base and Team_Manager_Base don't get the app in this intent. If they need it later, that's a permset edit, not a new app.

## Automation approach

Pure metadata — no Apex, no Flows. `CustomApplication` + `CustomTab` + `FlexiPage` + `ListView`.

## Integration (if any)

None.

## Alternatives considered

- **Standard-nav app instead of Console.** Rejected — intent explicitly names Service Console; assessors work multiple applications with sub-tabs, which console navigation handles natively.
- **Object-embedded list views only, no dedicated app.** Rejected — no app means no utility bar, no branding, and every user's default app menu leaks the objects to non-assessor personas.
- **Regional Queue list view via `OWNER.Region__c` filter.** Rejected — `OwnerId`'s user Region isn't indexable in list-view filters, and no `Region__c` exists on `Subsidy_Application__c` yet (that's INT-020's scope). Ship without the Regional Queue variant; note it as follow-on for INT-020.

## Neighboring & future scope

**BUILT ON (delivered):** INT-004 (PHI Restriction Rule — the denial guardrail), INT-005 (Assessor_Base permset — the app-visibility anchor), INT-009/010/011 (Assignment/Assessment record shapes surfaced on the record page).

**BUILDS ON THIS (forward cone):**
- **INT-008** — its subscriber Flow drives `Subsidy_Application__c.Status__c` transitions; landing INT-013 first means those transitions are *visible* on the record page and list views.
- **INT-014** — Determine Subsidy launcher wires into this app's utility bar (metadata edit to `Application_Review.app-meta.xml`, not a new app).
- **INT-012** — Escalate to Manager action likewise wires as a utility item.
- **INT-020** — adds `Region__c` to `Subsidy_Application__c`; Regional Queue list view lands as a metadata edit when it does.

**Utility bar shipped empty** (no `<utilityBar>` element) — both intended launchers belong to intents not yet delivered (INT-014 Determine Subsidy, INT-012 Escalate). A CustomApplication with no utility bar is valid metadata; INT-014/INT-012 add utility items when they deliver. Recorded as 📋 in the test script (C4, C5).

**PRESENT IN ORG:** Empty `applications/`, `tabs/`, `flexipages/` folders — no collision. Nothing to reuse; net-new metadata.

## Build sequence

Standard cascade — object metadata already present (from prior intents). This intent is metadata-only and deploys in one pass.

## Open design questions

_none_
