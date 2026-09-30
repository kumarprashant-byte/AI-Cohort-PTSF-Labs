# INT-018 — Per-region cutover runbook

Pure process. Executes after INT-017 (ETL) and every phase-1-4 intent is delivered and signed.

## Region sequence (guardrail 1 — one region per weekend)
1. **AMER-pilot** (smallest AMER office) — week 1.
2. **AMER-remainder** — week 3.
3. **EMEA** — week 5.
4. **APAC** — week 7.

## Per-region timeline

### T-14: Readiness gate
- All phase-1-4 intents ✅ Delivered and signed.
- INT-017 ETL rehearsed against a full-region extract in staging; reconciliation report clean.
- Regional Ops Manager confirms user accounts (INT-002 JIT + INT-020 role assignment) ready.

### T-1: Freeze
- Friday 18:00 local: PTSF IT sets TAMS-<region> to no-new-applications mode.
- Communications: patient-facing banner "system upgrade this weekend — service resumes Monday".

### T-0: Cutover weekend
- Saturday 00:00 UTC: final delta ETL from TAMS-<region>.
- Saturday 12:00 UTC: reconciliation report; sign off before proceeding.
- Sunday 12:00 UTC: production Salesforce region live for new applications.

### T+1 → T+28: Dual-run
- New applications: Salesforce only.
- In-flight applications: complete in TAMS-<region>; no new work added there.
- Daily reconciliation: TAMS closure count vs Salesforce new count.

### T+28 gate (guardrail 2 — never close early)
- Query TAMS for open applications. If any remain, extend window one week and re-check.
- Only when 0 open: set TAMS-<region> to read-only; archive.
- Regional Ops Manager signs the reconciliation report.

## Rollback plan (fail-fast — first 48 hours)
Trigger: >5% error rate on Salesforce writes, or a data-loss finding in reconciliation.
1. Re-enable TAMS-<region> for new applications.
2. Redirect portal DNS back to TAMS.
3. Pause Salesforce write path via a global feature flag (custom setting `Cutover_Live__c = false`).
4. Root cause; retry cutover the following weekend at earliest, respecting guardrail 1.

## Sign-off ledger
Per region: Regional Ops Manager + PTSF Program Sponsor + Delivery Lead. Attach the signed reconciliation report to this file's git history via a follow-on commit.
