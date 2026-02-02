//tool/apps/runner/src/index.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

type Version = "baseline" | "new";

type CaseFileItem = {
  id: string;
  title: string;
  input: { user: string; context?: unknown };
  expected?: unknown;
  metadata?: unknown;
};

type RunCaseRequest = {
  case_id: string;
  version: Version;
  input: { user: string; context?: unknown };
};

type RunnerConfig = {
  repoRoot: string;
  baseUrl: string;
  casesPath: string;
  outDir: string;
  runId: string;
  onlyCaseIds: string[] | null;
};
//tool/apps/runner/src/index.ts
const HELP_TEXT = `
Usage:
  runner [--repoRoot <path>] [--baseUrl <url>] [--cases <path>] [--outDir <dir>] [--runId <id>] [--only <ids>] [--dryRun]

Options:
  --repoRoot   Repo root (default: INIT_CWD or cwd)
  --baseUrl    Agent base URL (default: http://localhost:8787)
  --cases      Path to cases JSON (default: cases/cases.json)
  --outDir     Output directory (default: apps/runner/runs)
  --runId      Run id (default: random UUID)
  --only       Comma-separated case ids (e.g. tool_001,fmt_002)
  --dryRun     Do not call the agent, only print selected cases
  --help, -h   Show this help

Exit codes:
  0  success
  1  runtime error
  2  bad arguments / usage

Examples:
  ts-node src/index.ts --cases cases/cases.json --outDir apps/runner/runs --runId latest --only tool_001,fmt_002
  ts-node src/index.ts --baseUrl http://localhost:8787 --cases cases/cases.json --runId latest
`.trim();

class CliUsageError extends Error {
  public readonly exitCode = 2;
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

function hasFlag(...names: string[]): boolean {
  return names.some((n) => process.argv.includes(n));
}

function assertNoUnknownOptions(allowed: Set<string>): void {
  const args = process.argv.slice(2);
  for (const a of args) {
    if (a.startsWith("--") && !allowed.has(a)) {
      throw new CliUsageError(`Unknown option: ${a}\n\n${HELP_TEXT}`);
    }
  }
}

function assertHasValue(flag: string): void {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) {
    throw new CliUsageError(`Missing value for ${flag}\n\n${HELP_TEXT}`);
  }
}


function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function getFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseOnlyCaseIds(): string[] | null {
  const raw = getArg("--only");
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return ids.length ? ids : null;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveFromRoot(repoRoot: string, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(repoRoot, p);
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseCasesJson(raw: string): CaseFileItem[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("cases.json must be an array");

  return parsed.map((x) => {
    if (!isRecord(x)) throw new Error("cases.json element must be an object");

    const id = String(x.id);
    const title = String(x.title ?? "");
    const inputObj = isRecord(x.input) ? x.input : {};
    const user = String(inputObj.user ?? "");
    const context = inputObj.context;

    return { id, title, input: { user, context }, expected: x.expected, metadata: x.metadata };
  });
}

async function runOneCase(baseUrl: string, version: Version, c: CaseFileItem): Promise<unknown> {
  const reqBody: RunCaseRequest = {
    case_id: c.id,
    version,
    input: { user: c.input.user, context: c.input.context }
  };

  const url = `${baseUrl}/run-case`;

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    },
    15000
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`run-case failed: ${res.status} ${res.statusText}; case_id=${c.id}; version=${version}; body=${text}`);
  }

  return JSON.parse(text) as unknown;
}

//tool/apps/runner/src/index.ts
async function main(): Promise<void> {
  const repoRoot = getArg("--repoRoot") ?? process.env.INIT_CWD ?? process.cwd();
  const rel = (p: string) => path.relative(repoRoot, p).split(path.sep).join("/");

  if (hasFlag("--help", "-h")) {
    console.log(HELP_TEXT);
    return;
  }

  assertNoUnknownOptions(new Set(["--repoRoot", "--baseUrl", "--cases", "--outDir", "--runId", "--only", "--dryRun", "--help", "-h"]));
  assertHasValue("--repoRoot");
  assertHasValue("--baseUrl");
  assertHasValue("--cases");
  assertHasValue("--outDir");
  assertHasValue("--runId");
  assertHasValue("--only");

  const cfg: RunnerConfig = {
    repoRoot,
    baseUrl: normalizeBaseUrl(getArg("--baseUrl") ?? "http://localhost:8787"),
    casesPath: resolveFromRoot(repoRoot, getArg("--cases") ?? "cases/cases.json"),
    outDir: resolveFromRoot(repoRoot, getArg("--outDir") ?? "apps/runner/runs"),
    runId: getArg("--runId") ?? randomUUID(),
    onlyCaseIds: parseOnlyCaseIds(),
  };

  const dryRun = getFlag("--dryRun");


  const raw = await readFile(cfg.casesPath, "utf-8");
  const cases = parseCasesJson(raw);

  const selectedCases = cfg.onlyCaseIds ? cases.filter((c) => cfg.onlyCaseIds!.includes(c.id)) : cases;

  if (selectedCases.length === 0) throw new Error("No cases selected. Check --only or cases.json content.");

  const baselineDir = path.join(cfg.outDir, "baseline", cfg.runId);
  const newDir = path.join(cfg.outDir, "new", cfg.runId);

  await ensureDir(baselineDir);
  await ensureDir(newDir);

  const runMeta = {
    run_id: cfg.runId,
    base_url: cfg.baseUrl,
    cases_path: rel(cfg.casesPath),
    selected_case_ids: selectedCases.map((c) => c.id),
    started_at: Date.now(),
    versions: ["baseline", "new"] as const
  };

  console.log("Runner started");
  console.log("repoRoot:", cfg.repoRoot);
  console.log("baseUrl:", cfg.baseUrl);
  console.log("cases:", selectedCases.length);
  console.log("runId:", cfg.runId);
    console.log("outDir:", rel(cfg.outDir));

  if (cfg.onlyCaseIds) console.log("only:", cfg.onlyCaseIds.join(", "));
  if (dryRun) console.log("dryRun:", true);

  for (const c of selectedCases) {
    console.log("Case:", c.id);
    if (dryRun) continue;

    const baselineResp = await runOneCase(cfg.baseUrl, "baseline", c);
    await writeFile(path.join(baselineDir, `${c.id}.json`), JSON.stringify(baselineResp, null, 2), "utf-8");

    const newResp = await runOneCase(cfg.baseUrl, "new", c);
    await writeFile(path.join(newDir, `${c.id}.json`), JSON.stringify(newResp, null, 2), "utf-8");
  }

  const finished = { ...runMeta, ended_at: Date.now() };

  await writeFile(path.join(baselineDir, "run.json"), JSON.stringify(finished, null, 2), "utf-8");
  await writeFile(path.join(newDir, "run.json"), JSON.stringify(finished, null, 2), "utf-8");

  console.log("Runner finished");
    console.log("baseline:", rel(baselineDir));
  console.log("new:", rel(newDir));

}

//tool/apps/runner/src/index.ts
main().catch((err) => {
  if (err && typeof err === "object" && "exitCode" in err && typeof (err as { exitCode: unknown }).exitCode === "number") {
    const note = err instanceof Error ? err.message : String(err);
    console.error(note);
    process.exit((err as { exitCode: number }).exitCode);
  }

  console.error(String(err instanceof Error ? err.stack : err));
  process.exit(1);
});
