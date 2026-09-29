---
id: INT-004
phase: 1
epic: E09
confidence: Confirmed
origin: scopezilla
title: PHI security model — Medical_History__c Private OWD + Apex-managed sharing + Restriction Rules
---

# INT-004 — PHI security model — Medical_History__c Private OWD + Apex-managed sharing + Restriction Rules

## Outcome

Practitioners see a patient's medical history only during an open assessment; internal PTSF staff never see it, verified by a Restriction Rule that even View All can't bypass.

## Build target

- Medical_History__c custom object as child of Contact, OWD Private
- Apex trigger on Assignment__c: on Status → Accepted, insert Medical_History__Share rows granting Read to the Practitioner User; on Status → Completed/Declined/Reassigned, delete those manual shares
- Restriction Rule on Medical_History__c blocking all internal profiles (Assessor, Team Manager, Regional Ops, System Administrator)
- 'PHI Emergency Access' permission set — Compliance-Officer-assigned only — granting the Restriction Rule exception
- Audit_Log__c custom object capturing every break-glass grant with reason
- Shield Platform Encryption applied per the classification matrix (deterministic on searchable fields, probabilistic on free-text)

## Guardrails

- Must not use standard sharing rules or role-hierarchy grants on Medical_History__c — only manual shares via the trigger
- Must not expose Medical_History__c through any report, list view, or related list on an internal profile
- Must not defer break-glass audit logging — the grant and the log write are the same transaction

## Out of scope

- Must not encrypt attachments (E10 migration will decide separately)

## Acceptance

A compliance-officer test: log in as a System Administrator with View All on Contact, open a patient record, try to reach Medical_History__c — no records visible, no error, no leak. Then a practitioner-side test: an Assignment moves to Accepted; the practitioner sees the patient's Medical_History__c rows on the assignment record. Move the Assignment to Completed; the practitioner refreshes and the records are gone.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
_none_

## Open questions

_none_

## Grounding

- decision: Private OWD Medical History with Apex-managed sharing (scopezilla/data/memory.json#decision_log)

### Carried (unmapped upstream fields)
- surface: security
