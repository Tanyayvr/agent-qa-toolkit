import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const QUICKSTART_SCRIPT = path.join(REPO_ROOT, "scripts", "quickstart.sh");

const tempRoots: string[] = [];

function makeTempRoot(prefix: string) {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function startAdapterServer() {
  const runCasePayloads: Array<{ case_id?: string; version?: string; input?: unknown }> = [];

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          active_cli_processes: 0,
          max_cli_processes: 1,
          runtime: {
            timeout_ms: 60_000,
            timeout_cap_ms: 60_000,
            server_request_timeout_ms: 65_000,
          },
        })
      );
      return;
    }

    if (req.method === "POST" && req.url === "/run-case") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      req.on("end", () => {
        const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          case_id?: string;
          version?: string;
          input?: { user?: string };
        };
        runCasePayloads.push(payload);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            case_id: payload.case_id,
            version: payload.version,
            final_output: {
              content_type: "text",
              content: `starter ok: ${payload.input?.user ?? "unknown"}`,
            },
            events: [],
            proposed_actions: [],
          })
        );
      });
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });

  return new Promise<{ server: http.Server; baseUrl: string; runCasePayloads: typeof runCasePayloads }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to allocate adapter port");
      }
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
        runCasePayloads,
      });
    });
  });
}

function closeServer(server: http.Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function runQuickstart(args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("bash", [QUICKSTART_SCRIPT, ...args], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function newestDir(root: string) {
  const dirs = readdirSync(root)
    .map((entry) => path.join(root, entry))
    .filter((entry) => statSync(entry).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return dirs[0];
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("quickstart script", () => {
  it("prints a dry-run plan without writing a workspace", async () => {
    const root = makeTempRoot("aq-quickstart-dry-");

    const result = await runQuickstart(
      ["--baseUrl", "http://127.0.0.1:9", "--systemType", "general", "--profile", "dry-run", "--dry-run"],
      { QUICKSTART_ROOT: root }
    );

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("Dry run only");
    expect(result.stdout).toContain("bash scripts/run-agent-profile.sh --file");
    expect(readdirSync(root)).toEqual([]);
  });

  it(
    "builds a starter evidence pack against a running adapter",
    async () => {
      const root = makeTempRoot("aq-quickstart-run-");
      const { server, baseUrl, runCasePayloads } = await startAdapterServer();

      try {
        const result = await runQuickstart(
          ["--baseUrl", baseUrl, "--systemType", "general", "--profile", "test-agent"],
          { QUICKSTART_ROOT: root }
        );

        expect(result.code, result.stderr).toBe(0);
        expect(result.stdout).toContain("First Proof Pack — test-agent");
        expect(result.stdout).toContain("starter evidence pack");
        expect(runCasePayloads.length).toBeGreaterThan(0);

        const workspaceDir = path.join(root, "test-agent");
        const reportsRoot = path.join(workspaceDir, "reports");
        const latestReportDir = newestDir(reportsRoot);
        const reportHtml = path.join(latestReportDir, "report.html");
        const compareJson = path.join(latestReportDir, "compare-report.json");
        const compare = JSON.parse(readFileSync(compareJson, "utf8")) as {
          quality_flags?: { portable_paths?: boolean };
          cases_path?: string;
        };

        expect(statSync(reportHtml).isFile()).toBe(true);
        expect(compare.quality_flags?.portable_paths).toBe(true);
        expect(compare.cases_path).toBe("_source_inputs/cases.json");
      } finally {
        await closeServer(server);
      }
    },
    90_000
  );
});
