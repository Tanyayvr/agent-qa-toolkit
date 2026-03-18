#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  analyzeCasesCompleteness,
  loadIntakePair,
  readCasesFile,
  readJson,
  relFrom,
  resolveIntakeDir,
  runFingerprintPath,
  writeJson,
} from "./lib/evidence-intake.mjs";

const HARD_MATCH_FIELDS = [
  ["runner.timeout_ms", "Runner timeout budget must match between baseline and new"],
  ["runner.timeout_profile", "Runner timeout profile must match between baseline and new"],
  ["runner.retries", "Retry count must match between baseline and new"],
  ["runner.backoff_base_ms", "Retry backoff base must match between baseline and new"],
  ["runner.concurrency", "Concurrency must match between baseline and new"],
  ["runner.inactivity_timeout_ms", "Inactivity timeout must match between baseline and new"],
  ["runner.preflight_mode", "Preflight mode must match between baseline and new"],
  ["runner.preflight_timeout_ms", "Preflight timeout must match between baseline and new"],
  ["runner.fail_fast_transport_streak", "Fail-fast transport threshold must match between baseline and new"],
  ["runner.body_snippet_bytes", "Body snippet size must match between baseline and new"],
  ["runner.max_body_bytes", "Max body bytes must match between baseline and new"],
  ["runner.save_full_body_on_error", "Full-body error retention must match between baseline and new"],
  ["runner.redaction_preset", "Redaction preset must match between baseline and new"],
  ["runner.keep_raw", "keep_raw setting must match between baseline and new"],
  ["runner.runs", "runs-per-case must match between baseline and new"],
  ["redaction_applied", "redaction_applied must match between baseline and new"],
  ["redaction_keep_raw", "redaction_keep_raw must match between baseline and new"],
];

const ENVIRONMENT_CLUE_FIELDS = [
  { path: "base_url", label: "Base URL", category: "environment", warn_on_difference: true },
  { path: "agent_id", label: "Agent ID", category: "identity", warn_on_difference: true },
  { path: "incident_id", label: "Incident ID", category: "identity", warn_on_difference: false },
  { path: "run_id", label: "Run ID", category: "identity", warn_on_difference: false },
  { path: "cases_path", label: "Cases path", category: "inputs", warn_on_difference: true },
  { path: "git_commit", label: "Git commit", category: "source", warn_on_difference: true },
  { path: "git_branch", label: "Git branch", category: "source", warn_on_difference: true },
  { path: "git_dirty", label: "Git dirty flag", category: "source", warn_on_difference: true },
  { path: "runner.heartbeat_interval_ms", label: "Heartbeat interval", category: "runner", warn_on_difference: false },
  { path: "runner.retention_days", label: "Retention days", category: "runner", warn_on_difference: false },
  {
    path: "runner.timeout_auto.final_timeout_ms",
    label: "Auto timeout final budget",
    category: "runner",
    warn_on_difference: false,
  },
  {
    path: "preflight.runtime.timeout_ms",
    label: "Adapter runtime timeout",
    category: "adapter_runtime",
    warn_on_difference: true,
  },
  {
    path: "preflight.runtime.server_request_timeout_ms",
    label: "Adapter server request timeout",
    category: "adapter_runtime",
    warn_on_difference: true,
  },
  {
    path: "preflight.auth_enabled",
    label: "Adapter auth enabled",
    category: "adapter_runtime",
    warn_on_difference: false,
  },
];

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-intake-check-runs.mjs (--profile <id> | --dir <path>) --cases <path> --baselineDir <path> --newDir <path> [--json]",
    "",
    "Options:",
    "  --profile <id>        Intake profile under ops/intake/<id>",
    "  --dir <path>          Explicit intake directory",
    "  --cases <path>        Reviewed cases file used for packaging",
    "  --baselineDir <path>  Baseline runner directory",
    "  --newDir <path>       New runner directory",
    "  --json                Print machine-readable output",
    "  --help                Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    profile: "",
    dir: "",
    cases: "",
    baselineDir: "",
    newDir: "",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--profile") {
      args.profile = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--dir") {
      args.dir = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--cases") {
      args.cases = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--baselineDir") {
      args.baselineDir = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--newDir") {
      args.newDir = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  if ((!args.profile && !args.dir) || !args.cases || !args.baselineDir || !args.newDir) {
    console.error("Missing required --profile/--dir, --cases, --baselineDir, or --newDir");
    usage(2);
  }
  return args;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function pushIssue(target, severity, field, message, details) {
  target.push({
    severity,
    field,
    message,
    ...(details ? { details } : {}),
  });
}

