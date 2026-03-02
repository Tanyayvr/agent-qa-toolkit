import { readFileSync } from "node:fs";
import type { CompareReport, SecurityPack } from "./reportTypes";
import type { AgentResponse } from "shared-types";
import type Database from "better-sqlite3";
import { boolToInt, numOrNull, strOrNull } from "./utils";
import type { IngestMode, IngestResult } from "./types";

const RISK_LEVELS = new Set(["low", "medium", "high"]);
const GATE_RECS = new Set(["none", "require_approval", "block"]);
const CASE_STATUSES = new Set(["executed", "missing", "broken", "manual_unknown"]);

export interface IngestOptions {
  runMeta?: Record<string, unknown>;
  flakinessPath?: string;
  ingestMode?: IngestMode;
  replace?: boolean;
  responses?: Record<string, AgentResponse>;
  sourcePath?: string;
}

export interface FlakinessEntry {
  case_id: string;
  runs: number;
  baseline_pass_rate: number;
  new_pass_rate: number;
}

export interface FlakinessSummary {
  run_id: string;
  runs_per_case: number;
  cases: FlakinessEntry[];
}

export function readFlakinessIfExists(path: string): FlakinessSummary | null {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as FlakinessSummary;
  } catch {
    return null;
  }
}

export function extractRunId(report: CompareReport): string {
  const meta = report.meta as Record<string, unknown>;
  const runId = typeof meta.run_id === "string" ? meta.run_id : undefined;
  return runId ?? report.report_id;
}

export function extractTotalCases(report: CompareReport): number {
  const dc = (report.summary as Record<string, unknown>)?.data_coverage as Record<string, unknown> | undefined;
  if (dc && typeof dc.total_cases === "number") return dc.total_cases;
  return report.items.length;
}

function extractAdmissibilityKpi(report: CompareReport): {
  riskMassBefore: number | null;
  riskMassAfter: number | null;
  preActionEntropyRemoved: number | null;
  blockedCases: number | null;
  reconMinutesSavedTotal: number | null;
  reconMinutesSavedPerBlock: number | null;
} {
  const kpi = report.summary?.execution_quality?.admissibility_kpi;
  return {
    riskMassBefore: numOrNull(kpi?.risk_mass_before),
    riskMassAfter: numOrNull(kpi?.risk_mass_after),
    preActionEntropyRemoved: numOrNull(kpi?.pre_action_entropy_removed),
    blockedCases: numOrNull(kpi?.blocked_cases),
    reconMinutesSavedTotal: numOrNull(kpi?.reconstruction_minutes_saved_total),
    reconMinutesSavedPerBlock: numOrNull(kpi?.reconstruction_minutes_saved_per_block),
  };
}

function extractDataCoverageTotalCases(report: CompareReport): number | undefined {
  const summary = report.summary as Record<string, unknown> | undefined;
  const dc = summary?.data_coverage as Record<string, unknown> | undefined;
  return typeof dc?.total_cases === "number" ? dc.total_cases : undefined;
}

export function extractGitContext(runMeta: Record<string, unknown> | undefined): {
  commit: string | null;
  branch: string | null;
  dirty: boolean | null;
} {
  if (!runMeta) return { commit: null, branch: null, dirty: null };
  const commit = typeof runMeta.git_commit === "string" ? runMeta.git_commit : null;
  const branch = typeof runMeta.git_branch === "string" ? runMeta.git_branch : null;
  const dirty = typeof runMeta.git_dirty === "boolean" ? runMeta.git_dirty : null;
  return { commit, branch, dirty };
}

export function validateEnum(value: string, allowed: Set<string>, field: string): string {
  const normalized = value.toLowerCase().trim();
  if (!allowed.has(normalized)) {
    throw new Error(`Invalid ${field}: "${value}". Allowed: ${[...allowed].join("|")}`);
  }
  return normalized;
}

