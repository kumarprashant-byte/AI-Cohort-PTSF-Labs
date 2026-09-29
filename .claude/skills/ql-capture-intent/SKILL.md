---
name: ql-capture-intent
description: >-
  Turn notes, a transcript, or a stakeholder ask into living Intent — draft net-new intents, route changes to /ql-refine-intent, bundle a small post-delivery fix into a bundle intent, or park a raw idea on the backlog. Triggers — "capture this as an intent", "we agreed to add", "bundle these fixes", "park this", "graduate the backlog", "/ql-capture-intent".
produces: New draft `intents/INT-NNN/intent.md` files (origin local, confidence draft) + a `decisions/` record citing the source, plus a ledger row and refreshed index; routes each "change existing" candidate through /ql-refine-intent; appends PARK candidates as one-liners to `intents/BACKLOG.md` (no intent, no decision record, no ledger row). No commit.
---

# Capture intent — real-world input → living Intent

Scope doesn't only arrive from Scopezilla. On a live engagement it arrives in meeting notes, a transcript, a Slack thread, a stakeholder "can it also…". This skill is the sanctioned path from that raw prose to **structured, living Intent** — so a new requirement becomes a real intent (traceable, provable, sequenced) instead of getting built off a comment or lost in a doc.

It's the **intake door**, and the input is usually unsorted: some of it is net-new, some refines intents you already have, some is already covered — and **some is a real idea nobody's ready to commit to Intent yet.** So this skill *classifies and routes*: it drafts the genuinely new intents itself, hands the targeted changes to **`/ql-refine-intent`**'s mechanics, and **parks the not-yet-committed ideas on a lightweight backlog** (`intents/BACKLOG.md`) so they're logged without the ceremony of becoming Intent. (See "Using capture + refine together" below — that combination is the norm, not the exception.)

> **The backlog is *pre-Intent*, and lives outside the trust apparatus on purpose.** A parked line has no ID, no ledger row, no scope hash, and CI never touches it — it's a shared inbox, not scope. Rigor lands *at graduation*, when a human ratifies a line into a real intent. This is the cheap counterpart to the full extract-classify-draft-record flow: park now, commit deliberately later. See **Step 4c — Park a candidate to the backlog** and **Graduating backlog lines into Intent** below.

> **Authorship stays human.** Everything here is a **proposal**. You extract, classify, and draft; the Trusted Guide ratifies what becomes Intent. New intents are born `confidence: draft` for exactly this reason — they're candidates until a human stands behind them. When the Trusted Guide ratifies one, record it with `node scripts/intent-ledger.mjs ratify INT-NNN --by "<their name>"` (only on their say-so); `deliver` refuses an unratified draft.

## Step 1 — Take the input and the context

The user points at the source: a pasted block, a path (`delivery/notes/2026-06-09-standup.md`), a transcript, an ask. Note **where it came from and when** — that provenance goes into every decision record this skill writes. Establish the current phase (for classification), as `/ql-check-scope` does.

> **The dirty-source membrane applies (AGENTS.md → Working conventions).** A transcript or discovery note is exactly what it guards: record provenance as a **pointer, never a quote** ("from the 7/23 UAT call", not a pasted line), and write the intent and decision record as clean derived prose. Unlike `/ql-ingest-scopezilla --grill`, capture works from smaller, distilled input and runs no separate scrub — writing clean is the control.

> **Check you're on the latest first (warn, don't block).** On a team where several people edit intents in parallel, adding or changing scope off a stale copy silently overwrites someone's work. Run the currency check up front:
>
> ```bash
> node scripts/intent-ledger.mjs currency
> ```
>
> If it reports the branch is **behind** the shared branch, offer to `git pull --rebase` before writing so you're building on the current set — but this is a **nudge, not a gate** (offline / VDI is fine; CI drift is the real backstop). Per-intent divergence is checked at the point of a specific change (Step 4b routes to `/ql-refine-intent`, which re-checks the one intent it's about to edit).

## Step 2 — Extract candidate intents

Read the input and pull out discrete *outcomes someone wants* — each a candidate intent. Be conservative about what counts: a candidate is a buildable capability or a concrete change to one, not every passing remark. But be **exhaustive** about finding them — account for every distinct outcome the input raises, not just the obvious first two, and restate **all** of them as one-line outcomes ("Enforce duplicate-blocking on Contact, not just Account") in the confirmation table before anything is written. This extraction feeds every step downstream; a thin pass here silently narrows the whole capture, and the confirm-the-table gate can only check what you surfaced. Read the input to its end before you call the list complete.

