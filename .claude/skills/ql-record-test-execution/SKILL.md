---
name: ql-record-test-execution
disable-model-invocation: true
description: Guide a QA professional through running an intent's manual test-script criteria and capture a commit-pinned, PR-ready execution record, drafting a defect on any failure.
produces: A new `intents/INT-00x/test-evidence/{date}-{commit}-execution-report.md` per run (historical — never overwritten) and, on any failure, one `intents/INT-00x/test-evidence/defect-INT-00x-00n.md` per failed criterion. Updates the Sign-off cell of the criteria just run in `intents/INT-00x/test-script.md`. When every criterion in the intent's test script is pass/proven or explicitly deferred, offers to run `intent-ledger.mjs deliver` — the only case this skill writes `delivery/intent-ledger.md`; otherwise ledger writes stay `intent-ledger.mjs start`/`deliver`'s job, run by hand. After the QA professional confirms the evidence looks correct, optionally commits/pushes it and opens (or updates) a PR into `develop`, and — opt-in — posts a plain test-execution summary comment to the intent's Jira issue.
---

# Record test execution — guided manual evidence capture

This skill is for a QA professional sitting down to actually **run** an intent's manual criteria and walk away with proof — not for someone who already knows the artifact schema. You drive; they answer plain questions. Every run produces a **new** file — this is a historical record, safe to re-run any number of times against the same intent as the build evolves.

**Manual only.** This skill never touches ✅ automated criteria — those are proven by CI (`node scripts/intent-ledger.mjs coverage --results`), not by a guided human walkthrough. It operates on 👁 manual criteria, and the manual half of ⚠️ partial criteria.

**Where this sits in the trust chain.** `/ql-test-script` *authors* the proof plan and leaves every 👁 Sign-off cell `_pending_` — an agent can't sign a manual pass. CI's `coverage --gate` proves the ✅ half. This skill is the missing middle: it walks the human through the 👁 half and turns their pass into a commit-pinned artifact instead of an unrecorded assertion. The human's signature stays the human's — this skill only records the act, it never performs it.

**Multiple-choice questions.** The steps below reach for `AskUserQuestion` because a verdict should be a pick, not typed prose. In a harness without it, ask the same question as plain text with the options enumerated — the shape of the question matters, the tool doesn't.

## Step 1 — Resolve the intent and pick what to run

Ask which intent (e.g. `INT-002`) if not given. Load `intents/INT-00x/test-script.md`. If it doesn't exist, stop and say so — point at `/ql-test-script` to author it first; this skill only *executes* an existing proof plan, it doesn't invent one.

Filter to **👁 manual** and **⚠️ partial** rows. Group by their "Manual validation scenes" section (scenes already bundle related criteria into one runnable walkthrough — that grouping is exactly what the QA professional should run against, not the raw criteria table).

Present the scenes plainly, e.g.:

> INT-002 has 4 manual scenes ready to run:
> - **Scene A** — Guest navigates the site with no login (C1, C2, C3, C20, C22, C23)
> - **Scene B** — Responsive & multi-device (C12, C13, C14)
> - **Scene C** — Visual parity with the reference site (C16–C19, C24)
> - **Scene D** — Guest security review (C6, C7, C8, C21)
>
> Which one are you running today? (You can run more than one in this session.)

If asking via `AskUserQuestion`, set `multiSelect: true` so the QA professional can pick several scenes at once (space bar to toggle each) instead of running the question repeatedly. Run the selected scenes one at a time, in the order picked, each through Steps 3–4 below before moving to the next.

A criterion with no scene (rare) is walked as its own one-step scene.

## Step 2 — Capture the run's identity automatically

Never ask the QA professional to type these — derive them:

```bash
git rev-parse HEAD          # commit hash at current branch HEAD
git rev-parse --abbrev-ref HEAD   # branch name
```

Ask only for the **environment** the run is against — a plain free-text question (e.g. "Which environment/org is this run against?"). Don't default or suggest a value; let them tell you.

