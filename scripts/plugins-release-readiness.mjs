#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const DEFAULT_OUT_PATH = path.join("apps/evaluator/reports", "plugins-release-readiness.json");

const PLUGINS = [
  {
    workspace: "langchain-adapter",
    readme: "plugins/langchain-adapter/README.md",
    testFile: "plugins/langchain-adapter/src/index.test.ts",
  },
  {
    workspace: "openai-responses-adapter",
    readme: "plugins/openai-responses-adapter/README.md",
    testFile: "plugins/openai-responses-adapter/src/index.test.ts",
  },
  {
    workspace: "otel-anchor-adapter",
    readme: "plugins/otel-anchor-adapter/README.md",
    testFile: "plugins/otel-anchor-adapter/src/index.test.ts",
  },
  {
    workspace: "vendor-bridge",
    readme: "plugins/vendor-bridge/README.md",
    testFile: "plugins/vendor-bridge/src/index.test.ts",
  },
];

const REQUIRED_README_SECTIONS = [
  "Usage",
  "Reliability",
  "Security",
  "Limitations",
];

const HELP = `Usage: node scripts/plugins-release-readiness.mjs [options]

Options:
  --out <path>             Output artifact JSON (default: apps/evaluator/reports/plugins-release-readiness.json)
  --skipTypecheck          Skip plugin workspace typechecks
  --skipTests              Skip plugin test suite
  --skipReadmeCheck        Skip README required-section validation
  --json                   Also print machine-readable summary to stdout
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

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || ROOT,
      env: opts.env || process.env,
      stdio: opts.stdio || "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if ((code ?? 0) === 0) {
        resolve({ code: 0 });
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${String(code)}`));
      }
    });
  });
}

export function missingReadmeSections(content, requiredSections = REQUIRED_README_SECTIONS) {
  return requiredSections.filter((section) => {
    const re = new RegExp(`^##\\s+${section}(?:\\s|$)`, "im");
    return !re.test(content);
  });
}

export function checkPluginReadmes(
  plugins = PLUGINS,
  rootDir = ROOT,
  requiredSections = REQUIRED_README_SECTIONS
) {
  const failures = [];
  for (const plugin of plugins) {
    const absPath = path.join(rootDir, plugin.readme);
    if (!fs.existsSync(absPath)) {
      failures.push({ workspace: plugin.workspace, readme: plugin.readme, missing: ["README file"] });
      continue;
    }
    const content = fs.readFileSync(absPath, "utf8");
    const missing = missingReadmeSections(content, requiredSections);
    if (missing.length > 0) {
      failures.push({ workspace: plugin.workspace, readme: plugin.readme, missing });
    }
  }
  return failures;
}

function buildResult({ typecheck, tests, readmeFailures, warnings, plugins, outPath }) {
  const checks = {
    typecheck,
    tests,
    readme_check: readmeFailures.length === 0,
  };
  return {
    ok: checks.typecheck && checks.tests && checks.readme_check,
    generated_at: new Date().toISOString(),
    checks,
    readme_failures: readmeFailures,
    required_readme_sections: REQUIRED_README_SECTIONS,
    warnings,
    plugins: plugins.map((p) => p.workspace),
    artifact_path: outPath,
  };
}

export async function runPluginsReleaseReadiness(opts = {}) {
  const outPath = opts.outPath || DEFAULT_OUT_PATH;
  const plugins = opts.plugins || PLUGINS;
  const rootDir = opts.rootDir || ROOT;
  const runTypecheck = opts.runTypecheck !== false;
  const runTests = opts.runTests !== false;
  const runReadmeCheck = opts.runReadmeCheck !== false;

  const warnings = [];
  const checks = {
    typecheck: !runTypecheck,
    tests: !runTests,
  };

  if (runTypecheck) {
    for (const plugin of plugins) {
      await run("npm", ["--workspace", plugin.workspace, "run", "typecheck"]);
    }
    checks.typecheck = true;
  } else {
    warnings.push("Typecheck was skipped.");
  }

  if (runTests) {
    const testFiles = plugins.map((p) => p.testFile);
    await run("npm", ["test", "--", ...testFiles]);
    checks.tests = true;
  } else {
    warnings.push("Tests were skipped.");
  }

  let readmeFailures = [];
  if (runReadmeCheck) {
    readmeFailures = checkPluginReadmes(plugins, rootDir);
  } else {
    warnings.push("README section validation was skipped.");
  }

  const result = buildResult({
    typecheck: checks.typecheck,
    tests: checks.tests,
    readmeFailures,
    warnings,
    plugins,
    outPath,
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");

  if (!result.ok) {
    const lines = readmeFailures.map((f) => `${f.workspace}: missing ${f.missing.join(", ")}`).join("; ");
    throw new Error(`plugin README readiness check failed: ${lines}`);
  }

  return result;
}

export function parseCliArgs(argv = process.argv) {
  return {
    help: hasFlag("--help", argv) || hasFlag("-h", argv),
    jsonMode: hasFlag("--json", argv),
    outPath: getArg("--out", argv) || DEFAULT_OUT_PATH,
    runTypecheck: !hasFlag("--skipTypecheck", argv),
    runTests: !hasFlag("--skipTests", argv),
    runReadmeCheck: !hasFlag("--skipReadmeCheck", argv),
  };
}

async function main() {
  const cli = parseCliArgs(process.argv);
  if (cli.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  const result = await runPluginsReleaseReadiness(cli);
  if (cli.jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log("plugins-release-readiness: PASS");
  console.log(`- artifact: ${result.artifact_path}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
