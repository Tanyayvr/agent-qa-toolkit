import { describe, it, expect, afterEach } from "vitest";
import { detectSimilarityLoops, detectOutputHashDuplicates, analyzeLoops } from "./loopDetection";
import type { RunEvent } from "shared-types";

const ORIGINAL_ENV = {
    AQ_LOOP_SIMILARITY_WINDOW: process.env.AQ_LOOP_SIMILARITY_WINDOW,
    AQ_LOOP_SIMILARITY_THRESHOLD: process.env.AQ_LOOP_SIMILARITY_THRESHOLD,
};

afterEach(() => {
    if (ORIGINAL_ENV.AQ_LOOP_SIMILARITY_WINDOW === undefined) delete process.env.AQ_LOOP_SIMILARITY_WINDOW;
    else process.env.AQ_LOOP_SIMILARITY_WINDOW = ORIGINAL_ENV.AQ_LOOP_SIMILARITY_WINDOW;
    if (ORIGINAL_ENV.AQ_LOOP_SIMILARITY_THRESHOLD === undefined) delete process.env.AQ_LOOP_SIMILARITY_THRESHOLD;
    else process.env.AQ_LOOP_SIMILARITY_THRESHOLD = ORIGINAL_ENV.AQ_LOOP_SIMILARITY_THRESHOLD;
});

/* ------------------------------------------------------------------ */
/*  Similarity Breaker tests                                           */
/* ------------------------------------------------------------------ */

describe("detectSimilarityLoops", () => {
    it("returns undefined for empty events", () => {
        expect(detectSimilarityLoops([])).toBeUndefined();
    });

    it("returns undefined for a single tool call", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "search", args: { query: "foo" } },
        ];
        expect(detectSimilarityLoops(events)).toBeUndefined();
    });

    it("detects identical-args repeated calls as loop", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "search", args: { query: "help" } },
            { type: "tool_call", ts: 2, call_id: "c2", tool: "search", args: { query: "help" } },
            { type: "tool_call", ts: 3, call_id: "c3", tool: "search", args: { query: "help" } },
        ];
        const result = detectSimilarityLoops(events);
        expect(result).toBeDefined();
        expect(result!.length).toBe(1);
        expect(result![0]!.tool).toBe("search");
        expect(result![0]!.similarity_score).toBe(1);
        expect(result![0]!.call_ids).toEqual(["c1", "c2", "c3"]);
    });

    it("detects nearly-identical args (high overlap) as loop", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "api", args: { url: "/data", page: 1 } },
            { type: "tool_call", ts: 2, call_id: "c2", tool: "api", args: { url: "/data", page: 1 } },
        ];
        const result = detectSimilarityLoops(events);
        expect(result).toBeDefined();
        expect(result![0]!.similarity_score).toBeGreaterThanOrEqual(0.9);
    });

    it("ignores different tools", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "search", args: { query: "help" } },
            { type: "tool_call", ts: 2, call_id: "c2", tool: "browse", args: { url: "example.com" } },
        ];
        expect(detectSimilarityLoops(events)).toBeUndefined();
    });

    it("does not flag sufficiently different args", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "fetch", args: { url: "/a", method: "GET" } },
            { type: "tool_call", ts: 2, call_id: "c2", tool: "fetch", args: { url: "/b", method: "POST", body: "{}" } },
        ];
        expect(detectSimilarityLoops(events)).toBeUndefined();
    });

    it("supports explicit similarity threshold override", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "api", args: { a: 1, b: 2 } },
            { type: "tool_call", ts: 2, call_id: "c2", tool: "api", args: { a: 1, b: 3 } },
            { type: "tool_call", ts: 3, call_id: "c3", tool: "api", args: { a: 1, b: 4 } },
        ];
        expect(detectSimilarityLoops(events)).toBeUndefined();
        const withLowerThreshold = detectSimilarityLoops(events, { threshold: 0.2, window: 3 });
        expect(withLowerThreshold).toBeDefined();
        expect(withLowerThreshold![0]!.tool).toBe("api");
    });

    it("reads similarity config from env vars", () => {
        process.env.AQ_LOOP_SIMILARITY_THRESHOLD = "0.2";
        process.env.AQ_LOOP_SIMILARITY_WINDOW = "3";
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "api", args: { a: 1, b: 2 } },
            { type: "tool_call", ts: 2, call_id: "c2", tool: "api", args: { a: 1, b: 3 } },
            { type: "tool_call", ts: 3, call_id: "c3", tool: "api", args: { a: 1, b: 4 } },
        ];
        const result = detectSimilarityLoops(events);
        expect(result).toBeDefined();
        expect(result![0]!.tool).toBe("api");
    });
});

