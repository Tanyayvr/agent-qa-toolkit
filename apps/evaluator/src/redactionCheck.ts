// apps/evaluator/src/redactionCheck.ts
//
// Redaction verification helpers used by evaluator strictRedaction gate.

import { collectCustomRedactionPatternHits, findValidIbanMatches } from "redaction";

export type RedactionPreset = "internal_only" | "transferable" | "transferable_extended";

export function findUnredactedMarkers(
  text: string,
  preset: RedactionPreset,
  processEnv?: NodeJS.ProcessEnv
): string[] {
  const markers: Array<{ name: string; re: RegExp }> = [
    { name: "email", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
    { name: "customer_id", re: /\bCUST-\d+\b/ },
    { name: "ticket_id", re: /\bT-\d+\b/ },
    { name: "message_id", re: /\bMSG-\d+\b/ },
  ];
  if (preset === "transferable" || preset === "transferable_extended") {
    markers.push({ name: "token", re: /\b(sk|api|token|secret)[-_]?[a-z0-9]{8,}\b/i });
  }
  if (preset === "transferable_extended") {
    markers.push({ name: "ip", re: /\b\d{1,3}(?:\.\d{1,3}){3}\b/ });
    markers.push({ name: "phone", re: /(?:\+?\d[\d\s().-]{7,}\d)/ });
    markers.push({ name: "credit_card", re: /\b(?:\d[ -]*?){13,19}\b/ });
    markers.push({ name: "jwt", re: /\beyJ[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\b/ });
    markers.push({ name: "bic_swift", re: /\b(?:BIC|SWIFT)\b[:=\s-]*[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/i });
  }
  const hits: string[] = [];
  for (const m of markers) {
    if (m.re.test(text)) hits.push(m.name);
  }
  if (preset === "transferable_extended") {
    if (findValidIbanMatches(text).length > 0) {
      hits.push("iban");
    }
  }
  hits.push(
    ...collectCustomRedactionPatternHits(
      text,
      preset,
      processEnv ? { processEnv } : undefined
    )
  );
  return [...new Set(hits)];
}
