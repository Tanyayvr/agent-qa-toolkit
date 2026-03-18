import { describe, expect, it } from "vitest";

import {
  classDefaultCapMs,
  classDefaultMaxFactor,
  classDefaultTimeoutMs,
  detectRuntimeClass,
} from "./runtime-policy.mjs";

describe("runtime-policy", () => {
  it("classifies heavy_mcp_agent from topology when MCP or multiprocess is enabled", () => {
    expect(detectRuntimeClass({ providerLocation: "local", usesMcp: "1" })).toEqual({
      runtime_class: "heavy_mcp_agent",
      basis: "topology",
    });
    expect(detectRuntimeClass({ providerLocation: "local", multiProcess: "1" })).toEqual({
      runtime_class: "heavy_mcp_agent",
      basis: "topology",
    });
  });

  it("preserves explicit runtime class from profile", () => {
    expect(
      detectRuntimeClass({
        explicitClass: "heavy_mcp_agent",
        providerLocation: "remote",
        usesMcp: "0",
        multiProcess: "0",
        interactive: "0",
      })
    ).toEqual({
      runtime_class: "heavy_mcp_agent",
      basis: "profile",
    });
  });

  it("returns shared defaults for class timeout, cap, and factor", () => {
    expect(classDefaultTimeoutMs("heavy_mcp_agent", "smoke")).toBe(1_800_000);
    expect(classDefaultTimeoutMs("heavy_mcp_agent", "full-lite")).toBe(3_600_000);
    expect(classDefaultTimeoutMs("slow_local_cli", "diagnostic")).toBe(7_200_000);
    expect(classDefaultCapMs("slow_local_cli")).toBe(21_600_000);
    expect(classDefaultMaxFactor("fast_remote")).toBe(3);
  });
});
