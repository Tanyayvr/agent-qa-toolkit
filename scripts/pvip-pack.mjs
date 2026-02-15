#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

const reportDir = getArg("--reportDir");
const outPath = getArg("--out");

if (!reportDir) {
  console.error("Usage: node scripts/pvip-pack.mjs --reportDir <path> [--out <tar.gz>]");
  process.exit(2);
}

const absReport = path.resolve(reportDir);
try {
  const st = statSync(absReport);
  if (!st.isDirectory()) throw new Error("not a dir");
} catch {
  console.error(`reportDir not found or not a directory: ${absReport}`);
  process.exit(2);
}

const defaultOut = `${absReport.replace(/\/+$/, "")}.tar.gz`;
const out = path.resolve(outPath || defaultOut);
const parent = path.dirname(absReport);
const name = path.basename(absReport);

const res = spawnSync("tar", ["-czf", out, "-C", parent, name], { stdio: "inherit" });
if (res.status !== 0) process.exit(res.status || 1);

console.log(`Packed: ${out}`);
