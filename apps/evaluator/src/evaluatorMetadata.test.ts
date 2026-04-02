import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  extractRunProvenance,
  loadComplianceProfile,
  loadComplianceMapping,
  loadEnvironmentContext,
  listMissingRequiredEnvironmentFields,
  mergeEnvironmentWithCanonicalProvenance,
  resolveComplianceCoverageRequirements,
  resolveComplianceMapping,
  resolveTransferClass,
  listMissingEuAiActEnvironmentFields,
} from "./evaluatorMetadata";

describe("evaluatorMetadata", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-evaluator-meta-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("loads environment object from json file", async () => {
    const envAbs = path.join(root, "env.json");
    await writeFile(envAbs, JSON.stringify({ agent_id: "a1", model: "m1" }), "utf-8");

    const loaded = await loadEnvironmentContext({
      projectRoot: root,
      envFile: "env.json",
      maxMetaBytes: 1_000,
    });

    expect(loaded).toEqual({ agent_id: "a1", model: "m1" });
  });

  it("derives environment object from process env fallback", async () => {
    const loaded = await loadEnvironmentContext({
      projectRoot: root,
      maxMetaBytes: 1_000,
      processEnv: {
        AGENT_ID: "agent-x",
        AGENT_VERSION: "agent-x-v2",
        AGENT_MODEL: "gpt-x",
        MODEL_VERSION: "2026-03-01",
        PROMPT_VERSION: "p1",
        TOOLS_VERSION: "t1",
        CONFIG_HASH: "cfg-123",
      },
    });

    expect(loaded).toEqual({
      agent_id: "agent-x",
      agent_version: "agent-x-v2",
      model: "gpt-x",
      model_version: "2026-03-01",
      prompt_version: "p1",
      tools_version: "t1",
      config_hash: "cfg-123",
    });
  });

  it("returns undefined when no environment values are present", async () => {
    const loaded = await loadEnvironmentContext({
      projectRoot: root,
      maxMetaBytes: 1_000,
      processEnv: {},
    });
    expect(loaded).toBeUndefined();
  });

  it("lists missing EU AI Act environment fields", () => {
    expect(listMissingEuAiActEnvironmentFields(undefined)).toContain("agent_id");
    expect(listMissingRequiredEnvironmentFields(undefined)).toContain("agent_version");
    expect(
      listMissingEuAiActEnvironmentFields({
        agent_id: "agent-x",
        agent_version: "v2",
        model: "gpt-x",
        prompt_version: "p1",
      })
    ).toEqual(expect.arrayContaining(["model_version", "tools_version", "config_hash"]));
  });

  it("extracts complete run provenance and merges optional environment assertions", () => {
    expect(
      extractRunProvenance({
        provenance: {
          agent_id: "agent-a",
          agent_version: "v1",
          model: "model-a",
          model_version: "2026-03-01",
          prompt_version: "prompt-v1",
          tools_version: "tools-v1",
          config_hash: "cfg-001",
        },
      })
    ).toEqual({
      agent_id: "agent-a",
      agent_version: "v1",
      model: "model-a",
      model_version: "2026-03-01",
      prompt_version: "prompt-v1",
      tools_version: "tools-v1",
      config_hash: "cfg-001",
    });

    expect(
      mergeEnvironmentWithCanonicalProvenance({
        providedEnvironment: { agent_id: "agent-a", model: "model-a", deployment_tier: "staging" },
        canonicalProvenance: {
          agent_id: "agent-a",
          agent_version: "v1",
          model: "model-a",
          model_version: "2026-03-01",
          prompt_version: "prompt-v1",
          tools_version: "tools-v1",
          config_hash: "cfg-001",
        },
      })
    ).toMatchObject({
      agent_id: "agent-a",
      agent_version: "v1",
      model: "model-a",
      deployment_tier: "staging",
    });
  });

  it("loads compliance mapping from array and object forms", async () => {
    const arrAbs = path.join(root, "compliance-array.json");
    await writeFile(arrAbs, JSON.stringify([{ framework: "ISO", clause: "A.1" }]), "utf-8");
    const fromArray = await loadComplianceMapping({
      projectRoot: root,
      complianceFile: "compliance-array.json",
      maxMetaBytes: 1_000,
    });
    expect(fromArray).toEqual([{ framework: "ISO", clause: "A.1" }]);

    const objAbs = path.join(root, "compliance-object.json");
    await writeFile(
      objAbs,
      JSON.stringify({ compliance_mapping: [{ framework: "NIST", clause: "GV.1" }] }),
      "utf-8"
    );
    const fromObject = await loadComplianceMapping({
      projectRoot: root,
      complianceFile: "compliance-object.json",
      maxMetaBytes: 1_000,
    });
    expect(fromObject).toEqual([{ framework: "NIST", clause: "GV.1" }]);
  });

  it("loads expanded compliance profiles with coverage requirements", async () => {
    const profileAbs = path.join(root, "compliance-profile.json");
    await writeFile(
      profileAbs,
      JSON.stringify({
        compliance_mapping: [{ framework: "EU_AI_ACT", clause: "Art_9", title: "Risk management" }],
        coverage_requirements: [
          {
            framework: "EU_AI_ACT",
            clause: "Art_11",
            title: "Technical documentation",
            required_evidence: ["compare-report.json.summary"],
            supporting_evidence: ["artifacts/manifest.json"],
            residual_gaps: ["Operator-owned dossier still required."],
            notes: ["Evaluator provides only the runtime evidence slice."],
            status_cap: "partial",
          },
        ],
      }),
      "utf-8"
    );

    const profile = await loadComplianceProfile({
      projectRoot: root,
      complianceFile: "compliance-profile.json",
      maxMetaBytes: 2_000,
    });

    expect(resolveComplianceMapping(profile)).toEqual([
      { framework: "EU_AI_ACT", clause: "Art_9", title: "Risk management" },
    ]);
    expect(resolveComplianceCoverageRequirements(profile)).toEqual([
      {
        framework: "EU_AI_ACT",
        clause: "Art_11",
        title: "Technical documentation",
        required_evidence: ["compare-report.json.summary"],
        supporting_evidence: ["artifacts/manifest.json"],
        residual_gaps: ["Operator-owned dossier still required."],
        notes: ["Evaluator provides only the runtime evidence slice."],
        status_cap: "partial",
      },
    ]);
  });

  it("validates transfer class values", () => {
    expect(resolveTransferClass(undefined)).toBe("internal_only");
    expect(resolveTransferClass("internal_only")).toBe("internal_only");
    expect(resolveTransferClass("transferable")).toBe("transferable");
    expect(resolveTransferClass("invalid")).toBeNull();
  });
});
