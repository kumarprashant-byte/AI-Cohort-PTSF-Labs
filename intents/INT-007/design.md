---
intent: INT-007
scope_hash: e0f63f2a5954
authored: 2026-09-29
---

# INT-007 — Design

**Intent:** Health Insurance Checker async integration pattern (Platform Event → Queueable → callback)
**Source intent:** `intents/INT-007/intent.md`
**Deferral decision:** `decisions/2026-09-29-INT-007-hic-payload-deferred.md`

## Data model

- **`HIC_Check__c`** — one row per HIC call.
  - `Idempotency_Key__c` — Text(64), external ID, unique — SHA-256 hex of `(source_record_id + '|' + submitted_at ISO8601)`.
  - `Kind__c` — Picklist restricted: `Prefill`, `Entitlement`.
  - `Status__c` — Picklist restricted: `Pending`, `In Progress`, `Success`, `Failed`, `Deferred`. Default `Pending`.
  - `Source_Record_Id__c` — Text(18), the `Onboarding__c` or `Subsidy_Application__c` id.
  - `Source_Object__c` — Text(40), the source sobject api name (used to fan out the completion event without adding two lookups on this row).
  - `Request_JSON__c` — LongTextArea, the opaque request payload.
  - `Response_JSON__c` — LongTextArea, the opaque response payload.
  - `Attempt_Count__c` — Number(2,0), default 0.
  - `Next_Attempt_At__c` — DateTime, when the Scheduled Flow should retry (null on terminal states).
  - `Last_Error__c` — Text(255), truncated exception message.
  - `Submitted_At__c` — DateTime, when the request was raised (feeds the idempotency key).

  OWD: **Public Read/Write** — this is operational metadata, not PHI. The vendor request/response is opaque JSON with no direct PII beyond record ids; `Subsidy_Application__c`'s own sharing model still governs who reads the source record.

- **Platform Events** (all high-volume, PublishBehavior = `PublishAfterCommit`):
  - `HIC_Prefill_Requested__e` — fields: `Source_Record_Id__c` (Text 18), `Submitted_At__c` (DateTime), `Request_JSON__c` (LongText 32768).
  - `HIC_Entitlement_Requested__e` — same shape.
  - `HIC_Prefill_Completed__e` — fields: `Source_Record_Id__c`, `Status__c` (Text 20), `Response_JSON__c` (LongText 32768), `HIC_Check_Id__c` (Text 18).
  - `HIC_Entitlement_Completed__e` — same shape.

  Two request events + two completion events (not one polymorphic event) so INT-008's Flow can subscribe to just the completion type it cares about without a filter.

## Sharing & security

