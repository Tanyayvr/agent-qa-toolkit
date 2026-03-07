#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function hasFlag(name, argv = process.argv) {
  return argv.includes(name);
}

function getArg(name, argv = process.argv) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  const val = argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function normalizeFormat(raw) {
  if (raw === "cyclonedx" || raw === "spdx") return raw;
  return "cyclonedx";
}

export function parseSbomCliArgs(argv = process.argv) {
  const format = normalizeFormat(getArg("--format", argv));
  const out = getArg("--out", argv);
  const omitRaw = getArg("--omit", argv);
  const omit = omitRaw && omitRaw.trim().length > 0 ? omitRaw.trim() : "dev";
  return {
    help: hasFlag("--help", argv) || hasFlag("-h", argv),
    format,
    out,
    omit,
  };
}

export function buildNpmSbomArgs(cli) {
  return ["sbom", "--omit", cli.omit, "--sbom-format", cli.format];
}

export function runSbom(cli, deps = {}) {
  const execFn = deps.execFn ?? execFileSync;
  const raw = execFn("npm", buildNpmSbomArgs(cli), { encoding: "utf-8" });
  if (cli.out) {
    const absOut = path.isAbsolute(cli.out) ? cli.out : path.resolve(process.cwd(), cli.out);
    mkdirSync(path.dirname(absOut), { recursive: true });
    writeFileSync(absOut, raw, "utf8");
    return { outPath: absOut, bytes: Buffer.byteLength(raw, "utf8") };
  }
  process.stdout.write(raw.endsWith("\n") ? raw : `${raw}\n`);
  return { outPath: null, bytes: Buffer.byteLength(raw, "utf8") };
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: npm run sbom -- [--format cyclonedx|spdx] [--out <path>] [--omit <dev|optional|peer>]",
      "",
      "Examples:",
      "  npm run sbom -- --format cyclonedx --out .agent-qa/sbom/cyclonedx.json",
      "  npm run sbom -- --format spdx --out .agent-qa/sbom/spdx.json",
      "",
    ].join("\n")
  );
}

export function cliMain(argv = process.argv, deps = {}) {
  const cli = parseSbomCliArgs(argv);
  if (cli.help) {
    printHelp();
    return 0;
  }
  try {
    const result = runSbom(cli, deps);
    if (result.outPath) {
      console.log(`SBOM generated: ${result.outPath} (${result.bytes} bytes)`);
    }
    return 0;
  } catch {
    console.error("SBOM generation failed.");
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exit(cliMain(process.argv));
}