function getPathValue(root, dottedPath) {
  return dottedPath.split(".").reduce((acc, segment) => {
    const current = asRecord(acc);
    return current ? current[segment] : undefined;
  }, root);
}

function normalizeForHash(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeForHash(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeForHash(item)])
    );
  }
  return value ?? null;
}

function hashNormalized(value) {
  return createHash("sha256").update(JSON.stringify(normalizeForHash(value))).digest("hex");
}

function hashStringList(values) {
  return createHash("sha256").update(values.join("\n")).digest("hex");
}

function buildRunnerEnvelope(runJson) {
  return {
    runner: asRecord(runJson.runner) || {},
    redaction_applied: runJson.redaction_applied ?? null,
    redaction_preset: runJson.redaction_preset ?? null,
    redaction_keep_raw: runJson.redaction_keep_raw ?? null,
    versions: Array.isArray(runJson.versions) ? [...runJson.versions] : [],
    preflight: {
      mode: asRecord(runJson.preflight)?.mode ?? null,
      status: asRecord(runJson.preflight)?.status ?? null,
      health_ok: asRecord(runJson.preflight)?.health_ok ?? null,
      canary_ok: asRecord(runJson.preflight)?.canary_ok ?? null,
    },
  };
}

function environmentClueStatus(left, right) {
  if (left === undefined && right === undefined) return "not_recorded";
  if (left === undefined || right === undefined) return "missing_on_one_side";
  return JSON.stringify(normalizeForHash(left)) === JSON.stringify(normalizeForHash(right)) ? "same" : "different";
}

function buildEnvironmentClues(baselineRun, newRun) {
  return ENVIRONMENT_CLUE_FIELDS.map((field) => {
    const baseline = getPathValue(baselineRun, field.path);
    const next = getPathValue(newRun, field.path);
    return {
      field: field.path,
      label: field.label,
      category: field.category,
      status: environmentClueStatus(baseline, next),
      baseline: baseline ?? null,
      new: next ?? null,
      warn_on_difference: field.warn_on_difference,
    };
  });
}

function pushEnvironmentWarnings(environmentClues, warnings) {
  for (const clue of environmentClues) {
    if (clue.status === "different" && clue.warn_on_difference) {
      pushIssue(warnings, "warning", clue.field, `${clue.label} differs between baseline and new`, {
        baseline: clue.baseline,
        new: clue.new,
      });
    } else if (clue.status === "missing_on_one_side" && clue.warn_on_difference) {
      pushIssue(
        warnings,
        "warning",
        clue.field,
        `${clue.label} is only recorded on one side of the run pair`,
        {
          baseline: clue.baseline,
          new: clue.new,
        }
      );
    }
  }
}

