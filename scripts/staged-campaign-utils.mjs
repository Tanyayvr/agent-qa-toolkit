#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const STAGE_REASON_VALUES = [
  "transport",
  "timeout_budget",
  "agent_stuck_or_loop",
  "waiting_for_input",
  "policy",
  "semantic",
  "unknown",
];

export function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function pickSubsetCases(cases, maxCases) {
  if (!Array.isArray(cases)) {
    throw new Error("cases payload must be an array");
  }
  const cap = parsePositiveInt(maxCases, 4);
  return cases.slice(0, cap);
}

export function pickSmokeCases(cases, maxCases) {
  return pickSubsetCases(cases, maxCases);
}

export function writeSubset(params) {
  const absCases = path.resolve(process.cwd(), params.casesPath);
  const absOut = path.resolve(process.cwd(), params.outPath);
  const maxCases = parsePositiveInt(params.maxCases, 4);
  const all = JSON.parse(fs.readFileSync(absCases, "utf8"));
  if (!Array.isArray(all)) throw new Error("cases file must be a JSON array");
  const selected = pickSubsetCases(all, maxCases);
  fs.writeFileSync(absOut, JSON.stringify(selected, null, 2));
  return {
    cases_path: absCases,
    out_path: absOut,
    total_cases: all.length,
    selected_cases: selected.length,
    max_cases: maxCases,
  };
}

export function writeSmokeSubset(params) {
  return writeSubset(params);
}

export function mapTimeoutCauseToStageReason(timeoutCause) {
  if (timeoutCause === "timeout_budget_too_small") return "timeout_budget";
  if (timeoutCause === "agent_stuck_or_loop") return "agent_stuck_or_loop";
  if (timeoutCause === "waiting_for_input") return "waiting_for_input";
  if (timeoutCause === "transport_failure") return "transport";
  return "unknown";
}

function collectTimeoutCauses(compare) {
  const causes = [];
  const items = Array.isArray(compare?.items) ? compare.items : [];
  for (const it of items) {
    const baseline = it?.failure_summary?.baseline;
    const newer = it?.failure_summary?.new;
    if (typeof baseline?.timeout_cause === "string") causes.push(baseline.timeout_cause);
    if (typeof newer?.timeout_cause === "string") causes.push(newer.timeout_cause);
  }
  return causes;
}

function dominantTimeoutCause(causes) {
  if (!Array.isArray(causes) || causes.length === 0) return undefined;
  const counts = new Map();
  for (const c of causes) counts.set(c, (counts.get(c) ?? 0) + 1);
  const tieBreak = {
    agent_stuck_or_loop: 5,
    waiting_for_input: 4,
    timeout_budget_too_small: 3,
    transport_failure: 2,
    unknown_timeout: 1,
  };
  return [...counts.entries()]
    .sort((a, b) => {
      const byCount = (b[1] ?? 0) - (a[1] ?? 0);
      if (byCount !== 0) return byCount;
      return (tieBreak[b[0]] ?? 0) - (tieBreak[a[0]] ?? 0);
    })[0]?.[0];
}

function hasPolicySignal(compare) {
  const items = Array.isArray(compare?.items) ? compare.items : [];
  for (const it of items) {
    const pe = it?.policy_evaluation;
    const pBase = pe?.baseline;
    const pNew = pe?.new;
    if (pBase && (pBase.planning_gate_pass === false || pBase.repl_policy_pass === false)) return true;
    if (pNew && (pNew.planning_gate_pass === false || pNew.repl_policy_pass === false)) return true;

    const tags = Array.isArray(it?.risk_tags) ? it.risk_tags.map((x) => String(x)) : [];
    if (tags.some((t) => t.includes("policy") || t.includes("planning_gate") || t.includes("repl"))) return true;

    const newSignals = Array.isArray(it?.security?.new?.signals) ? it.security.new.signals : [];
    if (newSignals.some((s) => String(s?.kind ?? "").includes("policy"))) return true;
  }
  return false;
}

function hasSemanticSignal(compare) {
  const eqReasons = Array.isArray(compare?.summary?.execution_quality?.reasons)
    ? compare.summary.execution_quality.reasons.map((x) => String(x).toLowerCase())
    : [];
  if (eqReasons.some((r) => r.includes("weak expected rate") || r.includes("semantic"))) return true;

  const items = Array.isArray(compare?.items) ? compare.items : [];
  for (const it of items) {
    const assertions = Array.isArray(it?.assertions_new) ? it.assertions_new : [];
    if (assertions.some((a) => a?.name?.startsWith?.("semantic_") && a?.pass === false)) return true;
  }
  return false;
}

