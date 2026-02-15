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

function isPortableHref(href) {
  if (typeof href !== "string" || !href.length) return false;
  if (href.includes("://")) return false;
  if (href.startsWith("/") || href.startsWith("\\")) return false;
  if (href.includes("..")) return false;
  return true;
}

function pathInsideReport(reportDir, rel) {
  const abs = path.resolve(reportDir, rel);
  const base = path.resolve(reportDir);
  return abs.startsWith(base + path.sep);
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

if (report.quality_flags) {
  if (report.quality_flags.portable_paths !== true) {
    console.error("portable_paths is false");
    process.exit(1);
  }
  if ((report.quality_flags.path_violations_count || 0) > 0) {
    console.error("path_violations_count > 0");
    process.exit(1);
  }
}

const index = report.embedded_manifest_index;
if (index && index.items && Array.isArray(index.items)) {
  const map = new Map();
  for (const it of manifest.items) {
    map.set(String(it.manifest_key), String(it.rel_path));
  }
  let mismatch = 0;
  for (const it of index.items) {
    const key = String(it.manifest_key || "");
    const rel = String(it.rel_path || "");
    if (!key || !rel) continue;
    if (map.get(key) !== rel) mismatch++;
  }
  if (mismatch > 0) {
    console.error(`embedded_manifest_index mismatch: ${mismatch}`);
    process.exit(1);
  }
}

let missing = 0;
let hashMismatch = 0;
for (const it of manifest.items) {
  if (!it.rel_path || typeof it.rel_path !== "string") continue;
  if (!isPortableHref(it.rel_path) || !pathInsideReport(absReport, it.rel_path)) {
    console.error(`Non-portable or out-of-root path: ${it.rel_path}`);
    process.exit(1);
  }
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
