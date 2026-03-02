import { InterruptedRunError } from "cli-utils";

export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>,
  shouldStop?: () => boolean
): Promise<R[]> {
  const n = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let nextIdx = 0;
  let interruptedError: InterruptedRunError | null = null;

  async function worker(): Promise<void> {
    for (; ;) {
      if (shouldStop?.()) return;
      const idx = nextIdx;
      nextIdx += 1;
      if (idx >= items.length) return;

      const item = items[idx];
      if (item === undefined) return;

      try {
        results[idx] = await fn(item, idx);
      } catch (err) {
        if (err instanceof InterruptedRunError) {
          if (!interruptedError) interruptedError = err;
          return;
        }
        throw err;
      }
    }
  }

  const workers = Array.from({ length: Math.min(n, items.length || 1) }, () => worker());
  await Promise.all(workers);

  if (interruptedError) {
    throw interruptedError;
  }
  return results;
}

