---
id: INT-017
phase: 5
epic: E10
confidence: Confirmed
origin: scopezilla
title: TAMS-to-Salesforce data migration ETL and dedup
---

# INT-017 — TAMS-to-Salesforce data migration ETL and dedup

## Outcome

The historical patient, application, and assessment data from 30 bespoke TAMS instances lands in Salesforce, deduplicated and with attribution back to source office.

## Build target

- Per-TAMS-instance ETL adapter (MuleSoft or Informatica) mapping the source shape to a canonical staging model
- Canonical staging schema with source-office attribution on every row
- Contact dedup on (Family Name + DOB + Email + Region) with a Data Steward review queue for near-matches (<95% score)
- Bulk API 2.0 load in phased batches by region, in this order: Contact → Subsidy_Application__c (historical, Status=Closed) → Assessment__c → attachments (PDFs as ContentDocument)
- Reconciliation reports (row counts + checksums) per batch

## Guardrails

- Must not migrate in-flight applications — they finish in TAMS by their own dynamic
- Must not lose source-office attribution — every migrated row carries Origin_Office__c
- Must not merge two Contacts automatically below the 95% match threshold — humans review

## Out of scope

- Must not migrate audit history (out of scope for this program)

## Acceptance

For a pilot region (smallest AMER office), the ETL loads 12,000 Contacts, 40,000 historical applications, and 90,000 assessments; reconciliation reports show 100% count parity with the TAMS source, and the Data Steward queue contains fewer than 200 near-match candidates to review.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
- TAMS (30 bespoke instances) | Schema inventory + read access per instance + PDF export path | owner: PTSF IT + regional office leads

## Open questions

- Q-017-1: Are PDF-only historical assessments OCR'd (text-searchable) or migrated as-is attachments? (Resolver: PTSF Program Sponsor) — UNANSWERED

## Grounding

### Carried (unmapped upstream fields)
- surface: integration
