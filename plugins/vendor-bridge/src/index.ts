export type BridgeVendor = "promptfoo" | "deepeval" | "giskard";

export type BridgeRiskLevel = "low" | "medium" | "high";
export type BridgeGateRecommendation = "none" | "require_approval" | "block";

export type BridgeAssertion = {
  name: string;
  pass: boolean;
  score?: number;
  threshold?: number;
  reason?: string;
};

export type BridgeCaseRecord = {
  case_id: string;
  title: string;
  pass: boolean;
  input?: string;
  output?: string;
  expected?: string;
  assertions: BridgeAssertion[];
  weak_expected: boolean;
  gate_recommendation: BridgeGateRecommendation;
  risk_level: BridgeRiskLevel;
  metadata?: Record<string, unknown>;
};

export type BridgeRunStats = {
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  weak_expected_cases: number;
  pass_rate: number;
};

export type BridgeRun = {
  vendor: BridgeVendor;
  run_id: string;
  created_at: number;
  cases: BridgeCaseRecord[];
  stats: BridgeRunStats;
  source_meta?: Record<string, unknown>;
};

export type BridgeDiffStatus =
  | "regression"
  | "improvement"
  | "unchanged_pass"
  | "unchanged_fail"
  | "missing_new_case"
  | "new_case";

export type BridgeDiffItem = {
  case_id: string;
  status: BridgeDiffStatus;
  baseline_pass: boolean | null;
  candidate_pass: boolean | null;
  gate_recommendation: BridgeGateRecommendation;
  risk_level: BridgeRiskLevel;
  weak_expected: boolean;
};

export type BridgeDiffSummary = {
  total_cases: number;
  regressions: number;
  improvements: number;
  unchanged_pass: number;
  unchanged_fail: number;
  missing_new_cases: number;
  new_cases: number;
  block_cases: number;
  require_approval_cases: number;
  none_cases: number;
  baseline_pass_rate: number;
  candidate_pass_rate: number;
};

export type BridgeDiffReport = {
  run_id: string;
  baseline_run_id: string;
  candidate_run_id: string;
  created_at: number;
  vendor_pair: {
    baseline: BridgeVendor;
    candidate: BridgeVendor;
  };
  summary: BridgeDiffSummary;
  items: BridgeDiffItem[];
};

