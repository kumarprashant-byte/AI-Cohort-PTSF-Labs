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
A practitioner or Assessor-user with a routine question — "where's my application?", "what documents do I need?", "when does my assessment close?" — gets an answer in seconds from an in-platform FAQ panel, without pulling an on-shift Assessor off case work. When the FAQ doesn't answer or the user picks "Chat with an Assessor", a Case is opened on the `Assessor_Chat_Queue` carrying the user's question, and the ensuing conversation lives on the Case feed (Chatter) — the Assessor replies there, the user sees responses in the same panel.

- Summary: deflect routine Qs via in-platform FAQ; escalate everything else to a routed Case the Assessor answers via Chatter feed.

## Build target
Ship the **orgfarm-first internal surface** today, with the community embed phased after INT-011's Experience Cloud blocker clears:
- A **`faqChatPanel` LWC** placed on the existing `PTSF_Patient_Travel_Support` app's home page (and later, on the INT-011 community site when it's provisioned). The panel shows four FAQ accordion items + a free-text question box + a "Chat with an Assessor" button.
- An **`AssessorFaqController`** Apex class (`with sharing`) exposing `@AuraEnabled` methods:
  - `getFaqs()` — returns the four `Assessor_FAQ__mdt` entries.
  - `createChatCase(String question)` — scans the question against the PHI kill-list, drops the question into a new `Case` with `Origin='Chat'`, `Status='New'`, `OwnerId=<Assessor_Chat_Queue>.Id`, `Subject='[Assessor Chat] <first 60 chars>'`, `Description=<full question>`, `PHI_Flagged__c=<keyword hit? true:false>`. Returns the Case Id.
  - `postReply(Id caseId, String message)` — posts a `FeedItem` on the Case (both user and Assessor use this to converse).
  - `getReplies(Id caseId)` — returns the Case's FeedItems newest-first.
- An **`Assessor_FAQ__mdt`** Custom Metadata Type seeded with four records (CMT, not Knowledge — no Knowledge enablement needed on orgfarm):
  - `Application_Status` · `Required_Documents` · `Assessment_Timeline` · `Assignment_Acceptance`
  - Each record carries: `Topic__c` (text), `Trigger_Phrases__c` (semicolon list), `Answer_Body__c` (long text).
- A **Queue `Assessor_Chat_Queue`** (SOBject = Case) seeded with the two Assessor users already provisioned by INT-005 (`apac.assessor@ptsf.test.invalid`, `emea.assessor@ptsf.test.invalid` — whichever the orgfarm already carries; the queue can be empty at creation and populated by hand if the users haven't landed).
- A **`Case` custom field `PHI_Flagged__c`** (Checkbox, defaults false) — surfaces in the Case list view so Assessors see at a glance which chats hit the kill-list.
- The **`Assessor_Base`** permission set extended with: Read/Create/Edit on `Case`, Read on `Assessor_FAQ__mdt`, Read/Create on `FeedItem`, and Apex access to `AssessorFaqController`.
- A **list view `Chat Queue — Open`** on `Case` filtering `Origin='Chat' AND Status != Closed`, with `PHI_Flagged__c` visible, as the Assessor's inbound-chat view.

## Guardrails
- **PHI never surfaces in the FAQ bodies** — the four seeded `Assessor_FAQ__mdt` entries never mention `Medical_History__c`, `Diagnosis__c`, or any medical payload. Only `Status__c`, `Submitted_At__c`, process timelines.
- **No echo of PHI keywords** — `AssessorFaqController.createChatCase` scans the inbound question against a kill-list derived from INT-004's `Medical_History__c` field inventory (lowercase stems: `diagnos`, `medic`, `allerg`, `condition`, `illness`, `symptom`). If any match, the Case is created with `PHI_Flagged__c=true` and `Subject='[Assessor Chat — PHI flagged]'` (the subject deliberately does NOT contain the user's words, only the flag label); the panel shows the user "An Assessor will reach out shortly — please do not share clinical details here" instead of echoing the question back as a confirmation.
- **Routing is Case-based, not Omni-Channel** — Omni-Channel + presence configuration is deferred (needs Service Cloud Messaging licence + presence setup that's not in orgfarm's default config). The Queue is the routing surface in v1.
- **Chat replies audit-trail** — every `FeedItem` on an Assessor chat Case counts as an exchange; `Audit_Log__c` is NOT written per-reply (Chatter is the audit layer). This is a deliberate call: the Chatter feed IS the retention record. 90-day purge is a separate scheduled Flow (deferred to a follow-on; FeedItem.CreatedDate age is the signal).
- Controller is `with sharing` of the running user; the FAQ CMT read respects `Assessor_FAQ__mdt` object permissions on the running user's permset — no `WITHOUT SHARING` escape.

