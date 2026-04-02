export type RedactionPreset = "none" | "internal_only" | "transferable" | "transferable_extended";
export type ActiveRedactionPreset = Exclude<RedactionPreset, "none">;

export type CustomRedactionPattern = {
  name: string;
  pattern: string;
  flags?: string;
  replacement?: string;
  presets?: ActiveRedactionPreset[];
};

type LoadedCustomRedactionPattern = {
  name: string;
  regex: RegExp;
  replacement: string;
  presets: ActiveRedactionPreset[];
};

type RedactionOptions = {
  processEnv?: NodeJS.ProcessEnv | undefined;
  customPatterns?: CustomRedactionPattern[];
};

const CUSTOM_REDACTION_PATTERNS_ENV = "REDACTION_CUSTOM_PATTERNS_JSON";
const ACTIVE_PRESETS: ActiveRedactionPreset[] = ["internal_only", "transferable", "transferable_extended"];
const IBAN_TEXT_PATTERN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/gi;

let cachedCustomPatternSource: string | undefined;
let cachedCustomPatternValue: LoadedCustomRedactionPattern[] = [];

function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isValidIban(input: string): boolean {
  const normalized = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) return false;

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const expanded = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of expanded) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

export function findValidIbanMatches(input: string): string[] {
  const matches = input.match(IBAN_TEXT_PATTERN) || [];
  return matches.filter((candidate, index, values) => (
    isValidIban(candidate) && values.indexOf(candidate) === index
  ));
}

function normalizeCustomPatternPresets(value: unknown, label: string): ActiveRedactionPreset[] {
  if (value === undefined) return [...ACTIVE_PRESETS];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label}.presets must be a non-empty array when provided`);
  }
  const presets = Array.from(
    new Set(
      value.map((item) => {
        if (item !== "internal_only" && item !== "transferable" && item !== "transferable_extended") {
          throw new Error(`${label}.presets contains invalid preset: ${String(item)}`);
        }
        return item;
      })
    )
  );
  return presets;
}

function compileCustomRedactionPatterns(patterns: CustomRedactionPattern[], sourceLabel: string): LoadedCustomRedactionPattern[] {
  return patterns.map((entry, index) => {
    const label = `${sourceLabel}[${index}]`;
    const name = typeof entry?.name === "string" && entry.name.trim().length > 0
      ? entry.name.trim()
      : (() => { throw new Error(`${label}.name must be a non-empty string`); })();
    const pattern = typeof entry?.pattern === "string" && entry.pattern.length > 0
      ? entry.pattern
      : (() => { throw new Error(`${label}.pattern must be a non-empty string`); })();
    const flagsRaw = typeof entry?.flags === "string" ? entry.flags : "";
    const flags = flagsRaw.includes("g") ? flagsRaw : `${flagsRaw}g`;
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch (error) {
      const note = error instanceof Error ? error.message : String(error);
      throw new Error(`${label}.pattern is not a valid RegExp: ${note}`);
    }
    return {
      name,
      regex,
      replacement:
        typeof entry?.replacement === "string" && entry.replacement.length > 0
          ? entry.replacement
          : `[redacted_${name}]`,
      presets: normalizeCustomPatternPresets(entry?.presets, label),
    };
  });
}

export function loadCustomRedactionPatterns(options?: RedactionOptions): LoadedCustomRedactionPattern[] {
  if (options?.customPatterns) {
    return compileCustomRedactionPatterns(options.customPatterns, "customPatterns");
  }

  const processEnv = options?.processEnv ?? process.env;
  const raw = processEnv[CUSTOM_REDACTION_PATTERNS_ENV];
  const cacheKey = typeof raw === "string" ? raw : "";
  if (cacheKey === cachedCustomPatternSource) {
    return cachedCustomPatternValue;
  }
  cachedCustomPatternSource = cacheKey;
  if (!cacheKey.trim()) {
    cachedCustomPatternValue = [];
    return cachedCustomPatternValue;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cacheKey);
  } catch (error) {
    const note = error instanceof Error ? error.message : String(error);
    throw new Error(`${CUSTOM_REDACTION_PATTERNS_ENV} must be valid JSON: ${note}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${CUSTOM_REDACTION_PATTERNS_ENV} must be a JSON array`);
  }
  cachedCustomPatternValue = compileCustomRedactionPatterns(parsed as CustomRedactionPattern[], CUSTOM_REDACTION_PATTERNS_ENV);
  return cachedCustomPatternValue;
}

export function collectCustomRedactionPatternHits(
  input: string,
  preset: ActiveRedactionPreset,
  options?: RedactionOptions
): string[] {
  const hits: string[] = [];
  for (const pattern of loadCustomRedactionPatterns(options)) {
    if (!pattern.presets.includes(preset)) continue;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    if (regex.test(input)) hits.push(pattern.name);
  }
  return hits;
}

function applyCustomRedactionPatterns(input: string, preset: ActiveRedactionPreset, options?: RedactionOptions): string {
  let output = input;
  for (const pattern of loadCustomRedactionPatterns(options)) {
    if (!pattern.presets.includes(preset)) continue;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    output = output.replace(regex, pattern.replacement);
  }
  return output;
}

function maskString(input: string, preset: RedactionPreset, options?: RedactionOptions): string {
  if (preset === "none") return input;
  let s = input;
  s = s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted_email]");
  s = s.replace(/\bCUST-\d+\b/g, "CUST-REDACTED");
  s = s.replace(/\bT-\d+\b/g, "T-REDACTED");
  s = s.replace(/\bMSG-\d+\b/g, "MSG-REDACTED");
  if (preset === "transferable" || preset === "transferable_extended") {
    s = s.replace(/\b(sk|api|token|secret)[-_]?[a-z0-9]{8,}\b/gi, "[redacted_token]");
  }
  if (preset === "transferable_extended") {
    s = s.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[redacted_ip]");
    s = s.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
      const digits = match.replace(/\D/g, "");
      return luhnValid(digits) ? "[redacted_cc]" : match;
    });
    s = s.replace(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/gi, (match) => (
      isValidIban(match) ? "[redacted_iban]" : match
    ));
    s = s.replace(/\b((?:BIC|SWIFT)\b[:=\s-]*)([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/gi, "$1[redacted_bic_swift]");
    s = s.replace(/\beyJ[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\b/g, "[redacted_jwt]");
    s = s.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length >= 13 && digits.length <= 19) return match;
      return "[redacted_phone]";
    });
  }
  s = applyCustomRedactionPatterns(s, preset, options);
  return s;
}

export function sanitizeValue<T>(value: T, preset: RedactionPreset, options?: RedactionOptions): T {
  if (preset === "none") return value;
  if (typeof value === "string") return maskString(value, preset, options) as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, preset, options)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v, preset, options);
    }
    return out as T;
  }
  return value;
}
