import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildNpmSbomArgs, cliMain, parseSbomCliArgs, runSbom } from "./sbom.mjs";

describe("sbom script", () => {
  it("parses defaults and normalized format", () => {
    const parsed = parseSbomCliArgs(["node", "scripts/sbom.mjs", "--format", "unknown"]);
    expect(parsed.format).toBe("cyclonedx");
    expect(parsed.omit).toBe("dev");
    expect(parsed.out).toBeNull();
  });

  it("builds npm sbom args with explicit format and omit", () => {
    const args = buildNpmSbomArgs({ format: "spdx", omit: "optional", out: null });
    expect(args).toEqual(["sbom", "--omit", "optional", "--sbom-format", "spdx"]);
  });

  it("writes sbom to out path when requested", () => {
    const out = path.join(".agent-qa", "sbom-test", "cyclonedx.json");
    const result = runSbom(
      { format: "cyclonedx", omit: "dev", out, help: false },
      {
        execFn: () => '{"bomFormat":"CycloneDX"}\n',
      }
    );
    expect(result.outPath?.endsWith(path.join(".agent-qa", "sbom-test", "cyclonedx.json"))).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);
  });

  it("returns non-zero in cliMain when npm sbom command throws", () => {
    const code = cliMain(["node", "scripts/sbom.mjs", "--format", "spdx"], {
      execFn: () => {
        throw new Error("boom");
      },
    });
    expect(code).toBe(1);
  });
});