## Out of scope
- **Experience Cloud community embed** — the LWC is written as a `lightning__AppPage` + `lightning__RecordPage` target in v1 (orgfarm-first). Adding `lightningCommunity__Page` as a target is a one-line LWC meta edit; blocked here only because INT-011 hasn't provisioned the community site yet.
- **Einstein Bot / Agentforce / LLM intent model** — v1 is a hand-written keyword matcher in the controller. An LLM backend is a follow-on intent, not this one.
- **Service Cloud Messaging / Live Agent / Omni-Channel** — all deferred; the Queue + Case feed is the chat surface.
- **Voice / SMS** — not this intent.
- **Multilingual** — English only in v1.
- **FAQ expansion beyond the four seeded CMT entries** — adding one is a CMT record insert; growing the set is a scope decision, not this build's job.
- **Automated FeedItem retention / 90-day purge** — deferred to a follow-on `/ql-capture-intent`; v1 keeps replies indefinitely.

## Acceptance
Given a logged-in Assessor-persona user on the `PTSF_Patient_Travel_Support` Lightning app home page, when they open the FAQ panel and click the "Application status" accordion, the Answer Body from the `Application_Status` CMT record renders inline — no Case created, no Assessor notified. When they type "when does my patient's assessment close?" into the free-text box and hit Submit, the controller matches `Assessment_Timeline` by trigger phrase and renders its Answer Body — still no Case. When they type a free-text question that matches no trigger phrase ("my patient was asked for extra blood work, is that normal?") and click **Chat with an Assessor**, a new `Case` lands on `Assessor_Chat_Queue` with `Origin='Chat'`, `Description` carrying the full question, `PHI_Flagged__c=false`, and the panel renders the Case's FeedItems with a reply box. A second scene: typing "my patient's diagnosis is unclear" and clicking **Chat with an Assessor** creates the Case with `PHI_Flagged__c=true`, `Subject='[Assessor Chat — PHI flagged]'` (no echo of the user's words in the subject), and the panel shows the "please do not share clinical details here" notice instead of the question echo. A third scene: an Assessor opens the `Chat Queue — Open` list view, clicks the Case, opens the panel, types a reply, hits Submit — a `FeedItem` lands on the Case feed and the original user's panel polls (manually refresh in v1) to show the reply.

## Success criteria
- SC-1: Each of the four seeded FAQ entries resolves inline on its canonical trigger phrase — bot-only, no Case created. Measured by `[SELECT COUNT() FROM Case WHERE Origin='Chat']` being flat across the four accordion opens.
- SC-2: A PHI-stem keyword (`diagnos`/`medic`/`allerg`/`condition`/`illness`/`symptom`) in the inbound question causes `PHI_Flagged__c=true` on the created Case AND the Case's `Subject` contains the literal string `'[Assessor Chat — PHI flagged]'` AND does NOT contain the user's inbound text. Enforced by `AssessorFaqController.createChatCase` and asserted in `AssessorFaqControllerTest.phiKeywordScrubsSubject`.
- SC-3: A **Chat with an Assessor** click creates exactly one Case with `OwnerId = <Assessor_Chat_Queue>.Id`, `Origin='Chat'`, `Status='New'`, and the controller's return value is the created Case Id. Asserted in `AssessorFaqControllerTest.createChatCaseLandsOnQueue`.
- SC-4: `AssessorFaqController.postReply` creates a `FeedItem` on the Case and `getReplies` returns it. Asserted in `AssessorFaqControllerTest.replyRoundTrip`.

## Dependencies

### Internal
- INT-004 — PHI security foundation (kill-list stems derive from `Medical_History__c` field names)
- INT-005 — Assessor users and `Assessor_Base` permission set exist in the org
- INT-022 — `PTSF_Patient_Travel_Support` Lightning app exists (home-page target for the LWC)

### External
_none for v1_ — the orgfarm-first build has no external dependency. The community-embed phase (post-INT-011) depends on Experience Cloud site provisioning, which belongs to INT-011.

## Open questions
- Q-028-1 — **ANSWERED (2026-10-06, Prashant Kumar): working assumption** — four seeded FAQs are Application status · Required documents · Assessment timeline · Assignment acceptance. Clinical lead can tune via CMT record updates post-ship without touching code.
- Q-028-2 — **ANSWERED (2026-10-06, Prashant Kumar): deferred** — no Omni / no callback / no on-shift presence in v1. The Case queue is the routing surface; Assessors see the queue list view when they're on duty.
- Q-028-3 — **ANSWERED (2026-10-06, Prashant Kumar): deferred to follow-on** — 90-day FeedItem purge is a separate intent. v1 keeps replies indefinitely on the Case feed.
- Q-028-5 — **ANSWERED (2026-10-06, Prashant Kumar): working assumption** — PHI kill-list stems are `diagnos · medic · allerg · condition · illness · symptom` (lowercase case-insensitive match). Clinical lead can tune via a Custom Metadata Type if the inventory ever becomes volatile; hard-coded in `AssessorFaqController` for v1.