export function deriveCaseStatusFromItem(item: CompareReport["items"][number]): string {
  const raw = typeof item.case_status === "string" ? item.case_status.toLowerCase().trim() : undefined;
  if (raw === "executed") return "executed";
  if (raw === "missing") return "missing";
  if (raw === "broken") return "broken";
  if (raw === "filtered_out") return "manual_unknown";

  const baselineStatus = item.data_availability?.baseline?.status;
  const newStatus = item.data_availability?.new?.status;
  if (baselineStatus === "broken" || newStatus === "broken") return "broken";
  if (baselineStatus === "missing" || newStatus === "missing") return "missing";
  if (item.baseline_pass === null && item.new_pass === null) return "manual_unknown";
  return "executed";
}

function normalizeCaseStatus(status: string): string {
  const normalized = status.toLowerCase().trim();
  if (!CASE_STATUSES.has(normalized)) return "manual_unknown";
  return normalized;
}

export function countSignalsBySeverity(pack: SecurityPack | undefined): {
  low: number;
  medium: number;
  high: number;
  critical: number;
} {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  if (!pack?.new?.signals) return counts;
  for (const sig of pack.new.signals) {
    if (sig.severity in counts) {
      counts[sig.severity as keyof typeof counts] += 1;
    }
  }
  return counts;
}

export function extractTokenData(resp: AgentResponse | undefined): {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  tool_call_count: number | null;
  loop_detected: 0 | 1 | null;
} {
  if (!resp?.token_usage) {
    return {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      tool_call_count: null,
      loop_detected: null,
    };
  }
  const tu = resp.token_usage;
  return {
    input_tokens: numOrNull(tu.input_tokens),
    output_tokens: numOrNull(tu.output_tokens),
    total_tokens: numOrNull(tu.total_tokens),
    tool_call_count: numOrNull(tu.tool_call_count),
    loop_detected: boolToInt(tu.loop_detected),
  };
}

export function buildResponseMap(
  responses: Record<string, AgentResponse> | undefined,
  reportItems: CompareReport["items"]
): { map: Map<string, AgentResponse>; coverage: string } {
  if (!responses) return { map: new Map(), coverage: "none (no responses provided)" };
  const map = new Map<string, AgentResponse>();
  let matched = 0;
  let unmatched = 0;
  for (const item of reportItems) {
    const resp = responses[item.case_id];
    if (resp) {
      map.set(item.case_id, resp);
      matched++;
    } else {
      unmatched++;
    }
  }
  const total = reportItems.length;
  const coverage = `${matched}/${total} cases matched` + (unmatched > 0 ? ` (${unmatched} without token data)` : "");
  return { map, coverage };
}

