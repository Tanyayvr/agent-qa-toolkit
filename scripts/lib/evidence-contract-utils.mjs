import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

export function ensureParent(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

export function extractHrefs(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

export function normalizeValue(value, pathParts = []) {
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeValue(item, [...pathParts, String(index)]));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    if (key === "generated_at" || key.endsWith("generated_at")) {
      out[key] = "<generated_at>";
      continue;
    }
    if (key === "toolkit_version") {
      out[key] = "<toolkit_version>";
      continue;
    }
    if (key === "source_manifest_sha256" && nextPath.includes("embedded_manifest_index")) {
      out[key] = "<source_manifest_sha256>";
      continue;
    }
    out[key] = normalizeValue(raw, nextPath);
  }
  return out;
}

export function normalizeManifest(manifest) {
  return {
    item_count: Array.isArray(manifest.items) ? manifest.items.length : 0,
    items: Array.isArray(manifest.items)
      ? manifest.items.map((item) => ({
          manifest_key: item.manifest_key,
          rel_path: item.rel_path,
          media_type: item.media_type,
        }))
      : [],
  };
}

export function firstDiffPath(expected, actual, base = "$") {
  if (typeof expected !== typeof actual) return base;
  if (Array.isArray(expected) !== Array.isArray(actual)) return base;
  if (!expected || typeof expected !== "object") {
    return Object.is(expected, actual) ? null : base;
  }
  if (Array.isArray(expected)) {
    if (expected.length !== actual.length) return `${base}.length`;
    for (let i = 0; i < expected.length; i += 1) {
      const diff = firstDiffPath(expected[i], actual[i], `${base}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }

  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  if (expectedKeys.length !== actualKeys.length) return `${base}.__keys__`;
  for (const key of expectedKeys) {
    if (!Object.prototype.hasOwnProperty.call(actual, key)) return `${base}.${key}`;
    const diff = firstDiffPath(expected[key], actual[key], `${base}.${key}`);
    if (diff) return diff;
  }
  return null;
}
