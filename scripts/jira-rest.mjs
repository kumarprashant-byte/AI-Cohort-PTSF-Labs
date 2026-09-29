#!/usr/bin/env node
// Jira Cloud REST v3 transport for /ql-sync-jira — the API-token alternative to the
// Atlassian Remote MCP (see decisions/0011). Some customers block third-party MCP
// OAuth apps but allow create-your-own API tokens; this script is the pen that
// draws the SAME one-way projection /ql-sync-jira builds, over REST instead of MCP.
//
// ZERO DEPENDENCIES — plain node + global fetch, no client library, no npm install
// (that's exactly why the retired jira-sync.mjs was removed: it imported jira.js).
// It talks to Jira Cloud REST v3 with Basic auth (base64(email:token)).
//
// AUTH — env only, NEVER committed (jira.config.json stays secret-free):
//   JIRA_EMAIL       the Atlassian account email
//   JIRA_API_TOKEN   an API token from id.atlassian.com/manage-profile/security/api-tokens
//   JIRA_BASE_URL    the site, e.g. https://acme.atlassian.net  (or pass --base-url;
//                    the skill reads it from jira.config.json's `base_url`)
//
// SUBCOMMANDS (each mirrors an Atlassian MCP tool the skill would otherwise call):
//   whoami                                   → getVisibleJiraProjects-style reachability probe
//   projects                                 list visible projects (key + name)
//   meta --project KEY                       issue types + their fields (for config discovery)
//   search --jql "<JQL>" [--fields a,b,c]    → searchJiraIssuesUsingJql (auto-paginates)
//   transitions KEY                          → getTransitionsForJiraIssue (id + name)
//   create-issue --json '<fields payload>'   → createJiraIssue   (prints the new key)
//   edit-issue KEY --json '<fields payload>' → editJiraIssue
//   transition KEY --status "<name>"         → transitionJiraIssue (resolves name→id)
//   comment KEY --body "<markdown>"          → addCommentToJiraIssue
//
// BODY SHAPE — the skill passes the SAME markdown body it would hand the MCP with
// contentFormat:"markdown". REST v3 wants ADF (Atlassian Document Format), not a
// markdown string, so create-issue/edit-issue/comment accept a `body_markdown`
// key (or --body) and this script converts the fixed subset the skill emits
// (paragraphs, **bold**, _italic_, `- ` bullet lists) to ADF. Pass raw ADF via a
// `description` (ADF object) in --json to bypass the converter.
//
// Every op prints JSON to stdout on success; errors go to stderr and exit non-zero
// so the skill can log-and-continue per operation (matching the MCP path's
// resilience rule). One op per invocation — the skill orchestrates the sequence.

import { argv, env, exit, stdin } from 'node:process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Arg parsing — dead simple: positional command, then --flag value pairs.
// ---------------------------------------------------------------------------
const [, , cmd, ...rest] = argv;
const flags = {};
const positional = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const key = rest[i].slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true; // boolean flag
    } else {
      flags[key] = next;
      i++;
    }
  } else {
    positional.push(rest[i]);
  }
}

function die(msg, code = 1) {
  process.stderr.write(`jira-rest: ${msg}\n`);
  exit(code);
}

// ---------------------------------------------------------------------------
// Config from env (+ --base-url override).
// ---------------------------------------------------------------------------
const EMAIL = env.JIRA_EMAIL;
const TOKEN = env.JIRA_API_TOKEN;
const BASE_URL = (flags['base-url'] || env.JIRA_BASE_URL || '').replace(/\/+$/, '');

function requireAuth() {
  const missing = [];
  if (!EMAIL) missing.push('JIRA_EMAIL');
  if (!TOKEN) missing.push('JIRA_API_TOKEN');
  if (!BASE_URL) missing.push('JIRA_BASE_URL (or --base-url)');
  if (missing.length) {
    die(
      `missing required env: ${missing.join(', ')}. ` +
        `Create an API token at id.atlassian.com/manage-profile/security/api-tokens, ` +
        `export JIRA_EMAIL/JIRA_API_TOKEN, and set base_url in jira.config.json.`,
    );
  }
  // Never send Basic credentials over a non-HTTPS URL (cleartext creds / downgrade).
  if (!/^https:\/\//i.test(BASE_URL)) {
    die(`base_url must be https:// (got "${BASE_URL}") — refusing to send credentials over a non-HTTPS connection.`);
  }
}

const authHeader = () => 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

/** One REST call. Returns {ok, status, body} where body is parsed JSON (or text). */
async function api(method, path, payload) {
  const url = `${BASE_URL}/rest/api/3${path}`;
  const headers = {
    Authorization: authHeader(),
    Accept: 'application/json',
  };
  const init = { method, headers };
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return { ok: false, status: 0, body: `network error: ${e.message}` };
  }
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

