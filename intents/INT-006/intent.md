---
id: INT-006
phase: 2
epic: E01
confidence: Confirmed
origin: scopezilla
title: Patient portal + onboarding wizard with async HIC prefill
---

# INT-006 — Patient portal + onboarding wizard with async HIC prefill

## Outcome

A new patient can register and complete a localized onboarding wizard that prefills insurance data from the HIC without ever blocking on the 15-second peak latency.

## Build target

- Experience Cloud LWR site 'Patient Portal' with localized templates per region
- LWC wizard capturing name, DOB, address, language preference, insurance details
- Onboarding__c staging record persisted per wizard step
- Platform Event `HIC_Prefill_Requested__e` fired on wizard entry; UI shows a non-blocking 'checking coverage' state
- Address validation callout to Loqate (strawman) on address entry
- Localized welcome email template set, keyed by Contact.Language_Preference__c
- Contact.Onboarding_Complete__c gate that blocks the subsidy application journey until onboarding is finished

## Guardrails

- Must not block wizard progression on the HIC callout returning — the wizard advances, HIC fills in later
- Must not send unlocalized emails — every template exists in every supported language
- Must not write insurance detail to a Contact field cleartext where it should live encrypted on Medical_History__c (INT-004)

## Out of scope

- Must not build the subsidy application form (INT-008 owns it)
- Must not build the HIC entitlement-check pattern for submissions (INT-007 owns the shared pattern)

## Acceptance

A patient in Singapore registers with Facebook, enters the wizard in English, submits an address that Loqate corrects, sees the 'coverage check pending' pill, continues to the language step, and by the time they reach the summary the insurance details have prefilled from HIC. A localized welcome email lands in their inbox.

## Success criteria

_none_

## Dependencies

### Internal
- INT-003
- INT-007

### External
_none_

## Open questions

_none_

## Grounding

### Carried (unmapped upstream fields)
- surface: experience-cloud
