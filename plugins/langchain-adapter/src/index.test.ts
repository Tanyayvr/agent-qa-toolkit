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

  it("wraps runnable and maps user/context to input payload", async () => {
    const runnable = {
      invoke: async (input: Record<string, unknown>) => ({
        content: `Echo:${String(input.question)}:${String(input.context)}`,
      }),
    };

    const agent = wrapLangChainRunnable(runnable, { inputKey: "question" });
    const out = await agent({ user: "hello", context: "ctx" });
    expect(out.workflow_id).toBe("langchain_runnable_v1");
    expect(out.final_output.content_type).toBe("text");
    expect(out.final_output.content).toBe("Echo:hello:ctx");
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
