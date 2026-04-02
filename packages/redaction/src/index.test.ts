import { describe, expect, it } from "vitest";
import { collectCustomRedactionPatternHits, sanitizeValue } from "./index";

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

  it("redacts IBAN and BIC/SWIFT markers in transferable_extended", () => {
    const input = "iban=DE89 3704 0044 0532 0130 00 bic=DEUTDEFF";
    const out = sanitizeValue(input, "transferable_extended");
    expect(out).toContain("[redacted_iban]");
    expect(out).toContain("[redacted_bic_swift]");
  });

  it("applies custom redaction patterns from env configuration", () => {
    const input = "Account holder IBAN visible and claim_ref=FIN-12345";
    const processEnv = {
      REDACTION_CUSTOM_PATTERNS_JSON: JSON.stringify([
        {
          name: "claim_ref",
          pattern: "\\bFIN-\\d{5}\\b",
          replacement: "[redacted_claim_ref]",
          presets: ["transferable_extended"],
        },
      ]),
    };
    const out = sanitizeValue(input, "transferable_extended", { processEnv });
    expect(out).toContain("[redacted_claim_ref]");
    expect(collectCustomRedactionPatternHits(input, "transferable_extended", { processEnv })).toEqual(["claim_ref"]);
  });
});
