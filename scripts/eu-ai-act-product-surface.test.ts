import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const PRODUCT_ROOT = path.join(REPO_ROOT, "products", "eu-ai-act");
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const NODE_COMMAND = process.execPath;
const INSTALL_SCRIPT = path.join(PRODUCT_ROOT, "scripts", "install-shared-core.mjs");
const SCRIPT_TEST_TIMEOUT_MS = 90_000;

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-eu-surface-"));
  tempRoots.push(root);
  return root;
}

function runProductCommand(args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(NPM_COMMAND, args, {
    cwd: PRODUCT_ROOT,
    env,
    encoding: "utf8",
  });
}

function runNode(scriptAbs: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(NODE_COMMAND, [scriptAbs, ...args], {
    cwd: PRODUCT_ROOT,
    env,
    encoding: "utf8",
  });
}

function writeJson(absPath: string, value: unknown) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(value, null, 2), "utf8");
}

function parseLastJsonLine(output: string) {
  const lines = output.split(/\r?\n/);
  const jsonStart = lines.findIndex((line) => line.trim().startsWith("{"));
  if (jsonStart === -1) {
    throw new Error(`No JSON object found in output:\n${output}`);
  }
  return JSON.parse(lines.slice(jsonStart).join("\n"));
}

function buildRunMeta(caseIds: string[], version: "baseline" | "new") {
  return {
    selected_case_ids: caseIds,
    provenance: {
      agent_id: "eu-surface-fixture-agent",
      agent_version: version === "new" ? "eu-surface-fixture-agent-v2" : "eu-surface-fixture-agent-v1",
      model: "fixture-model",
      model_version: version === "new" ? "2026-04-02" : "2026-03-25",
      prompt_version: version === "new" ? "fixture-prompt-v2" : "fixture-prompt-v1",
      tools_version: "fixture-tools-v1",
      config_hash: version === "new" ? "fixture-config-002" : "fixture-config-001",
    },
  };
}

