// launchpad-telemetry.js — opencode plugin: usage telemetry for quantum-leap-launchpad.
// NB: .js (NOT .mjs) — opencode's plugin loader scans .js/.ts, not .mjs (verified 2026-08-18).
//
// The opencode-harness sibling of the Claude Code telemetry hooks
// (plugins/quantum-leap-launchpad/hooks/*). opencode has no plugin-marketplace
// equivalent, so this ships as an opencode plugin that `/ql-setup` installs
// per-machine into ~/.config/opencode/plugin/ (mirroring the per-machine posture
// of the Claude plugin — telemetry lives on the machine, never in the customer
// engagement repo). See decisions/0028.
//
// It is DELIBERATELY self-contained (not a shell-out to hooks/track-usage.mjs):
// on an opencode-only machine the Claude plugin's cache path isn't reachable, and
// opencode runs Bun (node may be absent from PATH). The event-name set and the
// payload shape (which carries the engagement's git remote in the clear, not a
// hash — decisions/0056 — but never scope or build content) are kept in lockstep
// with track-usage.mjs by a parity test (test/telemetry.test.mjs). Fire-and-forget: it must NEVER throw
// into opencode or block a session — every path is wrapped and best-effort.
//
// Events (subset of track-usage.mjs EVENT_TYPES):
//   session.created  -> session_start
//   session.idle     -> session_end
//   tool.execute.after (skill-like tool) -> skill_invoked   (best-effort)
//
// Gating: fires ONLY inside an engagement repo — a repo whose AGENTS.md (or
// CLAUDE.md, pre-0026) carries the LAUNCHPAD:MANAGED:BEGIN marker. Same gate as
// the Claude hooks' _common.mjs, read against opencode's `directory`.

import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostname, homedir, userInfo } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_VERSION = 3; // v3: engagement_hash carries the cleartext remote (decisions/0056); v2 added developer_email + model (0052)
// Allow '/' so opencode's provider-prefixed ids (anthropic/claude-opus-4-8) pass
// — kept in lockstep with track-usage.mjs's MODEL_PATTERN (decisions/0052).
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/\[\]-]{0,79}$/;
const GATE_MARKER = 'LAUNCHPAD:MANAGED:BEGIN';
const GATE_FILES = ['AGENTS.md', 'CLAUDE.md']; // AGENTS.md canonical (0026), CLAUDE.md fallback

// --- gate: is `dir` a launchpad engagement repo? (mirror of hooks/_common.mjs) ---
function isEngagementRepo(dir) {
  if (!dir) return false;
  for (const f of GATE_FILES) {
    try {
      if (readFileSync(join(dir, f), 'utf8').includes(GATE_MARKER)) return true;
    } catch {
      /* next */
    }
  }
  return false;
}

// --- endpoint: env override, else co-located .tracking-config.json (shipped) ---
// A defined-but-empty LAUNCHPAD_TELEMETRY_ENDPOINT disables posting (local log
// still written), mirroring hooks/track-usage.mjs. NB: this shim does NOT do the
// Claude hooks' pipeline-health alerting — it detaches curl and never sees the
// POST result, so it can't tell success from failure. The config's
// `alert_webhooks` field is ignored here; alerting is the track-usage.mjs path.
function loadEndpoints() {
  if (process.env.LAUNCHPAD_TELEMETRY_ENDPOINT !== undefined) {
    const env = process.env.LAUNCHPAD_TELEMETRY_ENDPOINT.trim();
    return env ? [env] : [];
  }
  try {
    const cfg = JSON.parse(readFileSync(join(HERE, '.tracking-config.json'), 'utf8'));
    if (cfg.enabled === false) return [];
    return cfg.ingest_urls || [];
  } catch {
    return [];
  }
}
function logPath() {
  return join(homedir(), '.quantum-leap-launchpad', 'usage.jsonl');
}

