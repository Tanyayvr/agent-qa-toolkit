export function boolToInt(v: boolean | undefined | null): 0 | 1 | null {
  if (v === null || v === undefined) return null;
  return v ? 1 : 0;
}

export function numOrNull(v: unknown): number | null {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

export function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
