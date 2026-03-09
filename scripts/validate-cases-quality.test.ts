import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

function runValidate(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile("node", ["scripts/validate-cases-quality.mjs", ...args], { cwd: process.cwd() }, (error, stdout, stderr) => {
      const code = (error as NodeJS.ErrnoException & { code?: number } | null)?.code;
      resolve({
        code: typeof code === "number" ? code : 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });
  });
}

describe("validate-cases-quality", () => {
  it("passes quality profile when weak expected rate is below threshold", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-quality-ok-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            { id: "c1", expected: { must_include: ["ok"] } },
            { id: "c2", expected: { must_include: ["ok"], must_not_include: ["err"] } },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--maxWeakExpectedRate",
        "0.2",
        "--requireSemanticQuality",
        "0",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(0);
      const parsed = JSON.parse(res.stdout.trim()) as { weak_expected_rate?: number };
      expect(parsed.weak_expected_rate).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails quality profile when weak expected rate is above threshold", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-quality-bad-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            { id: "c1", expected: {} },
            { id: "c2", expected: { must_include: ["ok"] } },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--maxWeakExpectedRate",
        "0.2",
        "--requireSemanticQuality",
        "0",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("quality campaign uses weak expectations above threshold");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows weak expectations for infra profile", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-infra-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            { id: "c1", expected: {} },
            { id: "c2", expected: {} },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate(["--cases", casesPath, "--profile", "infra"]);
      expect(res.code).toBe(0);
      const parsed = JSON.parse(res.stdout.trim()) as { weak_expected_rate?: number };
      expect(parsed.weak_expected_rate).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails quality profile when tool evidence is required but missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-tool-evidence-missing-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            { id: "c1", expected: { must_include: ["ok"] } },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireToolEvidence",
        "1",
        "--requireSemanticQuality",
        "0",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("requires tool evidence assertions");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("passes quality profile when required tool evidence is present", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-tool-evidence-ok-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            { id: "c1", expected: { tool_required: ["cli_agent_exec"] } },
            { id: "c2", expected: { tool_sequence: ["cli_agent_exec"] } },
            { id: "c3", expected: { tool_telemetry: { require_non_wrapper_calls: true } } },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireToolEvidence",
        "1",
        "--requireSemanticQuality",
        "0",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(0);
      const parsed = JSON.parse(res.stdout.trim()) as { tool_evidence_missing_cases?: number };
      expect(parsed.tool_evidence_missing_cases).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails quality profile when strong telemetry contract is required but missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-strong-telemetry-missing-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            { id: "c1", expected: { tool_required: ["cli_agent_exec"] } },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireStrongTelemetry",
        "1",
        "--requireSemanticQuality",
        "0",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("requires strong telemetry contract");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("passes quality profile when strong telemetry contract is present", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-strong-telemetry-ok-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            {
              id: "c1",
              expected: {
                tool_telemetry: {
                  require_non_wrapper_calls: true,
                  allowed_modes: ["native", "inferred"],
                  min_tool_calls: 2,
                  min_tool_results: 2,
                  require_call_result_pairs: true,
                },
              },
            },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireStrongTelemetry",
        "1",
        "--requireSemanticQuality",
        "0",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(0);
      const parsed = JSON.parse(res.stdout.trim()) as { strong_telemetry_missing_cases?: number };
      expect(parsed.strong_telemetry_missing_cases).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails quality profile when semantic quality is required for lexical expectations but missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-semantic-missing-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            {
              id: "c1",
              expected: {
                must_include: ["offline evidence"],
              },
            },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireSemanticQuality",
        "1",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("requires semantic quality contract");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("passes quality profile when semantic quality contract is present", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-semantic-ok-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            {
              id: "c1",
              expected: {
                must_include: ["offline evidence"],
                semantic: {
                  required_concepts: [["offline"], ["evidence"]],
                },
              },
            },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireSemanticQuality",
        "1",
        "--requireAssumptionState",
        "0",
      ]);
      expect(res.code).toBe(0);
      const parsed = JSON.parse(res.stdout.trim()) as { semantic_quality_missing_cases?: number };
      expect(parsed.semantic_quality_missing_cases).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails by default when lexical expectations have no semantic contract", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-semantic-default-missing-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            { id: "c1", expected: { must_include: ["offline"] } },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate(["--cases", casesPath, "--profile", "quality", "--requireAssumptionState", "0"]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("requires semantic quality contract");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails semantic contract when reference_texts has no profile or thresholds", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-semantic-reference-calib-missing-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            {
              id: "c1",
              expected: {
                must_include: ["offline"],
                semantic: {
                  reference_texts: ["agent works offline with evidence"],
                },
              },
            },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate(["--cases", casesPath, "--profile", "quality", "--requireAssumptionState", "0"]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("requires semantic quality contract");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails quality profile when assumption-state contract is required but missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-assumption-missing-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            {
              id: "c1",
              expected: {
                must_include: ["offline evidence"],
                semantic: { required_concepts: [["offline"]] },
              },
            },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireAssumptionState",
        "1",
      ]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("requires assumption-state contract");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("passes quality profile when assumption-state contract is present", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-assumption-ok-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            {
              id: "c1",
              expected: {
                tool_required: ["search"],
                assumption_state: {
                  required: true,
                  min_selected_candidates: 1,
                  max_rejected_candidates: 50,
                  require_reason_codes_for_rejected: true,
                },
              },
            },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
        "--requireAssumptionState",
        "1",
        "--requireSemanticQuality",
        "0",
      ]);
      expect(res.code).toBe(0);
      const parsed = JSON.parse(res.stdout.trim()) as { assumption_state_missing_cases?: number };
      expect(parsed.assumption_state_missing_cases).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails by default when expectation-bearing case has no assumption-state contract", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-cases-assumption-default-missing-"));
    try {
      const casesPath = path.join(root, "cases.json");
      await writeFile(
        casesPath,
        JSON.stringify(
          [
            {
              id: "c1",
              expected: {
                must_include: ["offline evidence"],
                semantic: { required_concepts: [["offline"], ["evidence"]] },
              },
            },
          ],
          null,
          2
        ),
        "utf8"
      );
      const res = await runValidate([
        "--cases",
        casesPath,
        "--profile",
        "quality",
      ]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain("requires assumption-state contract");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
