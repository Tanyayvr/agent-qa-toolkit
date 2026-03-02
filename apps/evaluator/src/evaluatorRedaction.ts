import type { AgentResponse } from "shared-types";
import { findUnredactedMarkersSafe } from "./evaluatorIo";

export type RedactionStatus = "none" | "applied";

export type RedactionState = {
  status: RedactionStatus;
  presetId?: string;
  warnings: string[];
};

export function assessRedactionState(params: {
  baselineMeta: Record<string, unknown>;
  newMeta: Record<string, unknown>;
  processEnv?: NodeJS.ProcessEnv;
}): RedactionState {
  const processEnv = params.processEnv ?? process.env;
  const warnings: string[] = [];

  const baselineApplied = params.baselineMeta.redaction_applied === true;
  const newApplied = params.newMeta.redaction_applied === true;
  const baselinePreset =
    typeof params.baselineMeta.redaction_preset === "string"
      ? String(params.baselineMeta.redaction_preset)
      : null;
  const newPreset =
    typeof params.newMeta.redaction_preset === "string" ? String(params.newMeta.redaction_preset) : null;

  let status: RedactionStatus = "none";
  let presetId: string | undefined;

  if (baselineApplied || newApplied) {
    if (baselineApplied && newApplied) {
      status = "applied";
      if (baselinePreset && newPreset && baselinePreset !== newPreset) {
        warnings.push(`redaction_preset mismatch between baseline (${baselinePreset}) and new (${newPreset}).`);
        presetId = baselinePreset;
      } else {
        presetId = baselinePreset ?? newPreset ?? undefined;
      }
    } else {
      warnings.push("redaction_applied mismatch between baseline and new.");
      status = "none";
    }
  } else {
    // Backward-compatible fallback for older runner outputs.
    status = processEnv.REDACTION_STATUS === "applied" ? "applied" : "none";
    presetId = processEnv.REDACTION_PRESET_ID ?? undefined;
    if (processEnv.REDACTION_STATUS || processEnv.REDACTION_PRESET_ID) {
      warnings.push("redaction status derived from env vars (runner metadata missing).");
    }
  }

  const state: RedactionState = { status, warnings };
  if (presetId) state.presetId = presetId;
  return state;
}

export function verifyRedactionCoverage(params: {
  state: RedactionState;
  baselineById: Record<string, AgentResponse>;
  newById: Record<string, AgentResponse>;
}): {
  violations: number;
  samples: string[];
  warnings: string[];
} {
  const { state, baselineById, newById } = params;
  if (state.status !== "applied") {
    return { violations: 0, samples: [], warnings: [] };
  }

  const preset =
    state.presetId === "transferable_extended"
      ? "transferable_extended"
      : state.presetId === "transferable"
        ? "transferable"
        : "internal_only";

  const allResponses = [...Object.values(baselineById), ...Object.values(newById)];
  const samples: string[] = [];
  let violations = 0;

  for (const resp of allResponses) {
    const text = JSON.stringify(resp);
    const hits = findUnredactedMarkersSafe(text, preset);
    if (!hits.length) continue;
    violations += 1;
    if (samples.length < 20) {
      samples.push(`${resp.case_id} (${hits.join(",")})`);
    }
  }

  const warnings: string[] = [];
  if (violations > 0) {
    warnings.push(
      `redaction_check_failed: ${violations} case(s) contain unredacted markers. samples: ${samples.join("; ")}`
    );
  }

  return { violations, samples, warnings };
}
