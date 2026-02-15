// tool/scripts/toolkit-tests.mjs
import { spawn } from "node:child_process";
import { readFileSync, existsSync, cpSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const baseUrl = getArg("--baseUrl") || "http://localhost:8787";
const skipDemo = hasFlag("--skipDemo");

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", cwd: ROOT, env: process.env });
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

function isPortableHref(href) {
  if (typeof href !== "string" || !href.length) return false;
  if (href.includes("://")) return false;
  if (href.startsWith("/") || href.startsWith("\\")) return false;
  if (href.includes("..")) return false;
  return true;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function loadReport(relPath) {
  const abs = path.join(ROOT, relPath);
  const raw = readFileSync(abs, "utf-8");
  return JSON.parse(raw);
}

function validateAgainstSchema(report) {
  const schemaPath = path.join(ROOT, "schemas", "compare-report-v5.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile(schema);
  const ok = validate(report);
  assert(ok, `schema validation failed: ${JSON.stringify(validate.errors || [])}`);
}

function validateReport(report, reportDir) {
  validateAgainstSchema(report);
  assert(report.contract_version === 5, "contract_version must be 5");
  assert(typeof report.report_id === "string", "report_id must be string");
  assert(Array.isArray(report.items), "items must be array");
  assert(report.items.length > 0, "items must be non-empty");

  const q = report.quality_flags || {};
  assert(q.self_contained === true, "quality_flags.self_contained must be true");
  assert(q.portable_paths === true, "quality_flags.portable_paths must be true");
  assert((q.missing_assets_count ?? 0) === 0, "quality_flags.missing_assets_count must be 0");

  const required = [
    "case_id",
    "title",
    "case_status",
    "baseline_pass",
    "new_pass",
    "data_availability",
    "artifacts",
    "trace_integrity",
    "security",
    "risk_level",
    "gate_recommendation",
  ];

  for (const it of report.items) {
    for (const k of required) {
      assert(Object.prototype.hasOwnProperty.call(it, k), `item missing ${k}`);
    }
    assert(it.artifacts.replay_diff_href, "item.artifacts.replay_diff_href missing");
    assert(isPortableHref(it.artifacts.replay_diff_href), "replay_diff_href not portable");
    const diffAbs = path.join(reportDir, it.artifacts.replay_diff_href);
    assert(existsSync(diffAbs), `missing replay diff: ${it.artifacts.replay_diff_href}`);

    const hrefs = [
      it.artifacts.baseline_failure_body_href,
      it.artifacts.baseline_failure_meta_href,
      it.artifacts.new_failure_body_href,
      it.artifacts.new_failure_meta_href,
      it.artifacts.baseline_case_response_href,
      it.artifacts.new_case_response_href,
      it.artifacts.baseline_run_meta_href,
      it.artifacts.new_run_meta_href,
    ].filter(Boolean);

    for (const href of hrefs) {
      assert(isPortableHref(href), `non-portable href: ${href}`);
      const abs = path.join(reportDir, href);
      assert(existsSync(abs), `missing asset: ${href}`);
    }
  }
}

function copyToTmp(srcDir, name) {
  const base = path.join("/tmp", "agent-qa-toolkit-tests");
  mkdirSync(base, { recursive: true });
  const dst = path.join(base, name);
  rmSync(dst, { recursive: true, force: true });
  cpSync(srcDir, dst, { recursive: true });
  return dst;
}

function assertGate(report, caseId, expected) {
  const it = report.items.find((x) => x.case_id === caseId);
  assert(it, `case not found: ${caseId}`);
  assert(it.gate_recommendation === expected, `gate_recommendation for ${caseId} expected ${expected}, got ${it.gate_recommendation}`);
}

async function main() {
  if (!skipDemo) {
    await run("node", ["scripts/demo-e2e.mjs", "--baseUrl", baseUrl, "--skipAudit", "--skipLint", "--skipTypecheck"], "demo:e2e");
  }

  const correctnessRel = "apps/evaluator/reports/correctness_latest/compare-report.json";
  const robustnessRel = "apps/evaluator/reports/robustness_latest/compare-report.json";

  const correctness = loadReport(correctnessRel);
  const robustness = loadReport(robustnessRel);

  const correctnessDir = path.join(ROOT, "apps/evaluator/reports/correctness_latest");
  const robustnessDir = path.join(ROOT, "apps/evaluator/reports/robustness_latest");

  validateReport(correctness, correctnessDir);
  validateReport(robustness, robustnessDir);

  const tmpCorrectness = copyToTmp(correctnessDir, "correctness_latest");
  const tmpRobustness = copyToTmp(robustnessDir, "robustness_latest");
  validateReport(correctness, tmpCorrectness);
  validateReport(robustness, tmpRobustness);

  const keys1 = Object.keys(correctness.summary_by_suite || {});
  const keys2 = Object.keys(robustness.summary_by_suite || {});
  assert(keys1.includes("correctness"), "summary_by_suite must include correctness");
  assert(keys1.includes("robustness"), "summary_by_suite must include robustness");
  assert(keys2.includes("robustness"), "summary_by_suite must include robustness (matrix)");

  assertGate(correctness, "fetch_timeout_001", "require_approval");
  assertGate(correctness, "fetch_network_drop_001", "require_approval");
  assertGate(robustness, "matrix_net_timeout", "require_approval");
  assertGate(robustness, "matrix_net_drop", "require_approval");

  console.log("toolkit-tests: PASS");
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  process.exit(1);
});
