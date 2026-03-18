#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const HELP = `Usage: node scripts/release-gate-ci.mjs [options]

Options:
  --ci                        Use CI defaults
  --runSuffix <id>            Suffix for toolkit report IDs (default: ci_<timestamp>)
  --toolkitBaseUrl <url>      Base URL for test:toolkit (default: http://127.0.0.1:8796)
  --proofPort <port>          Port for proof:p1 self-contained adapter (default: 8798)
  --reportOut <path>          Output report JSON path (default: apps/evaluator/reports/release-gate-ci.json)
  --failFast                  Stop on first failed gate (default: run all and summarize)
  --json                      Print machine-readable JSON summary
  --help, -h                  Show help
`;

function hasFlag(name, argv = process.argv) {
  return argv.includes(name);
}

function getArg(name, argv = process.argv) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  const val = argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function asPositiveInt(raw, fallback) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function nowSuffix() {
  return `ci_${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
}

export function parseCliArgs(argv = process.argv) {
  const ci = hasFlag("--ci", argv);
  return {
    help: hasFlag("--help", argv) || hasFlag("-h", argv),
    jsonMode: hasFlag("--json", argv),
    ci,
    failFast: hasFlag("--failFast", argv),
    runSuffix: getArg("--runSuffix", argv) || nowSuffix(),
    toolkitBaseUrl: getArg("--toolkitBaseUrl", argv) || "http://127.0.0.1:8796",
    proofPort: asPositiveInt(getArg("--proofPort", argv), 8798),
    reportOut: getArg("--reportOut", argv) || "apps/evaluator/reports/release-gate-ci.json",
  };
}

function npmStep(id, description, script, args = []) {
  return { id, description, cmd: "npm", args: ["run", script, ...(args.length > 0 ? ["--", ...args] : [])] };
}

export function buildGateSteps({ runSuffix, toolkitBaseUrl, proofPort }) {
  const proofReportDir = `apps/evaluator/reports/latest_${runSuffix}`;
  return [
    npmStep("quality_gate", "Lint + typecheck + coverage + docs + security + audit", "quality:gate"),
    npmStep(
      "agent_evidence_surface_gate",
      "Agent Evidence surface gate (contracts + deterministic demo bundle)",
      "release:gate:agent-evidence"
    ),
    npmStep(
      "eu_ai_act_surface_gate",
      "EU AI Act surface gate (contracts + deterministic demo bundle)",
      "release:gate:eu-ai-act"
    ),
    npmStep("conformance_python", "Python validator conformance", "conformance:test:python"),
    npmStep("conformance_go", "Go validator conformance", "conformance:test:go"),
    npmStep("conformance_signature", "Strict-signature parity (Node/Python/Go)", "conformance:test:signature"),
    npmStep("policy_gate_e2e", "Policy gate end-to-end", "e2e:policy-gate"),
    npmStep("runtime_policy_e2e", "Runtime policy end-to-end (CI profile)", "e2e:runtime-policy", ["--ci"]),
    npmStep("plugins_release_readiness", "Plugin release readiness", "plugins:release-readiness"),
    npmStep("soak_load_e2e", "Soak/load end-to-end", "e2e:soak-load", ["--ci"]),
    npmStep("toolkit_tests", "Toolkit compatibility suite", "test:toolkit", ["--baseUrl", toolkitBaseUrl, "--runSuffix", runSuffix]),
    npmStep("proof_p1_self_contained", "P1 claim proof (self-contained)", "proof:p1", [
      "--reportDir",
      proofReportDir,
      "--selfContained",
      "--selfContainedPort",
      String(proofPort),
      "--selfContainedPortAttempts",
      "5",
      "--runCaseTimeoutMs",
      "30000",
    ]),
  ];
}

function runCommand(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const proc = spawn(step.cmd, step.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    proc.on("error", (err) => {
      resolve({
        id: step.id,
        description: step.description,
        command: `${step.cmd} ${step.args.join(" ")}`,
        ok: false,
        exit_code: 1,
        duration_ms: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    proc.on("exit", (code) => {
      resolve({
        id: step.id,
        description: step.description,
        command: `${step.cmd} ${step.args.join(" ")}`,
        ok: (code ?? 0) === 0,
        exit_code: code ?? 0,
        duration_ms: Date.now() - startedAt,
      });
    });
  });
}

function ensureParentDir(filePath) {
  mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

export function summarizeResults(results) {
  const failed = results.filter((r) => r.ok !== true).map((r) => r.id);
  return {
    ok: failed.length === 0,
    total: results.length,
    passed: results.length - failed.length,
    failed_count: failed.length,
    failed_steps: failed,
  };
}

export async function runReleaseGate(args, deps = {}) {
  const runStep = deps.runStep ?? runCommand;
  const writeReport = deps.writeReport ?? ((out, payload) => {
    ensureParentDir(out);
    writeFileSync(path.resolve(out), JSON.stringify(payload, null, 2), "utf-8");
  });
  const steps = buildGateSteps(args);
  const results = [];
  for (const step of steps) {
    console.log(`\n=== ${step.id}: ${step.description} ===`);
    const result = await runStep(step);
    results.push(result);
    if (!result.ok && args.failFast) break;
  }

  const summary = summarizeResults(results);
  const payload = {
    generated_at: new Date().toISOString(),
    run_suffix: args.runSuffix,
    toolkit_base_url: args.toolkitBaseUrl,
    proof_port: args.proofPort,
    report_out: args.reportOut,
    summary,
    steps: results,
  };
  writeReport(args.reportOut, payload);
  return payload;
}

export function renderCliMessages(payload, jsonMode) {
  if (jsonMode) {
    return {
      channel: payload.summary?.ok ? "stdout" : "stderr",
      lines: [JSON.stringify(payload, null, 2)],
    };
  }
  const lines = [
    payload.summary?.ok ? "Release gate bundle: PASS" : "Release gate bundle: FAIL",
    `- report: ${payload.report_out}`,
    `- passed: ${payload.summary?.passed}/${payload.summary?.total}`,
  ];
  if (!payload.summary?.ok) {
    lines.push(`- failed_steps: ${(payload.summary?.failed_steps || []).join(", ")}`);
  }
  return {
    channel: payload.summary?.ok ? "stdout" : "stderr",
    lines,
  };
}

export async function cliMain(argv = process.argv) {
  const args = parseCliArgs(argv);
  if (args.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  const payload = await runReleaseGate(args);
  const rendered = renderCliMessages(payload, args.jsonMode);
  if (rendered.channel === "stdout") {
    for (const line of rendered.lines) console.log(line);
  } else {
    for (const line of rendered.lines) console.error(line);
  }
  return payload.summary?.ok ? 0 : 1;
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
