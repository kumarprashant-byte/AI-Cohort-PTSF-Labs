---
intent: INT-028
phase: 3
authored: 2026-10-06
---

# INT-028 — Test script

**Intent:** Assessor chat with FAQ deflection
**Design:** `intents/INT-028/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-028-C1 | `Assessor_FAQ__mdt` CMT exists with `Topic__c`, `Trigger_Phrases__c`, `Answer_Body__c` and 4 seeded records (Application_Status, Required_Documents, Assessment_Timeline, Assignment_Acceptance) (build target — CMT) | org-probe (see § Org assertions) | ✅ | _pending verify_ |
| INT-028-C2 | `Case.PHI_Flagged__c` checkbox field exists, default false, FLS granted on `Assessor_Base` (build target — PHI flag) | org-probe | ✅ | _pending verify_ |
| INT-028-C3 | Queue `Assessor_Chat_Queue` exists with SObjectType=Case (build target — routing surface) | org-probe | ✅ | _pending verify_ |
| INT-028-C4 | `AssessorFaqController.getFaqs` returns the 4 seeded CMT entries (build target — FAQ read) | `AssessorFaqControllerTest.getFaqsReturnsSeededEntries` | ✅ | _pending CI_ |
| INT-028-C5 | A non-PHI question through `createChatCase` lands a Case on `Assessor_Chat_Queue` with `Origin='Chat'`, `Status='New'`, `PHI_Flagged__c=false`, `Subject` prefixed `[Assessor Chat]` (acceptance scene 2) | `AssessorFaqControllerTest.createChatCaseLandsOnQueue` | ✅ | _pending CI_ |
| INT-028-C6 | A PHI-keyword question (`diagnos`/`medic`/`allerg`/`condition`/`illness`/`symptom`) sets `PHI_Flagged__c=true`, uses `Subject='[Assessor Chat — PHI flagged]'` (no echo of user text), Description still carries the full question (SC-2, acceptance scene 3) | `AssessorFaqControllerTest.phiKeywordScrubsSubject` | ✅ | _pending CI_ |
| INT-028-C7 | `postReply` writes a `FeedItem` on the Case and `getReplies` returns it newest-first (SC-4, acceptance scene 4) | `AssessorFaqControllerTest.replyRoundTrip` | ✅ | _pending CI_ |
| INT-028-C8 | `faqChatPanel` LWC bundle exists with targets `lightning__AppPage` + `lightning__RecordPage` + `lightning__HomePage` and resolves on deploy (build target — LWC) | org-probe | ✅ | _pending verify_ |
| INT-028-C9 | `Assessor_Base` permset grants Case R/C/E, Case.PHI_Flagged__c R/E, FeedItem R/C, Apex class access to `AssessorFaqController` (build target — permset extension) | org-probe | ✅ | _pending verify_ |
| INT-028-C10 | List view `Chat_Queue_Open` on Case filters `Origin='Chat' AND Status != Closed` with `PHI_Flagged__c` visible (build target — Assessor inbound view) | org-probe | ✅ | _pending verify_ |
| INT-028-C11 | End-to-end: Assessor-persona user on the `PTSF_Patient_Travel_Support` app opens the FAQ panel, hits an accordion item inline (no Case), types a trigger-phrase match (`when does my patient's assessment close?` → Assessment_Timeline Answer renders, still no Case), types a non-matching clinical-tinged question → clicks Chat → Case lands on the queue flagged PHI, panel shows the "please do not share clinical details" notice; Assessor opens the Chat_Queue_Open view, replies via the panel, user refreshes and sees the reply (acceptance) | Manual scene A | 👁 | _pending_ |

### Deliberately not tested (out of scope)

- **Experience Cloud community embed** — v1 ships internal only; LWC meta edit is a one-line follow-on when INT-011 provisions the site.
- **Einstein Bot / LLM intent model** — hand-written keyword matcher only in v1.
- **Omni-Channel / Service Cloud Messaging** — Case queue is the only routing surface.
- **Multilingual / voice / SMS.**
- **90-day FeedItem purge** — follow-on intent.

## Automated proofs to write

