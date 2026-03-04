#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const HELP = `Usage:
  node scripts/library-ingest.mjs --reportDir <dir> [options]

Options:
  --reportDir <dir>      Evaluator report directory containing compare-report.json (required)
  --libraryDir <dir>     Target library root (default: .agent-qa/library)
  --agentId <id>         Agent identifier label
  --suite <name>         Suite label (e.g. cli, autonomous)
  --profile <name>       Profile label (e.g. quality, infra)
  --source <name>        Source label (default: local)
  --force                Overwrite existing run_key directory
  --dryRun               Print outputs without writing files
  -h, --help             Show help
`;

function parseArgs(argv) {
  const opts = {
    reportDir: null,
    libraryDir: ".agent-qa/library",
    agentId: null,
    suite: null,
    profile: null,
    source: "local",
    force: false,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      console.log(HELP);
      process.exit(0);
    }
    if (a === "--force") {
      opts.force = true;
      continue;
    }
    if (a === "--dryRun") {
      opts.dryRun = true;
      continue;
    }
    if (!a.startsWith("--")) {
      throw new Error(`Unknown argument: ${a}`);
    }
    const key = a.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${a}`);
    }
    i += 1;
    if (key === "reportDir") opts.reportDir = value;
    else if (key === "libraryDir") opts.libraryDir = value;
    else if (key === "agentId") opts.agentId = value;
    else if (key === "suite") opts.suite = value;
    else if (key === "profile") opts.profile = value;
    else if (key === "source") opts.source = value;
    else throw new Error(`Unknown option: ${a}`);
  }

  if (!opts.reportDir) {
    throw new Error("Missing required --reportDir");
  }

  return opts;
}

