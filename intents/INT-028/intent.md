---
id: INT-028
phase: 3
epic: E01
confidence: Draft
origin: engagement
title: Assessor chat with FAQ deflection
---

# INT-028 — Assessor chat with FAQ deflection

## Outcome
A practitioner (or patient advocate) with a routine question — "where's my application?", "what documents do I need?", "when does my assessment close?" — gets an answer in seconds from a chatbot on the community, without pulling an on-shift Assessor off case work. When the bot can't answer or the practitioner picks "talk to someone", the conversation hands off to a live Assessor on Omni-Channel with the question history visible so the Assessor doesn't have to re-ask.

- Summary: deflect ≥50% of inbound routine Qs from the Assessor queue; the rest route faster because context arrives with them.

## Build target
Ship the "ask-first-handoff-smoothly" surface:
- A **Messaging channel** (Messaging for Web — the free-tier path if Digital Engagement SKU isn't carried, else Messaging for In-App & Web) embedded in the practitioner community site built in INT-011.
- An **Einstein Bot** (`Assessor_Deflection_Bot`) with four seeded FAQ dialogs mapping to the four most-asked topics: Application status · Required documents · Assessment timeline · Assignment acceptance. Each dialog pulls its answer body from a Knowledge article (one per topic), so copy lives in Knowledge, not in the bot XML.
- An **"Escalate to Assessor" dialog** triggered by (a) the user picking "talk to someone", or (b) the bot's confidence threshold not clearing on a free-text question. Transfers to an Omni-Channel queue `Assessor_Chat_Queue` with the chat transcript attached.
- An **Omni-Channel routing config** (`Assessor_Chat_Routing`) with least-active work routing, max 3 concurrent chats per Assessor.
- A **chat-transcript audit retention**: `LiveChatTranscript` records keep for 90 days, then purge via a scheduled Flow (regulatory alignment; mirrors existing retention on `Audit_Log__c`).
- The **`Assessor_Base`** permission set extended with `ServicePresenceStatusAccess` on an "Available — Chat" presence status and read on `LiveChatTranscript`.

## Guardrails
- **PHI never surfaces in chat transcripts** — the Knowledge articles never cite `Medical_History__c`, `Diagnosis__c`, or any PHI field; the bot's "Application status" dialog shows only `Status__c` and `Submitted_At__c`, never the medical payload. Carries INT-004/INT-026's blockout into the chat surface.
- **No free-text acknowledgement of PHI by the bot** — if the user types a PHI keyword from the deflection kill-list (`diagnosis`, `medication`, `allergy`, `condition`, `illness`), the bot immediately routes to a human and does not echo the keyword back.
- **Handoff only to on-shift Assessors** — Omni routes to Assessors whose presence is "Available — Chat"; if none are available in-region, the bot offers "leave a callback" instead of queueing indefinitely.
- **Deflection confidence threshold**: bot only auto-answers when its intent match clears 0.8; below that, it offers the "talk to someone" button rather than guessing.
- The bot is `with sharing` of the running user and the Knowledge articles respect PublishStatus=Online + the running user's Data Category Visibility — no `WITHOUT SHARING` escape.

## Out of scope
- **Agentforce / LLM-generated answers** — v1 is keyword matching against the four seeded FAQs and Knowledge articles. An LLM-backed intent model is a follow-on intent, not this one.
- **Outbound / proactive chat** — the bot only responds; it does not initiate.
- **Voice** — Service Cloud Voice is a different licence pattern; this intent is chat only.
- **Multilingual** — English only in v1. Translation is a separate scoping call (dependency on Translation Workbench, Knowledge translations).
- **Expansion of the FAQ beyond the four seeded topics** — each new FAQ is a Knowledge article + bot dialog + regression; grow one at a time, not here.

## Acceptance
Given a logged-in practitioner on the community site, when they open the chat bubble and type "where's my application" (or click the "Application status" quick reply), the bot answers with the Knowledge article text for Application Status, substituting the practitioner's own open application's `Status__c` and `Submitted_At__c`. When they then click "talk to someone", the chat routes to an on-shift Assessor on `Assessor_Chat_Queue` with the full transcript visible on the Assessor's console within 10 seconds. A second scene: when the practitioner types "my patient's diagnosis", the bot does NOT answer, does NOT echo the word diagnosis, and routes immediately to an Assessor flagged `PHI-sensitive` so the Assessor knows to open the conversation carefully.

## Success criteria
- SC-1: The four seeded FAQs resolve without handoff on their canonical phrasing (the Knowledge article's own trigger phrases) — bot-only, no Assessor touched.
- SC-2: A PHI keyword in the user's message triggers immediate human handoff AND the `LiveChatTranscript` does NOT contain the keyword echoed back by the bot.
- SC-3: An "Escalate to Assessor" click transfers to Omni with the full prior transcript attached — the Assessor reads the question before responding, measured by `LiveChatTranscript.Body` containing the bot's exchange.
- SC-4: When no Assessor is on-shift (zero presences = Available — Chat), the bot offers callback instead of queueing — measured by a mock-test with the queue empty.

## Dependencies

### Internal
- INT-011 — Digital assessment form on the practitioner community (provides the Experience Cloud site the chat embeds in)
- INT-004 — PHI security foundation (the keyword kill-list reuses INT-004's PHI field inventory)
- INT-005 — Practitioner region/user model (Omni routing per region builds on this)

### External
- PTSF IT | confirm Digital Engagement / Service Cloud Messaging licence availability in the target org — owner: PTSF IT. If unavailable, fall back to Messaging for Web (free tier) or defer to a licensing follow-on.

## Open questions
- Q-028-1: Which four FAQ topics are the right starting set? (Working assumption: Application status · Required documents · Assessment timeline · Assignment acceptance — confirm with the Assessor supervisor from the call volume in TAMS before the Knowledge articles are drafted.)
- Q-028-2: Is the "callback" fallback in-scope for v1 or deferred? (If deferred, the bot ends with "please email assessor@ptsf.test" when no Assessor is on-shift.)
- Q-028-3: What's the retention requirement for `LiveChatTranscript` under PTSF's data policy? (Assumed 90 days; needs legal confirmation — gates the purge Flow.)
