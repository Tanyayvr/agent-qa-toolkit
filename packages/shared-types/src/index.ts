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