export function ingestReport(params: {
  db: Database.Database;
  report: CompareReport;
  options?: IngestOptions;
  stmtInsertRun: Database.Statement;
  stmtInsertCase: Database.Statement;
  stmtDeleteRun: Database.Statement;
  stmtCountCases: Database.Statement;
  stmtCountGarbage: Database.Statement;
}): IngestResult {
  const { db, report, options, stmtInsertRun, stmtInsertCase, stmtDeleteRun, stmtCountCases, stmtCountGarbage } = params;
  const mode: IngestMode = options?.ingestMode ?? "auto";
  const generatedAt = report.meta.generated_at;
  const kpi = extractAdmissibilityKpi(report);
  const { commit, branch, dirty } = extractGitContext(options?.runMeta);
  const flakiness = options?.flakinessPath ? readFlakinessIfExists(options.flakinessPath) : null;
  const flakinessMap = new Map(flakiness?.cases?.map((f) => [f.case_id, f]) ?? []);
  const { map: respMap, coverage: tokenCoverage } = buildResponseMap(options?.responses, report.items);

  const result = db.transaction(() => {
    if (options?.replace) stmtDeleteRun.run(report.report_id);

    const ins = stmtInsertRun.run({
      report_id: report.report_id,
      run_id: extractRunId(report),
      ingest_mode: mode,
      ingested_at: Date.now(),
      generated_at: generatedAt,
      toolkit_version: report.meta.toolkit_version,
      spec_version: report.meta.spec_version,
      agent_id: strOrNull(report.environment?.agent_id),
      model: strOrNull(report.environment?.model),
      prompt_version: strOrNull(report.environment?.prompt_version),
      tools_version: strOrNull(report.environment?.tools_version),
      git_commit: strOrNull(commit),
      git_branch: strOrNull(branch),
      git_dirty: boolToInt(dirty),
      total_cases: mode === "auto" ? (extractDataCoverageTotalCases(report) ?? extractTotalCases(report)) : extractTotalCases(report),
      baseline_pass: report.summary.baseline_pass,
      new_pass: report.summary.new_pass,
      regressions: report.summary.regressions,
      improvements: report.summary.improvements,
      source_path: strOrNull(options?.sourcePath),
      kpi_risk_mass_before: kpi.riskMassBefore,
      kpi_risk_mass_after: kpi.riskMassAfter,
      kpi_pre_action_entropy_removed: kpi.preActionEntropyRemoved,
      kpi_blocked_cases: kpi.blockedCases,
      kpi_recon_minutes_saved_total: kpi.reconMinutesSavedTotal,
      kpi_recon_minutes_saved_per_block: kpi.reconMinutesSavedPerBlock,
    });
    if (ins.changes === 0) {
      return {
        inserted: false,
        reportId: report.report_id,
        runId: extractRunId(report),
        casesIngested: 0,
        tokenCoverage,
      };
    }

    let count = 0;
    for (const item of report.items) {
      const sec = countSignalsBySeverity(item.security);
      const fl = flakinessMap.get(item.case_id);
      const td = extractTokenData(respMap.get(item.case_id));
      const riskLevel = validateEnum(item.risk_level, RISK_LEVELS, "risk_level");
      const gateRec = validateEnum(item.gate_recommendation, GATE_RECS, "gate_recommendation");
      const caseStatus = deriveCaseStatusFromItem(item);
      const normalizedStatus = normalizeCaseStatus(caseStatus);
      if (normalizedStatus === "manual_unknown" && caseStatus !== "manual_unknown" && mode !== "auto") {
        // Manual ingest may include custom/invalid statuses; normalize + warn.
        console.warn(`Trend ingest: invalid case_status "${caseStatus}" -> manual_unknown`);
      }

      stmtInsertCase.run({
        report_id: report.report_id,
        case_id: item.case_id,
        suite: strOrNull(item.suite),
        case_status: normalizedStatus,
        baseline_pass: boolToInt(item.baseline_pass),
        new_pass: boolToInt(item.new_pass),
        risk_level: riskLevel,
        gate_recommendation: gateRec,
        root_cause: strOrNull(item.new_root),
        input_tokens: td.input_tokens,
        output_tokens: td.output_tokens,
        total_tokens: td.total_tokens,
        tool_call_count: td.tool_call_count,
        loop_detected: td.loop_detected,
        sec_low: sec.low,
        sec_medium: sec.medium,
        sec_high: sec.high,
        sec_critical: sec.critical,
        pass_rate: fl?.new_pass_rate ?? null,
        run_count: fl?.runs ?? null,
        generated_at: generatedAt,
      });
      count++;
    }

    const actual = (stmtCountCases.get(report.report_id) as { c: number }).c;
    if (actual !== count) {
      throw new Error(`Count: ${actual} ≠ ${count}. Rolled back.`);
    }

    const garbage = (stmtCountGarbage.get(report.report_id) as { c: number }).c;
    if (garbage > 0) {
      throw new Error(`${garbage} rows have NULL in required fields. Rolled back.`);
    }

    return {
      inserted: true,
      reportId: report.report_id,
      runId: extractRunId(report),
      casesIngested: count,
      tokenCoverage,
    };
  })();

  return result;
}
