#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SCHEMA_VERSION = 1;
const KNOWN_MODES = new Set(["quick", "full-lite", "full", "diagnostic"]);

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function normalizeRuntimeMode(mode) {
  if (mode === "smoke") return "quick";
  if (KNOWN_MODES.has(mode)) return mode;
  return "full";
}

export function runtimeStatePathForProfile(profilePath) {
  const abs = path.resolve(profilePath);
  if (abs.endsWith(".env")) return abs.replace(/\.env$/u, ".runtime-state.json");
  return `${abs}.runtime-state.json`;
}

export function readRuntimeState(runtimeStatePath) {
  if (!runtimeStatePath) return null;
  const absPath = path.resolve(process.cwd(), runtimeStatePath);
  try {
    const raw = JSON.parse(fs.readFileSync(absPath, "utf8"));
    if (!isRecord(raw)) return null;
    return { absPath, raw };
  } catch {
    return null;
  }
}

export function readRuntimeStateRecommendation(runtimeStatePath, mode) {
  const state = readRuntimeState(runtimeStatePath);
  if (!state) return null;
  const normalizedMode = normalizeRuntimeMode(mode);
  const entry = state.raw?.modes?.[normalizedMode];
  if (!isRecord(entry)) return null;

  const timeoutMs = parsePositiveInt(entry.timeout_ms);
  const timeoutAutoCapMs = parsePositiveInt(entry.timeout_auto_cap_ms);
  const timeoutAutoMaxIncreaseFactor = parsePositiveInt(entry.timeout_auto_max_increase_factor);
  if (!timeoutMs || !timeoutAutoCapMs || !timeoutAutoMaxIncreaseFactor) return null;

  return {
    path: state.absPath,
    mode: normalizedMode,
    timeout_ms: timeoutMs,
    timeout_auto_cap_ms: timeoutAutoCapMs,
    timeout_auto_max_increase_factor: timeoutAutoMaxIncreaseFactor,
    confidence: typeof entry.confidence === "string" ? entry.confidence : null,
    source: typeof entry.source === "string" ? entry.source : null,
    stage: typeof entry.stage === "string" ? entry.stage : null,
    reason: typeof entry.reason === "string" ? entry.reason : null,
    updated_at: typeof entry.updated_at === "string" ? entry.updated_at : null,
  };
}

export function writeRuntimeStateRecommendation({
  runtimeStatePath,
  profileName = "",
  runtimeClass = "",
  mode,
  timeoutMs,
  timeoutAutoCapMs,
  timeoutAutoMaxIncreaseFactor,
  confidence = "",
  source = "",
  stage = "",
  reason = "",
} = {}) {
  if (!runtimeStatePath) return null;

  const normalizedMode = normalizeRuntimeMode(mode);
  const resolvedTimeoutMs = parsePositiveInt(timeoutMs);
  const resolvedTimeoutAutoCapMs = parsePositiveInt(timeoutAutoCapMs);
  const resolvedTimeoutAutoMaxIncreaseFactor = parsePositiveInt(timeoutAutoMaxIncreaseFactor);
  if (!resolvedTimeoutMs || !resolvedTimeoutAutoCapMs || !resolvedTimeoutAutoMaxIncreaseFactor) {
    throw new Error("runtime state recommendation requires positive timeout/cap/factor values");
  }

  const absPath = path.resolve(process.cwd(), runtimeStatePath);
  const current = readRuntimeState(absPath)?.raw;
  const next = isRecord(current) ? { ...current } : {};
  const now = new Date().toISOString();
  const currentModes = isRecord(next.modes) ? { ...next.modes } : {};

  currentModes[normalizedMode] = {
    timeout_ms: resolvedTimeoutMs,
    timeout_auto_cap_ms: Math.max(resolvedTimeoutAutoCapMs, resolvedTimeoutMs),
    timeout_auto_max_increase_factor: resolvedTimeoutAutoMaxIncreaseFactor,
    confidence: confidence || null,
    source: source || null,
    stage: stage || null,
    reason: reason || null,
    updated_at: now,
  };

  next.schema_version = SCHEMA_VERSION;
  next.profile_name = profileName || next.profile_name || null;
  next.runtime_class = runtimeClass || next.runtime_class || null;
  next.updated_at = now;
  next.modes = currentModes;

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return absPath;
}
