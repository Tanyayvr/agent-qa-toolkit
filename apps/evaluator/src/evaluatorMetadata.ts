import { readUtf8WithLimit, resolveFromRoot } from "./evaluatorIo";

export type ComplianceMappingEntry = {
  framework: string;
  clause: string;
  title?: string;
  evidence?: string[];
};

export type ComplianceCoverageStatus = "covered" | "partial" | "missing";

export type ComplianceCoverageRequirement = {
  framework: string;
  clause: string;
  title?: string;
  required_evidence?: string[];
  supporting_evidence?: string[];
  residual_gaps?: string[];
  notes?: string[];
  status_cap?: ComplianceCoverageStatus;
};

export type ComplianceProfile = {
  compliance_mapping?: ComplianceMappingEntry[];
  coverage_requirements?: ComplianceCoverageRequirement[];
};

export const REQUIRED_ENVIRONMENT_FIELDS = [
  "agent_id",
  "agent_version",
  "model",
  "model_version",
  "prompt_version",
  "tools_version",
  "config_hash",
] as const;

export const EU_AI_ACT_REQUIRED_ENVIRONMENT_FIELDS = REQUIRED_ENVIRONMENT_FIELDS;

export type RequiredEnvironmentField = typeof REQUIRED_ENVIRONMENT_FIELDS[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  return parseRequiredString(value, label);
}

function parseOptionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
  return value.map((entry) => entry.trim());
}

function parseOptionalStatusCap(value: unknown, label: string): ComplianceCoverageStatus | undefined {
  if (value === undefined) return undefined;
  if (value === "covered" || value === "partial" || value === "missing") {
    return value;
  }
  throw new Error(`${label} must be one of covered, partial, missing`);
}

function parseComplianceMappingEntry(value: unknown, label: string): ComplianceMappingEntry {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }

  const framework = parseRequiredString(value.framework, `${label}.framework`);
  const clause = parseRequiredString(value.clause, `${label}.clause`);
  const title = parseOptionalString(value.title, `${label}.title`);
  const evidence = parseOptionalStringArray(value.evidence, `${label}.evidence`);

  return {
    framework,
    clause,
    ...(title ? { title } : {}),
    ...(evidence?.length ? { evidence } : {}),
  };
}

function parseCoverageRequirement(value: unknown, label: string): ComplianceCoverageRequirement {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }

  const framework = parseRequiredString(value.framework, `${label}.framework`);
  const clause = parseRequiredString(value.clause, `${label}.clause`);
  const title = parseOptionalString(value.title, `${label}.title`);
  const requiredEvidence = parseOptionalStringArray(value.required_evidence, `${label}.required_evidence`);
  const supportingEvidence = parseOptionalStringArray(value.supporting_evidence, `${label}.supporting_evidence`);
  const residualGaps = parseOptionalStringArray(value.residual_gaps, `${label}.residual_gaps`);
  const notes = parseOptionalStringArray(value.notes, `${label}.notes`);
  const statusCap = parseOptionalStatusCap(value.status_cap, `${label}.status_cap`);

  return {
    framework,
    clause,
    ...(title ? { title } : {}),
    ...(requiredEvidence?.length ? { required_evidence: requiredEvidence } : {}),
    ...(supportingEvidence?.length ? { supporting_evidence: supportingEvidence } : {}),
    ...(residualGaps?.length ? { residual_gaps: residualGaps } : {}),
    ...(notes?.length ? { notes } : {}),
    ...(statusCap ? { status_cap: statusCap } : {}),
  };
}

function parseComplianceMappingArray(value: unknown, label: string): ComplianceMappingEntry[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map((entry, index) => parseComplianceMappingEntry(entry, `${label}[${index}]`));
}

