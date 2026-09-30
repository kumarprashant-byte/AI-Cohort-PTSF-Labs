---
id: INT-015
phase: 4
epic: E07
confidence: Assumed
origin: scopezilla
title: Chat, deflection bot, and knowledge base on both surfaces
ratified: 2026-09-30 by Prashant Kumar @ ce2662925246
---

# INT-015 — Chat, deflection bot, and knowledge base on both surfaces

## Outcome

Patients and practitioners can chat with an Einstein Bot that answers most questions; live handoff to an Assessor happens on intent or user request.

## Build target

- Messaging for In-App/Web widget embedded on Patient Portal and Practitioner Community
- Einstein Bot answering the top intents from the current static-website FAQ
- Omni-Channel routing on handoff, keyed by Language and Region as skills
- Knowledge base seeded from the current static-website FAQ content, per language

## Guardrails

- Must not route a patient chat to an Assessor in a different region unless no in-region agent is available
- Must not surface medical-history references in bot responses

## Out of scope

- Must not build voice channel — chat only

## Acceptance

A French-speaking patient opens chat on the EMEA portal, the bot answers three FAQ intents, then the patient asks about a specific application; the bot routes to Omni-Channel and lands with a French-speaking EMEA Assessor.

## Success criteria

_none_

## Dependencies

### Internal
_none_

### External
_none_

## Open questions

_none_

## Grounding

### Carried (unmapped upstream fields)
- surface: experience-cloud
