// apps/evaluator/src/core.ts
//
// Pure functions extracted from index.ts for testability.
// This module has NO side-effects, NO file I/O, NO CLI concerns.

import type Ajv from "ajv";
import type {
    AssumptionCandidate,
    AssumptionState,
    RunEvent,
    ToolCallEvent,
    ToolResultEvent,
    RetrievalEvent,
    FinalOutputEvent,
    ProposedAction,
    FinalOutput,
    AgentResponse,
    RunnerFailureArtifact,
    RootCause,
    PlanningGatePolicy,
    ReplRuntimePolicy,
} from "shared-types";
import type {
    TraceIntegritySide,
    SecuritySignal,
    SignalSeverity,
} from "./htmlReport";
import { manifestKeyFor } from "./manifest";

/* ------------------------------------------------------------------ */
/*  Local types (evaluator-only, not shared)                           */
/* ------------------------------------------------------------------ */

export type Expected = {
    action_required?: string[];
    evidence_required_for_actions?: boolean;
    tool_required?: string[];
    tool_sequence?: string[];
    json_schema?: unknown;
    retrieval_required?: { doc_ids?: string[] };
    must_include?: string[];
    must_not_include?: string[];
    semantic?: {
        required_concepts?: Array<string | string[]>;
        forbidden_concepts?: Array<string | string[]>;
        reference_texts?: string[];
        min_token_f1?: number;
        min_lcs_ratio?: number;
        profile?: "strict" | "balanced" | "lenient";
        synonyms?: Record<string, string[]>;
    };
    tool_telemetry?: {
        require_non_wrapper_calls?: boolean;
        min_tool_calls?: number;
        min_tool_results?: number;
        allowed_modes?: Array<"native" | "inferred" | "wrapper_only">;
        require_call_result_pairs?: boolean;
    };
    planning_gate?: PlanningGatePolicy;
    repl_policy?: ReplRuntimePolicy;
    assumption_state?: {
        required?: boolean;
        min_selected_candidates?: number;
        max_rejected_candidates?: number;
        require_reason_codes_for_rejected?: boolean;
        allowed_reason_codes?: string[];
    };
};

export type Case = {
    id: string;
    title: string;
    suite?: string;
    input: { user: string; context?: unknown };
    expected: Expected;
};

export type AssertionDetails = Record<string, unknown>;
export type AssertionResult = { name: string; pass: boolean; details?: AssertionDetails };

export type EvaluationResult = {
    case_id: string;
    title: string;
    pass: boolean;
    assertions: AssertionResult[];
    preventable_by_policy: boolean;
    recommended_policy_rules: string[];
    root_cause?: RootCause;
};

export type GateRecommendation = "none" | "require_approval" | "block";
export type RiskLevel = "low" | "medium" | "high";
export type AvailabilityStatus = "present" | "missing" | "broken";
export type CaseStatus = "executed" | "filtered_out" | "missing";

export type DataAvailabilitySide = {
    status: AvailabilityStatus;
    reason?: string;
    reason_code?: string;
    details?: Record<string, unknown>;
};

/* ------------------------------------------------------------------ */
/*  Event helpers                                                      */
/* ------------------------------------------------------------------ */

function asEvents(events: RunEvent[] | undefined | null): RunEvent[] {
    return Array.isArray(events) ? events : [];
}

function hasNonEmptyList(v: unknown): boolean {
    return Array.isArray(v) && v.length > 0;
}

export function toolCalls(events: RunEvent[] | undefined | null): ToolCallEvent[] {
    return asEvents(events).filter((e): e is ToolCallEvent => e.type === "tool_call");
}

export function toolResults(events: RunEvent[] | undefined | null): ToolResultEvent[] {
    return asEvents(events).filter((e): e is ToolResultEvent => e.type === "tool_result");
}

export function retrievalEvents(events: RunEvent[] | undefined | null): RetrievalEvent[] {
    return asEvents(events).filter((e): e is RetrievalEvent => e.type === "retrieval");
}

export function finalOutputEvents(events: RunEvent[] | undefined | null): FinalOutputEvent[] {
    return asEvents(events).filter((e): e is FinalOutputEvent => e.type === "final_output");
}

export type ToolTelemetryRequirement = {
    required: boolean;
    reasons: string[];
};

export function resolveToolTelemetryRequirement(expected: Expected): ToolTelemetryRequirement {
    const reasons: string[] = [];
    if (hasNonEmptyList(expected.tool_required)) reasons.push("tool_required");
    if (hasNonEmptyList(expected.tool_sequence)) reasons.push("tool_sequence");
    if (expected.evidence_required_for_actions === true) reasons.push("evidence_required_for_actions");
    if (hasNonEmptyList(expected.action_required)) reasons.push("action_required");
    const telemetryPolicy = expected.tool_telemetry && typeof expected.tool_telemetry === "object"
        ? expected.tool_telemetry
        : undefined;
    if (telemetryPolicy !== undefined) reasons.push("tool_telemetry_policy");
    return {
        required: reasons.length > 0,
        reasons,
    };
}

export function extractToolCallNames(events: RunEvent[]): string[] {
    const calls = toolCalls(events);
    const withIdx = calls.map((e, idx) => ({ e, idx }));
    withIdx.sort((a, b) => {
        const ta = a.e.ts;
        const tb = b.e.ts;
        const fa = Number.isFinite(ta);
        const fb = Number.isFinite(tb);
        if (fa && fb) return ta - tb;
        if (fa) return -1;
        if (fb) return 1;
        return a.idx - b.idx;
    });
    return withIdx.map((x) => x.e.tool);
}

export function extractRetrievalDocIds(events: RunEvent[]): string[] {
    const ids: string[] = [];
    for (const e of retrievalEvents(events)) {
        if (Array.isArray(e.doc_ids)) ids.push(...e.doc_ids);
    }
    return ids;
}

type ToolResultWithTool = {
    call_id: string;
    status: "ok" | "error" | "timeout";
    payload_summary?: Record<string, unknown> | string;
    tool?: string;
};

export function extractToolResultsWithToolName(events: RunEvent[]): ToolResultWithTool[] {
    const byCallId = new Map<string, string>();
    for (const c of toolCalls(events)) byCallId.set(c.call_id, c.tool);

    const out: ToolResultWithTool[] = [];
    for (const r of toolResults(events)) {
        const t = byCallId.get(r.call_id);
        const base: ToolResultWithTool = { call_id: r.call_id, status: r.status };
        if (r.payload_summary !== undefined) base.payload_summary = r.payload_summary;
        if (t !== undefined) base.tool = t;
        out.push(base);
    }
    return out;
}

