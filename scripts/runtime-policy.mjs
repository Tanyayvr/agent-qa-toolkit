#!/usr/bin/env node
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  fast_remote: {
    cap_ms: 3_600_000,
    max_increase_factor: 3,
    timeout_ms: {
      quick: 120_000,
      "full-lite": 300_000,
      full: 600_000,
      diagnostic: 1_800_000,
    },
  },
  standard_cli: {
    cap_ms: 7_200_000,
    max_increase_factor: 4,
    timeout_ms: {
      quick: 300_000,
      "full-lite": 600_000,
      full: 1_200_000,
      diagnostic: 3_600_000,
    },
  },
  generic: {
    cap_ms: 7_200_000,
    max_increase_factor: 4,
    timeout_ms: {
      quick: 300_000,
      "full-lite": 600_000,
      full: 1_200_000,
      diagnostic: 3_600_000,
    },
  },
  slow_local_cli: {
    cap_ms: 21_600_000,
    max_increase_factor: 6,
    timeout_ms: {
      quick: 900_000,
      "full-lite": 1_800_000,
      full: 3_600_000,
      diagnostic: 7_200_000,
    },
  },
  heavy_mcp_agent: {
    cap_ms: 21_600_000,
    max_increase_factor: 6,
    timeout_ms: {
      quick: 1_800_000,
      "full-lite": 3_600_000,
      full: 7_200_000,
      diagnostic: 7_200_000,
    },
  },
};

function normalizeMode(mode) {
  if (mode === "smoke") return "quick";
  if (mode === "full-lite" || mode === "full" || mode === "diagnostic" || mode === "quick") return mode;
  return "full";
}

function getClassDefaults(runtimeClass) {
  return DEFAULTS[runtimeClass] ?? DEFAULTS.generic;
}

export function classDefaultTimeoutMs(runtimeClass, mode) {
  const defaults = getClassDefaults(runtimeClass);
  return defaults.timeout_ms[normalizeMode(mode)] ?? DEFAULTS.generic.timeout_ms.full;
}

export function classDefaultCapMs(runtimeClass) {
  return getClassDefaults(runtimeClass).cap_ms;
}

export function classDefaultMaxFactor(runtimeClass) {
  return getClassDefaults(runtimeClass).max_increase_factor;
}

export function detectRuntimeClass({
  explicitClass = "",
  providerLocation = "unknown",
  usesMcp = "0",
  multiProcess = "0",
  interactive = "0",
} = {}) {
  if (explicitClass && explicitClass !== "generic") {
    return { runtime_class: explicitClass, basis: "profile" };
  }
  if (String(usesMcp) === "1" || String(multiProcess) === "1") {
    return { runtime_class: "heavy_mcp_agent", basis: "topology" };
  }
  if (providerLocation === "local") {
    return { runtime_class: "slow_local_cli", basis: "topology" };
  }
  if (providerLocation === "remote" && String(interactive) !== "1") {
    return { runtime_class: "fast_remote", basis: "topology" };
  }
  return { runtime_class: "standard_cli", basis: "fallback" };
}

function parseArgs(argv) {
  const out = {
    command: "",
    runtimeClass: "generic",
    mode: "full",
    field: "",
    explicitClass: "",
    providerLocation: "unknown",
    usesMcp: "0",
    multiProcess: "0",
    interactive: "0",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!out.command && !arg.startsWith("--")) {
      out.command = arg;
      continue;
    }
    if (arg === "--runtimeClass") out.runtimeClass = String(argv[++i] ?? out.runtimeClass);
    else if (arg === "--mode") out.mode = String(argv[++i] ?? out.mode);
    else if (arg === "--field") out.field = String(argv[++i] ?? out.field);
    else if (arg === "--explicitClass") out.explicitClass = String(argv[++i] ?? out.explicitClass);
    else if (arg === "--providerLocation") out.providerLocation = String(argv[++i] ?? out.providerLocation);
    else if (arg === "--usesMcp") out.usesMcp = String(argv[++i] ?? out.usesMcp);
    else if (arg === "--multiProcess") out.multiProcess = String(argv[++i] ?? out.multiProcess);
    else if (arg === "--interactive") out.interactive = String(argv[++i] ?? out.interactive);
    else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return out;
}

function renderHelp() {
  return [
    "Usage:",
    "  node scripts/runtime-policy.mjs defaults --runtimeClass <name> --mode <quick|smoke|full-lite|full|diagnostic> [--field timeout_ms|cap_ms|max_increase_factor|normalized_mode]",
    "  node scripts/runtime-policy.mjs classify [--explicitClass <name>] [--providerLocation <local|remote|unknown>] [--usesMcp 0|1] [--multiProcess 0|1] [--interactive 0|1] [--field runtime_class|basis]",
  ].join("\n");
}

function printFieldOrJson(payload, field) {
  if (field) {
    const value = payload?.[field];
    if (value === undefined || value === null) return;
    process.stdout.write(String(value));
    return;
  }
  process.stdout.write(JSON.stringify(payload));
}

export function cliMain(argv) {
  const args = parseArgs(argv);
  if (args.help || !args.command) {
    console.log(renderHelp());
    return args.help ? 0 : 2;
  }
  if (args.command === "defaults") {
    const normalizedMode = normalizeMode(args.mode);
    const payload = {
      runtime_class: args.runtimeClass,
      normalized_mode: normalizedMode,
      timeout_ms: classDefaultTimeoutMs(args.runtimeClass, normalizedMode),
      cap_ms: classDefaultCapMs(args.runtimeClass),
      max_increase_factor: classDefaultMaxFactor(args.runtimeClass),
    };
    printFieldOrJson(payload, args.field);
    return 0;
  }
  if (args.command === "classify") {
    printFieldOrJson(
      detectRuntimeClass({
        explicitClass: args.explicitClass,
        providerLocation: args.providerLocation,
        usesMcp: args.usesMcp,
        multiProcess: args.multiProcess,
        interactive: args.interactive,
      }),
      args.field
    );
    return 0;
  }
  throw new Error(`Unknown command: ${args.command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = cliMain(process.argv);
  } catch (error) {
    console.error(`runtime-policy: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
