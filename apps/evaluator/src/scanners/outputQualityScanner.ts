import type { AgentResponse, RunEvent } from "shared-types";
import type { SecuritySignal } from "../htmlReport";
import type { SecurityScanner } from "../securityScanner";

export type PatternRule = { regex: RegExp; label: string };
export type ComplianceRule = { id: string; regex: RegExp; severity: SecuritySignal["severity"] };

type OutputQualityScannerOptions = {
  refusalPatterns: RegExp[];
  hallucinationCheck: boolean;
  biasPatterns: PatternRule[];
  complianceRules: ComplianceRule[];
  maxTextBytes: number;
  maxSignals: number;
};

const DEFAULTS: OutputQualityScannerOptions = {
  refusalPatterns: [
    /\bI cannot\b/i,
    /\bI'm unable\b/i,
    /\bAs an AI\b/i,
    /\bI apologize but\b/i,
  ],
  hallucinationCheck: true,
  biasPatterns: [],
  complianceRules: [],
  maxTextBytes: 200_000,
  maxSignals: 10,
};

function getOutputText(resp: AgentResponse, maxBytes: number): string {
  let text = "";
  if (resp.final_output?.content_type === "text") {
    text = String(resp.final_output.content ?? "");
  } else if (resp.final_output?.content_type === "json") {
    try {
      text = JSON.stringify(resp.final_output.content ?? {});
    } catch {
      text = "";
    }
  }
  if (text.length > maxBytes) text = text.slice(0, maxBytes);
  return text;
}

function getToolResults(events: RunEvent[]) {
  return events.filter((e) => e.type === "tool_result") as Array<{ status: string }>;
}

export function createOutputQualityScanner(opts?: Partial<OutputQualityScannerOptions>): SecurityScanner {
  const cfg = { ...DEFAULTS, ...(opts || {}) };
  return {
    name: "output_quality_scanner",
    scan: (resp: AgentResponse): SecuritySignal[] => {
      const out: SecuritySignal[] = [];
      const text = getOutputText(resp, cfg.maxTextBytes);

      if (text) {
        for (const re of cfg.refusalPatterns) {
          if (out.length >= cfg.maxSignals) break;
          if (re.test(text)) {
            out.push({
              kind: "model_refusal",
              severity: "low",
              confidence: "medium",
              title: "Model refusal detected",
              message: re.source,
              evidence_refs: [],
              details: { notes: text.slice(0, 200) },
            });
            break;
          }
        }

        for (const p of cfg.biasPatterns) {
          if (out.length >= cfg.maxSignals) break;
          if (p.regex.test(text)) {
            out.push({
              kind: "bias_detected",
              severity: "medium",
              confidence: "low",
              title: "Potential bias detected",
              message: p.label,
              evidence_refs: [],
              details: { notes: text.slice(0, 200) },
            });
          }
        }

        for (const r of cfg.complianceRules) {
          if (out.length >= cfg.maxSignals) break;
          if (r.regex.test(text)) {
            out.push({
              kind: "compliance_violation",
              severity: r.severity,
              confidence: "medium",
              title: "Compliance rule violation",
              message: r.id,
              evidence_refs: [],
              details: { notes: text.slice(0, 200) },
            });
          }
        }
      }

      if (cfg.hallucinationCheck) {
        const ev = Array.isArray(resp.events) ? resp.events : [];
        const results = getToolResults(ev);
        const hasErrors = results.some((r) => r.status !== "ok");
        if (hasErrors && text) {
          out.push({
            kind: "hallucination_in_output",
            severity: "medium",
            confidence: "low",
            title: "Potential hallucination after tool failure",
            message: "Tool result error/timeout but output appears confident",
            evidence_refs: [],
            details: { notes: text.slice(0, 200) },
          });
        }
      }

      return out;
    },
  };
}