export function checkToolTelemetryAvailability(expected: Expected, resp: AgentResponse): AssertionResult {
    const requirement = resolveToolTelemetryRequirement(expected);
    const telemetryPolicy = expected.tool_telemetry && typeof expected.tool_telemetry === "object"
        ? expected.tool_telemetry
        : undefined;
    if (!requirement.required) {
        return { name: "tool_telemetry", pass: true, details: { note: "not_required" } };
    }
    const policyEnabled = telemetryPolicy !== undefined;

    const events = asEvents(resp.events);
    const calls = toolCalls(events);
    const results = toolResults(events);
    const byCall = new Map<string, ToolCallEvent>();
    for (const call of calls) byCall.set(call.call_id, call);

    const wrapperCalls = calls.filter((call) => {
        const src = (call.args as Record<string, unknown>)?._telemetry_source;
        return src === "wrapper";
    });
    const nonWrapperCalls = calls.length - wrapperCalls.length;
    const responseMode = (() => {
        const raw = (resp as Record<string, unknown>).telemetry_mode;
        return raw === "native" || raw === "inferred" || raw === "wrapper_only" ? raw : undefined;
    })();
    const inferredMode: "native" | "inferred" | "wrapper_only" = (() => {
        if (calls.length === 0) return "wrapper_only";
        if (nonWrapperCalls === 0) return "wrapper_only";
        const hasInferred = calls.some((call) => {
            const src = (call.args as Record<string, unknown>)?._telemetry_source;
            return src === "inferred";
        });
        return hasInferred ? "inferred" : "native";
    })();
    const mode = responseMode ?? inferredMode;

    const violations: string[] = [];
    if (!(calls.length > 0 || results.length > 0)) violations.push("tool_telemetry_missing");

    if (policyEnabled) {
        if (telemetryPolicy.require_non_wrapper_calls === true && nonWrapperCalls <= 0) {
            violations.push("wrapper_only_telemetry");
        }
        if (typeof telemetryPolicy.min_tool_calls === "number" && calls.length < telemetryPolicy.min_tool_calls) {
            violations.push("tool_call_count_below_min");
        }
        if (typeof telemetryPolicy.min_tool_results === "number" && results.length < telemetryPolicy.min_tool_results) {
            violations.push("tool_result_count_below_min");
        }
        if (Array.isArray(telemetryPolicy.allowed_modes) && telemetryPolicy.allowed_modes.length > 0) {
            const allowed = new Set(telemetryPolicy.allowed_modes);
            if (!allowed.has(mode)) {
                violations.push("telemetry_mode_not_allowed");
            }
        }
        if (telemetryPolicy.require_call_result_pairs === true) {
            const resultByCallId = new Set(results.map((r) => r.call_id));
            const missingPairs = calls.filter((c) => !resultByCallId.has(c.call_id)).map((c) => c.call_id);
            if (missingPairs.length > 0) {
                violations.push("tool_call_without_result");
            }
        }
    }
    const missingOutputEvidenceCallIds = results
        .filter((result) => result.status === "ok")
        .filter((result) => {
            const hasSummary = result.payload_summary !== undefined;
            const hasResultRef = typeof result.result_ref === "string" && result.result_ref.trim().length > 0;
            return !(hasSummary || hasResultRef);
        })
        .map((result) => result.call_id);
    if (missingOutputEvidenceCallIds.length > 0) {
        violations.push("tool_result_missing_output_evidence");
    }
    const missingErrorEvidenceCallIds = results
        .filter((result) => result.status === "error" || result.status === "timeout")
        .filter((result) => {
            const hasErrorCode = typeof result.error_code === "string" && result.error_code.trim().length > 0;
            const hasErrorMessage = typeof result.error_message === "string" && result.error_message.trim().length > 0;
            return !(hasErrorCode || hasErrorMessage);
        })
        .map((result) => result.call_id);
    if (missingErrorEvidenceCallIds.length > 0) {
        violations.push("tool_result_missing_error_evidence");
    }
    const pass = violations.length === 0;
    return {
        name: "tool_telemetry",
        pass,
        details: {
            required_by: requirement.reasons,
            tool_call_count: calls.length,
            tool_result_count: results.length,
            wrapper_tool_call_count: wrapperCalls.length,
            non_wrapper_tool_call_count: nonWrapperCalls,
            telemetry_mode: mode,
            tool_results_missing_output_evidence: missingOutputEvidenceCallIds,
            tool_results_missing_error_evidence: missingErrorEvidenceCallIds,
            reason_code: pass ? undefined : violations[0],
            violations: pass ? [] : violations,
            known_tool_call_ids: Array.from(byCall.keys()),
        },
    };
}

function hasExpectationSignal(exp: Expected): boolean {
    if (!exp || typeof exp !== "object") return false;
    if (hasNonEmptyList(exp.action_required)) return true;
    if (exp.evidence_required_for_actions === true) return true;
    if (hasNonEmptyList(exp.tool_required)) return true;
    if (hasNonEmptyList(exp.tool_sequence)) return true;
    if (exp.tool_telemetry && typeof exp.tool_telemetry === "object") return true;
    if (exp.retrieval_required && typeof exp.retrieval_required === "object" && hasNonEmptyList(exp.retrieval_required.doc_ids)) return true;
    if (hasNonEmptyList(exp.must_include)) return true;
    if (hasNonEmptyList(exp.must_not_include)) return true;
    if (exp.semantic && typeof exp.semantic === "object") return true;
    if (exp.planning_gate && typeof exp.planning_gate === "object") return true;
    if (exp.repl_policy && typeof exp.repl_policy === "object") return true;
    return false;
}

function normalizeAssumptionState(raw: unknown): AssumptionState | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const selected = Array.isArray(obj.selected) ? obj.selected : null;
    const rejected = Array.isArray(obj.rejected) ? obj.rejected : null;
    if (!selected || !rejected) return null;

    const castCandidate = (v: unknown): AssumptionCandidate | null => {
        if (!v || typeof v !== "object") return null;
        const c = v as Record<string, unknown>;
        const kind = typeof c.kind === "string" ? c.kind : "";
        const candidateId = typeof c.candidate_id === "string" ? c.candidate_id : "";
        const decision = typeof c.decision === "string" ? c.decision : "";
        const reasonCode = typeof c.reason_code === "string" ? c.reason_code : "";
        if (!kind || !candidateId || !decision || !reasonCode) return null;
        return {
            kind: kind as AssumptionCandidate["kind"],
            candidate_id: candidateId,
            decision: decision as AssumptionCandidate["decision"],
            reason_code: reasonCode as AssumptionCandidate["reason_code"],
            ...(typeof c.score === "number" ? { score: c.score } : {}),
            ...(typeof c.tool_name === "string" ? { tool_name: c.tool_name } : {}),
            ...(typeof c.source_ref === "string" ? { source_ref: c.source_ref } : {}),
            ...(c.details && typeof c.details === "object" ? { details: c.details as Record<string, unknown> } : {}),
        };
    };

    const selectedOut = selected.map(castCandidate).filter((x): x is AssumptionCandidate => Boolean(x));
    const rejectedOut = rejected.map(castCandidate).filter((x): x is AssumptionCandidate => Boolean(x));
    return {
        selected: selectedOut,
        rejected: rejectedOut,
        ...(obj.thresholds && typeof obj.thresholds === "object"
            ? { thresholds: obj.thresholds as NonNullable<AssumptionState["thresholds"]> }
            : {}),
        ...(obj.budgets && typeof obj.budgets === "object"
            ? { budgets: obj.budgets as NonNullable<AssumptionState["budgets"]> }
            : {}),
    };
}

function deriveAssumptionStateFromTelemetry(resp: AgentResponse): AssumptionState | null {
    const selected: AssumptionCandidate[] = [];
    const proposed = Array.isArray(resp.proposed_actions) ? resp.proposed_actions : [];
    for (const action of proposed) {
        const actionId = typeof action.action_id === "string" ? action.action_id : "";
        const tool = typeof action.tool_name === "string" ? action.tool_name : undefined;
        selected.push({
            kind: "action",
            candidate_id: actionId || tool || `action_${selected.length + 1}`,
            decision: "selected",
            reason_code: "selected_by_agent",
            ...(tool ? { tool_name: tool } : {}),
        });
    }

    const events = asEvents(resp.events);
    for (const event of events) {
        if (event.type === "tool_call") {
            selected.push({
                kind: "tool",
                candidate_id: event.call_id,
                decision: "selected",
                reason_code: "selected_by_agent",
                tool_name: event.tool,
            });
            continue;
        }
        if (event.type === "retrieval" && Array.isArray(event.doc_ids)) {
            for (const docId of event.doc_ids) {
                selected.push({
                    kind: "retrieval",
                    candidate_id: String(docId),
                    decision: "selected",
                    reason_code: "selected_by_agent",
                    source_ref: String(docId),
                });
            }
        }
    }

    if (selected.length === 0) return null;
    return {
        selected,
        rejected: [],
    };
}

