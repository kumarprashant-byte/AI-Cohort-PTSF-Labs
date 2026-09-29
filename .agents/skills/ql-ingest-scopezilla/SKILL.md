---
name: ql-ingest-scopezilla
disable-model-invocation: true
description: Ingest a Scopezilla scoping project into this engagement repo, turning scoped intents into living per-intent files and seeding delivery scaffolding, on first setup or a re-ingest.
produces: >-
  Living `intents/INT-NNN/intent.md` files, the read-only `scopezilla/` mirror, seeded `delivery/phase-N/` + `delivery/intent-ledger.md`, engagement details in README/AGENTS.md, and a kickoff `decisions/` record. On re-ingest: a reconcile report only (never clobbers). On the `--grill` path: interactively-shaped living intents (origin local, `derived_from` provenance, intact `## Grounding`) authored via the `new` engine command, plus a `decisions/YYYY-MM-DD-scope-grill.md` session record and, optionally, a drafted upstream Scopezilla issue for scope gaps too thin to rebuild. No commit.
---

# Ingest Scopezilla output

You are pulling a Scopezilla scoping project into this AI-native delivery engagement workspace. The scoping work has already been done in a separate project (typically under `~/scoping-projects/<name>/`). This skill mirrors the supporting artifacts into `./scopezilla/`, **transforms the scoped intents into living per-intent files under `./intents/`**, populates engagement metadata, and seeds the delivery scaffolding.

Run **after** `setup` (which handles tooling). This skill handles engagement content.

> **Harness note.** Some steps use `AskUserQuestion`. In a harness without it, ask the same question as plain text with the options enumerated — the shape of the question matters, the tool doesn't.

