#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = {
    cases: "",
    profile: "quality",
    maxWeakExpectedRate: 0.2,
    requireToolEvidence: false,
    requireStrongTelemetry: false,
    requireSemanticQuality: true,
    requireAssumptionState: true,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cases") {
      out.cases = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (a === "--profile") {
      out.profile = String(argv[i + 1] ?? "quality");
      i += 1;
      continue;
    }
    if (a === "--maxWeakExpectedRate") {
      const v = Number(argv[i + 1]);
      if (Number.isFinite(v)) out.maxWeakExpectedRate = Math.max(0, Math.min(1, v));
      i += 1;
      continue;
    }
    if (a === "--requireToolEvidence") {
      const raw = String(argv[i + 1] ?? "0").toLowerCase();
      out.requireToolEvidence = raw === "1" || raw === "true" || raw === "yes";
      i += 1;
      continue;
    }
    if (a === "--requireStrongTelemetry") {
      const raw = String(argv[i + 1] ?? "0").toLowerCase();
      out.requireStrongTelemetry = raw === "1" || raw === "true" || raw === "yes";
      i += 1;
      continue;
    }
    if (a === "--requireSemanticQuality") {
      const raw = String(argv[i + 1] ?? "0").toLowerCase();
      out.requireSemanticQuality = raw === "1" || raw === "true" || raw === "yes";
      i += 1;
      continue;
    }
    if (a === "--requireAssumptionState") {
      const raw = String(argv[i + 1] ?? "0").toLowerCase();
      out.requireAssumptionState = raw === "1" || raw === "true" || raw === "yes";
      i += 1;
      continue;
    }
    if (a === "--help" || a === "-h") {
      console.log(
        [
          "Usage:",
          "  node scripts/validate-cases-quality.mjs --cases <path> [--profile quality|infra] [--maxWeakExpectedRate <0..1>] [--requireToolEvidence 0|1] [--requireStrongTelemetry 0|1] [--requireSemanticQuality 0|1] [--requireAssumptionState 0|1]",
        ].join("\n")
      );
      process.exit(0);
    }
    throw new Error(`Unknown option: ${a}`);
  }
  if (!out.cases) {
    throw new Error("Missing required --cases <path>");
  }
  if (out.profile !== "quality" && out.profile !== "infra") {
    throw new Error(`Invalid --profile: ${out.profile}. Must be quality|infra`);
  }
  return out;
}

function hasList(v) {
  return Array.isArray(v) && v.length > 0;
}

function hasToolEvidence(exp) {
  if (!exp || typeof exp !== "object") return false;
  if (hasList(exp.tool_required)) return true;
  if (hasList(exp.tool_sequence)) return true;
  if (exp.evidence_required_for_actions === true) return true;
  if (exp.tool_telemetry && typeof exp.tool_telemetry === "object") return true;
  return false;
}

function hasStrongTelemetryContract(exp) {
  if (!exp || typeof exp !== "object") return false;
  const t = exp.tool_telemetry;
  if (!t || typeof t !== "object") return false;
  if (t.require_non_wrapper_calls !== true) return false;
  const allowed = Array.isArray(t.allowed_modes) ? t.allowed_modes.map((x) => String(x)) : [];
  if (allowed.length === 0) return false;
  if (allowed.includes("wrapper_only")) return false;
  if (!allowed.includes("native") && !allowed.includes("inferred")) return false;
  if (typeof t.min_tool_calls !== "number" || t.min_tool_calls < 1) return false;
  if (typeof t.min_tool_results !== "number" || t.min_tool_results < 1) return false;
  if (t.require_call_result_pairs !== true) return false;
  return true;
}

function hasLexicalTextExpectation(exp) {
  if (!exp || typeof exp !== "object") return false;
  const include = hasList(exp.must_include);
  const filteredMustNot = Array.isArray(exp.must_not_include)
    ? exp.must_not_include
      .map((v) => String(v ?? "").trim())
      .filter((v) => v.length > 0 && !v.startsWith("[adapter:"))
    : [];
  return include || filteredMustNot.length > 0;
}

