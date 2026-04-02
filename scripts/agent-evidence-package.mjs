#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const EVALUATOR_ROOT = path.join(REPO_ROOT, "apps", "evaluator");
const TS_NODE_CLI = path.join(REPO_ROOT, "node_modules", "ts-node", "dist", "bin.js");
const VERIFY_SCRIPT_BY_PROFILE = {
  agent: path.join(REPO_ROOT, "scripts", "agent-evidence-verify.mjs"),
  "eu-ai-act": path.join(REPO_ROOT, "scripts", "eu-ai-act-verify.mjs"),
};

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/agent-evidence-package.mjs --cases <path> --baselineDir <path> --newDir <path> --outDir <path> --reportId <id> [options]",
    "",
    "Options:",
    "  --verifyProfile <agent|eu-ai-act>  Verification profile to run after packaging (default: agent)",
    "  --no-verify                        Skip post-run evidence verification",
    "  --verify-strict                    Run strict PVIP mode inside verification",
    "  --sign                             Generate artifacts/manifest.sig after packaging (requires AQ_MANIFEST_PRIVATE_KEY)",
    "  --sign-if-key-present              Generate artifacts/manifest.sig when AQ_MANIFEST_PRIVATE_KEY is set",
    "  --help                             Show this help",
    "",
    "All other options are passed through to the evaluator.",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const control = {
    verify: true,
    verifyStrict: false,
    verifyProfile: "agent",
    sign: false,
    signIfKeyPresent: false,
    evaluatorArgs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--no-verify") {
      control.verify = false;
      continue;
    }
    if (arg === "--verify") {
      control.verify = true;
      continue;
    }
    if (arg === "--verify-strict") {
      control.verify = true;
      control.verifyStrict = true;
      continue;
    }
    if (arg === "--sign") {
      control.sign = true;
      continue;
    }
    if (arg === "--sign-if-key-present") {
      control.signIfKeyPresent = true;
      continue;
    }
    if (arg === "--verifyProfile") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        console.error("Missing value for --verifyProfile");
        usage(2);
      }
      control.verifyProfile = value;
      i += 1;
      continue;
    }
    control.evaluatorArgs.push(arg);
  }

  if (!Object.prototype.hasOwnProperty.call(VERIFY_SCRIPT_BY_PROFILE, control.verifyProfile)) {
    console.error(`Unknown --verifyProfile: ${control.verifyProfile}`);
    usage(2);
  }

  return control;
}

function requireFlag(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) {
    throw new Error(`Missing required ${flag}`);
  }
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function setFlagValue(args, flag, value) {
  const idx = args.indexOf(flag);
  if (idx === -1) {
    args.push(flag, value);
    return;
  }
  args[idx + 1] = value;
}

function resolveArgPath(baseDir, value) {
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function stagePortableInputs(params) {
  const stageRoot = path.join(params.outDir, "_source_inputs");
  const casesStage = path.join(stageRoot, "cases.json");
  const baselineStage = path.join(stageRoot, "baseline");
  const newStage = path.join(stageRoot, "new");

  mkdirSync(params.outDir, { recursive: true });
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(stageRoot, { recursive: true });

  cpSync(params.casesPathAbs, casesStage);
  cpSync(params.baselineDirAbs, baselineStage, { recursive: true });
  cpSync(params.newDirAbs, newStage, { recursive: true });

  return {
    casesStage,
    baselineStage,
    newStage,
  };
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

function getManifestPaths(outDir) {
  const manifestPath = path.join(outDir, "artifacts", "manifest.json");
  const signaturePath = path.join(outDir, "artifacts", "manifest.sig");
  return { manifestPath, signaturePath };
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

function signManifest(outDir, privateKeyB64) {
  const { manifestPath, signaturePath } = getManifestPaths(outDir);
  const manifestText = readFileSync(manifestPath, "utf8");
  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyB64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const signature = sign(null, Buffer.from(manifestText, "utf8"), privateKey).toString("base64");
  writeFileSync(signaturePath, `${signature}\n`, "utf8");
  return signaturePath;
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const evaluatorArgs = [...parsed.evaluatorArgs];
  const callerCwd = process.cwd();

  if (!existsSync(TS_NODE_CLI)) {
    throw new Error(`ts-node CLI not found: ${TS_NODE_CLI}`);
  }

  const requiredFlags = ["--cases", "--baselineDir", "--newDir", "--outDir", "--reportId"];
  for (const flag of requiredFlags) requireFlag(evaluatorArgs, flag);
  const casesPathAbs = resolveArgPath(callerCwd, requireFlag(evaluatorArgs, "--cases"));
  const baselineDirAbs = resolveArgPath(callerCwd, requireFlag(evaluatorArgs, "--baselineDir"));
  const newDirAbs = resolveArgPath(callerCwd, requireFlag(evaluatorArgs, "--newDir"));
  const outDir = resolveArgPath(callerCwd, requireFlag(evaluatorArgs, "--outDir"));

  const staged = stagePortableInputs({
    casesPathAbs,
    baselineDirAbs,
    newDirAbs,
    outDir,
  });

  setFlagValue(evaluatorArgs, "--cases", path.relative(outDir, staged.casesStage).split(path.sep).join("/"));
  setFlagValue(evaluatorArgs, "--baselineDir", path.relative(outDir, staged.baselineStage).split(path.sep).join("/"));
  setFlagValue(evaluatorArgs, "--newDir", path.relative(outDir, staged.newStage).split(path.sep).join("/"));
  setFlagValue(evaluatorArgs, "--outDir", ".");

  for (const flag of ["--complianceProfile", "--environment", "--trend-db"]) {
    if (hasFlag(evaluatorArgs, flag)) {
      setFlagValue(evaluatorArgs, flag, resolveArgPath(callerCwd, requireFlag(evaluatorArgs, flag)));
    }
  }

  const evaluatorStatus = runCommand(
    process.execPath,
    [TS_NODE_CLI, path.join(EVALUATOR_ROOT, "src", "index.ts"), ...evaluatorArgs],
    EVALUATOR_ROOT,
    { ...process.env, INIT_CWD: outDir }
  );
  if (evaluatorStatus !== 0) {
    process.exit(evaluatorStatus);
  }

  const privateKeyB64 = process.env.AQ_MANIFEST_PRIVATE_KEY;
  const shouldSign = parsed.sign || (parsed.signIfKeyPresent && Boolean(privateKeyB64));
  let verifyEnv = process.env;
  if (shouldSign) {
    if (!privateKeyB64) {
      throw new Error("--sign requires AQ_MANIFEST_PRIVATE_KEY (base64 DER PKCS8 private key)");
    }
    const signaturePath = signManifest(outDir, privateKeyB64);
    const publicKeyB64 = process.env.AQ_MANIFEST_PUBLIC_KEY || derivePublicKeyB64(privateKeyB64);
    verifyEnv = { ...process.env, AQ_MANIFEST_PUBLIC_KEY: publicKeyB64 };
    console.log(`Manifest signed: ${signaturePath}`);
  }

  if (!parsed.verify) {
    console.log(`Agent evidence package generated: ${outDir}`);
    process.exit(0);
  }

  const verifyScript = VERIFY_SCRIPT_BY_PROFILE[parsed.verifyProfile];
  const verifyArgs = [verifyScript, "--reportDir", outDir];
  if (parsed.verifyStrict) verifyArgs.push("--strict");
  const verifyStatus = runCommand(process.execPath, verifyArgs, REPO_ROOT, verifyEnv);
  process.exit(verifyStatus);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  usage(2);
}
