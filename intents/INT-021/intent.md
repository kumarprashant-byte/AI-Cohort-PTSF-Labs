---
id: INT-021
phase: 2
epic: E01
confidence: Draft
origin: engagement
title: HIC prefill callout — react to platform event, call HIC, write response back
ratified: 2026-10-01 by Prashant Kumar @ f435140e1e98
---

# INT-021 — HIC prefill callout

## Outcome
Patients onboarding through the Patient Portal see their insurance details prefilled from the Health Insurance Company (HIC) within a few seconds of saving the first wizard step, instead of typing them again. The round trip is observable on `Onboarding__c` (`Prefill_Status__c`), and every failure is captured so a human can retry or diagnose.

## Build target
Subscribe to `HIC_Prefill_Requested__e` (published today by `OnboardingWizardController.saveStep` on the first save). An async Apex Queueable posts the Contact Id + request payload to the HIC via a Named Credential (`callout:HIC_Partner`), parses the response, writes the prefill JSON back onto `Onboarding__c.Prefill_Response_JSON__c`, flips `Prefill_Status__c` to `Received`, and on any error logs an `Integration_Error__c` row with request/response/status code and flips `Prefill_Status__c` to `Failed`.

## Guardrails
- Callouts run async only — never from the platform-event trigger context directly. Use Queueable + `Database.AllowsCallouts`.
- Secrets never land in Apex: the endpoint and auth live in a Named Credential + External Credential, referenced via `callout:HIC_Partner`.
- A failed callout must leave an `Integration_Error__c` row (payload, response body, HTTP status, retry count, context) — silent failures are not acceptable.
- The subscriber is idempotent: replaying the same event does not create duplicate Onboarding updates (match on `Onboarding_Id__c`; last-write-wins on JSON).
- All callouts honor the Named Credential's timeout; no hard-coded URLs or client secrets anywhere in `force-app/**`.

## Out of scope
- Real HIC endpoint — the sandbox demo points `HIC_Partner` at a mock (`httpbin.org/post`); production endpoint is a deployment-time toggle.
- Inbound HIC-initiated push (eligibility updates, claim status) — a separate intent.
- Scheduled retry of `Integration_Error__c` rows — logged for a human to inspect; auto-retry is future scope.
- MuleSoft/middleware — direct Salesforce ↔ HIC callout for this slice.

## Acceptance
Given a Contact with Insurance details, when the patient saves the first wizard step, the HIC event fires and the Queueable callout posts to `callout:HIC_Partner`. On a 2xx response the Onboarding row shows `Prefill_Status__c = Received`, `Prefill_Response_JSON__c` populated, and no `Integration_Error__c` row exists for that Onboarding. On a 5xx response the Onboarding row shows `Prefill_Status__c = Failed` and exactly one `Integration_Error__c` row carries the request payload, response body, HTTP status, and the Onboarding Id as `Related_Record_Id__c`.

## Success criteria
- SC-1: Successful round trip updates `Onboarding__c.Prefill_Status__c` to `Received` within one asynchronous cycle.
- SC-2: A 5xx response leaves exactly one `Integration_Error__c` row referencing that Onboarding, and `Prefill_Status__c = Failed`.
- SC-3: No endpoint URL or secret appears in any Apex class, test, or metadata XML (grep clean).
- SC-4: Replaying the same platform event does not create a second Onboarding update or duplicate error row.

## Dependencies

### Internal
- INT-006 — publishes `HIC_Prefill_Requested__e` from the wizard

### External
- HIC Partner | REST endpoint + OAuth client credentials | owner: Integrations lead (mocked with `httpbin.org` for sandbox)

## Open questions
- Q-021-1: Which fields does the HIC return in the prefill payload? (demo stub uses `{insurerName, policyNumber, coverageTier}`)
- Q-021-2: Retry policy for `Integration_Error__c` rows — manual, scheduled, or event replay?