export function checkAssumptionState(expected: Expected, resp: AgentResponse): AssertionResult {
    const policy = expected.assumption_state && typeof expected.assumption_state === "object"
        ? expected.assumption_state
        : undefined;
    const required = policy?.required === true || (policy?.required === undefined && hasExpectationSignal(expected));
    if (!required) {
        return { name: "assumption_state", pass: true, details: { note: "not_required" } };
    }

    const normalized = normalizeAssumptionState((resp as Record<string, unknown>).assumption_state);
    const derived = normalized ?? deriveAssumptionStateFromTelemetry(resp);
    if (!derived) {
        return {
            name: "assumption_state",
            pass: false,
            details: {
                reason_code: "assumption_state_missing",
                source: "missing",
                selected_count: 0,
                rejected_count: 0,
            },
        };
    }

    const minSelected = typeof policy?.min_selected_candidates === "number"
        ? Math.max(0, policy.min_selected_candidates)
        : 0;
    const maxRejected = typeof policy?.max_rejected_candidates === "number"
        ? Math.max(0, policy.max_rejected_candidates)
        : 50;
    const requireRejectedReasonCodes = policy?.require_reason_codes_for_rejected !== false;
    const allowedReasonCodes = Array.isArray(policy?.allowed_reason_codes)
        ? new Set(policy.allowed_reason_codes.map((x) => String(x)))
        : undefined;

    const violations: string[] = [];
    if (derived.selected.length < minSelected) violations.push("selected_candidates_below_min");
    if (derived.rejected.length > maxRejected) violations.push("rejected_candidates_above_max");
    if (requireRejectedReasonCodes) {
        const missingReason = derived.rejected.some((c) => typeof c.reason_code !== "string" || c.reason_code.length === 0);
        if (missingReason) violations.push("rejected_reason_code_missing");
    }
    if (allowedReasonCodes && allowedReasonCodes.size > 0) {
        const bad = [...derived.selected, ...derived.rejected].some((c) => !allowedReasonCodes.has(String(c.reason_code)));
        if (bad) violations.push("reason_code_not_allowed");
    }

    const pass = violations.length === 0;
    return {
        name: "assumption_state",
        pass,
        details: {
            source: normalized ? "response" : "derived",
            selected_count: derived.selected.length,
            rejected_count: derived.rejected.length,
            reason_code: pass ? undefined : violations[0],
            violations: pass ? [] : violations,
        },
    };
}

export function stringifyOutput(out: FinalOutput | undefined | null): string {
    if (!out || typeof out !== "object" || !("content_type" in out)) return "";
    if (out.content_type === "text") return String(out.content ?? "");
    try {
        return JSON.stringify(out.content ?? {}, null, 2);
    } catch {
        return String(out.content ?? "");
    }
}

const SEMANTIC_STOP_WORDS = new Set<string>([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
    "in", "is", "it", "of", "on", "or", "that", "the", "to", "was", "were", "will", "with",
]);

const SEMANTIC_SYNONYMS: Record<string, string[]> = {
    offline: ["local", "selfhosted", "self-hosted", "onprem", "on-prem", "airgapped", "air-gapped"],
    local: ["offline", "onprem", "on-prem"],
    evidence: ["proof", "trace", "artifact"],
    incident: ["issue", "ticket", "case"],
    timeout: ["timelimit", "time-limit", "latency"],
    fail: ["failure", "error", "broken"],
    policy: ["guardrail", "rule"],
};

type SemanticSynonymMap = Record<string, string[]>;

const SEMANTIC_PROFILES: Record<"strict" | "balanced" | "lenient", { minTokenF1: number; minLcsRatio: number }> = {
    strict: { minTokenF1: 0.7, minLcsRatio: 0.45 },
    balanced: { minTokenF1: 0.45, minLcsRatio: 0.25 },
    lenient: { minTokenF1: 0.35, minLcsRatio: 0.2 },
};

function normalizeSemanticText(input: string): string {
    return input
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function stemToken(token: string): string {
    if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
    if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
    if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
    if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
    return token;
}

function semanticTokens(input: string): string[] {
    const norm = normalizeSemanticText(input);
    if (!norm) return [];
    const tokens = norm.split(/\s+/).filter((t) => t.length > 0 && !SEMANTIC_STOP_WORDS.has(t));
    return tokens.map((t) => stemToken(t));
}

function normalizeSemanticKey(value: string): string {
    const tokens = semanticTokens(value);
    return tokens[0] ?? "";
}

function buildSemanticSynonymMap(semantic: Expected["semantic"] | undefined): SemanticSynonymMap {
    const merged = new Map<string, Set<string>>();
    const add = (keyRaw: string, synonymRaw: string): void => {
        const key = normalizeSemanticKey(keyRaw);
        const synonym = String(synonymRaw ?? "").trim();
        if (!key || !synonym) return;
        if (!merged.has(key)) merged.set(key, new Set<string>());
        merged.get(key)!.add(synonym);
    };

    for (const [key, values] of Object.entries(SEMANTIC_SYNONYMS)) {
        for (const value of values) add(key, value);
    }

    const custom = semantic?.synonyms;
    if (custom && typeof custom === "object") {
        for (const [key, values] of Object.entries(custom)) {
            if (!Array.isArray(values)) continue;
            for (const value of values) add(key, String(value ?? ""));
        }
    }

    const normalized: SemanticSynonymMap = {};
    for (const [key, values] of merged.entries()) {
        normalized[key] = Array.from(values);
    }
    return normalized;
}

function semanticAlternativeTokenGroups(token: string, synonyms: SemanticSynonymMap): string[][] {
    const base = normalizeSemanticKey(token);
    if (!base) return [];
    const groups = new Set<string>();
    groups.add(JSON.stringify([base]));
    const alternatives = synonyms[base] ?? [];
    for (const phrase of alternatives) {
        const tokens = semanticTokens(phrase);
        if (tokens.length === 0) continue;
        groups.add(JSON.stringify(tokens));
    }
    return Array.from(groups).map((raw) => JSON.parse(raw) as string[]);
}

function semanticTokenMatches(outputTokenSet: Set<string>, token: string, synonyms: SemanticSynonymMap): boolean {
    const groups = semanticAlternativeTokenGroups(token, synonyms);
    return groups.some((group) => group.every((part) => outputTokenSet.has(part)));
}

function tokenSet(tokens: string[]): Set<string> {
    return new Set(tokens);
}

function conceptToAlternatives(value: string | string[]): string[] {
    if (Array.isArray(value)) {
        return value.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
    }
    const single = String(value ?? "").trim();
    return single ? [single] : [];
}

type PhraseSemanticMatch = {
    pass: boolean;
    mode: "lexical" | "semantic" | "none";
    coverage: number;
};

function matchPhraseSemantically(
    outputNorm: string,
    outputTokenSet: Set<string>,
    phrase: string,
    synonyms: SemanticSynonymMap = SEMANTIC_SYNONYMS
): PhraseSemanticMatch {
    const normalizedPhrase = normalizeSemanticText(phrase);
    if (!normalizedPhrase) return { pass: false, mode: "none", coverage: 0 };
    if (outputNorm.includes(normalizedPhrase)) {
        return { pass: true, mode: "lexical", coverage: 1 };
    }
    const phraseTokens = semanticTokens(normalizedPhrase);
    if (phraseTokens.length === 0) return { pass: false, mode: "none", coverage: 0 };

    let matched = 0;
    for (const token of phraseTokens) {
        if (semanticTokenMatches(outputTokenSet, token, synonyms)) matched += 1;
    }
    const coverage = matched / phraseTokens.length;
    const minCoverage = phraseTokens.length <= 2 ? 1 : 0.67;
    if (coverage >= minCoverage) {
        return { pass: true, mode: "semantic", coverage };
    }
    return { pass: false, mode: "none", coverage };
}

function longestCommonSubsequence(a: string[], b: string[]): number {
    const n = Math.min(a.length, 256);
    const m = Math.min(b.length, 256);
    if (n === 0 || m === 0) return 0;
    const dp: number[] = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i += 1) {
        let prev = 0;
        for (let j = 1; j <= m; j += 1) {
            const tmp = dp[j] ?? 0;
            if (a[i - 1] === b[j - 1]) {
                dp[j] = prev + 1;
            } else {
                dp[j] = Math.max(dp[j] ?? 0, dp[j - 1] ?? 0);
            }
            prev = tmp;
        }
    }
    return dp[m] ?? 0;
}