function sanitizeToken(input) {
  return String(input ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "unknown";
}

function toCompactTs(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}_${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function parseGeneratedAt(report) {
  const raw = report?.meta?.generated_at;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const fromNumber = Number.parseInt(raw, 10);
    if (Number.isFinite(fromNumber) && fromNumber > 0) return fromNumber;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Date.now();
}

function inc(map, key) {
  const k = key || "unknown";
  map[k] = (map[k] || 0) + 1;
}

function summarizeItems(items) {
  const byCaseStatus = {};
  const byRiskLevel = {};
  const byGateRecommendation = {};
  const baselineFailureClass = {};
  const newFailureClass = {};

  for (const it of items) {
    inc(byCaseStatus, it?.case_status ?? "unknown");
    inc(byRiskLevel, it?.risk_level ?? "unknown");
    inc(byGateRecommendation, it?.gate_recommendation ?? "unknown");

    const b = it?.failure_summary?.baseline?.class;
    const n = it?.failure_summary?.new?.class;
    if (b) inc(baselineFailureClass, b);
    if (n) inc(newFailureClass, n);
  }

  return {
    by_case_status: byCaseStatus,
    by_risk_level: byRiskLevel,
    by_gate_recommendation: byGateRecommendation,
    baseline_failure_class: baselineFailureClass,
    new_failure_class: newFailureClass,
  };
}

function caseToLine(item) {
  return {
    case_id: item?.case_id ?? null,
    title: item?.title ?? null,
    suite: item?.suite ?? null,
    case_status: item?.case_status ?? null,
    data_availability: item?.data_availability ?? null,
    baseline_pass: item?.baseline_pass ?? null,
    new_pass: item?.new_pass ?? null,
    risk_level: item?.risk_level ?? null,
    risk_tags: Array.isArray(item?.risk_tags) ? item.risk_tags : [],
    gate_recommendation: item?.gate_recommendation ?? null,
    preventable_by_policy: item?.preventable_by_policy ?? null,
    baseline_failure_class: item?.failure_summary?.baseline?.class ?? null,
    new_failure_class: item?.failure_summary?.new?.class ?? null,
  };
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(target, data) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function copyIfExists(src, dst) {
  if (!(await exists(src))) return false;
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.copyFile(src, dst);
  return true;
}

async function loadIndex(indexPath) {
  if (!(await exists(indexPath))) {
    return { schema_version: 1, updated_at: null, runs: [] };
  }
  const raw = await fs.readFile(indexPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.runs)) {
    return { schema_version: 1, updated_at: null, runs: [] };
  }
  return parsed;
}

async function main() {
  const opts = parseArgs(process.argv);

  const reportDirAbs = path.resolve(opts.reportDir);
  const libraryDirAbs = path.resolve(opts.libraryDir);
  const comparePath = path.join(reportDirAbs, "compare-report.json");

  if (!(await exists(comparePath))) {
    throw new Error(`compare-report.json not found: ${comparePath}`);
  }

  const report = JSON.parse(await fs.readFile(comparePath, "utf8"));
  const summary = report?.summary ?? {};
  const executionQuality = summary?.execution_quality ?? {};
  const dataCoverage = summary?.data_coverage ?? {};
  const items = Array.isArray(report?.items) ? report.items : [];

  const reportId = sanitizeToken(report?.report_id ?? path.basename(reportDirAbs));
  const generatedAtMs = parseGeneratedAt(report);
  const runKey = `${toCompactTs(generatedAtMs)}__${reportId}`;

  const runDir = path.join(libraryDirAbs, "runs", runKey);
  const rawDir = path.join(runDir, "raw");
  const manifestPath = path.join(runDir, "manifest.json");
  const casesPath = path.join(runDir, "cases.ndjson");
  const indexPath = path.join(libraryDirAbs, "index.json");

  if (await exists(runDir)) {
    if (!opts.force) {
      throw new Error(`run key already exists: ${runDir} (use --force to overwrite)`);
    }
    if (!opts.dryRun) {
      await fs.rm(runDir, { recursive: true, force: true });
    }
  }

  const itemSummary = summarizeItems(items);
  const reportHtml = path.join(reportDirAbs, "report.html");
  const trendHtml = path.join(reportDirAbs, "trend.html");

  const manifest = {
    schema_version: 1,
    run_key: runKey,
    ingested_at: new Date().toISOString(),
    labels: {
      agent_id: opts.agentId,
      suite: opts.suite,
      profile: opts.profile,
      source: opts.source,
    },
    source: {
      report_dir: reportDirAbs,
      compare_report_path: comparePath,
      report_html_exists: await exists(reportHtml),
      trend_html_exists: await exists(trendHtml),
    },
    report: {
      report_id: report?.report_id ?? null,
      contract_version: report?.contract_version ?? null,
      generated_at_ms: generatedAtMs,
      generated_at_iso: new Date(generatedAtMs).toISOString(),
      baseline_dir: report?.baseline_dir ?? null,
      new_dir: report?.new_dir ?? null,
      cases_path: report?.cases_path ?? null,
    },
    metrics: {
      baseline_pass: summary?.baseline_pass ?? null,
      new_pass: summary?.new_pass ?? null,
      regressions: summary?.regressions ?? null,
      improvements: summary?.improvements ?? null,
      execution_quality: {
        status: executionQuality?.status ?? null,
        reasons: executionQuality?.reasons ?? null,
        baseline_transport_success_rate: executionQuality?.baseline_transport_success_rate ?? null,
        new_transport_success_rate: executionQuality?.new_transport_success_rate ?? null,
        weak_expected_rate: executionQuality?.weak_expected_rate ?? null,
        total_executed_cases: executionQuality?.total_executed_cases ?? null,
        model_quality_inconclusive: executionQuality?.model_quality_inconclusive ?? null,
      },
      data_coverage: dataCoverage,
      trace_anchor_coverage: summary?.trace_anchor_coverage ?? null,
      item_summary: itemSummary,
    },
  };

  const index = await loadIndex(indexPath);
  const indexEntry = {
    run_key: runKey,
    run_dir: path.relative(libraryDirAbs, runDir).split(path.sep).join("/"),
    report_id: manifest.report.report_id,
    generated_at_ms: manifest.report.generated_at_ms,
    generated_at_iso: manifest.report.generated_at_iso,
    execution_quality_status: manifest.metrics.execution_quality.status,
    regressions: manifest.metrics.regressions,
    improvements: manifest.metrics.improvements,
    total_cases: items.length,
    labels: manifest.labels,
  };

  const nextRuns = [
    indexEntry,
    ...index.runs.filter((r) => r.run_key !== runKey),
  ].sort((a, b) => {
    const ma = Number(a.generated_at_ms || 0);
    const mb = Number(b.generated_at_ms || 0);
    return mb - ma;
  });

  const nextIndex = {
    schema_version: 1,
    updated_at: new Date().toISOString(),
    runs: nextRuns,
  };

  if (opts.dryRun) {
    console.log(JSON.stringify({ dry_run: true, run_key: runKey, manifest, index_entry: indexEntry }, null, 2));
    return;
  }

  await fs.mkdir(rawDir, { recursive: true });
  await writeJson(manifestPath, manifest);
  await writeJson(indexPath, nextIndex);

  const ndjson = items.map((it) => JSON.stringify(caseToLine(it))).join("\n");
  await fs.writeFile(casesPath, ndjson.length ? `${ndjson}\n` : "", "utf8");

  await copyIfExists(comparePath, path.join(rawDir, "compare-report.json"));
  await copyIfExists(reportHtml, path.join(rawDir, "report.html"));
  await copyIfExists(trendHtml, path.join(rawDir, "trend.html"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        run_key: runKey,
        library_dir: libraryDirAbs,
        run_dir: runDir,
        indexed_runs: nextRuns.length,
        execution_quality_status: manifest.metrics.execution_quality.status,
        total_cases: items.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`library-ingest failed: ${message}`);
  process.exit(1);
});
