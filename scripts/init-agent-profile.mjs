#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  classDefaultCapMs,
  classDefaultMaxFactor,
  classDefaultTimeoutMs,
  detectRuntimeClass,
} from "./runtime-policy.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const TEMPLATE_PATH = path.join(REPO_ROOT, "ops", "agents", "template.env");
const AGENTS_DIR = path.join(REPO_ROOT, "ops", "agents");

function printHelp() {
  console.log(`Usage:
  npm run campaign:agent:init -- --profile <name> --cliCmd <path-or-binary> [options]

Required:
  --profile <name>            Output profile id, e.g. claude
  --cliCmd <cmd>              CLI executable for cli-agent-adapter

Options:
  --cliArgs '<json-array>'    JSON array for CLI args (default: [])
  --cliArg <value>            Repeatable alternative to --cliArgs
  --cliWorkdir <path>         Optional working directory for the agent CLI
  --baseUrl <url>             Adapter base URL (default: http://127.0.0.1:8788)
  --suite <name>              Agent suite (default: cli)
  --campaignProfile <name>    Campaign profile (default: quality)
  --providerLocation <local|remote|unknown>  (default: local)
  --usesMcp <0|1>             Agent depends on MCP (default: 0)
  --multiProcess <0|1>        Agent is multi-process (default: 0)
  --interactive <0|1>         Agent requires interactive flow (default: 0)
  --runtimeClass <name>       Explicit runtime class override
  --managedAdapter <0|1>      Auto-manage adapter (default: 1)
  --adapterMaxConcurrency <n> (default: 1)
  --managedMcp <0|1>          Auto-manage MCP (default: same as usesMcp)
  --mcpBaseUrl <url>          MCP endpoint (default: http://127.0.0.1:3001/mcp)
  --mcpHealthUrl <url>        MCP health endpoint (default: derived from mcpBaseUrl)
  --mcpStartCmd <cmd>         Command to start MCP when managedMcp=1
  --mcpWorkdir <path>         Working directory for mcpStartCmd
  --force                     Overwrite profile if it already exists
  --help                      Show this help

Examples:
  npm run campaign:agent:init -- --profile claude --cliCmd claude --cliArg --print --cliArg --json
  npm run campaign:agent:init -- --profile gooseteam --cliCmd goose --cliArgs '["run","--text"]' --usesMcp 1 --managedMcp 1 --mcpStartCmd 'npm run streamableHttp:direct' --mcpWorkdir /path/to/GooseTeam
`);
}

function parseFlag01(value, name) {
  if (value !== "0" && value !== "1") {
    throw new Error(`${name} must be 0 or 1`);
  }
  return value;
}

