import { readFile, writeFile } from "node:fs/promises";
import { createPrivateKey, sign } from "node:crypto";

const reportDir = process.argv[2];
if (!reportDir) {
  console.error("Usage: node scripts/manifest-sign.mjs <reportDir>");
  process.exit(2);
}

const privB64 = process.env.AQ_MANIFEST_PRIVATE_KEY;
if (!privB64) {
  console.error("Missing AQ_MANIFEST_PRIVATE_KEY (base64 DER PKCS8)");
  process.exit(2);
}

const manifestPath = reportDir.replace(/\/$/, "") + "/artifacts/manifest.json";
const raw = await readFile(manifestPath, "utf-8");
const msg = Buffer.from(raw, "utf-8");
const key = createPrivateKey({ key: Buffer.from(privB64, "base64"), format: "der", type: "pkcs8" });
const sig = sign(null, msg, key);
const sigPath = reportDir.replace(/\/$/, "") + "/artifacts/manifest.sig";
await writeFile(sigPath, sig.toString("base64") + "\n", "utf-8");
console.log(`Wrote manifest signature: ${sigPath}`);
