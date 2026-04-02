import type { CompareReport } from "./reportTypes";

export const RETENTION_ARCHIVE_CONTROLS_HREF = "archive/retention-controls.json";

type JsonRecord = Record<string, unknown>;

type RunRetentionObservation = {
  run_id: string | null;
  retention_days: number | null;
  keep_raw: boolean | null;
  save_full_body_on_error: boolean | null;
  redaction_applied: boolean | null;
  redaction_keep_raw: boolean | null;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function maybeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function maybeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function maybeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))];
}

function normalizeRunRetention(meta: unknown): RunRetentionObservation {
  const root = asRecord(meta);
  const runner = asRecord(root?.runner);
  return {
    run_id: maybeString(root?.run_id),
    retention_days: maybeNumber(runner?.retention_days),
    keep_raw: maybeBoolean(runner?.keep_raw),
    save_full_body_on_error: maybeBoolean(runner?.save_full_body_on_error),
    redaction_applied: maybeBoolean(root?.redaction_applied),
    redaction_keep_raw: maybeBoolean(root?.redaction_keep_raw),
  };
}

function compareSetting(
  label: string,
  baseline: string | number | boolean | null,
  next: string | number | boolean | null
): string | null {
  if (baseline === null || next === null || baseline === next) return null;
  return `${label} differs between baseline and new`;
}

export function buildRetentionArchiveControls(params: {
  report: CompareReport;
  baselineRunMeta: unknown;
  newRunMeta: unknown;
  evaluatorRetentionDays: number;
}) {
  const baseline = normalizeRunRetention(params.baselineRunMeta);
  const next = normalizeRunRetention(params.newRunMeta);
  const differences = uniqueStrings(
    [
      compareSetting("retention_days", baseline.retention_days, next.retention_days),
      compareSetting("keep_raw", baseline.keep_raw, next.keep_raw),
      compareSetting("save_full_body_on_error", baseline.save_full_body_on_error, next.save_full_body_on_error),
      compareSetting("redaction_applied", baseline.redaction_applied, next.redaction_applied),
      compareSetting("redaction_keep_raw", baseline.redaction_keep_raw, next.redaction_keep_raw),
    ].filter((value): value is string => Boolean(value))
  );

  const externalSurfaces = uniqueStrings([
    baseline.keep_raw === true || next.keep_raw === true || baseline.redaction_keep_raw === true || next.redaction_keep_raw === true
      ? "Source runner raw sidecars may exist outside this packaged bundle when keep_raw=true."
      : "",
    baseline.save_full_body_on_error === true || next.save_full_body_on_error === true
      ? "Source runner full error bodies may exist outside this packaged bundle when save_full_body_on_error=true."
      : "",
  ]);

  const residualGaps = uniqueStrings([
    "Archive storage location, immutability controls, and access policy are operator-defined.",
    "Deletion, legal hold, and authority export procedures are operator-defined.",
    differences.length > 0
      ? "Baseline and new source runs use different retention settings; record the chosen retention owner and rationale."
      : "",
    externalSurfaces.length > 0
      ? "Source runs may retain raw or full-body artifacts outside the packaged report; those surfaces need separate retention controls."
      : "",
    params.report.quality_flags.self_contained === false ? "Bundle is not self-contained; archive completeness is degraded." : "",
    params.report.quality_flags.portable_paths === false ? "Bundle contains non-portable paths; archive portability is degraded." : "",
  ]);

  return {
    schema_version: 1,
    artifact_type: "retention_archive_controls",
    framework: "AGENT_EVIDENCE",
    report_id: params.report.report_id,
    generated_at: params.report.meta.generated_at,
    bundle_artifacts: {
      compare_report_href: "compare-report.json",
      report_html_href: "report.html",
      manifest_href: "artifacts/manifest.json",
      retention_archive_controls_href: RETENTION_ARCHIVE_CONTROLS_HREF,
    },
    report_quality: {
      self_contained: params.report.quality_flags.self_contained === true,
      portable_paths: params.report.quality_flags.portable_paths === true,
      transfer_class: params.report.summary.quality.transfer_class,
      redaction_status: params.report.summary.quality.redaction_status,
      redaction_preset_id: params.report.summary.quality.redaction_preset_id ?? null,
    },
    retention_observations: {
      baseline,
      new: next,
      evaluator_retention_days: params.evaluatorRetentionDays,
      settings_consistent: differences.length === 0,
      differences,
    },
    archive_scope: {
      archive_entire_report_directory: true,
      immutable_archive_recommended: true,
      manifest_anchor_href: "artifacts/manifest.json",
      required_paths: uniqueStrings([
        "compare-report.json",
        "report.html",
        "artifacts/manifest.json",
        RETENTION_ARCHIVE_CONTROLS_HREF,
        params.report.cases_path,
        `${params.report.baseline_dir}/run.json`,
        `${params.report.new_dir}/run.json`,
      ]),
      operator_required_inputs: [
        "archive storage location",
        "retention owner",
        "approved retention period by artifact class",
        "deletion and legal-hold procedure",
        "authority export procedure",
      ],
      external_surfaces: externalSurfaces,
    },
    residual_gaps: residualGaps,
  };
}
