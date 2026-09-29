#!/usr/bin/env node
// fix-skill-symlinks.mjs — repair vendored-skill symlinks that git checked out as
// plain files (the Windows "text-file pointer" problem), without touching anything else.
//
// The `skills` CLI keeps one canonical copy at `.agents/skills/<name>/` and links each
// harness dir (`.claude/skills/<name>`, …) to it with a symlink — git stores those as
// mode-120000 objects. On Windows, `git clone` without `core.symlinks` (and without the
// privilege to create symlinks) writes each one as a one-line regular FILE containing the
// link target, so Claude Code finds a file where it expects a skill directory and the
// skill never loads. The symlink model itself is fine and worth keeping (one canonical
// copy, clean update diffs); the fix is to make git materialize the links as real symlinks.
//
// This is surgical by design — it only ever touches paths git ITSELF tracks as symlinks
// (mode 120000) that are currently materialized as regular files. Skills a user added by
// hand (real directories, or copies) are never git-tracked symlinks, so they are left
// completely alone. It never deletes a directory or an untracked file.
//
// Requires the machine to be able to create symlinks: on Windows, enable Developer Mode
// (Settings → Privacy & security → For developers → Developer Mode) — no admin needed on
// Win10 1703+. This script also sets `core.symlinks=true` on the repo so future pulls
// materialize links correctly. See the plugin's decisions/0012 + the /ql-setup Windows step.
//
// Usage:
//   node scripts/fix-skill-symlinks.mjs           # repair in place
//   node scripts/fix-skill-symlinks.mjs --check    # report only; exit 1 if any are broken

import { execFileSync } from 'node:child_process';
import { lstatSync, rmSync, existsSync } from 'node:fs';

const checkOnly = process.argv.includes('--check');

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

// Confirm we're inside a git work tree; if not, there's nothing git can materialize.
try {
  if (git(['rev-parse', '--is-inside-work-tree']).trim() !== 'true') throw 0;
} catch {
  console.log('Not inside a git work tree — nothing to repair.');
  process.exit(0);
}

// Every path git tracks as a symlink (mode 120000). -z guards against spaces/newlines.
// Each NUL-terminated record is: "<mode> <hash> <stage>\t<path>".
const tracked = git(['ls-files', '-s', '-z'])
  .split('\0')
  .filter(Boolean)
  .map((rec) => {
    const tab = rec.indexOf('\t');
    return { mode: rec.slice(0, 6), path: rec.slice(tab + 1) };
  })
  .filter((e) => e.mode === '120000');

// A committed symlink is "broken" when its working-tree entry exists but is NOT a symlink
// (i.e. git wrote it as a regular file), or is missing entirely.
const broken = tracked.filter((e) => {
  if (!existsSync(e.path)) return true;
  try {
    return !lstatSync(e.path).isSymbolicLink();
  } catch {
    return true;
  }
});

if (tracked.length === 0) {
  console.log('No git-tracked symlinks — nothing to repair.');
  process.exit(0);
}
if (broken.length === 0) {
  console.log(`All ${tracked.length} vendored-skill symlinks resolve correctly — nothing to do.`);
  process.exit(0);
}

if (checkOnly) {
  console.error(`✗ ${broken.length} skill symlink(s) are checked out as plain files (Windows pointer problem):`);
  for (const e of broken) console.error(`  ${e.path}`);
  console.error('\nFix: node scripts/fix-skill-symlinks.mjs  (enable Windows Developer Mode first).');
  process.exit(1);
}

// Make future checkouts/pulls materialize symlinks correctly. `--default ''` keeps this
// from failing when the key is unset (a bare `git config <key>` exits 1 with no value).
if (git(['config', '--default', '', '--get', 'core.symlinks']).trim() !== 'true') {
  git(['config', 'core.symlinks', 'true']);
  console.log('Set core.symlinks=true on this repo.');
}

// Re-materialize each broken pointer from git. Remove the stray file first so the checkout
// writes a fresh symlink rather than skipping an "unmodified" path.
const fixed = [];
const failed = [];
for (const e of broken) {
  try {
    if (existsSync(e.path) && !lstatSync(e.path).isSymbolicLink()) rmSync(e.path, { force: true });
    git(['checkout', '--', e.path]);
    if (lstatSync(e.path).isSymbolicLink()) fixed.push(e.path);
    else failed.push(e.path);
  } catch {
    failed.push(e.path);
  }
}

for (const p of fixed) console.log(`✓ ${p}`);
if (fixed.length) console.log(`Repaired ${fixed.length} skill symlink(s).`);

if (failed.length) {
  console.error(`\n✗ Could not create symlinks for ${failed.length} path(s):`);
  for (const p of failed) console.error(`  ${p}`);
  console.error(
    '\nThis machine cannot create symlinks. On Windows, enable Developer Mode\n' +
      '(Settings → Privacy & security → For developers → Developer Mode), then re-run this,\n' +
      'or re-clone with:  git clone -c core.symlinks=true <url>',
  );
  process.exit(1);
}