function tokenF1(reference: string[], output: string[]): number {
    if (reference.length === 0 || output.length === 0) return 0;
    const refSet = tokenSet(reference);
    const outSet = tokenSet(output);
    let intersection = 0;
    for (const t of refSet) {
        if (outSet.has(t)) intersection += 1;
    }
    if (intersection === 0) return 0;
    const precision = intersection / outSet.size;
    const recall = intersection / refSet.size;
    return (2 * precision * recall) / (precision + recall);
}

export function checkSemanticQuality(expected: Expected, resp: AgentResponse): AssertionResult {
    const semantic = expected.semantic && typeof expected.semantic === "object" ? expected.semantic : {};
    const synonymMap = buildSemanticSynonymMap(semantic);
    const requiredConcepts = Array.isArray(semantic.required_concepts) ? semantic.required_concepts : [];
    const forbiddenConcepts = Array.isArray(semantic.forbidden_concepts) ? semantic.forbidden_concepts : [];
    const referenceTexts = Array.isArray(semantic.reference_texts)
        ? semantic.reference_texts.map((r) => String(r ?? "").trim()).filter((r) => r.length > 0)
        : [];

    const hasSemanticRules = requiredConcepts.length > 0 || forbiddenConcepts.length > 0 || referenceTexts.length > 0;
    if (!hasSemanticRules) {
        return { name: "semantic_quality", pass: true, details: { note: "not_required" } };
    }

    const outputRaw = stringifyOutput(resp.final_output);
    const outputNorm = normalizeSemanticText(outputRaw);
    const outputTokens = semanticTokens(outputRaw);
    const outputTokenSet = tokenSet(outputTokens);

    const missingRequiredConcepts: string[][] = [];
    const hitForbiddenConcepts: string[][] = [];
    const semanticMatches: string[] = [];

    for (const concept of requiredConcepts) {
        const alternatives = conceptToAlternatives(concept);
        if (alternatives.length === 0) continue;
        const matched = alternatives.some((alt) => {
            const m = matchPhraseSemantically(outputNorm, outputTokenSet, alt, synonymMap);
            if (m.pass && m.mode === "semantic") semanticMatches.push(alt);
            return m.pass;
        });
        if (!matched) missingRequiredConcepts.push(alternatives);
    }

    for (const concept of forbiddenConcepts) {
        const alternatives = conceptToAlternatives(concept);
        if (alternatives.length === 0) continue;
        const matched = alternatives.some((alt) => matchPhraseSemantically(outputNorm, outputTokenSet, alt, synonymMap).pass);
        if (matched) hitForbiddenConcepts.push(alternatives);
    }

    let bestTokenF1 = 0;
    let bestLcsRatio = 0;
    if (referenceTexts.length > 0) {
        for (const ref of referenceTexts) {
            const refTokens = semanticTokens(ref);
            if (refTokens.length === 0) continue;
            const f1 = tokenF1(refTokens, outputTokens);
            const lcs = longestCommonSubsequence(refTokens, outputTokens);
            const lcsRatio = lcs / refTokens.length;
            bestTokenF1 = Math.max(bestTokenF1, f1);
            bestLcsRatio = Math.max(bestLcsRatio, lcsRatio);
        }
    }

    const semanticProfile = semantic.profile === "strict" || semantic.profile === "balanced" || semantic.profile === "lenient"
        ? semantic.profile
        : "balanced";
    const profileDefaults = SEMANTIC_PROFILES[semanticProfile];
    const minTokenF1 = typeof semantic.min_token_f1 === "number"
        ? semantic.min_token_f1
        : (referenceTexts.length > 0 ? profileDefaults.minTokenF1 : undefined);
    const minLcsRatio = typeof semantic.min_lcs_ratio === "number"
        ? semantic.min_lcs_ratio
        : (referenceTexts.length > 0 ? profileDefaults.minLcsRatio : undefined);

    const violations: string[] = [];
    if (missingRequiredConcepts.length > 0) violations.push("semantic_required_concepts_missing");
    if (hitForbiddenConcepts.length > 0) violations.push("semantic_forbidden_concept_present");
    if (typeof minTokenF1 === "number" && bestTokenF1 < minTokenF1) violations.push("semantic_token_f1_below_threshold");
    if (typeof minLcsRatio === "number" && bestLcsRatio < minLcsRatio) violations.push("semantic_lcs_below_threshold");

    const pass = violations.length === 0;
    return {
        name: "semantic_quality",
        pass,
        details: {
            reason_code: pass ? undefined : violations[0],
            violations: pass ? [] : violations,
            required_concepts_count: requiredConcepts.length,
            forbidden_concepts_count: forbiddenConcepts.length,
            missing_required_concepts: missingRequiredConcepts,
            hit_forbidden_concepts: hitForbiddenConcepts,
            semantic_phrase_matches: Array.from(new Set(semanticMatches)),
            reference_count: referenceTexts.length,
            best_token_f1: Number(bestTokenF1.toFixed(3)),
            best_lcs_ratio: Number(bestLcsRatio.toFixed(3)),
            semantic_profile: semanticProfile,
            min_token_f1: minTokenF1,
            min_lcs_ratio: minLcsRatio,
        },
    };
}

type PlanEnvelope = {
    allowed_tools?: string[];
    declared_end_state?: unknown;
    constraints?: Record<string, unknown>;
};

const DEFAULT_MUTATION_TOOLS = new Set<string>([
    "write_file",
    "delete_file",
    "move_file",
    "run_shell",
    "exec",
    "commit_changes",
    "create_ticket",
    "update_ticket",
    "deploy",
]);

const DEFAULT_REPL_TOOLS = new Set<string>([
    "run_shell",
    "bash",
    "terminal",
    "exec",
    "python_repl",
]);

function normalizeToolSet(values: string[] | undefined, fallback: Set<string>): Set<string> {
    if (!Array.isArray(values) || values.length === 0) return fallback;
    return new Set(values.map((v) => String(v).trim()).filter((v) => v.length > 0));
}

function extractPlanEnvelope(resp: AgentResponse): PlanEnvelope | undefined {
    const out = resp.final_output;
    if (!out || out.content_type !== "json" || !out.content || typeof out.content !== "object") return undefined;
    const obj = out.content as Record<string, unknown>;
    const candidate = obj.plan_envelope ?? obj.plan;
    if (!candidate || typeof candidate !== "object") return undefined;
    const plan = candidate as Record<string, unknown>;
    const allowed = Array.isArray(plan.allowed_tools)
        ? plan.allowed_tools.map((x) => String(x)).filter((x) => x.length > 0)
        : undefined;
    return {
        ...(allowed && allowed.length > 0 ? { allowed_tools: allowed } : {}),
        ...(plan.declared_end_state !== undefined ? { declared_end_state: plan.declared_end_state } : {}),
        ...(plan.constraints && typeof plan.constraints === "object"
            ? { constraints: plan.constraints as Record<string, unknown> }
            : {}),
    };
}

