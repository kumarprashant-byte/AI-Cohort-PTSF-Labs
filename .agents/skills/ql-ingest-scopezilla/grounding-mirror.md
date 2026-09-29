# Mirroring grounding artifacts and architecture ADRs

Reference for `/ql-ingest-scopezilla` Step 4. **Default zero** — most engagements author no grounding artifacts or architecture ADRs, so in the common case there's nothing to mirror and you skip straight past this. It applies to grounded (regulated / ARB-governed) engagements only. Run these blocks (as separate Bash invocations) after the supporting-artifact mirror and before writing `scopezilla/.source.json`.

**Grounding artifacts — copy `reference/` so the `location` pointers resolve.** In a grounded (regulated / ARB) engagement, each intent's grounding `artifacts[]` carry a `location` pointer into the Scopezilla project's `reference/` dir (e.g. `reference/arch-data-flow-v3.pdf` — the approved-architecture doc, wireframe, etc.). Those pointers land in each intent's `## Grounding` section on transform. **If `reference/` is not mirrored, every pointer dangles** — the trace looks complete but the auditor can't open the approved artifact it points at (the same silent-loss failure #49 exists to prevent, one layer down). So: if `data/intents.json` contains any `grounding.artifacts[].location`, mirror `reference/` into the engagement repo so the pointers resolve locally.

```bash
# Only when grounding artifacts point into reference/ (skip if none / dir absent).
if [ -d "<src>/reference" ] && grep -q '"location"' "<src>/data/intents.json" 2>/dev/null; then
  [ -d scopezilla/reference ] && mv scopezilla/reference "$TRASH/reference"
  cp -R "<src>/reference" scopezilla/reference
fi
```

The `location` values are project-relative (`reference/…`); `from-json` prefixes any project-relative location (no URL scheme) with `scopezilla/` when it renders each intent's `## Grounding`, so once the dir is mirrored to `scopezilla/reference/` the pointer resolves from the engagement repo root as `scopezilla/reference/…`. Note in the Step 8 summary that grounding artifacts were mirrored (or, if `reference/` was absent while `location`s exist, flag that the pointers will dangle — surface it, don't leave it silent).

**Architecture ADRs — mirror `decisions/` so inherited premises reach the build (decisions/0009).** In a grounded / ARB-governed engagement, Scopezilla authors the **load-bearing architecture premises** the scope was built on as human-authored markdown ADRs (`00XX-slug.md`) in the project's `decisions/` folder (single-org, LWR-over-Aura, reuse-over-per-program-customization, PII-residency — the standing rules that govern the build; see the SZ→QL `DECISION-HANDOFF-CONTRACT.md`). **Default zero** — most engagements author none, so treat an absent/empty `decisions/` as the normal case. When present, mirror it read-only into `scopezilla/decisions/` — the exact parallel of the `reference/` mirror above — so the premises reach the build agent and the `conformance` report can audit deviations from them:

```bash
# Only when the source project authored architecture ADRs (skip if none / dir absent).
if [ -d "<src>/decisions" ] && ls "<src>/decisions"/*.md >/dev/null 2>&1; then
  [ -d scopezilla/decisions ] && mv scopezilla/decisions "$TRASH/decisions"
  cp -R "<src>/decisions" scopezilla/decisions
fi
```

These stay **read-only provenance** (the mirror, like `scopezilla/reference/` and `scopezilla/data/`) — never hand-edit them; re-ingest re-mirrors them wholesale. They carry SZ's `Source: client-supplied | scopezilla-recommended` on emit; **re-stamp each mirrored file's `Source:` to `scopezilla-inherited`** as you copy it in, so the `conformance` pass can tell a load-bearing scope premise apart from a build note. Build-authored architecture ADRs (a deviation record, `Source: build-authored`) live separately in the living `decisions/architecture/` with a `BLD-NNNN` id — never in this mirror, so the two number namespaces can't collide across re-ingests. Count what you mirrored and report it in Step 8 ("mirrored N architecture ADRs" — or, when the source has none, "no architecture ADRs in source"); a *missing* mirror on an engagement that should have had premises is only catchable if the count is surfaced here.

**Decision-typed grounding pointers resolve under `scopezilla/`, same convention as `reference/`.** A per-intent grounding artifact may point at an ADR — `{type: "decision", ref: "…", location: "decisions/00XX.md"}` — for the rare one-ADR-shapes-one-intent case. `from-json` prefixes a project-relative `location` (no URL scheme, not already `scopezilla/`-prefixed) with `scopezilla/` when it renders `## Grounding` — the same treatment a `reference/…` location gets — so the pointer lands as `scopezilla/decisions/00XX.md`, exactly the convention by which a `reference/…` pointer resolves to `scopezilla/reference/…`. A scheme-qualified location (`http://`, `drive://`, `figma://`, …) already points somewhere real and is left untouched. Because we mirror `<src>/decisions/` to `scopezilla/decisions/` (above), that prefixed pointer resolves to a real file and doesn't dangle: the engine supplies the path prefix, the mirror supplies the target.
