#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CORE_PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-package.mjs");
const DEFAULT_PROFILE = path.join(REPO_ROOT, "docs", "compliance-profile-eu-ai-act.json");

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/eu-ai-act-package.mjs --cases <path> --baselineDir <path> --newDir <path> --outDir <path> --reportId <id> [options]",
    "",
    "Options:",
    "  --complianceProfile <path>  Override compliance profile (default: docs/compliance-profile-eu-ai-act.json)",
    "  --no-verify                 Skip post-run compliance verification",
    "  --verify-strict            Run strict PVIP mode inside compliance verification",
    "  --help                     Show this help",
    "",
    "All other options are passed through to the core agent-evidence packager.",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status ?? 1;
}

function main() {
  const forwardedArgs = [...process.argv.slice(2)];
  if (hasFlag(forwardedArgs, "--help") || hasFlag(forwardedArgs, "-h")) {
    usage(0);
  }

  if (!hasFlag(forwardedArgs, "--complianceProfile")) {
    if (!existsSync(DEFAULT_PROFILE)) {
      throw new Error(`Default EU AI Act compliance profile not found: ${DEFAULT_PROFILE}`);
    }
    forwardedArgs.push("--complianceProfile", DEFAULT_PROFILE);
  }
  if (!hasFlag(forwardedArgs, "--verifyProfile")) {
    forwardedArgs.push("--verifyProfile", "eu-ai-act");
  }

  const status = runCommand(
    process.execPath,
    [CORE_PACKAGE_SCRIPT, ...forwardedArgs],
    REPO_ROOT
  );
  process.exit(status);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  usage(2);
}
