#!/usr/bin/env node
// Capability map generator — a DERIVED, regenerable visual of the whole engagement
// scope as Phase → Epic → Intent (capability), for the Intent & Align phase.
//
// This is the same family of artifact as the README delivery index (see
// scripts/intent-ledger.mjs `index`): a VIEW computed from canonical sources, never
// a hand-maintained document. It writes a single self-contained HTML file you can
// open anywhere (no server, no network, works offline in a conference room) and
// re-run any time scope changes. It is strictly READ-ONLY over scope — it never
// edits an intent. Refinement still flows through /ql-refine-intent and /ql-capture-intent
// (the governed, ratified paths); this map only displays and helps you interrogate.
//
// Inputs (all read-only):
//   intents/INT-NNN/intent.md        the LIVING canonical intents (the capabilities) — the
//                                    STRUCTURAL AUTHORITY: each intent's own phase:/epic:
//                                    frontmatter decides its phase band + epic column
//   scopezilla/data/epics.json       epic names, descriptions, confidence, KB sources
//                                    (ENRICHMENT for the columns the intents define)
//   scopezilla/data/roadmap.json     phase names + PREFERRED epic column order
//                                    (enrichment + ordering — NOT placement). A read-only
//                                    snapshot that can lag the in-repo intents; where they
//                                    diverge the intent wins and the map emits a reconcile
//                                    note pointing at /ql-ingest-scopezilla.
//   delivery/intent-ledger.md        per-intent delivery STATUS (overlaid as a badge)
//   AGENTS.md (ENGAGEMENT block)      OPTIONAL — the "Client / project" line becomes the
//                                    map's title (CLAUDE.md fallback pre-0026). Absent → a
//                                    generic title is used.
//
// Output:
//   delivery/capability-map.html     one self-contained file (data + styles + JS inline)
//
// Engagement-agnostic by construction: phases, epics, column order, intents, and
// their enrichment all come from the data above — nothing about any one client is
// baked in. Drop it into any AI-native delivery engagement and it renders that scope.
//
// Ships beside the /ql-capability-map skill. The skill is vendored into the engagement
// repo (.claude/skills/ql-capability-map/), so this script rides along with it there;
// it's also available in the plugin cache when the plugin is installed. Either way, run
// it from the engagement repo root (the cwd) so it reads that repo's intents/,
// scopezilla/, and ledger and writes the map there.
//
// Usage (from the engagement repo root):
//   node "${CLAUDE_PLUGIN_ROOT}/skills/ql-capability-map/capability-map.mjs"           # write delivery/capability-map.html
//   node "${CLAUDE_PLUGIN_ROOT}/skills/ql-capability-map/capability-map.mjs" --out <f>  # write somewhere else
//   node "${CLAUDE_PLUGIN_ROOT}/skills/ql-capability-map/capability-map.mjs" --open     # write, then print the file:// URL

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const INTENTS_DIR = 'intents';
const EPICS_JSON = 'scopezilla/data/epics.json';
const ROADMAP_JSON = 'scopezilla/data/roadmap.json';
const LEDGER = 'delivery/intent-ledger.md';
// The ENGAGEMENT block lives in AGENTS.md (canonical since decisions/0026);
// CLAUDE.md is the pre-migration fallback for repos not yet resynced.
const ENGAGEMENT_FILES = ['AGENTS.md', 'CLAUDE.md'];
const DEFAULT_OUT = 'delivery/capability-map.html';

// ── Intent parsing ────────────────────────────────────────────────────────────
// A lean, self-contained parser that mirrors the conventions in
// scripts/intent-ledger.mjs (same section headings, same _placeholder_ handling,
// same deps/questions bullet forms) so the two never disagree on what an intent
// says. Deliberately NOT imported from intent-ledger.mjs: that file is plugin-owned
// and gets overwritten by /ql-resync, so this generator stays decoupled from it.

const PLACEHOLDER = /^_(none|todo|n\/a|tbd)_$/i;
// The sections the map renders (deliberately narrower than intent-ledger.mjs —
// no outcome/grounding). Longest-first so a longer name is tested before a
// shorter prefix.
const CANONICAL_HEADINGS = [
  'build target', 'guardrails', 'out of scope', 'acceptance',
  'success criteria', 'dependencies', 'open questions',
].sort((a, b) => b.length - a.length);

// Resolve a "## " heading to its canonical key when the text EQUALS it or STARTS
// WITH it followed by a separator (a colon/em/en-dash adjacent, or a whitespace-
// surrounded hyphen). This MUST mirror intent-ledger.mjs's canonicalHeading so
// the generator's descriptive-suffix headings ("## Build Target — how it works")
// render here the same way the ledger hashes them — a divergence means the map
// shows blank scope for an intent the ledger fully parses.
function canonicalHeading(raw) {
  const h = raw.toLowerCase().trim();
  for (const name of CANONICAL_HEADINGS) {
    if (h === name) return name;
    if (h.startsWith(name) && /^(?:\s*[—–:]|\s+-(?=\s|$))/.test(h.slice(name.length))) return name;
  }
  return null;
}

function normId(raw) {
  const m = String(raw || '').toUpperCase().match(/^INT-(\d+)(.*)$/);
  return m ? `INT-${m[1].padStart(3, '0')}${m[2]}` : String(raw || '').toUpperCase();
}

