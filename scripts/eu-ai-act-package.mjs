#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderEuReviewerPdf } from "./lib/reviewer-pdf.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CORE_PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-package.mjs");
const SIGN_SCRIPT = path.join(REPO_ROOT, "scripts", "manifest-sign.mjs");
const VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-verify.mjs");
const DEFAULT_PROFILE = path.join(REPO_ROOT, "products", "eu-ai-act", "config", "compliance-profile.json");
const EU_CONTRACTS = new Set(["minimum", "full"]);

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/eu-ai-act-package.mjs --cases <path> --baselineDir <path> --newDir <path> --outDir <path> --reportId <id> [options]",
    "",
    "Options:",
    "  --complianceProfile <path>  Override compliance profile (default: products/eu-ai-act/config/compliance-profile.json)",
    "  --contract <minimum|full>  EU packaging contract to enforce (default: minimum)",
    "  --no-verify                 Skip post-run compliance verification",
    "  --verify-strict            Run strict PVIP mode inside compliance verification",
    "  --sign                      Generate artifacts/manifest.sig after packaging (requires AQ_MANIFEST_PRIVATE_KEY)",
    "  --sign-if-key-present       Generate artifacts/manifest.sig when AQ_MANIFEST_PRIVATE_KEY is set",
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

function removeFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index >= 0) args.splice(index, 1);
}

function removeFlagWithValue(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return;
  args.splice(index, 1);
  if (index < args.length && !args[index].startsWith("--")) {
    args.splice(index, 1);
  }
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

function derivePublicKeyB64(privateKeyB64) {
  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyB64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  return Buffer.from(publicKey).toString("base64");
}

function runCommand(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    env,
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
  const skipVerify = hasFlag(forwardedArgs, "--no-verify");
  const verifyStrict = hasFlag(forwardedArgs, "--verify-strict");
  const signRequested = hasFlag(forwardedArgs, "--sign");
  const signIfKeyPresent = hasFlag(forwardedArgs, "--sign-if-key-present");
  const contractValue = getArgValue(forwardedArgs, "--contract") ?? "minimum";
  removeFlag(forwardedArgs, "--no-verify");
  removeFlag(forwardedArgs, "--verify-strict");
  removeFlag(forwardedArgs, "--sign");
  removeFlag(forwardedArgs, "--sign-if-key-present");
  removeFlagWithValue(forwardedArgs, "--contract");
  if (!EU_CONTRACTS.has(contractValue)) {
    throw new Error(`Unsupported --contract value: ${contractValue}. Expected minimum or full.`);
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
  if (!hasFlag(forwardedArgs, "--euContract")) {
    forwardedArgs.push("--euContract", contractValue);
  }
  if (!hasFlag(forwardedArgs, "--no-verify")) {
    forwardedArgs.push("--no-verify");
  }

  const privateKeyB64 = process.env.AQ_MANIFEST_PRIVATE_KEY;
  const shouldSign = signRequested || (signIfKeyPresent && Boolean(privateKeyB64));
  if (signRequested && !privateKeyB64) {
    throw new Error("--sign requires AQ_MANIFEST_PRIVATE_KEY (base64 DER PKCS8 private key)");
  }
  const verifyEnv = shouldSign
    ? {
        ...process.env,
        AQ_MANIFEST_PUBLIC_KEY: process.env.AQ_MANIFEST_PUBLIC_KEY || derivePublicKeyB64(privateKeyB64),
      }
    : process.env;

  const outDirValue = getArgValue(forwardedArgs, "--outDir");
  if (!outDirValue) {
    throw new Error("Missing required --outDir for EU AI Act packaging.");
  }
  const outDir = path.resolve(outDirValue);

  const packageStatus = runCommand(
    process.execPath,
    [CORE_PACKAGE_SCRIPT, ...forwardedArgs],
    REPO_ROOT
  );
  if (packageStatus !== 0) {
    process.exit(packageStatus);
  }

  if (contractValue === "full") {
    const pdf = renderEuReviewerPdf(outDir);
    console.log(`Reviewer PDF: ${path.relative(REPO_ROOT, pdf.pdfAbsPath).split(path.sep).join("/")}`);
    console.log(`Reviewer PDF renderer: ${pdf.renderer}`);
  }

  if (shouldSign) {
    const signStatus = runCommand(process.execPath, [SIGN_SCRIPT, outDir], REPO_ROOT, verifyEnv);
    if (signStatus !== 0) {
      process.exit(signStatus);
    }
    const relSigPath = path.relative(REPO_ROOT, path.join(outDir, "artifacts", "manifest.sig")).split(path.sep).join("/");
    console.log(`Manifest signed: ${relSigPath}`);
  }

  if (!skipVerify) {
    const verifyArgs = [VERIFY_SCRIPT, "--reportDir", outDir, "--contract", contractValue];
    if (verifyStrict) {
      verifyArgs.push("--strict");
    }
    const verifyStatus = runCommand(process.execPath, verifyArgs, REPO_ROOT, verifyEnv);
    process.exit(verifyStatus);
  }

  process.exit(0);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  usage(2);
}
