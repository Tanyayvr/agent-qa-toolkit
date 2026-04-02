#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureParent,
  extractHrefs,
  firstDiffPath,
  normalizeManifest,
  normalizeValue,
  readJson,
} from "./lib/evidence-contract-utils.mjs";
import { buildAgentEvidenceFixtureArgs } from "./lib/product-surface-fixtures.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-package.mjs");
const GOLDEN_PATH = path.join(REPO_ROOT, "conformance", "golden-agent-evidence-contract.json");
const DEFAULT_ACTUAL_OUT = path.join(REPO_ROOT, "apps", "evaluator", "reports", "agent-evidence-contract-actual.json");

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/agent-evidence-contract-check.mjs [--write] [--json] [--keepTmp] [--actualOut <path>]",
    "",
    "Options:",
    "  --write             Update conformance/golden-agent-evidence-contract.json from the current generator output",
    "  --json              Print machine-readable JSON",
    "  --keepTmp           Keep the temporary workspace on disk",
    "  --actualOut <path>  Where to write the actual normalized snapshot on mismatch",
    "  --help              Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    write: false,
    json: false,
    keepTmp: false,
    actualOut: DEFAULT_ACTUAL_OUT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--write") {
      args.write = true;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--keepTmp") {
      args.keepTmp = true;
      continue;
    }
    if (arg === "--actualOut") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        console.error("Missing value for --actualOut");
        usage(2);
      }
      args.actualOut = path.resolve(value);
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  return args;
}

function runNode(scriptAbs, scriptArgs, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [scriptAbs, ...scriptArgs], {
    cwd,
    encoding: "utf8",
  });
}

function buildSnapshot(reportDir) {
  const report = readJson(path.join(reportDir, "compare-report.json"));
  const manifest = readJson(path.join(reportDir, "artifacts", "manifest.json"));
  const reportHtml = readFileSync(path.join(reportDir, "report.html"), "utf8");
  const retentionControls = readJson(path.join(reportDir, "archive", "retention-controls.json"));

  return {
    fixture_version: 1,
    compare_report: normalizeValue(report),
    manifest: normalizeManifest(manifest),
    retention_archive_controls: normalizeValue(retentionControls),
    html_contract: {
      main_report_hrefs: extractHrefs(reportHtml),
    },
  };
}

function packageFixture(outDir) {
  const result = runNode(
    PACKAGE_SCRIPT,
    buildAgentEvidenceFixtureArgs(REPO_ROOT, { outDir, reportId: "golden-agent-evidence" })
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Packaging failed for Agent Evidence contract fixture");
  }
}

function finish(args, payload) {
  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Agent Evidence contract check: ${payload.ok ? "PASS" : "FAIL"}`);
    console.log(`- golden: ${payload.golden_path}`);
    console.log(`- actual: ${payload.actual_out}`);
    if (payload.tmp_root) console.log(`- tmp: ${payload.tmp_root}`);
    if (!payload.ok && payload.first_diff_path) console.log(`- first_diff: ${payload.first_diff_path}`);
    if (payload.mode) console.log(`- mode: ${payload.mode}`);
  }
  process.exit(payload.ok ? 0 : 1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "aq-agent-evidence-contract-"));
  const outDir = path.join(tmpRoot, "report");

  try {
    packageFixture(outDir);
    const snapshot = buildSnapshot(outDir);

    if (args.write) {
      ensureParent(args.actualOut);
      writeFileSync(args.actualOut, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      writeFileSync(GOLDEN_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      finish(args, {
        ok: true,
        mode: "write",
        golden_path: GOLDEN_PATH,
        actual_out: args.actualOut,
        ...(args.keepTmp ? { tmp_root: tmpRoot } : {}),
      });
    }

    if (!existsSync(GOLDEN_PATH)) {
      throw new Error(`Golden snapshot not found: ${GOLDEN_PATH}`);
    }

    const golden = readJson(GOLDEN_PATH);
    const firstDiff = firstDiffPath(golden, snapshot);
    if (firstDiff) {
      ensureParent(args.actualOut);
      writeFileSync(args.actualOut, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    }
    finish(args, {
      ok: firstDiff === null,
      mode: "verify",
      golden_path: GOLDEN_PATH,
      actual_out: firstDiff ? args.actualOut : null,
      ...(firstDiff ? { first_diff_path: firstDiff } : {}),
      ...(args.keepTmp ? { tmp_root: tmpRoot } : {}),
    });
  } finally {
    if (!args.keepTmp) {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
