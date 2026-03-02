export type IngestMode = "auto" | "manual" | "minimal";
export type CaseStatus = "executed" | "missing" | "broken" | "manual_unknown";

export interface IngestResult {
  inserted: boolean;
  reportId: string;
  runId: string;
  casesIngested: number;
  tokenCoverage?: string;
}

export interface QueryOpts {
  last?: number;
  since?: number;
  until?: number;
  agentId?: string;
  model?: string;
}

export interface CaseTrendRow {
  report_id: string;
  run_id: string;
  generated_at: number;
  baseline_pass: number | null;
  new_pass: number | null;
  case_status: CaseStatus;
  risk_level: string;
  gate_recommendation: string;
  root_cause: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  tool_call_count: number | null;
  loop_detected: number | null;
  pass_rate: number | null;
  run_count: number | null;
  sec_low: number;
  sec_medium: number;
  sec_high: number;
  sec_critical: number;
  git_commit: string | null;
  git_branch: string | null;
  model: string | null;
  prompt_version: string | null;
}

export interface RunTrendRow {
  report_id: string;
  run_id: string;
  generated_at: number;
  total_cases: number;
  executed_cases: number;
  pass_count: number;
  fail_count: number;
  regressions: number;
  improvements: number;
  skipped_count: number;
  model: string | null;
  git_commit: string | null;
  ingest_mode: IngestMode;
  kpi_risk_mass_before: number | null;
  kpi_risk_mass_after: number | null;
  kpi_pre_action_entropy_removed: number | null;
  kpi_blocked_cases: number | null;
  kpi_recon_minutes_saved_total: number | null;
  kpi_recon_minutes_saved_per_block: number | null;
}

export interface FlakyCaseRow {
  case_id: string;
  suite: string | null;
  total_runs: number;
  pass_count: number;
  pass_rate: number;
  last_generated_at: number;
}

export interface TokenTrendRow {
  generated_at: number;
  report_id: string;
  model: string | null;
  total_input: number | null;
  total_output: number | null;
  total_tokens: number | null;
  cases_with_tokens: number;
  executed_cases: number;
}

export interface TokenCoverage {
  totalRows: number;
  nonNullRows: number;
  coveragePercent: number;
}

export interface StoreStats {
  dbPath: string;
  dbSizeBytes: number;
  totalRuns: number;
  totalCaseResults: number;
  oldestRunAt: number | null;
  newestRunAt: number | null;
  schemaVersion: number;
  ingestModeCounts: Record<string, number>;
  caseStatusCounts: Record<string, number>;
  overallPassRate: number | null;
  tokenCoverage: TokenCoverage;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  report?: T;
}