function parseIdList(value, field, errors) {
  if (!Array.isArray(value)) {
    pushIssue(errors, "error", field, `${field} must be an array of case ids`);
    return [];
  }
  const ids = [];
  const seen = new Set();
  for (const raw of value) {
    const id = String(raw ?? "").trim();
    if (!id) {
      pushIssue(errors, "error", field, `${field} contains an empty case id`);
      continue;
    }
    if (seen.has(id)) {
      pushIssue(errors, "error", field, `${field} contains duplicate case ids`, { duplicate_id: id });
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function arraysEqualExact(left, right) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function setsEqual(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function ensureRunMetaShape(runJson, label, errors, warnings) {
  if (!asRecord(runJson)) {
    pushIssue(errors, "error", `${label}.run_json`, "run.json must be an object");
    return;
  }
  if (!asRecord(runJson.runner)) {
    pushIssue(errors, "error", `${label}.run_json.runner`, "run.json is missing runner metadata");
  }
  if (!asRecord(runJson.preflight)) {
    pushIssue(errors, "error", `${label}.run_json.preflight`, "run.json is missing preflight metadata");
  }
  if (!Array.isArray(runJson.versions) || !runJson.versions.includes("baseline") || !runJson.versions.includes("new")) {
    pushIssue(errors, "error", `${label}.run_json.versions`, "run.json must declare versions=['baseline','new']");
  }
  if (runJson.interrupted === true) {
    pushIssue(errors, "error", `${label}.run_json.interrupted`, "Run was interrupted and is not safe to compare");
  }
  if (asRecord(runJson.fail_fast)?.triggered === true) {
    pushIssue(errors, "error", `${label}.run_json.fail_fast`, "Run triggered fail-fast and is not safe to compare");
  }
  if (asRecord(runJson.preflight)?.status === "failed") {
    pushIssue(errors, "error", `${label}.run_json.preflight.status`, "Preflight failed for this run");
  }
  if (typeof runJson.cases_path !== "string" || runJson.cases_path.trim().length === 0) {
    pushIssue(warnings, "warning", `${label}.run_json.cases_path`, "run.json does not record a usable cases_path");
  }
}

function caseArtifactFilename(caseId, runsPerCase, index) {
  return runsPerCase > 1 ? `${caseId}.run${index}.json` : `${caseId}.json`;
}

function validateRunArtifacts({ runDir, runJson, expectedVersion, selectedCaseIds, errors, warnings }) {
  const runsPerCase = Number(asRecord(runJson.runner)?.runs ?? 1);
  const expectedFiles = new Set();

  for (const caseId of selectedCaseIds) {
    for (let index = 1; index <= runsPerCase; index += 1) {
      const filename = caseArtifactFilename(caseId, runsPerCase, index);
      expectedFiles.add(filename);
      const abs = path.join(runDir, filename);
      if (!existsSync(abs)) {
        pushIssue(errors, "error", `${expectedVersion}.artifacts`, "Missing case artifact in run directory", {
          case_id: caseId,
          file: filename,
        });
        continue;
      }
      let artifact;
      try {
        artifact = readJson(abs);
      } catch (error) {
        pushIssue(errors, "error", `${expectedVersion}.artifacts`, "Case artifact is not valid JSON", {
          file: filename,
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (artifact.case_id !== caseId) {
        pushIssue(errors, "error", `${expectedVersion}.artifacts.case_id`, "Case artifact case_id does not match filename", {
          file: filename,
          expected: caseId,
          actual: artifact.case_id ?? null,
        });
      }
      if (artifact.version !== expectedVersion) {
        pushIssue(errors, "error", `${expectedVersion}.artifacts.version`, "Case artifact version does not match directory", {
          file: filename,
          expected: expectedVersion,
          actual: artifact.version ?? null,
        });
      }
    }
  }

  if (runsPerCase > 1 && !existsSync(path.join(runDir, "flakiness.json"))) {
    pushIssue(errors, "error", `${expectedVersion}.flakiness`, "runs>1 requires flakiness.json in the run directory");
  }

  const extras = readdirSync(runDir)
    .filter((entry) => entry.endsWith(".json"))
    .filter((entry) => !["run.json", "flakiness.json", "evaluation.json"].includes(entry))
    .filter((entry) => !expectedFiles.has(entry));
  if (extras.length > 0) {
    pushIssue(
      warnings,
      "warning",
      `${expectedVersion}.artifacts.extra`,
      "Run directory contains extra JSON artifacts outside the selected case set",
      { files: extras.slice(0, 20) }
    );
  }

  return {
    runs_per_case: runsPerCase,
    expected_case_artifact_count: selectedCaseIds.length * Math.max(1, runsPerCase),
  };
}

function renderHuman(summary) {
  const lines = [
    summary.ok ? "run comparability passed" : "run comparability failed",
    `profile: ${summary.summary.profile_id}`,
    `system: ${summary.summary.system_id}`,
    `cases: ${summary.cases_href}`,
    `baseline: ${summary.baseline_dir_href}`,
    `new: ${summary.new_dir_href}`,
    `selectedCases: ${summary.summary.selected_case_count}`,
    `runnerMismatches: ${summary.summary.runner_mismatch_count}`,
    `environmentDifferences: ${summary.summary.environment_difference_count}`,
    `missingSignals: ${summary.summary.environment_missing_signal_count}`,
    `missingArtifacts: ${summary.summary.missing_artifact_count}`,
    `artifact: ${summary.files.artifact_href}`,
  ];
  if (summary.errors.length > 0) {
    lines.push("errors:");
    for (const issue of summary.errors) lines.push(`- ${issue.field}: ${issue.message}`);
  }
  if (summary.warnings.length > 0) {
    lines.push("warnings:");
    for (const issue of summary.warnings) lines.push(`- ${issue.field}: ${issue.message}`);
  }
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const intakeDir = resolveIntakeDir({
    cwd,
    profile: args.profile || null,
    explicitDir: args.dir || null,
  });
  const casesAbs = path.isAbsolute(args.cases) ? args.cases : path.resolve(cwd, args.cases);
  const baselineDirAbs = path.isAbsolute(args.baselineDir) ? args.baselineDir : path.resolve(cwd, args.baselineDir);
  const newDirAbs = path.isAbsolute(args.newDir) ? args.newDir : path.resolve(cwd, args.newDir);

  const intake = loadIntakePair(intakeDir);
  const cases = readCasesFile(casesAbs);
  const completeness = analyzeCasesCompleteness({
    systemScope: intake.systemScope,
    qualityContract: intake.qualityContract,
    cases,
  });
  const artifactAbs = runFingerprintPath(intakeDir);

  const errors = [];
  const warnings = [...completeness.warnings];

  if (completeness.errors.length > 0) {
    pushIssue(
      errors,
      "error",
      "cases",
      "Cases must pass intake completeness checks before baseline/new comparability can be verified",
      { completeness_errors: completeness.errors.slice(0, 20) }
    );
  }

  if (!existsSync(path.join(baselineDirAbs, "run.json"))) {
    pushIssue(errors, "error", "baseline.run_json", "Missing baseline run.json", { dir: baselineDirAbs });
  }
  if (!existsSync(path.join(newDirAbs, "run.json"))) {
    pushIssue(errors, "error", "new.run_json", "Missing new run.json", { dir: newDirAbs });
  }

  const casesIds = cases.map((item) => item.id);
  let baselineRun = {};
  let newRun = {};
  if (errors.length === 0) {
    try {
      baselineRun = readJson(path.join(baselineDirAbs, "run.json"));
    } catch (error) {
      pushIssue(errors, "error", "baseline.run_json", "Failed to parse baseline run.json", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      newRun = readJson(path.join(newDirAbs, "run.json"));
    } catch (error) {
      pushIssue(errors, "error", "new.run_json", "Failed to parse new run.json", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    ensureRunMetaShape(baselineRun, "baseline", errors, warnings);
    ensureRunMetaShape(newRun, "new", errors, warnings);
  }

  const baselineSelectedCaseIds = parseIdList(baselineRun.selected_case_ids, "baseline.selected_case_ids", errors);
  const newSelectedCaseIds = parseIdList(newRun.selected_case_ids, "new.selected_case_ids", errors);

  if (baselineSelectedCaseIds.length > 0 && newSelectedCaseIds.length > 0) {
    if (!setsEqual(baselineSelectedCaseIds, newSelectedCaseIds)) {
      pushIssue(errors, "error", "selected_case_ids", "Baseline and new selected_case_ids do not match", {
        baseline_only: baselineSelectedCaseIds.filter((item) => !newSelectedCaseIds.includes(item)),
        new_only: newSelectedCaseIds.filter((item) => !baselineSelectedCaseIds.includes(item)),
      });
    } else if (!arraysEqualExact(baselineSelectedCaseIds, newSelectedCaseIds)) {
      pushIssue(warnings, "warning", "selected_case_ids", "Baseline and new selected_case_ids contain the same set but a different order");
    }

    if (!setsEqual(baselineSelectedCaseIds, casesIds)) {
      pushIssue(errors, "error", "cases", "Provided cases file does not match the selected_case_ids in the run directories", {
        missing_from_runs: casesIds.filter((item) => !baselineSelectedCaseIds.includes(item)),
        extra_in_runs: baselineSelectedCaseIds.filter((item) => !casesIds.includes(item)),
      });
    } else if (!arraysEqualExact(baselineSelectedCaseIds, casesIds)) {
      pushIssue(warnings, "warning", "cases", "Run dirs and cases file use the same case set but a different order");
    }
  }

  let runnerMismatchCount = 0;
  for (const [field, message] of HARD_MATCH_FIELDS) {
    const baselineValue = getPathValue(baselineRun, field);
    const newValue = getPathValue(newRun, field);
    if (baselineValue !== undefined && newValue !== undefined && JSON.stringify(baselineValue) !== JSON.stringify(newValue)) {
      runnerMismatchCount += 1;
      pushIssue(errors, "error", field, message, { baseline: baselineValue, new: newValue });
    }
  }

  if (baselineRun.preflight?.status && newRun.preflight?.status && baselineRun.preflight.status !== newRun.preflight.status) {
    runnerMismatchCount += 1;
    pushIssue(errors, "error", "preflight.status", "Baseline and new preflight.status differ", {
      baseline: baselineRun.preflight.status,
      new: newRun.preflight.status,
    });
  }

  if (baselineRun.agent_id && newRun.agent_id && baselineRun.agent_id !== newRun.agent_id) {
    runnerMismatchCount += 1;
    pushIssue(errors, "error", "agent_id", "Baseline and new runs refer to different agent_id values", {
      baseline: baselineRun.agent_id,
      new: newRun.agent_id,
    });
  }

  if (baselineRun.run_id && newRun.run_id && baselineRun.run_id !== newRun.run_id) {
    pushIssue(warnings, "warning", "run_id", "Baseline and new runs use different run_id values");
  }

  if (baselineSelectedCaseIds.length > 0 && typeof baselineRun.completed_cases === "number" && baselineRun.completed_cases !== baselineSelectedCaseIds.length) {
    pushIssue(errors, "error", "baseline.completed_cases", "baseline completed_cases does not match the selected case count", {
      expected: baselineSelectedCaseIds.length,
      actual: baselineRun.completed_cases,
    });
  }
  if (newSelectedCaseIds.length > 0 && typeof newRun.completed_cases === "number" && newRun.completed_cases !== newSelectedCaseIds.length) {
    pushIssue(errors, "error", "new.completed_cases", "new completed_cases does not match the selected case count", {
      expected: newSelectedCaseIds.length,
      actual: newRun.completed_cases,
    });
  }

  const baselineArtifacts = validateRunArtifacts({
    runDir: baselineDirAbs,
    runJson: baselineRun,
    expectedVersion: "baseline",
    selectedCaseIds: baselineSelectedCaseIds,
    errors,
    warnings,
  });
  const newArtifacts = validateRunArtifacts({
    runDir: newDirAbs,
    runJson: newRun,
    expectedVersion: "new",
    selectedCaseIds: newSelectedCaseIds,
    errors,
    warnings,
  });

  const environmentClues = buildEnvironmentClues(baselineRun, newRun);
  pushEnvironmentWarnings(environmentClues, warnings);

  const baselineRunnerEnvelope = buildRunnerEnvelope(baselineRun);
  const newRunnerEnvelope = buildRunnerEnvelope(newRun);
  const baselineSelectedCasesSorted = [...baselineSelectedCaseIds].sort((left, right) => left.localeCompare(right));
  const newSelectedCasesSorted = [...newSelectedCaseIds].sort((left, right) => left.localeCompare(right));
  const baselineRunFingerprint = {
    runner_envelope: baselineRunnerEnvelope,
    selected_case_ids: baselineSelectedCaseIds,
    environment_clues: Object.fromEntries(environmentClues.map((clue) => [clue.field, clue.baseline])),
  };
  const newRunFingerprint = {
    runner_envelope: newRunnerEnvelope,
    selected_case_ids: newSelectedCaseIds,
    environment_clues: Object.fromEntries(environmentClues.map((clue) => [clue.field, clue.new])),
  };
  const environmentDifferenceCount = environmentClues.filter((clue) => clue.status === "different").length;
  const environmentMissingSignalCount = environmentClues.filter(
    (clue) => clue.status === "not_recorded" || clue.status === "missing_on_one_side"
  ).length;

  const summary = {
    ok: errors.length === 0,
    intake_dir: intakeDir,
    cases_href: relFrom(cwd, casesAbs),
    baseline_dir_href: relFrom(cwd, baselineDirAbs),
    new_dir_href: relFrom(cwd, newDirAbs),
    files: {
      system_scope_href: relFrom(intakeDir, intake.paths.system_scope),
      quality_contract_href: relFrom(intakeDir, intake.paths.quality_contract),
      artifact_href: relFrom(intakeDir, artifactAbs),
    },
    summary: {
      profile_id: intake.systemScope.profile_id,
      system_id: intake.systemScope.system_id,
      selected_case_count: casesIds.length,
      baseline_selected_case_count: baselineSelectedCaseIds.length,
      new_selected_case_count: newSelectedCaseIds.length,
      baseline_completed_cases: typeof baselineRun.completed_cases === "number" ? baselineRun.completed_cases : null,
      new_completed_cases: typeof newRun.completed_cases === "number" ? newRun.completed_cases : null,
      baseline_preflight_status: baselineRun.preflight?.status ?? null,
      new_preflight_status: newRun.preflight?.status ?? null,
      baseline_interrupted: baselineRun.interrupted === true,
      new_interrupted: newRun.interrupted === true,
      baseline_fail_fast_triggered: asRecord(baselineRun.fail_fast)?.triggered === true,
      new_fail_fast_triggered: asRecord(newRun.fail_fast)?.triggered === true,
      runs_per_case: Math.max(
        Number(asRecord(baselineRun.runner)?.runs ?? 0),
        Number(asRecord(newRun.runner)?.runs ?? 0),
      ),
      runner_mismatch_count: runnerMismatchCount,
      environment_difference_count: environmentDifferenceCount,
      environment_missing_signal_count: environmentMissingSignalCount,
      missing_artifact_count: errors.filter((issue) => issue.field === "baseline.artifacts" || issue.field === "new.artifacts").length,
      baseline_expected_case_artifact_count: baselineArtifacts.expected_case_artifact_count,
      new_expected_case_artifact_count: newArtifacts.expected_case_artifact_count,
      baseline_run_fingerprint_sha256: hashNormalized(baselineRunFingerprint),
      new_run_fingerprint_sha256: hashNormalized(newRunFingerprint),
      baseline_runner_envelope_sha256: hashNormalized(baselineRunnerEnvelope),
      new_runner_envelope_sha256: hashNormalized(newRunnerEnvelope),
      baseline_selected_case_order_sha256: hashStringList(baselineSelectedCaseIds),
      new_selected_case_order_sha256: hashStringList(newSelectedCaseIds),
      baseline_selected_case_set_sha256: hashStringList(baselineSelectedCasesSorted),
      new_selected_case_set_sha256: hashStringList(newSelectedCasesSorted),
    },
    fingerprints: {
      runner_envelope: {
        equal: hashNormalized(baselineRunnerEnvelope) === hashNormalized(newRunnerEnvelope),
        baseline_sha256: hashNormalized(baselineRunnerEnvelope),
        new_sha256: hashNormalized(newRunnerEnvelope),
        baseline: baselineRunnerEnvelope,
        new: newRunnerEnvelope,
      },
      selected_cases: {
        equal_set: setsEqual(baselineSelectedCaseIds, newSelectedCaseIds),
        equal_order: arraysEqualExact(baselineSelectedCaseIds, newSelectedCaseIds),
        baseline_order_sha256: hashStringList(baselineSelectedCaseIds),
        new_order_sha256: hashStringList(newSelectedCaseIds),
        baseline_set_sha256: hashStringList(baselineSelectedCasesSorted),
        new_set_sha256: hashStringList(newSelectedCasesSorted),
        baseline_selected_case_ids: baselineSelectedCaseIds,
        new_selected_case_ids: newSelectedCaseIds,
      },
      environment_clues: environmentClues,
      signal_availability: {
        git_context_recorded: environmentClues.some((clue) => clue.field.startsWith("git_") && clue.status !== "not_recorded"),
        adapter_runtime_recorded: environmentClues.some(
          (clue) => clue.category === "adapter_runtime" && clue.status !== "not_recorded"
        ),
        cases_path_recorded: environmentClues.some((clue) => clue.field === "cases_path" && clue.status !== "not_recorded"),
        run_identity_recorded: environmentClues.some(
          (clue) => ["run_id", "incident_id", "agent_id"].includes(clue.field) && clue.status !== "not_recorded"
        ),
      },
    },
    errors,
    warnings,
  };

  writeJson(artifactAbs, {
    schema_version: 1,
    artifact_type: "run_comparability_fingerprint",
    generated_at: Date.now(),
    ...summary,
  });

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(renderHuman(summary));
  }

  process.exit(summary.ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
