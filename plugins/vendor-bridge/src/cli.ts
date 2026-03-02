import { readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { CliUsageError, makeArgvHelpers, makeCliUsageGuards } from "cli-utils";
import {
  compareBridgeRuns,
  parseDeepEvalRun,
  parseGiskardRun,
  parsePromptfooRun,
  type BridgeRun,
  type BridgeVendor,
} from "./index";

const HELP = `Usage: agent-qa bridge <command> [options]

Commands:
  convert               Convert a vendor result JSON to canonical bridge-run JSON
  diff                  Compare two bridge-run JSON files (baseline vs candidate)

convert options:
  --vendor <name>       promptfoo | deepeval | giskard
  --in <path>           Input vendor JSON file
  --out <path>          Output bridge-run JSON file
  --runId <id>          Optional explicit run_id
  --createdAtMs <ms>    Optional timestamp override

Diff options:
  --baseline <path>     Baseline bridge-run JSON
  --candidate <path>    Candidate bridge-run JSON
  --out <path>          Output bridge-diff JSON
  --runId <id>          Optional explicit diff run_id
  --createdAtMs <ms>    Optional timestamp override

Examples:
  npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-baseline.json --out /tmp/pf-base.bridge.json --runId pf_base
  npm run bridge -- diff --baseline /tmp/pf-base.bridge.json --candidate /tmp/pf-new.bridge.json --out /tmp/pf.diff.json
`;

type CliIo = {
  readFile: (absPath: string) => string;
  writeFile: (absPath: string, value: string) => void;
  log: (msg: string) => void;
};

const defaultIo: CliIo = {
  readFile: (absPath) => readFileSync(absPath, "utf-8"),
  writeFile: (absPath, value) => {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, value, "utf-8");
  },
  log: (msg) => console.log(msg),
};

function parseJsonFile<T>(filePath: string, io: CliIo): T {
  try {
    return JSON.parse(io.readFile(filePath)) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${filePath} (${err instanceof Error ? err.message : String(err)})`);
  }
}

function parseVendor(value: string | null): BridgeVendor {
  if (value === "promptfoo" || value === "deepeval" || value === "giskard") return value;
  throw new CliUsageError(`Invalid --vendor value: ${String(value)}\n\n${HELP}`);
}

function parseOptionalInt(raw: string | null, name: string): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new CliUsageError(`Invalid integer for ${name}: ${raw}\n\n${HELP}`);
  return n;
}

function assertBridgeRun(value: unknown, filePath: string): BridgeRun {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid bridge run: ${filePath} (expected object)`);
  }
  const run = value as Partial<BridgeRun>;
  if (typeof run.vendor !== "string" || typeof run.run_id !== "string" || !Array.isArray(run.cases)) {
    throw new Error(`Invalid bridge run: ${filePath} (missing vendor/run_id/cases)`);
  }
  return value as BridgeRun;
}

function writeJson(path: string, value: unknown, io: CliIo): void {
  io.writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runConvert(argv: string[], io: CliIo): void {
  const { getArg } = makeArgvHelpers(argv);
  const vendor = parseVendor(getArg("--vendor"));
  const inPath = getArg("--in");
  const outPath = getArg("--out");
  const runId = getArg("--runId");
  const createdAtMs = parseOptionalInt(getArg("--createdAtMs"), "--createdAtMs");

  if (!inPath || !outPath) {
    throw new CliUsageError(`convert requires --in and --out\n\n${HELP}`);
  }

  const payload = parseJsonFile<unknown>(inPath, io);

  const parseOptions = {
    ...(runId ? { runId } : {}),
    ...(createdAtMs !== undefined ? { createdAtMs } : {}),
  };

  const run =
    vendor === "promptfoo"
      ? parsePromptfooRun(payload, parseOptions)
      : vendor === "deepeval"
        ? parseDeepEvalRun(payload, parseOptions)
        : parseGiskardRun(payload, parseOptions);

  writeJson(outPath, run, io);
  io.log(`Converted ${vendor} -> ${outPath} (cases=${run.stats.total_cases}, pass_rate=${run.stats.pass_rate.toFixed(3)})`);
}

function runDiff(argv: string[], io: CliIo): void {
  const { getArg } = makeArgvHelpers(argv);
  const baselinePath = getArg("--baseline");
  const candidatePath = getArg("--candidate");
  const outPath = getArg("--out");
  const runId = getArg("--runId");
  const createdAtMs = parseOptionalInt(getArg("--createdAtMs"), "--createdAtMs");

  if (!baselinePath || !candidatePath || !outPath) {
    throw new CliUsageError(`diff requires --baseline, --candidate, --out\n\n${HELP}`);
  }

  const baseline = assertBridgeRun(parseJsonFile<unknown>(baselinePath, io), baselinePath);
  const candidate = assertBridgeRun(parseJsonFile<unknown>(candidatePath, io), candidatePath);

  const diffOptions = {
    baseline,
    candidate,
    ...(runId ? { runId } : {}),
    ...(createdAtMs !== undefined ? { createdAtMs } : {}),
  };
  const report = compareBridgeRuns(diffOptions);
  writeJson(outPath, report, io);
  io.log(
    `Diff written: ${outPath} (regressions=${report.summary.regressions}, improvements=${report.summary.improvements}, block=${report.summary.block_cases})`
  );
}

export function runVendorBridgeCli(argv: string[], io: CliIo = defaultIo): void {
  const { ARGV, hasFlag, getArg, assertNoUnknownOptions, assertHasValue } = makeArgvHelpers(argv);

  if (ARGV.length < 3 || hasFlag("--help") || hasFlag("-h")) {
    io.log(HELP);
    return;
  }

  const command = ARGV[2];

  const baseAllowed = new Set(["--help", "-h"]);
  const convertAllowed = new Set([...baseAllowed, "--vendor", "--in", "--out", "--runId", "--createdAtMs"]);
  const diffAllowed = new Set([...baseAllowed, "--baseline", "--candidate", "--out", "--runId", "--createdAtMs"]);

  const guards = makeCliUsageGuards(HELP, { assertNoUnknownOptions, assertHasValue, parseIntFlag: () => 0 });

  if (command === "convert") {
    guards.assertNoUnknownOptionsOrThrow(convertAllowed);
    guards.assertHasValueOrThrow("--vendor");
    guards.assertHasValueOrThrow("--in");
    guards.assertHasValueOrThrow("--out");
    if (getArg("--createdAtMs") !== null) {
      guards.assertHasValueOrThrow("--createdAtMs");
    }
    runConvert(ARGV, io);
    return;
  }

  if (command === "diff") {
    guards.assertNoUnknownOptionsOrThrow(diffAllowed);
    guards.assertHasValueOrThrow("--baseline");
    guards.assertHasValueOrThrow("--candidate");
    guards.assertHasValueOrThrow("--out");
    if (getArg("--createdAtMs") !== null) {
      guards.assertHasValueOrThrow("--createdAtMs");
    }
    runDiff(ARGV, io);
    return;
  }

  throw new CliUsageError(`Unknown command: ${command}\n\n${HELP}`);
}

if (require.main === module) {
  try {
    runVendorBridgeCli(process.argv);
  } catch (err) {
    if (err instanceof CliUsageError) {
      console.error(err.message);
      process.exit(err.exitCode);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
