#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runRuntimeHandoffProof } from "./proof-runtime-handoff.mjs";

const HELP = `Usage: node scripts/proof-p1-claim-pack.mjs [options]

Options:
  --reportDir <path>          Evaluator report directory (default: apps/evaluator/reports/latest)
  --baseUrl <url>             Adapter URL for runtime handoff proof (default: http://127.0.0.1:8788)
  --minCases <n>              Minimum anchored cases required on baseline and new (default: 1)
  --out <path>                Output proof artifact JSON (default: <reportDir>/p1-claim-proof.json)
  --skipRuntimeE2E            Skip /run-case receipt check and run endpoint-only runtime proof
  --runCaseTimeoutMs <ms>     Timeout for runtime handoff e2e mode (default: 30000)
  --json                      Print machine-readable JSON
  --help, -h                  Show help
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

function asInt(raw, fallback) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseCliArgs(argv = process.argv) {
  const reportDir = getArg("--reportDir", argv) || "apps/evaluator/reports/latest";
  const baseUrl = (getArg("--baseUrl", argv) || "http://127.0.0.1:8788").replace(/\/+$/, "");
  const minCases = asInt(getArg("--minCases", argv), 1);
  const out = getArg("--out", argv) || path.join(reportDir, "p1-claim-proof.json");
  const runCaseTimeoutMs = asInt(getArg("--runCaseTimeoutMs", argv), 30000);
  return {
    help: hasFlag("--help", argv) || hasFlag("-h", argv),
    jsonMode: hasFlag("--json", argv),
    reportDir,
    baseUrl,
    minCases,
    out,
    skipRuntimeE2E: hasFlag("--skipRuntimeE2E", argv),
    runCaseTimeoutMs,
  };
}

function loadCompareReport(reportDir) {
  const comparePath = path.join(reportDir, "compare-report.json");
  if (!fs.existsSync(comparePath)) {
    return { ok: false, error: `compare-report.json not found: ${comparePath}` };
  }
  try {
    const compare = JSON.parse(fs.readFileSync(comparePath, "utf8"));
    return { ok: true, comparePath, compare };
  } catch (err) {
    return {
      ok: false,
      error: `invalid JSON in ${comparePath}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function asRate(raw) {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

function inferRate(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return null;
  return value / total;
}

export function readOtelCoverageProof(reportDir, minCases) {
  const loaded = loadCompareReport(reportDir);
  if (!loaded.ok) {
    return { ok: false, payload: { stage: "otel", error: loaded.error } };
  }

  const coverage = loaded.compare?.summary?.trace_anchor_coverage;
  if (!coverage || typeof coverage !== "object") {
    return {
      ok: false,
      payload: {
        stage: "otel",
        error: `summary.trace_anchor_coverage is missing in ${loaded.comparePath}`,
      },
    };
  }

  const baseline = Number(coverage.cases_with_anchor_baseline ?? 0);
  const newer = Number(coverage.cases_with_anchor_new ?? 0);
  const dataCoverageTotal = Number(loaded.compare?.summary?.data_coverage?.total_cases ?? 0);
  const eqTotal = Number(loaded.compare?.summary?.execution_quality?.total_executed_cases ?? 0);
  const totalCases = dataCoverageTotal > 0 ? dataCoverageTotal : eqTotal;

  const baselineRate = asRate(coverage.baseline_rate) ?? inferRate(baseline, totalCases);
  const newRate = asRate(coverage.new_rate) ?? inferRate(newer, totalCases);

  if (baseline < minCases || newer < minCases) {
    return {
      ok: false,
      payload: {
        stage: "otel",
        error: `insufficient anchored cases (required >= ${minCases} each side)` ,
        compare_report: loaded.comparePath,
        cases_with_anchor_baseline: baseline,
        cases_with_anchor_new: newer,
        baseline_rate: baselineRate,
        new_rate: newRate,
      },
    };
  }

  return {
    ok: true,
    payload: {
      compare_report: loaded.comparePath,
      min_cases_required_each_side: minCases,
      cases_with_anchor_baseline: baseline,
      cases_with_anchor_new: newer,
      baseline_rate: baselineRate,
      new_rate: newRate,
    },
  };
}

function normalizeRuntimeResult(result) {
  if (!result || typeof result !== "object") {
    return { ok: false, payload: { error: "runtime proof returned invalid result" } };
  }
  return {
    ok: result.ok === true,
    payload: result.payload ?? { error: "runtime proof returned empty payload" },
  };
}

export async function runP1ClaimProof(
  {
    reportDir,
    baseUrl,
    minCases,
    out,
    skipRuntimeE2E = false,
    runCaseTimeoutMs = 30000,
  },
  deps = {}
) {
  const runtimeProof = deps.runRuntimeHandoffProofFn ?? runRuntimeHandoffProof;
  const nowIso = deps.nowIso ?? new Date().toISOString();

  const otel = readOtelCoverageProof(reportDir, minCases);
  if (!otel.ok) {
    return { ok: false, payload: otel.payload };
  }

  const incidentIdBase = `p1-proof-${Date.now()}`;
  const endpoint = normalizeRuntimeResult(
    await runtimeProof({
      baseUrl,
      incidentId: `${incidentIdBase}-endpoint`,
      handoffId: `${incidentIdBase}-h-endpoint`,
      fromAgent: "proof",
      toAgent: "runtime",
      mode: "endpoint",
      runCaseTimeoutMs,
    })
  );
  if (!endpoint.ok) {
    return {
      ok: false,
      payload: {
        stage: "runtime_endpoint",
        ...endpoint.payload,
      },
    };
  }

  let e2e = { ok: true, payload: { skipped: true, reason: "--skipRuntimeE2E" } };
  if (!skipRuntimeE2E) {
    e2e = normalizeRuntimeResult(
      await runtimeProof({
        baseUrl,
        incidentId: `${incidentIdBase}-e2e`,
        handoffId: `${incidentIdBase}-h-e2e`,
        fromAgent: "proof",
        toAgent: "runtime",
        mode: "e2e",
        runCaseTimeoutMs,
      })
    );
    if (!e2e.ok) {
      return {
        ok: false,
        payload: {
          stage: "runtime_e2e",
          ...e2e.payload,
        },
      };
    }
  }

  const artifact = {
    ok: true,
    generated_at: nowIso,
    report_dir: reportDir,
    config: {
      base_url: baseUrl,
      min_cases: minCases,
      skip_runtime_e2e: skipRuntimeE2E,
      run_case_timeout_ms: runCaseTimeoutMs,
    },
    checks: {
      otel_anchor_proof: otel.payload,
      runtime_handoff_endpoint: endpoint.payload,
      runtime_handoff_e2e: e2e.payload,
    },
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2), "utf8");

  return {
    ok: true,
    payload: {
      ...artifact,
      artifact_path: out,
    },
  };
}

