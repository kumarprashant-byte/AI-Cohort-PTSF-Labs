#!/usr/bin/env node
// Emit a compact, phase-tagged digest of every intent so /ql-check-scope can
// reason about whether PR feedback is already covered by future scope without
// loading every full intent file into context.
//
// Canonical source: intents/INT-NNN/intent.md — the LIVING canonical Intent
// (human-authored, refined in-repo via /ql-refine-intent; see AGENTS.md). This
// script only reads it.
//
// Usage: node scope-digest.mjs [--phase N] [--deps] [--neighbors INT-NNN]
//   --phase N  mark intents with phase > N as "FUTURE" (the ones to watch for).
//              If omitted, nothing is marked future; all intents are listed.
//   --deps     append a cross-intent DEPENDENCIES view — every external /
//              cross-team dependency with its system + owner, for the up-front
//              client-alignment conversation (so other IT teams are lined up
//              before the build needs them).
//   --neighbors INT-NNN
//              emit a compact, FOCUSED digest of just ONE intent's neighborhood —
//              what it's built ON (upstream deps, flagged delivered from the
//              ledger), the forward cone of future intents that will build ON it
//              (downstream), and its epic-siblings (likely the same objects even
//              with no declared dependency). For /ql-design-intent + /ql-start-intent
//              to design in light of past AND future scope without loading every
//              full intent file. Ignores --phase/--deps when set.

import { readFileSync, readdirSync } from 'node:fs';

const INTENTS_DIR = 'intents';
const LEDGER = 'delivery/intent-ledger.md';

const phaseArgIdx = process.argv.indexOf('--phase');
const currentPhase =
  phaseArgIdx !== -1 ? Number(process.argv[phaseArgIdx + 1]) : null;
const showDeps = process.argv.includes('--deps');
const neighborsArgIdx = process.argv.indexOf('--neighbors');
const neighborsId =
  neighborsArgIdx !== -1 ? (process.argv[neighborsArgIdx + 1] || '') : null;

// ── Per-intent markdown parser (kept in step with intent-ledger.mjs) ─────────
// Resolves a "## " heading to its canonical key when the text EQUALS it or STARTS
// WITH it followed by a separator (a colon/em/en-dash adjacent, or a whitespace-
// surrounded hyphen), so the generator's descriptive-suffix headings ("## Build
// Target — how it functions") parse the same way intent-ledger.mjs hashes them.
// Longest-first so a longer name is tested before any shorter prefix. This MUST
// mirror intent-ledger.mjs's canonicalHeading — a divergence means /ql-check-scope
// shows blank scope for an intent the ledger hashes.
const CANONICAL_HEADINGS = ['outcome', 'build target', 'guardrails', 'out of scope', 'acceptance', 'success criteria', 'dependencies', 'open questions', 'grounding']
  .sort((a, b) => b.length - a.length);