## Step 3 — Classify each candidate (reuse /ql-check-scope)

This is the same reasoning `/ql-check-scope` does — run its digest and judge each candidate against the existing intents:

```bash
node .claude/skills/ql-check-scope/scope-digest.mjs --phase <current-phase> --deps \
  || node .agents/skills/ql-check-scope/scope-digest.mjs --phase <current-phase> --deps \
  || node "${CLAUDE_PLUGIN_ROOT}/skills/ql-check-scope/scope-digest.mjs" --phase <current-phase> --deps
```

Land each candidate in one bucket:

- **NET-NEW** — nothing covers it, and it's genuinely in scope to pursue *and to commit now*. → Draft a new intent (Step 4a).
- **CHANGE TO EXISTING** — it refines, corrects, resequences, or adds a dependency to an intent that already exists **and is still in flight** (not yet delivered). → Route to `/ql-refine-intent` (Step 4b).
- **BUNDLE** — a **sub-capability-sized** change (a validation rule, a setting, a moved field, a regression fix from testing) that's **tied to a trigger** — remediation from regression/UAT, IT feedback, a batch of UX cleanups. Too small to be its own capability; parking it builds nothing; a full standalone intent is more ceremony than it's worth. → Attach it as an item to the active phase+trigger **bundle intent** (Step 4d). *Distinct from NET-NEW:* a genuine new capability is still its own intent — the bundle is only for what's below capability size.
- **PARK** — it's a real, new idea, but nobody's ready to commit it to Intent yet (it needs grooming, it's a "wouldn't it be nice", it's a whole batch someone wants logged without triaging). → Append a one-liner to the backlog (Step 4c). *Distinct from ALREADY COVERED:* PARK is **not** yet covered — it's uncommitted, not handled.
- **ALREADY COVERED** — an existing intent (or a future-phase one) already says this. → No-op; tell the user which intent, so they know it's handled.
- **GATED / UNDECIDED** — it depends on something not yet decided. → Don't draft a committed intent; capture it as an open question on the most relevant intent, or a decision to make. Name what has to be settled first.

Show the classification table and **confirm with the user before writing anything.** When you draft the intent prose, sweep it against `.claude/prose-style.md` first — a clean, plain-English intent, no AI tells (`AGENTS.md` → "Write clean the first time").

> **Closed is closed — default a follow-on to a *delivered* intent to NET-NEW, don't reopen.** When a candidate maps to an intent that's already **delivered/tested** (✅ in `delivery/intent-ledger.md`), the default disposition is **NET-NEW** — a fresh intent that *cites* the delivered one — **not** CHANGE-TO-EXISTING. Reopening a proven intent is allowed (some projects want it), but it's a deliberate call the human makes, not the default: an "offshoot" of finished work — the content for pages you already shipped, a phase-2 capability on a delivered phase-1 — is almost always its own intent. **When the follow-on is sub-capability-sized** — a regression fix, a settings tweak, a small cleanup on something delivered — it's **BUNDLE**, not a fresh capability intent: attach it to the phase's remediation/cleanup bundle (Step 4d) and leave a pointer back on the delivered intent's test script. That's the answer to "do I really need a whole new intent for a validation rule?" — no. Reopening also trips scope-drift on the delivered row (that's the system working, not a bug), which is exactly why a *new* intent is usually cleaner. So when you see this, **flag it and let the human choose**: "INT-012 is delivered. This reads like an offshoot — I'll draft it as a new intent citing INT-012. Reopen INT-012 instead? [new / reopen]". This is *recommend, not block* — the point is to stop silently reopening finished work, not to forbid it. (This is why a delivered intent that named its **out-of-scope boundary** makes the call easy — see Step 4a.)

