// apps/runner/src/sanitize.test.ts
import { describe, expect, it } from "vitest";
import { sanitizeValue } from "./sanitize";

describe("sanitizeValue", () => {
  it("redacts common identifiers and emails", () => {
    const input = {
      email: "User.Test+qa@example.com",
      customer: "CUST-1234",
      ticket: "T-9999",
      msg: "MSG-42",
      token: "token_abcdef123456",
      nested: ["keep", "CUST-7777", { email: "a@b.com" }],
    };

    const out = sanitizeValue(input, "transferable");
    expect(out).toEqual({
      email: "[redacted_email]",
      customer: "CUST-REDACTED",
      ticket: "T-REDACTED",
      msg: "MSG-REDACTED",
      token: "[redacted_token]",
      nested: ["keep", "CUST-REDACTED", { email: "[redacted_email]" }],
    });
  });

  it("preserves values when preset is none", () => {
    const input = { email: "u@x.com", id: "CUST-1", token: "token_aaaabbbb" };
    const out = sanitizeValue(input, "none");
    expect(out).toEqual(input);
  });
});