function canonicalHeading(raw) {
  const h = raw.toLowerCase().trim();
  for (const name of CANONICAL_HEADINGS) {
    if (h === name) return name;
    if (h.startsWith(name) && /^(?:\s*[—–:]|\s+-(?=\s|$))/.test(h.slice(name.length))) return name;
  }
  return null;
}
const PLACEHOLDER = /^_(none|todo|n\/a|tbd)_$/i;
function splitSections(body) {
  const out = {};
  let cur = null, buf = [];
  // Concatenate on duplicate keys so two headings resolving to the same section
  // don't drop the earlier block (mirrors intent-ledger.mjs).
  const flush = () => { if (cur !== null) { const t = buf.join('\n').trim(); out[cur] = out[cur] ? `${out[cur]}\n${t}` : t; } };
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    const key = m ? canonicalHeading(m[1]) : null;
    if (key) { flush(); cur = key; buf = []; }
    else if (cur !== null) buf.push(line);
  }
  flush();
  return out;
}
function parseListBlock(block) {
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
  for (const item of parseListBlock(sub.internal || '')) {
    const m = item.match(/\b(INT-\d+)\b/i);
    if (m) deps.internal.push(m[1].toUpperCase());
  }
  for (const item of parseListBlock(sub.external || '')) {
    const parts = item.split('|').map((p) => p.trim());
    const ext = { system: parts[0] || '', need: parts[1] || '' };
    const ownerPart = parts.find((p) => /^owner\s*:/i.test(p));
    if (ownerPart) ext.owner = ownerPart.replace(/^owner\s*:/i, '').trim();
    deps.external.push(ext);
  }
  return deps;
}
// Grounding → { entries: [{label,value}] }. Only the first-class "Label: value"
// entries are surfaced in the digest (the ### Carried sub-block is verbatim
// preservation, not something /ql-design-intent reasons over line-by-line).
function parseGrounding(block) {
  const t = (block || '').trim();
  if (!t || PLACEHOLDER.test(t)) return null;
  const entries = [];
  for (const line of block.split('\n')) {
    if (/^###\s+/.test(line)) break; // stop at the ### Carried sub-block
    const m = line.match(/^\s*[-*+]\s+(.*)$/);
    if (!m) continue;
    const lm = m[1].match(/^([^:]+?)\s*:\s*(.*)$/);
    if (lm) entries.push({ label: lm[1].trim(), value: lm[2].trim() });
    else entries.push({ label: '', value: m[1].trim() });
  }
  return entries.length ? { entries } : null;
}

function parseQuestions(block) {
  const out = [];
  for (const item of parseListBlock(block)) {
    const idm = item.match(/^(Q-\d+)\s*:?\s*(.*)$/i);
    const id = idm ? idm[1].toUpperCase() : undefined;
    let rest = idm ? idm[2] : item;
    let answer;
    const am = rest.match(/\s[—–-]\s*ANSWERED\s*:?\s*(.*)$/i);
    if (am) { answer = am[1].trim(); rest = rest.slice(0, am.index).trim(); }
    else rest = rest.replace(/\s[—–-]\s*UNANSWERED\s*$/i, '').trim();
    out.push({ id, question: rest.replace(/\s[—–-]\s*$/, '').trim(), answer });
  }
  return out;
}
function parseIntentFile(text) {
  text = text.replace(/\r\n?/g, '\n'); // normalize CRLF/CR so the --- fence + ## headings parse on Windows
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
    id: (fm.id || '').toUpperCase(),
    phase: fm.phase !== undefined && fm.phase !== '' ? Number(fm.phase) : undefined,
    epic_id: fm.epic || fm.epic_id || '',
    confidence: fm.confidence || '',
    title: fm.title || '',
    build_target: PLACEHOLDER.test((s['build target'] || '').trim()) ? '' : (s['build target'] || '').trim(),
    out_of_scope: parseSectionList(s['out of scope']),
    dependencies: parseDeps(s['dependencies']),
    open_questions: parseQuestions(s['open questions']),
    grounding: parseGrounding(s['grounding']),
  };
}
function loadIntents() {
  let dirs;
  try {
    dirs = readdirSync(INTENTS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^INT-\d+/i.test(e.name))
      .map((e) => e.name);
  } catch (e) {
    console.error(`Could not read ${INTENTS_DIR}/: ${e.message}`);
    console.error('Run from the engagement repo root. If intents/ is missing,');
    console.error('run /ql-ingest-scopezilla to seed it from the Scopezilla output.');
    process.exit(1);
  }
  const intents = [];
  for (const dir of dirs) {
    try { intents.push(parseIntentFile(readFileSync(`${INTENTS_DIR}/${dir}/intent.md`, 'utf8'))); }
    catch { /* skip a dir with no intent.md — validate surfaces it */ }
  }
  return intents.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

const intents = loadIntents();
const list = (arr) => (arr && arr.length ? arr : []);

// Canonical intent id: uppercase, numeric part zero-padded to 3, so a typed
// "INT-5" matches the "INT-005" on disk (mirrors normId in intent-ledger.mjs).
function normId(raw) {
  const m = String(raw || '').toUpperCase().match(/^INT-(\d+)(.*)$/);
  return m ? `INT-${m[1].padStart(3, '0')}${m[2]}` : String(raw || '').toUpperCase();
}

// Read delivery status per intent from the ledger, soft (missing ledger → {}).
// The digest stays read-only; this only enriches the neighborhood with "already
// delivered" so the design builds consistently with what's shipped. Column
// positions are discovered by header name, matching intent-ledger.mjs.
function loadLedgerStatus() {
  let text;
  try { text = readFileSync(LEDGER, 'utf8'); }
  catch { return {}; }
  const rows = text.split('\n').filter((l) => l.trim().startsWith('|'));
  if (rows.length < 2) return {};
  const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
  const header = cells(rows[0]).map((h) => h.toLowerCase());
  const idCol = header.findIndex((h) => h === 'intent');
  const statusCol = header.findIndex((h) => h === 'status');
  if (idCol === -1 || statusCol === -1) return {};
  const byId = {};
  for (const line of rows.slice(2)) {
    const c = cells(line);
    const id = normId((c[idCol] || '').replace(/\*/g, '').trim());
    if (!/^INT-\d+/.test(id)) continue;
    byId[id] = c[statusCol] || '';
  }
  return byId;
}
// Short, glanceable status label (empty string when not tracked / no ledger).
function statusLabel(raw) {
  const s = raw || '';
  // Surface Retired: a de-scoped neighbor/dependency is exactly what check-scope
  // must not hide — you don't want to build on something that was pulled (#139).
  if (/retired|🚫/i.test(s)) return '🚫 Retired';
  if (/re-verify|🔄/i.test(s)) return '🔄 Needs re-verify';
  if (/delivered|✅/i.test(s)) return '✅ Delivered';
  if (/progress|🔧/i.test(s)) return '🔧 In progress';
  return '';
}

// ── --neighbors INT-NNN: the focused neighborhood digest ─────────────────────
// Emits just ONE intent's neighborhood so /ql-design-intent and /ql-start-intent can
// design in light of PAST and FUTURE scope without loading every intent file:
//   • BUILT ON      — the upstream internal-dependency cone (what must exist
//                     first), tagged with delivered status from the ledger.
//   • BUILDS ON THIS — the downstream forward cone (future intents that depend
//                     on this one). Designing so you don't corner these is the
//                     gap this whole mode exists to close.
//   • EPIC SIBLINGS — same epic_id, no declared dependency. The honest proxy
//                     for "likely touches the same objects" that the dependency
//                     graph alone can't see.
if (neighborsId !== null) {
  const targetId = normId(neighborsId);
  if (!/^INT-\d+/.test(targetId)) {
    console.error('Usage: node scope-digest.mjs --neighbors INT-NNN');
    process.exit(2);
  }
  const byId = Object.fromEntries(intents.map((i) => [normId(i.id), i]));
  const target = byId[targetId];
  if (!target) {
    console.error(`No intent matched "${neighborsId}". Known: ${intents.map((i) => i.id).join(', ') || '(none)'}`);
    process.exit(1);
  }
  const ledger = loadLedgerStatus();
  const truncate = (s, n = 220) => {
    const t = (s || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
  };

  // Forward adjacency (upstream): id → the intents it depends on.
  // Reverse adjacency (downstream): id → the intents that depend on it.
  const upstreamOf = {}, downstreamOf = {};
  for (const i of intents) {
    const id = normId(i.id);
    upstreamOf[id] = upstreamOf[id] || [];
    for (const raw of list(i.dependencies && i.dependencies.internal)) {
      const dep = normId(raw);
      upstreamOf[id].push(dep);
      (downstreamOf[dep] = downstreamOf[dep] || []).push(id);
    }
  }
  // BFS the cone from `start` over `adj`, recording each reached node's first
  // predecessor (for the "via INT-xxx" transitive annotation). Excludes start.
  const cone = (start, adj) => {
    const seen = new Set([start]);
    const via = {}; // id → immediate predecessor it was first reached through
    const order = [];
    let frontier = [start];
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        for (const n of (adj[node] || [])) {
          if (seen.has(n)) continue;
          seen.add(n);
          via[n] = node;
          order.push(n);
          next.push(n);
        }
      }
      frontier = next;
    }
    return { order, via, directs: new Set(adj[start] || []) };
  };

  const meta = (id) => {
    const i = byId[id];
    if (!i) return { id, phase: '?', title: '(unknown intent — dependency does not resolve)', missing: true };
    return { id, phase: i.phase, title: i.title, epic_id: i.epic_id, build_target: i.build_target };
  };
  const statusOf = (id) => statusLabel(ledger[id]);

  const header = `${targetId} · phase ${target.phase} · epic ${target.epic_id || '—'}${statusOf(targetId) ? ` · ${statusOf(targetId)}` : ''}`;
  console.log(header);
  console.log(target.title);
  if (target.build_target) console.log(`\n  BUILD TARGET: ${truncate(target.build_target, 400)}`);
  if (target.grounding && target.grounding.entries.length) {
    console.log('\n  GROUNDING (the approved requirement/architecture this build must conform to — flag any deviation):');
    for (const e of target.grounding.entries) console.log(`    - ${e.label ? e.label + ': ' : ''}${e.value}`);
  }

  const printCone = (ids, via, directs, { withTarget }) => {
    for (const id of ids) {
      const m = meta(id);
      const st = statusOf(id);
      const viaNote = directs.has(id) ? '' : `  (transitive via ${via[id]})`;
      const stNote = st ? ` · ${st}` : '';
      console.log(`  - ${m.id} · phase ${m.phase}${stNote}${viaNote}`);
      console.log(`      ${m.title}`);
      if (withTarget && m.build_target) console.log(`      BUILD TARGET: ${truncate(m.build_target)}`);
    }
  };

  const up = cone(targetId, upstreamOf);
  console.log(`\n${'─'.repeat(72)}`);
  console.log('BUILT ON (upstream — must exist first; ✅ = already delivered, build consistent with it):');
  if (up.order.length) printCone(up.order, up.via, up.directs, { withTarget: true });
  else console.log('  (no declared internal dependencies)');

  const down = cone(targetId, downstreamOf);
  console.log(`\n${'─'.repeat(72)}`);
  console.log('BUILDS ON THIS (downstream forward cone — design so you don\'t paint these into a corner):');
  if (down.order.length) printCone(down.order, down.via, down.directs, { withTarget: true });
  else console.log('  (nothing declares a dependency on this intent yet — but check epic siblings below)');

  // Epic siblings: same epic_id, not already shown in either cone, not self.
  const shown = new Set([targetId, ...up.order, ...down.order]);
  const siblings = target.epic_id
    ? intents.filter((i) => i.epic_id && i.epic_id === target.epic_id && !shown.has(normId(i.id)))
    : [];
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`EPIC SIBLINGS (epic ${target.epic_id || '—'} — likely the same objects even with no declared dependency):`);
  if (siblings.length) {
    for (const i of siblings) {
      const sid = normId(i.id);
      const st = statusOf(sid);
      console.log(`  - ${sid} · phase ${i.phase}${st ? ` · ${st}` : ''}`);
      console.log(`      ${i.title}`);
    }
  } else {
    console.log(target.epic_id ? '  (no other intents in this epic)' : '  (this intent has no epic_id)');
  }

  console.log(`\n${'─'.repeat(72)}`);
  console.log('Reason over this BEFORE choosing the data model / relationships: reuse what BUILT ON');
  console.log('delivered; leave room for what BUILDS ON THIS; expect epic siblings to touch the same');
  console.log('objects. Where a future intent needs a shape this build precludes, flag it — don\'t silently');
  console.log('pick an approach that corners it.');
  process.exit(0);
}