/** Surface a REST error the way Jira reports it, then exit non-zero. */
function failFrom(res, what) {
  const detail =
    res.body && typeof res.body === 'object'
      ? (res.body.errorMessages || []).concat(
          Object.entries(res.body.errors || {}).map(([k, v]) => `${k}: ${v}`),
        ).join('; ') || JSON.stringify(res.body)
      : res.body;
  die(`${what} failed (HTTP ${res.status}): ${detail || 'no detail'}`);
}

function printJson(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function readStdin() {
  const chunks = [];
  for await (const c of stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

// ---------------------------------------------------------------------------
// Minimal markdown → ADF, for the FIXED body shape /ql-sync-jira emits.
// Handles: blank-line-separated paragraphs, `- ` bullet lists, inline **bold**
// and _italic_. Anything else degrades to plain text in a paragraph — never
// throws, so an unexpected line can't break a push.
// ---------------------------------------------------------------------------
function inlineNodes(text) {
  // Split on **bold** and _italic_ spans, preserving order. Bold wins over italic
  // where they'd overlap (the skill's footer is _italic_; labels are **bold**).
  // An italic underscore must sit at a word boundary (markdown's own rule), so a
  // Salesforce API name like Account.Tier_Level__c stays literal instead of
  // turning into "Tier" + *Level* + "c".
  const nodes = [];
  const re = /\*\*(.+?)\*\*|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      nodes.push({ type: 'text', text: m[1], marks: [{ type: 'strong' }] });
    } else {
      nodes.push({ type: 'text', text: m[2], marks: [{ type: 'em' }] });
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push({ type: 'text', text: text.slice(last) });
  return nodes.length ? nodes : [{ type: 'text', text: text || ' ' }];
}

function markdownToAdf(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const content = [];
  let bulletBuffer = null;
  const flushBullets = () => {
    if (bulletBuffer) {
      content.push({ type: 'bulletList', content: bulletBuffer });
      bulletBuffer = null;
    }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line === '') {
      flushBullets();
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      bulletBuffer = bulletBuffer || [];
      bulletBuffer.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: inlineNodes(bullet[1]) }],
      });
      continue;
    }
    flushBullets();
    content.push({ type: 'paragraph', content: inlineNodes(line) });
  }
  flushBullets();
  if (content.length === 0) content.push({ type: 'paragraph', content: [{ type: 'text', text: ' ' }] });
  return { type: 'doc', version: 1, content };
}

/** Parse the --json payload (fields) and convert body_markdown → ADF description. */
async function fieldsPayload() {
  let raw = flags.json;
  if (raw === undefined || raw === true) raw = (await readStdin()).trim();
  if (!raw) die('expected a fields payload via --json \'{...}\' or on stdin');
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    die(`--json is not valid JSON: ${e.message}`);
  }
  const fields = obj.fields ? obj.fields : obj;
  // body_markdown (ours) or --body → ADF description. Explicit ADF `description` wins.
  const md = fields.body_markdown ?? flags.body;
  if (md !== undefined && fields.description === undefined) {
    fields.description = markdownToAdf(md);
  }
  delete fields.body_markdown;
  return fields;
}

