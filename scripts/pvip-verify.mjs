#!/usr/bin/env node
import { readFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import Ajv from "ajv";

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function sha256File(absPath) {
  const buf = readFileSync(absPath);
  return createHash("sha256").update(buf).digest("hex");
}

const reportDir = getArg("--reportDir");
if (!reportDir) {
  console.error("Usage: node scripts/pvip-verify.mjs --reportDir <path>");
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

const reportPath = path.join(absReport, "compare-report.json");
const manifestPath = path.join(absReport, "artifacts", "manifest.json");
const schemaPath = path.join(process.cwd(), "schemas", "compare-report-v5.schema.json");

if (!existsSync(reportPath)) {
  console.error("Missing compare-report.json");
  process.exit(1);
}
if (!existsSync(manifestPath)) {
  console.error("Missing artifacts/manifest.json");
  process.exit(1);
}
if (!existsSync(schemaPath)) {
  console.error("Missing schemas/compare-report-v5.schema.json");
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf-8"));
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(schema);
const ok = validate(report);
if (!ok) {
  console.error("Schema validation failed:", validate.errors || []);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
if (!manifest.items || !Array.isArray(manifest.items)) {
  console.error("Invalid manifest.items");
  process.exit(1);
}

let missing = 0;
let hashMismatch = 0;
for (const it of manifest.items) {
  if (!it.rel_path || typeof it.rel_path !== "string") continue;
  const abs = path.join(absReport, it.rel_path);
  if (!existsSync(abs)) {
    missing++;
    continue;
  }
  if (it.sha256) {
    const h = sha256File(abs);
    if (h !== it.sha256) hashMismatch++;
  }
}

if (missing > 0) {
  console.error(`Missing manifest assets: ${missing}`);
  process.exit(1);
}
if (hashMismatch > 0) {
  console.error(`Manifest hash mismatches: ${hashMismatch}`);
  process.exit(1);
}

console.log("OK: schema + manifest assets verified");
