#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = {
    cases: "",
    profile: "quality",
    maxWeakExpectedRate: 0.2,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cases") {
      out.cases = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (a === "--profile") {
      out.profile = String(argv[i + 1] ?? "quality");
      i += 1;
      continue;
    }
    if (a === "--maxWeakExpectedRate") {
      const v = Number(argv[i + 1]);
      if (Number.isFinite(v)) out.maxWeakExpectedRate = Math.max(0, Math.min(1, v));
      i += 1;
      continue;
    }
    if (a === "--help" || a === "-h") {
      console.log(
        [
          "Usage:",
          "  node scripts/validate-cases-quality.mjs --cases <path> [--profile quality|infra] [--maxWeakExpectedRate <0..1>]",
        ].join("\n")
      );
      process.exit(0);
    }
    throw new Error(`Unknown option: ${a}`);
  }
  if (!out.cases) {
    throw new Error("Missing required --cases <path>");
  }
  if (out.profile !== "quality" && out.profile !== "infra") {
    throw new Error(`Invalid --profile: ${out.profile}. Must be quality|infra`);
  }
  return out;
}

function hasList(v) {
  return Array.isArray(v) && v.length > 0;
}

function isWeakExpected(exp) {
  if (!exp || typeof exp !== "object") return true;
  const retrievalRequired = exp.retrieval_required;
  const hasRetrievalDocs =
    retrievalRequired &&
    typeof retrievalRequired === "object" &&
    Array.isArray(retrievalRequired.doc_ids) &&
    retrievalRequired.doc_ids.length > 0;

  if (hasList(exp.action_required)) return false;
  if (exp.evidence_required_for_actions === true) return false;
  if (hasList(exp.tool_required)) return false;
  if (hasList(exp.tool_sequence)) return false;
  if (exp.json_schema !== undefined && exp.json_schema !== null) return false;
  if (hasRetrievalDocs) return false;
  if (hasList(exp.must_include)) return false;
  if (hasList(exp.must_not_include)) return false;
  return true;
}

function readCases(absPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Cases file must be a JSON array");
  }
  return parsed;
}

function main() {
  const args = parseArgs(process.argv);
  const abs = path.resolve(process.cwd(), args.cases);
  const cases = readCases(abs);

  const weak = [];
  for (const c of cases) {
    const id = typeof c?.id === "string" && c.id.length > 0 ? c.id : "<unknown>";
    const expected = c?.expected && typeof c.expected === "object" ? c.expected : {};
    if (isWeakExpected(expected)) weak.push(id);
  }

  const total = cases.length;
  const weakCount = weak.length;
  const weakRate = total > 0 ? weakCount / total : 0;

  const summary = {
    profile: args.profile,
    cases: abs,
    total_cases: total,
    weak_expected_cases: weakCount,
    weak_expected_rate: Number(weakRate.toFixed(3)),
    max_weak_expected_rate: args.maxWeakExpectedRate,
  };

  if (args.profile === "quality" && weakRate > args.maxWeakExpectedRate) {
    const sample = weak.slice(0, 12).join(", ");
    console.error(
      [
        "ERROR: quality campaign uses weak expectations above threshold.",
        JSON.stringify(summary),
        sample ? `weak_case_ids_sample: ${sample}` : "",
        "Use a *-quality cases file (with strong expected assertions) or switch profile to infra.",
      ]
        .filter(Boolean)
        .join("\n")
    );
    process.exit(2);
  }

  console.log(JSON.stringify(summary));
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`validate-cases-quality: ${message}`);
  process.exit(2);
}
