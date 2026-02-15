import { readFile } from "node:fs/promises";
import { createPublicKey, verify } from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",")}}`;
  }
  return JSON.stringify(value);
}

const licensePath = process.argv[2];
if (!licensePath) {
  console.error("Usage: node scripts/license-verify.mjs <license.json>");
  process.exit(2);
}

const pubB64 = process.env.AQ_LICENSE_PUBLIC_KEY;
if (!pubB64) {
  console.error("Missing AQ_LICENSE_PUBLIC_KEY (base64 DER SPKI)");
  process.exit(2);
}

const raw = await readFile(licensePath, "utf-8");
const license = JSON.parse(raw);
const sigPath = licensePath.replace(/\.json$/i, ".sig");
const sigB64 = (await readFile(sigPath, "utf-8")).trim();

const msg = Buffer.from(canonicalize(license), "utf-8");
const sig = Buffer.from(sigB64, "base64");
const key = createPublicKey({ key: Buffer.from(pubB64, "base64"), format: "der", type: "spki" });

const ok = verify(null, msg, key, sig);
if (!ok) {
  console.error("INVALID: signature does not match");
  process.exit(1);
}

const now = Date.now();
if (now > license.expires_at) {
  console.error("INVALID: license expired");
  process.exit(1);
}

console.log("OK: license valid");
