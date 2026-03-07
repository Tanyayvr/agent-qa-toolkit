import { describe, expect, it } from "vitest";
import { wrapOpenAIResponses, __test__ } from "./index";

describe("openai-responses-adapter", () => {
  it("builds input with optional serialized context", () => {
    expect(__test__.buildInput("hello", undefined, true)).toBe("hello");
    expect(__test__.buildInput("hello", { a: 1 }, true)).toContain("Context");
    expect(__test__.buildInput("hello", { a: 1 }, false)).toBe("hello");
  });

  it("extracts output text from output_text and output blocks", () => {
    expect(__test__.extractText({ output_text: "hi" })).toBe("hi");
    expect(
      __test__.extractText({
        output: [{ content: [{ text: "a" }, { text: "b" }] }],
      })
    ).toBe("a\nb");
    expect(
      __test__.extractText({
        output: [{ content: [{ text: "a" }, { bad: true }, { text: "b" }] }],
      })
    ).toBe("a\nb");
    expect(__test__.extractText({ output_text: "   " })).toBeNull();
    expect(__test__.extractText({ output: [{ content: [{ bad: true }] }] })).toBeNull();
  });

  it("extracts token usage when provided", () => {
    expect(
      __test__.extractTokenUsage({ usage: { input_tokens: 10, output_tokens: 7, total_tokens: 17 } })
    ).toEqual({ input_tokens: 10, output_tokens: 7, total_tokens: 17 });
    expect(__test__.extractTokenUsage({ usage: { input_tokens: 10 } })).toEqual({ input_tokens: 10 });
    expect(__test__.extractTokenUsage({ usage: "bad-shape" })).toBeUndefined();
    expect(__test__.extractTokenUsage({})).toBeUndefined();
  });

  it("extracts tool telemetry from Responses function_call items", () => {
    const telemetry = __test__.extractToolTelemetry({
      output: [
        {
          type: "function_call",
          call_id: "call_1",
          name: "search_docs",
          arguments: "{\"query\":\"latency\"}",
        },
        {
          type: "function_call_output",
          call_id: "call_1",
          output: "{\"hits\":2}",
        },
      ],
    });
    expect(telemetry.events.some((e) => e.type === "tool_call")).toBe(true);
    expect(telemetry.events.some((e) => e.type === "tool_result")).toBe(true);
    expect(telemetry.proposed_actions[0]?.tool_name).toBe("search_docs");
    expect(telemetry.telemetry_mode).toBe("native");
  });

  it("fails fast with invalid_telemetry when tool hints exist but no tool events can be extracted", () => {
    expect(() =>
      __test__.extractToolTelemetry({
        output: [
          {
            type: "function_call",
            arguments: "{\"query\":\"latency\"}",
          },
        ],
      })
    ).toThrow(/invalid_telemetry/);
  });

  it("wraps client.responses.create and returns final_output + token_usage", async () => {
    const calls: Record<string, unknown>[] = [];
    const client = {
      responses: {
        create: async (payload: Record<string, unknown>) => {
          calls.push(payload);
          return {
            output_text: "response text",
            usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
          };
        },
      },
    };

    const agent = wrapOpenAIResponses(client, {
      model: "gpt-4.1-mini",
      instructions: "Be concise",
      requestDefaults: { temperature: 0.1 },
    });

    const out = await agent({ user: "hello", context: { team: "qa" } });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.model).toBe("gpt-4.1-mini");
    expect(calls[0]?.instructions).toBe("Be concise");
    expect(calls[0]?.temperature).toBe(0.1);
    expect(typeof calls[0]?.input).toBe("string");

    expect(out.workflow_id).toBe("openai_responses_v1");
    expect(out.final_output).toEqual({ content_type: "text", content: "response text" });
    expect(out.token_usage?.total_tokens).toBe(5);
    expect(out.telemetry_mode).toBe("wrapper_only");
    expect(out.events?.some((e) => e.type === "final_output")).toBe(true);
  });

  it("falls back to json final_output when text is unavailable", async () => {
    const client = {
      responses: {
        create: async () => ({ id: "resp_1", status: "completed" }),
      },
    };
    const agent = wrapOpenAIResponses(client, { model: "gpt-4.1-mini", includeContext: false });
    const out = await agent({ user: "hello", context: { ignored: true } });
    expect(out.final_output.content_type).toBe("json");
    expect(out.token_usage).toBeUndefined();
    expect(out.telemetry_mode).toBe("wrapper_only");
    expect(out.events?.some((e) => e.type === "final_output")).toBe(true);
  });

  it("respects custom workflow id", async () => {
    const client = {
      responses: {
        create: async () => ({ output_text: "ok" }),
      },
    };
    const agent = wrapOpenAIResponses(client, {
      model: "gpt-4.1-mini",
      workflowId: "custom-openai-workflow",
    });
    const out = await agent({ user: "hello" });
    expect(out.workflow_id).toBe("custom-openai-workflow");
  });

  it("emits native telemetry mode when function call traces are present", async () => {
    const client = {
      responses: {
        create: async () => ({
          output: [
            { type: "function_call", call_id: "call_1", name: "lookup", arguments: "{\"q\":\"x\"}" },
            { type: "function_call_output", call_id: "call_1", output: "{\"ok\":true}" },
          ],
        }),
      },
    };
    const agent = wrapOpenAIResponses(client, { model: "gpt-4.1-mini" });
    const out = await agent({ user: "hello" });
    expect(out.telemetry_mode).toBe("native");
  });
});
