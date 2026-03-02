import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadComplianceMapping,
  loadEnvironmentContext,
  resolveTransferClass,
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
        AGENT_MODEL: "gpt-x",
        PROMPT_VERSION: "p1",
        TOOLS_VERSION: "t1",
      },
    });

    expect(loaded).toEqual({
      agent_id: "agent-x",
      model: "gpt-x",
      prompt_version: "p1",
      tools_version: "t1",
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

  it("validates transfer class values", () => {
    expect(resolveTransferClass(undefined)).toBe("internal_only");
    expect(resolveTransferClass("internal_only")).toBe("internal_only");
    expect(resolveTransferClass("transferable")).toBe("transferable");
    expect(resolveTransferClass("invalid")).toBeNull();
  });
});