function parseCoverageRequirementArray(value: unknown, label: string): ComplianceCoverageRequirement[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map((entry, index) => parseCoverageRequirement(entry, `${label}[${index}]`));
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export async function loadEnvironmentContext(params: {
  projectRoot: string;
  envFile?: string;
  maxMetaBytes: number;
  processEnv?: NodeJS.ProcessEnv;
}): Promise<Record<string, unknown> | undefined> {
  const { projectRoot, envFile, maxMetaBytes } = params;
  const processEnv = params.processEnv ?? process.env;

  if (envFile) {
    const raw = await readUtf8WithLimit(resolveFromRoot(projectRoot, envFile), maxMetaBytes);
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    throw new Error("environment file must contain an object");
  }

  const agent_id = processEnv.AGENT_ID;
  const agent_version = processEnv.AGENT_VERSION;
  const model = processEnv.AGENT_MODEL;
  const model_version = processEnv.MODEL_VERSION;
  const prompt_version = processEnv.PROMPT_VERSION;
  const tools_version = processEnv.TOOLS_VERSION;
  const config_hash = processEnv.CONFIG_HASH;

  if (!agent_id && !agent_version && !model && !model_version && !prompt_version && !tools_version && !config_hash) {
    return undefined;
  }

  const envObj: Record<string, unknown> = {};
  if (agent_id) envObj.agent_id = agent_id;
  if (agent_version) envObj.agent_version = agent_version;
  if (model) envObj.model = model;
  if (model_version) envObj.model_version = model_version;
  if (prompt_version) envObj.prompt_version = prompt_version;
  if (tools_version) envObj.tools_version = tools_version;
  if (config_hash) envObj.config_hash = config_hash;
  return envObj;
}

export function listMissingRequiredEnvironmentFields(
  environment: Record<string, unknown> | undefined
): RequiredEnvironmentField[] {
  if (!environment || typeof environment !== "object") {
    return [...REQUIRED_ENVIRONMENT_FIELDS];
  }
  return REQUIRED_ENVIRONMENT_FIELDS.filter((field) => {
    const value = environment[field];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function listMissingEuAiActEnvironmentFields(
  environment: Record<string, unknown> | undefined
): string[] {
  return listMissingRequiredEnvironmentFields(environment);
}

export function normalizeProvidedEnvironmentContext(
  environment: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!environment || typeof environment !== "object") {
    return undefined;
  }
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(environment)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) normalized[key] = trimmed;
      continue;
    }
    if (value !== undefined) normalized[key] = value;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function extractRunProvenance(
  runMeta: Record<string, unknown> | undefined
): Record<RequiredEnvironmentField, string> | undefined {
  if (!runMeta || typeof runMeta !== "object") {
    return undefined;
  }
  const provenance = isRecord(runMeta.provenance) ? runMeta.provenance : undefined;
  if (!provenance) {
    return undefined;
  }
  const missing = listMissingRequiredEnvironmentFields(provenance);
  if (missing.length > 0) {
    return undefined;
  }
  return Object.fromEntries(
    REQUIRED_ENVIRONMENT_FIELDS.map((field) => [field, String(provenance[field]).trim()])
  ) as Record<RequiredEnvironmentField, string>;
}

export function mergeEnvironmentWithCanonicalProvenance(params: {
  providedEnvironment?: Record<string, unknown>;
  canonicalProvenance: Record<RequiredEnvironmentField, string>;
}): Record<string, unknown> {
  const { canonicalProvenance } = params;
  const providedEnvironment = normalizeProvidedEnvironmentContext(params.providedEnvironment);
  if (!providedEnvironment) {
    return { ...canonicalProvenance };
  }

  const mismatches: string[] = [];
  for (const field of REQUIRED_ENVIRONMENT_FIELDS) {
    const provided = providedEnvironment[field];
    if (provided === undefined) continue;
    if (typeof provided !== "string" || provided.trim() !== canonicalProvenance[field]) {
      mismatches.push(field);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(
      `Provided environment metadata does not match new run provenance for: ${mismatches.join(", ")}`
    );
  }

  return {
    ...canonicalProvenance,
    ...providedEnvironment,
  };
}

export async function loadComplianceProfile(params: {
  projectRoot: string;
  complianceFile?: string;
  maxMetaBytes: number;
}): Promise<ComplianceProfile | undefined> {
  const { projectRoot, complianceFile, maxMetaBytes } = params;
  if (!complianceFile) return undefined;

  const raw = await readUtf8WithLimit(resolveFromRoot(projectRoot, complianceFile), maxMetaBytes);
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return {
      compliance_mapping: parseComplianceMappingArray(parsed, "compliance_mapping"),
    };
  }
  if (isRecord(parsed)) {
    const complianceMapping = parsed.compliance_mapping === undefined
      ? undefined
      : parseComplianceMappingArray(parsed.compliance_mapping, "compliance_mapping");
    const coverageRequirements = parsed.coverage_requirements === undefined
      ? undefined
      : parseCoverageRequirementArray(parsed.coverage_requirements, "coverage_requirements");
    if (complianceMapping || coverageRequirements) {
      return {
        ...(complianceMapping ? { compliance_mapping: complianceMapping } : {}),
        ...(coverageRequirements ? { coverage_requirements: coverageRequirements } : {}),
      };
    }
  }
  throw new Error("invalid compliance mapping shape");
}

export function resolveComplianceMapping(profile: ComplianceProfile | undefined): ComplianceMappingEntry[] | undefined {
  if (profile?.compliance_mapping?.length) {
    return profile.compliance_mapping;
  }
  if (!profile?.coverage_requirements?.length) {
    return undefined;
  }

  return profile.coverage_requirements.map((requirement) => {
    const evidence = uniqueStrings([
      ...(requirement.required_evidence ?? []),
      ...(requirement.supporting_evidence ?? []),
    ]);

    return {
      framework: requirement.framework,
      clause: requirement.clause,
      ...(requirement.title ? { title: requirement.title } : {}),
      ...(evidence.length ? { evidence } : {}),
    };
  });
}

export function resolveComplianceCoverageRequirements(
  profile: ComplianceProfile | undefined
): ComplianceCoverageRequirement[] | undefined {
  if (profile?.coverage_requirements?.length) {
    return profile.coverage_requirements;
  }
  if (!profile?.compliance_mapping?.length) {
    return undefined;
  }

  const derived = profile.compliance_mapping
    .filter((entry) => entry.evidence?.length)
    .map((entry) => ({
      framework: entry.framework,
      clause: entry.clause,
      ...(entry.title ? { title: entry.title } : {}),
      required_evidence: uniqueStrings(entry.evidence ?? []),
    }));

  return derived.length ? derived : undefined;
}

export async function loadComplianceMapping(params: {
  projectRoot: string;
  complianceFile?: string;
  maxMetaBytes: number;
}): Promise<ComplianceMappingEntry[] | undefined> {
  return resolveComplianceMapping(await loadComplianceProfile(params));
}

export function resolveTransferClass(value: string | undefined): "internal_only" | "transferable" | null {
  const normalized = value ?? "internal_only";
  if (normalized === "internal_only" || normalized === "transferable") return normalized;
  return null;
}
