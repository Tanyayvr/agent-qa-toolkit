// apps/evaluator/src/core.test.ts
import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import {
    evaluateOne,
    chooseRootCause,
    mapPolicyRules,
    checkEvidenceRefsStrict,
    checkRunnerTransport,
    checkToolExecution,
    checkHallucinationSignal,
    checkToolTelemetryAvailability,
    toolCalls,
    toolResults,
    retrievalEvents,
    finalOutputEvents,
    extractRetrievalDocIds,
    extractToolResultsWithToolName,
    computeTraceIntegritySide,
    deriveGateRecommendation,
    deriveRiskLevel,
    deriveRiskTags,
    missingTraceSide,
    computeSecuritySide,
    deriveFailureSummarySide,
    topKinds,
    severityCountsInit,
    bumpCounts,
    stringifyOutput,
    extractToolCallNames,
    type Case,
} from "./core";
import type { AgentResponse, RunEvent } from "shared-types";
import type { SecuritySignal } from "./htmlReport";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mkCase(overrides: Partial<Case> = {}): Case {
    return {
        id: "c1",
        title: "Test case",
        input: { user: "hello" },
        expected: {},
        ...overrides,
    };
}

function mkResp(overrides: Partial<AgentResponse> = {}): AgentResponse {
    return {
        case_id: "c1",
        version: "new",
        final_output: { content_type: "text", content: "hello world" },
        events: [],
        ...overrides,
    };
}

/* ------------------------------------------------------------------ */
/*  stringifyOutput                                                    */
/* ------------------------------------------------------------------ */

describe("stringifyOutput", () => {
    it("returns text content as-is", () => {
        expect(stringifyOutput({ content_type: "text", content: "hello" })).toBe("hello");
    });

    it("JSON-stringifies json content", () => {
        const result = stringifyOutput({ content_type: "json", content: { key: "val" } });
        expect(JSON.parse(result)).toEqual({ key: "val" });
    });

    it("handles null content gracefully", () => {
        expect(stringifyOutput({ content_type: "text", content: null })).toBe("");
    });
});

/* ------------------------------------------------------------------ */
/*  extractToolCallNames                                               */
/* ------------------------------------------------------------------ */

describe("extractToolCallNames", () => {
    it("returns tool names sorted by timestamp", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 200, call_id: "a", tool: "second", args: {} },
            { type: "tool_call", ts: 100, call_id: "b", tool: "first", args: {} },
        ];
        expect(extractToolCallNames(events)).toEqual(["first", "second"]);
    });

    it("returns empty array for no tool calls", () => {
        expect(extractToolCallNames([])).toEqual([]);
    });
});

describe("event helpers", () => {
    const events: RunEvent[] = [
        { type: "tool_call", ts: 1, call_id: "c1", tool: "search", args: {} },
        { type: "tool_result", ts: 2, call_id: "c1", status: "ok", payload_summary: { hits: 1 } },
        { type: "retrieval", ts: 3, doc_ids: ["d1", "d2"] },
        { type: "final_output", ts: 4, content_type: "text", content: "done" },
    ];

    it("filters event subsets by type", () => {
        expect(toolCalls(events)).toHaveLength(1);
        expect(toolResults(events)).toHaveLength(1);
        expect(retrievalEvents(events)).toHaveLength(1);
        expect(finalOutputEvents(events)).toHaveLength(1);
    });

    it("extracts retrieval doc ids and maps tool names onto tool results", () => {
        expect(extractRetrievalDocIds(events)).toEqual(["d1", "d2"]);
        expect(extractToolResultsWithToolName(events)).toEqual([
            { call_id: "c1", status: "ok", payload_summary: { hits: 1 }, tool: "search" },
        ]);
    });
});

