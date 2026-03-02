import { describe, expect, it } from "vitest";
import { sanitizeValue } from "./index";

describe("redaction", () => {
  it("masks valid credit card numbers in transferable_extended", () => {
    const input = "card=4111 1111 1111 1111";
    const out = sanitizeValue(input, "transferable_extended");
    expect(out).toContain("[redacted_cc]");
  });

  it("does not mask invalid credit-card-like numbers failing Luhn", () => {
    const input = "card=4111 1111 1111 1112";
    const out = sanitizeValue(input, "transferable_extended");
    expect(out).toContain("4111 1111 1111 1112");
    expect(out).not.toContain("[redacted_cc]");
  });

  it("redacts nested values consistently", () => {
    const input = {
      contact: "alice@example.com",
      token: "sk-abcdef1234567890",
      phone: "+1 (415) 555-0199",
    };
    const out = sanitizeValue(input, "transferable_extended");
    expect(out.contact).toBe("[redacted_email]");
    expect(out.token).toBe("[redacted_token]");
    expect(out.phone).toBe("[redacted_phone]");
  });
});
