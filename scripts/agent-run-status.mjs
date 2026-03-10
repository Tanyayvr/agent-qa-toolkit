#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function printHelp() {
  console.log(`Usage:
  node scripts/agent-run-status.mjs [--reportPrefix <prefix>] [--reportDir <dir>] [--json]

Examples:
  node scripts/agent-run-status.mjs
  node scripts/agent-run-status.mjs --reportPrefix goose-ollama-20260308_121554
  npm run campaign:agent:status -- --reportPrefix goose-ollama-20260308_121554
`);
}

function parseArgs(argv) {
  const out = { reportPrefix: "", reportDir: "", json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--json") {
      out.json = true;
      continue;
    }
    if (arg === "--reportPrefix") {
      out.reportPrefix = argv[++i] || "";
      continue;
    }
    if (arg === "--reportDir") {
      out.reportDir = argv[++i] || "";
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function countTimeoutCauses(compare) {
  const counts = {};
  for (const item of compare?.items || []) {
    for (const side of ["baseline", "new"]) {
      const cause = item?.failure_summary?.[side]?.timeout_cause;
      if (typeof cause === "string" && cause.length > 0) {
        const key = `${side}:${cause}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
  }
  return counts;
}

export function summarizeReportDir(reportDir) {
  const stageResult = readJsonIfExists(path.join(reportDir, "stage-result.json"));
  const compare = readJsonIfExists(path.join(reportDir, "compare-report.json"));
  const envelope = readJsonIfExists(path.join(reportDir, "devops-envelope.json"));
  const nextEnvelope = readJsonIfExists(path.join(reportDir, "next-envelope.json"));
  return {
    report_dir: reportDir,
    stage_result: stageResult,
    execution_quality: compare?.summary?.execution_quality || null,
    timeout_causes: compare ? countTimeoutCauses(compare) : {},
    devops_envelope: envelope
      ? {
          runMode: envelope.run_mode ?? envelope.runMode ?? null,
          runtimeClass: envelope.runtime_class ?? envelope.runtimeClass ?? null,
          profileName: envelope.profile_name ?? envelope.profileName ?? null,
          profile: envelope.profile ?? null,
          sampleCount: envelope.sample_count ?? envelope.sampleCount ?? null,
          timeoutProfile: envelope.timeout_profile ?? envelope.timeoutProfile ?? null,
          timeoutMs: envelope.timeout_ms ?? envelope.timeoutMs ?? null,
          timeoutAutoCapMs: envelope.timeout_auto_cap_ms ?? envelope.timeoutAutoCapMs ?? null,
          retries: envelope.retries ?? null,
          concurrency: envelope.concurrency ?? null,
        }
      : null,
    next_envelope: nextEnvelope,
  };
}

function readDefaultReportPrefix() {
  const file = "/tmp/aq_report_prefix";
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8").trim();
}

function resolveReportDirs(args) {
  if (args.reportDir) return [path.resolve(args.reportDir)];

  const prefix = args.reportPrefix || readDefaultReportPrefix();
  if (!prefix) {
    throw new Error("No report prefix provided and /tmp/aq_report_prefix is missing");
  }

  const base = path.join(repoRoot, "apps", "evaluator", "reports");
  const candidates = [
    `${prefix}-calibration`,
    `${prefix}-smoke`,
    `${prefix}`,
    `${prefix}-2`,
    `${prefix}-3`,
  ].map((name) => path.join(base, name));
  return candidates.filter((dir) => fs.existsSync(dir));
}

function formatSummary(entry) {
  const lines = [];
  lines.push(entry.report_dir);
  if (entry.stage_result) {
    lines.push(
      `  stage=${entry.stage_result.stage} status=${entry.stage_result.status} reason=${entry.stage_result.reason} next_action=${entry.stage_result.next_action}`,
    );
  }
  if (entry.execution_quality) {
    lines.push(`  executionStatus=${entry.execution_quality.status ?? "unknown"}`);
    lines.push(
      `  transport baseline=${entry.execution_quality.baseline_transport_success_rate ?? "n/a"} new=${entry.execution_quality.new_transport_success_rate ?? "n/a"}`,
    );
    if (Array.isArray(entry.execution_quality.reasons) && entry.execution_quality.reasons.length > 0) {
      lines.push(`  reasons=${entry.execution_quality.reasons.join(" | ")}`);
    }
  }
  if (entry.devops_envelope) {
    lines.push(
      `  envelope runMode=${entry.devops_envelope.runMode} runtimeClass=${entry.devops_envelope.runtimeClass} profileName=${entry.devops_envelope.profileName} profile=${entry.devops_envelope.profile} sampleCount=${entry.devops_envelope.sampleCount} timeoutProfile=${entry.devops_envelope.timeoutProfile} timeoutMs=${entry.devops_envelope.timeoutMs} cap=${entry.devops_envelope.timeoutAutoCapMs} retries=${entry.devops_envelope.retries} concurrency=${entry.devops_envelope.concurrency}`,
    );
  }
  const timeoutEntries = Object.entries(entry.timeout_causes || {});
  if (timeoutEntries.length > 0) {
    lines.push(`  timeoutCauses=${timeoutEntries.map(([key, count]) => `${key}=${count}`).join(", ")}`);
  }
  if (entry.next_envelope?.purpose === "plan") {
    lines.push(
      `  next recommendedMode=${entry.next_envelope.recommended_mode} estimatedRequestTimeoutMs=${entry.next_envelope.estimated_request_timeout_ms} estimatedStageUpperBoundMinutes=${Math.ceil((entry.next_envelope.estimated_stage_runtime_upper_bound_ms ?? 0) / 60000)} confidence=${entry.next_envelope.confidence}`,
    );
  }
  if (entry.next_envelope?.purpose === "recommendation" && entry.next_envelope?.suggested_envelope) {
    lines.push(
      `  next recommendedMode=${entry.next_envelope.suggested_envelope.mode} timeoutMs=${entry.next_envelope.suggested_envelope.timeout_ms} cap=${entry.next_envelope.suggested_envelope.timeout_auto_cap_ms} estimatedStageUpperBoundMinutes=${Math.ceil((entry.next_envelope.suggested_envelope.estimated_stage_runtime_upper_bound_ms ?? 0) / 60000)} confidence=${entry.next_envelope.suggested_envelope.confidence}`,
    );
    if (Array.isArray(entry.next_envelope.timed_out_case_ids) && entry.next_envelope.timed_out_case_ids.length > 0) {
      lines.push(`  next timedOutCases=${entry.next_envelope.timed_out_case_ids.join(",")}`);
    }
    if (typeof entry.next_envelope.next_action === "string") {
      lines.push(`  next action=${entry.next_envelope.next_action}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const reportDirs = resolveReportDirs(args);
  if (reportDirs.length === 0) throw new Error("No matching report directories found");

  const summary = reportDirs.map((dir) => summarizeReportDir(dir));
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log("Agent run status:");
  for (const entry of summary) console.log(formatSummary(entry));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.message || String(error));
    process.exit(1);
  });
}
