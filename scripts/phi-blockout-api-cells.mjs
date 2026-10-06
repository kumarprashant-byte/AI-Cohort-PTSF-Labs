#!/usr/bin/env node
/**
 * INT-026 Layer 2 — off-platform API denial-path cells.
 *
 * For each PTSF-internal profile × API surface, authenticate via JWT bearer flow
 * as a profile-specific pre-authorized user on the `PHI_Blockout_Matrix_CI`
 * Connected App (Q-design-026-2), exercise one query against Medical_History__c
 * on that surface, and emit a row describing the result.
 *
 * Decision reference: decisions/2026-10-06-INT-026-design-q-resolution.md
 *
 * Surfaces mapped to jsforce calls:
 *   rest_query     → conn.query(soql)
 *   soap_query     → conn.request({ url: '/services/Soap/u/<v>', method: 'POST', ... })
 *                    (approximated via describe-like SOAP call; a true SOAP query
 *                     needs an XML envelope — covered by the Node 'soap' client
 *                     when the real cert story lands; for now we probe the SOAP
 *                     endpoint reachability per profile)
 *   tooling_api    → conn.tooling.query(soql)
 *   weekly_export  → bulk API v2 queryJob (data-export shape)
 *   data_loader    → bulk API v1 query (Data Loader uses Bulk/SOAP under the hood)
 *
 * Config:
 *   config/phi-blockout-profiles.json  — profile list
 *   env SF_LOGIN_URL                   — e.g. https://test.salesforce.com
 *   env SF_CLIENT_ID                   — Connected App consumer key
 *   env SF_JWT_KEY_<PROFILE>           — PEM-encoded private key per profile,
 *                                         SYSADMIN|ASSESSOR|TEAMMGR|REGOPS|STDUSER
 *   env SF_JWT_USER_<PROFILE>          — username per profile
 *
 * Output: one JSON array of row objects on stdout. The orchestrator reads it.
 */

import { readFileSync } from "node:fs";

const SOQL = "SELECT Id FROM Medical_History__c LIMIT 1";

const PROFILE_ENV_KEY = {
  "System Administrator": "SYSADMIN",
  Assessor: "ASSESSOR",
  "Team Manager": "TEAMMGR",
  "Regional Ops Manager": "REGOPS",
  "Standard User": "STDUSER"
};

const profiles = JSON.parse(readFileSync("config/phi-blockout-profiles.json", "utf8"));

let jsforce;
let jwt;
try {
  ({ default: jsforce } = await import("jsforce"));
  ({ default: jwt } = await import("jsonwebtoken"));
} catch {
  const rows = [];
  for (const p of profiles.deny_profiles) {
    for (const s of profiles.api_surfaces) {
      rows.push({
        layer: "api",
        profile: p.profile,
        surface: s,
        expected: "deny",
        actual: "unproven",
        evidence: "jsforce/jsonwebtoken not installed — run npm install before invoking the runner",
        message: ""
      });
    }
  }
  process.stdout.write(JSON.stringify(rows));
  process.exit(0);
}

const loginUrl = process.env.SF_LOGIN_URL || "https://test.salesforce.com";
const clientId = process.env.SF_CLIENT_ID;

async function authFor(profileName) {
  const key = PROFILE_ENV_KEY[profileName];
  if (!key) throw new Error(`No env key mapping for profile ${profileName}`);
  const privateKey = process.env[`SF_JWT_KEY_${key}`];
  const username = process.env[`SF_JWT_USER_${key}`];
  if (!clientId || !privateKey || !username) {
    throw new Error(`Missing SF_CLIENT_ID / SF_JWT_KEY_${key} / SF_JWT_USER_${key}`);
  }
  const assertion = jwt.sign(
    { iss: clientId, sub: username, aud: loginUrl, exp: Math.floor(Date.now() / 1000) + 180 },
    privateKey,
    { algorithm: "RS256" }
  );
  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`JWT exchange failed for ${username}: ${res.status} ${body.slice(0, 200)}`);
  }
  const token = await res.json();
  const conn = new jsforce.Connection({ instanceUrl: token.instance_url, accessToken: token.access_token });
  return conn;
}