function commandTextFromArgs(args: Record<string, unknown>): string {
    const directKeys = ["command", "cmd", "script"];
    for (const key of directKeys) {
        const val = args[key];
        if (typeof val === "string" && val.length > 0) return val;
    }
    try {
        return JSON.stringify(args);
    } catch {
        return String(args);
    }
}

function extractCommandPaths(commandText: string): string[] {
    if (!commandText || commandText.trim().length === 0) return [];
    const quoted = commandText.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g) ?? [];
    const unquoted = commandText.split(/\s+/);
    const tokens = [...quoted, ...unquoted]
        .map((t) => t.replace(/^['"]|['"]$/g, "").trim())
        .filter((t) => t.length > 0);
    const candidates = tokens.filter((t) => t.startsWith("/") || t.startsWith("./") || t.startsWith("../") || t.startsWith("~"));
    return Array.from(new Set(candidates));
}

type RuntimePolicyViolation = {
    scope: "planning_gate" | "repl_policy";
    severity: "require_approval" | "block";
    code: string;
    message: string;
    details?: Record<string, unknown>;
};

function runtimePolicyViolations(resp: AgentResponse): RuntimePolicyViolation[] {
    const raw = (resp as Record<string, unknown>).policy_violations;
    if (!Array.isArray(raw)) return [];
    const out: RuntimePolicyViolation[] = [];
    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        const scope = rec.scope;
        const severity = rec.severity;
        const code = rec.code;
        const message = rec.message;
        if (
            (scope === "planning_gate" || scope === "repl_policy") &&
            (severity === "require_approval" || severity === "block") &&
            typeof code === "string" &&
            typeof message === "string"
        ) {
            out.push({
                scope,
                severity,
                code,
                message,
                ...(rec.details && typeof rec.details === "object" ? { details: rec.details as Record<string, unknown> } : {}),
            });
        }
    }
    return out;
}

export function checkPlanningGate(expected: Expected, resp: AgentResponse): AssertionResult {
    const policy = expected.planning_gate;
    if (!policy) {
        return { name: "planning_gate", pass: true, details: { note: "not_required" } };
    }

    const adapterViolations = runtimePolicyViolations(resp).filter((v) => v.scope === "planning_gate");
    if (adapterViolations.length > 0) {
        return {
            name: "planning_gate",
            pass: false,
            details: {
                reason_code: adapterViolations[0]?.code ?? "planning_gate_violation",
                source: "adapter_runtime_policy",
                violations: adapterViolations.map((v) => ({
                    code: v.code,
                    severity: v.severity,
                    ...(v.details ? { details: v.details } : {}),
                })),
            },
        };
    }

    const mutationTools = normalizeToolSet(policy.mutation_tools, DEFAULT_MUTATION_TOOLS);
    const highRiskTools = normalizeToolSet(policy.high_risk_tools, new Set<string>());
    const calls = toolCalls(resp.events ?? []);
    const mutationCalls = calls.filter((c) => mutationTools.has(c.tool));
    const hasMutations = mutationCalls.length > 0;
    const envelope = extractPlanEnvelope(resp);

    if (policy.required_for_mutations === true && hasMutations && !envelope) {
        return {
            name: "planning_gate",
            pass: false,
            details: {
                reason_code: "missing_plan_envelope",
                mutation_tools_seen: mutationCalls.map((c) => c.tool),
                high_risk_mismatch: mutationCalls.some((c) => highRiskTools.has(c.tool)),
            },
        };
    }

    if (policy.require_declared_end_state === true && hasMutations) {
        const hasDeclared = Boolean(envelope && envelope.declared_end_state !== undefined && envelope.declared_end_state !== null);
        if (!hasDeclared) {
            return {
                name: "planning_gate",
                pass: false,
                details: {
                    reason_code: "declared_end_state_missing",
                    mutation_tools_seen: mutationCalls.map((c) => c.tool),
                    high_risk_mismatch: mutationCalls.some((c) => highRiskTools.has(c.tool)),
                },
            };
        }
    }

    if (envelope?.allowed_tools && envelope.allowed_tools.length > 0 && hasMutations) {
        const allowed = new Set(envelope.allowed_tools);
        const mismatches = mutationCalls.filter((c) => !allowed.has(c.tool)).map((c) => c.tool);
        if (mismatches.length > 0) {
            return {
                name: "planning_gate",
                pass: false,
                details: {
                    reason_code: "tool_outside_plan",
                    allowed_tools: envelope.allowed_tools,
                    mismatch_tools: Array.from(new Set(mismatches)),
                    high_risk_mismatch: mismatches.some((t) => highRiskTools.has(t)),
                },
            };
        }
    }

    return {
        name: "planning_gate",
        pass: true,
        details: {
            plan_present: Boolean(envelope),
            mutation_tool_count: mutationCalls.length,
        },
    };
}

export function checkReplPolicy(expected: Expected, resp: AgentResponse): AssertionResult {
    const policy = expected.repl_policy;
    if (!policy) {
        return { name: "repl_policy", pass: true, details: { note: "not_required" } };
    }

    const adapterViolations = runtimePolicyViolations(resp).filter((v) => v.scope === "repl_policy");
    if (adapterViolations.length > 0) {
        return {
            name: "repl_policy",
            pass: false,
            details: {
                reason_code: adapterViolations[0]?.code ?? "repl_policy_violation",
                source: "adapter_runtime_policy",
                violations: adapterViolations.map((v) => ({
                    code: v.code,
                    severity: v.severity,
                    ...(v.details ? { details: v.details } : {}),
                })),
                high_risk_violation: adapterViolations.some((v) => v.severity === "block"),
            },
        };
    }

    const replToolNames = normalizeToolSet(policy.tool_allowlist, DEFAULT_REPL_TOOLS);
    const calls = toolCalls(resp.events ?? []);
    const replCalls = calls.filter((c) => DEFAULT_REPL_TOOLS.has(c.tool) || replToolNames.has(c.tool));

    const violations: string[] = [];
    let highRisk = false;

    if (Array.isArray(policy.tool_allowlist) && policy.tool_allowlist.length > 0) {
        const allow = new Set(policy.tool_allowlist.map((t) => String(t)));
        const disallowed = replCalls.filter((c) => !allow.has(c.tool)).map((c) => c.tool);
        if (disallowed.length > 0) {
            violations.push(`tool_not_allowlisted:${Array.from(new Set(disallowed)).join(",")}`);
            highRisk = true;
        }
    }

    if (Array.isArray(policy.denied_command_patterns) && policy.denied_command_patterns.length > 0) {
        const patterns = policy.denied_command_patterns
            .map((p) => {
                try {
                    return new RegExp(p, "i");
                } catch {
                    return null;
                }
            })
            .filter((p): p is RegExp => p !== null);

        for (const call of replCalls) {
            const text = commandTextFromArgs(call.args);
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    violations.push(`denied_pattern:${call.tool}:${pattern.source}`);
                    highRisk = true;
                }
            }
        }
    }

    if (typeof policy.max_command_length === "number" && policy.max_command_length > 0) {
        for (const call of replCalls) {
            const text = commandTextFromArgs(call.args);
            if (text.length > policy.max_command_length) {
                violations.push(`command_too_long:${call.tool}:${text.length}`);
            }
        }
    }

    if (typeof policy.max_tool_calls === "number" && policy.max_tool_calls > 0) {
        if (replCalls.length > policy.max_tool_calls) {
            violations.push(`too_many_repl_calls:${replCalls.length}`);
        }
    }

    if (Array.isArray(policy.denied_path_patterns) && policy.denied_path_patterns.length > 0) {
        const patterns = policy.denied_path_patterns
            .map((p) => {
                try {
                    return new RegExp(p, "i");
                } catch {
                    return null;
                }
            })
            .filter((p): p is RegExp => p !== null);
        for (const call of replCalls) {
            const paths = extractCommandPaths(commandTextFromArgs(call.args));
            for (const p of paths) {
                for (const re of patterns) {
                    if (re.test(p)) {
                        violations.push(`denied_path_pattern:${call.tool}:${re.source}`);
                        highRisk = true;
                    }
                }
            }
        }
    }

    if (Array.isArray(policy.allowed_path_prefixes) && policy.allowed_path_prefixes.length > 0) {
        for (const call of replCalls) {
            const paths = extractCommandPaths(commandTextFromArgs(call.args));
            const disallowed = paths.filter((p) => !policy.allowed_path_prefixes?.some((prefix) => p.startsWith(prefix)));
            if (disallowed.length > 0) {
                violations.push(`path_outside_allowlist:${call.tool}:${disallowed[0] ?? "unknown"}`);
                highRisk = true;
            }
        }
    }

    if (violations.length > 0) {
        return {
            name: "repl_policy",
            pass: false,
            details: {
                reason_code: "repl_policy_violation",
                violations,
                high_risk_violation: highRisk,
            },
        };
    }

    return {
        name: "repl_policy",
        pass: true,
        details: {
            repl_call_count: replCalls.length,
        },
    };
}

