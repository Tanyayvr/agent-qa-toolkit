// packages/shared-types/src/index.ts
//
// Canonical contract types shared across runner, evaluator, and demo-agent.
// NO runtime logic — only types, enums, and type-level schemas.

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

export type Version = "baseline" | "new";

export type FetchFailureClass = "http_error" | "timeout" | "network_error" | "invalid_json";

export type NetErrorKind =
    | "dns"
    | "tls"
    | "conn_refused"
    | "conn_reset"
    | "headers_timeout"
    | "socket_hang_up"
    | "proxy"
    | "abort"
    | "unknown";

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

export type ToolCallEvent = {
    type: "tool_call";
    ts: number;
    call_id: string;
    action_id?: string;
    tool: string;
    args: Record<string, unknown>;
};

export type ToolResultEvent = {
    type: "tool_result";
    ts: number;
    call_id: string;
    action_id?: string;
    status: "ok" | "error" | "timeout";
    latency_ms?: number;
    payload_summary?: Record<string, unknown> | string;
};

export type RetrievalEvent = {
    type: "retrieval";
    ts: number;
    query?: string;
    doc_ids?: string[];
    snippets_hashes?: string[];
};

export type FinalOutputEvent = {
    type: "final_output";
    ts: number;
    content_type: "text" | "json";
    content: unknown;
};

export type RunEvent = ToolCallEvent | ToolResultEvent | RetrievalEvent | FinalOutputEvent;

/* ------------------------------------------------------------------ */
/*  Evidence & Actions                                                 */
/* ------------------------------------------------------------------ */

export type ActionEvidenceRef =
    | { kind: "tool_result"; call_id: string }
    | { kind: "retrieval_doc"; id: string };

export type ProposedAction = {
    action_id: string;
    action_type: string;
    tool_name: string;
    params: Record<string, unknown>;
    risk_level?: "low" | "medium" | "high";
    risk_tags?: string[];
    evidence_refs?: ActionEvidenceRef[];
};

export type FinalOutput = { content_type: "text" | "json"; content: unknown };

/* ------------------------------------------------------------------ */
/*  Runner failure                                                     */
/* ------------------------------------------------------------------ */

export type RunnerFailureArtifact = {
    type: "runner_fetch_failure";
    class: FetchFailureClass;
    net_error_kind?: NetErrorKind;
    is_transient?: boolean;

    case_id: string;
    version: Version;
    url: string;
    attempt: number;
    timeout_ms: number;
    latency_ms: number;

    status?: number;
    status_text?: string;
    http_is_transient?: boolean;

    error_name?: string;
    error_message?: string;

    body_snippet?: string;

    full_body_saved_to?: string;
    full_body_meta_saved_to?: string;
    body_truncated?: boolean;
    body_bytes_written?: number;
    max_body_bytes?: number;
};

/* ------------------------------------------------------------------ */
/*  Token usage (Scenario 1: token cost tracking)                      */
/* ------------------------------------------------------------------ */

/** Detailed loop detection analysis produced by the runner. */
export type LoopDetails = {
    /** Tool-call argument similarity detection.
     *  When the same tool is called N times in a window and the args are >90%
     *  similar (by key overlap), this captures the suspects. */
    similarity_suspects?: {
        tool: string;
        call_ids: string[];
        /** Jaccard-like similarity score 0-1 between args of last calls. */
        similarity_score: number;
    }[];

    /** Output hash duplicates: when different calls produce identical results
     *  (hashed payload_summary). This is a loop signal that iteration counts miss. */
    output_hash_duplicates?: {
        hash: string;
        call_ids: string[];
        count: number;
    }[];
};

/** Token usage reported by the agent per run-case call. All fields optional
 *  for backward compatibility with agents that do not report token counts. */
export type TokenUsage = {
    /** Number of tokens in the request input (prompt + context). */
    input_tokens?: number;
    /** Number of tokens generated in the response. */
    output_tokens?: number;
    /** Total tokens consumed (input + output). May differ from sum if cached. */
    total_tokens?: number;
    /** Number of distinct tool calls made during this run. */
    tool_call_count?: number;
    /** Set to true when the agent detected a tool-call loop (same tool, same args). */
    loop_detected?: boolean;
    /** Detailed loop detection analysis (similarity breaker + output hash tracking). */
    loop_details?: LoopDetails;
};

/* ------------------------------------------------------------------ */
/*  Trace anchors (OTel correlation)                                   */
/* ------------------------------------------------------------------ */

/** Optional trace correlation payload attached to a case response.
 *  - `trace_id`/`span_id` follow W3C trace-context hex formats.
 *  - `traceparent` and `baggage` are preserved for downstream tooling.
 *  - `source` helps operators understand where anchors were derived. */
export type TraceAnchor = {
    trace_id?: string;
    span_id?: string;
    parent_span_id?: string;
    traceparent?: string;
    baggage?: string;
    source?: "response_body" | "response_headers" | "derived";
};