function createEvaluatorFixture(root: string) {
  const casesPath = path.join(root, "cases.json");
  const baselineDir = path.join(root, "runs", "baseline", "r1");
  const newDir = path.join(root, "runs", "new", "r1");
  const outDir = path.join(root, "reports", "eu-surface-package");
  const environmentPath = path.join(root, "environment.json");

  writeJson(casesPath, [
    {
      id: "c1",
      title: "eu surface case",
      input: { user: "hello" },
      expected: { must_include: ["ok"] },
    },
  ]);
  writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1"], "baseline"));
  writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
  writeJson(path.join(baselineDir, "c1.json"), {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: "ok" },
    events: [{ type: "final_output", ts: 1, content_type: "text", content: "ok" }],
    proposed_actions: [],
  });
  writeJson(path.join(newDir, "c1.json"), {
    case_id: "c1",
    version: "new",
    final_output: { content_type: "text", content: "ok" },
    events: [{ type: "final_output", ts: 1, content_type: "text", content: "ok" }],
    proposed_actions: [],
  });
  writeJson(environmentPath, {
    agent_id: "eu-surface-fixture-agent",
    agent_version: "eu-surface-fixture-agent-v2",
    model: "fixture-model",
    model_version: "2026-04-02",
    prompt_version: "fixture-prompt-v2",
    tools_version: "fixture-tools-v1",
    config_hash: "fixture-config-002",
  });

  return { casesPath, baselineDir, newDir, outDir, environmentPath };
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("eu-ai-act product surface", () => {
  it("runs the starter dry-run from the product surface", () => {
    const result = runProductCommand([
      "run",
      "starter",
      "--",
      "--dry-run",
      "--baseUrl",
      "http://localhost:8787",
      "--systemType",
      "fraud",
      "--profile",
      "surface-smoke",
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("EU starter plan:");
    expect(result.stdout).toContain("workspace=.agent-qa/eu-ai-act-starter/surface-smoke");
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("passes --draftJson through the starter wrapper", () => {
    const root = makeTempRoot();
    const draftJson = path.join(root, "eu-ai-act-legal-draft.json");
    writeFileSync(
      draftJson,
      `${JSON.stringify({ artifact_type: "eu_ai_act_legal_draft", sections: [] }, null, 2)}\n`,
      "utf8"
    );

    const result = runProductCommand([
      "run",
      "starter",
      "--",
      "--dry-run",
      "--baseUrl",
      "http://localhost:8787",
      "--systemType",
      "fraud",
      "--profile",
      "surface-draft",
      "--draftJson",
      draftJson,
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("builderDraft=");
    expect(result.stdout).toContain("supplemental/builder-draft.json");
  }, SCRIPT_TEST_TIMEOUT_MS);

  it(
    "packages and verifies the minimum EU bundle from the product surface",
    () => {
      const root = makeTempRoot();
      const fixture = createEvaluatorFixture(root);
      const { privateKey, publicKey } = generateKeyPairSync("ed25519");
      const privateKeyB64 = Buffer.from(
        privateKey.export({ format: "der", type: "pkcs8" }) as Buffer
      ).toString("base64");
      const publicKeyB64 = Buffer.from(
        publicKey.export({ format: "der", type: "spki" }) as Buffer
      ).toString("base64");

      const packageResult = runProductCommand([
        "run",
        "package",
        "--",
        "--cases",
        fixture.casesPath,
        "--baselineDir",
        fixture.baselineDir,
        "--newDir",
        fixture.newDir,
        "--outDir",
        fixture.outDir,
        "--reportId",
        "eu-surface-package",
        "--environment",
        fixture.environmentPath,
        "--no-trend",
        "--sign",
      ], {
        ...process.env,
        AQ_MANIFEST_PRIVATE_KEY: privateKeyB64,
      });

      expect(packageResult.status, packageResult.stderr).toBe(0);
      expect(packageResult.stdout).toContain("Status: OK");

      const compare = JSON.parse(readFileSync(path.join(fixture.outDir, "compare-report.json"), "utf8")) as {
        compliance_exports?: {
          eu_ai_act?: {
            annex_iv_href?: string;
          };
        };
      };
      expect(compare.compliance_exports?.eu_ai_act?.annex_iv_href).toBe("compliance/eu-ai-act-annex-iv.json");

      const verifyResult = runProductCommand([
        "run",
        "verify",
        "--",
        "--reportDir",
        fixture.outDir,
      ]);

      expect(verifyResult.status, verifyResult.stderr).toBe(0);
      expect(verifyResult.stdout).toContain("Status: OK");

      const strictJsonResult = runProductCommand([
        "run",
        "verify",
        "--",
        "--reportDir",
        fixture.outDir,
        "--strict",
        "--json",
      ], {
        ...process.env,
        AQ_MANIFEST_PUBLIC_KEY: publicKeyB64,
      });

      expect(strictJsonResult.status, strictJsonResult.stderr).toBe(0);
      expect(parseLastJsonLine(strictJsonResult.stdout)).toMatchObject({
        ok: true,
        mode: "strict",
      });
    },
    SCRIPT_TEST_TIMEOUT_MS
  );

  it("fails fast when verify is run without an explicit reportDir", () => {
    const result = runProductCommand(["run", "verify"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("EU verify requires an explicit --reportDir <report-dir>.");
  });

  it(
    "runs the EU contract check from the product surface",
    () => {
      const result = runProductCommand(["run", "contracts"]);

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("EU AI Act contract check: PASS");
    },
    SCRIPT_TEST_TIMEOUT_MS
  );

  it("skips shared-core install when AQ_SKIP_SHARED_CORE_INSTALL=1", () => {
    const result = runNode(INSTALL_SCRIPT, [], {
      ...process.env,
      AQ_SKIP_SHARED_CORE_INSTALL: "1",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).not.toContain("Installing shared monorepo dependencies");
  });

  it("skips shared-core install when --skip-shared-core-install is passed", () => {
    const result = runNode(INSTALL_SCRIPT, ["--skip-shared-core-install"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).not.toContain("Installing shared monorepo dependencies");
  });
});