/* ------------------------------------------------------------------ */
/*  Assertions                                                         */
/* ------------------------------------------------------------------ */

export function checkEvidenceRefsStrict(expected: Expected, resp: AgentResponse): AssertionResult {
    if (expected.evidence_required_for_actions !== true) {
        return { name: "evidence_required_for_actions", pass: true, details: { note: "not required" } };
    }

    const ev = resp.events ?? [];
    const toolResultIds = new Set(toolResults(ev).map((e) => e.call_id));
    const retrievalIds = new Set(extractRetrievalDocIds(ev));
    const missingActions: string[] = [];

    const respAny = resp as unknown as Record<string, unknown>;
    const actionsRaw = respAny.proposed_actions;
    const actions = Array.isArray(actionsRaw) ? (actionsRaw as ProposedAction[]) : [];

    for (const a of actions) {
        const risk = a.risk_level ?? "medium";
        if (risk === "low") continue;

        const refs = Array.isArray(a.evidence_refs) ? a.evidence_refs : [];
        if (refs.length === 0) {
            missingActions.push(a.action_id);
            continue;
        }

        for (const r of refs) {
            if (r.kind === "tool_result" && !toolResultIds.has(r.call_id)) {
                return {
                    name: "evidence_required_for_actions",
                    pass: false,
                    details: { error: "evidence_refs references missing tool_result", action_id: a.action_id, call_id: r.call_id },
                };
            }
            if (r.kind === "retrieval_doc" && !retrievalIds.has(r.id)) {
                return {
                    name: "evidence_required_for_actions",
                    pass: false,
                    details: { error: "evidence_refs references missing retrieval_doc", action_id: a.action_id, doc_id: r.id },
                };
            }
        }
    }

    return {
        name: "evidence_required_for_actions",
        pass: missingActions.length === 0,
        details: { actions_missing_evidence: missingActions },
    };
}

export function checkRunnerTransport(resp: AgentResponse): AssertionResult {
    const rf = resp.runner_failure;
    if (!rf || rf.type !== "runner_fetch_failure") {
        return { name: "runner_transport_success", pass: true, details: { note: "no_runner_failure" } };
    }

    const details: AssertionDetails = {
        class: rf.class,
        attempt: rf.attempt,
    };
    if (typeof rf.status === "number") details.http_status = rf.status;
    if (typeof rf.timeout_ms === "number") details.timeout_ms = rf.timeout_ms;
    if (typeof rf.error_name === "string") details.error_name = rf.error_name;

    return {
        name: "runner_transport_success",
        pass: false,
        details,
    };
}

export function checkToolExecution(resp: AgentResponse): AssertionResult {
    const ev = resp.events ?? [];
    const failed = toolResults(ev)
        .filter((e) => e.status !== "ok")
        .map((e) => ({ call_id: e.call_id, status: e.status }));

    return {
        name: "tool_execution",
        pass: failed.length === 0,
        details: { failed },
    };
}

export function checkHallucinationSignal(resp: AgentResponse): AssertionResult {
    if (!resp.final_output || typeof resp.final_output !== "object" || !("content_type" in resp.final_output)) {
        return { name: "hallucination_signal_check", pass: true, details: { note: "missing final_output" } };
    }
    let mentioned: string | null = null;

    if (resp.final_output.content_type === "json" && resp.final_output.content && typeof resp.final_output.content === "object") {
        const obj = resp.final_output.content as Record<string, unknown>;
        const ticketId = obj.ticket_id;
        if (typeof ticketId === "string" && ticketId.length > 0) mentioned = ticketId;
    }

    if (!mentioned) {
        const text = stringifyOutput(resp.final_output);
        const m = text.match(/\bT-\d{4}\b/);
        if (!m) return { name: "hallucination_signal_check", pass: true, details: { note: "no ticket id in output" } };
        mentioned = m[0];
    }

    const results = extractToolResultsWithToolName(resp.events ?? []);
    const create = results.find((r) => r.tool === "create_ticket" && r.status === "ok");

    if (!create || create.payload_summary === undefined || typeof create.payload_summary !== "object") {
        return { name: "hallucination_signal_check", pass: true, details: { note: "no create_ticket result to compare" } };
    }

    const ticketId = (create.payload_summary as Record<string, unknown>).ticket_id;
    if (typeof ticketId !== "string") {
        return { name: "hallucination_signal_check", pass: true, details: { note: "create_ticket result has no ticket_id" } };
    }

    const mismatch = ticketId !== mentioned;
    return {
        name: "hallucination_signal_check",
        pass: !mismatch,
        details: { tool_ticket_id: ticketId, mentioned_ticket_id: mentioned, mismatch },
    };
}

/* ------------------------------------------------------------------ */
/*  Root cause analysis                                                */
/* ------------------------------------------------------------------ */

export function chooseRootCause(assertions: AssertionResult[], resp: AgentResponse): RootCause {
    const ev = resp.events ?? [];
    const toolFailure = toolResults(ev).some((e) => e.status === "error" || e.status === "timeout");
    if (toolFailure) return "tool_failure";

    // Transport/runtime failures should dominate assertion-derived classifications
    // (e.g. avoid mislabeling a runner HTTP 500 as a format_violation).
    const rf = resp.runner_failure;
    if (rf && rf.type === "runner_fetch_failure") {
        if (rf.class === "timeout" || rf.class === "network_error" || rf.class === "http_error" || rf.class === "invalid_json") {
            return "missing_required_data";
        }
    }

    const schema = assertions.find((a) => a.name === "json_schema");
    if (schema && schema.pass === false) return "format_violation";

    const retrieval = assertions.find((a) => a.name === "retrieval_required");
    if (retrieval && retrieval.pass === false) return "missing_required_data";

    const telemetry = assertions.find((a) => a.name === "tool_telemetry");
    if (telemetry && telemetry.pass === false) return "missing_required_data";

    const planning = assertions.find((a) => a.name === "planning_gate");
    if (planning && planning.pass === false) return "wrong_tool_choice";
    const repl = assertions.find((a) => a.name === "repl_policy");
    if (repl && repl.pass === false) return "wrong_tool_choice";
    const assumptions = assertions.find((a) => a.name === "assumption_state");
    if (assumptions && assumptions.pass === false) return "missing_required_data";

    const wrongTool = ["action_required", "tool_required", "tool_sequence"].some((n) => {
        const a = assertions.find((x) => x.name === n);
        return a ? a.pass === false : false;
    });
    if (wrongTool) return "wrong_tool_choice";

    const halluc = assertions.find((a) => a.name === "hallucination_signal_check");
    if (halluc && halluc.pass === false) return "hallucination_signal";

    return "unknown";
}

