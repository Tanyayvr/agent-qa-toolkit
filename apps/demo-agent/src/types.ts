//apps/demo-agent/src/types.ts
export type ContentType = "text" | "json";

export type EvidenceRef = { kind: "tool_result"; call_id: string } | { kind: "retrieval_doc"; id: string };

export type ProposedAction = {
  action_id: string;
  action_type: string;
  tool_name: string;
  target?: { type: string; id?: string };
  params: Record<string, unknown>;
  risk_level?: "low" | "medium" | "high";
  risk_tags?: string[];
  evidence_refs?: EvidenceRef[];
  confidence?: number;
};

export type RunEvent =
  | {
      type: "tool_call";
      ts: number;
      call_id: string;
      action_id?: string;
      tool: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      ts: number;
      call_id: string;
      action_id?: string;
      status: "ok" | "error" | "timeout";
      latency_ms?: number;
      payload_summary?: unknown;
    }
  | {
      type: "retrieval";
      ts: number;
      query?: string;
      doc_ids?: string[];
      snippets_hashes?: string[];
    }
  | {
      type: "final_output";
      ts: number;
      content_type: ContentType;
      content: unknown;
    };

export type FinalOutput = {
  content_type: ContentType;
  content: unknown;
};


export type AgentCaseResponse = {
  case_id: string;
  version: "baseline" | "new";
  workflow_id: string;
  proposed_actions: ProposedAction[];
  final_output: FinalOutput;
  events: RunEvent[];
};

export type RunCaseRequestBody = {
  case_id?: string;
  version?: string;
  workflow_id?: string;
  input?: { user?: string; context?: unknown };
  run_meta?: { run_id?: string };
};