describe("checkEvidenceRefsStrict", () => {
    it("passes when evidence is not required", () => {
        const result = checkEvidenceRefsStrict({}, mkResp());
        expect(result.pass).toBe(true);
    });

    it("fails when medium/high risk action has no evidence refs", () => {
        const result = checkEvidenceRefsStrict(
            { evidence_required_for_actions: true },
            mkResp({
                proposed_actions: [
                    {
                        action_id: "a1",
                        action_type: "tool_call",
                        tool_name: "dangerous_tool",
                        params: {},
                        risk_level: "high",
                    },
                ],
            })
        );
        expect(result.pass).toBe(false);
        expect(result.details).toMatchObject({ actions_missing_evidence: ["a1"] });
    });

    it("fails when evidence refs point to missing tool_result/retrieval_doc", () => {
        const result = checkEvidenceRefsStrict(
            { evidence_required_for_actions: true },
            mkResp({
                proposed_actions: [
                    {
                        action_id: "a1",
                        action_type: "tool_call",
                        tool_name: "dangerous_tool",
                        params: {},
                        risk_level: "high",
                        evidence_refs: [{ kind: "tool_result", call_id: "missing" }],
                    },
                ],
                events: [],
            })
        );
        expect(result.pass).toBe(false);
        expect(result.details).toMatchObject({ error: "evidence_refs references missing tool_result" });
    });

    it("passes when evidence refs point to existing tool_result and retrieval doc", () => {
        const result = checkEvidenceRefsStrict(
            { evidence_required_for_actions: true },
            mkResp({
                proposed_actions: [
                    {
                        action_id: "a1",
                        action_type: "lookup",
                        tool_name: "search_docs",
                        params: {},
                        risk_level: "high",
                        evidence_refs: [
                            { kind: "tool_result", call_id: "call-1" },
                            { kind: "retrieval_doc", id: "doc-1" },
                        ],
                    },
                    {
                        action_id: "a2",
                        action_type: "noop",
                        tool_name: "noop",
                        params: {},
                        risk_level: "low",
                    },
                ],
                events: [
                    { type: "tool_result", ts: 1, call_id: "call-1", status: "ok" },
                    { type: "retrieval", ts: 2, doc_ids: ["doc-1"] },
                ],
            })
        );
        expect(result.pass).toBe(true);
    });
});

describe("transport/tool/hallucination checks", () => {
    it("checkRunnerTransport handles both success and runner failure", () => {
        expect(checkRunnerTransport(mkResp()).pass).toBe(true);
        const failed = checkRunnerTransport(
            mkResp({
                runner_failure: {
                    type: "runner_fetch_failure",
                    class: "timeout",
                    case_id: "c1",
                    version: "new",
                    url: "http://localhost:8788/run-case",
                    attempt: 2,
                    timeout_ms: 1000,
                    latency_ms: 1100,
                    error_name: "AbortError",
                },
            })
        );
        expect(failed.pass).toBe(false);
        expect(failed.details).toMatchObject({ class: "timeout", attempt: 2 });
    });

    it("checkToolExecution reports non-ok tool results", () => {
        const res = checkToolExecution(
            mkResp({
                events: [
                    { type: "tool_result", ts: 1, call_id: "a", status: "ok" },
                    { type: "tool_result", ts: 2, call_id: "b", status: "timeout" },
                ],
            })
        );
        expect(res.pass).toBe(false);
        expect(res.details).toMatchObject({ failed: [{ call_id: "b", status: "timeout" }] });
    });

    it("checkHallucinationSignal detects mismatch between mentioned and tool ticket id", () => {
        const res = checkHallucinationSignal(
            mkResp({
                final_output: { content_type: "text", content: "Created ticket T-1000" },
                events: [
                    { type: "tool_call", ts: 1, call_id: "x", tool: "create_ticket", args: {} },
                    {
                        type: "tool_result",
                        ts: 2,
                        call_id: "x",
                        status: "ok",
                        payload_summary: { ticket_id: "T-2000" },
                    },
                ],
            })
        );
        expect(res.pass).toBe(false);
        expect(res.details).toMatchObject({ mismatch: true });
    });

    it("checkHallucinationSignal returns pass when create_ticket output is absent", () => {
        const res = checkHallucinationSignal(
            mkResp({
                final_output: { content_type: "text", content: "Ticket T-1000 created" },
                events: [{ type: "tool_result", ts: 1, call_id: "x", status: "ok" }],
            })
        );
        expect(res.pass).toBe(true);
    });
});

