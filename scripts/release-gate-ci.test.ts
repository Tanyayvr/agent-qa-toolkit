import { describe, expect, it } from "vitest";

import {
  buildGateSteps,
  parseCliArgs,
  renderCliMessages,
  runReleaseGate,
  summarizeResults,
} from "./release-gate-ci.mjs";

describe("release-gate-ci", () => {
  it("parses cli defaults", () => {
    const parsed = parseCliArgs(["node", "scripts/release-gate-ci.mjs", "--ci"]);
    expect(parsed.ci).toBe(true);
    expect(parsed.failFast).toBe(false);
    expect(parsed.toolkitBaseUrl).toBe("http://127.0.0.1:8796");
    expect(parsed.proofPort).toBe(8798);
    expect(parsed.reportOut).toBe("apps/evaluator/reports/release-gate-ci.json");
    expect(parsed.runSuffix.startsWith("ci_")).toBe(true);
  });

  it("builds required gate steps and proof report path from runSuffix", () => {
    const steps = buildGateSteps({
      runSuffix: "abc123",
      toolkitBaseUrl: "http://127.0.0.1:9999",
      proofPort: 8811,
    });
    expect(steps.some((s) => s.id === "conformance_signature")).toBe(true);
    const toolkit = steps.find((s) => s.id === "toolkit_tests");
    expect(toolkit?.args.join(" ")).toContain("--baseUrl http://127.0.0.1:9999 --runSuffix abc123");
    const proof = steps.find((s) => s.id === "proof_p1_self_contained");
    expect(proof?.args.join(" ")).toContain("--reportDir apps/evaluator/reports/latest_abc123");
    expect(proof?.args.join(" ")).toContain("--selfContainedPort 8811");
  });

  it("summarizes results", () => {
    const summary = summarizeResults([
      { id: "a", ok: true },
      { id: "b", ok: false },
      { id: "c", ok: true },
    ]);
    expect(summary.ok).toBe(false);
    expect(summary.failed_count).toBe(1);
    expect(summary.failed_steps).toEqual(["b"]);
  });

  it("runs with injected step runner and writes report", async () => {
    const writes = [];
    const payload = await runReleaseGate(
      {
        runSuffix: "x1",
        toolkitBaseUrl: "http://127.0.0.1:8796",
        proofPort: 8798,
        reportOut: "tmp/report.json",
        failFast: false,
      },
      {
        runStep: async (step) => ({ id: step.id, ok: step.id !== "policy_gate_e2e", exit_code: step.id === "policy_gate_e2e" ? 1 : 0 }),
        writeReport: (out, data) => writes.push({ out, data }),
      }
    );
    expect(payload.summary.ok).toBe(false);
    expect(payload.summary.failed_steps).toContain("policy_gate_e2e");
    expect(writes).toHaveLength(1);
    expect(writes[0].out).toBe("tmp/report.json");
  });

  it("renders human output", () => {
    const okView = renderCliMessages(
      {
        report_out: "x.json",
        summary: { ok: true, passed: 10, total: 10, failed_steps: [] },
      },
      false
    );
    expect(okView.channel).toBe("stdout");
    const failView = renderCliMessages(
      {
        report_out: "x.json",
        summary: { ok: false, passed: 9, total: 10, failed_steps: ["proof_p1_self_contained"] },
      },
      false
    );
    expect(failView.channel).toBe("stderr");
    expect(failView.lines.join(" ")).toContain("proof_p1_self_contained");
  });
});