for (const i of intents) {
  const future =
    currentPhase != null && typeof i.phase === 'number' && i.phase > currentPhase;
  const tag = future ? '  ⟵ FUTURE PHASE (watch for this)' : '';
  console.log(`\n${'='.repeat(72)}`);
  console.log(`${i.id} · phase ${i.phase} · epic ${i.epic_id} · ${i.confidence}${tag}`);
  console.log(`${i.title}`);
  if (i.build_target) console.log(`\n  BUILD TARGET: ${i.build_target}`);
  const oos = list(i.out_of_scope);
  if (oos.length) {
    console.log('\n  OUT OF SCOPE (explicitly deferred):');
    for (const x of oos) console.log(`    - ${x}`);
  }
  const deps = i.dependencies || {};
  if ((deps.internal && deps.internal.length) || (deps.external && deps.external.length)) {
    console.log('\n  DEPENDENCIES:');
    for (const d of list(deps.internal)) console.log(`    - internal: ${d}`);
    for (const e of list(deps.external)) {
      console.log(`    - external: ${e.system}${e.need ? ` — ${e.need}` : ''}${e.owner ? ` (owner: ${e.owner})` : ''}`);
    }
  }
  if (i.grounding && i.grounding.entries.length) {
    console.log('\n  GROUNDING (approved requirement/architecture backing this intent):');
    for (const e of i.grounding.entries) console.log(`    - ${e.label ? e.label + ': ' : ''}${e.value}`);
  }
  const oq = list(i.open_questions);
  if (oq.length) {
    console.log('\n  OPEN QUESTIONS (if unanswered, building the dependent behavior is premature):');
    for (const q of oq) {
      const status = q.answer ? `ANSWERED: ${q.answer}` : 'UNANSWERED';
      console.log(`    - ${q.id ? q.id + ': ' : ''}${q.question}  [${status}]`);
    }
  }
}

