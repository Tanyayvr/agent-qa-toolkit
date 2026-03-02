import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { CliUsageError } from "cli-utils";
import { runVendorBridgeCli } from "./cli";

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "vendor-bridge-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("vendor-bridge cli", () => {
  it("converts promptfoo payload into bridge run json", () => {
    withTempDir((dir) => {
      const inputPath = join(dir, "promptfoo.json");
      const outPath = join(dir, "promptfoo.bridge.json");

      writeFileSync(
        inputPath,
        JSON.stringify(
          {
            results: [
              {
                id: "case_1",
                gradingResult: { pass: true },
                assertionResults: [{ assertion: { type: "json_schema" }, pass: true }],
              },
            ],
          },
          null,
          2
        ),
        "utf-8"
      );

      runVendorBridgeCli([
        "node",
        "bridge",
        "convert",
        "--vendor",
        "promptfoo",
        "--in",
        inputPath,
        "--out",
        outPath,
        "--runId",
        "pf-base",
      ]);

      const out = JSON.parse(readFileSync(outPath, "utf-8")) as { vendor: string; run_id: string; stats: { total_cases: number } };
      expect(out.vendor).toBe("promptfoo");
      expect(out.run_id).toBe("pf-base");
      expect(out.stats.total_cases).toBe(1);
    });
  });

  it("builds baseline/new diff report", () => {
    withTempDir((dir) => {
      const basePath = join(dir, "base.bridge.json");
      const newPath = join(dir, "new.bridge.json");
      const diffPath = join(dir, "diff.json");

      writeFileSync(
        basePath,
        JSON.stringify(
          {
            vendor: "promptfoo",
            run_id: "base",
            created_at: 1,
            stats: { total_cases: 1, passed_cases: 1, failed_cases: 0, weak_expected_cases: 0, pass_rate: 1 },
            cases: [
              {
                case_id: "c1",
                title: "case",
                pass: true,
                assertions: [{ name: "json_schema", pass: true }],
                weak_expected: false,
                gate_recommendation: "none",
                risk_level: "low",
              },
            ],
          },
          null,
          2
        ),
        "utf-8"
      );

      writeFileSync(
        newPath,
        JSON.stringify(
          {
            vendor: "promptfoo",
            run_id: "new",
            created_at: 2,
            stats: { total_cases: 1, passed_cases: 0, failed_cases: 1, weak_expected_cases: 0, pass_rate: 0 },
            cases: [
              {
                case_id: "c1",
                title: "case",
                pass: false,
                assertions: [{ name: "json_schema", pass: false }],
                weak_expected: false,
                gate_recommendation: "block",
                risk_level: "low",
              },
            ],
          },
          null,
          2
        ),
        "utf-8"
      );

      runVendorBridgeCli([
        "node",
        "bridge",
        "diff",
        "--baseline",
        basePath,
        "--candidate",
        newPath,
        "--out",
        diffPath,
        "--runId",
        "demo-diff",
      ]);

      const diff = JSON.parse(readFileSync(diffPath, "utf-8")) as {
        run_id: string;
        summary: { regressions: number; block_cases: number };
      };
      expect(diff.run_id).toBe("demo-diff");
      expect(diff.summary.regressions).toBe(1);
      expect(diff.summary.block_cases).toBe(1);
    });
  });

  it("converts deepeval and giskard payloads through vendor switch branches", () => {
    withTempDir((dir) => {
      const deepIn = join(dir, "deep.json");
      const deepOut = join(dir, "deep.bridge.json");
      writeFileSync(
        deepIn,
        JSON.stringify({
          test_results: [
            {
              name: "case_1",
              success: true,
              metrics: [{ name: "json_schema", pass: true }],
            },
          ],
        }),
        "utf-8"
      );
      runVendorBridgeCli([
        "node",
        "bridge",
        "convert",
        "--vendor",
        "deepeval",
        "--in",
        deepIn,
        "--out",
        deepOut,
      ]);
      const deep = JSON.parse(readFileSync(deepOut, "utf-8")) as { vendor: string };
      expect(deep.vendor).toBe("deepeval");

      const giskIn = join(dir, "gisk.json");
      const giskOut = join(dir, "gisk.bridge.json");
      writeFileSync(
        giskIn,
        JSON.stringify({
          issues: [
            {
              id: "issue_1",
              passed: false,
              severity: "high",
            },
          ],
        }),
        "utf-8"
      );
      runVendorBridgeCli([
        "node",
        "bridge",
        "convert",
        "--vendor",
        "giskard",
        "--in",
        giskIn,
        "--out",
        giskOut,
      ]);
      const gisk = JSON.parse(readFileSync(giskOut, "utf-8")) as { vendor: string };
      expect(gisk.vendor).toBe("giskard");
    });
  });

  it("throws usage error for invalid command", () => {
    expect(() => runVendorBridgeCli(["node", "bridge", "unknown"]))
      .toThrowError(CliUsageError);
  });

  it("throws usage error for missing required args", () => {
    expect(() => runVendorBridgeCli(["node", "bridge", "convert", "--vendor", "promptfoo"]))
      .toThrowError(CliUsageError);
  });

  it("prints help for --help without throwing", () => {
    const logs: string[] = [];
    runVendorBridgeCli(
      ["node", "bridge", "--help"],
      {
        readFile: () => "",
        writeFile: () => undefined,
        log: (msg) => logs.push(msg),
      }
    );
    expect(logs.join("\n")).toContain("Usage: agent-qa bridge");
  });

  it("fails on invalid --vendor and invalid --createdAtMs", () => {
    withTempDir((dir) => {
      const inputPath = join(dir, "in.json");
      const outPath = join(dir, "out.json");
      writeFileSync(inputPath, JSON.stringify({ results: [] }), "utf-8");

      expect(() =>
        runVendorBridgeCli(["node", "bridge", "convert", "--vendor", "unknown", "--in", inputPath, "--out", outPath])
      ).toThrowError(CliUsageError);

      expect(() =>
        runVendorBridgeCli([
          "node",
          "bridge",
          "convert",
          "--vendor",
          "promptfoo",
          "--in",
          inputPath,
          "--out",
          outPath,
          "--createdAtMs",
          "abc",
        ])
      ).toThrowError(CliUsageError);
    });
  });

  it("fails diff when baseline/candidate are not valid bridge runs", () => {
    withTempDir((dir) => {
      const basePath = join(dir, "base.json");
      const newPath = join(dir, "new.json");
      const outPath = join(dir, "out.json");
      writeFileSync(basePath, JSON.stringify({ bad: true }), "utf-8");
      writeFileSync(newPath, JSON.stringify({ bad: true }), "utf-8");

      expect(() =>
        runVendorBridgeCli([
          "node",
          "bridge",
          "diff",
          "--baseline",
          basePath,
          "--candidate",
          newPath,
          "--out",
          outPath,
        ])
      ).toThrow("Invalid bridge run");
    });
  });

  it("fails when --createdAtMs flag is present without value", () => {
    expect(() =>
      runVendorBridgeCli([
        "node",
        "bridge",
        "convert",
        "--vendor",
        "promptfoo",
        "--in",
        "/tmp/in.json",
        "--out",
        "/tmp/out.json",
        "--createdAtMs",
      ])
    ).toThrow();

    expect(() =>
      runVendorBridgeCli([
        "node",
        "bridge",
        "diff",
        "--baseline",
        "/tmp/base.json",
        "--candidate",
        "/tmp/new.json",
        "--out",
        "/tmp/out.json",
        "--createdAtMs",
      ])
    ).toThrow();
  });

  it("fails on invalid json payload for convert", () => {
    const io = {
      readFile: () => "{",
      writeFile: () => undefined,
      log: () => undefined,
    };
    expect(() =>
      runVendorBridgeCli(
        ["node", "bridge", "convert", "--vendor", "promptfoo", "--in", "input.json", "--out", "out.json"],
        io
      )
    ).toThrow("Failed to parse JSON");
  });

  it("fails on unknown options in convert and diff commands", () => {
    expect(() =>
      runVendorBridgeCli([
        "node",
        "bridge",
        "convert",
        "--vendor",
        "promptfoo",
        "--in",
        "in.json",
        "--out",
        "out.json",
        "--unknown",
        "x",
      ])
    ).toThrowError(CliUsageError);

    expect(() =>
      runVendorBridgeCli([
        "node",
        "bridge",
        "diff",
        "--baseline",
        "base.json",
        "--candidate",
        "new.json",
        "--out",
        "out.json",
        "--unknown",
        "x",
      ])
    ).toThrowError(CliUsageError);
  });

  it("prints help when no command is provided", () => {
    const logs: string[] = [];
    runVendorBridgeCli(
      ["node", "bridge"],
      {
        readFile: () => "",
        writeFile: () => undefined,
        log: (msg) => logs.push(msg),
      }
    );
    expect(logs.join("\n")).toContain("Commands:");
  });

  it("accepts --createdAtMs in diff command", () => {
    withTempDir((dir) => {
      const basePath = join(dir, "base.bridge.json");
      const newPath = join(dir, "new.bridge.json");
      const diffPath = join(dir, "diff.json");

      const bridge = {
        vendor: "promptfoo",
        run_id: "run-1",
        created_at: 1,
        stats: { total_cases: 0, passed_cases: 0, failed_cases: 0, weak_expected_cases: 0, pass_rate: 0 },
        cases: [],
      };
      writeFileSync(basePath, JSON.stringify(bridge), "utf-8");
      writeFileSync(newPath, JSON.stringify({ ...bridge, run_id: "run-2" }), "utf-8");

      runVendorBridgeCli([
        "node",
        "bridge",
        "diff",
        "--baseline",
        basePath,
        "--candidate",
        newPath,
        "--out",
        diffPath,
        "--createdAtMs",
        "12345",
      ]);
      const diff = JSON.parse(readFileSync(diffPath, "utf-8")) as { created_at: number };
      expect(diff.created_at).toBe(12345);
    });
  });
});
