import { describe, expect, it } from "vitest";
import { boolToInt, numOrNull, strOrNull } from "./utils";

describe("trending utils", () => {
  it("boolToInt handles true/false/nullish", () => {
    expect(boolToInt(true)).toBe(1);
    expect(boolToInt(false)).toBe(0);
    expect(boolToInt(null)).toBeNull();
    expect(boolToInt(undefined)).toBeNull();
  });

  it("numOrNull returns finite numbers only", () => {
    expect(numOrNull(42)).toBe(42);
    expect(numOrNull(0)).toBe(0);
    expect(numOrNull(Number.NaN)).toBeNull();
    expect(numOrNull("42")).toBeNull();
  });

  it("strOrNull returns non-empty strings only", () => {
    expect(strOrNull("ok")).toBe("ok");
    expect(strOrNull("")).toBeNull();
    expect(strOrNull(123)).toBeNull();
  });
});
