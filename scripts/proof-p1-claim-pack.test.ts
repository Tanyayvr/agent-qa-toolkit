import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it } from "vitest";

import {
  __test__,
  cliMain,
  parseCliArgs,
  readOtelCoverageProof,
  renderCliMessages,
  runP1ClaimProof,
} from "./proof-p1-claim-pack.mjs";

const tmpDirs: string[] = [];

function mkTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aq-p1-proof-test-"));
  tmpDirs.push(dir);
  return dir;
}

function writeCompareReport(reportDir: string, traceCoverage: Record<string, unknown>) {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "compare-report.json"),
    JSON.stringify(
      {
        summary: {
          trace_anchor_coverage: traceCoverage,
          data_coverage: { total_cases: 4 },
          execution_quality: { total_executed_cases: 4 },
        },
        items: [{ case_id: "c1" }],
      },
      null,
      2
    ),
    "utf8"
  );
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("proof-p1-claim-pack", () => {
  it("parses defaults", () => {
    const parsed = parseCliArgs(["node", "proof-p1-claim-pack.mjs"]);
    expect(parsed.reportDir).toBe("apps/evaluator/reports/latest");
    expect(parsed.baseUrl).toBe("http://127.0.0.1:8788");
    expect(parsed.minCases).toBe(1);
    expect(parsed.skipRuntimeE2E).toBe(false);
    expect(parsed.selfContained).toBe(false);
    expect(parsed.selfContainedPort).toBe(8798);
    expect(parsed.selfContainedPortAttempts).toBe(5);
    expect(parsed.runCaseTimeoutMs).toBe(30000);
  });

  it("parses self-contained port attempts override", () => {
    const parsed = parseCliArgs([
      "node",
      "proof-p1-claim-pack.mjs",
      "--selfContainedPort",
      "9100",
      "--selfContainedPortAttempts",
      "9",
    ]);
    expect(parsed.selfContainedPort).toBe(9100);
    expect(parsed.selfContainedPortAttempts).toBe(9);
  });

  it("validates otel coverage success", () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
      baseline_rate: 0.5,
      new_rate: 0.5,
    });

    const out = readOtelCoverageProof(reportDir, 1);
    expect(out.ok).toBe(true);
    expect(out.payload.cases_with_anchor_baseline).toBe(2);
  });

  it("fails when trace anchor coverage is missing", () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "compare-report.json"), JSON.stringify({ summary: {} }), "utf8");

    const out = readOtelCoverageProof(reportDir, 1);
    expect(out.ok).toBe(false);
    expect(String(out.payload.error)).toContain("trace_anchor_coverage");
  });

  it("builds proof artifact when otel + runtime checks pass", async () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    const outPath = path.join(root, "proof.json");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
    });

    const runtimeCalls: string[] = [];
    const result = await runP1ClaimProof(
      {
        reportDir,
        baseUrl: "http://127.0.0.1:8788",
        minCases: 1,
        out: outPath,
        skipRuntimeE2E: false,
        runCaseTimeoutMs: 12345,
      },
      {
        nowIso: "2026-03-06T00:00:00.000Z",
        runRuntimeHandoffProofFn: async ({ mode }) => {
          runtimeCalls.push(String(mode));
          return { ok: true, payload: { mode, status: "ok" } };
        },
      }
    );

    expect(result.ok).toBe(true);
    expect(runtimeCalls).toEqual(["endpoint", "e2e"]);
    expect(fs.existsSync(outPath)).toBe(true);
    const payload = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(payload.ok).toBe(true);
    expect(payload.checks.runtime_handoff_endpoint.mode).toBe("endpoint");
    expect(payload.checks.runtime_handoff_e2e.mode).toBe("e2e");
  });

  it("fails when runtime endpoint check fails", async () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
    });

    const result = await runP1ClaimProof(
      {
        reportDir,
        baseUrl: "http://127.0.0.1:8788",
        minCases: 1,
        out: path.join(root, "proof.json"),
        skipRuntimeE2E: true,
        runCaseTimeoutMs: 1000,
      },
      {
        runRuntimeHandoffProofFn: async () => ({ ok: false, payload: { error: "down" } }),
      }
    );

    expect(result.ok).toBe(false);
    expect(result.payload.stage).toBe("runtime_endpoint");
  });

  it("uses self-contained adapter bootstrap when enabled", async () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    const outPath = path.join(root, "proof.json");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
    });

    const runtimeBaseUrls: string[] = [];
    let stopped = false;
    const result = await runP1ClaimProof(
      {
        reportDir,
        baseUrl: "http://127.0.0.1:9999",
        minCases: 1,
        out: outPath,
        skipRuntimeE2E: true,
        selfContained: true,
        selfContainedPort: 8899,
      },
      {
        startSelfContainedAdapterFn: async () => ({
          baseUrl: "http://127.0.0.1:8899",
          stop: async () => {
            stopped = true;
          },
        }),
        runRuntimeHandoffProofFn: async ({ baseUrl }) => {
          runtimeBaseUrls.push(String(baseUrl));
          return { ok: true, payload: { baseUrl } };
        },
      }
    );

    expect(result.ok).toBe(true);
    expect(runtimeBaseUrls).toEqual(["http://127.0.0.1:8899"]);
    expect(stopped).toBe(true);
    const payload = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(payload.config.self_contained).toBe(true);
    expect(payload.config.base_url).toBe("http://127.0.0.1:8899");
    expect(payload.config.base_url_requested).toBe("http://127.0.0.1:9999");
  });

  it("forwards self-contained port attempts to bootstrap function and artifact config", async () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    const outPath = path.join(root, "proof.json");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
    });

    const seen: Array<{ port: number; attempts: number }> = [];
    const result = await runP1ClaimProof(
      {
        reportDir,
        baseUrl: "http://127.0.0.1:9999",
        minCases: 1,
        out: outPath,
        skipRuntimeE2E: true,
        selfContained: true,
        selfContainedPort: 9100,
        selfContainedPortAttempts: 7,
      },
      {
        startSelfContainedAdapterFn: async (port, options) => {
          seen.push({ port: Number(port), attempts: Number(options?.portAttempts) });
          return { baseUrl: "http://127.0.0.1:9100", stop: async () => {} };
        },
        runRuntimeHandoffProofFn: async () => ({ ok: true, payload: { ok: true } }),
      }
    );

    expect(result.ok).toBe(true);
    expect(seen).toEqual([{ port: 9100, attempts: 7 }]);
    const payload = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(payload.config.self_contained_port_attempts).toBe(7);
  });

  it("builds deterministic self-contained port candidates", () => {
    expect(__test__.buildSelfContainedPortCandidates(8798, 3)).toEqual([8798, 8799, 8800]);
    expect(__test__.buildSelfContainedPortCandidates(Number.NaN, 2)).toEqual([8798, 8799]);
  });

  it("builds self-contained adapter env with localhost-only host and cleared proxies", () => {
    const env = __test__.buildSelfContainedAdapterEnv(8811, {
      EXISTING: "1",
      HTTP_PROXY: "http://proxy",
      http_proxy: "http://proxy2",
    });
    expect(env.EXISTING).toBe("1");
    expect(env.PORT).toBe("8811");
    expect(env.HOST).toBe("127.0.0.1");
    expect(env.NO_PROXY).toBe("127.0.0.1,localhost");
    expect(env.HTTP_PROXY).toBe("");
    expect(env.HTTPS_PROXY).toBe("");
    expect(env.ALL_PROXY).toBe("");
    expect(env.http_proxy).toBe("");
    expect(env.https_proxy).toBe("");
    expect(env.all_proxy).toBe("");
  });

  it("waitForHealthOrExit fails fast when spawned process exits before health", async () => {
    const proc = new EventEmitter();
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ ok: false }) });
    try {
      setTimeout(() => {
        proc.emit("exit", 1, null);
      }, 5);
      await expect(__test__.waitForHealthOrExit("http://127.0.0.1:1", proc, 20, 1)).rejects.toThrow(
        "exited before health"
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("cliMain returns success code for --help path", async () => {
    const code = await cliMain(["node", "proof-p1-claim-pack.mjs", "--help"]);
    expect(code).toBe(0);
  });

  it("renders success/failure cli messages", () => {
    const okView = renderCliMessages(
      { ok: true, payload: { report_dir: "r", artifact_path: "a" } },
      false
    );
    expect(okView.channel).toBe("stdout");
    const failView = renderCliMessages({ ok: false, payload: { stage: "otel", error: "x" } }, false);
    expect(failView.channel).toBe("stderr");
    const jsonView = renderCliMessages({ ok: true, payload: { stage: "ok" } }, true);
    expect(jsonView.channel).toBe("stdout");
    expect(jsonView.lines[0]).toContain("\"ok\": true");
  });
});