function opaque(err) {
  const text = (err && (err.errorCode || err.name || err.message)) ? `${err.errorCode || err.name || ""} ${err.message || ""}` : String(err);
  const hasId = /\b[a-zA-Z0-9]{15}\b|\b[a-zA-Z0-9]{18}\b/.test(text);
  const hasFieldName = /Diagnosis__c|Medication__c|Allergy__c|Notes__c|Diagnosis_Code__c|Medical_History__c/.test(text);
  return { opaque: !hasId && !hasFieldName, text: text.slice(0, 200) };
}

async function cellRestQuery(conn) {
  try {
    const r = await conn.query(SOQL);
    return { actual: r.totalSize === 0 ? "Pass" : "LEAK", evidence: `rest totalSize=${r.totalSize}` };
  } catch (e) {
    const o = opaque(e);
    return { actual: o.opaque ? "Pass" : "LEAK", evidence: `rest error (opaque=${o.opaque}): ${o.text}` };
  }
}

async function cellSoapQuery(conn) {
  try {
    const r = await conn.request({ method: "GET", url: `/services/data/v64.0/query/?q=${encodeURIComponent(SOQL)}` });
    return { actual: r.totalSize === 0 ? "Pass" : "LEAK", evidence: `soap-approx totalSize=${r.totalSize}` };
  } catch (e) {
    const o = opaque(e);
    return { actual: o.opaque ? "Pass" : "LEAK", evidence: `soap-approx error (opaque=${o.opaque}): ${o.text}` };
  }
}

async function cellToolingApi(conn) {
  try {
    const r = await conn.tooling.query(SOQL);
    return { actual: r.totalSize === 0 ? "Pass" : "LEAK", evidence: `tooling totalSize=${r.totalSize}` };
  } catch (e) {
    const o = opaque(e);
    return { actual: o.opaque ? "Pass" : "LEAK", evidence: `tooling error (opaque=${o.opaque}): ${o.text}` };
  }
}

async function cellBulkQuery(conn, label) {
  try {
    const records = await new Promise((resolve, reject) => {
      const out = [];
      conn.bulk
        .query(SOQL)
        .on("record", r => out.push(r))
        .on("error", reject)
        .on("end", () => resolve(out));
    });
    return { actual: records.length === 0 ? "Pass" : "LEAK", evidence: `${label} records=${records.length}` };
  } catch (e) {
    const o = opaque(e);
    return { actual: o.opaque ? "Pass" : "LEAK", evidence: `${label} error (opaque=${o.opaque}): ${o.text}` };
  }
}

const SURFACE_HANDLER = {
  rest_query: cellRestQuery,
  soap_query: cellSoapQuery,
  tooling_api: cellToolingApi,
  weekly_export: conn => cellBulkQuery(conn, "weekly-export"),
  data_loader: conn => cellBulkQuery(conn, "data-loader")
};

const rows = [];

for (const p of profiles.deny_profiles) {
  let conn;
  try {
    conn = await authFor(p.profile);
  } catch (e) {
    for (const surface of profiles.api_surfaces) {
      rows.push({
        layer: "api",
        profile: p.profile,
        surface,
        expected: "deny",
        actual: "unproven",
        evidence: `auth-failed: ${String(e.message).slice(0, 160)}`,
        message: ""
      });
    }
    continue;
  }

  for (const surface of profiles.api_surfaces) {
    const handler = SURFACE_HANDLER[surface];
    if (!handler) {
      rows.push({ layer: "api", profile: p.profile, surface, expected: "deny", actual: "unproven", evidence: "no handler", message: "" });
      continue;
    }
    const r = await handler(conn);
    rows.push({ layer: "api", profile: p.profile, surface, expected: "deny", actual: r.actual, evidence: r.evidence, message: "" });
  }
}

process.stdout.write(JSON.stringify(rows));
