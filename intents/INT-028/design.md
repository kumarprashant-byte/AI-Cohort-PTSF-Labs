---
intent: INT-028
authored: 2026-10-06
status: draft
---

# INT-028 — Design

## Shape

```
┌────────────────────────────────────────┐
│  Lightning App Home / Case Record Page │
│  ┌────────────────────────────────────┐│
│  │  faqChatPanel LWC                  ││
│  │  ─────────────────                 ││
│  │  ▸ Application status      [open]  ││  ← accordion, inline Answer_Body__c
│  │  ▸ Required documents      [open]  ││
│  │  ▸ Assessment timeline     [open]  ││
│  │  ▸ Assignment acceptance   [open]  ││
│  │                                    ││
│  │  Ask something …   [Submit]        ││  ← free-text; controller matches by stem
│  │                                    ││
│  │  [ Chat with an Assessor ]         ││  ← creates Case → queue
│  │                                    ││
│  │  (when a Case is active, this      ││
│  │   section shows FeedItems + reply) ││
│  └────────────────────────────────────┘│
└────────────────────────────────────────┘
                       │
                       ▼
             AssessorFaqController.cls
                 (with sharing)
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
   Assessor_FAQ__mdt  Case          FeedItem
   (4 records,        OwnerId =     ParentId = Case.Id
    read-only CMT)    Assessor_
                      Chat_Queue
```

## Data model

- **Assessor_FAQ__mdt** (Custom Metadata Type) — new. Fields:
  - `Topic__c` Text(80), required, unique.
  - `Trigger_Phrases__c` LongTextArea(1000) — semicolon-separated.
  - `Answer_Body__c` LongTextArea(4000) — rich-ish plain text.
  - Four records: `Application_Status`, `Required_Documents`, `Assessment_Timeline`, `Assignment_Acceptance`.

- **Case** (standard) — one new field:
  - `PHI_Flagged__c` Checkbox, default false. Surfaces in list view + layout.

- **Queue** `Assessor_Chat_Queue` — SOBject = Case. Members = Assessor users (populate manually if INT-005's assessor users haven't landed in orgfarm yet; queue can be empty at create).

- **FeedItem** (standard Chatter object) — nothing custom; used as-is.

## Apex

**`AssessorFaqController`** (`with sharing`, API 60.0):

```apex
public with sharing class AssessorFaqController {
    private static final Set<String> PHI_STEMS = new Set<String>{
        'diagnos', 'medic', 'allerg', 'condition', 'illness', 'symptom'
    };
    private static final String PHI_FLAG_SUBJECT = '[Assessor Chat — PHI flagged]';

    @AuraEnabled(cacheable=true)
    public static List<Assessor_FAQ__mdt> getFaqs() { … }

    @AuraEnabled
    public static Id createChatCase(String question) { … }

    @AuraEnabled
    public static Id postReply(Id caseId, String message) { … }

    @AuraEnabled(cacheable=false)
    public static List<FeedItem> getReplies(Id caseId) { … }

    @TestVisible static Boolean containsPhiStem(String q) {
        if (String.isBlank(q)) return false;
        String lower = q.toLowerCase();
        for (String stem : PHI_STEMS) if (lower.contains(stem)) return true;
        return false;
    }
}
```

`createChatCase` logic:
1. `containsPhiStem(question)` → flagged?
2. Query `Group WHERE Type='Queue' AND DeveloperName='Assessor_Chat_Queue'` for `OwnerId`.
3. Insert `Case` with `Origin='Chat'`, `Status='New'`, `OwnerId=queueId`, `Description=question`, `Subject = flagged ? PHI_FLAG_SUBJECT : '[Assessor Chat] ' + question.left(60)`, `PHI_Flagged__c=flagged`.
4. Return `Case.Id`.

`postReply` logic:
- Insert `FeedItem(ParentId=caseId, Body=message, Type='TextPost')`. Return the FeedItem Id.

`getReplies` logic:
- `SELECT Id, Body, CreatedById, CreatedDate FROM FeedItem WHERE ParentId=:caseId ORDER BY CreatedDate DESC`.

## LWC — `faqChatPanel`