function parseArgs(argv) {
  const out = {
    profile: "",
    cliCmd: "",
    cliArgsJson: "",
    cliArgsList: [],
    cliWorkdir: "",
    baseUrl: "http://127.0.0.1:8788",
    suite: "cli",
    campaignProfile: "quality",
    providerLocation: "local",
    usesMcp: "0",
    multiProcess: "0",
    interactive: "0",
    runtimeClass: "",
    managedAdapter: "1",
    adapterMaxConcurrency: "1",
    managedMcp: "",
    mcpBaseUrl: "http://127.0.0.1:3001/mcp",
    mcpHealthUrl: "",
    mcpStartCmd: "",
    mcpWorkdir: "",
    force: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--profile") out.profile = String(argv[++i] ?? "");
    else if (arg === "--cliCmd") out.cliCmd = String(argv[++i] ?? "");
    else if (arg === "--cliArgs") out.cliArgsJson = String(argv[++i] ?? "");
    else if (arg === "--cliArg") out.cliArgsList.push(String(argv[++i] ?? ""));
    else if (arg === "--cliWorkdir") out.cliWorkdir = String(argv[++i] ?? "");
    else if (arg === "--baseUrl") out.baseUrl = String(argv[++i] ?? "");
    else if (arg === "--suite") out.suite = String(argv[++i] ?? "");
    else if (arg === "--campaignProfile") out.campaignProfile = String(argv[++i] ?? "");
    else if (arg === "--providerLocation") out.providerLocation = String(argv[++i] ?? "");
    else if (arg === "--usesMcp") out.usesMcp = parseFlag01(String(argv[++i] ?? ""), "--usesMcp");
    else if (arg === "--multiProcess") out.multiProcess = parseFlag01(String(argv[++i] ?? ""), "--multiProcess");
    else if (arg === "--interactive") out.interactive = parseFlag01(String(argv[++i] ?? ""), "--interactive");
    else if (arg === "--runtimeClass") out.runtimeClass = String(argv[++i] ?? "");
    else if (arg === "--managedAdapter")
      out.managedAdapter = parseFlag01(String(argv[++i] ?? ""), "--managedAdapter");
    else if (arg === "--adapterMaxConcurrency") out.adapterMaxConcurrency = String(argv[++i] ?? "");
    else if (arg === "--managedMcp") out.managedMcp = parseFlag01(String(argv[++i] ?? ""), "--managedMcp");
    else if (arg === "--mcpBaseUrl") out.mcpBaseUrl = String(argv[++i] ?? "");
    else if (arg === "--mcpHealthUrl") out.mcpHealthUrl = String(argv[++i] ?? "");
    else if (arg === "--mcpStartCmd") out.mcpStartCmd = String(argv[++i] ?? "");
    else if (arg === "--mcpWorkdir") out.mcpWorkdir = String(argv[++i] ?? "");
    else if (arg === "--force") out.force = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (out.help) return out;
  if (!out.profile.trim()) throw new Error("--profile is required");
  if (!out.cliCmd.trim()) throw new Error("--cliCmd is required");
  if (out.cliArgsJson && out.cliArgsList.length > 0) {
    throw new Error("Use either --cliArgs or repeated --cliArg, not both");
  }
  if (!["local", "remote", "unknown"].includes(out.providerLocation)) {
    throw new Error("--providerLocation must be local|remote|unknown");
  }
  if (out.managedMcp === "") out.managedMcp = out.usesMcp;
  if (out.managedMcp === "1" && !out.mcpStartCmd.trim()) {
    throw new Error("--mcpStartCmd is required when --managedMcp=1");
  }
  return out;
}

function deriveHealthUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.pathname = "/health";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseCliArgs(args) {
  if (args.cliArgsJson) {
    const parsed = JSON.parse(args.cliArgsJson);
    if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
      throw new Error("--cliArgs must be a JSON string array");
    }
    return parsed;
  }
  return args.cliArgsList;
}

function sanitizeProfileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function upsertEnv(templateContent, values) {
  const lines = templateContent.split(/\r?\n/);
  const keyToIndex = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    const match = /^([A-Z0-9_]+)=/.exec(lines[i]);
    if (match) keyToIndex.set(match[1], i);
  }

  for (const [key, rawValue] of Object.entries(values)) {
    const value = rawValue ?? "";
    const rendered = `${key}=${value}`;
    if (keyToIndex.has(key)) {
      lines[keyToIndex.get(key)] = rendered;
    } else {
      lines.push(rendered);
    }
  }

  return `${lines.join("\n").replace(/\n+$/g, "")}\n`;
}