- **`AssessorFaqControllerTest.getFaqsReturnsSeededEntries`** — assert `getFaqs()` returns ≥ 4 entries; assert the four `DeveloperName`s are present. Runs `@IsTest(SeeAllData=true)` since Apex tests can't insert CMT records.
- **`AssessorFaqControllerTest.createChatCaseLandsOnQueue`** — insert the `Assessor_Chat_Queue` Group in `@TestSetup` (yes, Queues *are* insertable via `Group`+`QueueSobject` in tests); call `createChatCase('where is my application?')`; assert the returned Case has `Origin='Chat'`, `Status='New'`, `OwnerId=<queue.Id>`, `PHI_Flagged__c=false`, `Subject LIKE '[Assessor Chat]%'`.
- **`AssessorFaqControllerTest.phiKeywordScrubsSubject`** — call `createChatCase('my diagnosis is unclear')`; assert `PHI_Flagged__c=true`, `Subject='[Assessor Chat — PHI flagged]'`, `Subject` does NOT contain `'diagnosis'`, `Description='my diagnosis is unclear'`. Repeat for each PHI stem via a loop.
- **`AssessorFaqControllerTest.replyRoundTrip`** — create a Case, call `postReply(caseId, 'hello')`, call `getReplies(caseId)`, assert the FeedItem is returned and its Body is `'hello'`.

## Org assertions

- **INT-028-C1** (CMT): `object-exists(Assessor_FAQ__mdt)` · `field-exists(Assessor_FAQ__mdt.Topic__c)` · `field-exists(Assessor_FAQ__mdt.Trigger_Phrases__c)` · `field-exists(Assessor_FAQ__mdt.Answer_Body__c)` · 4 CMT records present with DeveloperName in (`Application_Status`,`Required_Documents`,`Assessment_Timeline`,`Assignment_Acceptance`).
- **INT-028-C2**: `field-exists(Case.PHI_Flagged__c)` · `field-type(Case.PHI_Flagged__c, Checkbox)` · `fls(read, Case.PHI_Flagged__c, permset=Assessor_Base)` · `fls(edit, Case.PHI_Flagged__c, permset=Assessor_Base)`.
- **INT-028-C3**: `SELECT Id FROM Group WHERE Type='Queue' AND DeveloperName='Assessor_Chat_Queue'` returns one row; `SELECT Id FROM QueueSobject WHERE Queue.DeveloperName='Assessor_Chat_Queue' AND SobjectType='Case'` returns one row.
- **INT-028-C8**: LWC bundle `faqChatPanel` present (`SELECT Id FROM LightningComponentBundle WHERE DeveloperName='faqChatPanel'`); meta targets include `lightning__AppPage` + `lightning__RecordPage` + `lightning__HomePage`.
- **INT-028-C9**: `permset-exists(Assessor_Base)` · Case R/C/E object perms on `Assessor_Base` · `classAccess` for `AssessorFaqController` on `Assessor_Base`.
- **INT-028-C10**: Case list view `Chat_Queue_Open` exists (`SELECT Id FROM ListView WHERE SObjectType='Case' AND DeveloperName='Chat_Queue_Open'`).

## Manual validation scenes

### Scene A — End-to-end FAQ + Chat lifecycle (criterion C11)

1. Log in as an Assessor-persona user (`apac.assessor@ptsf.test.invalid` from INT-005; if absent, log in as sysadmin with the `Assessor_Base` permset temporarily added).
2. Navigate to the `PTSF_Patient_Travel_Support` Lightning app → Home. Confirm the **FAQ & Chat** panel renders with four accordion items.
3. Click the **Application status** item — confirm the Answer_Body text appears inline, no Case created (verify in a parallel tab: `SELECT COUNT() FROM Case WHERE Origin='Chat'` is unchanged).
4. In the free-text box, type `when does my patient's assessment close?` → Submit. Confirm the **Assessment timeline** FAQ answer surfaces inline, still no Case created.
5. In the free-text box, type `my patient was asked for extra blood work, is that normal?` → click **Chat with an Assessor**. Confirm:
   - A new Case lands with `Origin='Chat'`, `Status='New'`, `OwnerId = Assessor_Chat_Queue.Id`, `PHI_Flagged__c=false`, `Subject` prefixed `[Assessor Chat]`.
   - The panel transitions to a reply thread (empty, just placeholder text).
6. In the free-text box, type `my patient's diagnosis is unclear` → click **Chat with an Assessor**. Confirm:
   - New Case with `PHI_Flagged__c=true`, `Subject='[Assessor Chat — PHI flagged]'` (the subject does NOT contain the word "diagnosis").
   - Panel shows the "please do not share clinical details here" notice instead of echoing the question.
7. Open the `Chat Queue — Open` list view on Case — confirm both chat Cases appear, with the PHI_Flagged column clearly showing the second one.
8. Open the second Case, use the panel's reply box to post `We'll reach out directly — please don't share clinical detail in chat.` → Submit.
9. Return to the original panel session (requires a page refresh in v1 — manual refresh is accepted scope). Confirm the Assessor's reply appears in the thread.

**Expected:** FAQ answers inline without a Case; PHI-tinged submission opens a flagged Case with scrubbed subject; non-PHI opens a clean Case; Assessor replies land on the feed and surface in the panel after refresh. **Sign-off:** _name / date / pass·fail_.