export function renderCliMessages(result, jsonMode) {
  if (jsonMode) {
    return {
      channel: "stdout",
      lines: [JSON.stringify(result.payload ? { ok: result.ok, ...result.payload } : { ok: result.ok }, null, 2)],
    };
  }

  if (result.ok) {
    return {
      channel: "stdout",
      lines: [
        "P1 claim proof: OK",
        `- report_dir: ${String(result.payload?.report_dir ?? "")}`,
        `- artifact_path: ${String(result.payload?.artifact_path ?? "")}`,
      ],
    };
  }

  return {
    channel: "stderr",
    lines: [
      "P1 claim proof: FAILED",
      ...Object.entries(result.payload ?? {}).map(([k, v]) =>
        `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
      ),
    ],
  };
}

export async function cliMain(argv = process.argv, deps = {}) {
  const cli = parseCliArgs(argv);
  if (cli.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const result = await runP1ClaimProof(cli, deps);
  const rendered = renderCliMessages(result, cli.jsonMode);
  if (rendered.channel === "stdout") {
    for (const line of rendered.lines) console.log(line);
  } else {
    for (const line of rendered.lines) console.error(line);
  }
  return result.ok ? 0 : 1;
}

async function main() {
  const code = await cliMain(process.argv);
  process.exit(code);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(String(err?.stack ?? err));
    process.exit(1);
  });
}
