<!-- Un-committed ideas, NOT Intent. This is a pre-capture inbox: park a raw idea here in
     seconds so it isn't lost, and come back later. Nothing here is scope — it has no ID, no
     ledger row, no scope hash, and CI never touches it (the intent ledger only walks
     INT-NNN/ dirs, so this file is invisible to `validate`, `drift`, and coverage).

     One idea per line, freeform:  - <one-line idea> — <source, if known>
     Source is best-effort (whoever/whenever it came up); leave it blank rather than hunt for it.
     No status, no priority, no owner, no table — keep it a flat list on purpose.

     Graduate a line into real Intent with `/ql-capture-intent` (it reads this file, classifies each
     line against existing intents, drafts the keepers as `draft` intents seeding the decision
     record from the source note here, and deletes the graduated line). Add lines by hand, or let
     `/ql-capture-intent` park candidates here when you paste notes but aren't ready to commit them. -->

# Backlog — un-committed ideas

_Pre-Intent inbox. Park ideas here fast; graduate them into living Intent via `/ql-capture-intent`._

- Re-enable Chatter + Feed Tracking on Case in orgfarm, then flip `AssessorFaqController.postReply`/`getReplies` and `faqChatPanel` from `CaseComment` back to `FeedItem` so the Assessor reply thread renders in the native Case feed with likes/mentions — INT-028 deploy 2026-10-06 (Chatter was off at org level; CaseComment is the v1 workaround)
- Add `Chat` as a value on the Case.Origin picklist in Setup, then revert `Case/listViews/Chat_Queue_Open` filter from `Subject startsWith '[Assessor Chat'` back to `Origin equals Chat` so routing survives if a future surface writes a chat-originated Case without the subject prefix — INT-028 deploy 2026-10-06 (`Chat` picklist value didn't resolve in list view filters on this orgfarm)
- Provision an Assessor-persona user (e.g. `apac.assessor@ptsf.test.invalid` per INT-005), add the `Assessor_Base` permission set, add them to the `Assessor_Chat_Queue` queue members, and place the `faqChatPanel` LWC on the `PTSF_Patient_Travel_Support` app Home page via Lightning App Builder — INT-028 Scene A (C11) manual walkthrough is blocked until all three are wired