/* ------------------------------------------------------------------ */
/*  Policy rules                                                       */
/* ------------------------------------------------------------------ */

export function mapPolicyRules(
    root: RootCause | undefined,
    evidenceFailed: boolean,
    options?: { planningFailed?: boolean; replFailed?: boolean }
): string[] {
    const rules: string[] = [];
    if (root === "wrong_tool_choice") rules.push("Rule1");
    if (root === "format_violation") rules.push("Rule3");
    if (root === "missing_required_data") rules.push("Rule2", "Rule4");
    if (root === "hallucination_signal") rules.push("Rule3", "Rule4");
    if (root === "missing_case") rules.push("Rule2");
    if (evidenceFailed) rules.push("Rule4");
    if (options?.planningFailed === true) rules.push("Rule5");
    if (options?.replFailed === true) rules.push("Rule6");
    return Array.from(new Set(rules));
}

/* ------------------------------------------------------------------ */
/*  evaluateOne                                                        */
/* ------------------------------------------------------------------ */

export function evaluateOne(c: Case, resp: AgentResponse, ajv: Ajv): EvaluationResult {
    const exp = c.expected;
    const assertions: AssertionResult[] = [];

    const actionsRaw = (resp as unknown as Record<string, unknown>).proposed_actions;
    const actions = Array.isArray(actionsRaw) ? (actionsRaw as ProposedAction[]) : [];
    const plannedActions = actions.map((a) => a.action_type);

    if (exp.action_required?.length) {
        const missing = exp.action_required.filter((x) => !plannedActions.includes(x));
        assertions.push({ name: "action_required", pass: missing.length === 0, details: { missing_actions: missing } });
    }

    const ev = resp.events ?? [];
    const calls = extractToolCallNames(ev);
    assertions.push(checkToolTelemetryAvailability(exp, resp));

    if (exp.tool_required?.length) {
        const missing = exp.tool_required.filter((t) => !calls.includes(t));
        assertions.push({ name: "tool_required", pass: missing.length === 0, details: { missing_tools: missing } });
    }

    if (exp.tool_sequence?.length) {
        const pass = exp.tool_sequence.every((t, i) => calls[i] === t);
        assertions.push({ name: "tool_sequence", pass, details: { expected: exp.tool_sequence, actual: calls } });
    }

    const outText = stringifyOutput(resp.final_output);
    const outNorm = normalizeSemanticText(outText);
    const outTokenSet = tokenSet(semanticTokens(outText));
    const semanticSynonyms = buildSemanticSynonymMap(exp.semantic);

    if (exp.must_include?.length) {
        const missing: string[] = [];
        const semanticPhraseMatches: string[] = [];
        for (const phrase of exp.must_include) {
            const matched = matchPhraseSemantically(outNorm, outTokenSet, phrase, semanticSynonyms);
            if (!matched.pass) {
                missing.push(phrase);
            } else if (matched.mode === "semantic") {
                semanticPhraseMatches.push(phrase);
            }
        }
        assertions.push({
            name: "must_include",
            pass: missing.length === 0,
            details: {
                missing_phrases: missing,
                semantic_phrase_matches: semanticPhraseMatches,
            },
        });
    }

    if (exp.must_not_include?.length) {
        const out = outText.toLowerCase();
        const found = exp.must_not_include.filter((p) => out.includes(p.toLowerCase()));
        assertions.push({ name: "must_not_include", pass: found.length === 0, details: { found_phrases: found } });
    }

    assertions.push(checkSemanticQuality(exp, resp));

    if (exp.retrieval_required?.doc_ids?.length) {
        const docs = extractRetrievalDocIds(ev);
        const missing = exp.retrieval_required.doc_ids.filter((d) => !docs.includes(d));
        assertions.push({
            name: "retrieval_required",
            pass: missing.length === 0,
            details: { missing_doc_ids: missing, actual_doc_ids: docs },
        });
    }

    if (exp.json_schema !== undefined && exp.json_schema !== null) {
        const validate = ajv.compile(exp.json_schema);
        const pass = Boolean(validate(resp.final_output.content));
        assertions.push({
            name: "json_schema",
            pass,
            details: pass ? { schema_errors: [] } : { schema_errors: validate.errors ?? [] },
        });
    }

    // A captured runner failure means the agent response artifact is not a valid
    // execution result, even if no case-specific assertions were configured.
    const runnerTransport = checkRunnerTransport(resp);
    assertions.push(runnerTransport);

    const evidence = checkEvidenceRefsStrict(exp, resp);
    assertions.push(evidence);

    const toolExec = checkToolExecution(resp);
    assertions.push(toolExec);

    const halluc = checkHallucinationSignal(resp);
    assertions.push(halluc);

    const planningGate = checkPlanningGate(exp, resp);
    assertions.push(planningGate);

    const replPolicy = checkReplPolicy(exp, resp);
    assertions.push(replPolicy);
    const assumptionState = checkAssumptionState(exp, resp);
    assertions.push(assumptionState);

    const passAll = assertions.every((a) => a.pass === true);
    const root = passAll ? undefined : chooseRootCause(assertions, resp);

    const evidenceFailed = exp.evidence_required_for_actions === true && evidence.pass === false;
    const planningFailed = planningGate.pass === false;
    const replFailed = replPolicy.pass === false;
    const preventableByPolicy = (root !== undefined && root !== "tool_failure") || evidenceFailed;
    const rules = mapPolicyRules(root, evidenceFailed, { planningFailed, replFailed });

    const result: EvaluationResult = {
        case_id: c.id,
        title: c.title,
        pass: passAll,
        assertions,
        preventable_by_policy: preventableByPolicy,
        recommended_policy_rules: rules,
    };

    if (!passAll && root !== undefined) result.root_cause = root;
    return result;
}

/* ------------------------------------------------------------------ */
/*  Trace integrity                                                    */
/* ------------------------------------------------------------------ */

export function computeTraceIntegritySide(resp: AgentResponse, expected: Expected): TraceIntegritySide {
    const issues: string[] = [];
    const events = Array.isArray(resp.events) ? resp.events : [];
    const calls = toolCalls(events);
    const results = toolResults(events);
    const retrievals = retrievalEvents(events);
    const finals = finalOutputEvents(events);

    if (!Array.isArray(resp.events)) issues.push("events_not_array");
    if (events.length === 0) issues.push("no_events");

    const callIds = calls.map((c) => c.call_id);
    const resultIds = results.map((r) => r.call_id);

    const callIdSet = new Set<string>();
    let dupCalls = 0;
    for (const id of callIds) {
        if (callIdSet.has(id)) dupCalls += 1;
        callIdSet.add(id);
    }

    const resultIdSet = new Set<string>();
    let dupResults = 0;
    for (const id of resultIds) {
        if (resultIdSet.has(id)) dupResults += 1;
        resultIdSet.add(id);
    }

    if (dupCalls > 0 || dupResults > 0) issues.push("duplicate_call_id");

    let missingToolResults = 0;
    for (const id of callIdSet) {
        if (!resultIdSet.has(id)) missingToolResults += 1;
    }
    let orphanToolResults = 0;
    for (const id of resultIdSet) {
        if (!callIdSet.has(id)) orphanToolResults += 1;
    }

    if (missingToolResults > 0) issues.push("tool_call_without_result");
    if (orphanToolResults > 0) issues.push("tool_result_without_call");

    let nonFiniteTs = 0;
    for (const e of events) {
        const ts = (e as { ts?: unknown }).ts;
        if (typeof ts !== "number" || !Number.isFinite(ts)) nonFiniteTs += 1;
    }
    if (nonFiniteTs > 0) issues.push("missing_timestamps");

    if (finals.length === 0) issues.push("missing_final_output_event");

    if (expected.retrieval_required?.doc_ids?.length) {
        if (retrievals.length === 0) issues.push("retrieval_required_missing");
    }

    const hasRunnerFailure = Boolean(resp.runner_failure && resp.runner_failure.type === "runner_fetch_failure");

    if (issues.length === 0) return { status: "ok", issues: [] };

    const isBroken =
        (events.length === 0 && !hasRunnerFailure) ||
        issues.includes("events_not_array") ||
        issues.includes("tool_result_without_call");

    return { status: isBroken ? "broken" : "partial", issues };
}

