---
id: INT-004
phase: 1
epic: E09
confidence: Confirmed
origin: scopezilla
title: PHI security foundation — Medical_History__c Private OWD, Restriction Rule, break-glass permission set
ratified: 2026-09-30 by Prashant Kumar @ 7a87f285c64b
---

# INT-004 — PHI security foundation — Medical_History__c Private OWD, Restriction Rule, break-glass permission set

## Outcome

Medical history is an isolated, encrypted, Restriction-Rule-protected object from day one. No internal profile — not even System Administrator with View All — can see a record without the break-glass permission set, and every break-glass grant is audited.

## Build target

- Medical_History__c custom object as child of Contact, OWD Private
- Restriction Rule on Medical_History__c blocking all internal profiles (Assessor, Team Manager, Regional Ops, System Administrator)
- 'PHI Emergency Access' permission set — Compliance-Officer-assigned only — granting the Restriction Rule exception
- Audit_Log__c custom object capturing every break-glass grant with reason — shared engagement-wide audit sink; downstream intents (INT-019 break-glass share writes, others) write to it
- Shield Platform Encryption applied per the classification matrix (deterministic on searchable fields, probabilistic on free-text)

## Guardrails

- Must not use standard sharing rules or role-hierarchy grants on Medical_History__c — the only permitted access channel is manual shares (owned by INT-019 once Assignment__c exists)
- Must not expose Medical_History__c through any report, list view, or related list on an internal profile
- Must not defer break-glass audit logging — the grant and the log write are the same transaction

## Out of scope

- Must not build the practitioner temporary-access mechanism — INT-019 owns Apex-managed sharing on Assignment__c
- Must not encrypt attachments (E10 migration will decide separately)

## Acceptance

A compliance-officer test: log in as a System Administrator with View All on Contact, open a patient record, try to reach Medical_History__c — no records visible, no error, no leak. Then flip on the 'PHI Emergency Access' permission set for the same user, retry, and the records become visible with an Audit_Log__c row written.

## Success criteria

_none_

## Dependencies

### Internal
- INT-005 — the Compliance Officer role/profile the 'PHI Emergency Access' permission set is assigned to sits in the regional user model

### External
_none_

## Open questions

- Q-004-1: where is the PHI classification matrix authored (Phase 0 discovery deliverable, or a separate compliance sign-off artifact)? Blocks the Shield encryption bullet's field-by-field call.

## Grounding

- decision: Private OWD Medical History with Apex-managed sharing (scopezilla/data/memory.json#decision_log)

### Carried (unmapped upstream fields)
- surface: security
