import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

const pubDer = publicKey.export({ type: "spki", format: "der" });
const privDer = privateKey.export({ type: "pkcs8", format: "der" });

const pubB64 = Buffer.from(pubDer).toString("base64");
const privB64 = Buffer.from(privDer).toString("base64");

console.log("AQ_LICENSE_PUBLIC_KEY (base64 DER SPKI):");
console.log(pubB64);
console.log("\nAQ_LICENSE_PRIVATE_KEY (base64 DER PKCS8):");
console.log(privB64);