For the QA professional's **name** (attribution/sign-off — this is their signature, not the agent's), don't make them type it and don't stop to ask a confirmation question either: run `git config user.name`, state it plainly as what you're using ("Signing off as {name}, per your git config — say so if that's wrong"), and proceed. Only pause on this if they correct you.

## Step 3 — Walk the scene, step by step

**Know the shape you're reading first.** `/ql-test-script` writes a scene as numbered steps with the expectation folded **into the step text** (bolded — "confirm **no Medical History Entries tab** in the nav"), plus **one scene-level `**Expected:**` line** summarizing the whole walkthrough. There is no per-step "Expected Result" field. So a step's expectation is whatever that step asserts, and the scene's `**Expected:**` line is the backstop when a step's own text is thin. Don't wait for a field that isn't there, and don't rewrite the scene to add one.

**Map steps to criteria before you start.** Sign-off is per **criterion**, but you walk per **step**, so you need the mapping. Two sources give it to you, in order:

1. **The criteria table's "How proven" column** — the authoritative link. A 👁 row reads `Manual scene A`, so every criterion whose cell names this scene is a criterion this scene proves. Start there; it's the same join the table, matrix, and ledger already use.
2. **The scene header** — `### Scene A — … (criteria C2)` restates it, and a step that names its own criterion settles that step.

Where a multi-criterion scene still doesn't say which *step* proves which *criterion*, **ask the QA professional once, up front** — show the criteria and the steps and let them confirm. Don't silently guess: a wrong guess signs off the wrong criterion, which is worse than no sign-off. If they don't know either, treat the scene's criteria as **jointly** proven — each passes only if every step passed — and say that's what you're doing, so the report doesn't imply a precision the run didn't have.

Read the scene's numbered steps straight from `test-script.md` and present them **one at a time** before moving to the next. Don't dump the whole scene at once; that defeats "guided."

Never present a step as plain text and wait for a typed reply. The step and the pass/fail picker are **one single `AskUserQuestion` call** — put the step text in the `question` field itself, with **Pass** / **Fail** / **Defer** as the three options, and send it immediately after describing the step. There is no separate "go do this and tell me" message in between. Free text is fine for anything the QA professional volunteers beyond the verdict (a note, an aside) — `AskUserQuestion` always offers an "Other" fallback for that — but the verdict itself is always a pick, never typed prose.

**Defer** means the QA professional is telling you this criterion isn't being run to pass/fail at all right now — it's been judged good enough as-is, or it's being pushed to the backlog for later. That's a scope call, not a test result, so treat it differently from Pass/Fail: don't walk the rest of the step's assertion, and go straight to Step 4a instead of continuing the scene.

Record each step's outcome as you go (pass/fail/defer + any note they volunteer).

## Step 4 — On any step failure: two questions, then you draft the repro

The moment a step fails, stop advancing through the scene. Since Step 3 asks pass/fail **one step at a time**, you already know exactly which step just failed — do **not** ask a separate "which step failed?" question re-covering every step of the scene; that's redundant with the per-step question the QA professional just answered, and asking it again reads as not having listened. Ask exactly **one** thing:

- **"What happened — what did you actually see, vs. what was expected?"**, scoped to *only* the step that just failed.

Use `AskUserQuestion` (multiple-choice), decomposing **what that failing step asserts** into its distinct clauses — one option per clause that could have gone wrong (e.g. a step asserting both "a styled header" and "the blurb is present and readable" gets a header option *and* a blurb option, not just one). Take the clauses from the step's own text, falling back to the scene's `**Expected:**` line when the step is terse. Options must cover that step's failure space, not a narrow guess. `AskUserQuestion` always adds an "Other" choice for free text — don't skip writing good options because of that fallback; a QA professional who has to reach for "Other" every time is a sign the clauses weren't decomposed finely enough.