function splitSections(body) {
  const out = {};
  let cur = null, buf = [];
  // Concatenate on duplicate keys so two headings resolving to the same section
  // don't drop the earlier block (mirrors intent-ledger.mjs).
  const flush = () => { if (cur !== null) { const t = buf.join('\n').trim(); out[cur] = out[cur] ? `${out[cur]}\n${t}` : t; } };
  for (const line of body.split('\n')) {
    // Tolerate leading whitespace and a closed-ATX trailing ` ##`; the trailing
    // colon a heading may carry is handled by canonicalHeading's separator rule.
    const m = line.match(/^\s*##\s+(.+?)\s*#*\s*$/);
    const key = m ? canonicalHeading(m[1]) : null;
    if (key) { flush(); cur = key; buf = []; }
    else if (cur !== null) buf.push(line);
  }
  flush();
  return out;
}

function parseList(block) {
  if (!block) return [];
  return block.split('\n')
    .map((l) => l.match(/^\s*[-*+]\s+(.*)$/))
    .filter(Boolean)
    .map((m) => m[1].trim())
    .filter((s) => s && !PLACEHOLDER.test(s));
}
function parseSectionList(block) {
  // Same reading as intent-ledger.mjs parseList: "-"/"*"/"+" and numbered
  // bullets; a continuation line joins the item above it; other stray text is
  // its own item. Placeholders and whole-line HTML comments are ignored.
  const items = [];
  let afterBlank = false;
  for (const line of (block || '').split('\n')) {
    const t = line.trim();
    if (!t) { afterBlank = true; continue; }
    if (/^<!--.*-->$/.test(t)) continue;
    const m = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (m) items.push(m[1].trim());
    else if (items.length && (!afterBlank || /^(\s{2,}|\t)/.test(line))) items[items.length - 1] += ` ${t}`;
    else if (!(items.length === 0 && PLACEHOLDER.test(t))) items.push(t);
    afterBlank = false;
  }
  return items.filter((s) => s && !PLACEHOLDER.test(s));
}

function parseProse(block) {
  const t = (block || '').trim();
  return PLACEHOLDER.test(t) ? '' : t;
}

function parseDeps(block) {
  const deps = { internal: [], external: [] };
  if (!block) return deps;
  const sub = {};
  let cur = null, buf = [];
  const flush = () => { if (cur) sub[cur] = buf.join('\n'); };
  for (const line of block.split('\n')) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) { flush(); cur = m[1].toLowerCase().trim(); buf = []; }
    else if (cur) buf.push(line);
  }
  flush();
  for (const item of parseList(sub.internal || '')) {
    const m = item.match(/\b(INT-\d+)\b/i);
    if (m) deps.internal.push(normId(m[1]));
  }
  for (const item of parseList(sub.external || '')) {
    const parts = item.split('|').map((p) => p.trim());
    const ext = { system: parts[0] || '', need: parts[1] || '' };
    const ownerPart = parts.find((p) => /^owner\s*:/i.test(p));
    if (ownerPart) ext.owner = ownerPart.replace(/^owner\s*:/i, '').trim();
    deps.external.push(ext);
  }
  return deps;
}

function parseQuestions(block) {
  const out = [];
  for (const item of parseList(block)) {
    const idm = item.match(/^(Q-\d+)\s*:?\s*(.*)$/i);
    const id = idm ? idm[1].toUpperCase() : undefined;
    let rest = idm ? idm[2] : item;
    let answer, status = 'UNANSWERED';
    const am = rest.match(/\s[—–-]\s*ANSWERED\s*:?\s*(.*)$/i);
    if (am) { answer = am[1].trim(); status = 'ANSWERED'; rest = rest.slice(0, am.index).trim(); }
    else { rest = rest.replace(/\s[—–-]\s*UNANSWERED\s*$/i, '').trim(); }
    out.push({ id, question: rest.replace(/\s[—–-]\s*$/, '').trim(), answer, status });
  }
  return out;
}

function parseIntentFile(text) {
  text = text.replace(/\r\n?/g, '\n'); // normalize CRLF/CR so the --- fence + ## headings parse
  let fmText = '', body = text;
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---\n', 4);
    if (end !== -1) { fmText = text.slice(4, end); body = text.slice(end + 5); }
  }
  const fm = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  const s = splitSections(body);
  return {
    id: normId(fm.id),
    phase: fm.phase !== undefined && fm.phase !== '' ? Number(fm.phase) : null,
    epic: fm.epic || fm.epic_id || '',
    confidence: fm.confidence || '',
    origin: (fm.origin || 'scopezilla').toLowerCase(),
    title: fm.title || '',
    build_target: parseProse(s['build target']),
    guardrails: parseSectionList(s['guardrails']),
    out_of_scope: parseSectionList(s['out of scope']),
    acceptance: parseProse(s['acceptance']),
    success_criteria: parseSectionList(s['success criteria']),
    dependencies: parseDeps(s['dependencies']),
    open_questions: parseQuestions(s['open questions']),
  };
}

function loadIntents() {
  let dirs = [];
  try {
    dirs = readdirSync(INTENTS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^INT-\d+/i.test(e.name))
      .map((e) => e.name);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.error(`No ${INTENTS_DIR}/ directory yet. Run /ql-ingest-scopezilla first.`);
      process.exit(2);
    }
    throw e;
  }
  const intents = [];
  for (const dir of dirs) {
    const path = `${INTENTS_DIR}/${dir}/intent.md`;
    if (!existsSync(path)) continue;
    intents.push(parseIntentFile(readFileSync(path, 'utf8')));
  }
  intents.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return intents;
}

