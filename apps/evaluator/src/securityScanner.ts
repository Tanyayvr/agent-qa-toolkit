// apps/evaluator/src/securityScanner.ts
import type { AgentResponse } from "shared-types";
import type { SecuritySignal } from "./htmlReport";

export type SecurityScanner = {
  name: string;
  scan: (resp: AgentResponse) => Promise<SecuritySignal[]> | SecuritySignal[];
};

export async function runSecurityScanners(
  resp: AgentResponse,
  scanners: SecurityScanner[] | undefined
): Promise<SecuritySignal[]> {
  if (!scanners || scanners.length === 0) return [];
  const out: SecuritySignal[] = [];
  for (const s of scanners) {
    const res = await s.scan(resp);
    if (Array.isArray(res) && res.length) out.push(...res);
  }
  return out;
}
