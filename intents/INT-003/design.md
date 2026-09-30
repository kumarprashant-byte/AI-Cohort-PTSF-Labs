---
intent: INT-003
scope_hash: 52afeb7e32a8
authored: 2026-09-30
---

# INT-003 — Design

## Data model
Two Contact `RecordType`s: `Patient`, `Practitioner`. Guardrail 1 (no merge) is enforced by keeping RecordType distinct — Salesforce's built-in duplicate/merge rules honor RecordType boundaries when configured, and admin merges refuse across RecordType by default. `Contact.Practitioner_Vetting_Status__c` (Pending/Approved/Rejected) gates the Community license grant (guardrail 2).

## Sharing & security
Patient RecordType assigned to the Patient Portal Experience Cloud site profile; Practitioner RecordType assigned to the Practitioner Community. Community license provisioning is triggered manually (or by a follow-on Flow) only when Vetting_Status transitions to Approved.

## Automation approach
Declarative. RecordType + picklist ships in metadata. Vetting queue is a standard List View on Contact filtered `Practitioner_Vetting_Status__c = Pending`; admin approves inline.

## Integration
Facebook Auth Provider — requires a real Facebook Developer App (client ID + secret). Config lives in Setup, not in metadata; documented in runbook.

## Alternatives considered
- **Single RecordType with a checkbox** — rejected; RecordType is the platform-native way to prevent cross-role merges without custom code.
- **Passwordless auth** — explicit `out_of_scope`.

## Neighboring & future scope
- Built on: none.
- Builds on this: INT-006 (patient onboarding wizard reads Contact.RecordType); INT-009 (practitioner geolocation-based assignment reads Practitioner RecordType).
- Existing org: Contact object has no RecordTypes yet — greenfield.

## Open design questions
_none_
