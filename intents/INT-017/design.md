---
intent: INT-017
scope_hash: 5f97a829effe
authored: 2026-09-30
---

# INT-017 — Design

**Intent:** TAMS-to-Salesforce data migration ETL and dedup
**Source intent:** `intents/INT-017/intent.md`

## Data model
- `Migration_Staging__c` — Private OWD; canonical landing zone for every TAMS-instance ETL. Fields: `Source_System__c` (TAMS instance id), `Source_Record_Id__c` (external id), `Origin_Office__c` (guardrail 2: office attribution on every row), `Target_Object__c` (Contact / Subsidy_Application__c / Assessment__c / ContentDocument), `Payload_JSON__c` (raw source shape, 128k), `Load_Status__c` (Pending / Loaded / NeedsReview / Failed), `Match_Score__c` (0-100 dedup confidence).
- `Contact.Origin_Office__c`, `Subsidy_Application__c.Origin_Office__c` — carry the attribution through onto the final materialized rows.

## Sharing & security
- Staging is Private — the ETL user (bulk-loader integration user) owns everything it inserts; Data Stewards get Read/Edit via a permission set (deferred to runbook — needs the real integration user identity).

## Automation approach
- **Bulk API 2.0 batching** — ETL loads Migration_Staging__c in phased batches by region; a scheduled Apex batch job (deferred to runbook) materializes Loaded rows into target objects in the acceptance order: Contact → Subsidy_Application__c → Assessment__c → ContentDocument.
- **Dedup** — Duplicate Rule on Contact (Family Name + DOB + Email + Region) is standard Salesforce Duplicate Management (deferred to runbook — needs Contact record type + Region field wired from INT-002/INT-003 which are delivered). Match Score <95 sets `Load_Status__c = NeedsReview` and lands in the Data Steward queue list view.
- **Reconciliation reports** — the enable-reports flag on Migration_Staging__c lets admins build source-vs-target count + checksum reports per batch; these are Report-Builder click-through (deferred to runbook).

## Integration
- Per-TAMS-instance adapters — MuleSoft or Informatica; 30 instances, one adapter template. Named Credentials + connection details deferred to runbook.

## Alternatives considered
- **Direct load into Contact/etc without staging** — rejected; staging gives us idempotent retry, Data Steward review, and reconciliation reports we couldn't get from direct Bulk API errors alone.
- **Salesforce Data Loader instead of Bulk API 2.0** — rejected for volume (12k Contacts × 30 offices, 90k assessments per office minimum).

## Neighboring & future scope
- **Built on:** INT-002 (`Contact.Region__c` from SAML JIT is a dedup key); INT-003 (Contact record types drive dedup partitioning — Patient vs Practitioner never merge).
- **Existing org:** clean greenfield add; no collision.

## Open design questions
- Q-017-1: PDF OCR vs raw attachment — deferred to Program Sponsor; doesn't block staging schema.
