import path from "node:path";
import { stat } from "node:fs/promises";
import type { CompareReport } from "./htmlReport";
import type { ThinIndex } from "./manifest";
import type { ComplianceMappingEntry } from "./evaluatorMetadata";
import type { ExecutionQualitySummary } from "./executionQuality";
import { normRel } from "./evaluatorIo";

export type QualityEntry = {
  field: string;
  value: string;
  check_exists: boolean;
};

export function buildQualityEntries(params: {
  projectRoot: string;
  baselineDirAbs: string;
  newDirAbs: string;
  casesPathAbs: string;
  items: CompareReport["items"];
}): QualityEntry[] {
  const { projectRoot, baselineDirAbs, newDirAbs, casesPathAbs, items } = params;
  const qualityEntries: QualityEntry[] = [];
  qualityEntries.push({ field: "baseline_dir", value: normRel(projectRoot, baselineDirAbs), check_exists: false });
  qualityEntries.push({ field: "new_dir", value: normRel(projectRoot, newDirAbs), check_exists: false });
  qualityEntries.push({ field: "cases_path", value: normRel(projectRoot, casesPathAbs), check_exists: false });

  for (const it of items) {
    const a = it.artifacts;
    const vals: Array<[string, string | undefined]> = [
      ["items[].artifacts.replay_diff_href", a.replay_diff_href],
      ["items[].artifacts.baseline_failure_body_href", a.baseline_failure_body_href],
      ["items[].artifacts.baseline_failure_meta_href", a.baseline_failure_meta_href],
      ["items[].artifacts.new_failure_body_href", a.new_failure_body_href],
      ["items[].artifacts.new_failure_meta_href", a.new_failure_meta_href],
      ["items[].artifacts.baseline_case_response_href", a.baseline_case_response_href],
      ["items[].artifacts.new_case_response_href", a.new_case_response_href],
      ["items[].artifacts.baseline_trace_anchor_href", a.baseline_trace_anchor_href],
      ["items[].artifacts.new_trace_anchor_href", a.new_trace_anchor_href],
      ["items[].artifacts.baseline_run_meta_href", a.baseline_run_meta_href],
      ["items[].artifacts.new_run_meta_href", a.new_run_meta_href],
    ];
    for (const [field, v] of vals) {
      if (typeof v === "string" && v.length) {
        qualityEntries.push({ field, value: v, check_exists: true });
      }
    }
  }

  return qualityEntries;
}

export async function maybeAttachLargePayloadWarnings(params: {
  cases: Array<{ id: string }>;
  baselineDirAbs: string;
  newDirAbs: string;
  warnBodyBytes: number;
  qualityFlags: {
    large_payloads?: string[];
    large_payloads_count?: number;
  };
}): Promise<void> {
  const { cases, baselineDirAbs, newDirAbs, warnBodyBytes, qualityFlags } = params;
  if (warnBodyBytes <= 0) return;

  const largePayloads: string[] = [];
  const pushIfLarge = async (side: "baseline" | "new", caseId: string) => {
    const dirAbs = side === "baseline" ? baselineDirAbs : newDirAbs;
    const abs = path.join(dirAbs, `${caseId}.json`);
    try {
      const st = await stat(abs);
      if (st.isFile() && st.size > warnBodyBytes) {
        largePayloads.push(`${side}/${caseId}.json (${st.size} bytes)`);
      }
    } catch {
      // ignore missing files here (covered by availability)
    }
  };

  for (const c of cases) {
    await pushIfLarge("baseline", c.id);
    await pushIfLarge("new", c.id);
  }
  qualityFlags.large_payloads = largePayloads;
  qualityFlags.large_payloads_count = largePayloads.length;
}

export function buildCompareReportDocument(params: {
  reportId: string;
  toolkitVersion: string;
  generatedAt: number;
  environment: Record<string, unknown> | undefined;
  projectRoot: string;
  baselineDirAbs: string;
  newDirAbs: string;
  casesPathAbs: string;
  baselinePass: number;
  newPass: number;
  regressions: number;
  improvements: number;
  breakdown: Record<string, number>;
  transferClass: "internal_only" | "transferable";
  redactionStatus: "none" | "applied";
  redactionPresetId?: string;
  totalCases: number;
  casesWithSignalsNew: number;
  casesWithSignalsBaseline: number;
  signalCountsNew: Record<"low" | "medium" | "high" | "critical", number>;
  signalCountsBaseline: Record<"low" | "medium" | "high" | "critical", number>;
  topSignalKindsNew: string[];
  topSignalKindsBaseline: string[];
  riskSummary: { low: number; medium: number; high: number };
  casesRequiringApproval: number;
  casesBlockRecommended: number;
  dataCoverage: {
    total_cases: number;
    items_emitted: number;
    missing_baseline_artifacts: number;
    missing_new_artifacts: number;
    broken_baseline_artifacts: number;
    broken_new_artifacts: number;
  };
  executionQuality: ExecutionQualitySummary;
  traceAnchorCoverage: {
    cases_with_anchor_baseline: number;
    cases_with_anchor_new: number;
  };
  summaryBySuite: NonNullable<CompareReport["summary_by_suite"]>;
  qualityFlags: CompareReport["quality_flags"];
  complianceMapping?: ComplianceMappingEntry[];
  items: CompareReport["items"];
  embeddedManifestIndex?: ThinIndex;
}): CompareReport & { embedded_manifest_index?: ThinIndex } {
  const report: CompareReport & { embedded_manifest_index?: ThinIndex } = {
    contract_version: 5,
    report_id: params.reportId,
    meta: {
      toolkit_version: params.toolkitVersion,
      spec_version: "aepf-v1",
      generated_at: params.generatedAt,
      run_id: params.reportId,
    },
    ...(params.environment ? { environment: params.environment } : {}),
    baseline_dir: normRel(params.projectRoot, params.baselineDirAbs),
    new_dir: normRel(params.projectRoot, params.newDirAbs),
    cases_path: normRel(params.projectRoot, params.casesPathAbs),
    summary: {
      baseline_pass: params.baselinePass,
      new_pass: params.newPass,
      regressions: params.regressions,
      improvements: params.improvements,
      root_cause_breakdown: params.breakdown,
      quality: {
        transfer_class: params.transferClass,
        redaction_status: params.redactionStatus,
        ...(params.redactionStatus === "applied" && params.redactionPresetId ? { redaction_preset_id: params.redactionPresetId } : {}),
      },
      security: {
        total_cases: params.totalCases,
        cases_with_signals_new: params.casesWithSignalsNew,
        cases_with_signals_baseline: params.casesWithSignalsBaseline,
        signal_counts_new: params.signalCountsNew,
        signal_counts_baseline: params.signalCountsBaseline,
        top_signal_kinds_new: params.topSignalKindsNew,
        top_signal_kinds_baseline: params.topSignalKindsBaseline,
      },
      risk_summary: params.riskSummary,
      cases_requiring_approval: params.casesRequiringApproval,
      cases_block_recommended: params.casesBlockRecommended,
      data_coverage: params.dataCoverage,
      execution_quality: params.executionQuality,
      trace_anchor_coverage: params.traceAnchorCoverage,
    },
    summary_by_suite: params.summaryBySuite,
    quality_flags: params.qualityFlags,
    ...(params.complianceMapping ? { compliance_mapping: params.complianceMapping } : {}),
    items: params.items,
    ...(params.embeddedManifestIndex ? { embedded_manifest_index: params.embeddedManifestIndex } : {}),
  };
  return report;
}