describe("tool telemetry assertion", () => {
    it("passes when tool telemetry is not required by case", () => {
        const res = checkToolTelemetryAvailability({}, mkResp({ events: [] }));
        expect(res.pass).toBe(true);
        expect(res.details).toMatchObject({ note: "not_required" });
    });

    it("fails with explicit reason_code when telemetry is required but missing", () => {
        const res = checkToolTelemetryAvailability(
            { tool_required: ["search"] },
            mkResp({ events: [] })
        );
        expect(res.pass).toBe(false);
        expect(res.details).toMatchObject({
            required_by: ["tool_required"],
            reason_code: "tool_telemetry_missing",
        });
    });
});

/* ------------------------------------------------------------------ */
/*  evaluateOne                                                        */
/* ------------------------------------------------------------------ */

describe("evaluateOne", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });

    it("passes when no assertions fail", () => {
        const c = mkCase();
        const resp = mkResp();
        const result = evaluateOne(c, resp, ajv);

        expect(result.case_id).toBe("c1");
        expect(result.pass).toBe(true);
        expect(result.assertions.every((a) => a.pass)).toBe(true);
    });

    it("fails when required tools are missing", () => {
        const c = mkCase({ expected: { tool_required: ["search", "write"] } });
        const resp = mkResp({
            events: [
                { type: "tool_call", ts: 1, call_id: "x", tool: "search", args: {} },
            ],
        });
        const result = evaluateOne(c, resp, ajv);

        const toolAssertion = result.assertions.find((a) => a.name === "tool_required");
        expect(toolAssertion?.pass).toBe(false);
        expect((toolAssertion?.details as Record<string, unknown>)?.missing_tools).toEqual(["write"]);
    });

    it("records tool_telemetry assertion failure when tool expectations exist but events are empty", () => {
        const c = mkCase({ expected: { tool_required: ["search"] } });
        const result = evaluateOne(c, mkResp({ events: [] }), ajv);
        const telemetry = result.assertions.find((a) => a.name === "tool_telemetry");
        expect(telemetry?.pass).toBe(false);
        expect(result.root_cause).toBe("missing_required_data");
    });

    it("evaluates action_required and tool_sequence assertions", () => {
        const c = mkCase({
            expected: {
                action_required: ["search"],
                tool_sequence: ["search", "write"],
            },
        });
        const resp = mkResp({
            proposed_actions: [
                { action_id: "a1", action_type: "search", tool_name: "search", params: {} },
            ],
            events: [
                { type: "tool_call", ts: 1, call_id: "c1", tool: "search", args: {} },
                { type: "tool_call", ts: 2, call_id: "c2", tool: "write", args: {} },
            ],
        });
        const result = evaluateOne(c, resp, ajv);
        expect(result.assertions.find((a) => a.name === "action_required")?.pass).toBe(true);
        expect(result.assertions.find((a) => a.name === "tool_sequence")?.pass).toBe(true);
    });

    it("fails retrieval_required when required docs are missing", () => {
        const c = mkCase({
            expected: {
                retrieval_required: { doc_ids: ["d1", "d2"] },
            },
        });
        const resp = mkResp({
            events: [{ type: "retrieval", ts: 1, doc_ids: ["d1"] }],
        });
        const result = evaluateOne(c, resp, ajv);
        expect(result.assertions.find((a) => a.name === "retrieval_required")?.pass).toBe(false);
    });

    it("passes when all required tools are present", () => {
        const c = mkCase({ expected: { tool_required: ["search"] } });
        const resp = mkResp({
            events: [
                { type: "tool_call", ts: 1, call_id: "x", tool: "search", args: {} },
            ],
        });
        const result = evaluateOne(c, resp, ajv);
        const toolAssertion = result.assertions.find((a) => a.name === "tool_required");
        expect(toolAssertion?.pass).toBe(true);
    });

    it("fails when must_include phrases are missing", () => {
        const c = mkCase({ expected: { must_include: ["goodbye"] } });
        const resp = mkResp();
        const result = evaluateOne(c, resp, ajv);

        const incl = result.assertions.find((a) => a.name === "must_include");
        expect(incl?.pass).toBe(false);
    });

    it("fails when must_not_include phrases are found", () => {
        const c = mkCase({ expected: { must_not_include: ["hello"] } });
        const resp = mkResp();
        const result = evaluateOne(c, resp, ajv);

        const excl = result.assertions.find((a) => a.name === "must_not_include");
        expect(excl?.pass).toBe(false);
    });

    it("validates json_schema when provided", () => {
        const c = mkCase({
            expected: {
                json_schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } },
            },
        });
        const resp = mkResp({
            final_output: { content_type: "json", content: { name: "test" } },
        });
        const result = evaluateOne(c, resp, ajv);
        const schema = result.assertions.find((a) => a.name === "json_schema");
        expect(schema?.pass).toBe(true);
    });

    it("fails json_schema when content doesn't match", () => {
        const c = mkCase({
            expected: {
                json_schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } },
            },
        });
        const resp = mkResp({
            final_output: { content_type: "json", content: { age: 42 } },
        });
        const result = evaluateOne(c, resp, ajv);
        const schema = result.assertions.find((a) => a.name === "json_schema");
        expect(schema?.pass).toBe(false);
    });

    it("sets root_cause when test fails", () => {
        const c = mkCase({ expected: { tool_required: ["nonexistent_tool"] } });
        const resp = mkResp();
        const result = evaluateOne(c, resp, ajv);

        expect(result.pass).toBe(false);
        expect(result.root_cause).toBeDefined();
    });

    it("fails when runner_failure is present even with empty expected", () => {
        const c = mkCase();
        const resp = mkResp({
            final_output: { content_type: "text", content: "runner: fetch failure (http_error)" },
            runner_failure: {
                type: "runner_fetch_failure",
                class: "http_error",
                case_id: "c1",
                version: "new",
                attempt: 3,
                timeout_ms: 15000,
                latency_ms: 32,
                status: 500,
                url: "http://localhost:8788/run-case",
            },
        });
        const result = evaluateOne(c, resp, ajv);

        const transport = result.assertions.find((a) => a.name === "runner_transport_success");
        expect(transport?.pass).toBe(false);
        expect(result.pass).toBe(false);
        expect(result.root_cause).toBe("missing_required_data");
    });
});