console.log(`\n${'='.repeat(72)}`);
console.log(`${intents.length} intents across phases ${[...new Set(intents.map((i) => i.phase))].sort().join(', ')}.`);
if (currentPhase != null) console.log(`Current phase = ${currentPhase}; FUTURE = anything after it.`);

// ── Cross-intent dependencies view (for the client-alignment conversation) ───
if (showDeps) {
  console.log(`\n${'='.repeat(72)}`);
  console.log('EXTERNAL / CROSS-TEAM DEPENDENCIES — line these up before the build needs them');
  console.log('='.repeat(72));
  const ext = [];
  for (const i of intents) {
    for (const e of list(i.dependencies && i.dependencies.external)) {
      ext.push({ intent: i.id, phase: i.phase, ...e });
    }
  }
  if (!ext.length) {
    console.log('\n  (none declared)');
  } else {
    // Group by system so one team sees everything asked of them at once.
    const bySystem = {};
    for (const e of ext) (bySystem[e.system] = bySystem[e.system] || []).push(e);
    for (const [system, items] of Object.entries(bySystem)) {
      const owner = items.find((x) => x.owner)?.owner;
      console.log(`\n  ${system}${owner ? ` — owner: ${owner}` : ''}`);
      for (const e of items.sort((a, b) => (a.phase ?? 0) - (b.phase ?? 0))) {
        console.log(`    - [${e.intent}, phase ${e.phase}] ${e.need || '(need unspecified)'}`);
      }
    }
  }

  console.log(`\n${'-'.repeat(72)}`);
  console.log('INTERNAL (Salesforce build-order) DEPENDENCIES:');
  let anyInternal = false;
  for (const i of intents) {
    const internal = list(i.dependencies && i.dependencies.internal);
    if (!internal.length) continue;
    anyInternal = true;
    console.log(`  ${i.id} (phase ${i.phase}) depends on: ${internal.join(', ')}`);
  }
  if (!anyInternal) console.log('  (none declared)');
}