// ---------------------------------------------------------------------------
// Commands.
// ---------------------------------------------------------------------------
async function main() {
  switch (cmd) {
    case 'whoami': {
      requireAuth();
      const res = await api('GET', '/myself');
      if (!res.ok) failFrom(res, 'whoami');
      printJson({ accountId: res.body.accountId, email: res.body.emailAddress, name: res.body.displayName });
      break;
    }

    case 'projects': {
      requireAuth();
      // Paginated project search; keep it simple — one page of up to 50 is plenty
      // for the reachability check, but page through so a big instance still lists all.
      const out = [];
      let startAt = 0;
      for (;;) {
        const res = await api('GET', `/project/search?startAt=${startAt}&maxResults=50`);
        if (!res.ok) failFrom(res, 'projects');
        for (const p of res.body.values || []) out.push({ key: p.key, name: p.name });
        if (res.body.isLast || !(res.body.values || []).length) break;
        startAt += res.body.values.length;
      }
      printJson(out);
      break;
    }

    case 'meta': {
      requireAuth();
      const project = flags.project;
      if (!project) die('meta needs --project KEY');
      // Issue types + fields via createmeta (v3 supports the expand form).
      const res = await api(
        'GET',
        `/issue/createmeta?projectKeys=${encodeURIComponent(project)}&expand=projects.issuetypes.fields`,
      );
      if (!res.ok) failFrom(res, 'meta');
      const proj = (res.body.projects || [])[0];
      if (!proj) die(`project ${project} not visible to this account`);
      const issuetypes = (proj.issuetypes || []).map((it) => ({
        name: it.name,
        subtask: !!it.subtask,
        fields: Object.entries(it.fields || {}).map(([id, f]) => ({ id, name: f.name })),
      }));
      printJson({ key: proj.key, issuetypes });
      break;
    }

    case 'search': {
      requireAuth();
      const jql = flags.jql;
      if (!jql) die('search needs --jql "<JQL>"');
      const fields = flags.fields ? String(flags.fields).split(',').map((s) => s.trim()) : ['key', 'labels', 'status'];
      const out = [];
      let nextPageToken;
      // v3 /search/jql is token-paginated (the old startAt search endpoint is deprecated).
      for (;;) {
        const payload = { jql, fields, maxResults: 100 };
        if (nextPageToken) payload.nextPageToken = nextPageToken;
        const res = await api('POST', '/search/jql', payload);
        if (!res.ok) failFrom(res, 'search');
        for (const issue of res.body.issues || []) {
          out.push({ key: issue.key, fields: issue.fields });
        }
        nextPageToken = res.body.nextPageToken;
        if (!nextPageToken) break;
      }
      printJson(out);
      break;
    }

    case 'transitions': {
      requireAuth();
      const key = positional[0];
      if (!key) die('transitions needs an issue key');
      const res = await api('GET', `/issue/${encodeURIComponent(key)}/transitions`);
      if (!res.ok) failFrom(res, 'transitions');
      printJson((res.body.transitions || []).map((t) => ({ id: t.id, name: t.name, to: t.to && t.to.name })));
      break;
    }

    case 'create-issue': {
      requireAuth();
      const fields = await fieldsPayload();
      const res = await api('POST', '/issue', { fields });
      if (!res.ok) failFrom(res, 'create-issue');
      printJson({ key: res.body.key, id: res.body.id });
      break;
    }

    case 'edit-issue': {
      requireAuth();
      const key = positional[0];
      if (!key) die('edit-issue needs an issue key');
      const fields = await fieldsPayload();
      const res = await api('PUT', `/issue/${encodeURIComponent(key)}`, { fields });
      if (!res.ok) failFrom(res, 'edit-issue');
      printJson({ key, updated: true });
      break;
    }

    case 'transition': {
      requireAuth();
      const key = positional[0];
      const status = flags.status;
      if (!key || !status) die('transition needs an issue key and --status "<name>"');
      const list = await api('GET', `/issue/${encodeURIComponent(key)}/transitions`);
      if (!list.ok) failFrom(list, 'transition (lookup)');
      const match = (list.body.transitions || []).find(
        (t) => (t.to && t.to.name || '').toLowerCase() === status.toLowerCase() || t.name.toLowerCase() === status.toLowerCase(),
      );
      if (!match) {
        const available = (list.body.transitions || []).map((t) => `${t.name}→${t.to && t.to.name}`).join(', ');
        die(`no transition to status "${status}" from ${key}'s current state. Available: ${available || 'none'}`);
      }
      const res = await api('POST', `/issue/${encodeURIComponent(key)}/transitions`, { transition: { id: match.id } });
      if (!res.ok) failFrom(res, 'transition');
      printJson({ key, transitioned_to: status });
      break;
    }

    case 'comment': {
      requireAuth();
      const key = positional[0];
      const body = flags.body;
      if (!key || body === undefined || body === true) die('comment needs an issue key and --body "<markdown>"');
      const res = await api('POST', `/issue/${encodeURIComponent(key)}/comment`, { body: markdownToAdf(body) });
      if (!res.ok) failFrom(res, 'comment');
      printJson({ key, commented: true, id: res.body.id });
      break;
    }

    case undefined:
    case 'help':
    case '--help':
      process.stdout.write(
        'jira-rest — Jira Cloud REST v3 transport for /ql-sync-jira (see decisions/0011)\n\n' +
          'Commands: whoami | projects | meta --project KEY | search --jql "…" [--fields a,b] |\n' +
          '          transitions KEY | create-issue --json \'{…}\' | edit-issue KEY --json \'{…}\' |\n' +
          '          transition KEY --status "…" | comment KEY --body "…"\n\n' +
          'Auth (env): JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BASE_URL (or --base-url).\n',
      );
      break;

    default:
      die(`unknown command "${cmd}" — run \`node scripts/jira-rest.mjs help\``);
  }
}

// Export the pure converter so it's unit-testable without a live Jira.
export { markdownToAdf };

// Run the CLI only when invoked directly (`node jira-rest.mjs …`), not on import.
// Compare real filesystem paths, not a hand-built URL: import.meta.url
// percent-encodes spaces and is file:///C:/… on Windows, so `file://${argv[1]}`
// never matched there and the CLI silently did nothing (exit 0). realpathSync
// also matches through a symlinked invocation. Same guard as intent-ledger.mjs.
function invokedDirectly() {
  try {
    return !!argv[1] && realpathSync(argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}
if (invokedDirectly()) {
  main().catch((e) => die(`unexpected error: ${e && e.stack ? e.stack : e}`));
}
