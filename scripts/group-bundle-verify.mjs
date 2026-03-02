#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/group-bundle-verify.mjs [--bundleDir <path>] [--json]",
    "",
    "Options:",
    "  --bundleDir <path>  Directory containing group-manifest.json (default: .)",
    "  --json              Print machine-readable JSON output",
    "  --help              Show this help"
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function parseArgs(argv) {
  const args = {
    bundleDir: ".",
    json: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--bundleDir") {
      const val = argv[i + 1];
      if (!val || val.startsWith("--")) {
        console.error("Missing value for --bundleDir");
        usage(2);
      }
      i += 1;
      args.bundleDir = val;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundleAbs = path.resolve(args.bundleDir);
  const manifestAbs = path.join(bundleAbs, "group-manifest.json");

  if (!existsSync(manifestAbs)) {
    throw new Error(`group-manifest.json not found: ${manifestAbs}`);
  }

  const manifest = JSON.parse(readFileSync(manifestAbs, "utf8"));
  const runs = Array.isArray(manifest?.runs) ? manifest.runs : [];
  const result = {
    ok: true,
    bundle_dir: bundleAbs,
    group_id: manifest?.group_id ?? null,
    runs_checked: runs.length,
    files_checked: 0,
    missing_files: [],
    hash_mismatches: []
  };

  for (const run of runs) {
    const runLabel = run?.run_label ?? "unknown";
    const files = Array.isArray(run?.files) ? run.files : [];
    for (const f of files) {
      const rel = f?.rel_path;
      const expected = f?.sha256;
      if (!rel || !expected) {
        result.ok = false;
        result.hash_mismatches.push({
          run_label: runLabel,
          rel_path: rel ?? null,
          expected_sha256: expected ?? null,
          actual_sha256: null,
          reason: "missing rel_path or sha256 in manifest"
        });
        continue;
      }
      const abs = path.join(bundleAbs, rel);
      if (!existsSync(abs)) {
        result.ok = false;
        result.missing_files.push({
          run_label: runLabel,
          rel_path: rel
        });
        continue;
      }
      const actual = sha256Hex(readFileSync(abs));
      result.files_checked += 1;
      if (actual !== expected) {
        result.ok = false;
        result.hash_mismatches.push({
          run_label: runLabel,
          rel_path: rel,
          expected_sha256: expected,
          actual_sha256: actual
        });
      }
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Bundle: ${result.bundle_dir}`);
    console.log(`Group: ${result.group_id ?? "n/a"}`);
    console.log(`Runs checked: ${result.runs_checked}`);
    console.log(`Files checked: ${result.files_checked}`);
    console.log(`Missing files: ${result.missing_files.length}`);
    console.log(`Hash mismatches: ${result.hash_mismatches.length}`);
    console.log(`Status: ${result.ok ? "OK" : "FAILED"}`);
  }

  process.exit(result.ok ? 0 : 1);
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack ?? err));
  process.exit(1);
}
