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
const jsonOut = process.argv.includes("--json");
const strict = process.argv.includes("--strict");
function outOk(msg, payload) {
  if (jsonOut) {
    console.log(JSON.stringify({ ok: true, message: msg, ...payload }));
  } else {
    console.log(msg);
  }
}

function outFail(msg, payload) {
  if (jsonOut) {
    console.error(JSON.stringify({ ok: false, message: msg, ...payload }));
  } else {
    console.error(msg);
  }
}

if (!reportDir) {
  outFail("Usage: node scripts/pvip-verify.mjs --reportDir <path> [--strict] [--json]");
  process.exit(2);
}

const absReport = path.resolve(reportDir);
try {
  const st = statSync(absReport);
  if (!st.isDirectory()) throw new Error("not a dir");
} catch {
  outFail(`reportDir not found or not a directory: ${absReport}`);
  process.exit(2);
}

const reportPath = path.join(absReport, "compare-report.json");
const manifestPath = path.join(absReport, "artifacts", "manifest.json");
const schemaPath = path.join(process.cwd(), "schemas", "compare-report-v5.schema.json");

if (!existsSync(reportPath)) {
  outFail("Missing compare-report.json");
  process.exit(1);
}
if (!existsSync(manifestPath)) {
  outFail("Missing artifacts/manifest.json");
  process.exit(1);
}
if (!existsSync(schemaPath)) {
  outFail("Missing schemas/compare-report-v5.schema.json");
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf-8"));
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(schema);
const ok = validate(report);
if (!ok) {
  outFail("Schema validation failed", { errors: validate.errors || [] });
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
if (!manifest.items || !Array.isArray(manifest.items)) {
  outFail("Invalid manifest.items");
  process.exit(1);
}

if (report.quality_flags) {
  if (report.quality_flags.portable_paths !== true) {
    outFail("portable_paths is false");
    if (strict) process.exit(1);
  }
  if ((report.quality_flags.path_violations_count || 0) > 0) {
    outFail("path_violations_count > 0");
    if (strict) process.exit(1);
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
    outFail(`embedded_manifest_index mismatch: ${mismatch}`);
    if (strict) process.exit(1);
  }
}

let missing = 0;
let hashMismatch = 0;
for (const it of manifest.items) {
  if (!it.rel_path || typeof it.rel_path !== "string") continue;
  if (!isPortableHref(it.rel_path) || !pathInsideReport(absReport, it.rel_path)) {
    outFail(`Non-portable or out-of-root path: ${it.rel_path}`);
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
  outFail(`Missing manifest assets: ${missing}`);
  process.exit(1);
}
if (hashMismatch > 0) {
  outFail(`Manifest hash mismatches: ${hashMismatch}`);
  outFail("Integrity check failed: files were modified after bundle generation.");
  process.exit(1);
}

outOk("OK: schema + manifest assets verified");
