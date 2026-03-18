#!/usr/bin/env node
import path from "node:path";

import {
  analyzeCasesCompleteness,
  buildCasesCoverageArtifact,
  casesCoveragePath,
  loadIntakePair,
  readCasesFile,
  resolveIntakeDir,
  relFrom,
  writeJson,
} from "./lib/evidence-intake.mjs";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-intake-check-cases.mjs (--profile <id> | --dir <path>) --cases <path> [--out <path>] [--json]",
    "",
    "Options:",
    "  --profile <id>  Intake profile under ops/intake/<id>",
    "  --dir <path>    Explicit intake directory",
    "  --cases <path>  Cases file to check against the intake contract",
    "  --out <path>    Optional output path for the persistent cases-coverage artifact",
    "  --json          Print machine-readable output",
    "  --help          Show this help",
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
    out: "",
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
    if (arg === "--out") {
      args.out = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }
  if ((!args.profile && !args.dir) || !args.cases) {
    console.error("Missing required --profile/--dir and --cases");
    usage(2);
  }
  return args;
}

function renderHuman(summary) {
  const lines = [
    summary.ok ? "cases completeness passed" : "cases completeness failed",
    `profile: ${summary.summary.profile_id}`,
    `system: ${summary.summary.system_id}`,
    `cases: ${summary.cases_href}`,
    `coverageArtifact: ${summary.files.artifact_href}`,
    `criticalTaskCoverage: ${summary.summary.covered_critical_tasks}/${summary.summary.critical_task_count}`,
    `variantCoverage: ${summary.summary.covered_required_variants}/${summary.summary.required_variant_count}`,
    `negativeCaseRatio: ${summary.summary.negative_case_ratio}`,
    `semanticCaseRatio: ${summary.summary.semantic_case_ratio}`,
  ];

  if (summary.errors.length > 0) {
    lines.push("errors:");
    for (const issue of summary.errors) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  if (summary.warnings.length > 0) {
    lines.push("warnings:");
    for (const issue of summary.warnings) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
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
  const canonicalOutAbs = casesCoveragePath(intakeDir);
  const extraOutAbs = args.out
    ? path.isAbsolute(args.out)
      ? args.out
      : path.resolve(cwd, args.out)
    : "";
  const intake = loadIntakePair(intakeDir);
  const cases = readCasesFile(casesAbs);
  const completeness = analyzeCasesCompleteness({
    systemScope: intake.systemScope,
    qualityContract: intake.qualityContract,
    cases,
  });

  const summary = buildCasesCoverageArtifact({
    intakeDir,
    paths: intake.paths,
    systemScope: intake.systemScope,
    qualityContract: intake.qualityContract,
    casesAbs,
    outAbs: canonicalOutAbs,
    completeness,
  });
  summary.cases_href = relFrom(cwd, casesAbs);

  writeJson(canonicalOutAbs, summary);
  if (extraOutAbs && extraOutAbs !== canonicalOutAbs) {
    writeJson(extraOutAbs, summary);
  }

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
