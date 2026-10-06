#!/usr/bin/env node
/**
 * INT-026 Layer 2 — off-platform API denial-path cells.
 *
 * Exercises REST / SOAP / Tooling API / Weekly Export / Data Loader API as each
 * PTSF-internal profile. Writes a JSON array of {layer, profile, surface,
 * expected, actual, evidence, message} rows to stdout so the orchestrator can
 * fold them into the matrix.
 *
 * Auth: JWT bearer flow via a per-profile Connected App certificate. The
 * Connected App shape and secret storage are **Q-design-026-2** — this runner
 * reads config/phi-blockout-jwt.json (not yet committed; keys live in CI secrets
 * via GitHub OIDC → SF JWT exchange).
 *
 * Status: skeleton. Emits an unproven row per cell until Q-design-026-2 lands
 * and the JWT exchange is wired. The orchestrator treats unproven as red, which
 * is correct — Layer 2 is not yet acceptance evidence.
 */

import { readFileSync } from "node:fs";

const profiles = JSON.parse(readFileSync("config/phi-blockout-profiles.json", "utf8"));
const rows = [];

for (const p of profiles.deny_profiles) {
  for (const surface of profiles.api_surfaces) {
    rows.push({
      layer: "api",
      profile: p.profile,
      surface,
      expected: "deny",
      actual: "unproven",
      evidence: "Q-design-026-2 open — JWT Connected App + CI secret storage not yet wired",
      message: ""
    });
  }
}

process.stdout.write(JSON.stringify(rows));
