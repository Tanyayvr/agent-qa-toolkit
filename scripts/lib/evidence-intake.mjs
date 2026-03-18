import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const TODO_TOKEN = "TODO";

export const HUMAN_OWNED_FIELDS = [
  {
    field: "system_scope.intended_use",
    reason: "Product purpose and boundary cannot be inferred safely from runtime artifacts.",
  },
  {
    field: "system_scope.human_context.business_harms",
    reason: "Business harm and impact severity are governance judgments, not evaluator outputs.",
  },
  {
    field: "system_scope.human_context.deployment_assumptions",
    reason: "Deployment assumptions are environment-specific and must be stated by operators.",
  },
  {
    field: "quality_contract.prohibited_behaviors",
    reason: "Unsafe or unacceptable behavior must be chosen by the owner team.",
  },
  {
    field: "quality_contract.risky_actions",
    reason: "Approval and block semantics require human policy decisions.",
  },
  {
    field: "quality_contract.human_review",
    reason: "Residual risk ownership and final signoff remain human-owned.",
  },
];

export const DEFAULT_CASE_REQUIREMENTS = {
  minimum_case_count: 20,
  minimum_negative_case_ratio: 0.3,
  minimum_semantic_case_ratio: 0.2,
  require_boundary_cases: true,
  require_refusal_cases: true,
  require_tool_sequence_cases: false,
  require_retry_cases: false,
  require_handoff_cases: false,
};

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

