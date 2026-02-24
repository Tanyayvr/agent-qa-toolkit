// packages/shared-types/src/token-usage.test.ts
//
// Unit tests for TokenUsage type structure.
// Confirms: backward-compat (no token_usage), full TokenUsage, loop detection.

import { describe, it, expect } from "vitest";
import type { AgentResponse, TokenUsage } from "./index";

describe("TokenUsage type", () => {
    it("AgentResponse is valid without token_usage (backward compat)", () => {
        const resp: AgentResponse = {
            case_id: "test_001",
            version: "new",
            final_output: { content_type: "text", content: "ok" },
        };
        expect(resp.token_usage).toBeUndefined();
    });

    it("AgentResponse accepts full TokenUsage", () => {
        const usage: TokenUsage = {
            input_tokens: 4200,
            output_tokens: 1800,
            total_tokens: 6000,
            tool_call_count: 18,
            loop_detected: false,
        };
        const resp: AgentResponse = {
            case_id: "test_002",
            version: "new",
            final_output: { content_type: "text", content: "ok" },
            token_usage: usage,
        };
        expect(resp.token_usage?.input_tokens).toBe(4200);
        expect(resp.token_usage?.output_tokens).toBe(1800);
        expect(resp.token_usage?.total_tokens).toBe(6000);
        expect(resp.token_usage?.tool_call_count).toBe(18);
        expect(resp.token_usage?.loop_detected).toBe(false);
    });

    it("TokenUsage: loop_detected signals runaway", () => {
        const resp: AgentResponse = {
            case_id: "test_003",
            version: "baseline",
            final_output: { content_type: "text", content: "partial result" },
            token_usage: {
                tool_call_count: 95,
                loop_detected: true,
            },
        };
        expect(resp.token_usage?.loop_detected).toBe(true);
        expect(resp.token_usage?.tool_call_count).toBe(95);
    });

    it("TokenUsage allows partial fields (e.g. only input_tokens)", () => {
        const resp: AgentResponse = {
            case_id: "test_004",
            version: "new",
            final_output: { content_type: "json", content: {} },
            token_usage: { input_tokens: 500 },
        };
        expect(resp.token_usage?.input_tokens).toBe(500);
        expect(resp.token_usage?.output_tokens).toBeUndefined();
    });
});