// ── Ledger status (overlay only — never authored here) ──────────────────────────
function loadLedgerStatus() {
  const byId = {};
  if (!existsSync(LEDGER)) return byId;
  const text = readFileSync(LEDGER, 'utf8');
  const rows = text.split('\n').filter((l) => l.trim().startsWith('|'));
  if (rows.length < 2) return byId;
  const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
  const header = cells(rows[0]).map((h) => h.toLowerCase());
  const idCol = header.findIndex((h) => h === 'intent');
  const statusCol = header.findIndex((h) => h === 'status');
  if (idCol === -1 || statusCol === -1) return byId;
  for (const line of rows.slice(2)) {
    const c = cells(line);
    const id = (c[idCol] || '').replace(/[*`]/g, '').trim().toUpperCase();
    if (!/^INT-\d+/.test(id)) continue;
    byId[id] = c[statusCol] || '';
  }
  return byId;
}

function statusKey(raw) {
  // Retired first: it matches none of the others, so without this it falls through
  // to 'not-started' — the de-scoped/un-started conflation issue #139 fixes.
  if (/retired|🚫/i.test(raw)) return 'retired';
  if (/re-verify|🔄/i.test(raw)) return 'reverify';
  if (/delivered|✅/i.test(raw)) return 'delivered';
  if (/progress|🔧/i.test(raw)) return 'in-progress';
  return 'not-started';
}

// ── Load the rest of the model ──────────────────────────────────────────────────
function loadJson(path, label) {
  if (!existsSync(path)) {
    console.error(`Missing ${label} (${path}). Run /ql-ingest-scopezilla to refresh the mirror.`);
    process.exit(2);
  }
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { console.error(`Could not parse ${path}: ${e.message}`); process.exit(2); }
}

// Derive the map's title from the engagement's own AGENTS.md (or CLAUDE.md, pre-0026)
// — the "Client / project" line inside the ENGAGEMENT block. No client name is baked
// into this script; if no file or line is found we fall back to a generic title.
function deriveTitle() {
  for (const file of ENGAGEMENT_FILES) {
    if (!existsSync(file)) continue;
    try {
      const md = readFileSync(file, 'utf8');
      const m = md.match(/^\s*-\s*\*\*Client\s*\/\s*project:\*\*\s*(.+?)\s*$/im);
      if (m && m[1].trim()) return m[1].trim();
    } catch { /* try the next file */ }
  }
  return 'AI-Native Delivery Engagement';
}

// ── Build the view model ─────────────────────────────────────────────────────────
function build() {
  const intents = loadIntents();
  const epicsRaw = loadJson(EPICS_JSON, 'epics');
  const roadmapRaw = loadJson(ROADMAP_JSON, 'roadmap');
  const ledger = loadLedgerStatus();
  const title = deriveTitle();

  const warnings = [];

  const epicById = {};
  for (const e of epicsRaw) epicById[e.epic_id] = e;

  // The LIVING INTENTS are the structural authority. Each intent's own `phase:`/`epic:`
  // frontmatter decides which column it lands in; the Scopezilla mirror (roadmap.json +
  // epics.json) is ENRICHMENT and a PREFERRED ORDERING only — it supplies phase names,
  // epic names/descriptions/KB sources, and the column order to prefer. This is the whole
  // point of the map being "computed from the living intents": when scope is restructured
  // in-repo (a /ql-refine-intent that re-homes an intent's phase or epic), the mirror is a
  // read-only snapshot that lags until the next /ql-ingest-scopezilla reconcile. If the mirror
  // were treated as the structural authority, the map would render the STALE skeleton and
  // silently contradict the very intents it claims to visualize. So: the intent always wins
  // on placement; where the mirror disagrees or is missing, we ENRICH what we can and
  // surface the divergence as a reconcile note — never demote a real capability to an
  // "unmapped" ghost, and never render a phase/epic layout the intents no longer agree with.
  //
  // phaseMeta: roadmap-derived enrichment keyed by phase number (name, objectives, and the
  // preferred epic column order). Absent/extra phases fall back to "Phase N" + intent order.
  const phaseMeta = new Map();
  for (const p of roadmapRaw) {
    const num = Number(p.phase_number);
    if (!Number.isFinite(num)) {
      warnings.push(`Scopezilla mirror phase "${p.phase_name || p.phase_number}" has a non-numeric phase_number (${p.phase_number}) — its name/order can't be applied; intents in that phase fall back to "Phase N" + ID order.`);
      continue;
    }
    phaseMeta.set(num, {
      name: p.phase_name || '',
      objectives: p.objectives || '',
      epicOrder: String(p.epics_included || '').split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  // Roadmap's view of which phase(s) list each epic — used ONLY as a soft fallback to place
  // an intent whose own `phase:` is blank. It never overrides a phase the intent declares.
  const roadmapPhasesOfEpic = {};
  for (const [num, meta] of phaseMeta) for (const eid of meta.epicOrder) (roadmapPhasesOfEpic[eid] = roadmapPhasesOfEpic[eid] || []).push(num);

  // Honesty check up front: an intent whose id couldn't be read is a broken/empty file —
  // surface it rather than letting it vanish into a blank-id ghost card.
  for (const i of intents) {
    if (!/^INT-\d+/.test(i.id)) {
      warnings.push(`An intent file could not be read (no valid INT-NNN id${i.title ? `; title "${i.title}"` : ''}) — fix or remove it.`);
    }
  }

  // Group intents into (epic, phase) columns straight from their own frontmatter. Each
  // column carries its epic/phase explicitly so we never parse them back out of a key.
  const colKey = (epic, phase) => `${epic} ${phase}`;
  const colMap = new Map();
  const addTo = (epic, phase, intent) => {
    const key = colKey(epic, phase);
    if (!colMap.has(key)) colMap.set(key, { epic, phase, intents: [] });
    colMap.get(key).intents.push(intent);
  };
  for (const i of intents) {
    let phase;
    if (i.phase !== null && i.phase !== undefined) {
      // The intent's own frontmatter is authoritative for placement.
      phase = i.phase;
      const rp = roadmapPhasesOfEpic[i.epic];
      if (rp && !rp.includes(phase)) {
        warnings.push(`${i.id}: placed in phase ${phase} per the intent, but the Scopezilla mirror schedules its epic ${i.epic} in phase(s) ${rp.join(', ')} — following the intent; the mirror looks stale (run /ql-ingest-scopezilla to reconcile).`);
      }
    } else {
      // No own phase — fall back to the epic's sole roadmap phase; leave Unmapped if the
      // mirror can't disambiguate. (The intent is still shown, never dropped.)
      const rp = roadmapPhasesOfEpic[i.epic];
      phase = rp && rp.length === 1 ? rp[0] : null;
      if (!rp) {
        warnings.push(`${i.id}: no phase in frontmatter and its epic ${i.epic} isn't in the Scopezilla mirror — shown as Unmapped; set a phase in the intent to place it.`);
      } else if (rp.length > 1) {
        warnings.push(`${i.id}: no phase in frontmatter and its epic ${i.epic} spans phases ${rp.join(', ')} in the mirror — shown as Unmapped; set a phase in the intent to place it.`);
      }
    }
    addTo(i.epic, phase, i);
  }

  // Order columns: by phase (numeric; Unmapped last), then within a phase by the mirror's
  // preferred epic order, then any epic the intents declare that the mirror doesn't list —
  // appended in ID order rather than hidden.
  const phaseRank = (phase) => (phase == null ? Infinity : phase);
  const epicRank = (phase, epic) => {
    const order = (phase != null && phaseMeta.get(phase)?.epicOrder) || [];
    const idx = order.indexOf(epic);
    return idx === -1 ? [1, epic] : [0, idx];
  };
  const cyclesSeen = new Set();
  const decorateColumn = ({ epic, phase, intents: list }) => {
    const e = epicById[epic];
    if (!e) {
      warnings.push(`Epic ${epic} is used by ${list.length} intent(s) but isn't in the Scopezilla mirror — showing its id in place of a name; run /ql-ingest-scopezilla to enrich it.`);
    }
    const ordered = orderByDeps(list, (id) => {
      if (cyclesSeen.has(id)) return;
      cyclesSeen.add(id);
      warnings.push(`Dependency cycle involving ${id} in epic ${epic} — sequencing isn't settled; intents fall back to ID order here.`);
    });
    return {
      phase,
      epic,
      name: e ? e.epic_name : epic,
      description: e ? e.description : '',
      confidence: e ? e.confidence : '',
      kb_sources: e ? e.kb_sources || [] : [],
      ...(e ? {} : { mirrorMissing: true }),
      intents: ordered.map((i) => decorate(i, ledger)),
    };
  };
  const columns = [...colMap.values()]
    .sort((a, b) => {
      // Compare phases directly (not by subtraction) so two Unmapped columns —
      // both rank Infinity — compare equal (0) and fall through to the epic-order
      // tiebreak, rather than yielding Infinity - Infinity = NaN (unstable sort).
      const ra = phaseRank(a.phase), rb = phaseRank(b.phase);
      if (ra !== rb) return ra < rb ? -1 : 1;
      const [ta, va] = epicRank(a.phase, a.epic);
      const [tb, vb] = epicRank(b.phase, b.epic);
      if (ta !== tb) return ta - tb;
      return ta === 0 ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true });
    })
    .map(decorateColumn);

  // Phases present in the map (roadmap enrichment + any phase the intents declare that the
  // mirror doesn't). Kept for the returned model / downstream use.
  const phaseNameOf = (num) => phaseMeta.get(num)?.name || (num == null ? 'Unmapped' : `Phase ${num}`);
  const phases = [...new Set(columns.map((c) => c.phase))]
    .sort((a, b) => phaseRank(a) - phaseRank(b))
    .map((num) => ({ number: num, name: phaseNameOf(num), objectives: phaseMeta.get(num)?.objectives || '' }));

  // Phase band segments: contiguous run of columns sharing a phase, in column order.
  const bands = [];
  for (const col of columns) {
    const last = bands[bands.length - 1];
    if (last && last.phase === col.phase) { last.span++; }
    else bands.push({ phase: col.phase, span: 1 });
  }
  for (const b of bands) {
    b.name = phaseNameOf(b.phase);
    b.objectives = phaseMeta.get(b.phase)?.objectives || '';
  }

  // Phase 0 (and any phase with no epic columns) — surfaced as a context note, not a
  // column, since it carries gates/discovery rather than buildable capabilities. A gating
  // phase is one the mirror declares with no epics AND that no intent placed itself in.
  const phasesWithColumns = new Set(columns.map((c) => c.phase));
  const gatingPhases = [...phaseMeta]
    .filter(([num, m]) => !m.epicOrder.length && !phasesWithColumns.has(num))
    .map(([number, m]) => ({ number, name: m.name, objectives: m.objectives, epicIds: [] }));

  // Rollup stats for the header. Each intent appears in exactly one column now, so the
  // flat list is already distinct; epics are counted distinctly (a spanning epic has one
  // column per phase but is still one epic).
  const allIntents = columns.flatMap((c) => c.intents);
  const stats = {
    intents: allIntents.length,
    epics: new Set(columns.map((c) => c.epic)).size,
    phases: new Set(columns.map((c) => c.phase)).size,
    confidence: tally(allIntents.map((i) => i.confidenceKey)),
    openQuestions: allIntents.reduce((n, i) => n + i.openCount, 0),
    externalDeps: allIntents.reduce((n, i) => n + i.extDepCount, 0),
  };

  return { title, phases, columns, bands, gatingPhases, stats, warnings };
}

// Order intents within one epic so that anything an intent depends on (its recorded
// Internal dependencies) comes before it — a stable topological sort. Dependencies on
// intents outside this epic are ignored for ordering (they can't move across columns).
// Cycles and intents with no in-epic deps fall back to numeric ID order, so the result
// is always deterministic and never throws.
function orderByDeps(list, onCycle) {
  const items = list.slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  // Track traversal by array index, not by id — two intents that share an id (or both
  // parse to an empty id) are distinct nodes and must each survive into the output.
  const idxById = new Map(); // first item wins as the dependency target for an id
  items.forEach((it, idx) => { if (!idxById.has(it.id)) idxById.set(it.id, idx); });
  const visited = new Array(items.length).fill(false);
  const onStack = new Array(items.length).fill(false);
  const out = [];
  const visit = (idx) => {
    if (visited[idx]) return;
    if (onStack[idx]) { if (onCycle) onCycle(items[idx].id); return; } // cycle — bail, ID-order fallback seeds traversal
    onStack[idx] = true;
    for (const dep of items[idx].dependencies.internal) {
      const depIdx = idxById.get(dep);
      if (depIdx !== undefined) visit(depIdx);
    }
    onStack[idx] = false;
    visited[idx] = true;
    out.push(items[idx]);
  };
  for (let i = 0; i < items.length; i++) visit(i); // seed in ID order → stable
  return out;
}

function decorate(i, ledger) {
  const openCount = i.open_questions.filter((q) => q.status !== 'ANSWERED').length;
  return {
    ...i,
    status: statusKey(ledger[i.id] || ''),
    confidenceKey: confidenceKey(i.confidence),
    openCount,
    openTotal: i.open_questions.length,
    extDepCount: i.dependencies.external.length,
    intDepCount: i.dependencies.internal.length,
  };
}

function confidenceKey(c) {
  const v = (c || '').toLowerCase();
  if (v.startsWith('conf')) return 'confirmed';
  if (v.startsWith('assum')) return 'assumed';
  if (v.startsWith('draft')) return 'draft';
  if (v.startsWith('unk')) return 'unknown';
  return v || 'unknown';
}

function tally(arr) {
  const out = {};
  for (const x of arr) out[x] = (out[x] || 0) + 1;
  return out;
}

// ── HTML rendering ────────────────────────────────────────────────────────────
// Single self-contained file: data embedded as JSON, styles + a small vanilla-JS
// renderer inline. No build step, no dependencies, no network — opens from disk.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(model, generatedAt) {
  // Embed the data safely inside a <script> by neutralizing </ and Unicode line seps.
  const dataJson = JSON.stringify(model)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Capability Map — ${esc(model.title)}</title>
<style>
${STYLE}
</style>
</head>
<body>
<header class="topbar">
  <div class="title">
    <h1>Capability Map</h1>
    <div class="sub">${esc(model.title)} · Phase → Epic → Intent · <span class="muted">refreshed ${esc(generatedAt)}</span></div>
  </div>
  <div class="stats" id="stats"></div>
</header>

<section class="controls">
  <input type="search" id="search" placeholder="Filter capabilities (title, id, system)…" autocomplete="off">
  <div class="chipset" id="confFilters" aria-label="Confidence filters">
    <button class="chip" data-conf="confirmed"><span class="dot conf-confirmed"></span>Confirmed</button>
    <button class="chip" data-conf="assumed"><span class="dot conf-assumed"></span>Assumed</button>
    <button class="chip" data-conf="unknown"><span class="dot conf-unknown"></span>Unknown</button>
    <button class="chip" data-conf="draft"><span class="dot conf-draft"></span>Draft</button>
  </div>
  <div class="chipset" aria-label="Attribute filters">
    <button class="chip" id="fOpen">❓ Has open questions</button>
    <button class="chip" id="fDep">🔗 Has external deps</button>
  </div>
  <button class="chip ghost" id="reset">Reset</button>
</section>

<main id="grid" class="grid" role="grid" aria-label="Capability map"></main>
<div id="empty" class="empty" hidden>No capabilities match the current filters.</div>

<aside id="panel" class="panel" hidden aria-live="polite">
  <button class="panel-close" id="panelClose" aria-label="Close">×</button>
  <div id="panelBody"></div>
</aside>
<div id="backdrop" class="backdrop" hidden></div>

<footer class="footer" id="warnings"></footer>

<script>
const MODEL = ${dataJson};
${SCRIPT}
</script>
</body>
</html>
`;
}

// Styles and client script kept as template constants below for readability.
const STYLE = String.raw`
:root{
  --bg:#f4f6f9; --panel:#ffffff; --card:#ffffff; --line:#dde2ea; --ink:#1f2530; --muted:#5f6b7a;
  --accent:#2563eb;
  --p0:#64748b; --p1:#4f46e5; --p2:#0d9488; --p3:#d97706; --p4:#9333ea; --pX:#64748b;
  --conf-confirmed:#16a34a; --conf-assumed:#d97706; --conf-unknown:#dc2626; --conf-draft:#94a3b8;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}
.muted{color:var(--muted)}
.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:18px 22px;border-bottom:1px solid var(--line);background:var(--panel);flex-wrap:wrap}
.title h1{margin:0;font-size:20px;letter-spacing:.2px}
.title .sub{margin-top:4px;color:var(--muted);font-size:12.5px}
.stats{display:flex;gap:18px;flex-wrap:wrap;align-items:center}
.stat{text-align:center}
.stat b{display:block;font-size:20px;line-height:1}
.stat span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.controls{display:flex;gap:10px;align-items:center;padding:12px 22px;border-bottom:1px solid var(--line);flex-wrap:wrap;position:sticky;top:0;background:var(--bg);z-index:5}
#search{flex:1;min-width:220px;background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:8px 12px;font-size:13px}
.chipset{display:flex;gap:6px;flex-wrap:wrap}
.chip{background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:999px;padding:6px 11px;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;user-select:none}
.chip:hover{border-color:#aeb7c4}
.chip.off{opacity:.45;text-decoration:line-through}
.chip.on{background:#e7edff;border-color:var(--accent);color:#1e3a8a;font-weight:600;box-shadow:inset 0 0 0 1px var(--accent)}
.chip.ghost{background:transparent}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}
.conf-confirmed{background:var(--conf-confirmed)} .conf-assumed{background:var(--conf-assumed)}
.conf-unknown{background:var(--conf-unknown)} .conf-draft{background:var(--conf-draft)}
.grid{display:grid;column-gap:14px;row-gap:10px;padding:18px 22px 48px;overflow-x:auto;align-items:start;justify-content:start}
.col{display:flex;flex-direction:column;gap:8px;min-width:0}
.band{border-radius:9px;padding:9px 13px;font-size:12px;font-weight:700;letter-spacing:.3px;color:#fff;display:flex;align-items:center;box-shadow:0 1px 2px #0000001a;min-height:38px;box-sizing:border-box}
.band .bphase{flex:none;font-size:11px;opacity:.9;text-transform:uppercase;letter-spacing:.6px;margin-right:9px;padding-right:9px;border-right:1px solid #ffffff66}
.band .bname{font-weight:600;letter-spacing:.1px;line-height:1.25}
.col-head{border-radius:9px;padding:10px 11px;border:1px solid var(--line);border-top:3px solid var(--c);background:color-mix(in srgb, var(--c) 9%, #fff)}
.col-head .eid{font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--c)}
.col-head .ename{font-size:13px;font-weight:600;margin-top:2px;cursor:pointer;color:var(--ink)}
.col-head .ename:hover{text-decoration:underline}
.col-head .erow{display:flex;gap:8px;margin-top:7px;flex-wrap:wrap;align-items:center}
.tag{font-size:10.5px;padding:2px 7px;border-radius:999px;border:1px solid var(--line);color:var(--muted);background:#fff}
.cell{border:1px solid var(--line);border-left-width:4px;border-radius:8px;padding:9px 10px;background:color-mix(in srgb, var(--c) 5%, #fff);cursor:pointer;transition:transform .06s,box-shadow .12s,border-color .12s}
.cell:hover{transform:translateY(-1px);border-color:#aeb7c4;box-shadow:0 3px 10px #0000001f}
.cell.dim{opacity:.28;filter:saturate(.5)}
.col-head.dim{opacity:.32;filter:saturate(.45)}
.band.dim{opacity:.34;filter:saturate(.45)}
.cell .cid{font-size:10.5px;font-weight:700;letter-spacing:.4px;color:var(--muted);display:flex;justify-content:space-between;align-items:center;gap:6px}
.cell .ctitle{font-size:12.5px;margin-top:3px;font-weight:500;color:var(--ink)}
.cell .crow{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center}
.badge{font-size:10.5px;padding:1px 6px;border-radius:6px;background:#fff;border:1px solid var(--line);color:var(--muted);display:inline-flex;gap:3px;align-items:center}
.badge.warn{color:#b45309;border-color:#fcd9a8;background:#fff7ed}
.badge.dep{color:#0369a1;border-color:#bae6fd;background:#f0f9ff}
.status{font-size:11px}
.empty{padding:40px 22px;color:var(--muted)}
.panel{position:fixed;top:0;right:0;width:min(560px,94vw);height:100vh;background:var(--panel);border-left:1px solid var(--line);box-shadow:-12px 0 40px #00000026;overflow-y:auto;z-index:20;padding:22px 24px 60px}
.panel-close{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--muted);font-size:26px;cursor:pointer;line-height:1}
.panel h2{margin:2px 0 2px;font-size:18px;padding-right:30px}
.panel .pmeta{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px}
.panel h3{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin:18px 0 6px;border-bottom:1px solid var(--line);padding-bottom:4px}
.panel p{margin:0 0 8px}
.panel ul{margin:0;padding-left:18px}
.panel li{margin:3px 0}
.panel .q{margin:6px 0;padding:8px 10px;border-radius:6px;background:#f6f8fb;border:1px solid var(--line)}
.panel .q.unanswered{border-left:3px solid var(--conf-assumed)}
.panel .q.answered{border-left:3px solid var(--conf-confirmed)}
.panel .qid{font-weight:700;font-size:11px;color:var(--muted)}
.panel .ext{margin:6px 0;padding:8px 10px;border-radius:6px;background:#f6f8fb;border:1px solid var(--line)}
.panel .ext .sys{font-weight:600}
.panel .ext .owner{font-size:11.5px;color:var(--muted)}
.panel .kb{font-size:11.5px;color:var(--muted);font-family:ui-monospace,monospace}
.panel .governed{margin-top:22px;padding:11px 13px;border-radius:8px;background:#eef2f7;border:1px dashed var(--line);font-size:12px;color:var(--muted)}
.panel .governed code{color:var(--ink)}
.backdrop{position:fixed;inset:0;background:#00000040;z-index:15}
.footer{padding:12px 22px 30px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
.footer .warn{color:#b45309}
.p0{--c:var(--p0)} .p1{--c:var(--p1)} .p2{--c:var(--p2)} .p3{--c:var(--p3)} .p4{--c:var(--p4)} .pX{--c:var(--pX)}
.band.pc{background:var(--c)}
.cell.pc{border-left-color:var(--c)}
`;

const SCRIPT = String.raw`
const phaseClass = (n) => (n==null ? 'pX' : 'p'+n);
const CONF_LABEL = {confirmed:'Confirmed',assumed:'Assumed',unknown:'Unknown',draft:'Draft'};
const STATUS_GLYPH = {'not-started':'⬜','in-progress':'🔧','delivered':'✅','reverify':'🔄','retired':'🚫'};
const STATUS_LABEL = {'not-started':'Not started','in-progress':'In progress','delivered':'Delivered','reverify':'Needs re-verify','retired':'Retired'};

// Flatten all intents once so the side panel can resolve a dependency ID to its title
// and compute the reverse "blocks" relationship (who depends on this intent).
const ALL_INTENTS = MODEL.columns.flatMap(c=>c.intents.map(it=>({it,epic:c.epic,phase:c.phase})));
const INTENT_BY_ID = {}; ALL_INTENTS.forEach(r=>{INTENT_BY_ID[r.it.id]=r;});
const titleFor = (id)=>{const r=INTENT_BY_ID[id]; return r? id+' — '+r.it.title : id;};
const blockedBy = (id)=> ALL_INTENTS.filter(r=>(r.it.dependencies.internal||[]).includes(id)).map(r=>r.it.id);

const state = {
  q:'',
  confs:new Set(),           // empty = all
  openOnly:false, depOnly:false,
};

function filterActive(){
  return !!(state.confs.size || state.openOnly || state.depOnly || state.q);
}

function matches(it){
  if(state.confs.size && !state.confs.has(it.confidenceKey)) return false;
  if(state.openOnly && it.openCount===0) return false;
  if(state.depOnly && it.extDepCount===0) return false;
  if(state.q){
    const hay=(it.id+' '+it.title+' '+(it.dependencies.external||[]).map(e=>e.system).join(' ')).toLowerCase();
    if(!hay.includes(state.q)) return false;
  }
  return true;
}

function renderStats(){
  const s=MODEL.stats;
  const c=s.confidence||{};
  document.getElementById('stats').innerHTML =
    stat(s.intents,'Intents') + stat(s.epics,'Epics') + stat(s.phases,'Phases') +
    stat((c.confirmed||0),'Confirmed') + stat((c.assumed||0),'Assumed') +
    stat(s.openQuestions,'Open Qs') + stat(s.externalDeps,'Ext deps');
}
const stat=(n,l)=>'<div class="stat"><b>'+n+'</b><span>'+l+'</span></div>';

const COL_W = 244; // px per epic column — keeps bands and columns aligned on one grid

function render(){
  const grid=document.getElementById('grid'); grid.innerHTML='';
  const n=MODEL.columns.length;
  grid.style.gridTemplateColumns='repeat('+n+', '+COL_W+'px)';
  let visible=0;
  const active=filterActive();

  // Precompute, per column and per phase, whether any intent matches the active
  // filter — so a filter dims epics/phases that are wholly irrelevant to it,
  // rather than leaving their headers bright while only the cells dim.
  const colMatch={}; const phaseMatch={};
  MODEL.columns.forEach((col,idx)=>{
    const any=col.intents.some(matches);
    colMatch[idx]=any;
    const pk=String(col.phase);
    phaseMatch[pk]=phaseMatch[pk]||any;
  });

  // Row 1 — phase bands, each spanning the columns of its phase, with the phase
  // name inline. Bands are already in column order with their span.
  let startCol=1;
  MODEL.bands.forEach(b=>{
    const band=document.createElement('div');
    const bdim=active && !phaseMatch[String(b.phase)];
    band.className='band pc '+phaseClass(b.phase)+(bdim?' dim':'');
    band.style.gridColumn=startCol+' / span '+b.span;
    band.style.gridRow='1';
    const label=(b.phase==null?'Unmapped':'Phase '+b.phase);
    band.innerHTML='<span class="bphase">'+label+'</span><span class="bname">'+escapeHtml(b.name||'')+'</span>';
    grid.appendChild(band);
    startCol+=b.span;
  });

  // Row 2 — one stacked column per epic, in the same order, aligned under its band.
  MODEL.columns.forEach((col,idx)=>{
    col.intents.forEach(it=>{ it._phase=col.phase; });
    const wrap=document.createElement('div'); wrap.className='col '+phaseClass(col.phase);
    wrap.style.gridColumn=(idx+1)+' / span 1';
    wrap.style.gridRow='2';

    const headDim=active && !colMatch[idx];
    const head=document.createElement('div'); head.className='col-head'+(headDim?' dim':'');
    head.innerHTML='<div class="eid">'+escapeHtml(col.epic)+'</div><div class="ename">'+escapeHtml(col.name)+'</div>'+
      '<div class="erow"><span class="tag">'+col.intents.length+' intents</span></div>';
    head.querySelector('.ename').onclick=()=>openEpic(col);
    wrap.appendChild(head);

    col.intents.forEach(it=>{
      const show=matches(it); if(show)visible++;
      const cell=document.createElement('div');
      cell.className='cell pc '+phaseClass(col.phase)+(show?'':' dim');
      cell.innerHTML=
        '<div class="cid"><span>'+escapeHtml(it.id)+'</span><span class="status" title="'+STATUS_LABEL[it.status]+'">'+STATUS_GLYPH[it.status]+'</span></div>'+
        '<div class="ctitle">'+escapeHtml(it.title)+'</div>'+
        '<div class="crow">'+
          '<span class="badge"><span class="dot conf-'+it.confidenceKey+'"></span>'+(CONF_LABEL[it.confidenceKey]||it.confidenceKey)+'</span>'+
          (it.openCount?'<span class="badge warn">❓'+it.openCount+'</span>':'')+
          (it.extDepCount?'<span class="badge dep">🔗'+it.extDepCount+'</span>':'')+
        '</div>';
      cell.onclick=()=>openIntent(it,col);
      wrap.appendChild(cell);
    });
    grid.appendChild(wrap);
  });
  document.getElementById('empty').hidden = visible>0;
}

function openIntent(it,col){
  const b=document.getElementById('panelBody');
  const list=(arr)=> arr&&arr.length ? '<ul>'+arr.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>' : '<p class="muted">—</p>';
  const qs = it.open_questions&&it.open_questions.length
    ? it.open_questions.map(q=>'<div class="q '+(q.status==='ANSWERED'?'answered':'unanswered')+'"><span class="qid">'+(q.id||'Q')+'</span> '+escapeHtml(q.question)+(q.answer?'<br><b>Answered:</b> '+escapeHtml(q.answer):'')+'</div>').join('')
    : '<p class="muted">None.</p>';
  const ext = it.dependencies.external&&it.dependencies.external.length
    ? it.dependencies.external.map(e=>'<div class="ext"><div class="sys">'+escapeHtml(e.system)+'</div>'+(e.need?'<div>'+escapeHtml(e.need)+'</div>':'')+(e.owner?'<div class="owner">owner: '+escapeHtml(e.owner)+'</div>':'')+'</div>').join('')
    : '<p class="muted">None.</p>';
  const dependsOn = (it.dependencies.internal||[]);
  const blocks = blockedBy(it.id);
  const depList=(ids)=> ids&&ids.length
    ? '<ul>'+ids.map(x=>'<li>'+escapeHtml(titleFor(x))+'</li>').join('')+'</ul>' : '<p class="muted">None.</p>';
  b.innerHTML=
    '<h2>'+escapeHtml(it.id)+' — '+escapeHtml(it.title)+'</h2>'+
    '<div class="pmeta">'+
      '<span class="tag">'+escapeHtml(col.epic+' · '+col.name)+'</span>'+
      '<span class="tag">Phase '+(col.phase==null?'—':col.phase)+'</span>'+
      '<span class="badge"><span class="dot conf-'+it.confidenceKey+'"></span>'+(CONF_LABEL[it.confidenceKey]||it.confidenceKey)+'</span>'+
      '<span class="badge">'+STATUS_GLYPH[it.status]+' '+STATUS_LABEL[it.status]+'</span>'+
    '</div>'+
    '<h3>Build target</h3>'+(it.build_target?'<p>'+escapeHtml(it.build_target)+'</p>':'<p class="muted">—</p>')+
    '<h3>Guardrails</h3>'+list(it.guardrails)+
    '<h3>Out of scope</h3>'+list(it.out_of_scope)+
    '<h3>Acceptance</h3>'+(it.acceptance?'<p>'+escapeHtml(it.acceptance)+'</p>':'<p class="muted">—</p>')+
    (it.success_criteria&&it.success_criteria.length?'<h3>Success criteria</h3>'+list(it.success_criteria):'')+
    '<h3>Open questions ('+it.openCount+' open / '+it.openTotal+' total)</h3>'+qs+
    '<h3>Depends on</h3>'+depList(dependsOn)+
    '<h3>Blocks</h3>'+depList(blocks)+
    '<h3>External dependencies</h3>'+ext+
    '<div class="governed">Read-only view. To change this scope, use the governed paths — '+
      '<code>/ql-refine-intent '+escapeHtml(it.id)+'</code> (edit / answer a question) or <code>/ql-capture-intent</code> (new capability from notes). '+
      'The map never edits intents; it regenerates after a ratified change.</div>';
  showPanel();
}

function openEpic(col){
  const b=document.getElementById('panelBody');
  const kb = col.kb_sources&&col.kb_sources.length ? '<h3>KB sources</h3><ul>'+col.kb_sources.map(k=>'<li class="kb">'+escapeHtml(k)+'</li>').join('')+'</ul>' : '';
  b.innerHTML=
    '<h2>'+escapeHtml(col.epic)+' — '+escapeHtml(col.name)+'</h2>'+
    '<div class="pmeta"><span class="tag">Phase '+(col.phase==null?'—':col.phase)+'</span>'+
      (col.confidence?'<span class="badge"><span class="dot conf-'+(col.confidence.toLowerCase().startsWith('conf')?'confirmed':col.confidence.toLowerCase().startsWith('assum')?'assumed':'unknown')+'"></span>'+escapeHtml(col.confidence)+'</span>':'')+
      '<span class="tag">'+col.intents.length+' intents</span></div>'+
    '<h3>Description</h3><p>'+escapeHtml(col.description||'—')+'</p>'+
    '<h3>Capabilities (intents)</h3><ul>'+col.intents.map(i=>'<li><b>'+escapeHtml(i.id)+'</b> — '+escapeHtml(i.title)+'</li>').join('')+'</ul>'+
    kb;
  showPanel();
}

function showPanel(){ document.getElementById('panel').hidden=false; document.getElementById('backdrop').hidden=false; }
function hidePanel(){ document.getElementById('panel').hidden=true; document.getElementById('backdrop').hidden=true; }

function renderWarnings(){
  const el=document.getElementById('warnings');
  const base='Phase → Epic → Intent. Click a capability for its full intent; click an epic name for the epic. Cells colored by phase.';
  if(MODEL.warnings&&MODEL.warnings.length){
    el.innerHTML=base+'<br><span class="warn">⚠ Data notes: '+MODEL.warnings.map(escapeHtml).join(' · ')+'</span>';
  } else el.textContent=base;
}

function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

// wire controls
document.getElementById('search').addEventListener('input',e=>{state.q=e.target.value.toLowerCase().trim();render();});
document.querySelectorAll('#confFilters .chip').forEach(btn=>{
  btn.onclick=()=>{const c=btn.dataset.conf; state.confs.has(c)?state.confs.delete(c):state.confs.add(c); btn.classList.toggle('on',state.confs.has(c)); render();};
});
document.getElementById('fOpen').onclick=function(){state.openOnly=!state.openOnly;this.classList.toggle('on',state.openOnly);render();};
document.getElementById('fDep').onclick=function(){state.depOnly=!state.depOnly;this.classList.toggle('on',state.depOnly);render();};
document.getElementById('reset').onclick=()=>{
  state.q='';state.confs.clear();state.openOnly=false;state.depOnly=false;
  document.getElementById('search').value='';
  document.querySelectorAll('.chip.on').forEach(c=>c.classList.remove('on'));
  render();
};
document.getElementById('panelClose').onclick=hidePanel;
document.getElementById('backdrop').onclick=hidePanel;
document.addEventListener('keydown',e=>{if(e.key==='Escape')hidePanel();});

renderStats(); renderWarnings(); render();
`;

// Local timestamp in the timezone of whoever refreshed the map (e.g.
// "2026-06-26 14:32 PDT") — so the "refreshed" stamp reads in the practitioner's
// own clock, with the zone made explicit rather than assumed.
function formatTimestamp(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZoneName: 'short',
  }).formatToParts(d);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || '';
  const zone = get('timeZoneName');
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}${zone ? ' ' + zone : ''}`;
}

// ── main ────────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  if (outIdx !== -1 && (args[outIdx + 1] === undefined || args[outIdx + 1].startsWith('--'))) {
    console.error('--out needs a file path, e.g. --out delivery/capability-map.html');
    process.exit(2);
  }
  const out = outIdx !== -1 ? args[outIdx + 1] : DEFAULT_OUT;
  const generatedAt = formatTimestamp(new Date());

  const model = build();
  const html = renderHtml(model, generatedAt);
  try {
    writeFileSync(out, html);
  } catch (e) {
    console.error(`Could not write ${out}: ${e.message}`);
    process.exit(2);
  }

  console.log(`Capability map → ${out}`);
  console.log(`  ${model.stats.intents} intents · ${model.stats.epics} epics · ${model.stats.phases} build phase(s)`);
  if (model.warnings.length) {
    console.log('  ⚠ data notes (surfaced in the map footer too):');
    for (const w of model.warnings) console.log(`    - ${w}`);
  }
  if (args.includes('--open')) console.log(`  open: file://${resolve(out)}`);
}

main();
