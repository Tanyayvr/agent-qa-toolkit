export type ManifestDraftItem = {
  manifest_key: string;
  rel_path: string;
  media_type: string;
};

export type ManifestItem = ManifestDraftItem & {
  bytes: number;
  sha256: string;
};

export type Manifest = {
  manifest_version: "v1";
  generated_at: number;
  items: ManifestItem[];
};

export type ThinIndex = {
  manifest_version: "v1";
  generated_at: number;
  source_manifest_sha256: string;
  items: Array<Pick<ManifestItem, "manifest_key" | "rel_path" | "media_type">>;
};

export function manifestKeyFor(params: { caseId: string; version: "baseline" | "new"; kind: string }): string {
  return `${params.caseId}/${params.version}/${params.kind}`;
}

function sanitizeManifestFragment(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "item";
}

export function manifestItemForFailure(params: {
  caseId: string;
  version: "baseline" | "new";
  rel_path: string;
  media_type: string;
}): ManifestDraftItem {
  return {
    manifest_key: manifestKeyFor({ caseId: params.caseId, version: params.version, kind: "runner_failure" }),
    rel_path: params.rel_path,
    media_type: params.media_type,
  };
}

export function manifestItemForCaseResponse(params: {
  caseId: string;
  version: "baseline" | "new";
  rel_path: string;
}): ManifestDraftItem {
  return {
    manifest_key: manifestKeyFor({ caseId: params.caseId, version: params.version, kind: "case_response" }),
    rel_path: params.rel_path,
    media_type: "application/json",
  };
}

export function manifestItemForFinalOutput(params: {
  caseId: string;
  version: "baseline" | "new";
  rel_path: string;
  media_type: string;
}): ManifestDraftItem {
  return {
    manifest_key: manifestKeyFor({ caseId: params.caseId, version: params.version, kind: "final_output" }),
    rel_path: params.rel_path,
    media_type: params.media_type,
  };
}

export function manifestItemForTraceAnchor(params: {
  caseId: string;
  version: "baseline" | "new";
  rel_path: string;
}): ManifestDraftItem {
  return {
    manifest_key: manifestKeyFor({ caseId: params.caseId, version: params.version, kind: "trace_anchor" }),
    rel_path: params.rel_path,
    media_type: "application/json",
  };
}

export function manifestItemForToolTelemetry(params: {
  caseId: string;
  version: "baseline" | "new";
  rel_path: string;
}): ManifestDraftItem {
  return {
    manifest_key: manifestKeyFor({ caseId: params.caseId, version: params.version, kind: "tool_telemetry" }),
    rel_path: params.rel_path,
    media_type: "application/json",
  };
}

export function manifestItemForToolResultArtifact(params: {
  caseId: string;
  version: "baseline" | "new";
  callId: string;
  rel_path: string;
}): ManifestDraftItem {
  return {
    manifest_key: manifestKeyFor({
      caseId: params.caseId,
      version: params.version,
      kind: `tool_result_${sanitizeManifestFragment(params.callId)}`,
    }),
    rel_path: params.rel_path,
    media_type: "application/json",
  };
}

export function manifestKeyForToolResultArtifact(params: {
  caseId: string;
  version: "baseline" | "new";
  callId: string;
}): string {
  return manifestKeyFor({
    caseId: params.caseId,
    version: params.version,
    kind: `tool_result_${sanitizeManifestFragment(params.callId)}`,
  });
}

export function manifestItemForRunnerFailureArtifact(params: {
  caseId: string;
  version: "baseline" | "new";
  bodyRel?: string;
  metaRel?: string;
}): ManifestDraftItem[] {
  const items: ManifestDraftItem[] = [];
  if (params.bodyRel) {
    items.push({
      manifest_key: manifestKeyFor({ caseId: params.caseId, version: params.version, kind: "runner_failure_body" }),
      rel_path: params.bodyRel,
      media_type: "application/octet-stream",
    });
  }
  if (params.metaRel) {
    items.push({
      manifest_key: manifestKeyFor({ caseId: params.caseId, version: params.version, kind: "runner_failure_meta" }),
      rel_path: params.metaRel,
      media_type: "application/json",
    });
  }
  return items;
}