/* ------------------------------------------------------------------ */
/*  chooseRootCause                                                    */
/* ------------------------------------------------------------------ */

describe("chooseRootCause", () => {
    it("returns tool_failure when tool results have errors", () => {
        const assertions = [
            { name: "tool_execution", pass: false, details: {} },
        ];
        const resp = mkResp({
            events: [
                { type: "tool_call", ts: 1, call_id: "a", tool: "search", args: {} },
                { type: "tool_result", ts: 2, call_id: "a", status: "error" as const },
            ],
        });
        expect(chooseRootCause(assertions, resp)).toBe("tool_failure");
    });

    it("returns format_violation when json_schema fails", () => {
        const assertions = [
            { name: "json_schema", pass: false, details: {} },
            { name: "tool_execution", pass: true },
        ];
        const resp = mkResp();
        expect(chooseRootCause(assertions, resp)).toBe("format_violation");
    });

    it("returns hallucination_signal when hallucination check fails", () => {
        const assertions = [
            { name: "hallucination_signal_check", pass: false, details: {} },
            { name: "tool_execution", pass: true },
        ];
        const resp = mkResp();
        expect(chooseRootCause(assertions, resp)).toBe("hallucination_signal");
    });

    it("prioritizes runner failure over assertion-derived format issues", () => {
        const assertions = [
            { name: "json_schema", pass: false, details: {} },
            { name: "runner_transport_success", pass: false, details: {} },
        ];
        const resp = mkResp({
            runner_failure: {
                type: "runner_fetch_failure",
                class: "http_error",
                case_id: "c1",
                version: "new",
                attempt: 1,
                timeout_ms: 15000,
                latency_ms: 5,
                status: 500,
                url: "http://localhost:8788/run-case",
            },
        });
        expect(chooseRootCause(assertions, resp)).toBe("missing_required_data");
    });
});

