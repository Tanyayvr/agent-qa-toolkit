#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/group-bundle.mjs --outDir <path> --report <label=reportDir> [--report <label=reportDir> ...]",
    "",
    "Options:",
    "  --outDir <path>   Output directory for the grouped package (required)",
    "  --report <spec>   Run spec in form label=reportDir (repeatable, required)",
    "  --groupId <id>    Logical incident/group id (default: incident-<timestamp>)",
    "  --force           Remove existing outDir before writing",
    "  --help            Show this help",
    "",
    "Example:",
    "  node scripts/group-bundle.mjs \\",
    "    --groupId incident-2026-02-28 \\",
    "    --outDir apps/evaluator/reports/groups/incident-2026-02-28 \\",
    "    --report autonomous=apps/evaluator/reports/cli-prod \\",
    "    --report agentcli=apps/evaluator/reports/agent-cli-live-2"
  ].join("\n");
  if (exitCode === 0) {
    console.log(msg);
  } else {
    console.error(msg);
  }
  process.exit(exitCode);
}

function normalizeRel(p) {
  return p.split(path.sep).join("/");
}

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function listFilesRecursive(absDir) {
  const out = [];
  const stack = [absDir];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) continue;
    const entries = readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (e.isFile()) {
        out.push(abs);
      }
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function parseArgs(argv) {
  const args = {
    outDir: null,
    groupId: null,
    force: false,
    reports: []
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--force") {
      args.force = true;
      continue;
    }
    if (arg === "--outDir" || arg === "--groupId" || arg === "--report") {
      const val = argv[i + 1];
      if (!val || val.startsWith("--")) {
        console.error(`Missing value for ${arg}`);
        usage(2);
      }
      i += 1;
      if (arg === "--outDir") args.outDir = val;
      else if (arg === "--groupId") args.groupId = val;
      else args.reports.push(val);
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  if (!args.outDir) {
    console.error("--outDir is required");
    usage(2);
  }
  if (args.reports.length === 0) {
    console.error("At least one --report is required");
    usage(2);
  }
  if (!args.groupId) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    args.groupId = `incident-${ts}`;
  }

  return args;
}

function parseReportSpec(spec) {
  const eq = spec.indexOf("=");
  let label;
  let reportDir;
  if (eq > 0) {
    label = spec.slice(0, eq).trim();
    reportDir = spec.slice(eq + 1).trim();
  } else {
    reportDir = spec.trim();
    label = path.basename(reportDir);
  }
  if (!label || !reportDir) {
    throw new Error(`Invalid --report spec: ${spec}`);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(label)) {
    throw new Error(`Invalid report label "${label}" (allowed: A-Za-z0-9._-)`);
  }
  return { label, reportDir };
}

function readSummaryFromCompare(compareAbs) {
  if (!existsSync(compareAbs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(compareAbs, "utf8"));
    const summary = parsed?.summary ?? {};
    const eq = summary?.execution_quality ?? {};
    const dc = summary?.data_coverage ?? {};
    return {
      report_id: parsed?.report_id ?? null,
      baseline_pass: summary?.baseline_pass ?? null,
      new_pass: summary?.new_pass ?? null,
      regressions: summary?.regressions ?? null,
      improvements: summary?.improvements ?? null,
      total_cases: dc?.total_cases ?? null,
      execution_status: eq?.status ?? null,
      baseline_transport_success_rate: eq?.baseline_transport_success_rate ?? null,
      new_transport_success_rate: eq?.new_transport_success_rate ?? null,
      weak_expected_rate: eq?.weak_expected_rate ?? null,
      model_quality_inconclusive: eq?.model_quality_inconclusive ?? null
    };
  } catch {
    return null;
  }
}

