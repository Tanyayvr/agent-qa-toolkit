#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_EXCLUDE_DIRS = new Set([
  ".git",
  "node_modules",
  ".agent-qa",
  "dist",
  "coverage",
  ".venv",
  "Autonomous-CLI-Agent",
  "agent-cli",
  "logs",
]);

const DEFAULT_MAX_FILE_BYTES = 1_000_000;

const SECRET_RULES = [
  { id: "openai_api_key", re: /\bsk-[A-Za-z0-9]{32,}\b/g },
  { id: "anthropic_api_key", re: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/g },
  { id: "aws_access_key_id", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: "github_pat", re: /\bghp_[A-Za-z0-9]{36}\b/g },
  { id: "github_fine_grained_pat", re: /\bgithub_pat_[A-Za-z0-9_]{80,}\b/g },
  { id: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "private_key_block", re: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PRIVATE) PRIVATE KEY-----/g },
];

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

function asInt(raw, fallback) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseCliArgs(argv = process.argv) {
  const root = path.resolve(getArg("--root", argv) || process.cwd());
  const maxFileBytes = asInt(getArg("--maxFileBytes", argv), DEFAULT_MAX_FILE_BYTES);
  const excludeArg = getArg("--excludeDirs", argv);
  const excludeDirs = excludeArg
    ? new Set(
        excludeArg
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
      )
    : new Set(DEFAULT_EXCLUDE_DIRS);
  return {
    help: hasFlag("--help", argv) || hasFlag("-h", argv),
    jsonMode: hasFlag("--json", argv),
    includeTests: hasFlag("--includeTests", argv),
    root,
    maxFileBytes,
    excludeDirs,
  };
}

function toDisplayPath(absPath, root) {
  const rel = path.relative(root, absPath);
  return rel && !rel.startsWith("..") ? rel : absPath;
}

function collectFiles(root, excludeDirs) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excludeDirs.has(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      files.push(full);
    }
  }
  return files;
}

function isLikelyBinary(content) {
  // Fast binary heuristic: NUL byte usually indicates non-text content.
  return content.includes("\u0000");
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function isTestFile(filePath) {
  const name = path.basename(filePath);
  return /\.test\.[cm]?[jt]sx?$/.test(name) || /\.spec\.[cm]?[jt]sx?$/.test(name);
}

export function scanForSecrets({ root, maxFileBytes, excludeDirs, includeTests = false }) {
  const findings = [];
  const files = collectFiles(root, excludeDirs);
  for (const file of files) {
    if (!includeTests && isTestFile(file)) continue;
    const stat = fs.statSync(file);
    if (stat.size > maxFileBytes) continue;
    const raw = fs.readFileSync(file, "utf8");
    if (isLikelyBinary(raw)) continue;
    for (const rule of SECRET_RULES) {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(raw)) !== null) {
        findings.push({
          rule: rule.id,
          file: toDisplayPath(file, root),
          line: lineNumberAt(raw, match.index),
          snippet: match[0].slice(0, 120),
        });
      }
    }
  }
  return { scanned_files: files.length, findings };
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/security-secrets-scan.mjs [--root <path>] [--maxFileBytes <n>] [--excludeDirs d1,d2] [--includeTests] [--json]",
      "",
      "Fails with exit code 1 when high-confidence secret patterns are found.",
      "",
    ].join("\n")
  );
}

export function cliMain(argv = process.argv) {
  const cli = parseCliArgs(argv);
  if (cli.help) {
    printHelp();
    return 0;
  }
  const result = scanForSecrets(cli);
  if (cli.jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.findings.length === 0) {
    process.stdout.write(`secrets-scan: PASS (scanned_files=${result.scanned_files})\n`);
  } else {
    process.stderr.write(`secrets-scan: FAIL (findings=${result.findings.length})\n`);
    for (const finding of result.findings) {
      process.stderr.write(`- ${finding.rule} ${finding.file}:${finding.line}\n`);
    }
  }
  return result.findings.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exit(cliMain(process.argv));
}
