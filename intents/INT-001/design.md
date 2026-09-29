---
intent: INT-001
scope_hash: 268745afcc83
authored: 2026-09-29
---

# INT-001 — Design

**Intent:** Provision capstone org and DevOps pipeline
**Source intent:** `intents/INT-001/intent.md`

## Data model

Nothing custom in this intent. Base metadata only:

- Profiles retrieved from the org and versioned in `force-app/main/default/profiles/`.
- Permission sets scaffolded empty for the intents that populate them (INT-004 'PHI Emergency Access', INT-019 'Practitioner Medical History Read', INT-005 Profile × Region PSGs).
- Custom Settings: `Deploy_Environment__c` (List) — one row per deploy target for the ledger's environment awareness. Namespace-safe.
- `BusinessHours` records: `APAC_Support`, `EMEA_Support`, `AMER_Support` — Mon–Fri 09:00–17:00 in each region's canonical timezone (Asia/Sydney, Europe/London, America/New_York). Local holiday sets to be layered via a separate `Holiday` deploy per region.

## Sharing & security

Not this intent. INT-004 owns PHI security; INT-005 owns the role hierarchy and PSGs; INT-020 owns regional OWD on subsidy/assignment/assessment. This intent stays out of the sharing model deliberately.

## Automation approach

None custom. CI/CD is GitHub-native:

- `feature/*` push → `.github/workflows/feature-ci.yml` runs `sf project deploy validate --check-only` against the capstone org.
- PR into `develop` → `.github/workflows/develop-ci.yml` deploys to the capstone org (single-org capstone: no separate integration tenant).
- Push to `main` → tagged release + no-op deploy (single-org still points at `ptsf-lab`).

Declarative-first holds: no Apex triggers, no Flows in this intent.

## Integration (if any)

None. External dependency on Salesforce Licensing captured in the intent's `## Dependencies` — the orgfarm lab suffices for the capstone.

## Alternatives considered

- **Multi-tenant provisioning** (Prod + Full/Partial/Developer Pro sandboxes): rejected — the orgfarm lab is the only tenant available; a real licensed engagement's provisioning is a different design. Captured as an out-of-scope in the intent.
- **CircleCI / Jenkins CI**: rejected — GitHub Actions is native to the plugin's `feature-ci_*.yml` scaffold; introducing a second CI system buys no trust.
- **Metadata deploy via unlocked package**: rejected for the capstone — package version overhead outweighs the single-org benefit at this scale; revisit at a multi-tenant engagement.

## LDV baseline (the design-record deliverable this intent defers to)

INT-001's build target says "LDV baseline is captured as a design record — no metadata is deployed for this bullet". This section is that record.

**Expected volumes at steady state** (from Phase 0 discovery, order-of-magnitude):

- `Subsidy_Application__c`: ~500,000 rows/year × 5 years retention → ~2.5M row selective-query surface.
- `Assignment__c`: ~500,000/year × 1.2 (reassignments) → ~3M rows over 5 years.
- `Medical_History__c`: ~2M rows (multiple per patient over time).

**Proposed skinny-table + selective-index approach** (design only — not deployable on the capstone org):

- Selective indexes on `Subsidy_Application__c.Status`, `Subsidy_Application__c.Region__c`, `Subsidy_Application__c.Created_Date`. Combined index (Status + Region) supports the "APAC Assessor's open applications" list view (INT-020).
- Skinny table request (Salesforce Support case): `Subsidy_Application__c` skinny with (`Status`, `Region__c`, `OwnerId`, `Created_Date`, `Contact__c`) — supports the most-hit list views without a full-table scan.
- **Blocker:** a Support case for a skinny table requires a real licensed production tenant. The capstone org can't file it. Ship the selective indexes; defer the skinny table until a licensed tenant exists.

**Big Object archival** (design only):

- `Subsidy_Application_Archive__b` Big Object mirroring `Subsidy_Application__c` closed statuses (Approved / Rejected).
- Index: `(Region__c, Created_Date)` — supports "closed cases in APAC in 2025".
- Async SOQL for reporting; retention pushes rows out at year+5.
- **Blocker:** Big Object backfill for ~2.5M rows requires Salesforce data-migration engagement — deferred to production.

## Architecture conformance

Not applicable — this engagement is not grounded/ARB-governed. `scopezilla/decisions/` carries no inherited premises. Section omitted per skill guidance.

## Neighboring & future scope

This intent is the foundation — every downstream intent depends on the capstone org existing and CI/CD working. Key ripple:

- `BusinessHours` records here are consumed by **INT-010** (3-business-day SLA) and possibly INT-014 (assessment SLA if defined). This settles **INT-001's Q-001**: the SLA-math consumer is INT-010. Recommend routing to `/ql-refine-intent INT-001` to answer Q-001 in-place; the answer is now known.
- The LDV design defers to a real production tenant. INT-008's build target already references this design record — the cross-link is coherent.
- **Existing org (brownfield):** greenfield orgfarm lab. Nothing pre-exists to consult. `⚠ org not consulted` for the classic sense of the check; the capstone acts as its own greenfield.

## Build sequence

Standard cascade holds (base metadata → BusinessHours → CI/CD wiring → smoke deploy). No non-obvious ordering. Section can be omitted.

## Open design questions

- Q-design-001-1: **Big Object partition key** — `(Region__c, Created_Date)` as proposed, or `(OwnerId, Created_Date)` to align with the practitioner-view reporting cone? (Non-blocking here — Big Object is deferred, but the choice shapes the archival query surface for future INT-021+ reporting.)
- Q-design-001-2: **Deploy runbook seed** — should the three BusinessHours records be part of the metadata deploy (as `.businessProcesses` XML) or a runbook data-load step? Recommend metadata for reproducibility; flag for confirmation.
