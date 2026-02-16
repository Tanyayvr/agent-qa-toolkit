import { describe, it, expect } from "vitest";
import { normalizeBaseUrl, parseOnlyCaseIdsRaw } from "./runner";

describe("runner helpers", () => {
  it("normalizeBaseUrl trims trailing slash", () => {
    expect(normalizeBaseUrl("http://localhost:8787/")).toBe("http://localhost:8787");
    expect(normalizeBaseUrl("http://localhost:8787")).toBe("http://localhost:8787");
  });

  it("parseOnlyCaseIdsRaw splits and trims", () => {
    expect(parseOnlyCaseIdsRaw("a,b, c")).toEqual(["a", "b", "c"]);
    expect(parseOnlyCaseIdsRaw("   ")).toBeNull();
    expect(parseOnlyCaseIdsRaw(null)).toBeNull();
  });
});
