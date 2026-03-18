#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";

import {
  loadIntakePair,
  relFrom,
  resolveIntakeDir,
  scaffoldCasesFromIntake,
  writeJson,
} from "./lib/evidence-intake.mjs";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-intake-scaffold-cases.mjs (--profile <id> | --dir <path>) [options]",
    "",
    "Options:",
    "  --profile <id>  Intake profile under ops/intake/<id>",
    "  --dir <path>    Explicit intake directory",
    "  --out <path>    Output cases.json path (default: cases/<profile>.intake-scaffold.json)",
    "  --force         Overwrite existing output file",
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
    out: "",
    force: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--force") {
      args.force = true;
      continue;
    }
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
    if (arg === "--out") {
      args.out = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }
  if (!args.profile && !args.dir) {
    console.error("Missing required --profile or --dir");
    usage(2);
  }
  return args;
}

function renderHuman(summary) {
  return [
    "intake scaffold complete",
    `profile: ${summary.profile_id}`,
    `cases: ${summary.cases_href}`,
    `generatedCases: ${summary.generated_case_count}`,
    "note: scaffolded cases are drafts and require human review before they should be treated as quality-grade evidence.",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const intakeDir = resolveIntakeDir({
    cwd,
    profile: args.profile || null,
    explicitDir: args.dir || null,
  });
  const intake = loadIntakePair(intakeDir);
  const profileId = intake.systemScope.profile_id;
  const outAbs = args.out
    ? (path.isAbsolute(args.out) ? args.out : path.resolve(cwd, args.out))
    : path.resolve(cwd, "cases", `${profileId}.intake-scaffold.json`);

  if (existsSync(outAbs) && !args.force) {
    throw new Error(`Refusing to overwrite existing output. Re-run with --force.\n${outAbs}`);
  }

  const cases = scaffoldCasesFromIntake(intake.systemScope, intake.qualityContract);
  writeJson(outAbs, cases);

  const summary = {
    ok: true,
    profile_id: profileId,
    intake_dir: intakeDir,
    cases_href: relFrom(cwd, outAbs),
    generated_case_count: cases.length,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  console.log(renderHuman(summary));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
