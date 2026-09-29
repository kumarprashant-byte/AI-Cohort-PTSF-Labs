# Phase 5 — Data Migration & Regional Cutover (PTSF Patient Travel Support)

> **Phase orchestration — what's in/out of phase, dependencies, starting state.** Read this first to orient. Per-capability buildable specs live in `11-intents-5.md` (when present) — that's what you actually build against, one intent at a time.
> Phase duration: **sequence only — no committed duration**.

## Intent

- **For:** The PTSF Data Migration team, Regional IT leads, and Ops Managers — the people who need 3.5M patients, 1M+ historical applications, and their assessments to leave the 30 bespoke TAMS instances and land in Salesforce, region by region, with reconciliation reports proving completeness.
- **Outcome:** Each region cuts over from TAMS to Salesforce with a 4-week dual-run tail: new applications flow to Salesforce; in-flight TAMS applications finish in TAMS; historical patients, applications, and assessments migrate cleanly with source-office attribution; TAMS becomes read-only per region as cutover completes.
- **Measured by:** - ETL adapter exists for every distinct TAMS shape (up to 30 instances).
- Dedup on (Family Name + DOB + Email + Region) produces a Contact-match list with a Data Steward review queue for <95% score candidates.
- Bulk API 2.0 loads in the correct order (Contact → Subsidy_Application__c historical → Assessment__c → attachments).
- Reconciliation reports show 100% count parity with the TAMS source per batch.
- Each region cuts over with a 4-week dual-run; TAMS goes read-only per region on plan.
- **Must not:** Migrate in-flight applications (they complete in TAMS by their own dynamic). Lose source-office attribution on any migrated row. Auto-merge two Contacts below the 95% match threshold. Cut over more than one region on the same weekend. Close the dual-run window before every in-flight TAMS application has completed.

## Pre-decided (do not re-litigate)
- ETL tool is MuleSoft or Informatica (Phase 0 chose which); adapter per TAMS instance.
- Canonical staging schema with source-office attribution on every row.
- Contact dedup on (Family Name + DOB + Email + Region) at 95% match threshold; near-matches go to a Data Steward review queue.
- Load order: Contact → Subsidy_Application__c (Status = Closed, historical) → Assessment__c → attachments (ContentDocument).
- Per-region cutover with 4-week dual-run; smallest region first (AMER pilot office).
- Post-cutover: TAMS read-only per region; reconciliation report signed by Regional Ops Manager.

## Starting state (from Assessor Review, Approval & Support)

You should find these already deployed in the sandbox:
- **Assessor Review, Approval & Support outcome:** Assessor works an application end-to-end in Service Console, sees no medical history, invokes the determination Flow, submits for approval where required, and approves. Chat is available on both surfaces with bot deflection. Regional Ops Manager sees a dashboard of cycle-time and SLA metrics.

## Plan-mode questions (resolve before switching to Build mode)
- **Q-017-1 (PDF assessments — OCR or as-is):** are PDF-only historical assessments OCR'd (text-searchable) or migrated as-is as attachments? OCR effort is material.
- **Data quality profiling (G1001):** what does profiling of 2-3 sample TAMS instances show in terms of null rates, format drift, duplicate density? Migration effort scales with this.
- **Office-specific customization (G1002):** how much per-office custom logic exists in TAMS that must be reproduced or explicitly deprecated?
- **Cutover order:** which region first? Smallest is the strawman; Ops confirms.
- **In-flight cutoff:** what defines "in-flight" — Status < Approved / not yet paid / age less than N days?

## Build-mode questions (ask only if the situation arises)
- If a source row fails schema mapping mid-batch, does the batch continue and log the failure or halt?
- If reconciliation shows a 0.1% count mismatch, does the batch commit or roll back?
- Does the Data Steward review queue block the load, or can it run alongside?

## Epics in scope for this phase

The phase brief is authoritative. Epics below are listed for cross-reference only — when an automation cites `(E04)`, this is what it refers to. For deeper epic narrative, see `90-epics-context.md`.

- **E10: Data Migration from TAMS** — Migrate patients, historical subsidy applications, and assessments from 30 satellite-office TAMS instances. Dedup across offices. In-flight applications remain in TAMS to complete (~1 month). Cutover strategy: dual-run vs. big-bang per region.

## Build targets — orchestration summary

These sections orient the build agent on the shape of the phase. Per-capability buildable detail (Outcome, Build target, Guardrails, Out of scope, Acceptance, Open questions) lives in `11-intents-5.md` per intent. When a section below cites `INT-NNN`, look up the intent there.