function renderHtml(groupId, generatedAt, runs) {
  const rows = runs
    .map((r) => {
      const s = r.summary ?? {};
      const reportHref = `${r.report_dir}/report.html`;
      const compareHref = `${r.report_dir}/compare-report.json`;
      return `
        <tr>
          <td><code>${r.run_label}</code></td>
          <td>${s.execution_status ?? "n/a"}</td>
          <td>${s.total_cases ?? "n/a"}</td>
          <td>${s.new_transport_success_rate ?? "n/a"}</td>
          <td>${s.weak_expected_rate ?? "n/a"}</td>
          <td><a href="${reportHref}">report.html</a></td>
          <td><a href="${compareHref}">compare-report.json</a></td>
        </tr>
      `.trim();
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Multi-Agent Group Bundle</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111; }
    h1 { margin-bottom: 4px; }
    .meta { color: #555; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    code { background: #f2f2f2; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Multi-Agent Group Bundle</h1>
  <div class="meta">group_id: <code>${groupId}</code> | generated_at: <code>${generatedAt}</code></div>
  <p>Verify package integrity with <code>node scripts/group-bundle-verify.mjs --bundleDir .</code>.</p>
  <table>
    <thead>
      <tr>
        <th>Run</th>
        <th>Execution status</th>
        <th>Total cases</th>
        <th>New transport success</th>
        <th>Weak expected rate</th>
        <th>HTML report</th>
        <th>Machine report</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outAbs = path.resolve(args.outDir);

  const reportSpecs = args.reports.map(parseReportSpec);
  const uniqueLabels = new Set();
  for (const spec of reportSpecs) {
    if (uniqueLabels.has(spec.label)) {
      throw new Error(`Duplicate report label: ${spec.label}`);
    }
    uniqueLabels.add(spec.label);
  }

  if (existsSync(outAbs)) {
    if (!args.force) {
      throw new Error(`outDir exists: ${outAbs} (use --force to replace)`);
    }
    rmSync(outAbs, { recursive: true, force: true });
  }

  mkdirSync(path.join(outAbs, "runs"), { recursive: true });

  const generatedAt = new Date().toISOString();
  const manifestRuns = [];

  for (const spec of reportSpecs) {
    const srcAbs = path.resolve(spec.reportDir);
    let st;
    try {
      st = statSync(srcAbs);
    } catch {
      throw new Error(`report dir not found: ${srcAbs}`);
    }
    if (!st.isDirectory()) {
      throw new Error(`report path is not a directory: ${srcAbs}`);
    }

    const dstAbs = path.join(outAbs, "runs", spec.label);
    cpSync(srcAbs, dstAbs, { recursive: true });

    const filesAbs = listFilesRecursive(dstAbs);
    const files = filesAbs.map((abs) => {
      const buf = readFileSync(abs);
      return {
        rel_path: normalizeRel(path.relative(outAbs, abs)),
        size_bytes: buf.byteLength,
        sha256: sha256Hex(buf)
      };
    });

    const summary = readSummaryFromCompare(path.join(dstAbs, "compare-report.json"));
    const totalBytes = files.reduce((acc, f) => acc + f.size_bytes, 0);

    manifestRuns.push({
      run_label: spec.label,
      agent_id: spec.label,
      report_dir: `runs/${spec.label}`,
      file_count: files.length,
      total_bytes: totalBytes,
      summary,
      files
    });
  }

  const verifyCommand = "node scripts/group-bundle-verify.mjs --bundleDir .";

  const groupIndex = {
    kind: "aq_multi_agent_group_index",
    version: 1,
    group_id: args.groupId,
    generated_at: generatedAt,
    verify_command: verifyCommand,
    runs: manifestRuns.map((r) => ({
      run_label: r.run_label,
      agent_id: r.agent_id,
      report_dir: r.report_dir,
      report_html_href: `${r.report_dir}/report.html`,
      compare_report_href: `${r.report_dir}/compare-report.json`,
      summary: r.summary
    }))
  };

  const groupManifest = {
    kind: "aq_multi_agent_group_manifest",
    version: 1,
    group_id: args.groupId,
    generated_at: generatedAt,
    verify_command: verifyCommand,
    runs: manifestRuns
  };

  writeFileSync(path.join(outAbs, "group-index.json"), JSON.stringify(groupIndex, null, 2), "utf8");
  writeFileSync(path.join(outAbs, "group-manifest.json"), JSON.stringify(groupManifest, null, 2), "utf8");
  writeFileSync(path.join(outAbs, "index.html"), renderHtml(args.groupId, generatedAt, groupIndex.runs), "utf8");

  console.log(`Group bundle generated: ${outAbs}`);
  console.log(`Runs: ${manifestRuns.length}`);
  if (manifestRuns.length < 2) {
    console.warn("Warning: less than 2 runs were grouped. Multi-agent incident bundles are most useful with 2+ runs.");
  }
  console.log(`Open: ${normalizeRel(path.join(args.outDir, "index.html"))}`);
  console.log(`Verify: node scripts/group-bundle-verify.mjs --bundleDir ${normalizeRel(args.outDir)}`);
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack ?? err));
  process.exit(1);
}
