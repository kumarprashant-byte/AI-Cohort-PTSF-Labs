# scopezilla/ — read-only upstream mirror

Mirrored from the Scopezilla scoping project on `2026-09-29T10:49:54Z`.

**Source:** `C:/Users/kumar.prashant/scoping-projects/ptsf-lab`

This directory is a **read-only mirror** of the upstream scoping output — the build
bundle, deliverables, and the raw `data/intents.json`. Do not hand-edit it; it's
refreshed from upstream by `/ql-ingest-scopezilla`.

**The canonical Intent is NOT here — it lives in `../intents/INT-NNN/intent.md`**, which
is *living* (human-owned, refined in-repo via `/ql-refine-intent` and `/ql-capture-intent`).
`data/intents.json` here is kept only as the **merge base** that `/ql-ingest-scopezilla`
reconciles against on the next re-ingest — never read it as canonical scope.

## Looking for the knowledge base?

`knowledge/` is intentionally not mirrored (it can be hundreds of MB of Salesforce implementation guide PDFs). Read it directly from the source project:

`C:/Users/kumar.prashant/scoping-projects/ptsf-lab/knowledge/`

That path is also recorded in `.source.json`.