### Data model
- **No new custom objects** — this phase writes to the Phase 1-4 model.
- **Source_Office__c** added to Contact, Subsidy_Application__c, Assessment__c as an audit column.
- **Migration_Batch__c** (custom, ops-only): Batch_ID, Region, Started_At, Completed_At, Row_Count_Source, Row_Count_Loaded, Reconciliation_Status.
- Big Object archival plan: applications closed >3 years archive to a `Historical_Application__b`.

### Automation
- ETL pipelines outside Salesforce (MuleSoft/Informatica) — extraction, canonicalization, dedup, load orchestration.
- Bulk API 2.0 load jobs per phase per region.
- Reconciliation Apex batch: computes row counts + checksums per Migration_Batch__c and writes results.
- Data Steward review Flow: presents near-match Contact pairs, lets a Steward merge or mark distinct; runs asynchronously to the main load.

### UI & navigation
- Data Steward review console: near-match Contact pairs with confidence score, side-by-side compare, Merge / Keep Distinct / Escalate actions.
- Migration Ops dashboard: batches in flight, reconciliation status, blocked items.
- No new patient/practitioner/assessor UI in this phase.

### Security & access
- Migration users have a dedicated profile with elevated Bulk API access, restricted from Medical_History__c edits (INT-004's Restriction Rule still enforces).
- Source_Office__c is not exposed on internal read profiles by default (audit-only).

### Reports & dashboards
- Migration Ops: batches in progress, reconciliation status, error counts.
- Regional Ops: dual-run parity report (new applications in Salesforce vs. TAMS by day).
- Sign-off report: reconciliation summary per region for Regional Ops Manager sign-off.

### Sample data
- Two sample TAMS extracts (smallest AMER office) — anonymized, ~12,000 Contacts, ~40,000 applications, ~90,000 assessments.
- One canned near-match Contact pair set (~150 candidates) to demonstrate the Data Steward flow.

### Data sources

- **TAMS (30 bespoke instances)** — per-instance adapter; schema inventory + read access per instance; PDF export path for attachments. Owner: PTSF IT + regional office leads.
- **Data Steward manual review queue** — human-in-the-loop for near-matches.

## Acceptance — user-outcome checks (phase-level)

Phase-level user-outcome claims a stakeholder would walk through to feel "Phase 5 is done." Run them in conversation with the user; mark `- [x]` only when the user agrees. Per-intent acceptance walkthroughs live in `11-intents-5.md`.

- [ ] AMER-pilot region: ETL loads 12,000 Contacts, 40,000 historical applications, 90,000 assessments; reconciliation report shows 100% count parity.
- [ ] The Data Steward queue surfaces <200 near-match candidates; a Steward resolves them via the review console.
- [ ] AMER-pilot cuts over Friday night; Monday, new applications flow into Salesforce; the last in-flight TAMS application closes on day 24.
- [ ] Day 29: TAMS-AMER is set read-only; the Regional Ops Manager signs the reconciliation report.
- [ ] A historical migrated application on a Salesforce Contact is visible with Source_Office__c populated; attachments open.
- [ ] The Restriction Rule from Phase 1 still blocks internal users from Medical_History__c after migration.

## Acceptance — metadata-shaped checks (phase-level)

Phase-level metadata-shaped checks — queries the build agent runs against the target org without human help. Run via the Metadata skill (describe / tooling / SOQL). Per-intent acceptance is in `11-intents-5.md`.

- Migration_Batch__c records exist per completed batch with reconciliation counts.
- Source_Office__c populated on every migrated Contact, Subsidy_Application__c, Assessment__c.
- No Medical_History__c row is visible to any internal profile after migration.
- Bulk API 2.0 job history shows the correct load order per region.
- Historical_Application__b Big Object is defined (records not yet loaded — archive runs on a schedule post-cutover).

## Out of scope for Phase 5

If you find yourself needing to build any of these, stop and surface it — it belongs to a later phase or is explicitly excluded.

_(none surfaced in gaps.json — confirm with user during plan-mode review)_

## Dependencies and risks

**Dependencies:** Phase 4 (target system fully functional).

**Risks:** Dedup across offices is the single biggest data-quality risk. PDF-only historical assessments may need OCR to be searchable — decide early. Cutover sequence (which region first, dual-run duration) needs stakeholder sign-off per region.

## Story citations covered in this phase

_(no user-story backlog captured for this phase)_

## Recipe boundary

When this phase is accepted, ask the user: *"Save this run as a recipe so we can repeat for Phase —?"* The recipe should capture: the data-model decisions made above, the naming patterns confirmed in `03-glossary-and-naming.md`, and any Build-mode question resolutions that emerged.
