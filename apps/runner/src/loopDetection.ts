/**
 * Loop detection utilities: Similarity Breaker + Output Hash Tracking
 *
 * Two post-processing analyses on AgentResponse.events[]:
 *
 * 1. **Similarity breaker** — detects when the same tool is called repeatedly
 *    with >90% similar args (by key overlap / Jaccard index). Catches "sneaky loops"
 *    that iteration caps miss because args look slightly different each time.
 *
 * 2. **Output hash tracking** — detects when different tool calls produce identical
 *    responses (hashed payload_summary). Another loop signal that iteration counts miss:
 *    the agent may vary its args but the underlying API returns the same data.
 *
 * Both return LoopDetails which are merged into TokenUsage.loop_details.
 */

import { createHash } from "node:crypto";
import type { RunEvent, ToolCallEvent, ToolResultEvent, LoopDetails } from "shared-types";

/* ------------------------------------------------------------------ */
/*  1. Similarity Breaker (args overlap detection)                     */
/* ------------------------------------------------------------------ */

/** Compute Jaccard-like similarity between two argument objects.
 *  Compares both key names and stringified values. Score ∈ [0, 1]. */
function argsSimilarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const aEntries = Object.entries(a).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
    const bEntries = Object.entries(b).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
    const setA = new Set(aEntries);
    const setB = new Set(bEntries);

    if (setA.size === 0 && setB.size === 0) return 1; // both empty = identical

    let intersection = 0;
    for (const item of setA) {
        if (setB.has(item)) intersection++;
    }

    const union = new Set([...aEntries, ...bEntries]).size;
    return union === 0 ? 1 : intersection / union;
}

/** Window size: how many recent calls to compare per tool. */
const SIMILARITY_WINDOW = 3;
const SIMILARITY_THRESHOLD = 0.9;

/** Detect tool-call loops by args similarity within a sliding window. */
export function detectSimilarityLoops(events: RunEvent[]): LoopDetails["similarity_suspects"] {
    const toolCalls = events.filter((e): e is ToolCallEvent => e.type === "tool_call");
    if (toolCalls.length < 2) return undefined;

    // Group calls by tool name
    const byTool = new Map<string, ToolCallEvent[]>();
    for (const tc of toolCalls) {
        const list = byTool.get(tc.tool) ?? [];
        list.push(tc);
        byTool.set(tc.tool, list);
    }

    const suspects: NonNullable<LoopDetails["similarity_suspects"]> = [];

    for (const [tool, calls] of byTool) {
        if (calls.length < 2) continue;

        // Sliding window: compare each call to the previous N calls
        const window = calls.slice(-SIMILARITY_WINDOW);
        if (window.length < 2) continue;

        // Pairwise similarity within the window
        let totalSim = 0;
        let pairs = 0;
        for (let i = 0; i < window.length; i++) {
            for (let j = i + 1; j < window.length; j++) {
                totalSim += argsSimilarity(window[i]!.args, window[j]!.args);
                pairs++;
            }
        }

        const avgSimilarity = pairs > 0 ? totalSim / pairs : 0;

        if (avgSimilarity >= SIMILARITY_THRESHOLD) {
            suspects.push({
                tool,
                call_ids: window.map((c) => c.call_id),
                similarity_score: Math.round(avgSimilarity * 1000) / 1000,
            });
        }
    }

    return suspects.length > 0 ? suspects : undefined;
}

/* ------------------------------------------------------------------ */
/*  2. Output Hash Tracking (identical responses detection)            */
/* ------------------------------------------------------------------ */

/** Hash a payload_summary to detect duplicates. Uses sha256 truncated to 12 chars. */
function hashPayload(payload: Record<string, unknown> | string | undefined): string {
    const raw = payload === undefined ? "__undefined__" : typeof payload === "string" ? payload : JSON.stringify(payload);
    return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

/** Detect when different tool calls produce identical responses (same hash). */
export function detectOutputHashDuplicates(events: RunEvent[]): LoopDetails["output_hash_duplicates"] {
    const results = events.filter((e): e is ToolResultEvent => e.type === "tool_result");
    if (results.length < 2) return undefined;

    // Group by payload hash
    const byHash = new Map<string, string[]>();
    for (const r of results) {
        const hash = hashPayload(r.payload_summary);
        const list = byHash.get(hash) ?? [];
        list.push(r.call_id);
        byHash.set(hash, list);
    }

    const duplicates: NonNullable<LoopDetails["output_hash_duplicates"]> = [];
    for (const [hash, callIds] of byHash) {
        if (callIds.length >= 2) {
            duplicates.push({
                hash,
                call_ids: callIds,
                count: callIds.length,
            });
        }
    }

    return duplicates.length > 0 ? duplicates : undefined;
}

/* ------------------------------------------------------------------ */
/*  Combined analysis                                                  */
/* ------------------------------------------------------------------ */

/** Run both loop detection analyses on an AgentResponse's events.
 *  Returns LoopDetails if any loops are detected, undefined otherwise. */
export function analyzeLoops(events: RunEvent[] | undefined): {
    loop_detected: boolean;
    loop_details: LoopDetails | undefined;
} {
    if (!events || events.length === 0) {
        return { loop_detected: false, loop_details: undefined };
    }

    const similaritySuspects = detectSimilarityLoops(events);
    const outputHashDuplicates = detectOutputHashDuplicates(events);

    const hasLoops = !!similaritySuspects || !!outputHashDuplicates;

    const details: LoopDetails | undefined = hasLoops
        ? {
            ...(similaritySuspects ? { similarity_suspects: similaritySuspects } : {}),
            ...(outputHashDuplicates ? { output_hash_duplicates: outputHashDuplicates } : {}),
        }
        : undefined;

    return { loop_detected: hasLoops, loop_details: details };
}
