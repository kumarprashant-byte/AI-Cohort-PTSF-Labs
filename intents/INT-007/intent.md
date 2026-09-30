---
id: INT-007
phase: 2
epic: E03
confidence: Confirmed
origin: scopezilla
title: Health Insurance Checker async integration pattern (Platform Event → Queueable → callback)
ratified: 2026-09-30 by Prashant Kumar @ e0f63f2a5954
---

# INT-007 — Health Insurance Checker async integration pattern (Platform Event → Queueable → callback)

## Outcome

Every HIC call — onboarding prefill and application entitlement check — runs asynchronously with retry, idempotency, and a hourly Scheduled Flow fallback, so a 15-second peak never blocks a user.

## Build target

- Platform Event `HIC_Prefill_Requested__e` and `HIC_Entitlement_Requested__e`
- Queueable Apex `HICQueueable` calling HIC via Named Credential, 20s callout timeout, exponential backoff up to 3 attempts
- HIC_Check__c custom object linked to the source record (Onboarding__c or Subsidy_Application__c)
- Completion Platform Events (`HIC_Prefill_Completed__e`, `HIC_Entitlement_Completed__e`) with the result payload
- Scheduled Flow retrying HIC_Check__c rows in 'pending' state hourly for 24 hours
- Idempotency key `SHA(record_id, submitted_at)` on every request

## Guardrails

- Must not call HIC synchronously from a Flow, LWC, or trigger — every call goes through the Queueable
- Must not exceed 3 retry attempts before deferring to the Scheduled Flow
- Must not create duplicate HIC_Check__c rows for the same idempotency key

## Out of scope

- Must not decide the business rules for auto-reject (INT-008 owns the Flow that acts on the completion event)

## Acceptance

A Subsidy Application is submitted with a mock HIC that takes 14 seconds; the user sees 'pending' in the wizard and can navigate away. Fourteen seconds later, HIC_Check__c is populated with the result, the completion event fires, and the application status advances. A second submission with the same idempotency key does not create a second HIC_Check__c row.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
- Health Insurance Checker (HIC) API | Named Credential endpoint, contract SLA (p50/p99), payload schema | owner: PTSF IT + HIC vendor

## Open questions

- Q-007-1: What is the exact HIC request/response payload schema and rate-limit contract? (Resolver: PTSF IT + HIC vendor) — UNANSWERED

## Grounding

### Carried (unmapped upstream fields)
- surface: integration