> **A mixed transcript sorts per-candidate, in one pass.** A pasted meeting transcript typically contains all of these at once — a couple of net-new intents, a change to INT-012, something already covered, and a handful of ideas to just park. That's the normal case: extract once (Step 2), disposition each row here, confirm the table, then execute each bucket. The user doesn't pre-declare "this is a capture" vs "this is a backlog dump."
>
> **Skippable digest on an explicit dump.** The digest runs by default and *improves* the table (it catches "you already have this" so the backlog doesn't fill with duplicates of committed scope). But if the user explicitly says *"just park all of this, don't classify"*, honor it: skip the digest and append every candidate to the backlog (Step 4c). Parking is allowed to be sloppy and redundant — dedup is a graduation-time concern, not a park-time one.

## Step 4a — Draft a net-new intent

Scaffold it (this allocates the next free id, stamps `origin: local`, `confidence: draft`):

```bash
node scripts/intent-ledger.mjs new --phase <N> --title "<one-line outcome>"
# prints the new id, e.g. INT-041, and the file path
```

Then fill `intents/INT-041/intent.md` from what the input actually supports:

- **Outcome** (optional `## Outcome`) — the business "why" this intent exists: a one-line summary of the change in the world it produces, in the input's own terms. If the input states a real, measured baseline and target ("cut stale pipeline from 34% to under 10% within a quarter"), add `- Baseline:` / `- Target:` / `- Window:` bullets under it; otherwise write just the summary, or omit the section. Don't fabricate a metric — an absent baseline is honest. This is context, not a build instruction (it's excluded from the scope hash); the *provable* measurable criteria go in `Success criteria`.
- **Build target / Acceptance** — what to build and how you'll know it's done, in the input's own terms. Write acceptance as a **concrete walkthrough with a named actor and a realistic, observable outcome** ("a practitioner assigned to an open application opens the record and sees the medical-history panel; once the application closes, the same practitioner no longer sees it") — the named actor + observable result is what makes it provable. Reach for **Given/When/Then** scenarios only where a behavior has **discrete branches** (a permission matrix, several edge cases) that a grid proves more precisely than prose. The goal is **verifiable acceptance**, not a particular format — prose and GWT are both fine when the success is observable and specific. Where the input is silent, write an **`## Open questions`** `Q-xxx` rather than inventing a guardrail — an honest gap beats a fabricated requirement.
- **Success criteria** (optional `## Success criteria`) — if the input implies measurable outcomes ("within one refresh", "zero leaked rows"), capture them as `- SC-1: …` (technology-agnostic, objectively checkable). They sharpen provability and feed `/ql-test-script` directly. Skip if the input genuinely supports none — don't invent metrics.
- **Guardrails / Out of scope** — only what's stated or clearly implied. Don't pad. **One nudge that earns its place:** if this intent ships a **deliberately partial slice** — the pages but not their content, phase-1 of a bigger capability, the structure before the data — *name what it is not doing here.* That explicit boundary is what makes the follow-on work (the content, phase-2) cleanly a **new intent** later instead of an ambiguous reopen of a delivered one (the exact confusion the "closed is closed" default in Step 3 exists to prevent). This isn't padding — it's the difference between "we deferred X" being provable scope and being a silent gap. One exception to "only what's stated": if the intent acts on **personal/protected data** or drives an **automated decision about a person**, and the input describes any of the AUP-sensitive cases below, don't let the safeguard fall into unremarked silence — but resolve it the way this skill resolves every gap: **a stated safeguard becomes a guardrail; an unstated one becomes an `## Open questions` `Q-xxx`, never an invented guardrail.** The AUP-sensitive cases to watch for: automated decision-making with legal or similarly significant effect on a person; biometric identification / facial recognition; inference/prediction of a protected characteristic (race, religion, health, etc.); individualized regulated advice (legal/medical/financial). `/ql-vet-intent`'s *Ethically grounded* dimension is the fuller check — this is just the note to not silently drop the topic at capture time.
- **Dependencies** — if the ask names another team / system (the common "this needs Billing to…"), add it under `### External`. If it depends on another intent shipping first, add it under `### Internal`.
- Leave `confidence: draft` — it's a proposal until ratified.

Once drafted, **vet it for build-readiness** before it goes to the Trusted Guide — run the `/ql-vet-intent` reasoning over the new file (is the build target concrete, the acceptance provable, the silence honest, the cascading work and dependencies acknowledged?). A draft authored from prose is exactly where vagueness creeps in, so catch it now: fold any ⛔/⚠️ findings back into the draft (you're still authoring it, so editing here is fine — it isn't committed Intent yet), or, where the input genuinely doesn't say, leave an honest `Q-xxx` rather than guess. This makes the proposal you hand over already buildable.

## Step 4b — Route a change to an existing intent

Don't re-implement editing here — apply `/ql-refine-intent`'s mechanics (edit the file, keep the format, change `phase:` for resequencing, etc.). The one difference: the *source* of the change is this input, so the decision record cites the meeting/ask. If you're running capture over a batch, make each refinement its own clean edit + decision so the trail stays per-change.

## Step 4c — Park a candidate to the backlog

For a **PARK** candidate, do the cheap thing: append one line to `intents/BACKLOG.md`. **No intent file, no decision record, no ledger row, no scope hash, no vet.** That's the whole point — parking is pre-Intent. If the candidate is a `deferred-backlog` 👁 criterion from `/ql-record-test-execution`, also append ` / → intents/BACKLOG.md` to that criterion's Sign-off cell so `coverage` reads the deferral as routed.

If `intents/BACKLOG.md` doesn't exist yet (an engagement seeded before this file shipped, and not yet `/ql-resync`'d), **create it** with its header first — mirror the seeded template exactly:

```
<!-- Un-committed ideas, NOT Intent. … (the header block from templates/intents/BACKLOG.md) -->

# Backlog — un-committed ideas

_Pre-Intent inbox. Park ideas here fast; graduate them into living Intent via `/ql-capture-intent`._
```

Then append each parked candidate as one freeform line:

```
- <one-line outcome, in the input's own terms> — <source, if known>
```

- **One idea per line.** No table, no ID, no status, no priority, no owner — keep it flat on purpose. If you find yourself adding a column, stop: that's the backlog turning into a worse Jira, the exact thing it exists to avoid.
- **Source is best-effort, never hunted.** Note whatever you already know — "from the 7/23 UAT call", "from the pasted transcript" — and leave it blank rather than round-trip through the Google MCP to pin it down. (The provenance hunt is the ceremony PARK exists to skip; the *real* provenance gets established at graduation, when the line earns a decision record.)
- **Don't dedup against the existing backlog.** Redundant lines are fine here; graduation is where duplicates get resolved.

## Step 4d — Attach a small change to a bundle intent

Some changes are real but **sub-capability-sized** — a validation rule, a setting, a moved field, a regression fix testing turned up. Making each its own intent (branch, design, test script, PR) is more ceremony than the change is worth, and parking builds nothing. The sanctioned home is a **bundle intent**: a normal intent whose organizing principle is a **trigger** — remediation from regression/UAT testing, IT feedback, a batch of UX cleanups — instead of a single capability. It rides the same rails as any intent (ledger row, test script, PR); only the organizing principle differs, so there's no new machinery.

**Cut a bundle when its items are known and unblocked, and build it promptly — don't hold it open as a bucket.** A bundle that accumulates every loose end until the end of the phase and ships in one deferred big-bang is the anti-pattern this exists to avoid: proof gets deferred and "done" stops meaning "proven." If more items arrive after a bundle is built, cut a **round-2** bundle (`Remediation — Phase 1, round 2`). A blocked item never stalls the bundle — it waits for the next round.

To attach a candidate:

- **Find or open the bundle** for this phase + trigger. If none is in flight, scaffold one like any intent and title it by its trigger so what it collects is legible:

  ```bash
  node scripts/intent-ledger.mjs new --phase <N> --title "Remediation — Phase <N>"
  # or "UX enhancements — Phase <N>", "IT feedback — Phase <N>"
  ```

  `new` opens its `⬜ Not started` ledger row itself (see Step 6), so there's no row to add. It's `origin: local`.
- **Add the change as its own line in the bundle's `## Acceptance`**, never a vague "misc fixes" line. Each item becomes a discrete proof criterion so the test script stays honest — a bundle is only trustworthy if every item in it is individually proven. `/ql-test-script` decomposes the acceptance into `INT-0xx-Cy`, one per item.
- **Cite each item's source** (the regression that found it, the UAT session, the delivered intent it follows). The bundle's decision record (Step 5) carries the provenance.
- **When an item is a deferred fix for a *delivered* intent**, leave a pointer on that intent's **`test-script.md`** criterion — e.g. `🔁 fix landed in INT-0xx-Cy` — so the fix is findable from where the gap was found. Put it in the **test script, not `intent.md`**: editing the delivered intent's hashed scope (title/build target/guardrails/out-of-scope/acceptance) would trip false drift, but the test-script body doesn't feed the scope hash, so a pointer there is safe.

A change that's actually a **new capability** (not sub-capability-sized) still becomes its own intent — the bundle is the pressure valve for everything below capability size, not a way to dodge scoping real work.

## Step 5 — Record decisions citing the source

Each new intent and each change gets a `decisions/YYYY-MM-DD-<slug>.md` entry whose **Context names the source** ("From the 2026-06-09 discovery call with Finance IT…"). This is what makes a field-authored intent as traceable as a scoped one: anyone can see what conversation it came from. For a batch from one meeting, one decision file covering all the candidates is fine — list each intent it created or changed.

**PARK candidates get no decision record** — a backlog line isn't committed scope, so it doesn't earn one. Its cheap source note (Step 4c) is the only trail until it graduates.

## Step 6 — Validate, ledger, index

```bash
node scripts/intent-ledger.mjs validate          # everything parses, deps resolve, no phase inversions
```

`new` already opened a `⬜ Not started` ledger row for each intent it scaffolded and refreshed the README index in the same run, so there is no row to add by hand. If an intent reached `intents/` some other way — a hand-authored directory, or one scaffolded before `new` owned this — close the gap and re-derive the index:

```bash
node scripts/intent-ledger.mjs sync             # open any missing row, refresh the footer count + README index
```

`validate` (above) hard-fails on an intent directory with no ledger row, and on a row with no directory, so a missed row surfaces here rather than weeks later. An intent with no row is invisible to every status gate — there is nothing to check, so nothing complains.

If any **change** touched a Delivered intent, run `drift` and surface the re-verify, exactly as `/ql-refine-intent` Step 4 describes.

## Step 7 — Report

Summarize: candidates found, how each was classified, which new intents were drafted (ids + `draft` status), which existing intents were changed, which small changes were **attached to a bundle** (and which bundle, opened or existing), what was **parked** to the backlog, what was already covered, and any open questions you opened instead of guessing. Make clear the new intents are **drafts awaiting the Trusted Guide's ratification** — and that ratifying may mean promoting `confidence: draft` to a real level via `/ql-refine-intent`. For parked lines, note they're logged as un-committed ideas, graduatable later with `/ql-capture-intent`.

## Graduating backlog lines into Intent

The reverse trip: turn parked ideas into real Intent. When the user points at the backlog ("graduate the backlog", "let's turn these backlog ideas into intents", or just re-runs capture over `intents/BACKLOG.md`), treat each **line** as a candidate and run the normal flow — Steps 2–6 — with two specifics:

- **The line's inline source seeds the decision record.** When a graduated line becomes a real intent (Step 4a) or a change (Step 4b), the source note you jotted at park time ("from the 7/23 UAT call" — a pointer, never a name; see the dirty-source membrane) is the **starting point for that decision record's Context** — don't re-hunt provenance you already captured. If the line's source was left blank, *now* is when to ask, because it's becoming committed Intent and earning a real trail.
- **A cluster of small items can graduate into one bundle.** When several parked lines are sub-capability-sized and share a trigger (a run of regression fixes, a pile of UX cleanups), disposition them **BUNDLE** and attach them as items to one bundle intent (Step 4d) rather than cutting an intent per line. Show the batch ("these 4 lines → INT-0xx UX enhancements") before writing.
- **Delete each graduated line — but show it first.** A line that becomes an intent (or that the user confirms is already covered / no longer wanted) is **removed** from `intents/BACKLOG.md`, so the file stays a *live* inbox rather than an archive. Per the repo's move-aside discipline, don't silently blast lines: as part of the confirm-the-table step, show which lines you're clearing and why ("these 3 graduated to INT-041/042/043; removing them from the backlog"), then remove them on approval. The intent's decision record — citing the backlog source — is the durable record that the idea existed; the git history of `BACKLOG.md` is the backstop. A line the user wants to *keep parked* stays.

## Using capture + refine together (the normal case)

These two skills are designed to interlock — reach for the combination, not just one:

- **Notes that both add and change** → `/ql-capture-intent` is the entry point. It drafts the new intents and, for each "change existing" candidate, applies `/ql-refine-intent`'s mechanics. One invocation, both kinds of outcome.
- **A known, single edit** ("move INT-007 to phase 1", "add a NetSuite dependency to INT-012") → go straight to `/ql-refine-intent`. No extraction needed.
- **A net-new idea with no document behind it** ("we should also handle Person Accounts") → `/ql-capture-intent` with the ask as the input; it'll classify, and if it's truly new, draft it.

Rule of thumb: **unsorted prose → capture; targeted edit you can name → refine.** Capture leans on refine; refine never needs capture.

## What this does NOT do

- It does **not** ratify scope. New intents are `draft` proposals and **parked backlog lines are even less than that — pre-Intent, outside the ledger/hash/CI entirely**; the Trusted Guide decides what becomes committed Intent. You never promote your own draft to delivered scope, and a parked line is not scope at all until it's graduated and ratified.
- It does **not** invent requirements to fill gaps. Where the input is silent, it writes an open question, not a guardrail.
- It does **not** talk to the customer or pull from Jira. It works from input the human brings it; status projection stays one-way via `/ql-sync-jira`.
- It does **not** replace `/ql-ingest-scopezilla`. A fresh Scopezilla run still comes in through ingest + reconcile; this skill is for scope that originates *in the engagement*, captured as `origin: local`.
