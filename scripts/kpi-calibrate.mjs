#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `Usage: node scripts/kpi-calibrate.mjs [options]

Options:
  --reportsRoot <path>     Reports root directory (default: apps/evaluator/reports)
  --last <n>               Use last N reports by mtime (default: 30)
  --minReports <n>         Minimum KPI-bearing reports required (default: 8)
  --qLower <0..0.5>        Lower quantile used for threshold recommendations (default: 0.25)
  --includeDegraded        Include degraded execution-quality runs (default: healthy only)
  --allowLowSample         Do not fail when KPI-bearing reports < --minReports
  --out <path>             Output JSON artifact (default: <reportsRoot>/kpi-calibration.json)
  --json                   Also print artifact JSON to stdout
  --help, -h               Show help
`;

function hasFlag(name, argv = process.argv) {
  return argv.includes(name);
}

function getArg(name, argv = process.argv) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  const v = argv[idx + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

function parsePositiveInt(raw, fallback, field) {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`invalid ${field}: ${String(raw)}`);
  return n;
}

function parseQuantile(raw, fallback) {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 0.5) throw new Error(`invalid --qLower: ${String(raw)} (expected 0..0.5)`);
  return n;
}

function round3(n) {
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(3));
}

function quantile(values, q) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const arr = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  if (arr.length === 1) return arr[0];
  const pos = (arr.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return arr[lower];
  const weight = pos - lower;
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

function median(values) {
  return quantile(values, 0.5);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function listCandidateReports(reportsRoot, last) {
  if (!fs.existsSync(reportsRoot)) return [];
  const dirs = fs
    .readdirSync(reportsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(reportsRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, "compare-report.json")));

  dirs.sort((a, b) => {
    const aPath = path.join(a, "compare-report.json");
    const bPath = path.join(b, "compare-report.json");
    const aTime = fs.statSync(aPath).mtimeMs;
    const bTime = fs.statSync(bPath).mtimeMs;
    return bTime - aTime;
  });

  return dirs.slice(0, last);
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function extractKpiSample(reportDir, includeDegraded = false) {
  const comparePath = path.join(reportDir, "compare-report.json");
  const compare = readJson(comparePath);
  if (!compare || typeof compare !== "object") return null;

  const eq = compare?.summary?.execution_quality;
  if (!eq || typeof eq !== "object") return null;
  if (!includeDegraded && eq.status !== "healthy") return null;

  const kpi = eq.admissibility_kpi;
  if (!kpi || typeof kpi !== "object") return null;

  const riskBefore = toNumber(kpi.risk_mass_before);
  const riskAfter = toNumber(kpi.risk_mass_after);
  const entropy = toNumber(kpi.pre_action_entropy_removed);
  const blocked = toNumber(kpi.blocked_cases);
  const reconTotal = toNumber(kpi.reconstruction_minutes_saved_total);
  const reconPerBlock = toNumber(kpi.reconstruction_minutes_saved_per_block);
  const modelMinutesPerUnit = toNumber(kpi?.model?.minutes_per_removed_risk_unit);
  const baselineTransport = toNumber(eq.baseline_transport_success_rate);
  const newTransport = toNumber(eq.new_transport_success_rate);

  if (riskBefore === null || riskAfter === null || entropy === null || blocked === null || reconTotal === null) return null;

  const removedRisk = Math.max(0, riskBefore - riskAfter);
  const observedMinutesPerUnit = removedRisk > 0 ? reconTotal / removedRisk : null;

  return {
    report_dir: reportDir,
    report_id: String(compare?.report_id ?? path.basename(reportDir)),
    status: String(eq.status ?? "unknown"),
    baseline_transport_success_rate: baselineTransport,
    new_transport_success_rate: newTransport,
    risk_mass_before: riskBefore,
    risk_mass_after: riskAfter,
    removed_risk_mass: removedRisk,
    pre_action_entropy_removed: entropy,
    blocked_cases: blocked,
    reconstruction_minutes_saved_total: reconTotal,
    reconstruction_minutes_saved_per_block: reconPerBlock ?? 0,
    model_minutes_per_removed_risk_unit: modelMinutesPerUnit,
    observed_minutes_per_removed_risk_unit: observedMinutesPerUnit,
  };
}

export function buildCalibrationArtifact(params) {
  const {
    reportsRoot,
    selectedReportDirs,
    samples,
    minReports,
    qLower,
    includeDegraded,
    generatedAt,
  } = params;

  const warnings = [];
  const entropyValues = samples.map((s) => s.pre_action_entropy_removed).filter((v) => Number.isFinite(v));
  const reconPerBlockValues = samples
    .filter((s) => Number(s.blocked_cases) > 0)
    .map((s) => s.reconstruction_minutes_saved_per_block)
    .filter((v) => Number.isFinite(v));
  const observedMinutesPerUnitValues = samples
    .map((s) => s.observed_minutes_per_removed_risk_unit)
    .filter((v) => Number.isFinite(v));
  const modelMinutesPerUnitValues = samples
    .map((s) => s.model_minutes_per_removed_risk_unit)
    .filter((v) => Number.isFinite(v));

  if (reconPerBlockValues.length === 0) {
    warnings.push("No blocked-case KPI samples found; recommended AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK will be 0.");
  }
  if (samples.length < minReports) {
    warnings.push(
      `Low calibration sample size: ${samples.length} report(s) with KPI data < minReports=${minReports}.`
    );
  }

  const minEntropy = quantile(entropyValues, qLower);
  const minReconPerBlock = quantile(reconPerBlockValues, qLower);
  const reconMinutesPerUnit = median(
    observedMinutesPerUnitValues.length > 0 ? observedMinutesPerUnitValues : modelMinutesPerUnitValues
  );

  const minTransportValues = samples
    .map((s) => {
      if (!Number.isFinite(s.baseline_transport_success_rate) || !Number.isFinite(s.new_transport_success_rate)) return null;
      return Math.min(s.baseline_transport_success_rate, s.new_transport_success_rate);
    })
    .filter((v) => Number.isFinite(v));

  const artifact = {
    generated_at: generatedAt,
    source: {
      reports_root: reportsRoot,
      selected_reports_count: selectedReportDirs.length,
      selected_reports: selectedReportDirs,
      include_degraded: includeDegraded,
    },
    sample: {
      kpi_reports_count: samples.length,
      min_reports_required: minReports,
    },
    observed: {
      pre_action_entropy_removed: {
        p25: round3(quantile(entropyValues, 0.25) ?? 0),
        p50: round3(quantile(entropyValues, 0.5) ?? 0),
        p75: round3(quantile(entropyValues, 0.75) ?? 0),
      },
      reconstruction_minutes_saved_per_block: {
        p25: round3(quantile(reconPerBlockValues, 0.25) ?? 0),
        p50: round3(quantile(reconPerBlockValues, 0.5) ?? 0),
        p75: round3(quantile(reconPerBlockValues, 0.75) ?? 0),
      },
      minutes_per_removed_risk_unit: {
        observed_median: round3(median(observedMinutesPerUnitValues) ?? 0),
        model_median: round3(median(modelMinutesPerUnitValues) ?? 0),
      },
      transport_success_floor: {
        p10: round3(quantile(minTransportValues, 0.1) ?? 0),
        p25: round3(quantile(minTransportValues, 0.25) ?? 0),
      },
    },
    recommended_env: {
      AQ_MIN_PRE_ACTION_ENTROPY_REMOVED: round3(minEntropy ?? 0),
      AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK: round3(minReconPerBlock ?? 0),
      AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT: round3(reconMinutesPerUnit ?? 30),
    },
    warnings,
  };

  return artifact;
}

export function parseCliArgs(argv = process.argv) {
  const reportsRoot = getArg("--reportsRoot", argv) || "apps/evaluator/reports";
  const last = parsePositiveInt(getArg("--last", argv), 30, "--last");
  const minReports = parsePositiveInt(getArg("--minReports", argv), 8, "--minReports");
  const qLower = parseQuantile(getArg("--qLower", argv), 0.25);
  const includeDegraded = hasFlag("--includeDegraded", argv);
  const allowLowSample = hasFlag("--allowLowSample", argv);
  const out = getArg("--out", argv) || path.join(reportsRoot, "kpi-calibration.json");
  const jsonMode = hasFlag("--json", argv);
  const help = hasFlag("--help", argv) || hasFlag("-h", argv);

  return {
    reportsRoot,
    last,
    minReports,
    qLower,
    includeDegraded,
    allowLowSample,
    out,
    jsonMode,
    help,
  };
}

export function formatExportCommand(recommendedEnv) {
  return `AQ_MIN_PRE_ACTION_ENTROPY_REMOVED=${recommendedEnv.AQ_MIN_PRE_ACTION_ENTROPY_REMOVED} AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK=${recommendedEnv.AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK} AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT=${recommendedEnv.AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT}`;
}

export async function runKpiCalibration(cli = parseCliArgs(process.argv)) {
  const selectedReportDirs = listCandidateReports(cli.reportsRoot, cli.last);
  const samples = selectedReportDirs
    .map((dir) => extractKpiSample(dir, cli.includeDegraded))
    .filter((s) => s !== null);

  const artifact = buildCalibrationArtifact({
    reportsRoot: cli.reportsRoot,
    selectedReportDirs,
    samples,
    minReports: cli.minReports,
    qLower: cli.qLower,
    includeDegraded: cli.includeDegraded,
    generatedAt: new Date().toISOString(),
  });

  if (samples.length < cli.minReports && !cli.allowLowSample) {
    throw new Error(
      `not enough KPI-bearing reports (${samples.length}) for calibration (minReports=${cli.minReports}). Use --allowLowSample to write provisional output.`
    );
  }

  fs.mkdirSync(path.dirname(cli.out), { recursive: true });
  fs.writeFileSync(cli.out, JSON.stringify(artifact, null, 2), "utf8");

  return {
    artifact,
    artifactPath: cli.out,
    exportCommand: formatExportCommand(artifact.recommended_env),
  };
}

async function main() {
  const cli = parseCliArgs(process.argv);
  if (cli.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  const result = await runKpiCalibration(cli);
  if (cli.jsonMode) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          artifact_path: result.artifactPath,
          recommended_env: result.artifact.recommended_env,
          sample: result.artifact.sample,
          warnings: result.artifact.warnings,
        },
        null,
        2
      )}\n`
    );
    return;
  }

  console.log("KPI calibration: OK");
  console.log(`- artifact: ${result.artifactPath}`);
  console.log(`- kpi reports: ${result.artifact.sample.kpi_reports_count}`);
  if (result.artifact.warnings.length > 0) {
    console.log(`- warnings: ${result.artifact.warnings.length}`);
    for (const warning of result.artifact.warnings) {
      console.log(`  - ${warning}`);
    }
  }
  console.log(`- recommended env: ${result.exportCommand}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
