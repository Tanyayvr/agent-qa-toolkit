import { describe, expect, it } from "vitest";
import {
  __test__,
  compareBridgeRuns,
  parseDeepEvalRun,
  parseGiskardRun,
  parsePromptfooRun,
} from "./index";

describe("vendor-bridge", () => {
  it("parses Promptfoo result rows into canonical bridge run", () => {
    const run = parsePromptfooRun(
      {
        results: [
          {
            id: "case-login",
            testCase: {
              description: "login should succeed",
              vars: { user: "demo" },
              expectedOutput: "ok",
            },
            prompt: { raw: "login user demo" },
            response: { output: "ok" },
            gradingResult: { pass: true },
            assertionResults: [
              {
                assertion: { type: "equals" },
                pass: true,
              },
            ],
          },
        ],
      },
      { runId: "pf-run" }
    );

    expect(run.vendor).toBe("promptfoo");
    expect(run.run_id).toBe("pf-run");
    expect(run.cases).toHaveLength(1);
    const first = run.cases.at(0);
    expect(first?.case_id).toBe("case-login");
    expect(first?.assertions.at(0)?.name).toBe("equals");
    expect(first?.gate_recommendation).toBe("none");
    expect(run.stats.pass_rate).toBe(1);
  });

  it("parses DeepEval metrics and marks weak expectations conservatively", () => {
    const run = parseDeepEvalRun(
      {
        test_results: [
          {
            name: "summary_case",
            input: "summarize text",
            actual_output: "short summary",
            expected_output: "summary",
            metrics: [
              {
                name: "semantic_similarity",
                success: true,
                score: 0.84,
                threshold: 0.8,
              },
            ],
            success: true,
          },
        ],
      },
      { runId: "de-run" }
    );

    expect(run.vendor).toBe("deepeval");
    expect(run.cases).toHaveLength(1);
    const first = run.cases.at(0);
    expect(first?.assertions.at(0)?.name).toBe("semantic_similarity");
    expect(first?.weak_expected).toBe(true);
    expect(first?.gate_recommendation).toBe("require_approval");
  });

  it("parses Giskard issue payloads and derives risk-level gate", () => {
    const run = parseGiskardRun(
      {
        issues: [
          {
            id: "prompt-injection-1",
            title: "Prompt injection risk",
            severity: "high",
            details: "system prompt leak",
            passed: false,
          },
        ],
      },
      { runId: "gk-run" }
    );

    expect(run.vendor).toBe("giskard");
    expect(run.cases).toHaveLength(1);
    const first = run.cases.at(0);
    expect(first?.risk_level).toBe("high");
    expect(first?.gate_recommendation).toBe("block");
    expect(run.stats.failed_cases).toBe(1);
  });

  it("compares baseline vs candidate runs and reports regressions/improvements", () => {
    const baseline = parsePromptfooRun(
      {
        results: [
          {
            id: "c1",
            gradingResult: { pass: true },
            assertionResults: [{ assertion: { type: "equals" }, pass: true }],
          },
          {
            id: "c2",
            gradingResult: { pass: false },
            assertionResults: [{ assertion: { type: "equals" }, pass: false }],
          },
        ],
      },
      { runId: "baseline" }
    );

    const candidate = parsePromptfooRun(
      {
        results: [
          {
            id: "c1",
            gradingResult: { pass: false },
            assertionResults: [{ assertion: { type: "equals" }, pass: false }],
          },
          {
            id: "c2",
            gradingResult: { pass: true },
            assertionResults: [{ assertion: { type: "equals" }, pass: true }],
          },
          {
            id: "c3",
            gradingResult: { pass: true },
            assertionResults: [{ assertion: { type: "contains" }, pass: true }],
          },
        ],
      },
      { runId: "candidate" }
    );

    const diff = compareBridgeRuns({ baseline, candidate, runId: "bridge-diff" });

    expect(diff.run_id).toBe("bridge-diff");
    expect(diff.summary.total_cases).toBe(3);
    expect(diff.summary.regressions).toBe(1);
    expect(diff.summary.improvements).toBe(1);
    expect(diff.summary.new_cases).toBe(1);
    expect(diff.summary.block_cases).toBe(1);
    expect(diff.summary.require_approval_cases).toBe(1);
    expect(diff.items.find((item) => item.case_id === "c1")?.status).toBe("regression");
    expect(diff.items.find((item) => item.case_id === "c2")?.status).toBe("improvement");
    expect(diff.items.find((item) => item.case_id === "c3")?.gate_recommendation).toBe("require_approval");
  });

  it("throws helpful errors when payload has no rows", () => {
    expect(() => parsePromptfooRun({})).toThrow("promptfoo payload has no result rows");
    expect(() => parseDeepEvalRun({})).toThrow("deepeval payload has no result rows");
    expect(() => parseGiskardRun({})).toThrow("giskard payload has no test or issue rows");
  });

  it("keeps strict gate semantics for pass/fail and weak assertions", () => {
    expect(__test__.deriveGate(false, "low", false)).toBe("block");
    expect(__test__.deriveGate(true, "high", false)).toBe("require_approval");
    expect(__test__.deriveGate(true, "low", true)).toBe("require_approval");
    expect(__test__.deriveGate(true, "low", false)).toBe("none");

    const weak = __test__.computeWeakExpected([{ name: "semantic_similarity", pass: true }]);
    const strong = __test__.computeWeakExpected([{ name: "json_schema", pass: true }]);
    expect(weak).toBe(true);
    expect(strong).toBe(false);
  });

  it("supports alternate promptfoo payload shapes and fallback ids", () => {
    const run = parsePromptfooRun(
      {
        table: {
          results: [
            {
              pass: true,
              output: { text: "ok" },
              assertions: [{ name: "json_schema", pass: true }],
            },
          ],
        },
      },
      { defaultCasePrefix: "pfx" }
    );

    expect(run.cases).toHaveLength(1);
    expect(run.cases[0]?.case_id).toBe("pfx_1");
    expect(run.cases[0]?.title).toBe("pfx_1");
    expect(run.cases[0]?.output).toContain("text");
  });

  it("parses deepeval object metrics and score/threshold fallback pass logic", () => {
    const run = parseDeepEvalRun({
      testResults: [
        {
          id: "m1",
          metrics: {
            exactness: { score: 0.9, threshold: 0.8 },
            policy: { success: false, reason: "policy violation" },
          },
        },
      ],
    });

    expect(run.cases).toHaveLength(1);
    expect(run.cases[0]?.assertions).toHaveLength(2);
    expect(run.cases[0]?.pass).toBe(false);
    expect(run.cases[0]?.gate_recommendation).toBe("block");
  });

  it("parses giskard issue rows and passed status", () => {
    const run = parseGiskardRun({
      findings: [
        {
          name: "safe_case",
          status: "passed",
          severity: "medium",
        },
      ],
    });

    expect(run.cases).toHaveLength(1);
    expect(run.cases[0]?.pass).toBe(true);
    expect(run.cases[0]?.risk_level).toBe("medium");
    expect(run.cases[0]?.gate_recommendation).toBe("require_approval");
  });

  it("handles missing/new cases and gate derivation in bridge diff", () => {
    const baseline = parsePromptfooRun(
      {
        results: [
          { id: "existing", gradingResult: { pass: true }, assertionResults: [{ assertion: { type: "json_schema" }, pass: true }] },
          { id: "missing_in_new", gradingResult: { pass: true }, assertionResults: [{ assertion: { type: "json_schema" }, pass: true }] },
        ],
      },
      { runId: "b" }
    );
    const candidate = parsePromptfooRun(
      {
        results: [
          { id: "existing", gradingResult: { pass: true }, assertionResults: [{ assertion: { type: "json_schema" }, pass: true }] },
          { id: "brand_new", gradingResult: { pass: false }, assertionResults: [{ assertion: { type: "contains" }, pass: false }] },
        ],
      },
      { runId: "n" }
    );

    const diff = compareBridgeRuns({ baseline, candidate, runId: "diff-missing-new" });
    expect(diff.items.find((item) => item.case_id === "missing_in_new")?.status).toBe("missing_new_case");
    expect(diff.items.find((item) => item.case_id === "missing_in_new")?.gate_recommendation).toBe("block");
    expect(diff.items.find((item) => item.case_id === "brand_new")?.status).toBe("new_case");
    expect(diff.summary.missing_new_cases).toBe(1);
    expect(diff.summary.new_cases).toBe(1);
  });

  it("parses assertion rows with nested result payloads", () => {
    const parsed = __test__.parseAssertionRows([
      { assertion: { name: "schema" }, result: { pass: true, score: 1 } },
      { metric_name: "policy", success: false, reason: "violation" },
      { foo: "bar" },
    ]);
    expect(parsed[0]).toMatchObject({ name: "schema", pass: true, score: 1 });
    expect(parsed[1]).toMatchObject({ name: "policy", pass: false, reason: "violation" });
    expect(parsed[2]?.name).toBe("assertion_3");
  });
});