// Normalize a git remote to canonical `host/org/repo` so the SSH and HTTPS forms
// of the same repo resolve identically (else one engagement double-counts). Mirror
// of track-usage.mjs's normalizeRemote (decisions/0050) — kept in lockstep so the
// Claude and opencode surfaces produce the SAME engagement_hash for a repo.
function normalizeRemote(url) {
  let s = String(url || '').trim();
  if (!s) return s;
  const scp = s.match(/^[^@/]+@([^:]+):(.+)$/); // git@host:org/repo(.git)
  // The scheme decides which port is its default: :22 is noise on ssh:// but a
  // real, distinct port on https://.
  const scheme = (s.match(/^([a-z][a-z0-9+.-]*):\/\//i) || [])[1]?.toLowerCase() || '';
  const defaultPort = { ssh: '22', 'git+ssh': '22', http: '80', https: '443', git: '9418' }[scheme];
  if (scp) {
    s = `${scp[1]}/${scp[2]}`;
  } else {
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, ''); // strip scheme://
    s = s.replace(/^[^@/]+@/, ''); // strip user(:pass)@
  }
  s = s.replace(/[?#].*$/, ''); // drop query/fragment (a ?access_token= would leak in the clear — 0056)
  if (defaultPort) s = s.replace(new RegExp(`^([^/:]+):${defaultPort}(?=/|$)`), '$1'); // drop the scheme's own default port
  const norm = s.replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase();
  // Final wire-safety gate (decisions/0056): only emit a value shaped like a
  // network remote `host[:port]/path`. A non-network origin (`ext::…`, `file://…`,
  // a bare POSIX/Windows path) would otherwise ship the OS home/username or an SSH
  // key path in the clear. Fails the shape → '' so the caller basenames instead.
  // Lockstep with track-usage.mjs.
  return /^[a-z0-9][a-z0-9.-]*(?::\d+)?\/[^\s]+$/.test(norm) ? norm : '';
}

// --- engagement id: the normalized git remote (host/org/repo) in the clear, so
// reporting can count AND name engagements (decisions/0056). NOT a hash; key stays
// engagement_hash for consumer compatibility. Lockstep with track-usage.mjs's
// engagementLabel (same name on both surfaces, since it no longer hashes). ---
function engagementLabel(dir) {
  let seed = '';
  try {
    const r = spawnSync('git', ['-C', dir, 'config', '--get', 'remote.origin.url'], {
      encoding: 'utf8',
      timeout: 1500, // bounded: this is the only sync call left on opencode's awaited path
      windowsHide: true, // don't flash a console window on Windows
    });
    if (r.status === 0 && r.stdout) seed = normalizeRemote(r.stdout.trim());
  } catch {
    /* fall through */
  }
  // No remote: fall back to the dir BASENAME only, never the full absolute path
  // (in the clear a full path leaks the OS home/username — 0056). Lockstep with
  // track-usage.mjs; the remote-present path is the guaranteed-parity path.
  if (seed) return seed;
  return dir ? basename(dir) : '';
}

// --- developer_email: git config user.email — corp-email Org62 join key (0052) ---
// Same field as the Claude path. Timing/session-model stitching is NOT ported to
// opencode (its event handlers expose no reliable per-session correlation id), so
// model here is best-effort from env markers, 'unknown' otherwise; both are
// omitted-or-'unknown', never fabricated. The consumer skips absent fields.
function developerEmail(dir) {
  try {
    const r = spawnSync('git', ['-C', dir, 'config', '--get', 'user.email'], {
      encoding: 'utf8',
      timeout: 1500,
      windowsHide: true,
    });
    if (r.status === 0 && r.stdout) return r.stdout.trim();
  } catch {
    /* fall through */
  }
  return '';
}

function resolveModel() {
  for (const v of [process.env.OPENCODE_MODEL, process.env.ANTHROPIC_MODEL, process.env.CLAUDE_MODEL]) {
    const s = String(v || '').trim();
    if (MODEL_PATTERN.test(s)) return s;
  }
  return 'unknown';
}

function gather(eventType, label, dir) {
  let user = 'unknown';
  try {
    user = userInfo().username || 'unknown';
  } catch {
    /* keep default */
  }
  return {
    event: eventType,
    skill_or_script: label,
    user,
    hostname: hostname(),
    timestamp: new Date().toISOString(),
    launchpad_version: 'unknown', // no manifest reachable from the global plugin dir
    install_source: 'opencode-plugin',
    surface: 'opencode',
    engagement_hash: engagementLabel(dir), // key kept for consumer compat; value is the cleartext remote (0056)
    session_id: null,
    platform: process.platform,
    schema_version: SCHEMA_VERSION,
    developer_email: developerEmail(dir), // corp-email identity join key (0052)
    model: resolveModel(),
  };
}

// Fire the POST as a DETACHED, unref'd child so it NEVER blocks opencode's
// event handler (opencode AWAITS each handler — a synchronous spawnSync curl or
// an awaited fetch would freeze the session for the POST duration, up to a
// multi-second network hang). This is the opencode analog of the Claude hooks'
// spawn+unref fire-and-forget (_common.mjs). curl honors the OS trust store on
// corporate TLS-inspection networks; if it's absent the durable local log still
// captured the event. The small JSON body goes via --data (a detached child with
// ignored stdio can't be fed on stdin).
function fireCurlDetached(url, body) {
  try {
    const child = spawn(
      'curl',
      // --insecure: the ingest ELB serves a self-signed cert (sandbox, no real
      // domain), so a verifying client can't reach it. Low-sensitivity telemetry;
      // the durable local log is written first regardless.
      ['--silent', '--insecure', '--max-time', '6', '--retry', '2', '-X', 'POST',
       '-H', 'Content-Type: application/json', '--data', body, url],
      { detached: true, stdio: 'ignore', windowsHide: true }
    );
    child.unref(); // let the handler return without waiting on the POST
  } catch {
    // curl missing or spawn failed — best-effort; the local log has the datapoint.
  }
}

// Synchronous and fast: the gate (a file read), the payload (a bounded git call),
// and the durable local-log append. The only potentially-slow work — the network
// POST — is detached above, so this returns promptly and never stalls opencode.
function emit(eventType, label, dir) {
  try {
    if (!isEngagementRepo(dir)) return; // gate
    const payload = gather(eventType, label, dir);
    try {
      mkdirSync(dirname(logPath()), { recursive: true });
      appendFileSync(logPath(), JSON.stringify(payload) + '\n', 'utf8');
    } catch {
      /* durable log best-effort */
    }
    const body = JSON.stringify(payload);
    for (const url of loadEndpoints()) fireCurlDetached(url, body);
  } catch {
    // NEVER throw into opencode.
  }
}

export const LaunchpadTelemetry = async ({ directory }) => {
  const dir = directory || process.cwd();
  // opencode has no "session ended" event: session.idle fires after EVERY turn
  // (and session.deleted only on deletion). So session_end is emitted once per
  // session, on its first idle — a count signal, like the Claude side's, not N
  // per session. (decisions/0052 addendum.)
  const ended = new Set();
  return {
    // Handlers are synchronous and non-blocking: emit() writes the local log and
    // detaches the POST, then returns immediately. opencode awaits the handler,
    // but there's nothing slow left to await.
    event: ({ event }) => {
      try {
        if (event?.type === 'session.created') emit('session_start', 'session', dir);
        else if (event?.type === 'session.idle') {
          const id = event.properties?.sessionID || '';
          if (!ended.has(id)) { ended.add(id); emit('session_end', 'session', dir); }
        }
      } catch {
        /* fire-and-forget */
      }
    },
    // skill_invoked: opencode's skill tool has id "skill" and takes { name } — the
    // skill name is in the ARGS, which only tool.execute.before receives
    // (input = { tool, sessionID, callID }, output = { args }). Verified on 1.18.4.
    'tool.execute.before': (input, output) => {
      try {
        const name = input?.tool === 'skill' ? output?.args?.name : '';
        if (typeof name === 'string' && /(^|:)ql-[\w-]+$/.test(name)) {
          emit('skill_invoked', name.replace(/^.*?(ql-[\w-]+)$/, '$1'), dir);
        }
      } catch {
        /* fire-and-forget */
      }
    },
  };
};
