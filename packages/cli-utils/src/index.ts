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
        throw new Error(`Unknown option: ${a}\n\n${helpText}`);
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