`faqChatPanel.js-meta.xml` targets: `lightning__AppPage`, `lightning__RecordPage`, `lightning__HomePage`. (`lightningCommunity__Page` deferred — flipping it on is a one-line add once INT-011 provisions the site.)

JS skeleton:
- `connectedCallback` → `getFaqs()` populates the four accordion items.
- `handleFreeText` → check inbound against each `Trigger_Phrases__c` lower-cased split-by-`;`; if any token matches as substring, surface that FAQ's `Answer_Body__c` inline. If no match → surface a muted "I don't know this one — try **Chat with an Assessor** below." note.
- `handleChatClick` → disable button, call `createChatCase(question)`, store returned Case Id in state, show reply pane.
- `handleReplySubmit` → `postReply(caseId, message)`, reload replies.
- `refreshReplies` button → `getReplies(caseId)`.

HTML uses `lightning-accordion`, `lightning-textarea`, `lightning-button`, `lightning-card`. Zero third-party deps.

## Permissions

Extend **`Assessor_Base.permissionset-meta.xml`**:
- `objectPermissions`: Case (Read/Create/Edit; Delete=false, ViewAllRecords=false, ModifyAllRecords=false).
- `fieldPermissions`: Case.PHI_Flagged__c (Read/Edit), Case.Subject (readable=true + editable=true — already granted; verify).
- `classAccesses`: AssessorFaqController (enabled).

The `Assessor_FAQ__mdt` object is readable by all users with Setup (Metadata) access, which includes authenticated internal users; no explicit permset entry needed.

## Deployment plan

Deploy order (sfdx package.xml, one `sf project deploy start`):
1. Custom Metadata Type definition (`Assessor_FAQ__mdt.object-meta.xml` + 3 custom fields).
2. 4 CMT records (`Assessor_FAQ.Application_Status.md-meta.xml`, …).
3. `Case.PHI_Flagged__c` field.
4. Queue `Assessor_Chat_Queue` (standard metadata — `.queue-meta.xml` under `queues/`).
5. `AssessorFaqController` class + `AssessorFaqControllerTest`.
6. `faqChatPanel` LWC bundle.
7. `Assessor_Base.permissionset-meta.xml` (modified).
8. List view `Case.Chat_Queue_Open` (metadata).

**Setup-UI post-deploy (runbook, not metadata):**
- Verify Queue members: add assessor users to `Assessor_Chat_Queue`.
- Add the `faqChatPanel` LWC to the `PTSF_Patient_Travel_Support` app's Home page via Lightning App Builder (**or** ship an `AppPage` FlexiPage that includes it — doing the latter so it rides the deploy).

## Alternatives considered

- **Einstein Bot + Service Cloud Messaging** — the "proper" platform way, but needs Digital Engagement SKU and (typically) a provisioned Experience Cloud site. Dropped from v1 to deliver orgfarm-first; preserved in the intent's `Out of scope` as the forward target.
- **Knowledge articles instead of CMT** — more "correct" (dedicated authoring UI, versioning, publication). Requires Knowledge app enablement + Data Category setup. CMT is a 10-line schema, deploys cleanly on every Dev Edition, and the authoring UX gap doesn't matter for four static FAQs. Revisit when the FAQ corpus grows past ~20 entries.
- **Chatter group instead of per-Case feed** — simpler routing (every Assessor sees the group). Rejected: Chatter group has no per-question lifecycle (open/closed/owner), no PHI flag surface, and no Omni-compatible shape for later. Per-Case feed is a straight line to a real routing model when licence lands.
- **Platform Events for reply push** — would make the panel reply-live without polling. Rejected for v1 scope; the user manually refreshes. Platform Events wiring is a clean follow-on.

## Risks

1. **Queue member provisioning on orgfarm** — INT-005's Assessor users may not exist. Mitigation: queue is created empty; populate via Setup UI after deploy. The FAQ side still works for anyone, and the Chat side creates the Case correctly (owned by the queue); replies just stall until a human claims from the queue.
2. **Case `Origin` picklist** — standard, `Chat` is a default value. Confirm the orgfarm hasn't removed it (`sf sobject describe --sobject Case` on deploy).
3. **FeedTracking on Case** — Chatter feed on Case must be enabled. It is by default; a hardened org could have disabled it. Deploy-time check only; if off, `postReply` throws — surface clearly, don't eat.
