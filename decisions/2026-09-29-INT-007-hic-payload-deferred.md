---
date: 2026-09-29
intents: [INT-007]
decides: HIC payload mapping deferred until Q-007-1 answered; async pattern built against opaque JSON body
---

# Defer concrete HIC payload mapping until Q-007-1 is answered

## Context

INT-007 delivers the async integration pattern for the Health Insurance Checker (HIC): Platform Events, a Queueable that calls out via Named Credential, retry with exponential backoff, a Scheduled Flow fallback, and idempotency. The intent's `## Open questions` records `Q-007-1: exact HIC request/response payload schema and rate-limit contract — UNANSWERED (Resolver: PTSF IT + HIC vendor)`.

Building the pattern needs the *shape* of the callout (a POST with a JSON body and a JSON response); it does **not** need the specific field names on either side.

## Decision

The build covers the **pattern**: the Platform Events, `HIC_Check__c`, `HICQueueable`, retry math, Scheduled Flow, and idempotency key derivation. The callout body is treated as an **opaque JSON payload** — `HIC_Check__c.Request_JSON__c` holds whatever the requesting event carried; `HIC_Check__c.Response_JSON__c` holds whatever the vendor returned. No field-level mapping into `Subsidy_Application__c` or `Onboarding__c` happens in this intent — that's INT-008's Flow (which acts on the completion event) and any downstream mapping intent.

An `IHICClient` interface fronts the callout so tests can supply a stub without configuring a Named Credential; the production `HICCalloutClient` uses `callout:PTSF_HIC` with a 20-second timeout.

**Follow-on (created when Q-007-1 is answered):** author a new intent that (a) fills in the concrete request payload builder, (b) parses vendor response fields, and (c) writes the mapped result onto the source record via INT-008's completion-event Flow. No schema change to `HIC_Check__c` will be needed — `Request_JSON__c` and `Response_JSON__c` already carry whatever shape lands.

## Consequences

- INT-007's acceptance walkthrough is proven end-to-end **with a mocked HIC** (`Test.setMock` supplying a canned response); the real vendor callout is exercised only after Q-007-1 lands.
- The Named Credential `PTSF_HIC` ships as **inactive** in the runbook — Setup enables it once the vendor endpoint + auth are known.
- INT-007's `INT-007-Cx` proof rows for "vendor payload correctness" are marked `📋 accepted gap — deferred pending Q-007-1 → this decision file`.
