import { fileURLToPath } from "node:url";

import { DEFAULT_ORIGIN, SITE_OUTPUT_ROOT, verifySiteOutputs } from "./lib/eu-ai-site.mjs";

export function parseCliArgs(argv) {
  const args = {
    origin: DEFAULT_ORIGIN,
    outputRoot: SITE_OUTPUT_ROOT,
    json: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--origin") {
      args.origin = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--outputRoot") {
      args.outputRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--json") {
      args.json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

export function verifyBuiltSite({ origin = DEFAULT_ORIGIN, outputRoot = SITE_OUTPUT_ROOT } = {}) {
  const verification = verifySiteOutputs(origin, outputRoot);
  return {
    ...verification,
    origin,
    output_root: outputRoot,
    failed_checks: verification.checks.filter((check) => !check.pass),
  };
}

export function renderVerificationSummary(result, json = false) {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const lines = [
    result.ok ? "EU AI Evidence Builder site verify passed." : "EU AI Evidence Builder site verify failed.",
    `Origin: ${result.origin}`,
    `Output root: ${result.output_root}`,
    `Checks: ${result.checked_files}`,
  ];

  if (!result.ok) {
    lines.push("Failed checks:");
    for (const check of result.failed_checks) {
      lines.push(`- ${check.path}: ${check.message}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  const args = parseCliArgs(process.argv);
  const result = verifyBuiltSite({ origin: args.origin, outputRoot: args.outputRoot });
  const output = renderVerificationSummary(result, args.json);
  const stream = result.ok ? process.stdout : process.stderr;
  stream.write(`${output}\n`);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && entryPath === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
