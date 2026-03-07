#!/usr/bin/env node

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { pathToFileURL } from "node:url";

const HELP = `Usage: node scripts/conformance-test-signature.mjs [options]

Options:
  --packDir <path>  Source conformance pack directory (default: conformance/golden-full)
  --skipPython      Skip Python validator check
  --skipGo          Skip Go validator check
  --keepTmp         Keep temporary signed pack directory for inspection
  --json            Output machine-readable JSON
  --help, -h        Show help
`;

function hasFlag(name, argv = process.argv) {
  return argv.includes(name);
}

function getArg(name, argv = process.argv) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

export function parseCliArgs(argv = process.argv) {
  return {
    help: hasFlag("--help", argv) || hasFlag("-h", argv),
    jsonMode: hasFlag("--json", argv),
    packDir: path.resolve(getArg("--packDir", argv) || "conformance/golden-full"),
    skipPython: hasFlag("--skipPython", argv),
    skipGo: hasFlag("--skipGo", argv),
    keepTmp: hasFlag("--keepTmp", argv),
  };
}

export function signatureStatus(parsed) {
  if (parsed?.profiles_status?.signature === "pass") return "pass";
  if (parsed?.profiles_status?.signature === "fail") return "fail";
  const checks = Array.isArray(parsed?.checks) ? parsed.checks : [];
  const check = checks.find((c) => c?.name === "signature");
  if (!check) return "unknown";
  return check?.pass === true ? "pass" : "fail";
}