export function missingTraceSide(reason: string): TraceIntegritySide {
    return { status: "broken", issues: [reason] };
}

function assertionByName(evalResult: EvaluationResult | undefined, name: string): AssertionResult | undefined {
    if (!evalResult?.assertions?.length) return undefined;
    return evalResult.assertions.find((a) => a.name === name);
}

export function derivePolicySignals(resp: AgentResponse, evalResult: EvaluationResult | undefined): SecuritySignal[] {
    const signals: SecuritySignal[] = [];
    const baseEvidence: SecuritySignal["evidence_refs"] = [
        { kind: "asset", manifest_key: manifestKeyFor({ caseId: resp.case_id, version: resp.version, kind: "case_response" }) },
        { kind: "final_output", manifest_key: manifestKeyFor({ caseId: resp.case_id, version: resp.version, kind: "final_output" }) },
    ];

    const planning = assertionByName(evalResult, "planning_gate");
    if (planning && planning.pass === false) {
        const details = (planning.details ?? {}) as Record<string, unknown>;
        const highRisk = details.high_risk_mismatch === true;
        signals.push({
            kind: "policy_tampering",
            severity: highRisk ? "critical" : "high",
            confidence: "high",
            title: "Planning gate mismatch",
            details: {
                notes: String(details.reason_code ?? "planning_gate_failed"),
            },
            evidence_refs: baseEvidence,
        });
    }

    const repl = assertionByName(evalResult, "repl_policy");
    if (repl && repl.pass === false) {
        const details = (repl.details ?? {}) as Record<string, unknown>;
        const highRisk = details.high_risk_violation === true;
        signals.push({
            kind: "policy_tampering",
            severity: highRisk ? "critical" : "high",
            confidence: "high",
            title: "REPL policy violation",
            details: {
                notes: String(details.reason_code ?? "repl_policy_failed"),
            },
            evidence_refs: baseEvidence,
        });
    }

    return signals;
}

export function computeSecuritySide(resp: AgentResponse): { signals: SecuritySignal[]; requires_gate_recommendation: boolean } {
    const signals: SecuritySignal[] = [];
    const rf = resp.runner_failure;
    const evidenceRunner: SecuritySignal["evidence_refs"] = rf
        ? [{ kind: "runner_failure", manifest_key: manifestKeyFor({ caseId: resp.case_id, version: resp.version, kind: "runner_failure" }) }]
        : [];

    if (rf && rf.type === "runner_fetch_failure") {
        const note = [
            rf.class ? `class=${rf.class}` : "",
            rf.error_name ? `error_name=${rf.error_name}` : "",
            rf.error_message ? `error=${rf.error_message}` : "",
            rf.url ? `url=${rf.url}` : "",
        ]
            .filter(Boolean)
            .join(" · ");

        const details: { notes?: string; urls?: string[] } = { notes: note };
        if (rf.url) details.urls = [rf.url];

        signals.push({
            kind: "runner_failure_detected",
            severity: rf.class === "network_error" || rf.class === "timeout" ? "high" : "medium",
            confidence: "high",
            title: "Runner failure captured",
            details,
            evidence_refs: evidenceRunner,
        });
    }

    return { signals, requires_gate_recommendation: false };
}

/* ------------------------------------------------------------------ */
/*  Gate / risk                                                        */
/* ------------------------------------------------------------------ */

function severityRank(s: SignalSeverity): number {
    if (s === "critical") return 4;
    if (s === "high") return 3;
    if (s === "medium") return 2;
    return 1;
}

function maxSeverity(signals: SecuritySignal[]): SignalSeverity | null {
    if (signals.length === 0) return null;
    let best: SignalSeverity = "low";
    for (const s of signals) {
        if (severityRank(s.severity) > severityRank(best)) best = s.severity;
    }
    return best;
}

export function deriveGateRecommendation(params: {
    newSignals: SecuritySignal[];
    newAvailability: DataAvailabilitySide;
    caseStatus: CaseStatus;
}): GateRecommendation {
    if (params.caseStatus !== "executed") return "none";

    const sev = maxSeverity(params.newSignals);
    if (sev === "critical") return "block";
    if (sev === "high") return "require_approval";

    if (params.newAvailability.status === "missing" || params.newAvailability.status === "broken") {
        return "require_approval";
    }

    return "none";
}

export function deriveRiskLevel(gate: GateRecommendation): RiskLevel {
    if (gate === "block") return "high";
    if (gate === "require_approval") return "medium";
    return "low";
}

export function deriveRiskTags(params: {
    newSignals: SecuritySignal[];
    regression: boolean;
    caseStatus: CaseStatus;
    newAvailability: DataAvailabilitySide;
}): string[] {
    const tags = new Set<string>();
    for (const s of params.newSignals) tags.add(s.kind);
    if (params.regression) tags.add("regression");
    if (params.caseStatus === "filtered_out") tags.add("filtered_out");
    if (params.caseStatus === "missing") tags.add("missing");
    if (params.newAvailability.status === "missing") tags.add("missing_new");
    if (params.newAvailability.status === "broken") tags.add("broken_new");
    return Array.from(tags);
}

export function deriveFailureSummarySide(
    rf: RunnerFailureArtifact | undefined
): {
    class: string;
    http_status?: number;
    timeout_ms?: number;
    attempts?: number;
    net_error_kind?: string;
    timeout_cause?: string;
} | undefined {
    if (!rf || rf.type !== "runner_fetch_failure") return undefined;
    const out: {
        class: string;
        http_status?: number;
        timeout_ms?: number;
        attempts?: number;
        net_error_kind?: string;
        timeout_cause?: string;
    } = {
        class: rf.class ?? "other",
    };
    if (typeof rf.status === "number") out.http_status = rf.status;
    if (typeof rf.timeout_ms === "number") out.timeout_ms = rf.timeout_ms;
    if (typeof rf.attempt === "number") out.attempts = rf.attempt;
    if (typeof rf.net_error_kind === "string" && rf.net_error_kind.length > 0) out.net_error_kind = rf.net_error_kind;
    if (typeof rf.timeout_cause === "string" && rf.timeout_cause.length > 0) out.timeout_cause = rf.timeout_cause;
    return out;
}

export function topKinds(signals: SecuritySignal[]): string[] {
    const counts = new Map<string, number>();
    for (const s of signals) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
    return Array.from(counts.entries())
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 5)
        .map(([k]) => k);
}

export function severityCountsInit(): Record<SignalSeverity, number> {
    return { low: 0, medium: 0, high: 0, critical: 0 };
}

export function bumpCounts(counts: Record<SignalSeverity, number>, severity: SignalSeverity): void {
    counts[severity] = (counts[severity] ?? 0) + 1;
}
