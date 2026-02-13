// apps/evaluator/src/redactionCheck.ts
//
// Redaction verification helpers used by evaluator strictRedaction gate.

export type RedactionPreset = "internal_only" | "transferable";

export function findUnredactedMarkers(text: string, preset: RedactionPreset): string[] {
  const markers: Array<{ name: string; re: RegExp }> = [
    { name: "email", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
    { name: "customer_id", re: /\bCUST-\d+\b/ },
    { name: "ticket_id", re: /\bT-\d+\b/ },
    { name: "message_id", re: /\bMSG-\d+\b/ },
  ];
  if (preset === "transferable") {
    markers.push({ name: "token", re: /\b(sk|api|token|secret)[-_]?[a-z0-9]{8,}\b/i });
  }
  const hits: string[] = [];
  for (const m of markers) {
    if (m.re.test(text)) hits.push(m.name);
  }
  return hits;
}
