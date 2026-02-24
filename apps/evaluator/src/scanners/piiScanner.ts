import type { AgentResponse } from "shared-types";
import type { SecuritySignal } from "../htmlReport";
import type { SecurityScanner } from "../securityScanner";

export type PiiPattern = {
  kind: "pii_in_output" | "secret_in_output";
  regex: RegExp;
  severity: SecuritySignal["severity"];
  label: string;
  luhn?: boolean;
};

type PiiScannerOptions = {
  maxSignals: number;
  maxTextBytes: number;
  patterns: PiiPattern[];
};

const DEFAULT_PATTERNS: PiiPattern[] = [
  { kind: "pii_in_output", regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, severity: "low", label: "email" },
  { kind: "pii_in_output", regex: /\b(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, severity: "medium", label: "phone" },
  { kind: "pii_in_output", regex: /\b\d{3}-\d{2}-\d{4}\b/g, severity: "high", label: "ssn" },
  { kind: "pii_in_output", regex: /\b\d{12,19}\b/g, severity: "high", label: "credit_card", luhn: true },
  { kind: "pii_in_output", regex: /\b[A-Z0-9]{2}\d{7}\b/gi, severity: "critical", label: "passport" },
  { kind: "pii_in_output", regex: /\b(?:\d{10}|\d{12})\b/g, severity: "medium", label: "inn" },
  { kind: "secret_in_output", regex: /\b(api[_-]?key|secret|token)\b[:=\s]+[A-Za-z0-9._-]{8,}/gi, severity: "medium", label: "secret_like" },
];

const DEFAULTS: PiiScannerOptions = {
  maxSignals: 10,
  maxTextBytes: 200_000,
  patterns: DEFAULT_PATTERNS,
};

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i]!, 10);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function maskValue(v: string): string {
  if (v.length <= 4) return "****";
  return `${v.slice(0, 4)}****`;
}

function collectText(resp: AgentResponse, maxBytes: number): { text: string; fields: string[] } {
  const fields: string[] = [];
  const parts: string[] = [];

  if (resp.final_output?.content_type === "text") {
    parts.push(String(resp.final_output.content ?? ""));
    fields.push("final_output");
  } else if (resp.final_output?.content_type === "json") {
    try {
      parts.push(JSON.stringify(resp.final_output.content ?? {}));
      fields.push("final_output");
    } catch {
      // ignore
    }
  }

  const ev = Array.isArray(resp.events) ? resp.events : [];
  for (const e of ev) {
    if (e.type === "tool_result") {
      if (typeof e.payload_summary === "string") {
        parts.push(e.payload_summary);
        fields.push("tool_result.payload_summary");
      } else if (e.payload_summary && typeof e.payload_summary === "object") {
        try {
          parts.push(JSON.stringify(e.payload_summary));
          fields.push("tool_result.payload_summary");
        } catch {
          // ignore
        }
      }
    }
  }

  let text = parts.join("\n");
  if (text.length > maxBytes) text = text.slice(0, maxBytes);
  return { text, fields };
}

export function createPiiScanner(opts?: Partial<PiiScannerOptions>): SecurityScanner {
  const cfg = { ...DEFAULTS, ...(opts || {}) };
  return {
    name: "pii_scanner",
    scan: (resp: AgentResponse): SecuritySignal[] => {
      const { text, fields } = collectText(resp, cfg.maxTextBytes);
      if (!text) return [];
      const out: SecuritySignal[] = [];

      for (const p of cfg.patterns) {
        let m: RegExpExecArray | null;
        const re = new RegExp(p.regex.source, p.regex.flags);
        while ((m = re.exec(text))) {
          if (out.length >= cfg.maxSignals) break;
          const raw = m[0] ?? "";
          if (p.luhn && !luhnCheck(raw.replace(/\D/g, ""))) continue;
          const confidence: SecuritySignal["confidence"] = p.luhn ? "high" : "medium";
          out.push({
            kind: p.kind,
            severity: p.severity,
            confidence,
            title: p.kind === "pii_in_output" ? "PII detected in output" : "Secret-like value detected",
            message: `${p.label} detected`,
            evidence_refs: [],
            details: { fields, sample: maskValue(raw) },
          });
        }
      }

      return out;
    },
  };
}
