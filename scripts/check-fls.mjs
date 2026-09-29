#!/usr/bin/env node
// Cascading-consequences guard (see AGENTS.md "Working conventions").
//
// When you add or change a custom field, it's usually invisible until it has
// Field-Level Security on the permission set(s) the relevant personas use —
// the FLS gotcha already bit this engagement once (see delivery/phase-1).
//
// This is an ADVISORY, not a gate: it warns about staged custom fields that
// aren't referenced by ANY permission set and always exits 0. There are
// legitimate reasons a field has no FLS (master-detail / required fields can't
// have it; some fields are system/Apex-only), so we surface, never block.
//
// Invoked by lint-staged with the staged *.field-meta.xml paths as arguments.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const fieldFiles = process.argv.slice(2);
if (fieldFiles.length === 0) process.exit(0);

// Derive the package directory(ies) from sfdx-project.json so a customized source
// layout still gets the advisory — a hardcoded `force-app/main/default` silently
// no-ops on any repo that doesn't use it (the "surface, don't swallow" rule). Fall
// back to the default path when sfdx-project.json is absent or unparseable.
const DEFAULT_PKG = 'force-app';
let pkgDirs = [DEFAULT_PKG];
try {
  const proj = JSON.parse(readFileSync('sfdx-project.json', 'utf8'));
  const dirs = (proj.packageDirectories || []).map((d) => d && d.path).filter(Boolean);
  if (dirs.length) pkgDirs = dirs;
} catch {
  // no/unreadable sfdx-project.json — keep the default package dir
}

// A permission set can live at <pkg>/main/default/permissionsets or directly at
// <pkg>/permissionsets, depending on layout — probe both under each package dir.
const permsetDirs = [];
for (const p of pkgDirs) {
  for (const cand of [join(p, 'main', 'default', 'permissionsets'), join(p, 'permissionsets')]) {
    if (existsSync(cand)) permsetDirs.push(cand);
  }
}

// Object.Field references across every permission set in the repo.
let permsetRefs = '';
for (const dir of permsetDirs) {
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.permissionset-meta.xml')) {
        permsetRefs += readFileSync(join(dir, f), 'utf8');
      }
    }
  } catch {
    // unreadable dir — skip it, others may still resolve
  }
}

if (permsetDirs.length === 0) {
  // Visible skip, not a silent exit — so a custom layout with no permissionsets
  // dir doesn't quietly disable the advisory (which would defeat its purpose).
  console.warn(
    `⚠️  FLS advisory skipped — no permissionsets/ directory found under ${pkgDirs.join(', ')}. ` +
      'If your package layout differs, this guard checked nothing; verify FLS by hand.'
  );
  process.exit(0);
}

const missing = [];
for (const path of fieldFiles) {
  // .../objects/<Object>/fields/<Field>.field-meta.xml
  const m = path.match(/objects\/([^/]+)\/fields\/([^/]+)\.field-meta\.xml$/);
  if (!m) continue;
  const [, object, field] = m;

  // Only custom fields have FLS; standard fields don't live here anyway.
  if (!field.endsWith('__c')) continue;

  let xml;
  try {
    xml = readFileSync(path, 'utf8');
  } catch {
    continue; // deleted in this commit
  }

  // Fields that can't / needn't carry FLS — skip to avoid false positives.
  const type = (xml.match(/<type>([^<]+)<\/type>/) || [])[1] || '';
  if (type === 'MasterDetail' || type === 'Summary') continue;
  if (/<required>true<\/required>/.test(xml)) continue;

  const ref = `${object}.${field}`;
  if (!permsetRefs.includes(ref)) missing.push(ref);
}

if (missing.length > 0) {
  console.warn('\n⚠️  FLS advisory (cascading consequences) — these custom fields are not in any permission set:');
  for (const ref of missing) console.warn(`    • ${ref}`);
  console.warn(
    '\n   They will be invisible to users (and SOQL) until granted FLS, unless that\n' +
      '   is intentional (Apex/system-only, or deliberately denied). Add them to the\n' +
      `   right permission set under ${permsetDirs.join(' / ')}/, or note the omission in your PR.\n`
  );
}

process.exit(0); // advisory only — never blocks the commit