(If, in some rare case, it's genuinely ambiguous which step the failure belongs to — e.g. the QA professional volunteers a note that spans two steps — ask a clarifying question then. Don't ask it by default.)

Do **not** ask them to write out reproduction steps themselves. You draft those, using material you already have:

- The scene's own numbered steps **up to and including** the failing one (already precise, already reviewed prose — reuse it verbatim as the repro path).
- Their answer to "what happened" as the **Actual Result**, contrasted against what the step asserts (its own text, or the scene's `**Expected:**` line) — already reviewed prose in `test-script.md`.
- The captured environment, branch, and commit hash (so the defect is pinned to exactly what was tested).

This keeps the QA professional's burden at two short answers per defect; the write-up is your job.

After drafting, ask a scene-level question: **"Continue to the next step, skip the rest of this scene, or stop the session?"** — a failure in one step doesn't necessarily block the rest of the scene's independent checks.

## Step 4a — On a Defer: two questions, then note it plainly

A deferral is a scope decision wearing a test-execution hat — this skill records that it happened, but it does not itself change scope, and it does not require the formal scope edit to happen first. Ask exactly two things, both multiple-choice:

- **"Why defer this one — good enough as-is, or push to the backlog for later?"** — options **Accepted as-is** / **Backlog for later**.
- **"Anything to note for whoever formalizes this?"** — free text, optional (a one-line reason is enough: "cosmetic, low priority", "needs a follow-on intent").

Don't ask them to draft the scope edit themselves — that's not this skill's job (see below). Record the disposition and note against the criterion, then continue the scene (a deferral doesn't stop the walkthrough the way a failure does — there's no repro to draft and nothing blocking the rest of the scene's independent checks).

**This skill never edits `intent.md`, `out_of_scope`, or `intents/BACKLOG.md`.** Deferring a criterion here is a *recorded observation*, not a *ratified scope change* — that distinction is the whole reason scope edits are their own governed skills. Tell the QA professional, once per session (not per criterion), that the deferred item(s) still need a follow-up: **"Accepted as-is"** routes to `/ql-refine-intent` (updates the intent's acceptance/guardrails to match what's actually being shipped); **"Backlog for later"** routes to `/ql-capture-intent` (logs it to `intents/BACKLOG.md`). Name which criteria need which, and leave it there — don't invoke those skills yourself mid-session.

## Step 5 — Write the execution report (new file, every run)

Determine the next sequence-free, collision-safe filename:

```
intents/INT-00x/test-evidence/{YYYY-MM-DD}-{commit-short}-execution-report.md
```

Use the short (7-char) commit hash. If a file with that exact name already exists (two runs same day, same commit), append `-2`, `-3`, etc. — never overwrite.

```markdown
---
intent: INT-00x
executed_by: {name}
executed_at: {ISO date/time}
environment: {environment}
branch: {branch}
commit: {full commit hash}
type: manual
---

# Test Execution Report — INT-00x — {date}

**Intent:** {intent title}
**Environment:** {environment}
**Branch @ HEAD:** `{branch}` @ `{commit-short}` (`{commit}`)
**Executed by:** {name}
**Executed at:** {timestamp}

## Scenes run

### Scene {X} — {scene title} (criteria {ids})

| Step | Result | Notes |
|------|--------|-------|
| 1. {step text} | ✅ PASS | |
| 2. {step text} | ❌ FAIL | See defect-INT-00x-00n.md |
| 3. {step text} | ⏭️ DEFERRED | Accepted as-is — {note} |
| 4. {step text} | ⏸️ NOT RUN | Session stopped after step 2 failure |

**Criteria outcome:** C1 ✅ · C2 ❌ (defect-INT-00x-00n) · C3 ⏭️ deferred (backlog) · C4 ⏸️ not run

[repeat per scene run this session]

## Summary

**Criteria run:** {n} · **Passed:** {n} · **Failed:** {n} · **Not run:** {n}
**Defects filed:** {list of defect files, or "none"}
```

## Step 6 — On failure, draft the defect

