# Intent Statements — Phase 5 (PTSF Patient Travel Support)

> Reference role: the **load-bearing build target** for Phase 5. Each intent below is one capability — one firing trigger or user action, one outcome, one walkthrough. Build one at a time. The phase brief (`10-phase-5.md`) is orchestration; this file is what to build.
>
> **For architects:** walk these with the customer to assign priority and answer open questions. Edit `data/intents.json` (canonical) or this file directly — the next quantum-leap run re-renders from JSON.

## INT-017 — TAMS-to-Salesforce data migration ETL and dedup

epic `E10` · priority _(unassigned)_ · confidence _Confirmed_ · surface `integration`

### 1. Outcome

The historical patient, application, and assessment data from 30 bespoke TAMS instances lands in Salesforce, deduplicated and with attribution back to source office.

### 2. Build target

- Per-TAMS-instance ETL adapter (MuleSoft or Informatica) mapping the source shape to a canonical staging model
- Canonical staging schema with source-office attribution on every row
- Contact dedup on (Family Name + DOB + Email + Region) with a Data Steward review queue for near-matches (<95% score)
- Bulk API 2.0 load in phased batches by region, in this order: Contact → Subsidy_Application__c (historical, Status=Closed) → Assessment__c → attachments (PDFs as ContentDocument)
- Reconciliation reports (row counts + checksums) per batch

### 3. Guardrails

- Must not migrate in-flight applications — they finish in TAMS by their own dynamic
- Must not lose source-office attribution — every migrated row carries Origin_Office__c
- Must not merge two Contacts automatically below the 95% match threshold — humans review

### 4. Out of scope

- Must not migrate audit history (out of scope for this program)

### 5. Acceptance

For a pilot region (smallest AMER office), the ETL loads 12,000 Contacts, 40,000 historical applications, and 90,000 assessments; reconciliation reports show 100% count parity with the TAMS source, and the Data Steward queue contains fewer than 200 near-match candidates to review.

### 6. Dependencies

- **External:** TAMS (30 bespoke instances) — Schema inventory + read access per instance + PDF export path _(owner: PTSF IT + regional office leads)_

### Open questions

- [ ] **Q-017-1** — Are PDF-only historical assessments OCR'd (text-searchable) or migrated as-is attachments? (Resolver: PTSF Program Sponsor)

---

## INT-018 — Per-region cutover with 4-week dual-run

epic `E10` · priority _(unassigned)_ · confidence _Confirmed_ · surface `devops`

### 1. Outcome

Each region cuts over from TAMS to Salesforce with a 4-week dual-run tail so in-flight work completes without disruption, then TAMS goes read-only.

### 2. Build target

- Cutover runbook per region (smallest region first, then next-largest, then largest)
- Freeze window for TAMS new-application intake during the migration batch
- 4-week dual-run window: new applications go to Salesforce, in-flight TAMS applications stay in TAMS and finish there
- Post-cutover: TAMS becomes read-only per region; reconciliation report signed off by Regional Ops Manager
- Rollback plan documented (fail fast in the first 48 hours)

### 3. Guardrails

- Must not cut over more than one region on the same weekend
- Must not close the dual-run window before every in-flight TAMS application has completed

### 4. Out of scope

- Must not decommission TAMS hardware (PTSF IT owns that after read-only cutover)

### 5. Acceptance

AMER-pilot region cuts over on a Friday night; Monday morning, new applications flow into Salesforce; the last in-flight TAMS application closes on day 24; on day 29 TAMS-AMER is set read-only and the Regional Ops Manager signs the reconciliation report.

### 6. Dependencies

- **Internal (build first):** INT-017

### Open questions

_(no open questions captured)_