function parseJsonOutput(name, output) {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${name} returned non-JSON output: ${output.slice(0, 300)}`);
  }
}

export function runValidatorJson({ name, cmd, args, cwd, env }) {
  const res = spawnSync(cmd, args, {
    cwd,
    env,
    encoding: "utf-8",
  });
  if (res.error) {
    throw new Error(`${name} failed to start: ${res.error.message}`);
  }
  const output = (res.stdout || "").trim() || (res.stderr || "").trim();
  const parsed = parseJsonOutput(name, output);
  return {
    name,
    exitCode: res.status ?? 1,
    parsed,
    output,
  };
}

export function assertStrictPass(result) {
  if (result.parsed?.ok !== true) {
    throw new Error(`${result.name} strict expected pass but got fail (exit=${result.exitCode})`);
  }
  if (signatureStatus(result.parsed) !== "pass") {
    throw new Error(`${result.name} strict expected signature=pass`);
  }
}

export function assertStrictFail(result) {
  if (result.parsed?.ok !== false) {
    throw new Error(`${result.name} strict expected fail but got pass`);
  }
  if (signatureStatus(result.parsed) !== "fail") {
    throw new Error(`${result.name} strict expected signature=fail`);
  }
}

export function createSignedFixture(packDir, tmpRoot = null) {
  if (!existsSync(packDir) || !statSync(packDir).isDirectory()) {
    throw new Error(`packDir not found or not a directory: ${packDir}`);
  }
  const workDir = mkdtempSync(path.join(tmpRoot ?? os.tmpdir(), "aq-signature-conformance-"));
  const fixtureDir = path.join(workDir, path.basename(packDir));
  cpSync(packDir, fixtureDir, { recursive: true });

  const manifestPath = path.join(fixtureDir, "artifacts", "manifest.json");
  const signaturePath = path.join(fixtureDir, "artifacts", "manifest.sig");
  const manifestText = readFileSync(manifestPath, "utf-8");

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signature = cryptoSign(null, Buffer.from(manifestText, "utf-8"), privateKey).toString("base64");
  writeFileSync(signaturePath, `${signature}\n`, "utf-8");

  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const publicKeyB64 = Buffer.from(publicKeyDer).toString("base64");

  return {
    workDir,
    fixtureDir,
    publicKeyB64,
    tamperManifest() {
      const current = readFileSync(manifestPath, "utf-8");
      writeFileSync(manifestPath, `${current}\n`, "utf-8");
    },
    cleanup() {
      rmSync(workDir, { recursive: true, force: true });
    },
  };
}

export function runNodeStrict(reportDir, env) {
  return runValidatorJson({
    name: "node",
    cmd: process.execPath,
    args: [path.resolve("scripts/pvip-verify.mjs"), "--reportDir", reportDir, "--mode", "strict", "--json"],
    cwd: process.cwd(),
    env,
  });
}

export function runPythonStrict(reportDir, env) {
  return runValidatorJson({
    name: "python",
    cmd: "python3",
    args: [path.resolve("validators/python/aepf_validator/cli.py"), "--reportDir", reportDir, "--mode", "strict", "--json"],
    cwd: process.cwd(),
    env,
  });
}

export function runGoStrict(reportDir, env) {
  return runValidatorJson({
    name: "go",
    cmd: "go",
    args: ["run", ".", "--reportDir", reportDir, "--mode", "strict", "--json"],
    cwd: path.resolve("validators/go/aepf-validator"),
    env,
  });
}

export async function runSignatureConformance({
  packDir = path.resolve("conformance/golden-full"),
  skipPython = false,
  skipGo = false,
  keepTmp = false,
} = {}) {
  const fixture = createSignedFixture(packDir);
  const env = { ...process.env, AQ_MANIFEST_PUBLIC_KEY: fixture.publicKeyB64 };
  const validators = [runNodeStrict];
  if (!skipPython) validators.push(runPythonStrict);
  if (!skipGo) validators.push(runGoStrict);

  const passResults = [];
  const failResults = [];
  try {
    for (const runValidator of validators) {
      const out = runValidator(fixture.fixtureDir, env);
      assertStrictPass(out);
      passResults.push({ validator: out.name, ok: out.parsed.ok, signature: signatureStatus(out.parsed) });
    }

    fixture.tamperManifest();

    for (const runValidator of validators) {
      const out = runValidator(fixture.fixtureDir, env);
      assertStrictFail(out);
      failResults.push({ validator: out.name, ok: out.parsed.ok, signature: signatureStatus(out.parsed) });
    }

    return {
      ok: true,
      packDir,
      fixtureDir: fixture.fixtureDir,
      strict_pass: passResults,
      strict_tamper_fail: failResults,
    };
  } finally {
    if (!keepTmp) fixture.cleanup();
  }
}

export function renderCliMessages(result, jsonMode) {
  if (jsonMode) {
    return {
      channel: result.ok ? "stdout" : "stderr",
      lines: [JSON.stringify(result, null, 2)],
    };
  }
  if (result.ok) {
    return {
      channel: "stdout",
      lines: [
        "Signature conformance: PASS",
        ...result.strict_pass.map((r) => `- strict pass: ${r.validator} signature=${r.signature}`),
        ...result.strict_tamper_fail.map((r) => `- strict tamper fail: ${r.validator} signature=${r.signature}`),
      ],
    };
  }
  return {
    channel: "stderr",
    lines: ["Signature conformance: FAIL", `- error: ${String(result.error || "unknown")}`],
  };
}

export async function cliMain(argv = process.argv) {
  const cli = parseCliArgs(argv);
  if (cli.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  let result;
  try {
    result = await runSignatureConformance({
      packDir: cli.packDir,
      skipPython: cli.skipPython,
      skipGo: cli.skipGo,
      keepTmp: cli.keepTmp,
    });
  } catch (err) {
    result = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const rendered = renderCliMessages(result, cli.jsonMode);
  if (rendered.channel === "stdout") {
    for (const line of rendered.lines) console.log(line);
  } else {
    for (const line of rendered.lines) console.error(line);
  }
  return result.ok ? 0 : 1;
}

async function main() {
  const code = await cliMain(process.argv);
  process.exit(code);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(String(err?.stack ?? err));
    process.exit(1);
  });
}
