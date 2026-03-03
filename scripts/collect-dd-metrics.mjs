#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
}

function runOrNull(cmd) {
  try {
    return run(cmd);
  } catch {
    return null;
  }
}

function parseIntSafe(v) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function fileLineCount(target) {
  const txt = runOrNull(`wc -l "${target}"`);
  if (!txt) return null;
  const first = txt.trim().split(/\s+/)[0];
  return parseIntSafe(first);
}

function gitFileLineCount(rev, target) {
  const txt = runOrNull(`git show ${rev}:"${target}" | wc -l`);
  return txt ? parseIntSafe(txt) : null;
}

const repoRoot = process.cwd();
const baselineCommit = process.env.DD_BASELINE_COMMIT || "a5b84ba";

const metrics = {
  generated_at: new Date().toISOString(),
  repo_root: repoRoot,
  head_commit: runOrNull("git rev-parse --short HEAD"),
  baseline_commit: baselineCommit,
  tests: {
    current_test_files: parseIntSafe(
      runOrNull("rg --files | rg '(test|spec)\\.(ts|tsx|js|mjs)$' | wc -l"),
    ),
    baseline_test_files: parseIntSafe(
      runOrNull(
        `git ls-tree -r --name-only ${baselineCommit} | rg '(test|spec)\\.(ts|tsx|js|mjs)$' | wc -l`,
      ),
    ),
  },
  coverage: {
    total: null,
  },
  loc: {
    current: {
      runner_ts: fileLineCount("apps/runner/src/runner.ts"),
      evaluator_ts: fileLineCount("apps/evaluator/src/evaluator.ts"),
      html_report_ts: fileLineCount("apps/evaluator/src/htmlReport.ts"),
    },
    baseline: {
      runner_ts: gitFileLineCount(baselineCommit, "apps/runner/src/runner.ts"),
      evaluator_ts: gitFileLineCount(baselineCommit, "apps/evaluator/src/evaluator.ts"),
      html_report_ts: gitFileLineCount(baselineCommit, "apps/evaluator/src/htmlReport.ts"),
    },
  },
};

const covPath = path.join(repoRoot, "coverage", "coverage-summary.json");
if (fs.existsSync(covPath)) {
  try {
    const cov = JSON.parse(fs.readFileSync(covPath, "utf8"));
    metrics.coverage.total = cov.total ?? null;
  } catch {
    metrics.coverage.total = null;
  }
}

if (!metrics.coverage.total) {
  const lcovPath = path.join(repoRoot, "coverage", "lcov.info");
  if (fs.existsSync(lcovPath)) {
    const raw = fs.readFileSync(lcovPath, "utf8");
    let linesFound = 0;
    let linesHit = 0;
    let funcsFound = 0;
    let funcsHit = 0;
    let branchesFound = 0;
    let branchesHit = 0;

    for (const line of raw.split("\n")) {
      if (line.startsWith("LF:")) linesFound += parseIntSafe(line.slice(3)) ?? 0;
      if (line.startsWith("LH:")) linesHit += parseIntSafe(line.slice(3)) ?? 0;
      if (line.startsWith("FNF:")) funcsFound += parseIntSafe(line.slice(4)) ?? 0;
      if (line.startsWith("FNH:")) funcsHit += parseIntSafe(line.slice(4)) ?? 0;
      if (line.startsWith("BRF:")) branchesFound += parseIntSafe(line.slice(4)) ?? 0;
      if (line.startsWith("BRH:")) branchesHit += parseIntSafe(line.slice(4)) ?? 0;
    }

    function pct(hit, found) {
      if (!found) return 0;
      return Number(((hit / found) * 100).toFixed(2));
    }

    metrics.coverage.total = {
      lines: { total: linesFound, covered: linesHit, pct: pct(linesHit, linesFound) },
      functions: { total: funcsFound, covered: funcsHit, pct: pct(funcsHit, funcsFound) },
      branches: { total: branchesFound, covered: branchesHit, pct: pct(branchesHit, branchesFound) },
    };
  }
}

console.log(JSON.stringify(metrics, null, 2));