/* ------------------------------------------------------------------ */
/*  Output Hash Tracking tests                                         */
/* ------------------------------------------------------------------ */

describe("detectOutputHashDuplicates", () => {
    it("returns undefined for empty events", () => {
        expect(detectOutputHashDuplicates([])).toBeUndefined();
    });

    it("returns undefined with only one result", () => {
        const events: RunEvent[] = [
            { type: "tool_result", ts: 1, call_id: "c1", status: "ok", payload_summary: { data: 42 } },
        ];
        expect(detectOutputHashDuplicates(events)).toBeUndefined();
    });

    it("detects identical payload_summary responses", () => {
        const events: RunEvent[] = [
            { type: "tool_result", ts: 1, call_id: "c1", status: "ok", payload_summary: { data: 42 } },
            { type: "tool_result", ts: 2, call_id: "c2", status: "ok", payload_summary: { data: 42 } },
            { type: "tool_result", ts: 3, call_id: "c3", status: "ok", payload_summary: { data: 42 } },
        ];
        const result = detectOutputHashDuplicates(events);
        expect(result).toBeDefined();
        expect(result!.length).toBe(1);
        expect(result![0]!.count).toBe(3);
        expect(result![0]!.call_ids).toEqual(["c1", "c2", "c3"]);
    });

    it("ignores different payloads", () => {
        const events: RunEvent[] = [
            { type: "tool_result", ts: 1, call_id: "c1", status: "ok", payload_summary: { data: 1 } },
            { type: "tool_result", ts: 2, call_id: "c2", status: "ok", payload_summary: { data: 2 } },
            { type: "tool_result", ts: 3, call_id: "c3", status: "ok", payload_summary: { data: 3 } },
        ];
        expect(detectOutputHashDuplicates(events)).toBeUndefined();
    });

    it("detects string payload duplicates", () => {
        const events: RunEvent[] = [
            { type: "tool_result", ts: 1, call_id: "c1", status: "ok", payload_summary: "same output" },
            { type: "tool_result", ts: 2, call_id: "c2", status: "ok", payload_summary: "same output" },
        ];
        const result = detectOutputHashDuplicates(events);
        expect(result).toBeDefined();
        expect(result![0]!.count).toBe(2);
    });
});

/* ------------------------------------------------------------------ */
/*  Combined analyzeLoops tests                                        */
/* ------------------------------------------------------------------ */

describe("analyzeLoops", () => {
    it("returns no loop for undefined events", () => {
        const result = analyzeLoops(undefined);
        expect(result.loop_detected).toBe(false);
        expect(result.loop_details).toBeUndefined();
    });

    it("returns no loop for empty events", () => {
        const result = analyzeLoops([]);
        expect(result.loop_detected).toBe(false);
        expect(result.loop_details).toBeUndefined();
    });

    it("returns no loop for malformed non-array events", () => {
        const result = analyzeLoops({ type: "tool_call" } as unknown);
        expect(result.loop_detected).toBe(false);
        expect(result.loop_details).toBeUndefined();
    });

    it("detects loop when both similarity and hash match", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "api", args: { q: "test" } },
            { type: "tool_result", ts: 2, call_id: "c1", status: "ok", payload_summary: { data: "same" } },
            { type: "tool_call", ts: 3, call_id: "c2", tool: "api", args: { q: "test" } },
            { type: "tool_result", ts: 4, call_id: "c2", status: "ok", payload_summary: { data: "same" } },
            { type: "tool_call", ts: 5, call_id: "c3", tool: "api", args: { q: "test" } },
            { type: "tool_result", ts: 6, call_id: "c3", status: "ok", payload_summary: { data: "same" } },
        ];
        const result = analyzeLoops(events);
        expect(result.loop_detected).toBe(true);
        expect(result.loop_details).toBeDefined();
        expect(result.loop_details!.similarity_suspects).toBeDefined();
        expect(result.loop_details!.output_hash_duplicates).toBeDefined();
    });

    it("detects only hash duplicates without similarity", () => {
        const events: RunEvent[] = [
            { type: "tool_call", ts: 1, call_id: "c1", tool: "search", args: { query: "alpha" } },
            { type: "tool_result", ts: 2, call_id: "c1", status: "ok", payload_summary: "NO RESULTS" },
            { type: "tool_call", ts: 3, call_id: "c2", tool: "browse", args: { url: "example.com" } },
            { type: "tool_result", ts: 4, call_id: "c2", status: "ok", payload_summary: "NO RESULTS" },
        ];
        const result = analyzeLoops(events);
        expect(result.loop_detected).toBe(true);
        expect(result.loop_details!.output_hash_duplicates).toBeDefined();
        // Different tools, so no similarity suspects
        expect(result.loop_details!.similarity_suspects).toBeUndefined();
    });
});
