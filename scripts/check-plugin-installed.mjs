#!/usr/bin/env node
// Plugin-install nudge (see AGENTS.md "Pulling context from upstream").
//
// This engagement repo's operating skills (the ql-* set) are VENDORED into the
// repo at .claude/skills/ — every agent (Claude Code, Cursor, Codex, …) has them
// on clone, plugin or not (see the plugin's decisions/0012). So the plugin is
// NOT required to have the skills. What the quantum-leap-launchpad plugin adds
// for Claude Code users is the "belt" convenience: a once-a-day nudge when the
// vendored skills fall behind upstream, plus /ql-init-engagement and /ql-resync.
//
// This script runs on SessionStart. When the plugin is NOT detectable locally,
// it prints a one-line nudge suggesting the install (framed as optional — the
// skills already work). It is LOCAL-ONLY (no network) and entirely best-effort:
//   - plugin detected (active root or marketplace cache) → silent;
//   - debounced to at most one nudge per day via .claude/.plugin-install-check;
//   - ANY error exits 0 so a session is never blocked or noised up.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const MARKETPLACE = 'quantum-leap-launchpad';
const INSTALL_URL = 'https://git.soma.salesforce.com/dgerow/quantum-leap-launchpad.git';

try {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // 1. Is the plugin present? Any of these signals is sufficient → stay silent.
  //    (a) CLAUDE_PLUGIN_ROOT is set when a plugin skill is active this session.
  //    (b) the installed-plugin cache dir exists from a prior `/plugin install`:
  //          ~/.claude/plugins/cache/<marketplace>/<plugin>/
  //    (c) the marketplace mirror dir exists from `/plugin marketplace add`:
  //          ~/.claude/plugins/marketplaces/<marketplace>/
  //    We check DIRECTORY existence, not a nested plugin.json path: the
  //    marketplace mirror clones the marketplace repo verbatim, so the depth of
  //    plugin.json depends on the marketplace `source` (root vs. a subdirectory
  //    like ./plugins/<name>) — a hard-coded manifest path breaks the moment the
  //    repo layout changes. Directory existence is layout-independent.
  const claudePlugins = join(homedir(), '.claude', 'plugins');
  const pluginRootSet = !!process.env.CLAUDE_PLUGIN_ROOT;
  const installedCacheDir = join(claudePlugins, 'cache', MARKETPLACE, MARKETPLACE);
  const marketplaceMirrorDir = join(claudePlugins, 'marketplaces', MARKETPLACE);
  if (pluginRootSet || existsSync(installedCacheDir) || existsSync(marketplaceMirrorDir)) {
    process.exit(0);
  }

  // 2. Debounce — at most one nudge per calendar day.
  const markerPath = join(projectDir, '.claude', '.plugin-install-check');
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let lastChecked;
  try {
    lastChecked = readFileSync(markerPath, 'utf8').trim();
  } catch {
    // no marker yet
  }
  // Stamp first so a slow/duplicate session start doesn't double-print.
  try {
    writeFileSync(markerPath, today + '\n');
  } catch {
    // can't write the marker — fall through and still nudge this once
  }
  if (lastChecked === today) process.exit(0);

  console.log(
    `📦 This repo's ql-* skills are vendored in .claude/skills/ and already work in your ` +
      `agent — no install needed. If you use Claude Code, the optional ${MARKETPLACE} plugin ` +
      `adds a nudge when those skills fall behind upstream, plus /ql-init-engagement and /ql-resync:\n` +
      `   /plugin marketplace add ${INSTALL_URL}\n` +
      `   /plugin install ${MARKETPLACE}@${MARKETPLACE}\n` +
      `…then /plugin → Marketplaces → ${MARKETPLACE} → Enable auto-update. ` +
      `(Any harness keeps skills current via \`npx skills update\` or the scheduled CI PR.)`
  );
} catch {
  // Best-effort only — never block a session.
}

process.exit(0);
