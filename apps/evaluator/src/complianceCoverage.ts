import type {
  ComplianceCoverageRequirement,
  ComplianceCoverageStatus,
} from "./evaluatorMetadata";
import type { Manifest, ThinIndex } from "./manifest";
import type { CompareReport, ComplianceCoverageEntry } from "./reportTypes";

const STATUS_RANK: Record<ComplianceCoverageStatus, number> = {
  missing: 0,
  partial: 1,
  covered: 2,
};

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function resolvePath(root: unknown, selectorPath: string): boolean {
  const tokens = selectorPath.split(".").filter(Boolean);
  let frontier: unknown[] = [root];

  for (const token of tokens) {
    const expandArray = token.endsWith("[]");
    const property = expandArray ? token.slice(0, -2) : token;
    const next: unknown[] = [];

    for (const current of frontier) {
      if (!current || typeof current !== "object") continue;
      const candidate = (current as Record<string, unknown>)[property];
      if (candidate === undefined) continue;
      if (expandArray) {
        if (Array.isArray(candidate)) next.push(...candidate);
        continue;
      }
      next.push(candidate);
    }

    if (!next.length) return false;
    frontier = next;
  }

  return frontier.some(hasMeaningfulValue);
}

function selectorPresent(params: {
  selector: string;
  report: CompareReport & { embedded_manifest_index?: ThinIndex };
  manifest: Manifest | undefined;
}): boolean {
  const { selector, report, manifest } = params;
  const roots: Array<{ prefix: string; value: unknown }> = [
    { prefix: "artifacts/manifest.json", value: manifest },
    { prefix: "embedded_manifest_index", value: report.embedded_manifest_index },
    { prefix: "compare-report.json", value: report },
    { prefix: "report.html", value: true },
  ];

  const rootMatch = roots.find((root) => selector === root.prefix || selector.startsWith(`${root.prefix}.`));
  if (!rootMatch) return false;
  if (selector === rootMatch.prefix) return hasMeaningfulValue(rootMatch.value);
  return resolvePath(rootMatch.value, selector.slice(rootMatch.prefix.length + 1));
}

function deriveStatus(params: {
  requiredPresent: string[];
  requiredMissing: string[];
  supportingPresent: string[];
  supportingMissing: string[];
}): ComplianceCoverageStatus {
  const { requiredPresent, requiredMissing, supportingPresent, supportingMissing } = params;

  if (!requiredPresent.length && !requiredMissing.length) {
    if (!supportingPresent.length && !supportingMissing.length) return "missing";
    if (!supportingMissing.length) return "covered";
    return supportingPresent.length ? "partial" : "missing";
  }

  if (!requiredMissing.length) return "covered";
  return requiredPresent.length || supportingPresent.length ? "partial" : "missing";
}

function applyStatusCap(
  status: ComplianceCoverageStatus,
  statusCap: ComplianceCoverageStatus | undefined
): ComplianceCoverageStatus {
  if (!statusCap) return status;
  return STATUS_RANK[status] <= STATUS_RANK[statusCap] ? status : statusCap;
}

export function computeComplianceCoverage(params: {
  report: CompareReport & { embedded_manifest_index?: ThinIndex };
  manifest: Manifest | undefined;
  requirements: ComplianceCoverageRequirement[] | undefined;
}): ComplianceCoverageEntry[] | undefined {
  const requirements = params.requirements?.length ? params.requirements : undefined;
  if (!requirements) return undefined;

  return requirements.map((requirement) => {
    const requiredEvidence = uniqueStrings(requirement.required_evidence ?? []);
    const supportingEvidence = uniqueStrings(requirement.supporting_evidence ?? []);
    const requiredPresent = requiredEvidence.filter((selector) =>
      selectorPresent({ selector, report: params.report, manifest: params.manifest })
    );
    const supportingPresent = supportingEvidence.filter((selector) =>
      selectorPresent({ selector, report: params.report, manifest: params.manifest })
    );
    const requiredMissing = requiredEvidence.filter((selector) => !requiredPresent.includes(selector));
    const supportingMissing = supportingEvidence.filter((selector) => !supportingPresent.includes(selector));
    const status = applyStatusCap(
      deriveStatus({
        requiredPresent,
        requiredMissing,
        supportingPresent,
        supportingMissing,
      }),
      requirement.status_cap
    );

    return {
      framework: requirement.framework,
      clause: requirement.clause,
      ...(requirement.title ? { title: requirement.title } : {}),
      status,
      ...(requirement.status_cap ? { status_cap: requirement.status_cap } : {}),
      required_evidence: requiredEvidence,
      required_evidence_present: requiredPresent,
      required_evidence_missing: requiredMissing,
      supporting_evidence: supportingEvidence,
      supporting_evidence_present: supportingPresent,
      supporting_evidence_missing: supportingMissing,
      ...(requirement.residual_gaps?.length ? { residual_gaps: requirement.residual_gaps } : {}),
      ...(requirement.notes?.length ? { notes: requirement.notes } : {}),
    };
  });
}
