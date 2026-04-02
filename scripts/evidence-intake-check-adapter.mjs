#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";

import {
  adapterCapabilityPath,
  analyzeCasesCompleteness,
  casesCoveragePath,
  loadIntakePair,
  readCasesFile,
  relFrom,
  resolveIntakeDir,
  selectAdapterCanaryCase,
  uniqueStrings,
  writeJson,
} from "./lib/evidence-intake.mjs";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-intake-check-adapter.mjs (--profile <id> | --dir <path>) --cases <path> --baseUrl <url> [options]",
    "",
    "Options:",
    "  --profile <id>      Intake profile under ops/intake/<id>",
    "  --dir <path>        Explicit intake directory",
    "  --cases <path>      Completed cases file used for the live canary",
    "  --baseUrl <url>     Adapter base URL (for example http://127.0.0.1:8788)",
    "  --caseId <id>       Force a specific case id for the live canary",
    "  --version <id>      Canary version: baseline | new (default: new)",
    "  --timeoutMs <ms>    HTTP timeout per probe (default: 10000)",
    "  --authToken <tok>   Optional auth token for protected /run-case endpoints",
    "  --authHeader <hdr>  Header used for auth (default: authorization)",
    "  --out <path>        Optional output path for the persistent adapter-capability artifact",
    "  --json              Print machine-readable output",
    "  --help              Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    profile: "",
    dir: "",
    cases: "",
    baseUrl: process.env.BASE_URL || "",
    caseId: "",
    version: "new",
    timeoutMs: 10_000,
    authToken: process.env.ADAPTER_AUTH_TOKEN || process.env.CLI_AGENT_AUTH_TOKEN || "",
    authHeader: process.env.ADAPTER_AUTH_HEADER || process.env.CLI_AGENT_AUTH_HEADER || "authorization",
    out: "",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--profile") {
      args.profile = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--dir") {
      args.dir = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--cases") {
      args.cases = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--baseUrl") {
      args.baseUrl = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--caseId") {
      args.caseId = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--version") {
      args.version = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--timeoutMs") {
      args.timeoutMs = Number(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--authToken") {
      args.authToken = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--authHeader") {
      args.authHeader = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--out") {
      args.out = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  if ((!args.profile && !args.dir) || !args.cases || !args.baseUrl) {
    console.error("Missing required --profile/--dir, --cases, or --baseUrl");
    usage(2);
  }
  if (args.version !== "baseline" && args.version !== "new") {
    console.error("--version must be baseline or new");
    usage(2);
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    console.error("--timeoutMs must be a positive number");
    usage(2);
  }
  return args;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function buildAuthHeader(authHeader, authToken) {
  const token = String(authToken || "").trim();
  if (!token) return null;
  const header = String(authHeader || "authorization").trim().toLowerCase();
  if (header === "authorization") return { [header]: `Bearer ${token}` };
  return { [header]: token };
}

async function fetchJsonWithTimeout(url, { method = "GET", headers = {}, body, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      json,
      raw_text: text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function hasAnyString(record, keys) {
  const value = asRecord(record);
  if (!value) return false;
  return keys.some((key) => typeof value[key] === "string" && String(value[key]).trim().length > 0);
}

function hasFinalOutputValue(finalOutput) {
  const out = asRecord(finalOutput);
  if (!out) return false;
  const contentType = out.content_type;
  if (contentType !== "text" && contentType !== "json") return false;
  if (!("content" in out)) return false;
  const content = out.content;
  if (typeof content === "string") return content.trim().length > 0;
  return content !== undefined && content !== null;
}

function extractToolCalls(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((item) => asRecord(item)?.type === "tool_call")
    .map((item) => ({
      tool: String(asRecord(item)?.tool ?? "").trim(),
      call_id: String(asRecord(item)?.call_id ?? "").trim(),
    }))
    .filter((item) => item.tool.length > 0);
}

function extractToolResults(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((item) => asRecord(item)?.type === "tool_result")
    .map((item) => ({
      call_id: String(asRecord(item)?.call_id ?? "").trim(),
      status: String(asRecord(item)?.status ?? "").trim(),
      has_payload_summary: Object.prototype.hasOwnProperty.call(asRecord(item) || {}, "payload_summary"),
      result_ref: String(asRecord(item)?.result_ref ?? "").trim(),
      error_code: String(asRecord(item)?.error_code ?? "").trim(),
      error_message: String(asRecord(item)?.error_message ?? "").trim(),
    }))
    .filter((item) => item.call_id.length > 0);
}

function validateToolResultEvidence(toolResults) {
  const missingOutputEvidenceCallIds = [];
  const missingErrorEvidenceCallIds = [];
  for (const result of toolResults) {
    const hasOutputEvidence = result.has_payload_summary || result.result_ref.length > 0;
    const hasErrorEvidence = result.error_code.length > 0 || result.error_message.length > 0;
    if (result.status === "ok" && !hasOutputEvidence) {
      missingOutputEvidenceCallIds.push(result.call_id);
    }
    if ((result.status === "error" || result.status === "timeout") && !hasErrorEvidence) {
      missingErrorEvidenceCallIds.push(result.call_id);
    }
  }
  return {
    missingOutputEvidenceCallIds,
    missingErrorEvidenceCallIds,
  };
}

function containsOrderedSubsequence(actual, expected) {
  const seq = uniqueStrings(expected);
  if (seq.length === 0) return true;
  let index = 0;
  for (const item of actual) {
    if (item === seq[index]) index += 1;
    if (index === seq.length) return true;
  }
  return false;
}

function pushIssue(target, severity, field, message, details) {
  target.push({
    severity,
    field,
    message,
    ...(details ? { details } : {}),
  });
}

function validateHealthPayload(result, warnings, errors) {
  if (!result.ok) {
    pushIssue(errors, "error", "adapter.health", `GET /health returned HTTP ${result.status}`);
    return { authEnabled: false, authHeader: "authorization", runtime: {} };
  }
  const body = asRecord(result.json);
  if (!body || body.ok !== true) {
    pushIssue(errors, "error", "adapter.health", "/health did not return { ok: true }");
  }
  const runtime = asRecord(body?.runtime) || {};
  const adapterTimeoutMs = runtime.timeout_ms;
  const serverRequestTimeoutMs = runtime.server_request_timeout_ms;
  if (typeof adapterTimeoutMs === "number" && typeof serverRequestTimeoutMs === "number" && serverRequestTimeoutMs <= adapterTimeoutMs) {
    pushIssue(
      warnings,
      "warning",
      "adapter.health.runtime",
      "server_request_timeout_ms should be larger than timeout_ms so the HTTP layer does not cut requests first",
      { timeout_ms: adapterTimeoutMs, server_request_timeout_ms: serverRequestTimeoutMs }
    );
  }
  return {
    authEnabled: body?.auth_enabled === true || runtime.auth_enabled === true,
    authHeader: typeof body?.auth_header === "string" ? body.auth_header : typeof runtime.auth_header === "string" ? runtime.auth_header : "authorization",
    runtime,
  };
}

function validatePreflight(result, errors) {
  if (!result.ok) {
    pushIssue(errors, "error", "adapter.preflight", `POST /run-case preflight returned HTTP ${result.status}`, {
      body: result.json || result.raw_text || null,
    });
    return;
  }
  const body = asRecord(result.json);
  if (!body || asRecord(body.preflight)?.ok !== true) {
    pushIssue(errors, "error", "adapter.preflight", "Preflight probe did not return preflight.ok=true", {
      body: body || result.raw_text || null,
    });
  }
}

function validateCanaryResponse({ response, selectedCase, systemScope, qualityContract, errors, warnings }) {
  if (!response.ok) {
    pushIssue(errors, "error", "adapter.run_case", `POST /run-case canary returned HTTP ${response.status}`, {
      body: response.json || response.raw_text || null,
    });
    return {
      event_count: 0,
      tool_calls: [],
      tool_results: [],
      telemetry_mode: null,
      has_final_output: false,
      has_trace_anchor: false,
      has_assumption_state: false,
      proposed_action_count: 0,
      proposed_action_types: [],
      has_final_output_event: false,
      missing_tool_result_call_ids: [],
    };
  }

  const body = asRecord(response.json);
  if (!body) {
    pushIssue(errors, "error", "adapter.run_case", "Canary response is not valid JSON");
    return {
      event_count: 0,
      tool_calls: [],
      tool_results: [],
      telemetry_mode: null,
      has_final_output: false,
      has_trace_anchor: false,
      has_assumption_state: false,
      proposed_action_count: 0,
      proposed_action_types: [],
      has_final_output_event: false,
      missing_tool_result_call_ids: [],
    };
  }

  if (body.adapter_error) {
    pushIssue(errors, "error", "adapter.run_case.adapter_error", "Canary response returned adapter_error", {
      adapter_error: body.adapter_error,
    });
  }
  if (body.runner_failure) {
    pushIssue(errors, "error", "adapter.run_case.runner_failure", "Canary response returned runner_failure", {
      runner_failure: body.runner_failure,
    });
  }
  if (body.case_id !== selectedCase.caseItem.id) {
    pushIssue(errors, "error", "adapter.run_case.case_id", "Canary response case_id does not match the requested case", {
      expected: selectedCase.caseItem.id,
      actual: body.case_id ?? null,
    });
  }
  if (body.version !== selectedCase.version) {
    pushIssue(errors, "error", "adapter.run_case.version", "Canary response version does not match the requested version", {
      expected: selectedCase.version,
      actual: body.version ?? null,
    });
  }
  const hasFinalOutput = hasFinalOutputValue(body.final_output);
  if (!hasFinalOutput) {
    pushIssue(errors, "error", "adapter.run_case.final_output", "Canary response is missing a usable final_output");
  }

  const events = Array.isArray(body.events) ? body.events : [];
  const telemetryRequired =
    qualityContract?.telemetry_requirements?.require_events || systemScope?.evidence_preferences?.require_tool_telemetry;
  if (telemetryRequired && events.length === 0) {
    pushIssue(errors, "error", "adapter.run_case.events", "Telemetry is required but the canary response has no events");
  }

  const finalOutputEventPresent = events.some((item) => asRecord(item)?.type === "final_output");
  if (qualityContract?.telemetry_requirements?.require_events && !finalOutputEventPresent) {
    pushIssue(errors, "error", "adapter.run_case.events.final_output", "Telemetry is required but no final_output event was emitted");
  }

  const toolCalls = extractToolCalls(events);
  const toolResults = extractToolResults(events);
  const resultIds = new Set(toolResults.map((item) => item.call_id));
  const missingToolResultCallIds = toolCalls.filter((item) => !resultIds.has(item.call_id)).map((item) => item.call_id);
  const toolResultEvidence = validateToolResultEvidence(toolResults);
  const expected = asRecord(selectedCase.caseItem.expected) || {};
  const requiredTools = uniqueStrings([
    ...uniqueStrings(expected.tool_required),
    ...uniqueStrings(expected.tool_sequence),
  ]);
  if (requiredTools.length > 0) {
    const actualTools = toolCalls.map((item) => item.tool);
    const missingTools = requiredTools.filter((tool) => !actualTools.includes(tool));
    if (missingTools.length > 0) {
      pushIssue(errors, "error", "adapter.run_case.tool_required", "Canary response is missing required tool_call telemetry", {
        expected: requiredTools,
        actual: actualTools,
        missing: missingTools,
      });
    }
    if (qualityContract?.telemetry_requirements?.require_tool_call_result_pairs) {
      const missingPairs = missingToolResultCallIds;
      if (missingPairs.length > 0) {
        pushIssue(
          errors,
          "error",
          "adapter.run_case.tool_call_result_pairs",
          "Tool call/result pair telemetry is required but some tool_call events have no matching tool_result",
          { missing_call_ids: missingPairs }
        );
      }
    }
    if (toolResultEvidence.missingOutputEvidenceCallIds.length > 0) {
      pushIssue(
        errors,
        "error",
        "adapter.run_case.tool_result_output_evidence",
        "Quality-grade tool_result telemetry must include payload_summary or result_ref for successful tool calls",
        { missing_call_ids: toolResultEvidence.missingOutputEvidenceCallIds }
      );
    }
    if (toolResultEvidence.missingErrorEvidenceCallIds.length > 0) {
      pushIssue(
        errors,
        "error",
        "adapter.run_case.tool_result_error_evidence",
        "Quality-grade tool_result telemetry must include error_code or error_message for failed/timeout tool calls",
        { missing_call_ids: toolResultEvidence.missingErrorEvidenceCallIds }
      );
    }
  } else if (qualityContract?.telemetry_requirements?.require_tool_call_result_pairs) {
    pushIssue(
      warnings,
      "warning",
      "adapter.run_case.tool_call_result_pairs",
      "The selected canary case does not declare expected tools, so tool-call/result pair depth was not asserted"
    );
  }

  const expectedSequence = uniqueStrings(expected.tool_sequence);
  if (expectedSequence.length > 0) {
    const actualTools = toolCalls.map((item) => item.tool);
    if (!containsOrderedSubsequence(actualTools, expectedSequence)) {
      pushIssue(errors, "error", "adapter.run_case.tool_sequence", "Canary response did not preserve the expected tool sequence", {
        expected: expectedSequence,
        actual: actualTools,
      });
    }
  }

  const requiredActions = uniqueStrings(expected.action_required);
  const proposedActions = Array.isArray(body.proposed_actions) ? body.proposed_actions : [];
  const proposedActionTypes = proposedActions
    .map((item) => String(asRecord(item)?.action_type ?? "").trim())
    .filter(Boolean);
  if (requiredActions.length > 0) {
    const missingActions = requiredActions.filter((item) => !proposedActionTypes.includes(item));
    if (missingActions.length > 0) {
      pushIssue(errors, "error", "adapter.run_case.action_required", "Canary response is missing required proposed_actions", {
        expected: requiredActions,
        actual: proposedActionTypes,
        missing: missingActions,
      });
    }
    if (expected.evidence_required_for_actions === true) {
      const withoutEvidence = proposedActions
        .filter((item) => requiredActions.includes(String(asRecord(item)?.action_type ?? "").trim()))
        .filter((item) => !Array.isArray(asRecord(item)?.evidence_refs) || asRecord(item).evidence_refs.length === 0)
        .map((item) => String(asRecord(item)?.action_type ?? "").trim())
        .filter(Boolean);
      if (withoutEvidence.length > 0) {
        pushIssue(errors, "error", "adapter.run_case.evidence_required_for_actions", "Required actions were emitted without evidence_refs", {
          missing_evidence_actions: withoutEvidence,
        });
      }
    }
  }

  const traceRequired =
    systemScope?.evidence_preferences?.require_trace_anchor || qualityContract?.telemetry_requirements?.require_trace_anchor;
  const hasTraceAnchor = hasAnyString(body.trace_anchor, ["trace_id", "span_id", "traceparent"]);
  if (traceRequired && !hasTraceAnchor) {
    pushIssue(errors, "error", "adapter.run_case.trace_anchor", "Trace anchor is required but missing from the canary response");
  }

  const assumptionRequired =
    systemScope?.evidence_preferences?.require_assumption_state || qualityContract?.telemetry_requirements?.require_assumption_state;
  const assumptionState = asRecord(body.assumption_state);
  const hasAssumptionState =
    Boolean(assumptionState) &&
    (Array.isArray(assumptionState.selected) || Array.isArray(assumptionState.rejected));
  if (assumptionRequired && !hasAssumptionState) {
    pushIssue(errors, "error", "adapter.run_case.assumption_state", "Assumption state is required but missing from the canary response");
  }

  return {
    event_count: events.length,
    tool_calls: toolCalls,
    tool_results: toolResults,
    telemetry_mode: typeof body.telemetry_mode === "string" ? body.telemetry_mode : null,
    has_final_output: hasFinalOutput,
    has_trace_anchor: hasTraceAnchor,
    has_assumption_state: hasAssumptionState,
    proposed_action_count: proposedActions.length,
    proposed_action_types: uniqueStrings(proposedActionTypes),
    has_final_output_event: finalOutputEventPresent,
    missing_tool_result_call_ids: missingToolResultCallIds,
    missing_tool_output_evidence_call_ids: toolResultEvidence.missingOutputEvidenceCallIds,
    missing_tool_error_evidence_call_ids: toolResultEvidence.missingErrorEvidenceCallIds,
  };
}

function buildAdapterCapabilityArtifact({
  cwd,
  intakeDir,
  intake,
  casesAbs,
  baseUrl,
  selectedCase,
  healthInfo,
  healthResult,
  preflightResult,
  canaryResult,
  canarySignals,
  errors,
  warnings,
  outAbs,
}) {
  const expected = asRecord(selectedCase?.caseItem?.expected) || {};
  const requiredTools = uniqueStrings([
    ...uniqueStrings(expected.tool_required),
    ...uniqueStrings(expected.tool_sequence),
  ]);
  const expectedToolSequence = uniqueStrings(expected.tool_sequence);
  const requiredActions = uniqueStrings(expected.action_required);
  const observedTools = canarySignals.tool_calls.map((item) => item.tool);
  const resultIds = new Set(canarySignals.tool_results.map((item) => item.call_id));
  const toolPairDepthSupported =
    canarySignals.tool_calls.length > 0
      ? canarySignals.tool_calls.every((item) => resultIds.has(item.call_id))
      : null;
  const casesCoverageAbs = casesCoveragePath(intakeDir);

  return {
    schema_version: 1,
    artifact_type: "adapter_capability_profile",
    generated_at: Date.now(),
    ok: errors.length === 0,
    intake_dir: intakeDir,
    base_url: baseUrl,
    cases_href: relFrom(cwd, casesAbs),
    files: {
      system_scope_href: relFrom(intakeDir, intake.paths.system_scope),
      quality_contract_href: relFrom(intakeDir, intake.paths.quality_contract),
      ...(path.isAbsolute(casesAbs) ? { cases_href: relFrom(intakeDir, casesAbs) } : {}),
      ...(existsSync(casesCoverageAbs) ? { cases_coverage_href: relFrom(intakeDir, casesCoverageAbs) } : {}),
      artifact_href: relFrom(intakeDir, outAbs),
    },
    summary: {
      profile_id: intake.systemScope.profile_id,
      system_id: intake.systemScope.system_id,
      selected_case_id: selectedCase?.id ?? null,
      selected_case_source_type: selectedCase?.mapping?.source_type ?? null,
      selected_case_scenario_type: selectedCase?.mapping?.scenario_type ?? null,
      selected_case_reason: selectedCase?.reason ?? null,
      health_ok: Boolean(healthResult?.ok && asRecord(healthResult?.json)?.ok === true),
      preflight_ok: Boolean(preflightResult?.ok && asRecord(asRecord(preflightResult?.json)?.preflight)?.ok === true),
      canary_ok: Boolean(canaryResult?.ok) && errors.length === 0,
      auth_enabled: healthInfo.authEnabled,
      auth_header: healthInfo.authHeader,
      adapter_timeout_ms: typeof healthInfo.runtime.timeout_ms === "number" ? healthInfo.runtime.timeout_ms : null,
      server_request_timeout_ms:
        typeof healthInfo.runtime.server_request_timeout_ms === "number" ? healthInfo.runtime.server_request_timeout_ms : null,
      telemetry_mode: canarySignals.telemetry_mode,
      tool_call_count: canarySignals.tool_calls.length,
      tool_result_count: canarySignals.tool_results.length,
      proposed_action_count: canarySignals.proposed_action_count,
      has_trace_anchor: canarySignals.has_trace_anchor,
      has_assumption_state: canarySignals.has_assumption_state,
      has_final_output: canarySignals.has_final_output,
      has_final_output_event: canarySignals.has_final_output_event,
      tool_results_with_missing_output_evidence: canarySignals.missing_tool_output_evidence_call_ids.length,
      tool_results_with_missing_error_evidence: canarySignals.missing_tool_error_evidence_call_ids.length,
    },
    selected_case: selectedCase
      ? {
          case_id: selectedCase.id,
          title: String(selectedCase.caseItem?.title ?? ""),
          version: selectedCase.version ?? null,
          source_type: selectedCase.mapping?.source_type ?? null,
          source_id: selectedCase.mapping?.source_id ?? null,
          scenario_type: selectedCase.mapping?.scenario_type ?? null,
          expected_gate: selectedCase.mapping?.expected_gate ?? null,
          selection_reason: selectedCase.reason ?? null,
        }
      : null,
    requirements: {
      require_events:
        intake.qualityContract?.telemetry_requirements?.require_events === true ||
        intake.systemScope?.evidence_preferences?.require_tool_telemetry === true,
      require_trace_anchor:
        intake.qualityContract?.telemetry_requirements?.require_trace_anchor === true ||
        intake.systemScope?.evidence_preferences?.require_trace_anchor === true,
      require_assumption_state:
        intake.qualityContract?.telemetry_requirements?.require_assumption_state === true ||
        intake.systemScope?.evidence_preferences?.require_assumption_state === true,
      require_tool_call_result_pairs: intake.qualityContract?.telemetry_requirements?.require_tool_call_result_pairs === true,
      required_tools: requiredTools,
      expected_tool_sequence: expectedToolSequence,
      required_actions: requiredActions,
      evidence_required_for_actions: expected.evidence_required_for_actions === true,
    },
    capabilities: {
      health_endpoint: {
        checked: Boolean(healthResult),
        supported: Boolean(healthResult?.ok && asRecord(healthResult?.json)?.ok === true),
        auth_enabled: healthInfo.authEnabled,
        auth_header: healthInfo.authHeader,
        timeout_ms: typeof healthInfo.runtime.timeout_ms === "number" ? healthInfo.runtime.timeout_ms : null,
        server_request_timeout_ms:
          typeof healthInfo.runtime.server_request_timeout_ms === "number" ? healthInfo.runtime.server_request_timeout_ms : null,
      },
      preflight: {
        checked: Boolean(preflightResult),
        supported: Boolean(preflightResult?.ok && asRecord(asRecord(preflightResult?.json)?.preflight)?.ok === true),
      },
      run_case: {
        checked: Boolean(canaryResult),
        supported: Boolean(canaryResult?.ok),
        telemetry_mode: canarySignals.telemetry_mode,
        event_count: canarySignals.event_count,
        has_final_output: canarySignals.has_final_output,
        has_final_output_event: canarySignals.has_final_output_event,
        tool_call_count: canarySignals.tool_calls.length,
        tool_result_count: canarySignals.tool_results.length,
        observed_tools: uniqueStrings(observedTools),
        missing_tool_result_call_ids: uniqueStrings(canarySignals.missing_tool_result_call_ids),
        missing_tool_output_evidence_call_ids: uniqueStrings(canarySignals.missing_tool_output_evidence_call_ids),
        missing_tool_error_evidence_call_ids: uniqueStrings(canarySignals.missing_tool_error_evidence_call_ids),
        tool_call_result_pairs_supported: toolPairDepthSupported,
        has_trace_anchor: canarySignals.has_trace_anchor,
        has_assumption_state: canarySignals.has_assumption_state,
        proposed_action_count: canarySignals.proposed_action_count,
        proposed_action_types: canarySignals.proposed_action_types,
      },
      requirement_satisfaction: {
        required_tools_observed:
          requiredTools.length > 0 ? requiredTools.every((tool) => observedTools.includes(tool)) : null,
        expected_tool_sequence_observed:
          expectedToolSequence.length > 0 ? containsOrderedSubsequence(observedTools, expectedToolSequence) : null,
        required_actions_observed:
          requiredActions.length > 0 ? requiredActions.every((actionType) => canarySignals.proposed_action_types.includes(actionType)) : null,
      },
      handoff: {
        checked: false,
        supported: null,
        note: "not_checked_by_intake_check_adapter",
      },
    },
    evidence_limitations: [
      {
        area: "handoff",
        status: "not_checked",
        message: "This intake gate does not probe /handoff support.",
      },
      ...warnings.map((issue) => ({
        area: issue.field,
        status: "warning",
        message: issue.message,
      })),
      ...errors.map((issue) => ({
        area: issue.field,
        status: "error",
        message: issue.message,
      })),
    ],
    errors,
    warnings,
  };
}

function renderHuman(summary) {
  const lines = [
    summary.ok ? "adapter onboarding passed" : "adapter onboarding failed",
    `profile: ${summary.summary.profile_id}`,
    `system: ${summary.summary.system_id}`,
    `adapter: ${summary.base_url}`,
    `cases: ${summary.cases_href}`,
    `capabilityArtifact: ${summary.files.artifact_href}`,
    `selectedCanary: ${summary.summary.selected_case_id || "none"}`,
    `healthOk: ${summary.summary.health_ok}`,
    `preflightOk: ${summary.summary.preflight_ok}`,
    `canaryOk: ${summary.summary.canary_ok}`,
  ];
  if (summary.errors.length > 0) {
    lines.push("errors:");
    for (const issue of summary.errors) lines.push(`- ${issue.field}: ${issue.message}`);
  }
  if (summary.warnings.length > 0) {
    lines.push("warnings:");
    for (const issue of summary.warnings) lines.push(`- ${issue.field}: ${issue.message}`);
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const intakeDir = resolveIntakeDir({
    cwd,
    profile: args.profile || null,
    explicitDir: args.dir || null,
  });
  const casesAbs = path.isAbsolute(args.cases) ? args.cases : path.resolve(cwd, args.cases);
  const canonicalOutAbs = adapterCapabilityPath(intakeDir);
  const extraOutAbs = args.out
    ? path.isAbsolute(args.out)
      ? args.out
      : path.resolve(cwd, args.out)
    : "";
  const intake = loadIntakePair(intakeDir);
  const cases = readCasesFile(casesAbs);
  const completeness = analyzeCasesCompleteness({
    systemScope: intake.systemScope,
    qualityContract: intake.qualityContract,
    cases,
  });

  const errors = [];
  const warnings = [...completeness.warnings];

  if (completeness.errors.length > 0) {
    pushIssue(
      errors,
      "error",
      "cases",
      "Cases must pass intake completeness checks before adapter onboarding can be verified",
      { completeness_errors: completeness.errors.slice(0, 20) }
    );
  }

  let selectedCase = null;
  if (errors.length === 0) {
    selectedCase = selectAdapterCanaryCase({
      systemScope: intake.systemScope,
      qualityContract: intake.qualityContract,
      cases,
      caseId: args.caseId,
    });
  }

  const normalizedBaseUrl = args.baseUrl.replace(/\/+$/, "");
  let healthInfo = {
    authEnabled: false,
    authHeader: args.authHeader,
    runtime: {},
  };
  let healthResult = null;
  let preflightResult = null;
  let canaryResult = null;
  let canarySignals = {
    event_count: 0,
    tool_calls: [],
    tool_results: [],
    telemetry_mode: null,
    has_final_output: false,
    has_trace_anchor: false,
    has_assumption_state: false,
    proposed_action_count: 0,
    proposed_action_types: [],
    has_final_output_event: false,
    missing_tool_result_call_ids: [],
    missing_tool_output_evidence_call_ids: [],
    missing_tool_error_evidence_call_ids: [],
  };

  if (selectedCase) {
    const authHeaders = buildAuthHeader(args.authHeader, args.authToken) || {};

    healthResult = await fetchJsonWithTimeout(`${normalizedBaseUrl}/health`, {
      method: "GET",
      headers: { accept: "application/json" },
      timeoutMs: args.timeoutMs,
    });
    healthInfo = validateHealthPayload(healthResult, warnings, errors);

    if (healthInfo.authEnabled && !String(args.authToken || "").trim()) {
      pushIssue(
        warnings,
        "warning",
        "adapter.health.auth",
        "Adapter health reports auth_enabled=true but no auth token was provided; protected probes may fail"
      );
    }

    preflightResult = await fetchJsonWithTimeout(`${normalizedBaseUrl}/run-case`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-aq-preflight": "1",
        ...authHeaders,
      },
      body: {
        case_id: "__preflight__",
        version: args.version,
        input: { user: "adapter onboarding preflight" },
      },
      timeoutMs: args.timeoutMs,
    });
    validatePreflight(preflightResult, errors);

    const canaryBody = {
      case_id: selectedCase.caseItem.id,
      version: args.version,
      input: selectedCase.caseItem.input,
      run_meta: {
        run_id: "adapter-onboarding-check",
        incident_id: "adapter-onboarding-check",
        agent_id: intake.systemScope.agent_id,
      },
    };
    selectedCase.version = args.version;
    canaryResult = await fetchJsonWithTimeout(`${normalizedBaseUrl}/run-case`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...authHeaders,
      },
      body: canaryBody,
      timeoutMs: args.timeoutMs,
    });
    canarySignals = validateCanaryResponse({
      response: canaryResult,
      selectedCase,
      systemScope: intake.systemScope,
      qualityContract: intake.qualityContract,
      errors,
      warnings,
    });
  }

  const summary = buildAdapterCapabilityArtifact({
    cwd,
    intakeDir,
    intake,
    casesAbs,
    baseUrl: normalizedBaseUrl,
    selectedCase,
    healthInfo,
    healthResult,
    preflightResult,
    canaryResult,
    canarySignals,
    errors,
    warnings,
    outAbs: canonicalOutAbs,
  });

  writeJson(canonicalOutAbs, summary);
  if (extraOutAbs && extraOutAbs !== canonicalOutAbs) {
    writeJson(extraOutAbs, summary);
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(renderHuman(summary));
  }

  process.exit(summary.ok ? 0 : 1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
