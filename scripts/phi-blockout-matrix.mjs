#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, i, all) => {
    if (token.startsWith("--")) pairs.push([token.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]);
    return pairs;
  }, [])
);

const orgAlias = args.org || process.env.SF_TARGET_ORG;
if (!orgAlias) {
  console.error("Usage: node scripts/phi-blockout-matrix.mjs --org <alias>");
  process.exit(2);
}

const profiles = JSON.parse(readFileSync("config/phi-blockout-profiles.json", "utf8"));
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = resolve("delivery/compliance-evidence");
mkdirSync(outDir, { recursive: true });

const rows = [];

function runArgv(file, argv) {
  try {
    return { ok: true, stdout: execFileSync(file, argv, { stdio: ["ignore", "pipe", "pipe"], shell: false }).toString() };
  } catch (e) {
    return { ok: false, stdout: (e.stdout || "").toString(), stderr: (e.stderr || "").toString() };
  }
}

console.log(`[matrix] Running Layer 1 (Apex tests) against org ${orgAlias}`);
const apexResult = runArgv("sf", [
  "apex", "run", "test",
  "--target-org", orgAlias,
  "--class-names", "PhiBlockoutRecordPageTest,PhiBlockoutRelatedListTest,PhiBlockoutListViewTest,PhiBlockoutStandardReportTest,PhiBlockoutCustomReportTest,PhiBlockoutDashboardTest,PhiBlockoutSoslTest,PhiBlockoutContentDocumentTest,PhiBreakGlassAuditSameTxnTest",
  "--result-format", "json",
  "--synchronous",
  "--code-coverage", "false"
]);

const apexParsed = (() => {
  try { return JSON.parse(apexResult.stdout); } catch { return null; }
})();

if (!apexParsed) {
  console.error("[matrix] Could not parse Apex test output");
  console.error(apexResult.stdout.slice(0, 2000));
  process.exit(3);
}

const apexTests = (apexParsed.result && apexParsed.result.tests) || [];
for (const t of apexTests) {
  rows.push({
    layer: "apex",
    profile: inferProfileFromMethodName(t.MethodName),
    surface: inferSurfaceFromClassName(t.ApexClass.Name),
    expected: /BreakGlass|GrantAndRead/i.test(t.MethodName) ? "allow+audit" : "deny",
    actual: t.Outcome,
    evidence: `${t.ApexClass.Name}.${t.MethodName}`,
    message: t.Message || ""
  });
}

console.log(`[matrix] Running Layer 2 (API cells) against org ${orgAlias}`);
const apiResult = runArgv("node", ["scripts/phi-blockout-api-cells.mjs", "--org", orgAlias]);
if (!apiResult.ok) {
  console.warn("[matrix] Layer 2 runner did not complete — treating all API cells as unproven");
  console.warn(apiResult.stderr.slice(0, 1000));
  for (const p of profiles.deny_profiles) {
    for (const s of profiles.api_surfaces) {
      rows.push({ layer: "api", profile: p.profile, surface: s, expected: "deny", actual: "unproven", evidence: "runner-did-not-complete", message: "" });
    }
  }
} else {
  try {
    const apiRows = JSON.parse(apiResult.stdout);
    rows.push(...apiRows);
  } catch {
    console.warn("[matrix] Layer 2 output did not parse as JSON");
  }
}

const phiLeakPattern = /\b([a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})\b|Diagnosis__c|Medication__c|Allergy__c|Notes__c|Diagnosis_Code__c/;
const leakyRows = rows.filter(r => phiLeakPattern.test(r.evidence) || phiLeakPattern.test(r.message));
if (leakyRows.length) {
  console.error(`[matrix] PHI leak detected in ${leakyRows.length} report row(s) — guardrail violation. Aborting write.`);
  process.exit(4);
}

const csv = ["layer,profile,surface,expected,actual,evidence"].concat(
  rows.map(r => [r.layer, r.profile, r.surface, r.expected, r.actual, r.evidence].map(csvCell).join(","))
).join("\n");

const md = [
  `# PHI blockout matrix — ${timestamp}`,
  "",
  `Org: \`${orgAlias}\``,
  `Rows: ${rows.length}`,
  "",
  "| Layer | Profile | Surface | Expected | Actual | Evidence |",
  "|---|---|---|---|---|---|",
  ...rows.map(r => `| ${r.layer} | ${r.profile} | ${r.surface} | ${r.expected} | ${r.actual} | ${r.evidence} |`)
].join("\n");

writeFileSync(resolve(outDir, `phi-blockout-matrix-${timestamp}.csv`), csv);
writeFileSync(resolve(outDir, `phi-blockout-matrix-${timestamp}.md`), md);
console.log(`[matrix] Wrote matrix to ${outDir}`);

const red = rows.filter(r => expectedVsActualIsRed(r));
if (red.length) {
  console.error(`[matrix] FAIL — ${red.length} red cell(s):`);
  for (const r of red) console.error(`  ${r.profile} x ${r.surface} (${r.layer}): expected ${r.expected}, got ${r.actual}`);
  process.exit(1);
}
console.log(`[matrix] PASS — ${rows.length} cells green`);

function csvCell(v) {
  const s = String(v || "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function expectedVsActualIsRed(r) {
  if (r.expected === "deny") return r.actual !== "Pass" && r.actual !== "deny";
  if (r.expected === "allow+audit") return r.actual !== "Pass" && r.actual !== "allow+audit";
  return r.actual !== "Pass";
}

function inferProfileFromMethodName(name) {
  if (/systemAdministrator/i.test(name)) return "System Administrator";
  if (/assessor/i.test(name)) return "Assessor";
  if (/teamManager/i.test(name)) return "Team Manager";
  if (/regionalOps/i.test(name)) return "Regional Ops Manager";
  if (/standardUser/i.test(name)) return "Standard User";
  if (/complianceOfficer|BreakGlass|GrantAndRead/i.test(name)) return "Compliance Officer";
  return "unknown";
}

function inferSurfaceFromClassName(cls) {
  if (/RecordPage/.test(cls)) return "record_page";
  if (/RelatedList/.test(cls)) return "related_list";
  if (/ListView/.test(cls)) return "list_view";
  if (/StandardReport/.test(cls)) return "standard_report";
  if (/CustomReport/.test(cls)) return "custom_report";
  if (/Dashboard/.test(cls)) return "dashboard";
  if (/Sosl/.test(cls)) return "sosl";
  if (/ContentDocument/.test(cls)) return "content_document";
  if (/BreakGlass/.test(cls)) return "break_glass";
  return "unknown";
}
