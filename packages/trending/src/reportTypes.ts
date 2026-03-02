export type SignalSeverity = "low" | "medium" | "high" | "critical";

export type SecuritySignal = {
  severity: SignalSeverity;
};

export type SecuritySide = {
  signals?: SecuritySignal[];
};

export type SecurityPack = {
  baseline: SecuritySide;
  new: SecuritySide;
};

export type ReportMeta = {
  toolkit_version: string;
  spec_version: string;
  generated_at: number;
  run_id?: string;
};

export type EnvironmentContext = {
  agent_id?: string;
  model?: string;
  prompt_version?: string;
  tools_version?: string;
};

export type CompareReport = {
  contract_version?: number;
  report_id: string;
  meta: ReportMeta;
  environment?: EnvironmentContext;
  summary: {
    baseline_pass: number;
    new_pass: number;
    regressions: number;
    improvements: number;
    execution_quality?: {
      admissibility_kpi?: {
        risk_mass_before: number;
        risk_mass_after: number;
        pre_action_entropy_removed: number;
        blocked_cases: number;
        reconstruction_minutes_saved_total: number;
        reconstruction_minutes_saved_per_block: number;
      };
    };
    data_coverage?: {
      total_cases?: number;
    };
  };
  items: Array<{
    case_id: string;
    suite?: string;
    case_status?: "executed" | "missing" | "filtered_out" | "broken" | "manual_unknown";
    data_availability?: {
      baseline?: { status: "present" | "missing" | "broken" };
      new?: { status: "present" | "missing" | "broken" };
    };
    baseline_pass: boolean | null;
    new_pass: boolean | null;
    new_root?: string;
    security?: SecurityPack;
    risk_level: string;
    gate_recommendation: string;
  }>;
};
