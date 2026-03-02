import { readUtf8WithLimit, resolveFromRoot } from "./evaluatorIo";

export type ComplianceMappingEntry = {
  framework: string;
  clause: string;
  title?: string;
  evidence?: string[];
};

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
  const model = processEnv.AGENT_MODEL;
  const prompt_version = processEnv.PROMPT_VERSION;
  const tools_version = processEnv.TOOLS_VERSION;

  if (!agent_id && !model && !prompt_version && !tools_version) {
    return undefined;
  }

  const envObj: Record<string, unknown> = {};
  if (agent_id) envObj.agent_id = agent_id;
  if (model) envObj.model = model;
  if (prompt_version) envObj.prompt_version = prompt_version;
  if (tools_version) envObj.tools_version = tools_version;
  return envObj;
}

export async function loadComplianceMapping(params: {
  projectRoot: string;
  complianceFile?: string;
  maxMetaBytes: number;
}): Promise<ComplianceMappingEntry[] | undefined> {
  const { projectRoot, complianceFile, maxMetaBytes } = params;
  if (!complianceFile) return undefined;

  const raw = await readUtf8WithLimit(resolveFromRoot(projectRoot, complianceFile), maxMetaBytes);
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as ComplianceMappingEntry[];
  }
  if (parsed && typeof parsed === "object") {
    const fromObject = (parsed as { compliance_mapping?: unknown }).compliance_mapping;
    if (Array.isArray(fromObject)) {
      return fromObject as ComplianceMappingEntry[];
    }
  }
  throw new Error("invalid compliance mapping shape");
}

export function resolveTransferClass(value: string | undefined): "internal_only" | "transferable" | null {
  const normalized = value ?? "internal_only";
  if (normalized === "internal_only" || normalized === "transferable") return normalized;
  return null;
}
