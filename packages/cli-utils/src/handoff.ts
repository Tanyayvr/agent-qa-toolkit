import { createHash } from "node:crypto";
import type { HandoffEnvelope, RunMeta } from "shared-types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toNonEmptyString(v: unknown, field: string): string {
  if (typeof v !== "string") {
    throw new Error(`Invalid ${field}: expected non-empty string`);
  }
  const s = v.trim();
  if (!s) {
    throw new Error(`Invalid ${field}: expected non-empty string`);
  }
  if (/[\r\n]/.test(s)) {
    throw new Error(`Invalid ${field}: must be single-line`);
  }
  if (s.length > 256) {
    throw new Error(`Invalid ${field}: too long (max 256)`);
  }
  return s;
}

function toOptionalString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
}

function toOptionalRecord(v: unknown): Record<string, unknown> | undefined {
  return isRecord(v) ? v : undefined;
}

function toOptionalStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return out.length > 0 ? out : undefined;
}

type JsonLike = null | boolean | number | string | JsonLike[] | { [k: string]: JsonLike };

/** Deterministic JSON serialization with lexicographically sorted keys. */
export function stableStringify(value: unknown): string {
  const normalize = (v: unknown): JsonLike => {
    if (v === null) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.map((x) => normalize(x));
    if (isRecord(v)) {
      const keys = Object.keys(v).sort((a, b) => a.localeCompare(b));
      const obj: { [k: string]: JsonLike } = {};
      for (const k of keys) obj[k] = normalize(v[k]);
      return obj;
    }
    return String(v);
  };
  return JSON.stringify(normalize(value));
}

function withoutChecksum(envelope: HandoffEnvelope): Omit<HandoffEnvelope, "checksum"> {
  // Keep explicit field order for readability; stableStringify handles deterministic keys.
  return {
    incident_id: envelope.incident_id,
    handoff_id: envelope.handoff_id,
    from_agent_id: envelope.from_agent_id,
    to_agent_id: envelope.to_agent_id,
    objective: envelope.objective,
    ...(envelope.constraints ? { constraints: envelope.constraints } : {}),
    ...(envelope.decision_thresholds ? { decision_thresholds: envelope.decision_thresholds } : {}),
    ...(envelope.state_delta ? { state_delta: envelope.state_delta } : {}),
    ...(envelope.tool_result_refs ? { tool_result_refs: envelope.tool_result_refs } : {}),
    ...(envelope.retrieval_refs ? { retrieval_refs: envelope.retrieval_refs } : {}),
    ...(envelope.trace_anchor ? { trace_anchor: envelope.trace_anchor } : {}),
    ...(envelope.parent_handoff_id ? { parent_handoff_id: envelope.parent_handoff_id } : {}),
    schema_version: envelope.schema_version,
    created_at: envelope.created_at,
  };
}

/** sha256 over canonical envelope payload without checksum. */
export function computeHandoffChecksum(envelope: HandoffEnvelope): string {
  const canonical = stableStringify(withoutChecksum(envelope));
  return createHash("sha256").update(canonical).digest("hex");
}

export function normalizeRunMeta(raw: unknown): RunMeta | undefined {
  if (!isRecord(raw)) return undefined;
  const run_id = toOptionalString(raw.run_id);
  const incident_id = toOptionalString(raw.incident_id);
  const agent_id = toOptionalString(raw.agent_id);
  const parent_run_id = toOptionalString(raw.parent_run_id);
  if (!run_id && !incident_id && !agent_id && !parent_run_id) return undefined;
  return {
    ...(run_id ? { run_id } : {}),
    ...(incident_id ? { incident_id } : {}),
    ...(agent_id ? { agent_id } : {}),
    ...(parent_run_id ? { parent_run_id } : {}),
  };
}

/** Validates and normalizes runtime handoff payload.
 *  - Fills defaults for `schema_version` and `created_at`.
 *  - Computes checksum when absent.
 *  - Verifies checksum when provided. */
export function validateAndNormalizeHandoffEnvelope(raw: unknown, nowMs: number = Date.now()): HandoffEnvelope {
  if (!isRecord(raw)) {
    throw new Error("Invalid handoff payload: expected object");
  }

  const incident_id = toNonEmptyString(raw.incident_id, "incident_id");
  const handoff_id = toNonEmptyString(raw.handoff_id, "handoff_id");
  const from_agent_id = toNonEmptyString(raw.from_agent_id, "from_agent_id");
  const to_agent_id = toNonEmptyString(raw.to_agent_id, "to_agent_id");
  const objective = toNonEmptyString(raw.objective, "objective");

  const schema_version = toOptionalString(raw.schema_version) ?? "1.0.0";
  const created_at =
    typeof raw.created_at === "number" && Number.isFinite(raw.created_at) && raw.created_at > 0
      ? Math.floor(raw.created_at)
      : nowMs;
  const constraints = toOptionalRecord(raw.constraints);
  const decision_thresholds = toOptionalRecord(raw.decision_thresholds);
  const state_delta = toOptionalRecord(raw.state_delta);
  const tool_result_refs = toOptionalStringArray(raw.tool_result_refs);
  const retrieval_refs = toOptionalStringArray(raw.retrieval_refs);
  const trace_anchor = toOptionalRecord(raw.trace_anchor) as HandoffEnvelope["trace_anchor"] | undefined;
  const parent_handoff_id = toOptionalString(raw.parent_handoff_id);

  const envelope: HandoffEnvelope = {
    incident_id,
    handoff_id,
    from_agent_id,
    to_agent_id,
    objective,
    ...(constraints ? { constraints } : {}),
    ...(decision_thresholds ? { decision_thresholds } : {}),
    ...(state_delta ? { state_delta } : {}),
    ...(tool_result_refs ? { tool_result_refs } : {}),
    ...(retrieval_refs ? { retrieval_refs } : {}),
    ...(trace_anchor ? { trace_anchor } : {}),
    ...(parent_handoff_id ? { parent_handoff_id } : {}),
    schema_version,
    created_at,
    checksum: "",
  };

  const computed = computeHandoffChecksum(envelope);
  const provided = toOptionalString(raw.checksum);
  if (provided && provided !== computed) {
    throw new Error(`Invalid handoff checksum: expected ${computed} got ${provided}`);
  }
  envelope.checksum = provided ?? computed;
  return envelope;
}
