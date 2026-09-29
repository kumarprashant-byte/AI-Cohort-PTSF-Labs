# Engagement kickoff — PTSF Patient Travel Support

**Date:** 2026-09-29
**Source scoping project:** `C:/Users/kumar.prashant/scoping-projects/ptsf-lab`

## Context

PTSF (Patient Travel Support Foundation) subsidises travel for patients accessing specialist medical care across three regions (AMER, EMEA, APAC). Today, ~3,500 assessors work across 30 country offices on bespoke TAMS instances; the program processes ~1M applications/year for a 3.5M-patient base with ~4,000 external practitioners. The engagement moves the whole program onto a single Salesforce platform: Experience Cloud for patients and practitioners, Service Cloud for internal assessors, with region-scoped sharing, PHI protection via Apex-managed sharing on Medical_History__c, and a per-region migration off TAMS.

## Choice

- **Quantum Leap blueprint:** Custom
- **Clouds in scope:** Experience Cloud, Service Cloud
- **Target org:** `PTSF Build Sandbox` (sandbox; build_allowed = yes)
- **Phase plan:** 6 phases (Phase 0 discovery-deep + Phases 1–5 build) over 18 intents
- **Depth mode:** epic-level

## Consequences (cross-cutting commitments)

Locked during scoping — treat as constraints, do not re-litigate:

- Single global org for now (F1 strawman). The G0904 residency fork is treated as **resolved to global** for the Phase 1 build; if Phase 0 flips it, Phase 1 is re-scoped, not overlaid.
- Three regional AD federations (SAML/OIDC + JIT), Facebook Auth Provider for patients, self-registration-with-vetting for practitioners (subject to Q-003-1).
- Medical_History__c is a child of Contact with OWD Private; sharing is Apex-managed and lifecycle-bound to Assignment.Status; a Restriction Rule blocks every internal profile; break-glass runs through a Compliance-Officer-assigned permission set with mandatory Audit_Log__c writes.
- Shield Platform Encryption applies deterministically to searchable PHI fields, probabilistically to free-text.
- LDV baseline: skinny table + selective indexes on Subsidy_Application__c placeholder; Big Object archival design captured in the platform runbook.
- HIC integration is async: Platform Event → Queueable Apex → callback; SLA is best-effort with 24h retry, not sync.
- Practitioner auto-assignment is SOQL `DISTANCE()` + Scheduled Flow; 3-business-day accept-or-reassign SLA per Region Business Hours.
- Per-region cutover with 4-week dual-run; smallest region first (AMER pilot office).
