---
intent: INT-006
scope_hash: 550355e10b6f
authored: 2026-09-30
---

# INT-006 — Design

**Intent:** Patient portal + onboarding wizard with async HIC prefill
**Source intent:** `intents/INT-006/intent.md`

## Data model
- `Onboarding__c` — Private OWD; auto-number `ONB-{00000}`; fields `Contact__c` (lookup), `Step__c` (Identity/Address/Language/Insurance/Summary, restricted picklist), `Payload_JSON__c` (LongTextArea 32k). Stores per-step wizard state so a patient can resume; deliberately narrow — no insurance detail here, that belongs on encrypted `Medical_History_Entry__c` (INT-004).
- `HIC_Prefill_Requested__e` platform event — HighVolume, PublishAfterCommit; `Contact_Id__c`, `Onboarding_Id__c` (existing `Request_JSON__c`, `Source_Record_Id__c`, `Submitted_At__c` kept for the generic HIC callout).
- `Contact.Language_Preference__c` — restricted picklist (`en_US`, `fr`, `de`, `zh_CN`, `ja`) keying localized welcome emails and portal templates.
- `Contact.Onboarding_Complete__c` — checkbox; guardrail gate for the subsidy-application journey (INT-008).

## Sharing & security
- `Onboarding__c` Private matches PHI adjacent handling. Site guest user reads/writes only their own record (Experience Cloud user-mode context); staff FLS via a follow-on permission set (not built here).
- Contact fields visible to Assessor/Practitioner via existing `Assessor_Base` / `Practitioner_Access` permission sets — added as cascading follow-on if a report needs them.

## Automation approach
- **Non-blocking HIC callout (guardrail 1):** the LWC publishes `HIC_Prefill_Requested__e` on wizard entry; a subscribing Flow (Setup-authored per runbook) or Apex trigger routes the callout asynchronously. UI never awaits the response.
- **Onboarding_Complete__c** flipped by the Summary step submit action (Flow, runbook-authored) once every required step has a Payload_JSON__c row.
- **Welcome email:** Setup-authored Flow keyed by `Contact.Language_Preference__c` selects the localized template.

## Integration
- Loqate address validation — REST callout via Named Credential; deferred to runbook (real API key needed).
- HIC prefill callout — generic HIC integration (external system); this intent only fires the event.

## Alternatives considered
- **Screen Flow instead of LWC wizard** — rejected because Loqate needs a synchronous callout hook and the LWR site needs branded, localized templates; a custom LWC gives the design system freedom the OOTB Screen Flow can't.
- **Single Onboarding__c record vs per-step** — chose single-record with `Step__c` marker + `Payload_JSON__c` so resume is trivial; per-step would explode row count with no query benefit.

## Neighboring & future scope
- **Built on:** INT-002 (SAML JIT stamps `Region__c` / `Language_Preference__c` — the same `Language_Preference__c` field is authored here); INT-003 (Contact record types — Patient RT is the onboarding target).
- **Builds on this:** INT-008 (subsidy application) gates on `Onboarding_Complete__c`; INT-004 (Medical History Entry) receives insurance detail from the wizard's Summary submit.
- **Existing org:** `HIC_Prefill_Requested__e` already exists with generic fields; extended with `Contact_Id__c` / `Onboarding_Id__c` here — clean extension, not collision.

## Open design questions
- None blocking. Loqate API key + IdP-issued Language attribute owned by delivery lead, tracked in runbook.
