import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export * from "./handoff";
export * from "./trace";

export function normalizeArgv(argv: string[]): string[] {
  const out: string[] = [];
  for (const a of argv) {
    if (a.startsWith("--") && a.includes("=")) {
      const idx = a.indexOf("=");
      const key = a.slice(0, idx);
      const val = a.slice(idx + 1);
      out.push(key);
      if (val.length) out.push(val);
    } else {
      out.push(a);
    }
  }
  return out;
}

export function makeArgvHelpers(argv: string[]) {
  const ARGV = normalizeArgv(argv);

  function suggestSplitOption(rawArg: string, allowed: Set<string>): string | null {
    if (!rawArg.startsWith("--")) return null;
    const candidates = Array.from(allowed).filter((opt) => opt.startsWith("--") && rawArg.startsWith(opt) && rawArg.length > opt.length);
    if (candidates.length === 0) return null;
    const best = candidates.sort((a, b) => b.length - a.length)[0];
    if (!best) return null;
    const suffix = rawArg.slice(best.length);
    if (!suffix || suffix.startsWith("=")) return null;
    return `Did you mean "${best} ${suffix}" (or "${best}=${suffix}")?`;
  }

  function hasFlag(...names: string[]): boolean {
    return names.some((n) => ARGV.includes(n));
  }

  function getFlag(name: string): boolean {
    return ARGV.includes(name);
  }

  function getArg(name: string): string | null {
    const idx = ARGV.indexOf(name);
    if (idx === -1) return null;
    const v = ARGV[idx + 1];
    if (!v || v.startsWith("--")) return null;
    return v;
  }

  function assertNoUnknownOptions(allowed: Set<string>, helpText: string): void {
    const args = ARGV.slice(2);
    for (const a of args) {
      if (a.startsWith("--") && !allowed.has(a)) {
        const hint = suggestSplitOption(a, allowed);
        throw new Error(`Unknown option: ${a}${hint ? `\n${hint}` : ""}\n\n${helpText}`);
      }
    }
  }

  function assertHasValue(flag: string, helpText: string): void {
    const idx = ARGV.indexOf(flag);
    if (idx === -1) return;
    const next = ARGV[idx + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${flag}\n\n${helpText}`);
    }
  }

  function parseIntFlag(name: string, fallback: number, helpText: string): number {
    const raw = getArg(name);
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid integer for ${name}: ${raw}\n\n${helpText}`);
    }
    return n;
  }

  return { ARGV, hasFlag, getFlag, getArg, assertNoUnknownOptions, assertHasValue, parseIntFlag };
}

export class CliUsageError extends Error {
  public readonly exitCode = 2;
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export class InterruptedRunError extends Error {
  public readonly exitCode: number;
  constructor(
    public readonly component: string,
    public readonly signalName: "SIGINT" | "SIGTERM"
  ) {
    super(`${component} interrupted by ${signalName}`);
    this.name = "InterruptedRunError";
    this.exitCode = signalName === "SIGINT" ? 130 : 143;
  }
}

export function emitStructuredLog(
  component: string,
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown>,
  enabled: boolean = process.env.AQ_LOG_FORMAT === "json"
): void {
  if (!enabled) return;
  console.log(
    JSON.stringify({
      ts: Date.now(),
      component,
      level,
      event,
      ...fields,
    })
  );
}

export async function ensureDir(absPath: string): Promise<void> {
  await mkdir(absPath, { recursive: true });
}

export async function writeFileAtomic(absPath: string, data: string | Uint8Array, encoding?: BufferEncoding): Promise<void> {
  const dir = path.dirname(absPath);
  await ensureDir(dir);
  const tmpAbs = path.join(dir, `.tmp-${path.basename(absPath)}-${process.pid}-${randomUUID()}`);
  try {
    if (typeof data === "string") {
      await writeFile(tmpAbs, data, encoding ?? "utf-8");
    } else {
      await writeFile(tmpAbs, data);
    }
    await rename(tmpAbs, absPath);
  } catch (err) {
    try {
      await rm(tmpAbs, { force: true });
    } catch {
      // best effort cleanup
    }
    throw err;
  }
}

export async function writeJsonAtomic(absPath: string, value: unknown): Promise<void> {
  await writeFileAtomic(absPath, JSON.stringify(value, null, 2), "utf-8");
}

type CliUsageFns = {
  assertNoUnknownOptions: (allowed: Set<string>, helpText: string) => void;
  assertHasValue: (flag: string, helpText: string) => void;
  parseIntFlag: (name: string, fallback: number, helpText: string) => number;
};

function toCliUsageError(err: unknown): CliUsageError {
  if (err instanceof CliUsageError) return err;
  return new CliUsageError(String(err instanceof Error ? err.message : err));
}

export function makeCliUsageGuards(helpText: string, fns: CliUsageFns) {
  const { assertNoUnknownOptions, assertHasValue, parseIntFlag } = fns;

  function assertNoUnknownOptionsOrThrow(allowed: Set<string>): void {
    try {
      assertNoUnknownOptions(allowed, helpText);
    } catch (err) {
      throw toCliUsageError(err);
    }
  }

  function assertHasValueOrThrow(flag: string): void {
    try {
      assertHasValue(flag, helpText);
    } catch (err) {
      throw toCliUsageError(err);
    }
  }

  function parseIntFlagOrThrow(name: string, fallback: number): number {
    try {
      return parseIntFlag(name, fallback, helpText);
    } catch (err) {
      throw toCliUsageError(err);
    }
  }

  return { assertNoUnknownOptionsOrThrow, assertHasValueOrThrow, parseIntFlagOrThrow };
}
