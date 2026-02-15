import { readFile, writeFile } from "node:fs/promises";
import { createPrivateKey, sign } from "node:crypto";

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
  console.error("Usage: node scripts/license-sign.mjs <license.json>");
  process.exit(2);
}

const privB64 = process.env.AQ_LICENSE_PRIVATE_KEY;
if (!privB64) {
  console.error("Missing AQ_LICENSE_PRIVATE_KEY (base64 DER PKCS8)");
  process.exit(2);
}

const raw = await readFile(licensePath, "utf-8");
const license = JSON.parse(raw);
const msg = Buffer.from(canonicalize(license), "utf-8");
const key = createPrivateKey({ key: Buffer.from(privB64, "base64"), format: "der", type: "pkcs8" });
const sig = sign(null, msg, key);
const sigB64 = sig.toString("base64");

const sigPath = licensePath.replace(/\.json$/i, ".sig");
await writeFile(sigPath, sigB64 + "\n", "utf-8");
console.log(`Wrote signature: ${sigPath}`);
