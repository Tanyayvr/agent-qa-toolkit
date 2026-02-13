// apps/evaluator/src/redactionCheck.test.ts
import { describe, expect, it } from "vitest";
import { findUnredactedMarkers } from "./redactionCheck";

describe("findUnredactedMarkers", () => {
  it("detects standard markers", () => {
    const text = "Contact: user@example.com CUST-123 T-99 MSG-1";
    const hits = findUnredactedMarkers(text, "internal_only").sort();
    expect(hits).toEqual(["customer_id", "email", "message_id", "ticket_id"].sort());
  });

  it("detects token-like markers only for transferable", () => {
    const text = "token_abcdef123456";
    expect(findUnredactedMarkers(text, "internal_only")).toEqual([]);
    expect(findUnredactedMarkers(text, "transferable")).toEqual(["token"]);
  });
});
