---
id: INT-003
phase: 1
epic: E08
confidence: Assumed
origin: scopezilla
title: Patient and practitioner login (email/password, Facebook, and partner path)
---

# INT-003 — Patient and practitioner login (email/password, Facebook, and partner path)

## Outcome

Patients and practitioners can register and log in through the right channel for their role, without touching internal identity.

## Build target

- Experience Cloud login pages for Patient Portal (email/password + Facebook Auth Provider) and Practitioner Community (partner path per G0401 resolution)
- Self-registration for patients; admin-vetting queue for practitioner registrations (strawman)
- Password/reset flows in each site's supported languages
- Auth Provider config for Facebook, tested against a real developer app

## Guardrails

- Must not merge patient and practitioner Contact records — RecordType keeps them distinct
- Must not provision a Partner Community license until admin vetting completes

## Out of scope

- Must not build passwordless / magic-link auth (not requested)

## Acceptance

A patient registers with Facebook, lands on the onboarding wizard entry screen; separately, a practitioner self-registers, waits for admin approval, and then logs in to a practitioner-community home page.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
_none_

## Open questions

- Q-003-1: Is the practitioner auth path self-registration-with-vetting, or federated against a professional-registry IdP? (Resolver: PTSF Program Sponsor + IA) — UNANSWERED

## Grounding

### Carried (unmapped upstream fields)
- surface: experience-cloud