/* ------------------------------------------------------------------ */
/*  mapPolicyRules                                                     */
/* ------------------------------------------------------------------ */

describe("mapPolicyRules", () => {
    it("returns empty array when no root cause", () => {
        expect(mapPolicyRules(undefined, false)).toEqual([]);
    });

    it("returns Rule4 when evidence failed", () => {
        const rules = mapPolicyRules("wrong_tool_choice", true);
        expect(rules).toContain("Rule4");
    });

    it("includes Rule3 for format_violation", () => {
        const rules = mapPolicyRules("format_violation", false);
        expect(rules).toContain("Rule3");
    });

    it("includes Rule1 for wrong_tool_choice", () => {
        const rules = mapPolicyRules("wrong_tool_choice", false);
        expect(rules).toContain("Rule1");
    });

    it("includes Rule3 and Rule4 for hallucination_signal", () => {
        const rules = mapPolicyRules("hallucination_signal", false);
        expect(rules).toContain("Rule3");
        expect(rules).toContain("Rule4");
    });
});

/* ------------------------------------------------------------------ */
/*  deriveGateRecommendation                                           */
/* ------------------------------------------------------------------ */

describe("deriveGateRecommendation", () => {
    it("returns 'none' when no signals and data present", () => {
        const gate = deriveGateRecommendation({
            newSignals: [],
            newAvailability: { status: "present" },
            caseStatus: "executed",
        });
        expect(gate).toBe("none");
    });

    it("returns 'block' for critical signals", () => {
        const gate = deriveGateRecommendation({
            newSignals: [
                { kind: "prompt_injection_marker", severity: "critical", confidence: "high", title: "test", details: {}, evidence_refs: [] },
            ],
            newAvailability: { status: "present" },
            caseStatus: "executed",
        });
        expect(gate).toBe("block");
    });

    it("returns 'require_approval' for high severity signals", () => {
        const gate = deriveGateRecommendation({
            newSignals: [
                { kind: "secret_in_output", severity: "high", confidence: "medium", title: "test", details: {}, evidence_refs: [] },
            ],
            newAvailability: { status: "present" },
            caseStatus: "executed",
        });
        expect(gate).toBe("require_approval");
    });

    it("returns 'require_approval' when new data is missing", () => {
        const gate = deriveGateRecommendation({
            newSignals: [],
            newAvailability: { status: "missing" },
            caseStatus: "executed",
        });
        expect(gate).toBe("require_approval");
    });

    it("returns 'none' for non-executed cases", () => {
        const gate = deriveGateRecommendation({
            newSignals: [
                { kind: "secret_in_output", severity: "critical", confidence: "high", title: "test", details: {}, evidence_refs: [] },
            ],
            newAvailability: { status: "present" },
            caseStatus: "filtered_out",
        });
        expect(gate).toBe("none");
    });
});

/* ------------------------------------------------------------------ */
/*  deriveRiskLevel                                                    */
/* ------------------------------------------------------------------ */

describe("deriveRiskLevel", () => {
    it("maps block -> high", () => expect(deriveRiskLevel("block")).toBe("high"));
    it("maps require_approval -> medium", () => expect(deriveRiskLevel("require_approval")).toBe("medium"));
    it("maps none -> low", () => expect(deriveRiskLevel("none")).toBe("low"));
});

