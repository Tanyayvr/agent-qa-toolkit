import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createPublicKey, verify } from "node:crypto";

export type LicenseType = "monthly" | "pack";

export type LicenseLimits = {
  max_runs_per_month?: number;
  max_runs_total?: number;
};

export type License = {
  version: 1;
  product: "agent-qa-toolkit";
  license_id: string;
  customer: string;
  issued_at: number;
  expires_at: number;
  type: LicenseType;
  limits: LicenseLimits;
};

export type LicenseBundle = {
  license: License;
  signature: string; // base64
};

export type LicenseUsage = {
  license_id: string;
  started_at: number;
  last_run_at: number;
  month: string;
  runs_this_month: number;
  runs_total: number;
};

const LICENSE_REQUIRED_ENV = "AQ_LICENSE_REQUIRED";
const LICENSE_PUBLIC_KEY_ENV = "AQ_LICENSE_PUBLIC_KEY";

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodeB64(input: string): Buffer {
  return Buffer.from(input, "base64");
}

function nowMonth(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isTruthy(val: string | undefined): boolean {
  return val === "1" || val === "true" || val === "yes";
}

function validateLicense(license: License): void {
  if (!license) throw new Error("License is missing.");
  if (license.version !== 1) throw new Error(`Unsupported license version: ${license.version}`);
  if (license.product !== "agent-qa-toolkit") throw new Error(`Invalid product: ${license.product}`);
  if (!license.license_id) throw new Error("License missing license_id.");
  if (!license.customer) throw new Error("License missing customer.");
  if (!Number.isFinite(license.issued_at)) throw new Error("License missing issued_at.");
  if (!Number.isFinite(license.expires_at)) throw new Error("License missing expires_at.");
  if (license.type !== "monthly" && license.type !== "pack") throw new Error(`Invalid license type: ${license.type}`);
  if (!license.limits) throw new Error("License missing limits.");
  if (license.type === "monthly" && !Number.isFinite(license.limits.max_runs_per_month)) {
    throw new Error("Monthly license requires limits.max_runs_per_month.");
  }
  if (license.type === "pack" && !Number.isFinite(license.limits.max_runs_total)) {
    throw new Error("Pack license requires limits.max_runs_total.");
  }
}

function verifySignature(license: License, signatureB64: string, publicKeyB64: string): boolean {
  const msg = Buffer.from(canonicalize(license), "utf-8");
  const sig = decodeB64(signatureB64);
  const key = createPublicKey({ key: decodeB64(publicKeyB64), format: "der", type: "spki" });
  return verify(null, msg, key, sig);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function usagePathFor(licensePath: string): string {
  return path.join(path.dirname(licensePath), "usage.json");
}

async function loadLicenseBundle(licensePath: string): Promise<LicenseBundle> {
  const raw = await readJsonFile<License | LicenseBundle>(licensePath);
  if (raw && typeof raw === "object" && "license" in raw && "signature" in raw) {
    const bundle = raw as LicenseBundle;
    return { license: bundle.license, signature: bundle.signature };
  }
  const signaturePath = licensePath.replace(/\.json$/i, ".sig");
  let signature = "";
  try {
    signature = (await readFile(signaturePath, "utf-8")).trim();
  } catch {
    // fallback: if no .sig file, error below
  }
  if (!signature) {
    throw new Error(`Missing signature file: ${signaturePath}`);
  }
  return { license: raw as License, signature };
}

export async function checkLicenseOnly(opts: {
  licensePath?: string | null;
  nowMs?: number;
  publicKeyB64?: string | null;
  required?: boolean;
}): Promise<License | null> {
  const required = opts.required ?? isTruthy(process.env[LICENSE_REQUIRED_ENV]);
  const licensePath = opts.licensePath ?? process.env.AQ_LICENSE_PATH;
  if (!licensePath) {
    if (required) throw new Error("License required. Provide --license or AQ_LICENSE_PATH.");
    return null;
  }
  const publicKeyB64 = opts.publicKeyB64 ?? process.env[LICENSE_PUBLIC_KEY_ENV];
  if (!publicKeyB64) throw new Error(`Missing ${LICENSE_PUBLIC_KEY_ENV}.`);

  const { license, signature } = await loadLicenseBundle(licensePath);
  validateLicense(license);
  const ok = verifySignature(license, signature, publicKeyB64);
  if (!ok) throw new Error("Invalid license signature.");

  const nowMs = opts.nowMs ?? Date.now();
  if (nowMs > license.expires_at) throw new Error("License expired.");

  return license;
}

export async function consumeRunOrThrow(opts: {
  licensePath?: string | null;
  nowMs?: number;
  publicKeyB64?: string | null;
  required?: boolean;
}): Promise<License | null> {
  const license = await checkLicenseOnly(opts);
  if (!license) return null;
  const licensePath = opts.licensePath ?? process.env.AQ_LICENSE_PATH;
  if (!licensePath) return null;

  const nowMs = opts.nowMs ?? Date.now();
  const month = nowMonth(nowMs);
  const usagePath = usagePathFor(licensePath);
  let usage: LicenseUsage;
  try {
    usage = await readJsonFile<LicenseUsage>(usagePath);
  } catch {
    usage = {
      license_id: license.license_id,
      started_at: nowMs,
      last_run_at: nowMs,
      month,
      runs_this_month: 0,
      runs_total: 0
    };
  }

  if (usage.license_id !== license.license_id) {
    usage = {
      license_id: license.license_id,
      started_at: nowMs,
      last_run_at: nowMs,
      month,
      runs_this_month: 0,
      runs_total: 0
    };
  }

  if (usage.month !== month) {
    usage.month = month;
    usage.runs_this_month = 0;
  }

  if (license.type === "monthly") {
    const maxRuns = license.limits.max_runs_per_month ?? 0;
    if (usage.runs_this_month + 1 > maxRuns) {
      throw new Error("Monthly run limit exceeded.");
    }
    usage.runs_this_month += 1;
  }

  if (license.type === "pack") {
    const maxRuns = license.limits.max_runs_total ?? 0;
    if (usage.runs_total + 1 > maxRuns) {
      throw new Error("Pack run limit exceeded.");
    }
  }

  usage.runs_total += 1;
  usage.last_run_at = nowMs;

  await ensureDir(path.dirname(usagePath));
  await writeFile(usagePath, JSON.stringify(usage, null, 2) + "\n", "utf-8");

  return license;
}

export function licenseUsagePath(licensePath: string): string {
  return usagePathFor(licensePath);
}
