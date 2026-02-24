#!/usr/bin/env node
import { readFileSync, statSync, existsSync } from "node:fs";
import { createHash, createPublicKey, verify } from "node:crypto";
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

function collectHrefFields(reportObj) {
  const out = [];
  const stack = [reportObj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
      continue;
    }
    for (const [k, v] of Object.entries(cur)) {
      if (k.endsWith("_href") && typeof v === "string") out.push(v);
      else if (k.endsWith("_path") && typeof v === "string") out.push(v);
      else if (v && typeof v === "object") stack.push(v);
    }
  }
  return out;
}

const reportDir = getArg("--reportDir");
const jsonOut = process.argv.includes("--json");
const strictFlag = process.argv.includes("--strict");
const modeArg = getArg("--mode");
const mode = modeArg ?? (strictFlag ? "strict" : "pvip");

function out(ok, payload, msg) {
  if (jsonOut) {
    const body = { ok, ...payload };
    console.log(JSON.stringify(body));
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
  outFail("Usage: node scripts/pvip-verify.mjs --reportDir <path> [--mode aepf|pvip|strict] [--strict] [--json]");
  process.exit(2);
}

if (!['aepf','pvip','strict'].includes(mode)) {
  outFail(`Invalid --mode: ${mode}. Use aepf|pvip|strict`);
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
if (!existsSync(schemaPath)) {
  outFail("Missing schemas/compare-report-v5.schema.json");
  process.exit(1);
}

const checks = [];
function pushCheck(name, pass, details, message) {
  checks.push({ name, pass, ...(details ? { details } : {}), ...(message ? { message } : {}) });
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf-8"));
} catch (e) {
  pushCheck('schema_valid', false, null, `compare-report.json parse error: ${e?.message || String(e)}`);
  out(false, { mode, profiles_status: {}, checks }, 'FAIL: compare-report.json parse error');
  process.exit(1);
}

const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(schema);
const schemaOk = validate(report);
if (!schemaOk) {
  pushCheck('schema_valid', false, { errors: validate.errors || [] }, 'Schema validation failed');
} else {
  pushCheck('schema_valid', true);
}

let manifest = null;
let manifestRaw = null;
let manifestText = null;
if (mode !== 'aepf') {
  if (!existsSync(manifestPath)) {
    pushCheck('manifest_present', false, null, 'Missing artifacts/manifest.json');
  } else {
    manifestRaw = readFileSync(manifestPath);
    manifestText = manifestRaw.toString('utf-8');
    try {
      manifest = JSON.parse(manifestText);
      const okItems = manifest.items && Array.isArray(manifest.items);
      pushCheck('manifest_present', okItems, null, okItems ? undefined : 'Invalid manifest.items');
    } catch (e) {
      pushCheck('manifest_present', false, null, `manifest parse error: ${e?.message || String(e)}`);
    }
  }
}

// Embedded manifest index consistency
if (mode !== 'aepf' && manifestRaw && report.embedded_manifest_index && report.embedded_manifest_index.source_manifest_sha256) {
  const hash = createHash("sha256").update(manifestRaw).digest("hex");
  const okHash = hash === report.embedded_manifest_index.source_manifest_sha256;
  pushCheck('embedded_manifest_index', okHash, { expected: report.embedded_manifest_index.source_manifest_sha256, actual: hash }, okHash ? undefined : 'embedded_manifest_index.source_manifest_sha256 mismatch');
}

// Hrefs portability
if (mode !== 'aepf') {
  const hrefs = collectHrefFields(report);
  let bad = 0;
  for (const href of hrefs) {
    if (!isPortableHref(href) || !pathInsideReport(absReport, href)) {
      bad++;
    }
  }
  pushCheck('portable_hrefs', bad === 0, { count: bad }, bad === 0 ? undefined : 'Non-portable or out-of-root hrefs detected');
}

// Quality flags
if (mode !== 'aepf' && report.quality_flags) {
  const portableOk = report.quality_flags.portable_paths === true;
  const violations = report.quality_flags.path_violations_count || 0;
  const missingAssets = report.quality_flags.missing_assets_count || 0;
  pushCheck('quality_portable_paths', portableOk, null, portableOk ? undefined : 'portable_paths is false');
  if (mode === 'strict') {
    pushCheck('quality_zero_violations', violations === 0, { path_violations_count: violations }, violations === 0 ? undefined : 'path_violations_count > 0');
    pushCheck('quality_zero_missing_assets', missingAssets === 0, { missing_assets_count: missingAssets }, missingAssets === 0 ? undefined : 'missing_assets_count > 0');
  }
}

// Manifest integrity
if (mode !== 'aepf' && manifest && Array.isArray(manifest.items)) {
  let missing = 0;
  let hashMismatch = 0;
  let sizeMismatch = 0;
  let missingHash = 0;

  for (const it of manifest.items) {
    if (!it.rel_path || typeof it.rel_path !== 'string') continue;
    if (!isPortableHref(it.rel_path) || !pathInsideReport(absReport, it.rel_path)) {
      missing++;
      continue;
    }
    const abs = path.join(absReport, it.rel_path);
    if (!existsSync(abs)) {
      missing++;
      continue;
    }
    if (!it.sha256) missingHash++;
    if (typeof it.bytes === 'number') {
      try {
        const st = statSync(abs);
        if (st.isFile() && st.size !== it.bytes) sizeMismatch++;
      } catch {
        // ignore
      }
    }
    if (it.sha256) {
      const h = sha256File(abs);
      if (h !== it.sha256) hashMismatch++;
    }
  }

  pushCheck('manifest_missing_assets', missing === 0, { missing }, missing === 0 ? undefined : 'Missing manifest assets');
  pushCheck('manifest_hash_mismatch', hashMismatch === 0, { hashMismatch }, hashMismatch === 0 ? undefined : 'Manifest hash mismatches');
  if (mode === 'strict') {
    pushCheck('manifest_missing_hash', missingHash === 0, { missingHash }, missingHash === 0 ? undefined : 'Manifest items missing sha256');
    pushCheck('manifest_size_mismatch', sizeMismatch === 0, { sizeMismatch }, sizeMismatch === 0 ? undefined : 'Manifest size mismatches');
  }
}

// Signature check (strict only)
if (mode === 'strict') {
  const sigPath = path.join(absReport, 'artifacts', 'manifest.sig');
  if (!existsSync(sigPath)) {
    pushCheck('signature', false, null, 'manifest.sig is missing');
  } else if (!manifestText) {
    pushCheck('signature', false, null, 'manifest.json required for signature verification');
  } else {
    const pubB64 = process.env.AQ_MANIFEST_PUBLIC_KEY;
    if (!pubB64) {
      pushCheck('signature', false, null, 'AQ_MANIFEST_PUBLIC_KEY is not set');
    } else {
      const sig = readFileSync(sigPath, 'utf-8').trim();
      try {
        const key = createPublicKey({ key: Buffer.from(pubB64, 'base64'), format: 'der', type: 'spki' });
        const okSig = verify(null, Buffer.from(manifestText, 'utf-8'), key, Buffer.from(sig, 'base64'));
        pushCheck('signature', okSig, null, okSig ? undefined : 'manifest.sig verification failed');
      } catch (err) {
        pushCheck('signature', false, null, `manifest.sig verification error: ${err?.message || String(err)}`);
      }
    }
  }
}

const aepfFormat = checks.find(c => c.name === 'schema_valid')?.pass === true;
const pvipIntegrity = mode === 'aepf' ? 'skip' : (checks.every(c => c.pass) ? 'pass' : 'fail');
const signatureStatus = mode === 'strict'
  ? (checks.find(c => c.name === 'signature')?.pass ? 'pass' : 'fail')
  : 'skip';

const profiles_status = {
  aepf_format: aepfFormat ? 'pass' : 'fail',
  pvip_integrity: pvipIntegrity,
  signature: signatureStatus,
  governance: 'skip',
  certification: 'skip',
};

const ok = mode === 'aepf'
  ? aepfFormat
  : checks.every(c => c.pass);

if (ok) {
  out(true, { mode, profiles_status, checks }, 'OK: validation passed');
  process.exit(0);
}

out(false, { mode, profiles_status, checks }, 'FAIL: validation failed');
process.exit(1);