One file per failed criterion (a scene with two independent failing criteria gets two defect files — don't merge unrelated failures into one record). Next available number:

```
intents/INT-00x/test-evidence/defect-INT-00x-{NN}.md
```

Scan the intent's existing `test-evidence/` directory for the highest `defect-INT-00x-NN.md` already present and increment; start at `01`.

```markdown
---
intent: INT-00x
criterion: INT-00x-Cy
severity: {ask briefly: blocking / major / minor — offer "major" as default if unsure}
status: open
found_by: {name}
found_at: {ISO date/time}
environment: {environment}
branch: {branch}
commit: {full commit hash}
# Resolution fields — added as the defect moves through its lifecycle; leave off until then:
#   fixed: {date}          fixed_in: {branch or PR the fix rode}
#   verified: {date}       verified_by: {name}   verified_commit: {sha retested against}
#   deferred_by: {name}    deferred_pointer: {follow-on INT-NNN / decisions/… / waiver}
---

# Defect — INT-00x-Cy — {short title derived from the criterion}

**Criterion:** INT-00x-Cy — {criterion text from test-script.md}
**Found by:** {name} · {date} · {environment} · `{branch}` @ `{commit-short}`

## Expected result

{what the failing step asserts, verbatim from test-script.md — its own text, or the scene's **Expected:** line if the step is terse}

## Actual result

{the QA professional's "what happened" answer, lightly cleaned up}

## Steps to reproduce

1. {scene step 1 text}
2. {scene step 2 text}
...
{n}. {the failing step's text} — **fails here:** {actual result}

## Severity rationale

{one line — why this severity, e.g. "blocks the acceptance walkthrough" or "cosmetic, doesn't block sign-off"}
```

Tell the QA professional the defect's filename and criterion id as soon as it's drafted — don't wait until end of session to surface it.

**`status:` vocabulary — use exactly one of these six, nothing else** (`coverage` reads it; an unknown value reads as unresolved):

| status | means | criterion it maps to |
|---|---|---|
| `open` | filed, not yet fixed | ⛔ / ⚠️ |
| `needs-info` | can't act until a question is answered | ⛔ |
| `fixed` | fix landed, not yet re-verified | 🔁 awaiting retest |
| `verified` | re-verified fixed by a named person | ✅ / 👁 |
| `deferred` | won't fix now, consciously accepted (needs `deferred_by` + `deferred_pointer`) | 📋 accepted gap |
| `not-a-defect` | works as designed / not a real defect | (drops from the open count) |

## Step 6b — On a passing retest, close the defect in place

`status:` is a **lifecycle field — the one part of a defect that changes.** This is the deliberate exception to append-only: the execution *report* and the defect's **narrative** (expected/actual/repro) are historical and never rewritten, but when a criterion that had an open defect is **re-run this session and now passes**, update that defect's frontmatter *in place*:

- Set `status: verified`, and fill `verified: {date}`, `verified_by: {name}`, `verified_commit: {commit at HEAD this run}`. (If the fix landed but you're only recording that — not re-verifying — use `status: fixed` + `fixed`/`fixed_in`, and the criterion is 🔁, not signed.)
- **Leave the narrative body untouched.** You're recording that a named human re-verified the fix against a known commit — not rewriting what was found. The new execution report is the historical record of the retest; the defect's status is its current state.
- A defect consciously **not** being fixed is `deferred` — set `deferred_by` + `deferred_pointer` (a follow-on `INT-NNN`, a `decisions/…` record, or `waiver`), which is what lets its criterion be a well-formed `📋` rather than a bare one. Deferring is the human's call, not this skill's; record it, don't decide it.

Find the defect(s) for a re-run criterion by its `criterion: INT-00x-Cy` frontmatter. Surface every close you make in the session summary.

## Step 7 — Write back the Sign-off cells

In `intents/INT-00x/test-script.md`, update the Sign-off cell for every criterion actually exercised this session (the manual counterpart to `/ql-test-script`'s Step 6 write-back convention):

- **Pass (👁):** `{name} / {date} / pass / {report-filename}`
- **Fail (👁):** `{name} / {date} / fail / defect-INT-00x-{NN}.md`
- **Deferred (👁):** `{name} / {date} / deferred-{as-is|backlog} / {report-filename}`. This records that a human made the call, not that the criterion was proven against its original wording. Until the deferral is formalized, `coverage` reads it as **unrouted** (⚠️ incomplete, which gates a Delivered intent), because a tester's deferral hasn't been ratified into scope yet — the same bar a 📋 accepted gap must clear (named accepter + pointer). It's routed once the cell also carries the pointer to where it was formalized: append ` / → decisions/<file>.md` (accepted as-is, via `/ql-refine-intent`), ` / → intents/BACKLOG.md` (backlog, via `/ql-capture-intent`), or ` / → INT-NNN` (a follow-on intent).
- **⚠️ partial:** **append, never replace.** A partial's cell already records the *automated* half (what ran, what remains open) — overwriting it destroys that record and leaves the criterion looking manually-proven when only half of it is. Add your manual result to what's there: `{existing text} · manual: {name} / {date} / pass / {report-filename}`. If the manual half was the last open piece, say so — but **don't promote the row's Type from ⚠️ to ✅ or 👁**; re-typing a criterion is `/ql-test-script`'s call, not a side effect of running it.
- Criteria whose scene was started but not reached (session stopped early) stay `_pending_` — don't mark them anything.

**Always cite the artifact, never just the verdict.** The filename in the cell is what makes the sign-off *evidence* rather than a claim — it's the join from the criterion id to the commit-pinned record that proves it. A bare `name / date / pass` is exactly the unrecorded human assertion this skill exists to replace. Use the report's filename alone (the cell's `test-evidence/` sibling is unambiguous from the intent directory), and on a fail cite the defect file, whose own frontmatter carries the report's commit.

**Separate the fields with ` / ` — never an em-dash or the word "pending".** `intent-ledger.mjs coverage` reads this cell to decide whether a 👁 criterion is still awaiting sign-off, and it treats a cell containing `pending`, `tbd`, or an em-dash as *unsigned*. A cell like `{name} / {date} / pass — {report}` would make `coverage` report a criterion a human really signed as still pending, so the report would understate the proof. Keep the slash form.

This is a real edit to `test-script.md` — the QA professional is the human signing off in real time, which is exactly what the Sign-off column is for.

## Step 8 — Wire the evidence into the trust chain

Evidence nobody cites is evidence nobody finds. The `test-evidence/` files just written are only useful if the artifacts that *make claims* about this intent point at them. Two of those you offer to update; one is not yours to touch.

**Offer to pre-fill the PR's §2 matrix rows** for the criteria run this session (the engagement PR template's "Intent traceability" section). For each criterion exercised, the Evidence cell cites the report — e.g. `👁 test-evidence/{date}-{commit}-execution-report.md` — and the Status cell carries the honest mark: `👁` on a pass, `⛔`/`⚠️` on a fail with the defect named. Same discipline as the matrix's own instruction to *reference* test-script criteria by id rather than re-derive proof: this adds the manual half of that reference. If no PR body exists yet, say what the rows should be so they can paste them when they assemble it.

**Tell them the ledger evidence column now has something to cite** — `delivery/intent-ledger.md`'s evidence for this intent can name the report file. This step itself still does not write the ledger — `intent-ledger.mjs start`/`deliver` are its only writers. Step 8a, next, is where this skill checks whether the whole intent is now ready for that `deliver` stamp; this step just names the file.

Then close with a short summary: which files were created, which criteria flipped to signed-off, which defects were filed, and:

- A filed defect blocking the intent's acceptance may warrant flagging in the PR's "Deferred / known gaps" section, or fixing before the PR opens — that's their call, not this skill's.
- A ⛔/⚠️ criterion is *not* a reason to soften the matrix row. Marked honestly, a failed manual criterion is the system working.

## Step 8a — If the intent's test script is now fully proven or deferred, offer to stamp it Delivered

This is the step before the PR goes up — the reflex that turns "we finished testing" into a ledger update, instead of a status the ledger only learns about later, if at all.

**Check the whole test script, not just what ran this session.** Read `intents/INT-00x/test-script.md` fresh (this session may have only run some scenes) and check every criterion's Sign-off/proof state:

- ✅ automated criteria are proven by CI or by `/ql-verify-build`, not this skill. Don't judge them by hand: run `node scripts/intent-ledger.mjs preflight INT-00x` and, if it prints **⛔ Hold** (for example an org-probe ✅ the build org refuted), say what it names and stop — don't offer to deliver.
- 👁 manual and the manual half of ⚠️ partial criteria: satisfied only if the Sign-off cell is `pass`, or a `deferred-*` that carries its `→` pointer — not `_pending_`, not `fail`, not an unrouted deferral.

**If any criterion is still `_pending_`, `fail`, or an unrouted `deferred-*`,** say so plainly and stop here — don't offer to deliver. A failed criterion with an open defect is exactly the case the ledger must not paper over, and `coverage --gate` fails a Delivered intent on either. For an unrouted deferral, name the skill that formalizes it (`/ql-refine-intent` for accepted as-is, `/ql-capture-intent` for backlog); once it's routed and the pointer is in the cell, re-run this check.

**If every criterion is pass/proven or a routed deferral,** tell the QA professional plainly, e.g.:

> Every criterion in INT-00x's test script is now pass or a routed deferral:
> C1 ✅ · C2 👁 pass · C3 👁 deferred (backlog → intents/BACKLOG.md) · C4 👁 pass
>
> Mark INT-00x ✅ Delivered in the ledger before opening the PR?

If any criterion is a routed deferral, name it and where it was routed — this is the last checkpoint before the ledger stamp.

If they confirm, run:

```bash
node scripts/intent-ledger.mjs deliver INT-00x --pr <ref>
```

Use the branch's PR reference if one already exists (`gh pr view {branch} --json url -q .url` or `#<number>`); if no PR exists yet, omit `--pr` and note that Step 9 below will still need to open it — the ledger row and the PR aren't required to land in the same breath, but they should land in the same session.

If `deliver` refuses (already Delivered at a different hash — drift; or some other guard in the script), surface its message verbatim and stop — don't retry with a different flag or hand-edit the ledger to force it through.

If they decline, say so and move on — the ledger stays whatever it was; this is an offer, not something the skill insists on.

**This is the only case this skill writes `delivery/intent-ledger.md`.** Every other path through this skill leaves the ledger untouched, per Step 8's "does not write" boundary — this step is the one deliberate exception, gated on the intent's test script actually being complete.

## Step 9 — Confirm the evidence, then offer to open (or update) the PR

Offering this at all is deliberate: many QA professionals running these scenes are new to git, and the friction of staging and opening a PR is exactly where evidence gets stranded on a laptop instead of landing in the trust chain. The guardrails below are what make the offer safe — keep them.

Show the QA professional exactly what this run touched — `git status --short` (or an explicit list: the new execution report, any new defect files, the `test-script.md` sign-off diff) — and ask them to confirm it looks correct before anything gets pushed. Use a selectable question, e.g.:

> This run created/changed:
> - `intents/INT-00x/test-evidence/{date}-{commit}-execution-report.md` (new)
> - `intents/INT-00x/test-evidence/defect-INT-00x-0n.md` (new, if any)
> - `intents/INT-00x/test-script.md` (sign-off cells updated)
>
> Does this look correct?

If they say it does **not** look correct, stop here — ask what's wrong and fix it (don't proceed to any git action).

If they confirm it looks correct, check whether the branch already has an open PR (`gh pr list --head {branch}`).

**Resolve the base branch first — don't assume `develop` exists.** Per this repo's `AGENTS.md` branching flow the pipeline is `feature/* → develop → release/* → main`, and **your lane ends at the PR into `develop`**. But a simpler engagement repo may run `feature → main` with no `develop` at all. Check (`git rev-parse --verify origin/develop`, or `git branch -r`): if `develop` exists it's the base; if not, `main` is. **Never** base on `release/*` or push toward prod — cutting release branches and promoting to production are the Trusted Guide's calls.

- **No open PR yet** — ask: "Open a PR into `{base}` with this evidence?" If yes: stage just these evidence files (never a blanket `git add -A`), commit, push, and `gh pr create --base {base}`.
- **An open PR already exists for this branch** — ask: "Push this evidence to the existing PR #{n}?" If yes: stage, commit, and push to the branch (no new PR — it updates the existing one).

Either way, this is a git action visible to others (a push, a PR) — always confirm before doing it, per the engagement's "actions with care" convention. Never push directly to `develop`/`main`/`release/*`, and never use `--no-verify` if a commit hook fails — a gate failure is information; surface it and diagnose, don't silence it.

Commit message convention: something like `Add test evidence for INT-00x manual verification ({scene(s)})`, consistent with this repo's existing evidence commits (see `git log --oneline`).

## Step 10 — Optionally comment the run onto the intent's Jira issue (interim)

If this engagement projects to Jira and the QA pro wants an interim comment, see the co-located `jira-comment.md` in this skill's own dir (`.claude/skills/ql-record-test-execution/jira-comment.md`, or `.agents/skills/ql-record-test-execution/jira-comment.md` on other harnesses, or `${CLAUDE_PLUGIN_ROOT}/skills/ql-record-test-execution/jira-comment.md` on a plugin-only checkout).

## What this does NOT do

- Does not touch ✅ automated criteria or run/parse `sf apex test run` output — that's `intent-ledger.mjs coverage`'s job.
- Does not write or transition `delivery/intent-ledger.md` on its own initiative — only `intent-ledger.mjs start`/`deliver` write the ledger. The one exception is Step 8a: when every criterion in the intent's test script is pass/proven or deferred, the skill offers to run `deliver`, but only on the QA professional's explicit confirmation — `deliver` remains the human's accountability act, this skill just surfaces the moment to do it before the PR goes up.
- Does not **classify** a defect. It drafts the evidence — expected vs. actual, the repro from the scene's own steps — and asks for severity; deciding what a defect *means* for the intent's acceptance is the human's call. Evidence is the skill's job; classification isn't.
- Does not sign off a criterion the human didn't actually run. A scene started but not reached stays `_pending_`.
- Does not ask the QA professional to author reproduction steps from scratch — it drafts them from the scene's existing step text plus their two-question answer.
- Does not overwrite a prior run's execution report, or a defect's **narrative** (expected/actual/repro) — those are historical: every run gets its own new, numbered report, and a defect's body is never rewritten. The **one** exception is the defect's `status:` and its resolution fields — a lifecycle that legitimately changes in place as the defect moves open → fixed → verified / deferred (Step 6b).
- Does not edit the intent itself or the criteria table's wording in `test-script.md` — only the Sign-off cell.
- Does not edit `intents/INT-00x/intent.md`, `out_of_scope`, or `intents/BACKLOG.md` — a Defer verdict is recorded as an observation in the Sign-off cell and the execution report, never as a scope edit. Routing a deferral into formal scope (accepted-as-is or backlogged) is `/ql-refine-intent`'s or `/ql-capture-intent`'s job, and a human ratifies it.
- Does not transition the Jira issue's status or write scope/answers back into the repo from Jira — the Step 10 comment is an opt-in, one-way report, same boundary as `/ql-sync-jira`.
- Does not own the Jira projection. Step 10 is an interim stopgap until `/ql-sync-jira` grows a test-execution comment path, at which point it supersedes this step.
