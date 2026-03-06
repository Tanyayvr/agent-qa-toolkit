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
      const res = await runValidate(["--cases", casesPath, "--profile", "quality", "--maxWeakExpectedRate", "0.2"]);
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
      const res = await runValidate(["--cases", casesPath, "--profile", "quality", "--maxWeakExpectedRate", "0.2"]);
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
      ]);
      expect(res.code).toBe(0);
      const parsed = JSON.parse(res.stdout.trim()) as { tool_evidence_missing_cases?: number };
      expect(parsed.tool_evidence_missing_cases).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
