#!/usr/bin/env node
import { existsSync } from "node:fs";

import {
  ensureDir,
  makeQualityContractTemplate,
  makeSystemScopeTemplate,
  parseBooleanFlag,
  qualityContractPath,
  relFrom,
  resolveIntakeDir,
  systemScopePath,
  writeJson,
} from "./lib/evidence-intake.mjs";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-intake-init.mjs --profile <id> [options]",
    "",
    "Options:",
    "  --profile <id>             Intake profile name",
    "  --outDir <path>           Target intake directory (default: ops/intake/<profile>)",
    "  --systemId <id>           Prefill system_id",
    "  --agentId <id>            Prefill agent_id",
    "  --systemName <name>       Prefill system_name",
    "  --euDossierRequired <0|1> Prefill EU dossier preference",
    "  --force                   Overwrite existing intake files",
    "  --json                    Print machine-readable output",
    "  --help                    Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    profile: "",
    outDir: "",
    systemId: "",
    agentId: "",
    systemName: "",
    euDossierRequired: false,
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
    if (arg === "--outDir") {
      args.outDir = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--systemId") {
      args.systemId = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--agentId") {
      args.agentId = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--systemName") {
      args.systemName = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--euDossierRequired") {
      args.euDossierRequired = parseBooleanFlag(argv[i + 1], false);
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  if (!args.profile.trim()) {
    console.error("Missing required --profile");
    usage(2);
  }
  return args;
}

function renderHuman(summary) {
  return [
    "intake init complete",
    `profile: ${summary.profile_id}`,
    `intakeDir: ${summary.intake_dir}`,
    `systemScope: ${summary.files.system_scope_href}`,
    `qualityContract: ${summary.files.quality_contract_href}`,
    "note: both files contain TODO placeholders and must be completed before validation passes.",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const intakeDir = resolveIntakeDir({ cwd, profile: args.profile, explicitDir: args.outDir || null });
  const systemScopeAbs = systemScopePath(intakeDir);
  const qualityContractAbs = qualityContractPath(intakeDir);

  if (!args.force) {
    const existing = [systemScopeAbs, qualityContractAbs].filter((candidate) => existsSync(candidate));
    if (existing.length > 0) {
      throw new Error(`Refusing to overwrite existing intake files. Re-run with --force.\n${existing.join("\n")}`);
    }
  }

  ensureDir(intakeDir);

  const systemScope = makeSystemScopeTemplate({
    profile: args.profile,
    systemId: args.systemId || `${args.profile}-system`,
    agentId: args.agentId || `${args.profile}-agent`,
    systemName: args.systemName || "TODO",
    euDossierRequired: args.euDossierRequired,
  });
  const qualityContract = makeQualityContractTemplate({
    profile: args.profile,
    systemId: systemScope.system_id,
  });

  writeJson(systemScopeAbs, systemScope);
  writeJson(qualityContractAbs, qualityContract);

  const summary = {
    ok: true,
    profile_id: args.profile,
    intake_dir: intakeDir,
    files: {
      system_scope_href: relFrom(intakeDir, systemScopeAbs),
      quality_contract_href: relFrom(intakeDir, qualityContractAbs),
    },
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
