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

  it("redacts extended markers for transferable_extended", () => {
    const input = {
      ip: "192.168.1.10",
      phone: "+1 (415) 555-1212",
      cc: "4111 1111 1111 1111",
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWEifQ.sgn1234567890",
    };
    const out = sanitizeValue(input, "transferable_extended");
    expect(out).toEqual({
      ip: "[redacted_ip]",
      phone: "[redacted_phone]",
      cc: "[redacted_cc]",
      jwt: "[redacted_jwt]",
    });
  });

  it("preserves values when preset is none", () => {
    const input = { email: "u@x.com", id: "CUST-1", token: "token_aaaabbbb" };
    const out = sanitizeValue(input, "none");
    expect(out).toEqual(input);
  });
});