> **Two paths through Step 4.** Everything else in this skill — locating the source, the pre-flight, the existing-content guard, the metadata/delivery/ledger seeding — is shared. Only the transform in the middle forks:
>
> - **Deterministic (default).** `from-json` turns the scoped intents 1:1 into living files. Fast, reproducible, right when the Scopezilla scope is clean.
> - **Interactive grill (`--grill`, or offered when the scope looks rough).** Instead of a straight transform, you sit down with the human over the *rich* Scopezilla source and shape it into buildable intents — split an oversized intent, rebuild a thin one from the discovery context, confirm the good ones as-is. The deliverable here is the **conversation**, not a classifier: you exercise judgment (informed by the ~24-hour build-validate-demo cycle as a *prompt*, not a hard gate) and the human ratifies each call. See **Step 4-grill**.
>
> The grill path reads the dirty source freely but is bound by the same membrane the deterministic path already honors (Step 4's "Do NOT copy" list): it **never lands sensitive source text in the repo** — provenance is a pointer, never a quote — because this repo is often handed to the customer as an artifact. That constraint is the spine of the grill, spelled out in Step 4-grill.

> **The two roles of scope after ingest.** `./scopezilla/` is a read-only mirror of the upstream output — the build bundle, deliverables, and the raw `data/intents.json` (kept only as the **reconcile merge base**, never read as canonical). `./intents/INT-NNN/intent.md` is the **living canonical Intent**: human-owned, refined in-repo via `/ql-refine-intent` and `/ql-capture-intent`, with git + `decisions/` as its provenance. First ingest *seeds* `intents/` from upstream; after that **the repo owns the intents** — a re-ingest *reconciles and reports*, it never overwrites your refinements. This is the resolution to "what happens when the Scopezilla output isn't quite right": you fix it here, deliberately and recorded, and upstream re-runs reconcile against your living copy instead of clobbering it.

## Step 1 — Locate the source project

The user must point at a Scopezilla project root. If they invoked the skill with a path, use it. Otherwise ask.

Validate:

- `<src>/.project-metadata.json` exists. If missing, abort: "That doesn't look like a Scopezilla project — no `.project-metadata.json` at the root."
- `<src>/outputs/quantum-leap/00-agent-brief.md` exists. If missing, abort: "The Quantum Leap build bundle hasn't been generated yet. Run the `meshmesh` skill in the Scopezilla project first."

## Step 2 — Pre-flight summary

Read `<src>/.project-metadata.json` and `<src>/outputs/quantum-leap/00-agent-brief.md`. Surface a one-screen summary:

- Project name (from metadata)
- Quantum Leap blueprint (`completion_status.quantum_leap_blueprint`)
- Target org name + type + build_allowed (`completion_status.target_org`)
- Phase count (count `<src>/outputs/quantum-leap/10-phase-*.md`)
- Clouds in scope (parse from `00-agent-brief.md`'s "Clouds in scope:" line)
- Depth mode
- Total weeks if `timeline.user_commitment.total_weeks` is set

Ask the user to confirm before writing anything.

**Quality read → offer the grill path.** While you have the intents in view, take a cheap read of their shape — roughly how many build-target steps each carries, whether any read as thin/placeholder, whether any are so broad they clearly won't land in a single build-validate-demo cycle. This is a *glance*, not a full `/ql-vet-intent` sweep. Then:

- If the user invoked with **`--grill`**, go the interactive path (Step 4-grill) regardless of what the read shows — they asked for it.
- If the read surfaces **oversized or thin intents** and no flag was passed, surface what you saw and **offer** the grill: *"3 of these 12 intents look oversized for a single build cycle and 1 reads like a placeholder — want to grill the scope interactively instead of a straight transform? (default: proceed deterministic)."* Use `AskUserQuestion`. **Default to deterministic** — a clean source is never slowed down, and the offer is a nudge, not a gate.
- If the read is clean and no flag was passed, say nothing about grilling and proceed deterministic.

The read is judgment you'll reuse *inside* the grill if the user accepts — carry it forward rather than re-deriving it.

## Step 3 — Existing-content guard (decides first-ingest vs re-ingest)

Check whether `scopezilla/`, `intents/`, `delivery/`, and `decisions/` are non-empty. **`intents/` is the signal that decides the whole flow:**

- **`intents/` empty or absent → FIRST INGEST.** Seed everything fresh (Step 4 transforms upstream → `intents/`).
- **`intents/` non-empty → RE-INGEST.** The repo already owns living intents. **Never clobber them.** Refresh the supporting `scopezilla/` mirror, then *reconcile and report* (Step 4b) — the human decides what upstream changes to take.

Then:

- **`scopezilla/`** (the mirror: build-bundle, deliverables, raw data) — always safe to **overwrite**; it holds no canonical content, only the upstream snapshot + reconcile base. Confirm before clobbering anyway.
- **`delivery/`** — if non-empty, default to **merge** (only create phase folders that don't exist). The user has build notes there.
- **`decisions/`** — if a kickoff file already exists for today's date, skip it.

**Old-format repo (migration):** if `scopezilla/data/intents.json` exists but `intents/` does **not**, this repo predates living intents. Treat it as a one-time migration: run the Step 4 transform to create `intents/` from the existing JSON, tell the user their scope is now living, and proceed. Don't delete the JSON — it becomes the reconcile base. **Heads-up on drift:** the transform itself preserves scope text, but an older ledger may carry hashes from a previous hash algorithm — so an intent already marked ✅ Delivered can show a one-time 🔄 *Needs re-verify* right after migration. That's expected, not a regression: confirm the delivered build still matches the intent text and re-stamp the hash (`node scripts/intent-ledger.mjs hash INT-00x`). Surface this in the Step 8 summary if any delivered rows flip.

If anything's ambiguous, ask the user.

## Step 4 — Mirror the source into `scopezilla/`

The destination layout is fixed:

| Source (under project root) | Destination |
|---|---|
| `outputs/quantum-leap/` | `scopezilla/build-bundle/` |
| `outputs/*.md` (top level only — not subdirs) | `scopezilla/deliverables/` |
| `data/*.json` | `scopezilla/data/` (the reconcile base — see below) |
| `.project-metadata.json` | `scopezilla/.project-metadata.json` |
| the scoped intents (`data/intents.json`) | **transformed** → `intents/INT-NNN/intent.md` (Step 4a) |

For deterministic snapshots, **move the destination subdir aside, then `cp -R`**. The Claude Code sandbox blocks both `rsync --delete` and `rm -rf` (destructive flags). `mv` to a trash directory is accepted and behaves the same way. Pick the trash dir once: `TRASH=/tmp/quantum-leap-ingest-trash/$(date +%s)` (`mkdir -p`); mention it in the summary.

For `deliverables/`, copy only top-level `*.md` files — not the `quantum-leap/` or `meshmesh/` subdirs.

Mirror the **supporting** artifacts (always safe — these are not canonical):

```bash
TRASH=/tmp/quantum-leap-ingest-trash/$(date +%s)
mkdir -p "$TRASH"

# build-bundle: move-aside + recopy
[ -d scopezilla/build-bundle ] && mv scopezilla/build-bundle "$TRASH/build-bundle"
cp -R "<src>/outputs/quantum-leap" scopezilla/build-bundle

# deliverables: top-level *.md only
[ -d scopezilla/deliverables ] && mv scopezilla/deliverables "$TRASH/deliverables"
mkdir -p scopezilla/deliverables
find "<src>/outputs" -maxdepth 1 -name '*.md' -exec cp {} scopezilla/deliverables/ \;

# project metadata (overwrite is fine — single file)
cp "<src>/.project-metadata.json" scopezilla/.project-metadata.json
```

If the source carries grounding artifacts or architecture ADRs (regulated/ARB engagements — default zero), mirror them so their `location` pointers resolve locally: see the co-located `grounding-mirror.md` in this skill's dir (`.claude/skills/ql-ingest-scopezilla/grounding-mirror.md`, or `.agents/skills/ql-ingest-scopezilla/grounding-mirror.md` on other harnesses, or `${CLAUDE_PLUGIN_ROOT}/skills/ql-ingest-scopezilla/grounding-mirror.md` on a plugin-only checkout).

**The `data/` JSON is handled differently because it's the reconcile base, and the ordering matters:**

- **First ingest:** copy the fresh JSON straight in, then transform it (Step 4a).
  ```bash
  mkdir -p scopezilla/data
  cp "<src>/data/"*.json scopezilla/data/        # this intents.json becomes the base for the NEXT re-ingest
  ```
- **Re-ingest:** do **not** overwrite `scopezilla/data/intents.json` yet — it's the *base* the reconcile compares against. Stage the fresh upstream JSON elsewhere, run the reconcile report (Step 4b), and only after the human has applied the changes they want do you update the base:
  ```bash
  mkdir -p /tmp/scopezilla-fresh && cp "<src>/data/"*.json /tmp/scopezilla-fresh/   # staged fresh upstream
  # ... Step 4b reconcile + apply ...
  # THEN, once reconciled, the staged JSON becomes the new base:
  [ -d scopezilla/data ] && mv scopezilla/data "$TRASH/data"
  mkdir -p scopezilla/data && cp /tmp/scopezilla-fresh/*.json scopezilla/data/
  ```

Run each block as a separate Bash invocation so a single denial doesn't cascade.

**Why not `rm -rf` or `rsync --delete`:** both are blocked by Claude Code's sandbox. `mv` to a scratch directory is the workaround. Go straight to the move-aside pattern.

**Do NOT copy**:

- `<src>/knowledge/` — too large (often hundreds of MB of Salesforce implementation guide PDFs). Stays in the source project. Build agents that need to grep an implementation guide read it from the source path captured in `scopezilla/.source.json`.
- `<src>/discovery-notes/` — already distilled into `00-project-summary.md`.
- `<src>/reference/` — **usually** skipped (typically empty), **but copy it when grounding artifacts point into it** (see `grounding-mirror.md`) so the `location` pointers don't dangle. Skip only when it's empty or no intent has a `grounding.artifacts[].location`.
- `<src>/decisions/` — **usually absent** (default zero), **but mirror it when the source authored architecture ADRs** (see `grounding-mirror.md`) into `scopezilla/decisions/`, re-stamped `Source: scopezilla-inherited`. Skip only when the folder is absent or has no `*.md`.
- `<src>/data/csv/` — regenerated from the JSON; bloat in version control.
- `<src>/outputs/scoping-deliverables.zip` — packaged client handoff (Excel + dupes of the markdown). Markdown is already mirrored; the zip is bloat for build use.
- `<src>/outputs/meshmesh/` — deprecated path; the bundle moved to `outputs/quantum-leap/`.

### Write `scopezilla/.source.json`

The durable pointer for the un-copied knowledge base (and the reconcile bookkeeping):

```json
{
  "source_path": "<absolute path to source Scopezilla project>",
  "ingested_at": "<ISO 8601 timestamp>",
  "scopezilla_project_name": "<project_name from metadata>",
  "blueprint": "<quantum_leap_blueprint from metadata>",
  "ingest_commit": "<git rev-parse HEAD at ingest time, if the repo has commits>"
}
```

`ingest_commit` records the repo state at ingest so a later reconcile (or a human) can `git diff` the living `intents/` against what was seeded. Capture it with `git rev-parse HEAD 2>/dev/null` — omit it on a repo with no commits yet.

### Write `scopezilla/README.md`

A short generated note, written on **every** ingest alongside `.source.json` (deterministic, grill, or re-ingest):

```markdown
# scopezilla/ — read-only upstream mirror

Mirrored from the Scopezilla scoping project on `<ingested_at>`.

**Source:** `<source_path>`

This directory is a **read-only mirror** of the upstream scoping output — the build
bundle, deliverables, and the raw `data/intents.json`. Do not hand-edit it; it's
refreshed from upstream by `/ql-ingest-scopezilla`.

**The canonical Intent is NOT here — it lives in `../intents/INT-NNN/intent.md`**, which
is *living* (human-owned, refined in-repo via `/ql-refine-intent` and `/ql-capture-intent`).
`data/intents.json` here is kept only as the **merge base** that `/ql-ingest-scopezilla`
reconciles against on the next re-ingest — never read it as canonical scope.

## Looking for the knowledge base?

`knowledge/` is intentionally not mirrored (it can be hundreds of MB of Salesforce implementation guide PDFs). Read it directly from the source project:

`<source_path>/knowledge/`

That path is also recorded in `.source.json`.
```

## Step 4a — Transform scoped intents → living `intents/` (FIRST INGEST / migration)

> **Grill path chosen?** If the user passed `--grill` or accepted the Step 2 offer, **skip this deterministic transform and go to Step 4-grill** — the interactive session authors the living intents instead. Come back here only if they declined and want the straight transform. (On a *populated* repo the grill composes with the reconcile — see Step 4b and Step 4-grill.)

The scoped intents become **living per-intent files**. The engine script does the transform — it writes one `intents/INT-NNN/intent.md` per intent and is **hash-stable** (the scope hash is identical before and after, so seeding never causes false drift):

```bash
node scripts/intent-ledger.mjs from-json scopezilla/data/intents.json
```

`from-json` **refuses to overwrite** an existing `intents/INT-NNN/intent.md` (it skips and tells you), so it's safe to run — it can't clobber a refinement. On a true first ingest the directory is empty and every intent is written; on the old-format migration (JSON present, no `intents/`) this is exactly the one-time seed. Each file is stamped `origin: scopezilla`.

**Loss-proof by construction — surface the carry report.** `from-json` no longer drops upstream fields it doesn't have a first-class home for (the failure #49 fixed). Architectural **grounding** — a requirement ID, the approved-architecture reference, a wireframe — lands in a `## Grounding` section; any *other* unmapped upstream field is preserved **verbatim** under `## Grounding → ### Carried` and **reported on stdout**. Read that report to the user:

- If it says *"Carried architectural grounding for N intent(s)"* — the scope carries **architectural grounding** (a requirement ID / approved-architecture reference). Traceability is now something the `conformance` report can surface, and `/ql-design-intent` / `/ql-vet-intent` will check the build approach against it.
- If it warns *"Preserved N intent(s) with upstream fields that have no first-class schema home"* — surface those field names to the user. They were kept, not lost, but a field the transform had to carry-verbatim is a hint the SZ→QL contract may need a first-class home for it (a `scoping-agent#147` follow-up per the cross-repo handoff convention). Don't silently ignore the warning.

Then, if any intent carried grounding, run the conformance report so the user sees the traceability baseline:

```bash
node scripts/intent-ledger.mjs conformance     # per-intent grounding traceability (a report, never a gate)
```

If no intent carries grounding, the report says "nothing to trace" — say so and move on.

Confirm the transform:

```bash
node scripts/intent-ledger.mjs validate     # every intent parses, sections present, deps resolve
```

If `validate` flags anything, the upstream JSON had a shape the template didn't expect — surface it (and consider a cross-repo issue per AGENTS.md); don't hand-patch silently.

## Step 4b — Reconcile fresh upstream against living intents (RE-INGEST only)

Skip this on first ingest. On re-ingest, the repo already owns living intents and **you must not overwrite them**. Run the read-only 3-way reconcile — base = the *old* `scopezilla/data/intents.json` (still in place, not yet overwritten), ours = `intents/`, theirs = the staged fresh upstream:

```bash
node scripts/intent-ledger.mjs reconcile /tmp/scopezilla-fresh/intents.json
```

It reports, per intent, who changed it since last import:

- **🆕 Added upstream** — new intents not in the repo. Pull just these in: `node scripts/intent-ledger.mjs from-json /tmp/scopezilla-fresh/intents.json` (it writes only the missing ones), then `node scripts/intent-ledger.mjs sync` opens their ledger rows.
- **🟡 Changed upstream ONLY** — upstream refined them, we didn't touch them. Usually safe to take the new text; re-author those specific intents — hand-merge, or run the exact `from-json <file> --force --only <ids>` command `reconcile` prints (never a bare `--force`, which overwrites every intent including ones refined in-repo) — but it's the human's call.
- **🔵 Refined in-repo ONLY** — we changed them, upstream didn't. **Keep ours.** Do nothing.
- **🔴 CONFLICT — changed BOTH sides** — a human must settle each: compare `intents/<id>/intent.md` against the fresh output and decide. Record the decision.
- **⚫ Removed from upstream** — a `scopezilla`-origin intent vanished from the fresh output. If intentional, retire it through `/ql-refine-intent` (decision + `intent-ledger.mjs retire`, never a deleted directory or row); if upstream dropped it by mistake, keep ours and flag upstream.
- **🟣 Locally authored** (`origin: local`) — born in-repo from notes/an ask; correctly absent from upstream. No action.

Present this to the user and apply only what they ratify. **Nothing is overwritten by the reconcile itself** — the repo stays canonical. Once the chosen upstream changes are applied, update the base (the final `mv` + `cp` from Step 4's re-ingest block) so the *next* reconcile compares against this import. Re-run `validate`, then continue to the ledger drift check (Step 6b).

> **Grilling on a populated repo composes with this reconcile — it is never a door around it.** Grilling is useful past the first ingest (a phase-2 batch, a fresh upstream run for the next value drop, mid-engagement discovery). But the reconcile is the safety net that protects your in-repo refinements, so the grill operates on **what the reconcile surfaces**, not around it: after this report, an accepted grill works *only* the **🆕 added upstream** intents and the **🔴 conflicts** — exactly the things worth an interactive session. A **🔵 refined-in-repo** (settled) intent is never touched by the grill; the never-clobber rule stands. Shaping brand-new scope from notes/rich source *without* a fresh upstream run is `/ql-capture-intent`'s job, not this. So: reconcile first, then grill its output. Go to Step 4-grill with that scoped worklist.

## Step 4-grill — Interactively shape scope from the rich source

Reach here when the user passed `--grill` or accepted the Step 2 offer. This **replaces** the deterministic Step 4a transform (first ingest) or works the reconcile's worklist (populated repo, per Step 4b). The point is a working session, not a pipeline: you and the human go through the scope together and land good, buildable living intents.

> **Same session, one difference — where the intent comes from.** This is the *same* interactive shaping session `/ql-grill-intents` runs on **existing** living intents (the four shapes, the facts/decisions posture, the membrane, the conditional scrub — all canonical there). The one difference is authoring: at ingest the intents **don't exist yet**, so this path **authors them directly** from upstream (the `new` scaffold, below) instead of decide-and-routing through `/ql-refine-intent` / `/ql-capture-intent` the way `/ql-grill-intents` does. Reshaping intents *after* ingest — a mid-engagement drift check, a phase-2 grill — is `/ql-grill-intents`, not a re-run of this.

**What "the rich source" is, and why it matters.** The deterministic transform reads only `data/intents.json`. The grill may read the *whole* Scopezilla project at `<src>` for context — `discovery-notes/`, `knowledge/`, `outputs/*.md`, the deliverables — because that's where the detail to rebuild a thin intent or justify a split actually lives. This is exactly the material the deterministic ingest deliberately does **not** copy (Step 4's "Do NOT copy" list). Reading it is the grill's job; **landing any of it in the repo is forbidden** (see the membrane below).

### The session, the membrane, and the scrub — same as `/ql-grill-intents`

Run the sitting **exactly as `/ql-grill-intents` specifies** — the four shapes (good-as-is / oversized→split / thin→rebuild / reconcile-against-the-build), the facts-vs-decisions posture, the lane boundary (refine the *expression* of scope, never originate it), and the dirty-source membrane (provenance is a pointer, never a quote) are all canonical there (its Step 3 and Step 5). Go intent by intent — first ingest: the whole set; populated repo: only the 🆕 + 🔴 worklist from Step 4b.

The membrane is at its **sharpest** on this path: ingest reads the *most* sensitive material (the un-mirrored `<src>`, transcripts, discovery notes) to rebuild the *most* scope — which is why the scrub-verify pass below (Step 4-grill-scrub) is **unconditional** here, not the conditional pass `/ql-grill-intents` runs.

### Authoring each ratified intent

Use the engine's scaffold — the same primitive `/ql-capture-intent` uses — so grilled intents are honest `origin: local` living intents, collision-safe, never clobbering:

```bash
node scripts/intent-ledger.mjs new --phase <N> --title "<title>"    # prints the allocated INT-NNN
```

Then fill the scaffolded `intents/INT-NNN/intent.md`:

- **Body sections** (`build_target`, `guardrails`, `out_of_scope`, `acceptance`, dependencies, open questions) — written as clean, derived prose. No verbatim source.
- **`derived_from:` frontmatter** — the provenance pointer(s), comma-separated on one line: the upstream intent ID(s) this came from, or the epic/requirement ID when rebuilt from below-intent-level context. A split stamps every child with the parent's pointer. Example: `derived_from: INT-014` or `derived_from: E05, REQ-042`. (This field is provenance metadata; the engine doesn't read `derived_from`, so it is carried without any engine change and is excluded from the scope hash.)
- **`## Grounding`** — in a grounded/ARB engagement, preserve the requirement ID / approved-architecture reference exactly as the deterministic transform would, so the `conformance` report keeps working. **On a rebuild, actively re-assert the requirement-level trace** — a rebuilt intent must still say which requirement it satisfies; don't let the trace evaporate just because the intent text was reconstructed.

Then stamp and validate as usual:

```bash
node scripts/intent-ledger.mjs hash INT-NNN        # print the scope hash (a test script stamps `hash --proof`)
node scripts/intent-ledger.mjs validate            # confirm it parses, sections present, deps resolve
node scripts/intent-ledger.mjs ratify INT-NNN --by "<name>"   # the human ratified it in this session
```

Open a ledger row for each with `node scripts/intent-ledger.mjs sync` — it adds a `⬜ Not started` row for every intent that lacks one and re-derives the footer count and README index. On a populated repo, an accepted 🔴-conflict resolution updates the existing row rather than adding one; a 🆕 add gets a new row.

### The session decision record

Write **one** `decisions/YYYY-MM-DD-scope-grill.md` for the whole session (copy `decisions/TEMPLATE.md`), recording what was split / rebuilt / confirmed / escalated and **why** — sources cited **by pointer, never quoted** (the membrane applies to the decision record too). This is the paper trail for the shaping calls the human ratified and the provenance of every derived intent. For an escalated scope gap, add a line naming the gap; then **offer** (default off) to draft an upstream issue on `scoping-agent` per the cross-repo hand-off convention in AGENTS.md (`gh issue create --repo dgerow/scoping-agent …` via the git.soma host) — scrubbed of client/org specifics, since it lands in the public plugin-adjacent repo. The human decides whether it goes upstream.

Once every ratified intent is authored, stamped, and validated, run the scrub-verify pass before anything is considered landed.

## Step 4-grill-scrub — Independent scrub of the authored output

The membrane's backstop, and **always warranted here** — the ingest grill reads the dirty rich source by definition, so the scrub is not conditional on this path (unlike `/ql-grill-intents`, where it fires only when a dirty source was opened). Because you (the authoring session) have read the source, you're not a reliable judge of whether the *output* leaked it — the check must be made by a reader that **never saw the source**, judging the files purely on their face.

Run it exactly as **`/ql-grill-intents` Step 5** specifies (the canonical scrub-verify mechanics: fresh-context subagent → fresh session → isolated re-read, by harness capability; the reader gets *only* the authored output, never the source). Here the authored files are this session's new/changed `intents/INT-NNN/intent.md` and the `decisions/YYYY-MM-DD-scope-grill.md`. Surface findings, resolve each before the files are considered landed. Nothing commits here regardless — but the scrub gates the session's *"done."*

## Step 5 — Populate engagement metadata in repo docs

Patch `README.md` and `AGENTS.md` with an Engagement block delimited by HTML comments so re-runs replace cleanly:

```markdown
<!-- ENGAGEMENT:BEGIN -->
## Engagement at a glance

- **Client / project:** <project_name>
- **Blueprint:** <quantum_leap_blueprint>
- **Clouds in scope:** <clouds list>
- **Phases:** <N>
- **Target org:** `<target_org.name>` (<target_org.type>)
- **Depth mode:** <depth_mode>
- **Timeline:** <total_weeks> weeks (if available)
- **Source scoping project:** `<source_path>`
<!-- ENGAGEMENT:END -->
```

If the block already exists in either file (find the `<!-- ENGAGEMENT:BEGIN -->` marker), replace its contents in place. If not, insert it after the H1 line — **but in `AGENTS.md`, never inside the `<!-- LAUNCHPAD:MANAGED:BEGIN -->`…`<!-- LAUNCHPAD:MANAGED:END -->` region.** That region is plugin-owned and is overwritten by `/ql-resync`; an `ENGAGEMENT` block placed inside it would be lost. Put it between the H1 and the `LAUNCHPAD:MANAGED:BEGIN` marker (before the managed region). `README.md` has no managed region, so "after the H1" is unambiguous there. (Write the block to `AGENTS.md` — the canonical instruction layer every harness reads — not `CLAUDE.md`, which is just the `@AGENTS.md` pointer.)

In `README.md`, also remove or rewrite the line `After setup, fill in the engagement details above.` since the details are now populated.

## Step 6 — Seed `delivery/`

For each `scopezilla/build-bundle/10-phase-N.md` found, create `delivery/phase-N/README.md` (if it doesn't already exist):

```markdown
# Phase N — <phase name parsed from H1>

<duration line if present>

See `../../scopezilla/build-bundle/10-phase-N.md` for orchestration and `11-intents-N.md` for per-capability build specs.

## Plan-mode notes

_(Capture answers to Plan-mode questions here as you walk them.)_

## Build log

_(Append build progress, decisions, and gotchas here.)_

## Acceptance evidence

_(Capture pass/fail for each proof criterion (`INT-00x-Cy`) as it lands.)_
```

Parse the phase name from the first `# ` line of `10-phase-N.md` (everything after `Phase N — `, drop the trailing parenthetical). Parse duration from a `> Phase duration:` line if present.

## Step 6b — Seed or reconcile the intent ledger

`delivery/intent-ledger.md` is the backward link between scope and delivery — one row per intent, tracking status / PR / evidence / the scope hash captured at delivery. The helper `scripts/intent-ledger.mjs` (shipped in the engagement scaffold) seeds it and detects drift. The living `intents/` are the WHAT; the ledger is the STATUS.

**First ingest (no ledger yet):** generate a fresh one — every intent starts ⬜ Not started.

```bash
node scripts/intent-ledger.mjs seed > delivery/intent-ledger.md
```

Then write the README **Delivery index** — a derived, phase-grouped view of intent → status → PR that lives in `README.md` between `<!-- ENGAGEMENT:INDEX:BEGIN -->` markers (distinct from the Step 5 "at a glance" block). It's regenerated, never hand-edited; CI warns on a PR whose index is stale:

```bash
node scripts/intent-ledger.mjs index --write
```

**Re-ingest (ledger already exists):** do **not** clobber it — it holds the delivery status the ledger commands wrote. By now Step 4b has reconciled the *intents* and you've applied the upstream changes the user ratified. Now reconcile the *ledger* to the new intent set:

1. Run the drift check against the now-current `intents/`:

   ```bash
   node scripts/intent-ledger.mjs drift
   ```

2. If it reports **🔄 SCOPE DRIFT** for any intent, that intent's `build_target` / guardrails / out_of_scope / acceptance changed **after** it was delivered — whether the change came from upstream (applied in Step 4b) or from an in-repo refinement. Either way it's the same honest signal. For each drifted intent: run `node scripts/intent-ledger.mjs reverify INT-NNN` (flips the row to `🔄 Needs re-verify`, keeping the hash + PR — never hand-edit the ledger), and surface it in the Step 8 summary as an explicit action item (re-verify the delivered build against the new intent text; `deliver INT-NNN` re-stamps it if it still holds). Do not auto-resolve — the human decides whether the build still satisfies the changed scope.
3. If the reconcile added intents not yet in the ledger, open their ⬜ Not started rows with `node scripts/intent-ledger.mjs sync` (never by hand). If intents were removed/renamed, `drift` flags them as "tracked but not present" — reconcile by hand.
4. Once the ledger reflects the new scope, refresh the README delivery index: `node scripts/intent-ledger.mjs index --write`.

Never hand-edit an intent file just to make drift go away — drift is information. The fix is either a deliberate `/ql-refine-intent` (with a decision) or accepting the re-verify; not silencing the signal.

## Step 6c — Offer to refresh the Jira projection (only if already configured)

If — and only if — `delivery/jira.config.json` exists, this engagement already projects scope + delivery status into Jira (via `/ql-sync-jira`). A fresh ingest may have added intents, changed scope, or flipped a ledger row to 🔄, so the Jira side is now behind. Offer (via `AskUserQuestion`) to run **`/ql-sync-jira`** to preview the projection — its plan step shows the diff (new stories, status transitions, any `scope-drift` labels) and writes nothing until the user confirms. Default to **no**; this is a convenience nudge, not part of ingest, and `/ql-sync-jira` is the human-validated path for any actual push.

If `delivery/jira.config.json` does **not** exist, skip this step silently — first-time engagements have no Jira connection and `/ql-sync-jira` sets one up when the user wants it.

## Step 7 — Record the engagement kickoff decision

This step is **not** conditional on Jira — it runs on every ingest (it is a declared deliverable). Create `decisions/YYYY-MM-DD-engagement-kickoff.md` (today's date) **only if** no engagement-kickoff decision file already exists.

```markdown
# Engagement kickoff — <project_name>

**Date:** <today>
**Source scoping project:** `<source_path>`

## Context

<paste the Intent paragraph from `01-engagement-intent.md`>

## Choice

- **Quantum Leap blueprint:** <blueprint>
- **Clouds in scope:** <clouds>
- **Target org:** `<target_org.name>` (<target_org.type>; build_allowed=<bool>)
- **Phase plan:** <N> phases over <total_weeks> weeks
- **Depth mode:** <depth_mode>

## Consequences (cross-cutting commitments)

<paste the Pre-decided list from `10-phase-1.md`>

These were locked during scoping. Do not re-litigate; surface them as constraints to the build agent.
```

## Step 8 — Summary

Print a Deliverables block with inline-backtick absolute paths so the user can click to reveal in Finder:

```
**Deliverables**
- `<repo>/intents/` (the living canonical Intent — one INT-NNN/intent.md per intent)
- `<repo>/scopezilla/` (read-only upstream mirror + reconcile base)
- `<repo>/scopezilla/decisions/` (read-only mirror of inherited architecture ADRs — **only when the source authored any**; report the count, or "no architecture ADRs in source")
- `<repo>/scopezilla/build-bundle/00-agent-brief.md`
- `<repo>/scopezilla/.source.json`
- `<repo>/delivery/phase-1/README.md` (...one per phase)
- `<repo>/delivery/intent-ledger.md` (seeded on first ingest; drift-checked on re-ingest)
- `<repo>/decisions/<date>-engagement-kickoff.md`
- `<repo>/decisions/<date>-scope-grill.md` (**grill path only** — the session record: what was split/rebuilt/confirmed/escalated, sources by pointer)
- `<repo>/README.md` (engagement "at a glance" + the generated Delivery index)
- `<repo>/AGENTS.md` (ENGAGEMENT block; the managed conventions region lives here too)
```

On the **grill path**, also report in the summary: how many intents were confirmed / split / rebuilt / escalated; that the scrub-verify pass ran and what it flagged (or "clean"); and whether an upstream Scopezilla issue was drafted for any escalated gap.

Then suggest next steps:

1. Open `scopezilla/build-bundle/00-agent-brief.md` to read the build brief.
2. Read `scopezilla/build-bundle/10-phase-1.md` and `11-intents-1.md` for Phase 1.
3. If `sfdx-project.json` is missing, run `sf project generate --name . --manifest`.
4. Authorize the target org: `sf org login web --alias <target_org.name>`.

Also tell the user where the move-aside backup landed (`$TRASH`) so they can clear it once they're confident in the new snapshot.

## What NOT to do

- **Don't** copy `knowledge/` — it stays in the source project. The pointer in `.source.json` is sufficient.
- **Don't** delete user content in `delivery/`, `decisions/`, or `intents/` — those have human-authored content after first run. Use merge / reconcile semantics. On re-ingest, **never overwrite `intents/`** — reconcile and report (Step 4b); the human applies what they ratify.
- **Don't** overwrite `scopezilla/data/intents.json` (the reconcile base) on re-ingest *before* the reconcile runs — it's the comparison base. Stage fresh upstream elsewhere, reconcile, then update the base (Step 4).
- **Don't** regenerate Scopezilla outputs. A fresh upstream run comes in via reconcile; in-repo scope corrections are `/ql-refine-intent` and `/ql-capture-intent`, not a patch here.
- **Don't** commit. The user reviews the diff first.
- **Don't** call any `mcp__plugin_scopezilla_*` telemetry tools — this skill runs on the launchpad side, not inside a Scopezilla project.

**Grill path (`--grill`) specifically:**

- **Don't** land a single verbatim line from the rich source — a transcript quote, a person's name, PII, or deal/commercial detail — in *any* file the repo keeps (intents, decision record). Provenance is a pointer, never a quote. The repo is a customer deliverable and git history is permanent.
- **Don't** stage dirty source in a scratch file to "organize" it — not even a gitignored one. Hold context in the session; write only clean derived prose.
- **Don't** give the scrub reader (subagent, fresh session, or isolated re-read) the source — only the authored output files. Its independence *is* the check; feeding it the transcripts defeats it. And don't skip the scrub because your harness lacks subagents — use the fresh-session or isolated-re-read fallback instead.
- **Don't** invent scope to fill a gap. A source too thin to rebuild honestly is a Scopezilla scope gap — escalate it (decision-record line + optional upstream issue), don't guess.
- **Don't** grill a settled (🔵 refined-in-repo) intent on a populated repo. The grill only works the reconcile's 🆕 adds and 🔴 conflicts; the never-clobber rule stands.
- **Don't** author grilled intents through `from-json` — they're derived, not transformed. Use `new` (origin local) so a future reconcile correctly treats them as locally-authored, not upstream-deleted.
