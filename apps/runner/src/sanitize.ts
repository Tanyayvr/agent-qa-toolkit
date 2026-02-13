// apps/runner/src/sanitize.ts
//
// Minimal redaction utilities for runner artifacts.

export type RedactionPreset = "none" | "internal_only" | "transferable";

function maskString(input: string, preset: RedactionPreset): string {
  if (preset === "none") return input;
  let s = input;
  s = s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted_email]");
  s = s.replace(/\bCUST-\d+\b/g, "CUST-REDACTED");
  s = s.replace(/\bT-\d+\b/g, "T-REDACTED");
  s = s.replace(/\bMSG-\d+\b/g, "MSG-REDACTED");
  if (preset === "transferable") {
    s = s.replace(/\b(sk|api|token|secret)[-_]?[a-z0-9]{8,}\b/gi, "[redacted_token]");
  }
  return s;
}

export function sanitizeValue<T>(value: T, preset: RedactionPreset): T {
  if (preset === "none") return value;
  if (typeof value === "string") return maskString(value, preset) as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, preset)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v, preset);
    }
    return out as T;
  }
  return value;
}
