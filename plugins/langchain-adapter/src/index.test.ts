import { describe, expect, it } from "vitest";
import { wrapLangChainRunnable, __test__ } from "./index";

describe("langchain-adapter", () => {
  it("extracts text from common LangChain output shapes", () => {
    expect(__test__.textFromOutput("hello")).toBe("hello");
    expect(__test__.textFromOutput({ content: "hi" })).toBe("hi");
    expect(__test__.textFromOutput({ content: [{ text: "a" }, { text: "b" }] })).toBe("a\nb");
    expect(__test__.textFromOutput(["x", { text: "y" }])).toBe("x\ny");
    expect(__test__.textFromOutput({ content: [{ content: "z" }] })).toBe("z");
    expect(__test__.textFromOutput({ content: [{ foo: "bar" }] })).toBeNull();
    expect(__test__.textFromOutput(42)).toBeNull();
  });

  it("falls back to json output in auto mode when text is unavailable", () => {
    const out = __test__.toFinalOutput({ value: 1 }, "auto");
    expect(out).toEqual({ content_type: "json", content: { value: 1 } });
  });

  it("supports text/json output modes explicitly", () => {
    expect(__test__.toFinalOutput({ value: 1 }, "json")).toEqual({
      content_type: "json",
      content: { value: 1 },
    });
    expect(__test__.toFinalOutput({ value: 1 }, "text")).toEqual({
      content_type: "text",
      content: JSON.stringify({ value: 1 }),
    });
  });

  it("extracts tool traces from common LangChain tool_calls shape", () => {
    const traces = __test__.extractLangChainToolTraces({
      tool_calls: [
        { id: "c1", name: "search", args: { query: "latency" } },
      ],
    });
    expect(traces).toEqual([
      { tool: "search", call_id: "c1", args: { query: "latency" }, status: "ok" },
    ]);
  });

  it("counts raw tool telemetry hints from multiple LangChain shapes", () => {
    expect(
      __test__.collectToolHintCount({
        tool_calls: [{ id: "1", name: "a" }],
        intermediate_steps: [{ action: { tool: "b" } }],
      })
    ).toBe(2);
    expect(
      __test__.collectToolHintCount({
        messages: [{ additional_kwargs: { tool_calls: [{ id: "m1", function: { name: "search" } }] } }],
      })
    ).toBe(1);
  });

  it("fails fast with invalid_telemetry when raw tool hints exist but extraction is empty", () => {
    expect(() =>
      __test__.buildTelemetry({
        tool_calls: [{ id: "bad", args: { q: "x" } }],
      })
    ).toThrow(/invalid_telemetry/);
  });

  it("wraps runnable and maps user/context to input payload", async () => {
    const runnable = {
      invoke: async (input: Record<string, unknown>) => ({
        content: `Echo:${String(input.question)}:${String(input.context)}`,
        tool_calls: [{ id: "c1", name: "search", args: { query: "agent qa" } }],
      }),
    };

    const agent = wrapLangChainRunnable(runnable, { inputKey: "question" });
    const out = await agent({ user: "hello", context: "ctx" });
    expect(out.workflow_id).toBe("langchain_runnable_v1");
    expect(out.final_output.content_type).toBe("text");
    expect(out.final_output.content).toBe("Echo:hello:ctx");
    expect(out.events?.some((e) => e.type === "tool_call")).toBe(true);
    expect(out.events?.some((e) => e.type === "tool_result")).toBe(true);
    expect(out.events?.some((e) => e.type === "final_output")).toBe(true);
    expect(out.proposed_actions?.[0]?.tool_name).toBe("search");
    expect(out.telemetry_mode).toBe("native");
  });

  it("omits context from default mapped input when context is undefined", async () => {
    const runnable = {
      invoke: async (input: Record<string, unknown>) => {
        expect(Object.keys(input)).toEqual(["query"]);
        return { text: "ok" };
      },
    };
    const agent = wrapLangChainRunnable(runnable, { inputKey: "query", outputMode: "text" });
    const out = await agent({ user: "hello" });
    expect(out.final_output).toEqual({ content_type: "text", content: "ok" });
    expect(out.telemetry_mode).toBe("wrapper_only");
    expect(out.events?.some((e) => e.type === "final_output")).toBe(true);
  });

  it("supports custom mapInput/mapOutput and workflow id", async () => {
    const runnable = {
      invoke: async (input: { prompt: string }) => ({ answer: input.prompt.toUpperCase() }),
    };

    const agent = wrapLangChainRunnable(runnable, {
      workflowId: "lc-custom",
      mapInput: ({ user }) => ({ prompt: user }),
      mapOutput: (raw) => ({ content_type: "text", content: raw.answer }),
    });

    const out = await agent({ user: "hello" });
    expect(out.workflow_id).toBe("lc-custom");
    expect(out.final_output.content).toBe("HELLO");
  });
});