function hasExpectationSignal(exp) {
  if (!exp || typeof exp !== "object") return false;
  if (hasList(exp.action_required)) return true;
  if (exp.evidence_required_for_actions === true) return true;
  if (hasList(exp.tool_required)) return true;
  if (hasList(exp.tool_sequence)) return true;
  if (exp.tool_telemetry && typeof exp.tool_telemetry === "object") return true;
  if (exp.retrieval_required && typeof exp.retrieval_required === "object" && hasList(exp.retrieval_required.doc_ids)) return true;
  if (hasList(exp.must_include)) return true;
  if (hasList(exp.must_not_include)) return true;
  if (exp.semantic && typeof exp.semantic === "object") return true;
  if (exp.planning_gate && typeof exp.planning_gate === "object") return true;
  if (exp.repl_policy && typeof exp.repl_policy === "object") return true;
  return false;
}

function hasAssumptionStateContract(exp) {
  if (!exp || typeof exp !== "object") return false;
  const a = exp.assumption_state;
  if (!a || typeof a !== "object") return false;
  if (a.required === false) return false;
  if (typeof a.min_selected_candidates !== "number") return false;
  if (a.min_selected_candidates < 1) return false;
  if (a.max_rejected_candidates !== undefined && (typeof a.max_rejected_candidates !== "number" || a.max_rejected_candidates < 0)) {
    return false;
  }
  if (a.allowed_reason_codes !== undefined) {
    if (!Array.isArray(a.allowed_reason_codes)) return false;
    if (a.allowed_reason_codes.length === 0) return false;
  }
  return true;
}

function hasSemanticQualityContract(exp) {
  if (!exp || typeof exp !== "object") return false;
  const semantic = exp.semantic;
  if (!semantic || typeof semantic !== "object") return false;
  const required = Array.isArray(semantic.required_concepts) && semantic.required_concepts.length > 0;
  const forbidden = Array.isArray(semantic.forbidden_concepts) && semantic.forbidden_concepts.length > 0;
  const refs = Array.isArray(semantic.reference_texts) && semantic.reference_texts.length > 0;
  const hasAny = required || forbidden || refs;
  if (!hasAny) return false;
  if (!refs) return true;

  const hasProfile = typeof semantic.profile === "string"
    && ["strict", "balanced", "lenient"].includes(semantic.profile);
  const hasMinToken = typeof semantic.min_token_f1 === "number"
    && semantic.min_token_f1 >= 0
    && semantic.min_token_f1 <= 1;
  const hasMinLcs = typeof semantic.min_lcs_ratio === "number"
    && semantic.min_lcs_ratio >= 0
    && semantic.min_lcs_ratio <= 1;

  if (hasMinToken !== hasMinLcs) return false;
  if (hasProfile) return true;
  if (hasMinToken && hasMinLcs) return true;
  return false;
}

function isWeakExpected(exp) {
  if (!exp || typeof exp !== "object") return true;
  const retrievalRequired = exp.retrieval_required;
  const hasRetrievalDocs =
    retrievalRequired &&
    typeof retrievalRequired === "object" &&
    Array.isArray(retrievalRequired.doc_ids) &&
    retrievalRequired.doc_ids.length > 0;

  if (hasList(exp.action_required)) return false;
  if (exp.evidence_required_for_actions === true) return false;
  if (hasList(exp.tool_required)) return false;
  if (hasList(exp.tool_sequence)) return false;
  if (exp.tool_telemetry && typeof exp.tool_telemetry === "object") return false;
  if (exp.json_schema !== undefined && exp.json_schema !== null) return false;
  if (hasRetrievalDocs) return false;
  if (hasList(exp.must_include)) return false;
  if (hasList(exp.must_not_include)) return false;
  return true;
}

function readCases(absPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Cases file must be a JSON array");
  }
  return parsed;
}