- `HIC_Check__c` is public — no Apex-managed sharing. Practitioners see the row via a related list on the source `Subsidy_Application__c` / `Onboarding__c` (INT-011's PSG grants Read).
- No custom permission set ships for this intent — the invocable/subscriber code runs as the platform user (Platform Event triggers run as `Automated Process`). System permissions apply.
- **Named Credential** `PTSF_HIC` — declared in metadata but ships *disabled* / with a placeholder endpoint. Enablement + real endpoint + auth are runbook steps (Setup) once Q-007-1 lands.

## Automation approach

Declarative-first fails here — a Queueable is unavoidable for the retry-with-callout pattern (`Schedulable → System.enqueueJob` chained), and Flow-based HTTP callouts can't carry exponential backoff or exception handling this cleanly.

Pipeline:

1. **Producer** — any Flow / LWC / Apex publishes `HIC_*_Requested__e` with `Source_Record_Id__c`, `Submitted_At__c`, `Request_JSON__c`. Producers never touch HIC directly.
2. **Platform Event trigger** — `HICRequestTrigger` (after insert on each request event) computes the idempotency key, upserts `HIC_Check__c` on `Idempotency_Key__c`, and — **only if the upsert inserted a new row** — enqueues `HICQueueable`. If the key already existed, the trigger no-ops (guarantees "no duplicate HIC_Check__c rows for the same idempotency key" from the intent).
3. **`HICQueueable`** — flips the row to `In Progress`, invokes `IHICClient.call(request)`, on success writes `Response_JSON__c` + `Status__c=Success` + fires the completion event, on failure increments `Attempt_Count__c`, computes backoff (`2^attempt` minutes: 2, 4, 8), and either re-enqueues via `System.enqueueJob` (when `attempt_count < 3` **and** in a synchronous or first-callable context) or sets `Status__c=Deferred` + `Next_Attempt_At__c=now+backoff` for the Scheduled Flow to pick up.
4. **`HICRetrySchedulable`** — hourly job (Cron `0 0 * * * ?`) queries `HIC_Check__c WHERE Status__c IN ('Deferred','In Progress') AND Next_Attempt_At__c <= :Datetime.now() AND CreatedDate > :Datetime.now().addHours(-24)` and enqueues `HICQueueable` for each. The 24-hour horizon caps the retry window per the intent; rows past it stay `Deferred` and page a human via a report.
5. **Idempotency key** — `EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(sourceRecordId + '|' + submittedAt.formatGmt('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''))))`.

**`IHICClient` interface** — one method: `HICResponse call(HICRequest req)`. Production impl `HICCalloutClient` uses `HttpRequest` with `endpoint = 'callout:PTSF_HIC/check'`, 20-second timeout, `POST`, JSON body. Test impl `HICMockClient` returns canned success/failure/timeout. The Queueable selects the impl via a static override slot for tests (`@TestVisible static IHICClient overrideClient`).

Governor exposure: one row per event, one callout per Queueable — well inside `100 callouts` and `1MB heap`. Bulk producers (e.g. INT-008 mass-processing) fan out into one Platform Event per source record → one Queueable each; total callout count scales with volume, so if a batch API becomes needed later, the follow-on intent adds it.

## Integration

- **Named Credential** `PTSF_HIC` — deployed, disabled by default, endpoint `https://placeholder.example.invalid`. The runbook flips it live once IT provides the real endpoint + auth per Q-007-1.
- **Payload mapping** — deferred per `decisions/2026-09-29-INT-007-hic-payload-deferred.md`. Request/response JSON is opaque in this build.
- No inbound webhook — the vendor is queried, not push-based. If Q-007-1 reveals a callback URL model, that's a follow-on intent.

## Alternatives considered

- **Continuation (long-running callout)** — rejected. Ties the user's session; the intent requires the user to navigate away and come back. Queueable + Platform Event fits the intent's async contract.
- **Batch Apex** — rejected for the primary path (Queueable is lighter and chains cleanly for retry); the Scheduled Flow is the recovery path.
- **One polymorphic `HIC_Requested__e` with a `Kind__c` field** — rejected. Two events keep subscribers filter-free and let INT-008 wire one Flow per completion type. Cheap to add — expensive to split later.
- **Idempotency on `Source_Record_Id__c` alone** — rejected. A user can legitimately resubmit; the `Submitted_At__c` half lets a fresh submission through while a duplicate within the same millisecond dedupes.

## Architecture conformance

_Not applicable — this engagement carries no `scopezilla/decisions/` inherited ADRs and no per-intent `## Grounding` link. Commercial engagement, default zero._

## Neighboring & future scope

- **Builds on** — INT-009 (`Subsidy_Application__c`, `Onboarding__c` — the source objects); INT-005 (region/role PSGs, though HIC_Check__c is public so no direct wiring).
- **Builds on this** — INT-008 (Flow that subscribes to `HIC_*_Completed__e` and advances application status / triggers auto-reject rules). This design ships the completion events with the shape INT-008 will need (`Source_Record_Id__c` + `Status__c` + `Response_JSON__c` + `HIC_Check_Id__c`) so INT-008 needs no schema change to consume them.
- **Existing org** — no prior HIC-related metadata in `force-app/` or the sandbox (checked). Named Credential name `PTSF_HIC` is unique.

## Open design questions

- **Q-007-1** (unchanged from the intent) — vendor payload schema + rate-limit contract. Not blocking the pattern; blocks the follow-on mapping intent. Owner: PTSF IT + HIC vendor.
