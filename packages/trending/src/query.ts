import type Database from "better-sqlite3";
import type { CaseTrendRow, FlakyCaseRow, QueryOpts, RunTrendRow, TokenCoverage, TokenTrendRow } from "./types";

function rangeClause(opts: QueryOpts): { sql: string; params: Array<number | string> } {
  const since = opts.since ?? 0;
  const until = opts.until ?? Date.now();
  const clauses = ["r.generated_at >= ?", "r.generated_at <= ?"];
  const params: Array<number | string> = [since, until];
  if (opts.agentId) {
    clauses.push("r.agent_id = ?");
    params.push(opts.agentId);
  }
  if (opts.model) {
    clauses.push("r.model = ?");
    params.push(opts.model);
  }
  return { sql: clauses.join(" AND "), params };
}

export function queryCaseTrend(db: Database.Database, caseId: string, opts: QueryOpts = {}): CaseTrendRow[] {
  const { sql, params } = rangeClause(opts);
  const last = opts.last ?? 30;
  const rows = db
    .prepare(
      `SELECT * FROM (
        SELECT
          r.report_id, r.run_id, r.generated_at, r.model, r.git_commit, r.git_branch,
          cr.baseline_pass, cr.new_pass, cr.case_status, cr.risk_level, cr.gate_recommendation,
          cr.root_cause, cr.input_tokens, cr.output_tokens, cr.total_tokens, cr.tool_call_count,
          cr.loop_detected, cr.pass_rate, cr.run_count, cr.sec_low, cr.sec_medium, cr.sec_high, cr.sec_critical,
          r.prompt_version
        FROM case_results cr
        JOIN runs r ON r.report_id = cr.report_id
        WHERE cr.case_id = ?
          AND cr.case_status = 'executed'
          AND ${sql}
        ORDER BY r.generated_at DESC
        LIMIT ?
      )
      ORDER BY generated_at`
    )
    .all(caseId, ...params, last) as CaseTrendRow[];
  return rows;
}

export function queryRunTrend(db: Database.Database, opts: QueryOpts = {}): RunTrendRow[] {
  const { sql, params } = rangeClause(opts);
  const last = opts.last ?? 30;
  const rows = db
    .prepare(
      `SELECT * FROM (
        SELECT
          r.report_id, r.run_id, r.generated_at, r.total_cases, r.model, r.git_commit, r.ingest_mode,
          r.kpi_risk_mass_before, r.kpi_risk_mass_after, r.kpi_pre_action_entropy_removed,
          r.kpi_blocked_cases, r.kpi_recon_minutes_saved_total, r.kpi_recon_minutes_saved_per_block,
          COALESCE(SUM(CASE WHEN cr.case_status = 'executed' THEN 1 ELSE 0 END), 0) AS executed_cases,
          COALESCE(SUM(CASE WHEN cr.case_status = 'executed' AND cr.new_pass = 1 THEN 1 ELSE 0 END), 0) AS pass_count,
          COALESCE(SUM(CASE WHEN cr.case_status = 'executed' AND cr.new_pass = 0 THEN 1 ELSE 0 END), 0) AS fail_count,
          COALESCE(SUM(CASE WHEN cr.case_status != 'executed' THEN 1 ELSE 0 END), 0) AS skipped_count,
          COALESCE(SUM(CASE WHEN cr.case_status = 'executed' AND cr.gate_recommendation = 'require_approval' THEN 1 ELSE 0 END), 0) AS cases_requiring_approval,
          COALESCE(SUM(CASE WHEN cr.case_status = 'executed' AND cr.gate_recommendation = 'block' THEN 1 ELSE 0 END), 0) AS cases_block_recommended,
          COALESCE(SUM(CASE WHEN cr.case_status = 'executed' AND cr.risk_level = 'high' THEN 1 ELSE 0 END), 0) AS high_risk_cases,
          COALESCE(SUM(cr.sec_low), 0) AS sec_low_total,
          COALESCE(SUM(cr.sec_medium), 0) AS sec_medium_total,
          COALESCE(SUM(cr.sec_high), 0) AS sec_high_total,
          COALESCE(SUM(cr.sec_critical), 0) AS sec_critical_total,
          r.regressions AS regressions,
          r.improvements AS improvements
        FROM runs r
        LEFT JOIN case_results cr ON cr.report_id = r.report_id
        WHERE ${sql}
        GROUP BY r.report_id
        ORDER BY r.generated_at DESC
        LIMIT ?
      )
      ORDER BY generated_at`
    )
    .all(...params, last) as RunTrendRow[];
  return rows;
}

export function queryFlaky(db: Database.Database, opts: { last?: number; limit?: number } = {}): FlakyCaseRow[] {
  const last = opts.last ?? 30;
  const limit = opts.limit ?? 10;
  const rows = db
    .prepare(
      `WITH recent_runs AS (
         SELECT report_id, generated_at
         FROM runs
         ORDER BY generated_at DESC
         LIMIT ?
       )
       SELECT
         cr.case_id,
         cr.suite,
         COUNT(*) AS total_runs,
         SUM(CASE WHEN cr.new_pass = 1 THEN 1 ELSE 0 END) AS pass_count,
         ROUND(CAST(SUM(CASE WHEN cr.new_pass = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) AS pass_rate,
         MAX(cr.generated_at) AS last_generated_at
       FROM case_results cr
       JOIN recent_runs rr ON rr.report_id = cr.report_id
       WHERE cr.case_status = 'executed'
       GROUP BY cr.case_id
       HAVING
         CAST(SUM(CASE WHEN cr.new_pass = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) > 0
         AND CAST(SUM(CASE WHEN cr.new_pass = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) < 1
       ORDER BY pass_rate ASC
       LIMIT ?`
    )
    .all(last, limit) as FlakyCaseRow[];

  return rows;
}

export function queryTokenTrend(
  db: Database.Database,
  opts: QueryOpts & { caseId?: string } = {}
): { rows: TokenTrendRow[]; coverage: TokenCoverage } {
  const { sql, params } = rangeClause(opts);
  const last = opts.last ?? 30;

  const rows = db
    .prepare(
      `SELECT * FROM (
        SELECT
          r.generated_at, r.report_id, r.model,
          SUM(cr.input_tokens) AS total_input,
          SUM(cr.output_tokens) AS total_output,
          SUM(cr.total_tokens) AS total_tokens,
          COUNT(CASE WHEN cr.total_tokens IS NOT NULL THEN 1 END) AS cases_with_tokens,
          COUNT(*) AS executed_cases
        FROM case_results cr
        JOIN runs r ON r.report_id = cr.report_id
        WHERE cr.case_status = 'executed'
          AND ${sql}
        GROUP BY r.report_id
        ORDER BY r.generated_at DESC
        LIMIT ?
      )
      ORDER BY generated_at`
    )
    .all(...params, last) as TokenTrendRow[];

  const totalRows = rows.reduce((acc, r) => acc + r.executed_cases, 0);
  const nonNullRows = rows.reduce((acc, r) => acc + r.cases_with_tokens, 0);
  const coveragePercent = totalRows ? (nonNullRows / totalRows) * 100 : 0;

  return { rows, coverage: { totalRows, nonNullRows, coveragePercent } };
}