describe("deriveRiskTags", () => {
    it("adds expected tags based on signals/regressions/availability", () => {
        const tags = deriveRiskTags({
            newSignals: [
                { kind: "prompt_injection_marker", severity: "critical", confidence: "high", title: "pi", details: {}, evidence_refs: [] },
                { kind: "secret_in_output", severity: "high", confidence: "medium", title: "secret", details: {}, evidence_refs: [] },
            ],
            regression: true,
            caseStatus: "executed",
            newAvailability: { status: "missing", reason_code: "missing_file" },
        });
        expect(tags).toContain("regression");
        expect(tags).toContain("missing_new");
        expect(tags).toContain("prompt_injection_marker");
        expect(tags).toContain("secret_in_output");
    });

    it("tags filtered/missing and broken availability states", () => {
        const tags = deriveRiskTags({
            newSignals: [],
            regression: false,
            caseStatus: "filtered_out",
            newAvailability: { status: "broken", reason_code: "invalid_json" },
        });
        expect(tags).toContain("filtered_out");
        expect(tags).toContain("broken_new");
    });
});

/* ------------------------------------------------------------------ */
/*  missingTraceSide                                                   */
/* ------------------------------------------------------------------ */

describe("missingTraceSide", () => {
    it("returns broken status with the given reason", () => {
        const side = missingTraceSide("missing_response");
        expect(side.status).toBe("broken");
        expect(side.issues).toContain("missing_response");
    });
});

/* ------------------------------------------------------------------ */
/*  severityCountsInit / bumpCounts                                    */
/* ------------------------------------------------------------------ */

describe("severityCountsInit + bumpCounts", () => {
    it("initializes all to zero", () => {
        const c = severityCountsInit();
        expect(c).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
    });

    it("increments the correct severity", () => {
        const c = severityCountsInit();
        bumpCounts(c, "high");
        bumpCounts(c, "high");
        bumpCounts(c, "low");
        expect(c.high).toBe(2);
        expect(c.low).toBe(1);
        expect(c.medium).toBe(0);
    });
});

/* ------------------------------------------------------------------ */
/*  topKinds                                                           */
/* ------------------------------------------------------------------ */

describe("topKinds", () => {
    it("returns top kinds sorted by frequency", () => {
        const signals: SecuritySignal[] = [
            { kind: "secret_in_output", severity: "low", confidence: "low", title: "", details: {}, evidence_refs: [] },
            { kind: "pii_in_output", severity: "low", confidence: "low", title: "", details: {}, evidence_refs: [] },
            { kind: "pii_in_output", severity: "low", confidence: "low", title: "", details: {}, evidence_refs: [] },
            { kind: "secret_in_output", severity: "low", confidence: "low", title: "", details: {}, evidence_refs: [] },
            { kind: "secret_in_output", severity: "low", confidence: "low", title: "", details: {}, evidence_refs: [] },
        ];
        const result = topKinds(signals);
        expect(result[0]).toBe("secret_in_output");
        expect(result[1]).toBe("pii_in_output");
    });

    it("returns empty for no signals", () => {
        expect(topKinds([])).toEqual([]);
    });
});

/* ------------------------------------------------------------------ */
/*  deriveFailureSummarySide                                           */
/* ------------------------------------------------------------------ */

describe("deriveFailureSummarySide", () => {
    it("returns undefined for no failure", () => {
        expect(deriveFailureSummarySide(undefined)).toBeUndefined();
    });

    it("extracts failure class and details", () => {
        const result = deriveFailureSummarySide({
            type: "runner_fetch_failure",
            class: "timeout",
            net_error_kind: "headers_timeout",
            case_id: "c1",
            version: "new",
            url: "http://localhost",
            attempt: 3,
            timeout_ms: 5000,
            latency_ms: 5001,
            status: 504,
        });
        expect(result?.class).toBe("timeout");
        expect(result?.http_status).toBe(504);
        expect(result?.timeout_ms).toBe(5000);
        expect(result?.attempts).toBe(3);
        expect(result?.net_error_kind).toBe("headers_timeout");
    });
});

