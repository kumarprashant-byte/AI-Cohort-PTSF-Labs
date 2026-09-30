# INT-017 — Deployment runbook

Metadata delivered: `Migration_Staging__c` canonical staging schema, `Contact.Origin_Office__c`, `Subsidy_Application__c.Origin_Office__c`. Everything below is external tooling or Setup.

## 1. Integration user
Setup → Users → New. License: Salesforce Integration. Assign a permission set granting Create/Read/Edit/Delete on `Migration_Staging__c` and Create/Edit on target objects (Contact, Subsidy_Application__c, Assessment__c). Log its OAuth Connected App credentials in secrets manager.

## 2. Per-TAMS-instance ETL adapters (30)
Author in MuleSoft (or Informatica). One adapter template per source schema variant:
- Source-shape → canonical mapping into Migration_Staging__c fields (Source_System__c, Source_Record_Id__c, Origin_Office__c, Target_Object__c, Payload_JSON__c raw source, Match_Score__c 0 for now — Salesforce computes on load).
- Filter: skip in-flight applications (Status != Closed) — guardrail 1.
- Bulk API 2.0 ingest job in batches of 10,000 rows.

## 3. Contact Duplicate Rule
Setup → Duplicate Rules → New on Contact.
- Match Rule: exact match on `LastName` + `Birthdate` + `Email` + `Region__c`.
- Actions on Create/Edit: Allow with Alert; Report duplicates.
- Rows scoring <95 → Apex trigger stamps `Load_Status__c = NeedsReview` on the staging row (defer to runbook — 30 lines of Apex on Migration_Staging__c after-insert).

## 4. Data Steward review queue
Setup → Queues → New. Members: PTSF Data Stewards. Assigned Objects: `Migration_Staging__c`. Ownership: Migration_Staging__c rows with `Load_Status__c = NeedsReview` re-owned to this queue on load.

## 5. Materialization Apex batch job
- `MigrationMaterializeBatch` — queryLocator on `Migration_Staging__c WHERE Load_Status__c = 'Loaded' AND Target_Object__c = :orderStep`.
- Ordered execution: Contact → Subsidy_Application__c → Assessment__c → ContentDocument.
- Schedule per region cutover.

## 6. Reconciliation reports
Report Builder against `Migration_Staging__c`:
- Rows by Source_System__c, grouped by Target_Object__c, Count.
- Materialized counts by Origin_Office__c on Contact / Subsidy_Application__c / Assessment__c.
Compare side-by-side per batch.

## 7. Pilot region gate
Run the smallest AMER office end-to-end. Acceptance: 100% count parity + <200 Data Steward review rows. Green-light region rollout only after Data Steward sign-off.