export type VendorParseOptions = {
  runId?: string;
  createdAtMs?: number;
  defaultCasePrefix?: string;
  sourceMeta?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = asString(obj[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = asNumber(obj[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function pickBoolean(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = asBoolean(obj[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function toPrintable(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value === undefined) return undefined;
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value) || isRecord(value)) {
    return JSON.stringify(value);
  }
  return undefined;
}

function normalizeCaseId(input: string | undefined, prefix: string, index: number): string {
  if (!input) return `${prefix}_${index + 1}`;
  return input.replace(/\s+/g, "_").toLowerCase();
}

function deriveRiskLevelFromSeverity(raw: string | undefined): BridgeRiskLevel {
  const normalized = raw?.toLowerCase();
  if (!normalized) return "low";
  if (normalized.includes("critical") || normalized.includes("high")) return "high";
  if (normalized.includes("medium") || normalized.includes("moderate")) return "medium";
  return "low";
}

const WEAK_ASSERTION_HINTS = [
  "contains",
  "similar",
  "similarity",
  "fuzzy",
  "regex",
  "substring",
  "keyword",
  "semantic",
  "llm-rubric",
  "rubric",
  "judge",
];

function isWeakAssertionName(name: string): boolean {
  const lower = name.toLowerCase();
  return WEAK_ASSERTION_HINTS.some((hint) => lower.includes(hint));
}

function computeWeakExpected(assertions: BridgeAssertion[]): boolean {
  if (assertions.length === 0) return true;
  return assertions.every((assertion) => isWeakAssertionName(assertion.name));
}

function deriveGate(pass: boolean, riskLevel: BridgeRiskLevel, weakExpected: boolean): BridgeGateRecommendation {
  if (!pass) return "block";
  if (riskLevel === "high") return "require_approval";
  if (weakExpected) return "require_approval";
  return "none";
}

function toRunStats(cases: BridgeCaseRecord[]): BridgeRunStats {
  const totalCases = cases.length;
  const passedCases = cases.filter((row) => row.pass).length;
  const weakExpectedCases = cases.filter((row) => row.weak_expected).length;
  const failedCases = totalCases - passedCases;
  return {
    total_cases: totalCases,
    passed_cases: passedCases,
    failed_cases: failedCases,
    weak_expected_cases: weakExpectedCases,
    pass_rate: totalCases > 0 ? passedCases / totalCases : 0,
  };
}

function buildRun(vendor: BridgeVendor, cases: BridgeCaseRecord[], options: VendorParseOptions): BridgeRun {
  const createdAt = options.createdAtMs ?? Date.now();
  const runId = options.runId ?? `${vendor}_${createdAt}`;
  return {
    vendor,
    run_id: runId,
    created_at: createdAt,
    cases,
    stats: toRunStats(cases),
    ...(options.sourceMeta ? { source_meta: options.sourceMeta } : {}),
  };
}

function parseAssertionRows(rows: unknown[]): BridgeAssertion[] {
  return rows
    .map((row, index) => {
      const record = asRecord(row);
      const nestedAssertion = asRecord(record.assertion);
      const name =
        pickString(record, ["name", "metric", "metric_name", "type", "assertion_type"]) ??
        pickString(nestedAssertion, ["name", "metric", "type"]) ??
        `assertion_${index + 1}`;
      const pass =
        pickBoolean(record, ["pass", "passed", "success", "ok"]) ??
        pickBoolean(asRecord(record.result), ["pass", "passed", "success"]) ??
        false;

      const score =
        pickNumber(record, ["score", "value"]) ??
        pickNumber(asRecord(record.result), ["score", "value"]);

      const threshold =
        pickNumber(record, ["threshold", "min_score", "target"]) ??
        pickNumber(asRecord(record.result), ["threshold", "target"]);

      const reason =
        pickString(record, ["reason", "message", "explanation"]) ??
        pickString(asRecord(record.result), ["reason", "message", "explanation"]);

      return {
        name,
        pass,
        ...(score !== undefined ? { score } : {}),
        ...(threshold !== undefined ? { threshold } : {}),
        ...(reason ? { reason } : {}),
      };
    })
    .filter((assertion) => assertion.name.length > 0);
}

function firstArrayCandidate(payload: unknown, paths: string[][]): unknown[] {
  const root = asRecord(payload);
  for (const path of paths) {
    let cursor: unknown = root;
    let valid = true;
    for (const key of path) {
      if (!isRecord(cursor)) {
        valid = false;
        break;
      }
      cursor = cursor[key];
    }
    if (!valid) continue;
    const arr = asArray(cursor);
    if (arr.length > 0) return arr;
  }
  return Array.isArray(payload) ? payload : [];
}

export function parsePromptfooRun(payload: unknown, options: VendorParseOptions = {}): BridgeRun {
  const rows = firstArrayCandidate(payload, [["results"], ["outputs"], ["table", "results"], ["eval", "results"]]);
  if (rows.length === 0) {
    throw new Error("promptfoo payload has no result rows");
  }

  const prefix = options.defaultCasePrefix ?? "promptfoo_case";

  const mappedCases = rows.map((row, index) => {
    const record = asRecord(row);
    const testCase = asRecord(record.testCase);
    const gradingResult = asRecord(record.gradingResult);

    const assertions = parseAssertionRows(
      asArray(record.assertionResults).length > 0
        ? asArray(record.assertionResults)
        : asArray(record.assertions).length > 0
          ? asArray(record.assertions)
          : asArray(gradingResult.assertions)
    );

    const explicitPass = pickBoolean(record, ["pass", "passed", "success"]);
    const gradingPass = pickBoolean(gradingResult, ["pass", "passed", "success"]);
    const pass = explicitPass ?? gradingPass ?? (assertions.length > 0 ? assertions.every((entry) => entry.pass) : false);

    const caseId = normalizeCaseId(
      pickString(record, ["id", "case_id", "caseId"]) ?? pickString(testCase, ["id", "name"]),
      prefix,
      index
    );

    const title =
      pickString(testCase, ["description", "name"]) ?? pickString(record, ["description", "name"]) ?? caseId;

    const input =
      toPrintable(asRecord(record.prompt).raw) ??
      toPrintable(record.prompt) ??
      toPrintable(testCase.vars) ??
      toPrintable(record.vars);

    const output = toPrintable(asRecord(record.response).output) ?? toPrintable(record.output);
    const expected = toPrintable(testCase.expectedOutput) ?? toPrintable(testCase.expected);

    const riskLevel = deriveRiskLevelFromSeverity(
      pickString(record, ["severity", "risk_level", "riskLevel"]) ?? pickString(gradingResult, ["severity"])
    );

    const weakExpected = computeWeakExpected(assertions);

    return {
      case_id: caseId,
      title,
      pass,
      ...(input ? { input } : {}),
      ...(output ? { output } : {}),
      ...(expected ? { expected } : {}),
      assertions,
      weak_expected: weakExpected,
      gate_recommendation: deriveGate(pass, riskLevel, weakExpected),
      risk_level: riskLevel,
      metadata: {
        vendor_index: index,
      },
    } satisfies BridgeCaseRecord;
  });

  return buildRun("promptfoo", mappedCases, options);
}

function parseDeepEvalMetrics(value: unknown): BridgeAssertion[] {
  if (Array.isArray(value)) {
    return parseAssertionRows(value);
  }

  if (!isRecord(value)) return [];

  return Object.entries(value).map(([name, metric]) => {
    const record = asRecord(metric);
    const score = pickNumber(record, ["score", "value"]);
    const threshold = pickNumber(record, ["threshold", "min_score", "target"]);
    const pass =
      pickBoolean(record, ["success", "passed", "pass", "ok"]) ??
      (score !== undefined && threshold !== undefined ? score >= threshold : false);
    const reason = pickString(record, ["reason", "explanation", "message"]);

    return {
      name,
      pass,
      ...(score !== undefined ? { score } : {}),
      ...(threshold !== undefined ? { threshold } : {}),
      ...(reason ? { reason } : {}),
    };
  });
}

export function parseDeepEvalRun(payload: unknown, options: VendorParseOptions = {}): BridgeRun {
  const rows = firstArrayCandidate(payload, [["test_results"], ["testResults"], ["results"], ["runs"]]);
  if (rows.length === 0) {
    throw new Error("deepeval payload has no result rows");
  }

  const prefix = options.defaultCasePrefix ?? "deepeval_case";

  const mappedCases = rows.map((row, index) => {
    const record = asRecord(row);
    const testCase = asRecord(record.test_case);
    const metrics = parseDeepEvalMetrics(record.metrics);

    const explicitPass = pickBoolean(record, ["success", "passed", "pass"]);
    const metricPass = metrics.length > 0 ? metrics.every((entry) => entry.pass) : undefined;
    const pass = explicitPass ?? metricPass ?? false;

    const caseId = normalizeCaseId(
      pickString(record, ["name", "case_id", "id"]) ?? pickString(testCase, ["name", "id"]),
      prefix,
      index
    );

    const title = pickString(record, ["description", "name"]) ?? pickString(testCase, ["description"]) ?? caseId;

    const input =
      toPrintable(record.input) ??
      toPrintable(testCase.input) ??
      toPrintable(record.prompt) ??
      toPrintable(asRecord(record.context).input);

    const output = toPrintable(record.actual_output) ?? toPrintable(record.output);
    const expected = toPrintable(record.expected_output) ?? toPrintable(testCase.expected_output);

    const riskLevel = deriveRiskLevelFromSeverity(
      pickString(record, ["severity", "risk_level", "riskLevel"]) ?? pickString(testCase, ["severity"])
    );

    const weakExpected = computeWeakExpected(metrics);

    return {
      case_id: caseId,
      title,
      pass,
      ...(input ? { input } : {}),
      ...(output ? { output } : {}),
      ...(expected ? { expected } : {}),
      assertions: metrics,
      weak_expected: weakExpected,
      gate_recommendation: deriveGate(pass, riskLevel, weakExpected),
      risk_level: riskLevel,
      metadata: {
        vendor_index: index,
      },
    } satisfies BridgeCaseRecord;
  });

  return buildRun("deepeval", mappedCases, options);
}

function parseGiskardRows(payload: unknown): unknown[] {
  const rows = firstArrayCandidate(payload, [["test_results"], ["tests"], ["results"]]);
  if (rows.length > 0) return rows;

  const issues = firstArrayCandidate(payload, [["issues"], ["findings"], ["vulnerabilities"]]);
  if (issues.length > 0) return issues;

  return [];
}

export function parseGiskardRun(payload: unknown, options: VendorParseOptions = {}): BridgeRun {
  const rows = parseGiskardRows(payload);
  if (rows.length === 0) {
    throw new Error("giskard payload has no test or issue rows");
  }

  const prefix = options.defaultCasePrefix ?? "giskard_case";

  const mappedCases = rows.map((row, index) => {
    const record = asRecord(row);

    const assertions = parseAssertionRows(
      asArray(record.assertions).length > 0
        ? asArray(record.assertions)
        : asArray(record.checks).length > 0
          ? asArray(record.checks)
          : []
    );

    const explicitPass = pickBoolean(record, ["passed", "pass", "success"]);
    const statusPass = pickString(record, ["status"])?.toLowerCase() === "passed";
    const pass = explicitPass ?? (statusPass ? true : assertions.length > 0 ? assertions.every((entry) => entry.pass) : false);

    const caseId = normalizeCaseId(pickString(record, ["id", "name", "test_id"]), prefix, index);
    const title = pickString(record, ["description", "name", "title"]) ?? caseId;

    const input = toPrintable(record.input) ?? toPrintable(record.question) ?? toPrintable(record.prompt);
    const output = toPrintable(record.actual_output) ?? toPrintable(record.output) ?? toPrintable(record.details);
    const expected = toPrintable(record.expected_output) ?? toPrintable(record.expected);

    const riskLevel = deriveRiskLevelFromSeverity(pickString(record, ["severity", "risk_level", "riskLevel"]));
    const weakExpected = computeWeakExpected(assertions);

    return {
      case_id: caseId,
      title,
      pass,
      ...(input ? { input } : {}),
      ...(output ? { output } : {}),
      ...(expected ? { expected } : {}),
      assertions,
      weak_expected: weakExpected,
      gate_recommendation: deriveGate(pass, riskLevel, weakExpected),
      risk_level: riskLevel,
      metadata: {
        vendor_index: index,
      },
    } satisfies BridgeCaseRecord;
  });

  return buildRun("giskard", mappedCases, options);
}

function indexByCaseId(cases: BridgeCaseRecord[]): Map<string, BridgeCaseRecord> {
  return new Map(cases.map((entry) => [entry.case_id, entry]));
}

function gateCounts(items: BridgeDiffItem[]): Pick<BridgeDiffSummary, "block_cases" | "require_approval_cases" | "none_cases"> {
  const blockCases = items.filter((item) => item.gate_recommendation === "block").length;
  const approvalCases = items.filter((item) => item.gate_recommendation === "require_approval").length;
  return {
    block_cases: blockCases,
    require_approval_cases: approvalCases,
    none_cases: items.length - blockCases - approvalCases,
  };
}

function candidateGateForDiff(item: {
  status: BridgeDiffStatus;
  candidate: BridgeCaseRecord | undefined;
}): BridgeGateRecommendation {
  if (item.status === "missing_new_case") return "block";
  if (!item.candidate) return "require_approval";
  return deriveGate(item.candidate.pass, item.candidate.risk_level, item.candidate.weak_expected);
}

export function compareBridgeRuns(params: {
  baseline: BridgeRun;
  candidate: BridgeRun;
  runId?: string;
  createdAtMs?: number;
}): BridgeDiffReport {
  const baselineMap = indexByCaseId(params.baseline.cases);
  const candidateMap = indexByCaseId(params.candidate.cases);
  const caseIds = Array.from(new Set([...baselineMap.keys(), ...candidateMap.keys()])).sort();

  const items = caseIds.map((caseId) => {
    const baseline = baselineMap.get(caseId);
    const candidate = candidateMap.get(caseId);

    let status: BridgeDiffStatus;
    if (!baseline && candidate) {
      status = "new_case";
    } else if (baseline && !candidate) {
      status = "missing_new_case";
    } else if (baseline && candidate && baseline.pass && !candidate.pass) {
      status = "regression";
    } else if (baseline && candidate && !baseline.pass && candidate.pass) {
      status = "improvement";
    } else if (baseline && candidate && baseline.pass && candidate.pass) {
      status = "unchanged_pass";
    } else {
      status = "unchanged_fail";
    }

    const gate = candidateGateForDiff({ status, candidate });

    return {
      case_id: caseId,
      status,
      baseline_pass: baseline ? baseline.pass : null,
      candidate_pass: candidate ? candidate.pass : null,
      gate_recommendation: gate,
      risk_level: candidate?.risk_level ?? baseline?.risk_level ?? "low",
      weak_expected: candidate?.weak_expected ?? baseline?.weak_expected ?? true,
    } satisfies BridgeDiffItem;
  });

  const totalCases = items.length;
  const regressions = items.filter((item) => item.status === "regression").length;
  const improvements = items.filter((item) => item.status === "improvement").length;
  const unchangedPass = items.filter((item) => item.status === "unchanged_pass").length;
  const unchangedFail = items.filter((item) => item.status === "unchanged_fail").length;
  const missingNewCases = items.filter((item) => item.status === "missing_new_case").length;
  const newCases = items.filter((item) => item.status === "new_case").length;

  const gateSummary = gateCounts(items);

  const baselinePassRate = params.baseline.stats.pass_rate;
  const candidatePassRate = params.candidate.stats.pass_rate;

  return {
    run_id: params.runId ?? `${params.baseline.run_id}_vs_${params.candidate.run_id}`,
    baseline_run_id: params.baseline.run_id,
    candidate_run_id: params.candidate.run_id,
    created_at: params.createdAtMs ?? Date.now(),
    vendor_pair: {
      baseline: params.baseline.vendor,
      candidate: params.candidate.vendor,
    },
    summary: {
      total_cases: totalCases,
      regressions,
      improvements,
      unchanged_pass: unchangedPass,
      unchanged_fail: unchangedFail,
      missing_new_cases: missingNewCases,
      new_cases: newCases,
      ...gateSummary,
      baseline_pass_rate: baselinePassRate,
      candidate_pass_rate: candidatePassRate,
    },
    items,
  };
}

export const __test__ = {
  computeWeakExpected,
  deriveGate,
  parseAssertionRows,
};
