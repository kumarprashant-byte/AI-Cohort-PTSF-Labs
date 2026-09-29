---
intent: INT-007
phase: 2
proof_hash: 7c94e2fe5be8
authored: 2026-09-29
---

# INT-007 — Test script

**Intent:** Health Insurance Checker async integration pattern (Platform Event → Queueable → callback)
**Phase:** 2 · **Source intent:** `intents/INT-007/intent.md` · **Design:** `intents/INT-007/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-007-C1 | Producer never calls HIC directly — every path goes through the Queueable (guardrail 1) | `HICQueueableTest.publishingEventEnqueuesQueueable` — publish the event, assert no HTTP was fired synchronously and a `HIC_Check__c` row was created in `Pending`/`In Progress` | ✅ | (CI) |
| INT-007-C2 | Queueable calls HIC via Named Credential, 20s timeout, JSON POST (build target) | `HICCalloutClientTest.buildsRequestWithNamedCredentialAndTimeout` — stubs `HttpCalloutMock`, asserts endpoint starts `callout:PTSF_HIC`, method=POST, timeout=20000 | ✅ | (CI) |
| INT-007-C3 | Exponential backoff up to 3 attempts, then row goes to `Deferred` (build target + guardrail 2) | `HICQueueableTest.retriesUpToThreeThenDefers` — mock returns failure; assert Attempt_Count reaches 3, Status flips to `Deferred`, Next_Attempt_At set | ✅ | (CI) |
| INT-007-C4 | Duplicate request with the same idempotency key does not create a second row (guardrail 3 + acceptance line 3) | `HICQueueableTest.duplicateIdempotencyKeyDoesNotDoubleInsert` — publish two events with the same (source_record_id, submitted_at); assert exactly one `HIC_Check__c` row | ✅ | (CI) |
| INT-007-C5 | On success, completion Platform Event fires with the response payload (acceptance line 2) | `HICQueueableTest.successPublishesCompletionEvent` — subscribe via `Test.getEventBus().deliver()`; assert `HIC_Prefill_Completed__e` published with Status=Success and Response_JSON = mock body | ✅ | (CI) |
| INT-007-C6 | Scheduled Flow (`HICRetrySchedulable`) picks up `Deferred` rows whose Next_Attempt_At has passed and re-enqueues (build target: hourly for 24h) | `HICRetrySchedulableTest.deferredRowIsRequeuedWhenDue` — seed a Deferred row with Next_Attempt_At in the past; run the schedulable in `Test.startTest()`; assert Attempt_Count advanced | ✅ | (CI) |
| INT-007-C7 | Rows older than 24 hours are NOT retried (build target: "hourly for 24 hours") | `HICRetrySchedulableTest.rowsOlderThan24HoursAreIgnored` — insert a row with CreatedDate manipulated via `Test.setCreatedDate`; assert schedulable skips it | ✅ | (CI) |
| INT-007-C8 | Named Credential `PTSF_HIC` is present in metadata (structural) | org-probe: `named-credential-exists(PTSF_HIC)` | ✅ | (verify) |
| INT-007-C9 | Concrete vendor payload mapping (request builder + response parser onto `Subsidy_Application__c`) | Deferred — `decisions/2026-09-29-INT-007-hic-payload-deferred.md` (follow-on when Q-007-1 lands) | 📋 accepted by (pending Trusted Guide) — decisions/2026-09-29-INT-007-hic-payload-deferred.md | _pending accepter_ |

## Automated proofs to write

- **`HICQueueableTest.publishingEventEnqueuesQueueable`** — build a `HIC_Prefill_Requested__e` SObject, `EventBus.publish` inside `Test.startTest()`, `Test.stopTest()` flushes the trigger + Queueable; assert one `HIC_Check__c` with Status ∈ {`Success`,`Failed`,`Deferred`} exists.
- **`HICCalloutClientTest.buildsRequestWithNamedCredentialAndTimeout`** — implements `HttpCalloutMock.respond(HttpRequest req)`, captures the request, asserts `req.getEndpoint().startsWith('callout:PTSF_HIC')`, `req.getMethod() == 'POST'`, `req.getHeader('Content-Type') == 'application/json'`.
- **`HICQueueableTest.retriesUpToThreeThenDefers`** — mock throws `CalloutException`; assert final row `Attempt_Count__c == 3`, `Status__c == 'Deferred'`, `Next_Attempt_At__c` is not null and > now.
- **`HICQueueableTest.duplicateIdempotencyKeyDoesNotDoubleInsert`** — publish twice with identical `(Source_Record_Id__c, Submitted_At__c)`; assert `[SELECT COUNT() FROM HIC_Check__c]` = 1 and the second publish left the row untouched (Attempt_Count did not increment a second time).
- **`HICQueueableTest.successPublishesCompletionEvent`** — mock returns 200 + body; after `Test.stopTest`, assert the completion event was published by querying `EventBus.TriggerContext` state or (simpler) subscribing via an in-test trigger that captures the event.
- **`HICRetrySchedulableTest.deferredRowIsRequeuedWhenDue`** — seed row with `Status__c='Deferred'`, `Next_Attempt_At__c = Datetime.now().addMinutes(-1)`, `Attempt_Count__c = 1`, mock success; run schedulable; assert Status flipped to `Success`.
- **`HICRetrySchedulableTest.rowsOlderThan24HoursAreIgnored`** — insert row, then `Test.setCreatedDate(row.Id, Datetime.now().addHours(-25))`; run schedulable; assert row Status unchanged.

## Org assertions

- **INT-007-C8** (Named Credential present):
  - `named-credential-exists(PTSF_HIC)` — verify the NC deployed. It's expected to be *disabled with a placeholder endpoint*; enablement is a runbook step, not a proof criterion here.

## Manual validation scenes

_None._ The intent's acceptance walkthrough ("user submits, sees pending, navigates away, callback lands, status advances") is fully covered by the automated proofs — the "user sees pending" half is INT-011's LWC (already delivered) reading `HIC_Check__c.Status__c`; the "status advances" half is INT-008's Flow subscribing to the completion event (not this intent). Nothing here needs a human eye.

## Deliberately not tested (out of scope)

- Business rules that act on the completion event — INT-008's Flow, per intent `## Out of scope`.
- Real vendor call — endpoint + auth are placeholder until Q-007-1 lands (see C9).