function hasTransportSignal(compare) {
  const eq = compare?.summary?.execution_quality ?? {};
  const eqReasons = Array.isArray(eq?.reasons) ? eq.reasons.map((x) => String(x).toLowerCase()) : [];
  if (eqReasons.some((r) => r.includes("transport success"))) return true;
  if (Number(eq?.baseline_runner_failures ?? 0) > 0) return true;
  if (Number(eq?.new_runner_failures ?? 0) > 0) return true;
  return false;
}

export function stageNextAction(reason) {
  switch (reason) {
    case "transport":
      return "check_adapter_health_and_network_then_retry_smoke";
    case "timeout_budget":
      return "increase_timeout_or_run_calibration_then_retry";
    case "agent_stuck_or_loop":
      return "inspect_tool_trace_and_loop_controls_then_retry";
    case "waiting_for_input":
      return "switch_agent_to_noninteractive_mode_or_provide_required_input";
    case "policy":
      return "review_policy_violation_evidence_then_adjust_policy_or_plan";
    case "semantic":
      return "fix_case_expectations_or_prompt_quality_before_full_run";
    default:
      return "inspect_compare_report_and_runner_failure_assets";
  }
}

export function classifyStageFailure(compare, defaultReason = "unknown") {
  const timeoutCauses = collectTimeoutCauses(compare);
  const dominantCause = dominantTimeoutCause(timeoutCauses);
  if (dominantCause) {
    const reason = mapTimeoutCauseToStageReason(dominantCause);
    return {
      reason,
      next_action: stageNextAction(reason),
      source: "timeout_cause",
      timeout_cause: dominantCause,
    };
  }

  if (hasPolicySignal(compare)) {
    return { reason: "policy", next_action: stageNextAction("policy"), source: "policy_signal" };
  }
  if (hasSemanticSignal(compare)) {
    return { reason: "semantic", next_action: stageNextAction("semantic"), source: "semantic_signal" };
  }
  if (hasTransportSignal(compare)) {
    return { reason: "transport", next_action: stageNextAction("transport"), source: "execution_quality" };
  }

  const safeDefault = STAGE_REASON_VALUES.includes(defaultReason) ? defaultReason : "unknown";
  return { reason: safeDefault, next_action: stageNextAction(safeDefault), source: "fallback" };
}

export function classifyStageFailureFromPath(comparePath, defaultReason = "unknown") {
  const abs = path.resolve(process.cwd(), comparePath);
  if (!fs.existsSync(abs)) {
    const safeDefault = STAGE_REASON_VALUES.includes(defaultReason) ? defaultReason : "unknown";
    return {
      reason: safeDefault,
      next_action: stageNextAction(safeDefault),
      source: "missing_compare_report",
      compare_report: abs,
    };
  }
  const compare = JSON.parse(fs.readFileSync(abs, "utf8"));
  return {
    ...classifyStageFailure(compare, defaultReason),
    compare_report: abs,
  };
}

export function parseCliArgs(argv) {
  const cmd = String(argv[2] ?? "");
  const out = { cmd, cases: "", out: "", maxCases: 4, compare: "", defaultReason: "unknown" };
  for (let i = 3; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cases") out.cases = String(argv[++i] ?? "");
    else if (a === "--out") out.out = String(argv[++i] ?? "");
    else if (a === "--maxCases") out.maxCases = parsePositiveInt(argv[++i], 4);
    else if (a === "--compare") out.compare = String(argv[++i] ?? "");
    else if (a === "--defaultReason") out.defaultReason = String(argv[++i] ?? "unknown");
    else if (a === "--help" || a === "-h") out.cmd = "help";
    else throw new Error(`Unknown option: ${a}`);
  }
  return out;
}

function renderHelp() {
  return [
    "Usage:",
    "  node scripts/staged-campaign-utils.mjs subset --cases <path> --out <path> [--maxCases <n>]",
    "  node scripts/staged-campaign-utils.mjs smoke-subset --cases <path> --out <path> [--maxCases <n>]",
    "  node scripts/staged-campaign-utils.mjs classify --compare <compare-report.json> [--defaultReason unknown]",
  ].join("\n");
}

function main(argv) {
  const cli = parseCliArgs(argv);
  if (cli.cmd === "help" || !cli.cmd) {
    console.log(renderHelp());
    return 0;
  }
  if (cli.cmd === "subset" || cli.cmd === "smoke-subset") {
    if (!cli.cases || !cli.out) throw new Error(`${cli.cmd} requires --cases and --out`);
    const result = writeSubset({ casesPath: cli.cases, outPath: cli.out, maxCases: cli.maxCases });
    console.log(JSON.stringify(result));
    return 0;
  }
  if (cli.cmd === "classify") {
    if (!cli.compare) throw new Error("classify requires --compare");
    const result = classifyStageFailureFromPath(cli.compare, cli.defaultReason);
    console.log(JSON.stringify(result));
    return 0;
  }
  throw new Error(`Unknown command: ${cli.cmd}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv);
  } catch (err) {
    console.error(`staged-campaign-utils: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}
