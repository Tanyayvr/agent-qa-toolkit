import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign as signMsg } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { checkLicenseOnly, consumeRunOrThrow } from "./index";

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ":" + canonicalize(rec[k])).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function setupLicense(license: Record<string, unknown>) {
  const dir = path.join(os.tmpdir(), `aq-license-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  const licensePath = path.join(dir, "license.json");
  const sigPath = path.join(dir, "license.sig");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });
  const msg = Buffer.from(canonicalize(license), "utf-8");
  const sig = signMsg(null, msg, privateKey);
  await writeFile(licensePath, JSON.stringify(license, null, 2));
  await writeFile(sigPath, sig.toString("base64"));
  return { dir, licensePath, publicKeyB64: Buffer.from(pubDer).toString("base64"), privateKeyB64: Buffer.from(privDer).toString("base64") };
}

describe("aq-license", () => {
  it("valid monthly license consumes runs", async () => {
    const now = Date.now();
    const license = {
      version: 1,
      product: "agent-qa-toolkit",
      license_id: "LIC-1",
      customer: "Test",
      issued_at: now - 1000,
      expires_at: now + 100000,
      type: "monthly",
      limits: { max_runs_per_month: 2 },
    };
    const { dir, licensePath, publicKeyB64 } = await setupLicense(license);
    await consumeRunOrThrow({ licensePath, publicKeyB64, nowMs: now });
    await consumeRunOrThrow({ licensePath, publicKeyB64, nowMs: now });
    await expect(consumeRunOrThrow({ licensePath, publicKeyB64, nowMs: now })).rejects.toThrow("Monthly run limit exceeded");
    await rm(dir, { recursive: true, force: true });
  });

  it("pack license enforces total runs", async () => {
    const now = Date.now();
    const license = {
      version: 1,
      product: "agent-qa-toolkit",
      license_id: "LIC-2",
      customer: "Test",
      issued_at: now - 1000,
      expires_at: now + 100000,
      type: "pack",
      limits: { max_runs_total: 1 },
    };
    const { dir, licensePath, publicKeyB64 } = await setupLicense(license);
    await consumeRunOrThrow({ licensePath, publicKeyB64, nowMs: now });
    await expect(consumeRunOrThrow({ licensePath, publicKeyB64, nowMs: now })).rejects.toThrow("Pack run limit exceeded");
    await rm(dir, { recursive: true, force: true });
  });

  it("expired license fails", async () => {
    const now = Date.now();
    const license = {
      version: 1,
      product: "agent-qa-toolkit",
      license_id: "LIC-3",
      customer: "Test",
      issued_at: now - 2000,
      expires_at: now - 1000,
      type: "monthly",
      limits: { max_runs_per_month: 2 },
    };
    const { dir, licensePath, publicKeyB64 } = await setupLicense(license);
    await expect(checkLicenseOnly({ licensePath, publicKeyB64, nowMs: now })).rejects.toThrow("License expired");
    await rm(dir, { recursive: true, force: true });
  });
});
