# INT-007 — Deployment runbook

**Intent:** `intents/INT-007/intent.md` · **Design:** `intents/INT-007/design.md` · **Test script:** `intents/INT-007/test-script.md` · **Deferral decision:** `decisions/2026-09-29-INT-007-hic-payload-deferred.md`

## Prerequisites

- **INT-009 ✅** — `Subsidy_Application__c` (source object). `Onboarding__c` is referenced by design but the pattern degrades cleanly if it isn't present.
- Nothing else external — the vendor endpoint is a placeholder until Q-007-1 is answered.

## Metadata deploy (two-pass on a fresh org)

Custom objects and Platform Events must land before the Apex that references them.

**Pass 1 — objects, Platform Events, Named Credential:**
```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/HIC_Check__c \
  --source-dir force-app/main/default/objects/HIC_Prefill_Requested__e \
  --source-dir force-app/main/default/objects/HIC_Entitlement_Requested__e \
  --source-dir force-app/main/default/objects/HIC_Prefill_Completed__e \
  --source-dir force-app/main/default/objects/HIC_Entitlement_Completed__e \
  --source-dir force-app/main/default/namedCredentials/PTSF_HIC.namedCredential-meta.xml \
  --target-org <alias>
```

**Pass 2 — Apex + triggers, with tests:**
```bash
sf project deploy start \
  --source-dir force-app/main/default/classes \
  --source-dir force-app/main/default/triggers \
  --target-org <alias> \
  --test-level RunSpecifiedTests \
  --tests HICQueueableTest --tests HICCalloutClientTest --tests HICRetrySchedulableTest \
  --tests AssignmentSlaCheckActionTest --tests AssessmentFormControllerTest --tests AssignmentShareServiceTest
```

The three non-HIC test classes are needed to satisfy per-class 75% coverage for the other Apex swept into the folder-based deploy (they're prior intents' tests).

**Verified:** pass 1 `0AfoB000000yjZoSAI`; pass 2 `0AfoB000000yjmXSAQ` (26/26 tests green) on `epic.out.e68d765f4115@orgfarm.salesforce.com` — 2026-09-29.

**Components:** 1 CustomObject (`HIC_Check__c` + 11 fields), 4 Platform Events (`HIC_{Prefill,Entitlement}_{Requested,Completed}__e` + 3–4 fields each), 1 NamedCredential (`PTSF_HIC`, placeholder), 8 ApexClasses (`IHICClient`, `HICClientTypes`, `HICCalloutClient`, `HICIdempotency`, `HICQueueable`, `HICRequestHandler`, `HICRetrySchedulable`, `HICMockClient`), 3 test classes, 2 triggers.

## Setup steps (not in the metadata deploy)

### 1. Schedule `HICRetrySchedulable`

Setup → Apex Classes → *Schedule Apex* → pick `HICRetrySchedulable`, cron `0 0 * * * ?` (top of every hour), label `HIC Retry Sweep`. Or from anonymous Apex:
```apex
System.schedule('HIC Retry Sweep', '0 0 * * * ?', new HICRetrySchedulable());
```

### 2. Point `PTSF_HIC` at the real vendor endpoint — **only after Q-007-1 lands**

The Named Credential ships pointing at `https://placeholder.example.invalid` with `NoAuthentication`. Until IT provides the endpoint + auth from the vendor contract, **leave it as-is** — producers can still fire events, `HIC_Check__c` rows will accumulate in `Deferred`, and no bad callout leaves the org. When ready:
- Setup → Named Credentials → **PTSF HIC (placeholder)** → *Edit*
- URL → the vendor endpoint (`https://…/hic/v1` per the contract)
- Authentication → per contract (JWT bearer, mTLS, or NAMED_PRINCIPAL against an External Credential — set it up first if the choice is OAuth).

### 3. Enable Change Data Capture / event replay — optional

`HIC_*_Completed__e` is HighVolume + PublishAfterCommit. INT-008's subscriber (a Flow) reads the live stream. No replay setup needed unless a subscriber needs to catch up on missed events during an outage — then set retention accordingly under Setup → Platform Events.

## How to fire a request (from an intent / Flow / LWC)

Producers do **not** call HIC. They publish an event:
```apex
EventBus.publish(new HIC_Prefill_Requested__e(
    Source_Record_Id__c = subsidyAppId,
    Submitted_At__c = Datetime.now(),
    Request_JSON__c = JSON.serialize(payloadMap)
));
```

Idempotency is automatic — the same `(Source_Record_Id__c, Submitted_At__c)` pair dedupes at the trigger; a duplicate is a no-op. To *force* a fresh call, use a fresh `Submitted_At__c`.

## Deferred / follow-ons

- **Vendor payload mapping** (INT-007-C9) — deferred per `decisions/2026-09-29-INT-007-hic-payload-deferred.md`. A follow-on intent (unnumbered until Q-007-1 lands) will fill in the concrete request builder and response parser. No schema change to `HIC_Check__c` needed — `Request_JSON__c` and `Response_JSON__c` already carry whatever shape lands.
- **Completion-event subscriber** — INT-008 owns the Flow that subscribes to `HIC_*_Completed__e` and advances application status. Not this intent.
- **Business rules for auto-reject** — INT-008.

## Rollback

The pattern is opt-in — producers must explicitly publish events, so the code is dormant if unused. To fully unwind:

1. **Un-schedule** `HIC Retry Sweep` (Setup → Scheduled Jobs → Delete).
2. Deactivate the two request triggers via tooling API (`Status='Inactive'`).
3. Drain `HIC_Check__c` — decide whether to keep the audit trail or delete. If keeping, no rollback needed on the object.
4. Destructive deploy in dependency order: triggers → Apex classes → Platform Events → `HIC_Check__c` → Named Credential.
