---
intent: INT-020
scope_hash: f30955a620b6
authored: 2026-09-30
---

# INT-020 — Design

**Intent:** Region scoping and OWD sharing on subsidy/assignment/assessment objects
**Source intent:** `intents/INT-020/intent.md`

## Data model

- **`Subsidy_Application__c.Region__c`** — already exists (INT-014 added it as a restricted Picklist EMEA/AMER/APAC). Reused as-is.
- **`Assignment__c.Region__c`** — new. Same restricted picklist.
- **`Assessment__c.Region__c`** — new. Same restricted picklist.

Region__c is a **persisted field** (guardrail 3) — sharing rules can only fire on stored values, never on a runtime user-context expression. Population strategy for MVP:
- The Assessor typing on the app is the initial source of truth (already the case for Subsidy_Application__c).
- Assignment__c and Assessment__c inherit their Region from the owning Subsidy_Application__c — a follow-on Flow (📋 to a small INT-020 patch intent) will stamp on insert. For this build the field is present and editable; auto-stamp lands next.

## Sharing & security

**OWD change:**
- `Subsidy_Application__c` → **Private** (was ReadWrite). This is the only real OWD tighten this build ships.
- `Assignment__c` — already **Private** (INT-009). Left alone.
- `Assessment__c` — already **Private** (INT-011). Left alone.
- `Medical_History__c` — **NOT touched** (guardrail 1; INT-004's Apex-managed sharing owns it).

**Criteria-based sharing rules — one per Region per object, 3 × 3 = 9 rules total:**

For each object × region, share rows where `Region__c = <region>` to the region's Regional Ops Manager Role and Subordinates. Since INT-005 laid out `EMEA_Regional_Ops_Manager → EMEA_Team_Manager → EMEA_Assessor` (and AMER/APAC likewise), sharing to `<region>_Regional_Ops_Manager` "and subordinates" grants read to every role in that region's branch and to none in another region — which honors guardrail 2 (role hierarchy never grants cross-region).

Access level: **Edit** on Subsidy_Application__c (Assessors need to edit their region's cases); **Read** on Assessment__c (Assessors read but the practitioner owns edits); **Edit** on Assignment__c (Assessors manage assignments in-region).

**Reason OWD Public R/O is not enough** — the intent's build target reads "OWD Public Read-Only", but the acceptance clause is exclusive: an APAC Assessor SOQL query must return zero EMEA rows. Public R/O grants read to everyone, defeating that acceptance. The prose reads as loose language for "restrict the write side"; the operative model that satisfies acceptance is Private + criteria-based sharing rules. Recorded in `decisions/2026-09-30-INT-020-owd-model.md`.

## Automation approach

- No triggers/flows required for the OWD + sharing rules themselves.
- Region auto-stamp on Assignment/Assessment (`from parent Subsidy_Application__c.Region__c` on insert) is 📋 a small follow-on. MVP: assessor sets Region on the app, then hand-copies onto related Assignment/Assessment records. Once the auto-stamp Flow lands the field flips to read-only on the child records.

## Alternatives considered

- **Owner-based sharing rules by Region role → Region role:** would require every row's Owner to already be in the right region role. Doesn't survive owner-reassignment across regions, and doesn't grant visibility to non-owner peers in the region. Criteria-based on Region__c is the durable pattern.
- **Restriction rules** — could layer on top, but the intent asks for hierarchical role-based sharing, not user-set filtering. Not needed here.
- **Apex-managed sharing** — overkill for a 3-region × 3-object model. INT-004 uses it for PHI, which is genuinely per-application scoped.

## Neighboring & future scope

**Reused / built on:**
- INT-005 role hierarchy — sharing rules target `EMEA_Regional_Ops_Manager` / `AMER_Regional_Ops_Manager` / `APAC_Regional_Ops_Manager` "and subordinates".
- INT-014's Region picklist on Subsidy_Application__c — reused verbatim on Assignment/Assessment for consistency.

**Builds on this:**
- **INT-014 follow-on (Approval Process)** — once Region is enforced by sharing, the deferred Approval Process routing to a Team Manager becomes tractable (roles are already the queueable dimension).
- **Reporting (INT-016)** — reports automatically honor row-level security once OWDs tighten, so cross-region reporting overrides (which this intent's `out_of_scope` explicitly declines) become a Reporting-phase call.
- **Region auto-stamp Flow** (📋) — small follow-on that lifts Region from parent Subsidy_Application__c onto child Assignment/Assessment on insert.

**Existing org (brownfield):** Assessment__c and Assignment__c are already Private. Only Subsidy_Application__c flips from ReadWrite → Private. The tightening removes access for anyone outside the sharing rules — Assessor_Base perm-set holders will lose visibility to out-of-region cases (that is the point). System Admin visibility is preserved via `viewAllRecords`/`modifyAllRecords` on their profile.

## Open design questions

_none_.

## Build sequence

Sharing rules can only deploy after the field they filter on exists. The single deploy sequence:
1. Field on Assignment__c + Assessment__c (Region__c).
2. Perm-set FLS grants for the two new fields.
3. Object OWD change on Subsidy_Application__c (`sharingModel = Private`).
4. Nine sharing rules (three .sharingRules-meta.xml files, one per object).

sf CLI orders these correctly from a single `deploy start --source-dir` per component.