function main() {
  const args = parseArgs(process.argv);
  const abs = path.resolve(process.cwd(), args.cases);
  const cases = readCases(abs);

  const weak = [];
  const toolEvidenceMissing = [];
  const strongTelemetryMissing = [];
  const semanticQualityMissing = [];
  const assumptionStateMissing = [];
  for (const c of cases) {
    const id = typeof c?.id === "string" && c.id.length > 0 ? c.id : "<unknown>";
    const expected = c?.expected && typeof c.expected === "object" ? c.expected : {};
    if (isWeakExpected(expected)) weak.push(id);
    if (args.requireToolEvidence && !hasToolEvidence(expected)) toolEvidenceMissing.push(id);
    if (args.requireStrongTelemetry && !hasStrongTelemetryContract(expected)) strongTelemetryMissing.push(id);
    if (args.requireSemanticQuality && hasLexicalTextExpectation(expected) && !hasSemanticQualityContract(expected)) {
      semanticQualityMissing.push(id);
    }
    if (args.requireAssumptionState && hasExpectationSignal(expected) && !hasAssumptionStateContract(expected)) {
      assumptionStateMissing.push(id);
    }
  }

  const total = cases.length;
  const weakCount = weak.length;
  const weakRate = total > 0 ? weakCount / total : 0;

  const summary = {
    profile: args.profile,
    cases: abs,
    total_cases: total,
    weak_expected_cases: weakCount,
    weak_expected_rate: Number(weakRate.toFixed(3)),
    max_weak_expected_rate: args.maxWeakExpectedRate,
    tool_evidence_required: args.requireToolEvidence,
    tool_evidence_missing_cases: toolEvidenceMissing.length,
    strong_telemetry_required: args.requireStrongTelemetry,
    strong_telemetry_missing_cases: strongTelemetryMissing.length,
    semantic_quality_required: args.requireSemanticQuality,
    semantic_quality_missing_cases: semanticQualityMissing.length,
    assumption_state_required: args.requireAssumptionState,
    assumption_state_missing_cases: assumptionStateMissing.length,
  };

  if (args.profile === "quality" && weakRate > args.maxWeakExpectedRate) {
    const sample = weak.slice(0, 12).join(", ");
    console.error(
      [
        "ERROR: quality campaign uses weak expectations above threshold.",
        JSON.stringify(summary),
        sample ? `weak_case_ids_sample: ${sample}` : "",
        "Use a *-quality cases file (with strong expected assertions) or switch profile to infra.",
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(2);
  }

  if (args.profile === "quality" && args.requireToolEvidence && toolEvidenceMissing.length > 0) {
    const sample = toolEvidenceMissing.slice(0, 12).join(", ");
    console.error(
      [
        "ERROR: quality campaign requires tool evidence assertions, but some cases do not define them.",
        JSON.stringify(summary),
        sample ? `missing_tool_evidence_case_ids_sample: ${sample}` : "",
        "Add expected.tool_required/tool_sequence/evidence_required_for_actions or disable via --requireToolEvidence 0.",
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(2);
  }

  if (args.profile === "quality" && args.requireStrongTelemetry && strongTelemetryMissing.length > 0) {
    const sample = strongTelemetryMissing.slice(0, 12).join(", ");
    console.error(
      [
        "ERROR: quality campaign requires strong telemetry contract, but some cases are missing expected.tool_telemetry hard requirements.",
        JSON.stringify(summary),
        sample ? `missing_strong_telemetry_case_ids_sample: ${sample}` : "",
        "Add expected.tool_telemetry with non-wrapper requirement and allowed_modes native/inferred.",
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(2);
  }

  if (args.profile === "quality" && args.requireSemanticQuality && semanticQualityMissing.length > 0) {
    const sample = semanticQualityMissing.slice(0, 12).join(", ");
    console.error(
      [
        "ERROR: quality campaign requires semantic quality contract for lexical text expectations, but some cases are missing expected.semantic.",
        JSON.stringify(summary),
        sample ? `missing_semantic_quality_case_ids_sample: ${sample}` : "",
        "Add expected.semantic.required_concepts/forbidden_concepts/reference_texts to text-eval cases.",
        "If reference_texts are used, include either semantic.profile (strict|balanced|lenient) or both semantic.min_token_f1 + semantic.min_lcs_ratio.",
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(2);
  }

  if (args.profile === "quality" && args.requireAssumptionState && assumptionStateMissing.length > 0) {
    const sample = assumptionStateMissing.slice(0, 12).join(", ");
    console.error(
      [
        "ERROR: quality campaign requires assumption-state contract, but some cases are missing expected.assumption_state requirements.",
        JSON.stringify(summary),
        sample ? `missing_assumption_state_case_ids_sample: ${sample}` : "",
        "Add expected.assumption_state with required=true and min_selected_candidates>=1.",
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(2);
  }

  console.log(JSON.stringify(summary));
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`validate-cases-quality: ${message}`);
  process.exit(2);
}