/* ------------------------------------------------------------------ */
/*  Runtime handoff contract (multi-agent)                             */
/* ------------------------------------------------------------------ */

/** Run-level routing metadata sent with /run-case requests. */
export type RunMeta = {
    run_id?: string;
    incident_id?: string;
    agent_id?: string;
    parent_run_id?: string;
};

/** Deterministic planning gate config for mutating operations. */
export type PlanningGatePolicy = {
    /** When true, mutating tool calls require a machine-readable plan envelope. */
    required_for_mutations?: boolean;
    /** Tool names treated as mutating for this run. */
    mutation_tools?: string[];
    /** Subset of mutation tools considered high-risk (mismatch => block). */
    high_risk_tools?: string[];
    /** Require declared_end_state to be present in the plan envelope. */
    require_declared_end_state?: boolean;
};

/** REPL/runtime controls expected by the caller. */
export type ReplRuntimePolicy = {
    /** Allowed REPL tools. If provided, any other REPL tool is a violation. */
    tool_allowlist?: string[];
    /** Regex patterns (as strings) that must not match command text. */
    denied_command_patterns?: string[];
    /** Maximum command length for REPL command payloads. */
    max_command_length?: number;
};

/** Runtime policy contract optionally propagated with /run-case calls. */
export type RuntimePolicy = {
    planning_gate?: PlanningGatePolicy;
    repl_policy?: ReplRuntimePolicy;
};

/** Runtime handoff payload transferred between agents/services.
 *  `checksum` is sha256 over canonical payload without `checksum` field. */
export type HandoffEnvelope = {
    incident_id: string;
    handoff_id: string;
    from_agent_id: string;
    to_agent_id: string;
    objective: string;
    constraints?: Record<string, unknown>;
    decision_thresholds?: Record<string, unknown>;
    state_delta?: Record<string, unknown>;
    tool_result_refs?: string[];
    retrieval_refs?: string[];
    trace_anchor?: TraceAnchor;
    parent_handoff_id?: string;
    schema_version: string;
    created_at: number;
    checksum: string;
};

/** Input form accepted by runtime handoff endpoints.
 *  `schema_version`, `created_at`, and `checksum` may be omitted and derived by adapter. */
export type HandoffEnvelopeInput = {
    incident_id: string;
    handoff_id: string;
    from_agent_id: string;
    to_agent_id: string;
    objective: string;
    constraints?: Record<string, unknown>;
    decision_thresholds?: Record<string, unknown>;
    state_delta?: Record<string, unknown>;
    tool_result_refs?: string[];
    retrieval_refs?: string[];
    trace_anchor?: TraceAnchor;
    parent_handoff_id?: string;
    schema_version?: string;
    created_at?: number;
    checksum?: string;
};

/** Adapter acknowledgement/visibility status for runtime handoffs. */
export type HandoffReceipt = {
    incident_id: string;
    handoff_id: string;
    from_agent_id: string;
    to_agent_id: string;
    checksum: string;
    accepted_at: number;
    status: "accepted" | "duplicate" | "available" | "consumed";
};

/** Canonical /run-case request payload used by runners and SDKs. */
export type RunCaseRequestPayload = {
    case_id: string;
    version: Version;
    input: { user: string; context?: unknown };
    run_meta?: RunMeta;
    handoff?: HandoffEnvelopeInput;
    policy?: RuntimePolicy;
};

/* ------------------------------------------------------------------ */
/*  Agent response (common shape read by evaluator + replay diff)      */
/* ------------------------------------------------------------------ */

export type AgentResponse = {
    case_id: string;
    version: Version;
    workflow_id?: string;
    final_output: FinalOutput;

    events?: RunEvent[];
    proposed_actions?: ProposedAction[];
    runner_failure?: RunnerFailureArtifact;

    /** Optional: token cost data for this individual run. Populated by the agent
     *  when it has access to model usage metadata (e.g. OpenAI Usage object). */
    token_usage?: TokenUsage;

    /** Optional OTel anchor fields for cross-linking evidence to traces. */
    trace_anchor?: TraceAnchor;

    /** Optional runtime routing metadata echoed by adapters/agents. */
    run_meta?: RunMeta;

    /** Optional: handoffs emitted by this run for downstream agents. */
    handoff_emits?: HandoffEnvelope[];

    /** Optional: handoffs available/consumed by this run. */
    handoff_receipts?: HandoffReceipt[];
};


/* ------------------------------------------------------------------ */
/*  Root cause classification (evaluator)                              */
/* ------------------------------------------------------------------ */

export type RootCause =
    | "tool_failure"
    | "format_violation"
    | "missing_required_data"
    | "wrong_tool_choice"
    | "hallucination_signal"
    | "missing_case"
    | "unknown";
