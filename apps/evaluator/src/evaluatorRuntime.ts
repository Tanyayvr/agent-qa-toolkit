import path from "node:path";
import { stat } from "node:fs/promises";
import {
  extractTraceAnchorFromEvents,
  normalizeTraceAnchorShape,
} from "cli-utils";
import type {
  AgentResponse,
  TraceAnchor,
} from "shared-types";
import type { AgentResponse as ReplayAgentResponse } from "./replayDiff";
import type { QualityFlags } from "./htmlReport";
import type {
  Case,
  CaseStatus,
  DataAvailabilitySide,
  Expected,
} from "./core";
import {
  FileTooLargeError,
  fileExistsAbs,
  isAbsoluteOrBadHref,
  normRel,
  readUtf8WithLimit,
} from "./evaluatorIo";

export function extractCaseTs(resp?: AgentResponse): number | undefined {
  const ev = resp?.events;
  if (!Array.isArray(ev) || ev.length === 0) return undefined;
  let ts: number | undefined;
  for (const e of ev) {
    const t = (e as { ts?: number }).ts;
    if (typeof t === "number" && (ts === undefined || t < ts)) ts = t;
  }
  return ts;
}

export function extractTraceAnchor(resp?: AgentResponse): TraceAnchor | undefined {
  if (!resp) return undefined;
  const fromBody = normalizeTraceAnchorShape((resp as AgentResponse).trace_anchor);
  if (fromBody) return fromBody;
  return extractTraceAnchorFromEvents(resp.events);
}

export function deriveCaseStatus(selected: boolean, hasAnyResp: boolean): { status: CaseStatus; reason?: string } {
  if (!selected) return { status: "filtered_out", reason: "excluded_by_filter" };
  if (!hasAnyResp) return { status: "missing", reason: "missing_case_response" };
  return { status: "executed" };
}

export async function readCases(casesPath: string, maxCaseBytes: number): Promise<Case[]> {
  const raw = await readUtf8WithLimit(casesPath, maxCaseBytes);
  const arr: unknown = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("cases.json must be an array");

  return arr.map((x) => {
    const obj = x as Record<string, unknown>;
    const input = (obj.input ?? {}) as Record<string, unknown>;
    const suite = typeof obj.suite === "string" && obj.suite.length ? obj.suite : undefined;
    return {
      id: String(obj.id),
      title: String(obj.title ?? ""),
      ...(suite ? { suite } : {}),
      input: { user: String(input.user ?? ""), context: input.context },
      expected: (obj.expected ?? {}) as Expected,
    };
  });
}

export async function readRunDir(
  dir: string,
  maxCaseBytes: number,
  maxMetaBytes: number
): Promise<{
  byId: Record<string, AgentResponse>;
  meta: Record<string, unknown>;
  ids: string[];
  availability: Record<string, DataAvailabilitySide>;
}> {
  const runJsonAbs = path.join(dir, "run.json");
  const meta = JSON.parse(await readUtf8WithLimit(runJsonAbs, maxMetaBytes)) as Record<string, unknown>;
  const selected = meta.selected_case_ids;
  const ids = Array.isArray(selected) ? selected.map((x) => String(x)) : [];

  const byId: Record<string, AgentResponse> = {};
  const availability: Record<string, DataAvailabilitySide> = {};
  for (const id of ids) {
    const file = path.join(dir, `${id}.json`);
    try {
      const raw = await readUtf8WithLimit(file, maxCaseBytes);
      const v = JSON.parse(raw) as AgentResponse;
      byId[id] = v;
      availability[id] = { status: "present" };
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        availability[id] = {
          status: "broken",
          reason_code: "file_too_large",
          details: {
            bytes: err.sizeBytes,
            max_bytes: err.maxBytes,
            path: normRel(dir, err.filePath),
          },
        };
        continue;
      }
      let missing = false;
      try {
        const st = await stat(file);
        if (!st.isFile()) missing = true;
      } catch {
        missing = true;
      }
      if (missing) {
        availability[id] = { status: "missing", reason_code: "missing_file" };
      } else {
        availability[id] = {
          status: "broken",
          reason_code: "invalid_json",
          details: { error: err instanceof Error ? err.message : String(err) },
        };
      }
    }
  }

  return { byId, meta, ids, availability };
}

export function toReplayResponse(resp: AgentResponse): ReplayAgentResponse {
  const out: Record<string, unknown> = {
    case_id: resp.case_id,
    version: resp.version,
    final_output: resp.final_output,
    events: Array.isArray(resp.events) ? resp.events : [],
  };

  if (typeof resp.workflow_id === "string") out.workflow_id = resp.workflow_id;

  if (Array.isArray(resp.proposed_actions)) out.proposed_actions = resp.proposed_actions;

  if (resp.runner_failure && typeof resp.runner_failure === "object") out.runner_failure = resp.runner_failure;
  const traceAnchor = extractTraceAnchor(resp);
  if (traceAnchor) out.trace_anchor = traceAnchor;

  return out as ReplayAgentResponse;
}

export async function computeQualityFlags(
  reportDir: string,
  entries: Array<{ field: string; value: string; check_exists: boolean }>
): Promise<QualityFlags> {
  const missing_assets: string[] = [];
  const path_violations: string[] = [];
  const large_payloads: string[] = [];

  for (const e of entries) {
    if (!e.value) continue;

    if (isAbsoluteOrBadHref(e.value)) {
      path_violations.push(`${e.field}=${e.value}`);
      continue;
    }

    if (e.check_exists) {
      const abs = path.resolve(reportDir, e.value);
      const ok = await fileExistsAbs(abs);
      if (!ok) {
        missing_assets.push(`${e.field}=${e.value}`);
      }
    }
  }

  const self_contained = missing_assets.length === 0;
  const portable_paths = path_violations.length === 0;

  return {
    self_contained,
    portable_paths,
    missing_assets_count: missing_assets.length,
    path_violations_count: path_violations.length,
    large_payloads_count: large_payloads.length,
    missing_assets,
    path_violations,
    large_payloads,
  };
}