export function parseBooleanFlag(raw, defaultValue = false) {
  if (raw === undefined || raw === null) return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: ${raw}`);
}

export function resolveIntakeDir({ cwd, profile, explicitDir }) {
  if (explicitDir) {
    return path.isAbsolute(explicitDir) ? explicitDir : path.resolve(cwd, explicitDir);
  }
  if (!profile) {
    throw new Error("Missing required profile to resolve intake directory");
  }
  return path.resolve(cwd, "ops", "intake", profile);
}

export function ensureDir(absDir) {
  mkdirSync(absDir, { recursive: true });
}

export function writeJson(absPath, value) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

export function relFrom(baseDir, absPath) {
  return toPosixPath(path.relative(baseDir, absPath));
}

export function systemScopePath(intakeDir) {
  return path.join(intakeDir, "system-scope.json");
}

export function qualityContractPath(intakeDir) {
  return path.join(intakeDir, "quality-contract.json");
}

export function casesCoveragePath(intakeDir) {
  return path.join(intakeDir, "cases-coverage.json");
}

export function adapterCapabilityPath(intakeDir) {
  return path.join(intakeDir, "adapter-capability.json");
}

export function runFingerprintPath(intakeDir) {
  return path.join(intakeDir, "run-fingerprint.json");
}

export function correctiveActionRegisterPath(intakeDir) {
  return path.join(intakeDir, "corrective-action-register.json");
}

export function makeSystemScopeTemplate({
  profile,
  systemId = `${profile}-system`,
  agentId = `${profile}-agent`,
  systemName = "TODO",
  euDossierRequired = false,
}) {
  return {
    schema_version: 1,
    profile_id: profile,
    system_id: systemId,
    agent_id: agentId,
    system_name: systemName,
    intended_use: TODO_TOKEN,
    change_under_review: {
      summary: TODO_TOKEN,
      baseline_target: TODO_TOKEN,
      new_target: TODO_TOKEN,
    },
    deployment_context: {
      primary_environment: "staging",
      target_markets: euDossierRequired ? ["EU"] : ["TODO"],
      affects_people: true,
      user_impact: "medium",
      autonomy_level: "assistant",
      eu_dossier_required: euDossierRequired,
    },
    tools: {
      in_scope: [TODO_TOKEN],
      out_of_scope: [],
    },
    owners: {
      system_owner: TODO_TOKEN,
      evaluation_owner: TODO_TOKEN,
      release_owner: TODO_TOKEN,
      compliance_owner: euDossierRequired ? TODO_TOKEN : "",
      legal_reviewer: euDossierRequired ? TODO_TOKEN : "",
    },
    evidence_preferences: {
      require_tool_telemetry: true,
      require_trace_anchor: true,
      require_assumption_state: true,
      require_recurring_monitoring: true,
      require_eu_exports: euDossierRequired,
    },
    human_context: {
      business_harms: [TODO_TOKEN],
      deployment_assumptions: [TODO_TOKEN],
      narrative_requirements: [TODO_TOKEN],
      legal_review_required: euDossierRequired,
    },
  };
}

export function makeQualityContractTemplate({ profile, systemId }) {
  return {
    schema_version: 1,
    profile_id: profile,
    system_id: systemId,
    critical_tasks: [
      {
        id: "task_1",
        name: TODO_TOKEN,
        description: TODO_TOKEN,
        priority: "critical",
        expected_gate: "none",
        required_tools: [TODO_TOKEN],
        tool_sequence: [],
        scenario_variants: ["positive", "boundary"],
        expected_output: {
          content_type: "json",
          json_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              result: { type: "string" },
            },
            required: ["result"],
          },
          required_concepts: [[TODO_TOKEN]],
          forbidden_concepts: [],
          must_include: [],
          must_not_include: [],
        },
        require_assumption_state: true,
      },
    ],
    prohibited_behaviors: [
      {
        id: "prohibited_1",
        description: TODO_TOKEN,
        severity: "critical",
        refuse_or_block: "block",
        related_tools: [],
      },
    ],
    risky_actions: [
      {
        id: "risk_1",
        action_type: TODO_TOKEN,
        description: TODO_TOKEN,
        default_gate: "require_approval",
        required_evidence: true,
        related_tools: [],
      },
    ],
    telemetry_requirements: {
      require_events: true,
      require_trace_anchor: true,
      require_assumption_state: true,
      require_tool_call_result_pairs: true,
    },
    case_requirements: { ...DEFAULT_CASE_REQUIREMENTS },
    human_review: {
      residual_risk_owner: TODO_TOKEN,
      approval_rationale_required: true,
      notes: [TODO_TOKEN],
    },
  };
}

export function loadIntakePair(intakeDir) {
  const scopeAbs = systemScopePath(intakeDir);
  const qualityAbs = qualityContractPath(intakeDir);
  if (!existsSync(scopeAbs)) {
    throw new Error(`Missing intake file: ${scopeAbs}`);
  }
  if (!existsSync(qualityAbs)) {
    throw new Error(`Missing intake file: ${qualityAbs}`);
  }
  const systemScope = readJson(scopeAbs);
  const qualityContract = readJson(qualityAbs);
  return {
    intakeDir,
    paths: {
      system_scope: scopeAbs,
      quality_contract: qualityAbs,
    },
    systemScope,
    qualityContract,
  };
}

export function collectTodoPaths(value, base = "$") {
  const out = [];

  function walk(node, currentPath) {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${currentPath}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") {
      if (typeof node === "string" && node.trim().toUpperCase().includes(TODO_TOKEN)) {
        out.push(currentPath);
      }
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      walk(child, `${currentPath}.${key}`);
    }
  }

  walk(value, base);
  return out;
}

export function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values || []) {
    const value = String(raw ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function overlapStrings(a, b) {
  const left = new Set(uniqueStrings(a));
  return uniqueStrings(b).filter((item) => left.has(item));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function includesAll(actual, required) {
  const actualSet = new Set(uniqueStrings(actual));
  return uniqueStrings(required).every((item) => actualSet.has(item));
}

function arraysEqualNormalized(actual, expected) {
  const a = uniqueStrings(actual);
  const b = uniqueStrings(expected);
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function buildToolTelemetryExpectation(toolNames, telemetryRequirements) {
  const distinctTools = uniqueStrings(toolNames);
  if (!distinctTools.length) return undefined;
  if (!telemetryRequirements?.require_tool_call_result_pairs) return undefined;
  return {
    require_non_wrapper_calls: true,
    allowed_modes: ["native", "inferred"],
    min_tool_calls: distinctTools.length,
    min_tool_results: distinctTools.length,
    require_call_result_pairs: true,
  };
}

function buildAssumptionExpectation(requirementEnabled) {
  if (!requirementEnabled) return undefined;
  return {
    required: true,
    min_selected_candidates: 1,
    require_reason_codes_for_rejected: true,
  };
}

function buildSemanticExpectation(expectedOutput) {
  const requiredConcepts = Array.isArray(expectedOutput?.required_concepts) ? expectedOutput.required_concepts : [];
  const forbiddenConcepts = Array.isArray(expectedOutput?.forbidden_concepts) ? expectedOutput.forbidden_concepts : [];
  if (!requiredConcepts.length && !forbiddenConcepts.length) return undefined;
  return {
    ...(requiredConcepts.length ? { required_concepts: requiredConcepts } : {}),
    ...(forbiddenConcepts.length ? { forbidden_concepts: forbiddenConcepts } : {}),
  };
}

function buildExpectedOutputContract(expectedOutput, tools, telemetryRequirements, requireAssumptionState) {
  const expected = {};
  const toolRequired = uniqueStrings(tools);
  if (toolRequired.length) expected.tool_required = toolRequired;
  if (Array.isArray(expectedOutput?.tool_sequence) && expectedOutput.tool_sequence.length) {
    expected.tool_sequence = uniqueStrings(expectedOutput.tool_sequence);
  }
  if (expectedOutput?.json_schema) {
    expected.json_schema = expectedOutput.json_schema;
  }
  if (Array.isArray(expectedOutput?.must_include) && expectedOutput.must_include.length) {
    expected.must_include = uniqueStrings(expectedOutput.must_include);
  }
  if (Array.isArray(expectedOutput?.must_not_include) && expectedOutput.must_not_include.length) {
    expected.must_not_include = uniqueStrings(expectedOutput.must_not_include);
  }
  const semantic = buildSemanticExpectation(expectedOutput);
  if (semantic) expected.semantic = semantic;
  const toolTelemetry = buildToolTelemetryExpectation(toolRequired, telemetryRequirements);
  if (toolTelemetry) expected.tool_telemetry = toolTelemetry;
  const assumptionState = buildAssumptionExpectation(requireAssumptionState);
  if (assumptionState) expected.assumption_state = assumptionState;
  return expected;
}

function taskPrompt(task, variant) {
  return `TODO: add a realistic ${variant} user request for task "${task.name}".`;
}

function variantTitle(taskName, variant) {
  return `${taskName} (${variant.replaceAll("_", " ")})`;
}

function buildTaskCase(task, variant, telemetryRequirements) {
  const expectedOutput = {
    ...task.expected_output,
    ...(Array.isArray(task.tool_sequence) && task.tool_sequence.length ? { tool_sequence: task.tool_sequence } : {}),
  };
  const expected = buildExpectedOutputContract(
    expectedOutput,
    task.required_tools,
    telemetryRequirements,
    task.require_assumption_state || telemetryRequirements.require_assumption_state
  );
  return {
    id: `${task.id}__${variant}`,
    title: variantTitle(task.name, variant),
    input: {
      user: taskPrompt(task, variant),
      context: {
        intake_scaffold: {
          source: "critical_task",
          task_id: task.id,
          variant,
          requires_human_review: true,
        },
      },
    },
    expected,
    metadata: {
      severity: task.priority,
      expected_gate: task.expected_gate,
      scenario_type: variant,
      scaffold_source: "quality_contract",
      requires_human_review: true,
      intake_mapping: {
        source_type: "critical_task",
        source_id: task.id,
        scenario_type: variant,
      },
    },
  };
}

function buildRiskCase(risk, telemetryRequirements, requireAssumptionState) {
  const expected = {};
  expected.action_required = [risk.action_type];
  if (risk.required_evidence) {
    expected.evidence_required_for_actions = true;
  }
  const toolRequired = uniqueStrings(risk.related_tools);
  if (toolRequired.length) {
    expected.tool_required = toolRequired;
    const toolTelemetry = buildToolTelemetryExpectation(toolRequired, telemetryRequirements);
    if (toolTelemetry) expected.tool_telemetry = toolTelemetry;
  }
  const assumptionState = buildAssumptionExpectation(requireAssumptionState);
  if (assumptionState) expected.assumption_state = assumptionState;

  return {
    id: `${risk.id}__gate`,
    title: `${risk.action_type} (${risk.default_gate})`,
    input: {
      user: `TODO: add a realistic user request that would trigger risky action "${risk.action_type}".`,
      context: {
        intake_scaffold: {
          source: "risky_action",
          risk_id: risk.id,
          requires_human_review: true,
        },
      },
    },
    expected,
    metadata: {
      expected_gate: risk.default_gate,
      scenario_type: "risky_action",
      scaffold_source: "quality_contract",
      requires_human_review: true,
      intake_mapping: {
        source_type: "risky_action",
        source_id: risk.id,
        scenario_type: "risky_action",
      },
    },
  };
}

function buildProhibitedCase(behavior, requireAssumptionState) {
  const expected = {
    must_not_include: ["TODO_REPLACE_WITH_UNSAFE_CONFIRMATION"],
    semantic: {
      forbidden_concepts: [[behavior.description]],
    },
  };
  const assumptionState = buildAssumptionExpectation(requireAssumptionState);
  if (assumptionState) expected.assumption_state = assumptionState;

  return {
    id: `${behavior.id}__refusal`,
    title: `Refuse or block: ${behavior.id}`,
    input: {
      user: `TODO: add a realistic user request that attempts prohibited behavior "${behavior.description}".`,
      context: {
        intake_scaffold: {
          source: "prohibited_behavior",
          prohibited_behavior_id: behavior.id,
          requires_human_review: true,
        },
      },
    },
    expected,
    metadata: {
      expected_gate: behavior.refuse_or_block === "block" ? "block" : "require_approval",
      scenario_type: "refusal",
      scaffold_source: "quality_contract",
      requires_human_review: true,
      intake_mapping: {
        source_type: "prohibited_behavior",
        source_id: behavior.id,
        scenario_type: "refusal",
      },
    },
  };
}

export function scaffoldCasesFromIntake(systemScope, qualityContract) {
  const telemetryRequirements = qualityContract.telemetry_requirements || {};
  const cases = [];

  for (const task of qualityContract.critical_tasks || []) {
    const variants = uniqueStrings(task.scenario_variants || ["positive"]);
    const taskVariants = variants.length ? variants : ["positive"];
    for (const variant of taskVariants) {
      cases.push(buildTaskCase(task, variant, telemetryRequirements));
    }
  }

  for (const risk of qualityContract.risky_actions || []) {
    cases.push(
      buildRiskCase(
        risk,
        telemetryRequirements,
        telemetryRequirements.require_assumption_state || systemScope?.evidence_preferences?.require_assumption_state
      )
    );
  }

  for (const behavior of qualityContract.prohibited_behaviors || []) {
    cases.push(
      buildProhibitedCase(
        behavior,
        telemetryRequirements.require_assumption_state || systemScope?.evidence_preferences?.require_assumption_state
      )
    );
  }

  return cases;
}

export function readCasesFile(absPath) {
  const parsed = readJson(absPath);
  if (!Array.isArray(parsed)) {
    throw new Error("cases file must be a JSON array");
  }
  return parsed;
}

function normalizeCaseMapping(caseItem) {
  const metadata = asRecord(caseItem?.metadata) || {};
  const input = asRecord(caseItem?.input) || {};
  const context = asRecord(input.context) || {};
  const intakeScaffold = asRecord(context.intake_scaffold) || {};
  const intakeMapping = asRecord(metadata.intake_mapping) || {};

  let sourceType = "";
  let sourceId = "";
  let scenarioType = "";

  if (typeof intakeMapping.source_type === "string") sourceType = intakeMapping.source_type;
  if (typeof intakeMapping.source_id === "string") sourceId = intakeMapping.source_id;
  if (typeof intakeMapping.scenario_type === "string") scenarioType = intakeMapping.scenario_type;

  if (!sourceType && typeof intakeScaffold.source === "string") sourceType = intakeScaffold.source;
  if (!sourceId) {
    if (typeof intakeScaffold.task_id === "string") sourceId = intakeScaffold.task_id;
    else if (typeof intakeScaffold.risk_id === "string") sourceId = intakeScaffold.risk_id;
    else if (typeof intakeScaffold.prohibited_behavior_id === "string") sourceId = intakeScaffold.prohibited_behavior_id;
  }
  if (!scenarioType) {
    if (typeof metadata.scenario_type === "string") scenarioType = metadata.scenario_type;
    else if (typeof intakeScaffold.variant === "string") scenarioType = intakeScaffold.variant;
  }

  if (sourceType === "critical_task" || sourceType === "risky_action" || sourceType === "prohibited_behavior") {
    return {
      source_type: sourceType,
      source_id: sourceId,
      scenario_type: scenarioType,
      expected_gate: typeof metadata.expected_gate === "string" ? metadata.expected_gate : "none",
      requires_human_review: metadata.requires_human_review === true || intakeScaffold.requires_human_review === true,
    };
  }

  return {
    source_type: "",
    source_id: "",
    scenario_type: typeof metadata.scenario_type === "string" ? metadata.scenario_type : "",
    expected_gate: typeof metadata.expected_gate === "string" ? metadata.expected_gate : "none",
    requires_human_review: metadata.requires_human_review === true || intakeScaffold.requires_human_review === true,
  };
}

function caseExpected(caseItem) {
  return asRecord(caseItem?.expected) || {};
}

function caseHasSemantic(caseItem) {
  const expected = caseExpected(caseItem);
  return Boolean(asRecord(expected.semantic));
}

function caseHasToolSequence(caseItem) {
  const expected = caseExpected(caseItem);
  return hasNonEmptyArray(expected.tool_sequence);
}

function caseHasAssumptionState(caseItem) {
  const expected = caseExpected(caseItem);
  return Boolean(asRecord(expected.assumption_state));
}

function caseHasToolRequirement(caseItem, tools) {
  const expected = caseExpected(caseItem);
  return includesAll(expected.tool_required, tools);
}

function caseHasMatchingToolSequence(caseItem, tools) {
  const expected = caseExpected(caseItem);
  return arraysEqualNormalized(expected.tool_sequence, tools);
}

function caseHasRequiredEvidence(caseItem) {
  const expected = caseExpected(caseItem);
  return expected.evidence_required_for_actions === true;
}

function caseHasActionRequirement(caseItem) {
  const expected = caseExpected(caseItem);
  return hasNonEmptyArray(expected.action_required);
}

function caseHasToolContract(caseItem) {
  const expected = caseExpected(caseItem);
  return hasNonEmptyArray(expected.tool_sequence) || hasNonEmptyArray(expected.tool_required);
}

function classifyCase(caseItem) {
  const mapping = normalizeCaseMapping(caseItem);
  const negative =
    mapping.expected_gate === "require_approval" ||
    mapping.expected_gate === "block" ||
    mapping.source_type === "risky_action" ||
    mapping.source_type === "prohibited_behavior" ||
    mapping.scenario_type === "refusal" ||
    mapping.scenario_type === "risky_action";

  return {
    id: String(caseItem?.id ?? "").trim(),
    mapping,
    is_negative: negative,
    has_semantic: caseHasSemantic(caseItem),
    has_tool_sequence: caseHasToolSequence(caseItem),
    has_assumption_state: caseHasAssumptionState(caseItem),
  };
}

function canaryScenarioWeight(scenarioType) {
  if (scenarioType === "positive") return 40;
  if (scenarioType === "boundary") return 20;
  if (scenarioType === "handoff") return 10;
  if (scenarioType === "retry") return 5;
  if (scenarioType === "refusal") return -20;
  return 0;
}

function canarySourceWeight(sourceType) {
  if (sourceType === "critical_task") return 100;
  if (sourceType === "risky_action") return 25;
  if (sourceType === "prohibited_behavior") return -30;
  return 0;
}

export function selectAdapterCanaryCase({ systemScope, qualityContract, cases, caseId = "" }) {
  const casesById = new Map();
  const classified = [];
  for (const caseItem of cases || []) {
    if (!asRecord(caseItem)) continue;
    const id = String(caseItem.id ?? "").trim();
    if (!id) continue;
    casesById.set(id, caseItem);
    classified.push({
      caseItem,
      ...classifyCase(caseItem),
    });
  }

  if (caseId) {
    const direct = casesById.get(caseId);
    if (!direct) {
      throw new Error(`Requested --caseId not found in cases file: ${caseId}`);
    }
    return {
      caseItem: direct,
      ...classifyCase(direct),
      score: null,
      reason: "requested_case_id",
    };
  }

  const toolTelemetryRequired =
    systemScope?.evidence_preferences?.require_tool_telemetry ||
    qualityContract?.telemetry_requirements?.require_tool_call_result_pairs;
  const assumptionRequired =
    systemScope?.evidence_preferences?.require_assumption_state ||
    qualityContract?.telemetry_requirements?.require_assumption_state;

  const candidates = classified
    .filter((item) => !item.mapping.requires_human_review)
    .map((item) => {
      let score = 0;
      score += canarySourceWeight(item.mapping.source_type);
      score += canaryScenarioWeight(item.mapping.scenario_type);
      if (!item.is_negative) score += 10;
      if (caseHasToolContract(item.caseItem)) score += toolTelemetryRequired ? 30 : 10;
      if (caseHasActionRequirement(item.caseItem)) score += 15;
      if (item.has_semantic) score += 10;
      if (item.has_assumption_state) score += assumptionRequired ? 20 : 5;
      if (item.mapping.source_type && item.mapping.source_id) score += 5;
      return {
        ...item,
        score,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.id.localeCompare(right.id);
    });

  const selected = candidates[0];
  if (!selected) {
    throw new Error("No adapter canary case could be selected from the provided cases file");
  }

  return {
    ...selected,
    reason: "best_scored_ready_case",
  };
}

export function analyzeCasesCompleteness({ systemScope, qualityContract, cases }) {
  const errors = [];
  const warnings = [];
  const casesById = new Map();
  const classified = [];

  for (const caseItem of cases) {
    if (!asRecord(caseItem)) {
      errors.push({
        severity: "error",
        field: "cases",
        message: "Each cases.json entry must be an object",
      });
      continue;
    }
    const id = String(caseItem.id ?? "").trim();
    if (!id) {
      errors.push({
        severity: "error",
        field: "cases[].id",
        message: "Each case must have a non-empty id",
      });
      continue;
    }
    if (casesById.has(id)) {
      errors.push({
        severity: "error",
        field: "cases.id",
        message: "Case ids must be unique",
        details: { duplicate_id: id },
      });
      continue;
    }
    casesById.set(id, caseItem);
    classified.push({ caseItem, ...classifyCase(caseItem) });
  }

  const todoPaths = collectTodoPaths(cases, "cases");
  for (const todoPath of todoPaths) {
    errors.push({
      severity: "error",
      field: todoPath,
      message: "TODO placeholder must be removed before the case suite is complete",
    });
  }

  const reviewCases = classified.filter((item) => item.mapping.requires_human_review).map((item) => item.id);
  if (reviewCases.length > 0) {
    errors.push({
      severity: "error",
      field: "cases.metadata.requires_human_review",
      message: "Draft scaffold markers are still present; review and clear them before treating the suite as ready",
      details: { case_ids_sample: reviewCases.slice(0, 12) },
    });
  }

  const mappedCases = classified.filter((item) => item.mapping.source_type && item.mapping.source_id);
  const unmappedCases = classified.filter((item) => !(item.mapping.source_type && item.mapping.source_id));

  const taskCases = new Map();
  const riskCases = new Map();
  const prohibitedCases = new Map();
  for (const item of mappedCases) {
    if (item.mapping.source_type === "critical_task") {
      const list = taskCases.get(item.mapping.source_id) || [];
      list.push(item);
      taskCases.set(item.mapping.source_id, list);
    } else if (item.mapping.source_type === "risky_action") {
      const list = riskCases.get(item.mapping.source_id) || [];
      list.push(item);
      riskCases.set(item.mapping.source_id, list);
    } else if (item.mapping.source_type === "prohibited_behavior") {
      const list = prohibitedCases.get(item.mapping.source_id) || [];
      list.push(item);
      prohibitedCases.set(item.mapping.source_id, list);
    }
  }

  let requiredVariantCount = 0;
  let coveredVariantCount = 0;
  const criticalTaskCoverage = [];

  for (const task of qualityContract.critical_tasks || []) {
    const matches = taskCases.get(task.id) || [];
    const requiredVariants = uniqueStrings(task.scenario_variants || ["positive"]);
    const coveredVariants = [];
    const missingVariants = [];

    if (matches.length === 0) {
      errors.push({
        severity: "error",
        field: `quality_contract.critical_tasks.${task.id}`,
        message: "No case maps to this critical task",
      });
    }

    for (const variant of requiredVariants) {
      requiredVariantCount += 1;
      const variantMatches = matches.filter((item) => item.mapping.scenario_type === variant);
      const variantCovered = variantMatches.length > 0;
      if (variantCovered) {
        coveredVariantCount += 1;
        coveredVariants.push({
          scenario_type: variant,
          case_ids: variantMatches.map((item) => item.id),
        });
      } else {
        missingVariants.push(variant);
        errors.push({
          severity: "error",
          field: `quality_contract.critical_tasks.${task.id}.scenario_variants`,
          message: `Missing required scenario variant: ${variant}`,
        });
      }
    }

    const requiredTools = uniqueStrings(task.required_tools);
    const toolContractCovered = requiredTools.length > 0 ? matches.some((item) => caseHasToolRequirement(item.caseItem, requiredTools)) : true;
    if (requiredTools.length > 0 && !toolContractCovered) {
      errors.push({
        severity: "error",
        field: `quality_contract.critical_tasks.${task.id}.required_tools`,
        message: "Mapped task cases do not encode the required tool contract",
      });
    }

    const toolSequence = uniqueStrings(task.tool_sequence);
    const toolSequenceCovered = toolSequence.length > 0 ? matches.some((item) => caseHasMatchingToolSequence(item.caseItem, toolSequence)) : true;
    if (toolSequence.length > 0 && !toolSequenceCovered) {
      errors.push({
        severity: "error",
        field: `quality_contract.critical_tasks.${task.id}.tool_sequence`,
        message: "Mapped task cases do not encode the required tool sequence",
      });
    }

    const requiredConcepts = hasNonEmptyArray(task.expected_output?.required_concepts);
    const forbiddenConcepts = hasNonEmptyArray(task.expected_output?.forbidden_concepts);
    const semanticCovered = requiredConcepts || forbiddenConcepts ? matches.some((item) => caseHasSemantic(item.caseItem)) : true;
    if ((requiredConcepts || forbiddenConcepts) && !semanticCovered) {
      errors.push({
        severity: "error",
        field: `quality_contract.critical_tasks.${task.id}.expected_output.semantic`,
        message: "Mapped task cases are missing semantic expectations",
      });
    }

    const assumptionStateCovered = task.require_assumption_state ? matches.some((item) => item.has_assumption_state) : true;
    if (task.require_assumption_state && !assumptionStateCovered) {
      errors.push({
        severity: "error",
        field: `quality_contract.critical_tasks.${task.id}.require_assumption_state`,
        message: "Mapped task cases are missing assumption_state expectations",
      });
    }

    criticalTaskCoverage.push({
      id: task.id,
      name: task.name,
      priority: task.priority,
      case_ids: matches.map((item) => item.id),
      case_count: matches.length,
      required_variants: requiredVariants,
      covered_variants: coveredVariants,
      missing_variants: missingVariants,
      required_tools: requiredTools,
      tool_contract_covered: toolContractCovered,
      tool_sequence: toolSequence,
      tool_sequence_covered: toolSequenceCovered,
      semantic_expectations_required: requiredConcepts || forbiddenConcepts,
      semantic_covered: semanticCovered,
      assumption_state_required: Boolean(task.require_assumption_state),
      assumption_state_covered: assumptionStateCovered,
    });
  }

  const riskyActionCoverage = [];
  for (const risk of qualityContract.risky_actions || []) {
    const matches = riskCases.get(risk.id) || [];
    if (matches.length === 0) {
      errors.push({
        severity: "error",
        field: `quality_contract.risky_actions.${risk.id}`,
        message: "No case maps to this risky action",
      });
    }
    const requiredEvidenceCovered = risk.required_evidence ? matches.some((item) => caseHasRequiredEvidence(item.caseItem)) : true;
    if (risk.required_evidence && !requiredEvidenceCovered) {
      errors.push({
        severity: "error",
        field: `quality_contract.risky_actions.${risk.id}.required_evidence`,
        message: "Mapped risky-action cases are missing evidence_required_for_actions",
      });
    }
    const relatedTools = uniqueStrings(risk.related_tools);
    const relatedToolsCovered = relatedTools.length > 0 ? matches.some((item) => caseHasToolRequirement(item.caseItem, risk.related_tools)) : true;
    if (relatedTools.length > 0 && !relatedToolsCovered) {
      errors.push({
        severity: "error",
        field: `quality_contract.risky_actions.${risk.id}.related_tools`,
        message: "Mapped risky-action cases are missing the related tool contract",
      });
    }
    riskyActionCoverage.push({
      id: risk.id,
      action_type: risk.action_type,
      default_gate: risk.default_gate,
      case_ids: matches.map((item) => item.id),
      case_count: matches.length,
      related_tools: relatedTools,
      related_tools_covered: relatedToolsCovered,
      required_evidence: Boolean(risk.required_evidence),
      required_evidence_covered: requiredEvidenceCovered,
    });
  }

  const prohibitedBehaviorCoverage = [];
  for (const behavior of qualityContract.prohibited_behaviors || []) {
    const matches = prohibitedCases.get(behavior.id) || [];
    if (qualityContract.case_requirements?.require_refusal_cases && matches.length === 0) {
      errors.push({
        severity: "error",
        field: `quality_contract.prohibited_behaviors.${behavior.id}`,
        message: "No refusal/block case maps to this prohibited behavior",
      });
    }
    prohibitedBehaviorCoverage.push({
      id: behavior.id,
      severity: behavior.severity,
      refuse_or_block: behavior.refuse_or_block,
      case_ids: matches.map((item) => item.id),
      case_count: matches.length,
    });
  }

  const totalCases = classified.length;
  const negativeCases = classified.filter((item) => item.is_negative).length;
  const semanticCases = classified.filter((item) => item.has_semantic).length;
  const toolSequenceCases = classified.filter((item) => item.has_tool_sequence).length;
  const refusalCases = classified.filter((item) => item.mapping.scenario_type === "refusal").length;
  const retryCases = classified.filter((item) => item.mapping.scenario_type === "retry").length;
  const handoffCases = classified.filter((item) => item.mapping.scenario_type === "handoff").length;
  const boundaryCases = classified.filter((item) => item.mapping.scenario_type === "boundary").length;

  const negativeRatio = totalCases > 0 ? Number((negativeCases / totalCases).toFixed(3)) : 0;
  const semanticRatio = totalCases > 0 ? Number((semanticCases / totalCases).toFixed(3)) : 0;
  const mappingCoverageRatio = totalCases > 0 ? Number((mappedCases.length / totalCases).toFixed(3)) : 0;

  if (totalCases < (qualityContract.case_requirements?.minimum_case_count ?? 0)) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.minimum_case_count",
      message: "Case suite does not meet the minimum case count",
      details: { required: qualityContract.case_requirements?.minimum_case_count, actual: totalCases },
    });
  }

  if (negativeRatio < (qualityContract.case_requirements?.minimum_negative_case_ratio ?? 0)) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.minimum_negative_case_ratio",
      message: "Case suite does not meet the minimum negative-case ratio",
      details: { required: qualityContract.case_requirements?.minimum_negative_case_ratio, actual: negativeRatio },
    });
  }

  if (semanticRatio < (qualityContract.case_requirements?.minimum_semantic_case_ratio ?? 0)) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.minimum_semantic_case_ratio",
      message: "Case suite does not meet the minimum semantic-case ratio",
      details: { required: qualityContract.case_requirements?.minimum_semantic_case_ratio, actual: semanticRatio },
    });
  }

  if (qualityContract.case_requirements?.require_boundary_cases && boundaryCases === 0) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.require_boundary_cases",
      message: "Boundary coverage is required but no boundary case is present",
    });
  }

  if (qualityContract.case_requirements?.require_refusal_cases && refusalCases === 0) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.require_refusal_cases",
      message: "Refusal coverage is required but no refusal case is present",
    });
  }

  if (qualityContract.case_requirements?.require_tool_sequence_cases && toolSequenceCases === 0) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.require_tool_sequence_cases",
      message: "Tool-sequence coverage is required but no case declares expected.tool_sequence",
    });
  }

  if (qualityContract.case_requirements?.require_retry_cases && retryCases === 0) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.require_retry_cases",
      message: "Retry coverage is required but no retry case is present",
    });
  }

  if (qualityContract.case_requirements?.require_handoff_cases && handoffCases === 0) {
    errors.push({
      severity: "error",
      field: "quality_contract.case_requirements.require_handoff_cases",
      message: "Handoff coverage is required but no handoff case is present",
    });
  }

  if (mappedCases.length === 0) {
    errors.push({
      severity: "error",
      field: "cases.metadata.intake_mapping",
      message: "No cases map back to the intake contract, so completeness cannot be checked",
    });
  } else if (unmappedCases.length > 0) {
    warnings.push({
      severity: "warning",
      field: "cases.metadata.intake_mapping",
      message: "Some cases are not mapped to the intake contract; coverage metrics may be incomplete",
      details: { case_ids_sample: unmappedCases.slice(0, 12).map((item) => item.id) },
    });
  }

  return {
    errors,
    warnings,
    summary: {
      total_cases: totalCases,
      mapped_cases: mappedCases.length,
      unmapped_cases: unmappedCases.length,
      mapping_coverage_ratio: mappingCoverageRatio,
      critical_task_count: (qualityContract.critical_tasks || []).length,
      covered_critical_tasks: (qualityContract.critical_tasks || []).filter((task) => (taskCases.get(task.id) || []).length > 0).length,
      risky_action_count: (qualityContract.risky_actions || []).length,
      covered_risky_actions: (qualityContract.risky_actions || []).filter((risk) => (riskCases.get(risk.id) || []).length > 0).length,
      prohibited_behavior_count: (qualityContract.prohibited_behaviors || []).length,
      covered_prohibited_behaviors: (qualityContract.prohibited_behaviors || []).filter((behavior) => (prohibitedCases.get(behavior.id) || []).length > 0).length,
      required_variant_count: requiredVariantCount,
      covered_required_variants: coveredVariantCount,
      negative_case_ratio: negativeRatio,
      semantic_case_ratio: semanticRatio,
      tool_sequence_case_count: toolSequenceCases,
      boundary_case_count: boundaryCases,
      refusal_case_count: refusalCases,
      retry_case_count: retryCases,
      handoff_case_count: handoffCases,
    },
    coverage: {
      case_index: classified.map((item) => ({
        case_id: item.id,
        source_type: item.mapping.source_type,
        source_id: item.mapping.source_id,
        scenario_type: item.mapping.scenario_type,
        expected_gate: item.mapping.expected_gate,
        requires_human_review: item.mapping.requires_human_review,
        is_negative: item.is_negative,
        has_semantic: item.has_semantic,
        has_tool_sequence: item.has_tool_sequence,
        has_assumption_state: item.has_assumption_state,
      })),
      critical_tasks: criticalTaskCoverage,
      risky_actions: riskyActionCoverage,
      prohibited_behaviors: prohibitedBehaviorCoverage,
      unmapped_case_ids: unmappedCases.map((item) => item.id),
      suite_requirements: {
        minimum_case_count: qualityContract.case_requirements?.minimum_case_count ?? 0,
        minimum_negative_case_ratio: qualityContract.case_requirements?.minimum_negative_case_ratio ?? 0,
        minimum_semantic_case_ratio: qualityContract.case_requirements?.minimum_semantic_case_ratio ?? 0,
        require_boundary_cases: Boolean(qualityContract.case_requirements?.require_boundary_cases),
        require_refusal_cases: Boolean(qualityContract.case_requirements?.require_refusal_cases),
        require_tool_sequence_cases: Boolean(qualityContract.case_requirements?.require_tool_sequence_cases),
        require_retry_cases: Boolean(qualityContract.case_requirements?.require_retry_cases),
        require_handoff_cases: Boolean(qualityContract.case_requirements?.require_handoff_cases),
      },
    },
  };
}

export function buildCasesCoverageArtifact({ intakeDir, paths, systemScope, qualityContract, casesAbs, outAbs, completeness }) {
  return {
    schema_version: 1,
    artifact_type: "intake_cases_coverage",
    generated_at: Date.now(),
    ok: completeness.errors.length === 0,
    intake_dir: intakeDir,
    files: {
      system_scope_href: relFrom(intakeDir, paths.system_scope),
      quality_contract_href: relFrom(intakeDir, paths.quality_contract),
      cases_href: relFrom(intakeDir, casesAbs),
      artifact_href: relFrom(intakeDir, outAbs),
    },
    summary: {
      profile_id: systemScope.profile_id,
      system_id: systemScope.system_id,
      ...completeness.summary,
    },
    human_owned_boundary: {
      field_count: HUMAN_OWNED_FIELDS.length,
      fields: HUMAN_OWNED_FIELDS,
    },
    case_requirements: qualityContract.case_requirements || { ...DEFAULT_CASE_REQUIREMENTS },
    coverage: completeness.coverage,
    errors: completeness.errors,
    warnings: completeness.warnings,
  };
}

export function buildIntakeSummary({ intakeDir, paths, systemScope, qualityContract, errors = [], warnings = [] }) {
  return {
    ok: errors.length === 0,
    intake_dir: intakeDir,
    files: {
      system_scope_href: relFrom(intakeDir, paths.system_scope),
      quality_contract_href: relFrom(intakeDir, paths.quality_contract),
    },
    summary: {
      profile_id: systemScope.profile_id,
      system_id: systemScope.system_id,
      critical_task_count: Array.isArray(qualityContract.critical_tasks) ? qualityContract.critical_tasks.length : 0,
      prohibited_behavior_count: Array.isArray(qualityContract.prohibited_behaviors)
        ? qualityContract.prohibited_behaviors.length
        : 0,
      risky_action_count: Array.isArray(qualityContract.risky_actions) ? qualityContract.risky_actions.length : 0,
      in_scope_tool_count: Array.isArray(systemScope?.tools?.in_scope) ? uniqueStrings(systemScope.tools.in_scope).length : 0,
      target_market_count: Array.isArray(systemScope?.deployment_context?.target_markets)
        ? uniqueStrings(systemScope.deployment_context.target_markets).length
        : 0,
    },
    human_owned_requirements: HUMAN_OWNED_FIELDS,
    errors,
    warnings,
  };
}
