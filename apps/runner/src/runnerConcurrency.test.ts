import { describe, expect, it } from "vitest";
import { InterruptedRunError } from "cli-utils";
import { runWithConcurrency } from "./runnerConcurrency";

describe("runnerConcurrency", () => {
  it("processes all items with bounded concurrency and preserves order", async () => {
    const items = [1, 2, 3, 4];
    const out = await runWithConcurrency(items, 2, async (item) => item * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it("stops workers when shouldStop flips to true", async () => {
    const items = [1, 2, 3, 4, 5];
    let processed = 0;
    await runWithConcurrency(
      items,
      2,
      async (item) => {
        processed += 1;
        return item;
      },
      () => processed >= 2
    );
    expect(processed).toBeGreaterThanOrEqual(2);
    expect(processed).toBeLessThan(items.length);
  });

  it("propagates first InterruptedRunError from workers", async () => {
    const err = new InterruptedRunError("Runner", "SIGINT");
    await expect(
      runWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) throw err;
        return item;
      })
    ).rejects.toBe(err);
  });
});

