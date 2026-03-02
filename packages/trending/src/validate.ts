import type { CompareReport } from "./reportTypes";
import type { ValidationError, ValidationResult } from "./types";

const RISK_LEVELS = new Set(["low", "medium", "high"]);
const GATE_RECS = new Set(["none", "require_approval", "block"]);
const CASE_STATUSES = new Set(["executed", "missing", "broken", "manual_unknown", "filtered_out"]);

export function validateReportForIngest(data: unknown): ValidationResult<CompareReport> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: [{ field: "root", message: "not an object" }], warnings };
  }
  const r = data as Record<string, unknown>;

  if (typeof r.report_id !== "string" || !r.report_id) {
    errors.push({ field: "report_id", message: "missing or empty" });
  }

  if (typeof r.contract_version === "number" && r.contract_version < 4) {
    warnings.push(`contract_version=${r.contract_version} < 4, some fields may be absent.`);
  }

  if (typeof r.meta !== "object" || r.meta === null) {
    errors.push({ field: "meta", message: "missing" });
  } else {
    const m = r.meta as Record<string, unknown>;
    if (typeof m.generated_at !== "number") {
      errors.push({ field: "meta.generated_at", message: "required, must be number" });
    }
    if (typeof m.toolkit_version !== "string") {
      errors.push({ field: "meta.toolkit_version", message: "required" });
    }
    if (typeof m.spec_version !== "string") {
      errors.push({ field: "meta.spec_version", message: "required" });
    }
    if (typeof m.run_id !== "string") {
      if (typeof r.report_id === "string") {
        warnings.push("meta.run_id missing, will use report_id as run_id.");
      } else {
        errors.push({ field: "meta.run_id", message: "missing and no report_id fallback" });
      }
    }
  }

  if (typeof r.summary !== "object" || r.summary === null) {
    errors.push({ field: "summary", message: "missing" });
  } else {
    const s = r.summary as Record<string, unknown>;
    for (const f of ["baseline_pass", "new_pass", "regressions", "improvements"]) {
      if (typeof s[f] !== "number") {
        errors.push({ field: `summary.${f}`, message: "required, must be number" });
      }
    }
    const dc = s.data_coverage as Record<string, unknown> | undefined;
    if (!dc || typeof dc.total_cases !== "number") {
      warnings.push("summary.data_coverage.total_cases missing, will use items.length.");
    }
  }

  if (!Array.isArray(r.items)) {
    errors.push({ field: "items", message: "missing or not array" });
  } else {
    for (let i = 0; i < r.items.length; i++) {
      const it = r.items[i] as Record<string, unknown> | undefined;
      if (!it || typeof it !== "object") {
        errors.push({ field: `items[${i}]`, message: "not an object" });
        continue;
      }
      if (typeof it.case_id !== "string") {
        errors.push({ field: `items[${i}].case_id`, message: "required" });
      }
      const bp = it.baseline_pass as unknown;
      if (typeof bp !== "boolean" && bp !== null) {
        errors.push({ field: `items[${i}].baseline_pass`, message: "required boolean or null" });
      } else if (bp === null) {
        warnings.push(`items[${i}].baseline_pass is null; treated as non-executed.`);
      }
      const np = it.new_pass as unknown;
      if (typeof np !== "boolean" && np !== null) {
        errors.push({ field: `items[${i}].new_pass`, message: "required boolean or null" });
      } else if (np === null) {
        warnings.push(`items[${i}].new_pass is null; treated as non-executed.`);
      }
      const risk = it.risk_level;
      if (typeof risk !== "string") {
        errors.push({ field: `items[${i}].risk_level`, message: "required" });
      } else if (!RISK_LEVELS.has(risk.toLowerCase().trim())) {
        errors.push({ field: `items[${i}].risk_level`, message: `invalid: "${risk}"` });
      }
      const gate = it.gate_recommendation;
      if (typeof gate !== "string") {
        errors.push({ field: `items[${i}].gate_recommendation`, message: "required" });
      } else if (!GATE_RECS.has(gate.toLowerCase().trim())) {
        errors.push({ field: `items[${i}].gate_recommendation`, message: `invalid: "${gate}"` });
      }
      const cs = it.case_status;
      if (typeof cs === "string") {
        const norm = cs.toLowerCase().trim();
        if (!CASE_STATUSES.has(norm)) {
          warnings.push(`items[${i}].case_status invalid: "${cs}" → manual_unknown`);
        }
      }
    }
  }

  const valid = errors.length === 0;
  const result: ValidationResult<CompareReport> = { valid, errors, warnings };
  if (valid) {
    result.report = data as CompareReport;
  }
  return result;
}