/* ------------------------------------------------------------------ */
/*  computeSecuritySide                                                */
/* ------------------------------------------------------------------ */

describe("computeSecuritySide", () => {
    it("returns no signals when there is no runner failure", () => {
        const resp = mkResp({
            final_output: { content_type: "text", content: "Everything is fine." },
        });
        const { signals } = computeSecuritySide(resp);
        expect(signals.length).toBe(0);
    });

    it("emits runner_failure_detected when runner failure exists", () => {
        const resp = mkResp({
            runner_failure: {
                type: "runner_fetch_failure",
                class: "timeout",
                case_id: "c1",
                version: "new",
                attempt: 1,
                timeout_ms: 1000,
                latency_ms: 1001,
                url: "http://example.com",
            },
        });
        const { signals } = computeSecuritySide(resp);
        expect(signals.length).toBe(1);
        expect(signals[0]?.kind).toBe("runner_failure_detected");
    });

    it("sets medium severity for non-timeout runner failures", () => {
        const resp = mkResp({
            runner_failure: {
                type: "runner_fetch_failure",
                class: "http_error",
                case_id: "c1",
                version: "new",
                attempt: 1,
                timeout_ms: 1000,
                latency_ms: 1001,
                error_name: "HttpError",
                error_message: "500 from upstream",
                url: "http://example.com",
            },
        });
        const { signals } = computeSecuritySide(resp);
        expect(signals[0]?.severity).toBe("medium");
        expect(signals[0]?.details?.notes).toContain("class=http_error");
    });
});

describe("computeTraceIntegritySide", () => {
    it("returns ok when event chain is consistent", () => {
        const resp = mkResp({
            events: [
                { type: "tool_call", ts: 1, call_id: "c1", tool: "search", args: {} },
                { type: "tool_result", ts: 2, call_id: "c1", status: "ok" },
                { type: "final_output", ts: 3, content_type: "text", content: "ok" },
            ],
        });
        const out = computeTraceIntegritySide(resp, {});
        expect(out.status).toBe("ok");
        expect(out.issues).toEqual([]);
    });

    it("returns partial for missing retrieval/final output/timestamps", () => {
        const resp = mkResp({
            events: [
                { type: "tool_call", ts: Number.NaN, call_id: "c1", tool: "search", args: {} },
                { type: "tool_result", ts: 2, call_id: "c1", status: "ok" },
            ],
        });
        const out = computeTraceIntegritySide(resp, { retrieval_required: { doc_ids: ["d1"] } });
        expect(out.status).toBe("partial");
        expect(out.issues).toContain("missing_timestamps");
        expect(out.issues).toContain("missing_final_output_event");
        expect(out.issues).toContain("retrieval_required_missing");
    });

    it("returns broken for orphan tool results", () => {
        const resp = mkResp({
            events: [
                { type: "tool_result", ts: 2, call_id: "orphan", status: "ok" },
                { type: "final_output", ts: 3, content_type: "text", content: "ok" },
            ],
        });
        const out = computeTraceIntegritySide(resp, {});
        expect(out.status).toBe("broken");
        expect(out.issues).toContain("tool_result_without_call");
    });

    it("marks empty events as partial when runner failure is present", () => {
        const resp = mkResp({
            events: [],
            runner_failure: {
                type: "runner_fetch_failure",
                class: "timeout",
                case_id: "c1",
                version: "new",
                attempt: 1,
                timeout_ms: 1000,
                latency_ms: 1500,
                url: "http://localhost:8788/run-case",
            },
        });
        const out = computeTraceIntegritySide(resp, {});
        expect(out.status).toBe("partial");
        expect(out.issues).toContain("no_events");
    });
});
