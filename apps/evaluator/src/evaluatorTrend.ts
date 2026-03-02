import path from "node:path";
import { emitStructuredLog } from "cli-utils";
import { TrendStore, resolveDbPath } from "trending";
import type { CompareReport } from "./htmlReport";
import type { AgentResponse } from "shared-types";

export async function ingestTrendIfEnabled(params: {
  enabled: boolean;
  trendDbArg?: string;
  report: CompareReport;
  reportId: string;
  reportDirAbs: string;
  newDirAbs: string;
  newRunMeta: Record<string, unknown>;
  responses: Record<string, AgentResponse>;
}): Promise<void> {
  const { enabled, trendDbArg, report, reportId, reportDirAbs, newDirAbs, newRunMeta, responses } = params;
  if (!enabled) return;

  try {
    const dbPath = resolveDbPath(trendDbArg ?? undefined);
    const store = TrendStore.open({ dbPath });
    const flakinessPath = path.join(newDirAbs, "flakiness.json");
    const result = store.ingest(report, {
      runMeta: newRunMeta,
      flakinessPath,
      ingestMode: "auto",
      responses,
      sourcePath: path.join(reportDirAbs, "compare-report.json"),
    });
    if (result.inserted) {
      const tokenMsg = result.tokenCoverage ? ` (tokens: ${result.tokenCoverage})` : "";
      console.log(`Trend: ingested ${result.casesIngested} cases → ${dbPath}${tokenMsg}`);
      emitStructuredLog("evaluator", "info", "trend_ingest", {
        report_id: reportId,
        db_path: dbPath,
        cases_ingested: result.casesIngested,
        token_coverage: result.tokenCoverage,
      });
    }
    store.close();
  } catch (err) {
    console.warn(`Trend ingest skipped: ${err instanceof Error ? err.message : String(err)}`);
    emitStructuredLog("evaluator", "warn", "trend_ingest_skipped", {
      report_id: reportId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