function intToStr(value) {
  return String(Math.trunc(Number(value)));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const profileId = sanitizeProfileName(args.profile.trim());
  const outPath = path.join(AGENTS_DIR, `${profileId}.env`);
  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const cliArgs = parseCliArgs(args);

  let stat = null;
  try {
    stat = await fs.stat(outPath);
  } catch {
    stat = null;
  }
  if (stat && !args.force) {
    throw new Error(`Profile already exists: ${outPath}. Use --force to overwrite.`);
  }

  const detected = detectRuntimeClass({
    explicitClass: args.runtimeClass.trim(),
    providerLocation: args.providerLocation,
    usesMcp: args.usesMcp,
    multiProcess: args.multiProcess,
    interactive: args.interactive,
  });
  const runtimeClass = detected.runtime_class;
  const capMs = classDefaultCapMs(runtimeClass);
  const maxFactor = classDefaultMaxFactor(runtimeClass);
  const smokeTimeout = classDefaultTimeoutMs(runtimeClass, "quick");
  const fullLiteTimeout = classDefaultTimeoutMs(runtimeClass, "full-lite");
  const fullTimeout = classDefaultTimeoutMs(runtimeClass, "full");
  const diagnosticTimeout = classDefaultTimeoutMs(runtimeClass, "diagnostic");
  const mcpHealthUrl = args.mcpHealthUrl.trim() || deriveHealthUrl(args.mcpBaseUrl);

  const output = upsertEnv(template, {
    BASE_URL: args.baseUrl,
    AGENT_SUITE: args.suite,
    CAMPAIGN_PROFILE: args.campaignProfile,
    STAGED_MODE: "1",
    ADAPTER_MANAGED: args.managedAdapter,
    ADAPTER_CLI_AGENT_CMD: args.cliCmd,
    ADAPTER_CLI_AGENT_ARGS: JSON.stringify(cliArgs),
    ADAPTER_CLI_AGENT_WORKDIR: args.cliWorkdir,
    ADAPTER_MAX_CONCURRENCY: args.adapterMaxConcurrency,
    MCP_MANAGED: args.managedMcp,
    MCP_BASE_URL: args.usesMcp === "1" ? args.mcpBaseUrl : "",
    MCP_HEALTH_URL: args.usesMcp === "1" ? mcpHealthUrl : "",
    MCP_START_CMD: args.managedMcp === "1" ? args.mcpStartCmd : "",
    MCP_WORKDIR: args.managedMcp === "1" ? args.mcpWorkdir : "",
    AGENT_PROVIDER_LOCATION: args.providerLocation,
    AGENT_USES_MCP: args.usesMcp,
    AGENT_MULTI_PROCESS: args.multiProcess,
    AGENT_INTERACTIVE: args.interactive,
    AGENT_RUNTIME_CLASS: runtimeClass,
    DIAGNOSTIC_RECOMMEND_RUNTIME_MS: intToStr(diagnosticTimeout),
    TIMEOUT_PROFILE: "auto",
    TIMEOUT_MS: intToStr(fullTimeout),
    TIMEOUT_AUTO_CAP_MS: intToStr(capMs),
    TIMEOUT_AUTO_MAX_INCREASE_FACTOR: intToStr(maxFactor),
    SMOKE_TIMEOUT_PROFILE: "auto",
    SMOKE_TIMEOUT_MS: intToStr(smokeTimeout),
    SMOKE_TIMEOUT_AUTO_CAP_MS: intToStr(capMs),
    SMOKE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR: intToStr(maxFactor),
    FULL_LITE_TIMEOUT_PROFILE: "auto",
    FULL_LITE_TIMEOUT_MS: intToStr(fullLiteTimeout),
    FULL_LITE_TIMEOUT_AUTO_CAP_MS: intToStr(capMs),
    FULL_LITE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR: intToStr(maxFactor),
    DIAGNOSTIC_TIMEOUT_MS: intToStr(diagnosticTimeout),
    DIAGNOSTIC_TIMEOUT_AUTO_CAP_MS: intToStr(capMs),
    DIAGNOSTIC_TIMEOUT_AUTO_MAX_INCREASE_FACTOR: intToStr(maxFactor),
    LIBRARY_SOURCE: `agent-profile-${profileId}`,
  });

  await fs.writeFile(outPath, output, "utf8");

  console.log(`Profile created: ${outPath}`);
  console.log(`runtimeClass=${runtimeClass} (basis=${detected.basis})`);
  console.log("firstRunDefaults:");
  console.log(`  smokeTimeoutMs=${smokeTimeout}`);
  console.log(`  fullLiteTimeoutMs=${fullLiteTimeout}`);
  console.log(`  fullTimeoutMs=${fullTimeout}`);
  console.log(`  diagnosticTimeoutMs=${diagnosticTimeout}`);
  console.log(`  timeoutAutoCapMs=${capMs}`);
  console.log(`  timeoutAutoMaxIncreaseFactor=${maxFactor}`);
  console.log("next:");
  console.log(`  npm run campaign:agent:dry-run -- ${profileId}`);
  console.log(`  npm run campaign:agent -- ${profileId}`);
}

main().catch((error) => {
  console.error(`agent-profile-init: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
