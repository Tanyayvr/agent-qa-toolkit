import type {
  RunCaseRequestPayload,
  RunnerFailureArtifact,
  Version,
} from "shared-types";
import type { RedactionPreset } from "./sanitize";

export type CaseFileItem = {
  id: string;
  title: string;
  input: { user: string; context?: unknown };
  expected?: unknown;
  metadata?: unknown;
};

export type RunCaseRequest = RunCaseRequestPayload;

export type RunnerConfig = {
  repoRoot: string;
  baseUrl: string;
  casesPath: string;
  outDir: string;
  runId: string;
  incidentId: string;
  agentId?: string;
  onlyCaseIds: string[] | null;
  dryRun: boolean;
  redactionPreset: RedactionPreset;
  keepRaw: boolean;

  timeoutMs: number;
  timeoutProfile: "off" | "auto";
  timeoutAutoCapMs: number;
  timeoutAutoLookbackRuns: number;
  timeoutAutoMinSuccessSamples: number;
  timeoutAutoMaxIncreaseFactor: number;
  retries: number;
  backoffBaseMs: number;
  concurrency: number;
  inactivityTimeoutMs: number;
  heartbeatIntervalMs: number;
  preflightMode: "off" | "warn" | "strict";
  preflightTimeoutMs: number;
  failFastTransportStreak: number;

  bodySnippetBytes: number;
  maxBodyBytes: number;
  saveFullBodyOnError: boolean;
  retentionDays: number;

  runs: number;
  provenance?: ProvenanceIdentity;
};

export type ProvenanceIdentity = {
  agent_id: string;
  agent_version: string;
  model: string;
  model_version: string;
  prompt_version: string;
  tools_version: string;
  config_hash: string;
};

export type TimeoutAutoResolution = {
  profile: "off" | "auto";
  base_timeout_ms: number;
  selected_case_count: number;
  history_sample_count: number;
  history_success_sample_count?: number;
  history_failure_sample_count?: number;
  history_candidate_raw_timeout_ms?: number;
  history_candidate_timeout_ms?: number;
  history_candidate_ignored_reason?: "failure_only_history" | "insufficient_success_samples";
  history_candidate_growth_cap_ms?: number;
  clamped_by_growth?: boolean;
  adapter_timeout_ms?: number;
  adapter_candidate_timeout_ms?: number;
  server_request_timeout_ms?: number;
  server_timeout_safety_margin_ms?: number;
  server_candidate_timeout_ms?: number;
  clamped_by_server_timeout?: boolean;
  timeout_cap_ms: number;
  final_timeout_ms: number;
  clamped_by_cap: boolean;
};

export type PreflightStatus = "passed" | "failed" | "skipped";

export type PreflightResult = {
  mode: "off" | "warn" | "strict";
  status: PreflightStatus;
  health_ok: boolean;
  canary_ok: boolean;
  warnings: string[];
  checked_at: number;
};

export type AdapterRuntimeHints = {
  adapter_timeout_ms?: number;
  server_request_timeout_ms?: number;
  server_headers_timeout_ms?: number;
  server_keep_alive_timeout_ms?: number;
};

export const SERVER_TIMEOUT_SAFETY_MARGIN_MS = 5_000;

export type GitContext = {
  git_commit?: string;
  git_branch?: string;
  git_dirty?: boolean;
};

export type MinimalAgentResponseOnFailure = {
  case_id: string;
  version: Version;
  workflow_id?: string;
  proposed_actions: unknown[];
  final_output: { content_type: "text"; content: string };
  events: unknown[];
  runner_failure: RunnerFailureArtifact;
};
