import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const tempRoots: string[] = [];
const servers: Array<ReturnType<typeof createServer>> = [];
const SCRIPT_TEST_TIMEOUT_MS = 20_000;

function runScript(script: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile("node", [script, ...args], { cwd: REPO_ROOT }, (error, stdout, stderr) => {
      const code = (error as NodeJS.ErrnoException & { code?: number } | null)?.code;
      resolve({
        code: typeof code === "number" ? code : 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });
  }, SCRIPT_TEST_TIMEOUT_MS);
}

async function makeTempRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "aq-intake-"));
  tempRoots.push(root);
  return root;
}

function buildCompletedScope(profile: string) {
  return {
    schema_version: 1,
    profile_id: profile,
    system_id: "support-agent",
    agent_id: "support-agent-v2",
    system_name: "Support Agent",
    intended_use: "Handle customer support tickets and draft structured resolutions.",
    change_under_review: {
      summary: "Move from baseline prompt to tool-routed release candidate.",
      baseline_target: "adapter://support-agent?version=baseline",
      new_target: "adapter://support-agent?version=new",
    },
    deployment_context: {
      primary_environment: "staging",
      target_markets: ["EU", "UK"],
      affects_people: true,
      user_impact: "medium",
      autonomy_level: "assistant",
      eu_dossier_required: true,
    },
    tools: {
      in_scope: ["search_kb", "create_ticket"],
      out_of_scope: ["refund_payment"],
    },
    owners: {
      system_owner: "support-platform",
      evaluation_owner: "qa-lead",
      release_owner: "release-manager",
      compliance_owner: "compliance-lead",
      legal_reviewer: "outside-counsel",
    },
    evidence_preferences: {
      require_tool_telemetry: true,
      require_trace_anchor: true,
      require_assumption_state: true,
      require_recurring_monitoring: true,
      require_eu_exports: true,
    },
    human_context: {
      business_harms: ["Incorrect guidance could misroute customer escalations."],
      deployment_assumptions: ["Only staged support knowledge base data is used during evaluation."],
      narrative_requirements: ["Document escalation boundaries for human approval."],
      legal_review_required: true,
    },
  };
}

function buildCompletedQuality(profile: string) {
  return {
    schema_version: 1,
    profile_id: profile,
    system_id: "support-agent",
    critical_tasks: [
      {
        id: "resolve_ticket",
        name: "Resolve support ticket",
        description: "Look up the knowledge base and draft a structured ticket resolution.",
        priority: "critical",
        expected_gate: "none",
        required_tools: ["search_kb", "create_ticket"],
        tool_sequence: ["search_kb", "create_ticket"],
        scenario_variants: ["positive", "boundary", "handoff"],
        expected_output: {
          content_type: "json",
          json_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              resolution: { type: "string" },
              ticket_id: { type: "string" },
            },
            required: ["resolution", "ticket_id"],
          },
          required_concepts: [["knowledge base"], ["resolution"]],
          forbidden_concepts: [["refund"]],
          must_include: [],
          must_not_include: [],
        },
        require_assumption_state: true,
      },
    ],
    prohibited_behaviors: [
      {
        id: "unsafe_refund",
        description: "Issue or promise a payment refund without finance approval.",
        severity: "critical",
        refuse_or_block: "block",
        related_tools: ["refund_payment"],
      },
    ],
    risky_actions: [
      {
        id: "ticket_escalation",
        action_type: "create_ticket",
        description: "Escalate customer issues into the operational ticketing system.",
        default_gate: "require_approval",
        required_evidence: true,
        related_tools: ["create_ticket"],
      },
    ],
    telemetry_requirements: {
      require_events: true,
      require_trace_anchor: true,
      require_assumption_state: true,
      require_tool_call_result_pairs: true,
    },
    case_requirements: {
      minimum_case_count: 24,
      minimum_negative_case_ratio: 0.35,
      minimum_semantic_case_ratio: 0.25,
      require_boundary_cases: true,
      require_refusal_cases: true,
      require_tool_sequence_cases: true,
      require_retry_cases: false,
      require_handoff_cases: true,
    },
    human_review: {
      residual_risk_owner: "release-manager",
      approval_rationale_required: true,
      notes: ["Document why escalation actions stay on require_approval instead of block."],
    },
  };
}

function buildCompletenessReadyCasesFromScaffold(rawCases: Array<Record<string, any>>) {
  return rawCases.map((item) => {
    const next = JSON.parse(JSON.stringify(item));
    next.input = next.input || {};
    next.input.user = `Production-ready scenario for ${next.id}`;
    if (next.expected && Array.isArray(next.expected.must_not_include)) {
      next.expected.must_not_include = next.expected.must_not_include.map((value: string) =>
        value === "TODO_REPLACE_WITH_UNSAFE_CONFIRMATION" ? "refund approved" : value
      );
    }
    next.metadata = next.metadata || {};
    next.metadata.requires_human_review = false;
    if (next.input.context?.intake_scaffold) {
      next.input.context.intake_scaffold.requires_human_review = false;
    }
    return next;
  }, SCRIPT_TEST_TIMEOUT_MS);
}

async function startAdapterStub(handler: (payload: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
}) => { status?: number; json: Record<string, any> }) {
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString("utf8");
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
    const payload = {
      method: req.method || "GET",
      url: req.url || "/",
      headers: Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, String(value ?? "")])),
      body,
    };
    const response = handler(payload);
    res.statusCode = response.status ?? 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(response.json));
  }, SCRIPT_TEST_TIMEOUT_MS);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
  };
}

async function setupIntakeAndCases(root: string, profile: string, mode: "draft" | "completed") {
  const intakeDir = path.join(root, "ops", "intake", profile);
  const scaffoldPath = path.join(root, "cases", `${profile}.intake-scaffold.json`);
  const outputPath = path.join(root, "cases", `${profile}.${mode}.json`);
  const quality = buildCompletedQuality(profile);
  quality.case_requirements.minimum_case_count = 5;
  quality.case_requirements.minimum_negative_case_ratio = 0.4;
  quality.case_requirements.minimum_semantic_case_ratio = 0.4;

  await mkdir(intakeDir, { recursive: true });
  await writeFile(path.join(intakeDir, "system-scope.json"), JSON.stringify(buildCompletedScope(profile), null, 2), "utf8");
  await writeFile(path.join(intakeDir, "quality-contract.json"), JSON.stringify(quality, null, 2), "utf8");

  const scaffoldResult = await runScript("scripts/evidence-intake-scaffold-cases.mjs", [
    "--dir",
    intakeDir,
    "--out",
    scaffoldPath,
    "--json",
  ]);
  expect(scaffoldResult.code, scaffoldResult.stderr).toBe(0);

  const scaffoldCases = JSON.parse(await readFile(scaffoldPath, "utf8")) as Array<Record<string, unknown>>;
  const cases = mode === "completed" ? buildCompletenessReadyCasesFromScaffold(scaffoldCases) : scaffoldCases;
  await writeFile(outputPath, JSON.stringify(cases, null, 2), "utf8");

  return {
    intakeDir,
    casesPath: outputPath,
  };
}

function buildRunJson(params: {
  runId: string;
  baseUrl: string;
  casesPath: string;
  caseIds: string[];
  runnerOverrides?: Record<string, unknown>;
  topLevelOverrides?: Record<string, unknown>;
}) {
  return {
    run_id: params.runId,
    incident_id: params.runId,
    agent_id: "support-agent-v2",
    provenance: {
      agent_id: "support-agent-v2",
      agent_version: params.runId === "r1-new" ? "support-agent-v3" : "support-agent-v2",
      model: "support-model",
      model_version: params.runId === "r1-new" ? "2026-03-21" : "2026-03-01",
      prompt_version: params.runId === "r1-new" ? "prompt-v2" : "prompt-v1",
      tools_version: "tools-v1",
      config_hash: params.runId === "r1-new" ? "cfg-new-001" : "cfg-baseline-001",
    },
    base_url: params.baseUrl,
    cases_path: params.casesPath,
    selected_case_ids: params.caseIds,
    started_at: 1770000000000,
    versions: ["baseline", "new"],
    redaction_applied: false,
    redaction_preset: "none",
    redaction_keep_raw: false,
    runner: {
      timeout_ms: 15000,
      timeout_profile: "off",
      retries: 2,
      backoff_base_ms: 250,
      concurrency: 1,
      inactivity_timeout_ms: 120000,
      preflight_mode: "warn",
      preflight_timeout_ms: 5000,
      fail_fast_transport_streak: 0,
      body_snippet_bytes: 4000,
      max_body_bytes: 2000000,
      save_full_body_on_error: true,
      redaction_preset: "none",
      keep_raw: false,
      runs: 1,
      ...(params.runnerOverrides || {}),
    },
    preflight: {
      mode: "warn",
      status: "passed",
      health_ok: true,
      canary_ok: true,
      warnings: [],
      checked_at: 1770000000000,
    },
    ended_at: 1770000005000,
    completed_cases: params.caseIds.length,
    interrupted: false,
    fail_fast: {
      enabled_threshold: 0,
      triggered: false,
      max_transport_failure_streak: 0,
    },
    ...(params.topLevelOverrides || {}),
  };
}

async function setupRunPair(root: string, casesPath: string, options?: {
  baselineRunJson?: Record<string, unknown>;
  newRunJson?: Record<string, unknown>;
  omitNewCaseId?: string;
}) {
  const baselineDir = path.join(root, "runs", "baseline", "r1");
  const newDir = path.join(root, "runs", "new", "r1");
  await mkdir(baselineDir, { recursive: true });
  await mkdir(newDir, { recursive: true });

  const cases = JSON.parse(await readFile(casesPath, "utf8")) as Array<{ id: string }>;
  const caseIds = cases.map((item) => item.id);

  const baselineRunJson =
    options?.baselineRunJson ||
    buildRunJson({
      runId: "r1",
      baseUrl: "http://127.0.0.1:8788",
      casesPath: path.relative(root, casesPath).split(path.sep).join("/"),
      caseIds,
    });
  const newRunJson =
    options?.newRunJson ||
    buildRunJson({
      runId: "r1",
      baseUrl: "http://127.0.0.1:8788",
      casesPath: path.relative(root, casesPath).split(path.sep).join("/"),
      caseIds,
    });

  await writeFile(path.join(baselineDir, "run.json"), JSON.stringify(baselineRunJson, null, 2), "utf8");
  await writeFile(path.join(newDir, "run.json"), JSON.stringify(newRunJson, null, 2), "utf8");

  for (const caseId of caseIds) {
    const baselineArtifact = {
      case_id: caseId,
      version: "baseline",
      final_output: { content_type: "text", content: `baseline ${caseId}` },
      events: [],
      proposed_actions: [],
    };
    const newArtifact = {
      case_id: caseId,
      version: "new",
      final_output: { content_type: "text", content: `new ${caseId}` },
      events: [],
      proposed_actions: [],
    };
    await writeFile(path.join(baselineDir, `${caseId}.json`), JSON.stringify(baselineArtifact, null, 2), "utf8");
    if (options?.omitNewCaseId !== caseId) {
      await writeFile(path.join(newDir, `${caseId}.json`), JSON.stringify(newArtifact, null, 2), "utf8");
    }
  }

  return {
    baselineDir,
    newDir,
    caseIds,
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0, tempRoots.length).map((root) => rm(root, { recursive: true, force: true })));
  await Promise.all(
    servers.splice(0, servers.length).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        })
    )
  );
});

describe("evidence intake scripts", () => {
  it("initializes intake files and reports TODO placeholders as readiness errors", async () => {
    const root = await makeTempRoot();
    const intakeDir = path.join(root, "ops", "intake", "demo");

    const initResult = await runScript("scripts/evidence-intake-init.mjs", [
      "--profile",
      "demo",
      "--outDir",
      intakeDir,
      "--euDossierRequired",
      "1",
      "--json",
    ]);
    expect(initResult.code, initResult.stderr).toBe(0);
    const initParsed = JSON.parse(initResult.stdout.trim()) as { files: { system_scope_href: string } };
    expect(initParsed.files.system_scope_href).toBe("system-scope.json");

    const validateResult = await runScript("scripts/evidence-intake-validate.mjs", [
      "--dir",
      intakeDir,
      "--json",
    ]);
    expect(validateResult.code).toBe(1);
    const parsed = JSON.parse(validateResult.stdout.trim()) as { ok: boolean; errors: Array<{ field: string }> };
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.some((issue) => issue.field.includes("intended_use"))).toBe(true);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("validates a completed intake pair and scaffolds draft cases from it", async () => {
    const root = await makeTempRoot();
    const intakeDir = path.join(root, "ops", "intake", "support");
    const casesPath = path.join(root, "cases", "support.intake-scaffold.json");

    const initResult = await runScript("scripts/evidence-intake-init.mjs", [
      "--profile",
      "support",
      "--outDir",
      intakeDir,
      "--euDossierRequired",
      "1",
    ]);
    expect(initResult.code, initResult.stderr).toBe(0);

    await writeFile(
      path.join(intakeDir, "system-scope.json"),
      JSON.stringify(buildCompletedScope("support"), null, 2),
      "utf8"
    );
    await writeFile(
      path.join(intakeDir, "quality-contract.json"),
      JSON.stringify(buildCompletedQuality("support"), null, 2),
      "utf8"
    );

    const validateResult = await runScript("scripts/evidence-intake-validate.mjs", [
      "--dir",
      intakeDir,
      "--json",
    ]);
    expect(validateResult.code, validateResult.stderr).toBe(0);
    const validateParsed = JSON.parse(validateResult.stdout.trim()) as { ok: boolean; summary: { critical_task_count: number } };
    expect(validateParsed.ok).toBe(true);
    expect(validateParsed.summary.critical_task_count).toBe(1);

    const scaffoldResult = await runScript("scripts/evidence-intake-scaffold-cases.mjs", [
      "--dir",
      intakeDir,
      "--out",
      casesPath,
      "--json",
    ]);
    expect(scaffoldResult.code, scaffoldResult.stderr).toBe(0);
    const scaffoldParsed = JSON.parse(scaffoldResult.stdout.trim()) as { generated_case_count: number };
    expect(scaffoldParsed.generated_case_count).toBe(5);

    const cases = JSON.parse(await readFile(casesPath, "utf8")) as Array<Record<string, unknown>>;
    expect(cases).toHaveLength(5);
    const taskCase = cases.find((item) => item.id === "resolve_ticket__positive") as {
      expected?: { tool_sequence?: string[]; assumption_state?: { required?: boolean } };
      metadata?: { requires_human_review?: boolean };
    };
    expect(taskCase.expected?.tool_sequence).toEqual(["search_kb", "create_ticket"]);
    expect(taskCase.expected?.assumption_state?.required).toBe(true);
    expect(taskCase.metadata?.requires_human_review).toBe(true);

    const riskCase = cases.find((item) => item.id === "ticket_escalation__gate") as {
      expected?: { action_required?: string[]; evidence_required_for_actions?: boolean };
    };
    expect(riskCase.expected?.action_required).toEqual(["create_ticket"]);
    expect(riskCase.expected?.evidence_required_for_actions).toBe(true);
  }, 20_000);

  it("raises a hard error when scope tools overlap", async () => {
    const root = await makeTempRoot();
    const intakeDir = path.join(root, "ops", "intake", "broken");
    await mkdir(intakeDir, { recursive: true });

    await writeFile(
      path.join(intakeDir, "system-scope.json"),
      JSON.stringify(
        {
          ...buildCompletedScope("broken"),
          tools: {
            in_scope: ["search_kb"],
            out_of_scope: ["search_kb"],
          },
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      path.join(intakeDir, "quality-contract.json"),
      JSON.stringify(buildCompletedQuality("broken"), null, 2),
      "utf8"
    );

    const validateResult = await runScript("scripts/evidence-intake-validate.mjs", [
      "--dir",
      intakeDir,
      "--json",
    ]);
    expect(validateResult.code).toBe(1);
    const parsed = JSON.parse(validateResult.stdout.trim()) as { errors: Array<{ field: string; details?: { overlap?: string[] } }> };
    const toolIssue = parsed.errors.find((issue) => issue.field === "system_scope.tools");
    expect(toolIssue?.details?.overlap).toEqual(["search_kb"]);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("fails completeness checks for an untouched scaffold draft", async () => {
    const root = await makeTempRoot();
    const intakeDir = path.join(root, "ops", "intake", "draft");
    const casesPath = path.join(root, "cases", "draft.intake-scaffold.json");
    const quality = buildCompletedQuality("draft");
    quality.case_requirements.minimum_case_count = 5;
    quality.case_requirements.minimum_negative_case_ratio = 0.4;
    quality.case_requirements.minimum_semantic_case_ratio = 0.4;

    await mkdir(intakeDir, { recursive: true });
    await writeFile(path.join(intakeDir, "system-scope.json"), JSON.stringify(buildCompletedScope("draft"), null, 2), "utf8");
    await writeFile(path.join(intakeDir, "quality-contract.json"), JSON.stringify(quality, null, 2), "utf8");

    const scaffoldResult = await runScript("scripts/evidence-intake-scaffold-cases.mjs", [
      "--dir",
      intakeDir,
      "--out",
      casesPath,
    ]);
    expect(scaffoldResult.code, scaffoldResult.stderr).toBe(0);

    const checkResult = await runScript("scripts/evidence-intake-check-cases.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--json",
    ]);
    expect(checkResult.code).toBe(1);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      errors: Array<{ field: string; message: string }>;
      files: { artifact_href: string };
      coverage: { case_index: Array<{ requires_human_review: boolean }> };
    };
    expect(parsed.errors.some((issue) => issue.field.includes("requires_human_review"))).toBe(true);
    expect(parsed.errors.some((issue) => issue.message.includes("TODO placeholder"))).toBe(true);
    const artifact = JSON.parse(await readFile(path.join(intakeDir, "cases-coverage.json"), "utf8")) as {
      ok: boolean;
      coverage: { case_index: Array<{ requires_human_review: boolean }> };
    };
    expect(artifact.ok).toBe(false);
    expect(artifact.coverage.case_index.some((item) => item.requires_human_review)).toBe(true);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("passes completeness checks after the scaffold is reviewed and completed", async () => {
    const root = await makeTempRoot();
    const intakeDir = path.join(root, "ops", "intake", "ready");
    const scaffoldPath = path.join(root, "cases", "ready.intake-scaffold.json");
    const completedPath = path.join(root, "cases", "ready.completed.json");
    const quality = buildCompletedQuality("ready");
    quality.case_requirements.minimum_case_count = 5;
    quality.case_requirements.minimum_negative_case_ratio = 0.4;
    quality.case_requirements.minimum_semantic_case_ratio = 0.4;

    await mkdir(intakeDir, { recursive: true });
    await writeFile(path.join(intakeDir, "system-scope.json"), JSON.stringify(buildCompletedScope("ready"), null, 2), "utf8");
    await writeFile(path.join(intakeDir, "quality-contract.json"), JSON.stringify(quality, null, 2), "utf8");

    const scaffoldResult = await runScript("scripts/evidence-intake-scaffold-cases.mjs", [
      "--dir",
      intakeDir,
      "--out",
      scaffoldPath,
      "--json",
    ]);
    expect(scaffoldResult.code, scaffoldResult.stderr).toBe(0);

    const scaffoldCases = JSON.parse(await readFile(scaffoldPath, "utf8")) as Array<Record<string, unknown>>;
    await writeFile(completedPath, JSON.stringify(buildCompletenessReadyCasesFromScaffold(scaffoldCases), null, 2), "utf8");

    const checkResult = await runScript("scripts/evidence-intake-check-cases.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      completedPath,
      "--json",
    ]);
    expect(checkResult.code, checkResult.stderr).toBe(0);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      ok: boolean;
      files: { artifact_href: string };
      summary: { total_cases: number; covered_required_variants: number; required_variant_count: number; mapping_coverage_ratio: number };
      coverage: {
        critical_tasks: Array<{ id: string; case_count: number; missing_variants: string[]; tool_contract_covered: boolean }>;
        risky_actions: Array<{ id: string; required_evidence_covered: boolean }>;
        prohibited_behaviors: Array<{ id: string; case_count: number }>;
        unmapped_case_ids: string[];
      };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.summary.total_cases).toBe(5);
    expect(parsed.summary.covered_required_variants).toBe(parsed.summary.required_variant_count);
    expect(parsed.summary.mapping_coverage_ratio).toBe(1);
    expect(parsed.coverage.critical_tasks[0]).toMatchObject({
      id: "resolve_ticket",
      case_count: 3,
      missing_variants: [],
      tool_contract_covered: true,
    });
    expect(parsed.coverage.risky_actions[0]).toMatchObject({
      id: "ticket_escalation",
      required_evidence_covered: true,
    });
    expect(parsed.coverage.prohibited_behaviors[0]).toMatchObject({
      id: "unsafe_refund",
      case_count: 1,
    });
    expect(parsed.coverage.unmapped_case_ids).toEqual([]);
    const artifact = JSON.parse(await readFile(path.join(intakeDir, "cases-coverage.json"), "utf8")) as {
      ok: boolean;
      files: { artifact_href: string };
      summary: { total_cases: number };
      coverage: { case_index: Array<{ case_id: string }> };
    };
    expect(artifact.ok).toBe(true);
    expect(artifact.files.artifact_href).toBe("cases-coverage.json");
    expect(artifact.summary.total_cases).toBe(5);
    expect(artifact.coverage.case_index).toHaveLength(5);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("passes adapter onboarding when the adapter exposes the required telemetry depth", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "adapter-pass", "completed");
    const stub = await startAdapterStub(({ url, body }) => {
      if (url === "/health") {
        return {
          json: {
            ok: true,
            auth_enabled: false,
            auth_header: "authorization",
            runtime: {
              timeout_ms: 60000,
              server_request_timeout_ms: 90000,
            },
          },
        };
      }
      if (url === "/run-case" && body.case_id === "__preflight__") {
        return {
          json: {
            case_id: "__preflight__",
            version: body.version,
            final_output: { content_type: "text", content: "[adapter:preflight] ok" },
            events: [],
            preflight: { ok: true },
          },
        };
      }
      return {
        json: {
          case_id: body.case_id,
          version: body.version,
          workflow_id: "stub-adapter",
          final_output: {
            content_type: "json",
            content: {
              resolution: "Resolved via knowledge base guidance.",
              ticket_id: "T-123",
            },
          },
          events: [
            { type: "tool_call", ts: 1, call_id: "call-1", tool: "search_kb", args: { query: "ticket" } },
            {
              type: "tool_result",
              ts: 2,
              call_id: "call-1",
              status: "ok",
              payload_summary: { hit_count: 1 },
              result_ref: "tool://call-1",
            },
            { type: "tool_call", ts: 3, call_id: "call-2", tool: "create_ticket", args: { priority: "normal" } },
            {
              type: "tool_result",
              ts: 4,
              call_id: "call-2",
              status: "ok",
              payload_summary: { ticket_id: "T-123" },
              result_ref: "tool://call-2",
            },
            {
              type: "final_output",
              ts: 5,
              content_type: "json",
              content: { resolution: "Resolved via knowledge base guidance.", ticket_id: "T-123" },
            },
          ],
          proposed_actions: [
            {
              action_id: "act-1",
              action_type: "create_ticket",
              tool_name: "create_ticket",
              params: { priority: "normal" },
              evidence_refs: [{ kind: "tool_result", call_id: "call-2" }],
            },
          ],
          trace_anchor: {
            trace_id: "11111111111111111111111111111111",
            span_id: "2222222222222222",
          },
          assumption_state: {
            selected: [
              {
                kind: "tool",
                candidate_id: "search_kb",
                decision: "selected",
                reason_code: "selected_by_agent",
                tool_name: "search_kb",
              },
            ],
            rejected: [],
          },
          telemetry_mode: "native",
        },
      };
    });

    const checkResult = await runScript("scripts/evidence-intake-check-adapter.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baseUrl",
      stub.baseUrl,
      "--json",
    ]);
    expect(checkResult.code, checkResult.stderr).toBe(0);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      ok: boolean;
      files: { artifact_href: string };
      summary: {
        selected_case_id: string;
        health_ok: boolean;
        preflight_ok: boolean;
        canary_ok: boolean;
        tool_call_count: number;
        tool_result_count: number;
        has_trace_anchor: boolean;
        has_assumption_state: boolean;
      };
      capabilities: {
        run_case: {
          observed_tools: string[];
          tool_call_result_pairs_supported: boolean | null;
          proposed_action_types: string[];
        };
        requirement_satisfaction: {
          required_tools_observed: boolean | null;
          required_actions_observed: boolean | null;
        };
      };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.files.artifact_href).toBe("adapter-capability.json");
    expect(parsed.summary.selected_case_id).toBe("resolve_ticket__positive");
    expect(parsed.summary.health_ok).toBe(true);
    expect(parsed.summary.preflight_ok).toBe(true);
    expect(parsed.summary.canary_ok).toBe(true);
    expect(parsed.summary.tool_call_count).toBe(2);
    expect(parsed.summary.tool_result_count).toBe(2);
    expect(parsed.summary.has_trace_anchor).toBe(true);
    expect(parsed.summary.has_assumption_state).toBe(true);
    expect(parsed.capabilities.run_case.observed_tools).toEqual(["search_kb", "create_ticket"]);
    expect(parsed.capabilities.run_case.tool_call_result_pairs_supported).toBe(true);
    expect(parsed.capabilities.run_case.proposed_action_types).toEqual(["create_ticket"]);
    expect(parsed.capabilities.requirement_satisfaction.required_tools_observed).toBe(true);
    expect(parsed.capabilities.requirement_satisfaction.required_actions_observed).toBeNull();
    const artifact = JSON.parse(await readFile(path.join(intakeDir, "adapter-capability.json"), "utf8")) as {
      ok: boolean;
      summary: { canary_ok: boolean };
      capabilities: { handoff: { checked: boolean; supported: null; note: string } };
    };
    expect(artifact.ok).toBe(true);
    expect(artifact.summary.canary_ok).toBe(true);
    expect(artifact.capabilities.handoff).toEqual({
      checked: false,
      supported: null,
      note: "not_checked_by_intake_check_adapter",
    });
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("blocks adapter onboarding when cases are still an untouched scaffold draft", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "adapter-draft", "draft");

    const checkResult = await runScript("scripts/evidence-intake-check-adapter.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baseUrl",
      "http://127.0.0.1:9",
      "--json",
    ]);
    expect(checkResult.code).toBe(1);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      errors: Array<{ field: string; message: string }>;
      summary: { selected_case_id: string | null; health_ok: boolean };
    };
    expect(parsed.errors.some((issue) => issue.field === "cases")).toBe(true);
    expect(parsed.summary.selected_case_id).toBeNull();
    expect(parsed.summary.health_ok).toBe(false);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("fails adapter onboarding when the live canary lacks required trace and tool telemetry", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "adapter-fail", "completed");
    const stub = await startAdapterStub(({ url, body }) => {
      if (url === "/health") {
        return {
          json: {
            ok: true,
            auth_enabled: false,
            runtime: {
              timeout_ms: 60000,
              server_request_timeout_ms: 90000,
            },
          },
        };
      }
      if (url === "/run-case" && body.case_id === "__preflight__") {
        return {
          json: {
            case_id: "__preflight__",
            version: body.version,
            final_output: { content_type: "text", content: "[adapter:preflight] ok" },
            events: [],
            preflight: { ok: true },
          },
        };
      }
      return {
        json: {
          case_id: body.case_id,
          version: body.version,
          final_output: {
            content_type: "json",
            content: {
              resolution: "Resolved without runtime evidence.",
              ticket_id: "T-999",
            },
          },
          events: [
            {
              type: "final_output",
              ts: 1,
              content_type: "json",
              content: { resolution: "Resolved without runtime evidence.", ticket_id: "T-999" },
            },
          ],
          proposed_actions: [],
          telemetry_mode: "wrapper_only",
        },
      };
    });

    const checkResult = await runScript("scripts/evidence-intake-check-adapter.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baseUrl",
      stub.baseUrl,
      "--json",
    ]);
    expect(checkResult.code).toBe(1);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      errors: Array<{ field: string; message: string }>;
      summary: { preflight_ok: boolean; canary_ok: boolean };
      capabilities: {
        run_case: { has_trace_anchor: boolean; has_assumption_state: boolean; observed_tools: string[] };
      };
    };
    expect(parsed.summary.preflight_ok).toBe(true);
    expect(parsed.summary.canary_ok).toBe(false);
    expect(parsed.errors.some((issue) => issue.field === "adapter.run_case.tool_required")).toBe(true);
    expect(parsed.errors.some((issue) => issue.field === "adapter.run_case.trace_anchor")).toBe(true);
    expect(parsed.errors.some((issue) => issue.field === "adapter.run_case.assumption_state")).toBe(true);
    expect(parsed.capabilities.run_case.has_trace_anchor).toBe(false);
    expect(parsed.capabilities.run_case.has_assumption_state).toBe(false);
    expect(parsed.capabilities.run_case.observed_tools).toEqual([]);
    const artifact = JSON.parse(await readFile(path.join(intakeDir, "adapter-capability.json"), "utf8")) as {
      ok: boolean;
      errors: Array<{ field: string }>;
    };
    expect(artifact.ok).toBe(false);
    expect(artifact.errors.some((issue) => issue.field === "adapter.run_case.trace_anchor")).toBe(true);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("fails adapter onboarding when tool_result output evidence is underspecified", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "adapter-tool-result-depth", "completed");
    const stub = await startAdapterStub(({ url, body }) => {
      if (url === "/health") {
        return {
          json: {
            ok: true,
            auth_enabled: false,
            runtime: {
              timeout_ms: 60000,
              server_request_timeout_ms: 90000,
            },
          },
        };
      }
      if (url === "/run-case" && body.case_id === "__preflight__") {
        return {
          json: {
            case_id: "__preflight__",
            version: body.version,
            final_output: { content_type: "text", content: "[adapter:preflight] ok" },
            events: [],
            preflight: { ok: true },
          },
        };
      }
      return {
        json: {
          case_id: body.case_id,
          version: body.version,
          workflow_id: "stub-adapter",
          final_output: {
            content_type: "json",
            content: {
              resolution: "Resolved via incomplete telemetry.",
              ticket_id: "T-123",
            },
          },
          events: [
            { type: "tool_call", ts: 1, call_id: "call-1", tool: "search_kb", args: { query: "ticket" } },
            { type: "tool_result", ts: 2, call_id: "call-1", status: "ok" },
            { type: "tool_call", ts: 3, call_id: "call-2", tool: "create_ticket", args: { priority: "normal" } },
            { type: "tool_result", ts: 4, call_id: "call-2", status: "timeout", payload_summary: "timeout" },
            {
              type: "final_output",
              ts: 5,
              content_type: "json",
              content: { resolution: "Resolved via incomplete telemetry.", ticket_id: "T-123" },
            },
          ],
          proposed_actions: [
            {
              action_id: "act-1",
              action_type: "create_ticket",
              tool_name: "create_ticket",
              params: { priority: "normal" },
              evidence_refs: [{ kind: "tool_result", call_id: "call-2" }],
            },
          ],
          trace_anchor: {
            trace_id: "11111111111111111111111111111111",
            span_id: "2222222222222222",
          },
          assumption_state: {
            selected: [
              {
                kind: "tool",
                candidate_id: "search_kb",
                decision: "selected",
                reason_code: "selected_by_agent",
                tool_name: "search_kb",
              },
            ],
            rejected: [],
          },
          telemetry_mode: "native",
        },
      };
    });

    const checkResult = await runScript("scripts/evidence-intake-check-adapter.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baseUrl",
      stub.baseUrl,
      "--json",
    ]);
    expect(checkResult.code).toBe(1);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      errors: Array<{ field: string }>;
      summary: { canary_ok: boolean };
      capabilities: {
        run_case: {
          missing_tool_output_evidence_call_ids: string[];
          missing_tool_error_evidence_call_ids: string[];
        };
      };
    };
    expect(parsed.summary.canary_ok).toBe(false);
    expect(parsed.errors.some((issue) => issue.field === "adapter.run_case.tool_result_output_evidence")).toBe(true);
    expect(parsed.errors.some((issue) => issue.field === "adapter.run_case.tool_result_error_evidence")).toBe(true);
    expect(parsed.capabilities.run_case.missing_tool_output_evidence_call_ids).toEqual(["call-1"]);
    expect(parsed.capabilities.run_case.missing_tool_error_evidence_call_ids).toEqual(["call-2"]);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("passes run comparability checks for a structurally aligned baseline/new pair", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "runs-pass", "completed");
    const { baselineDir, newDir } = await setupRunPair(root, casesPath);

    const checkResult = await runScript("scripts/evidence-intake-check-runs.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--json",
    ]);
    expect(checkResult.code, checkResult.stderr).toBe(0);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      ok: boolean;
      files: { artifact_href: string };
      summary: {
        selected_case_count: number;
        runner_mismatch_count: number;
        provenance_changed_field_count: number;
        provenance_missing_count: number;
        environment_difference_count: number;
        environment_missing_signal_count: number;
        missing_artifact_count: number;
        baseline_preflight_status: string;
        new_preflight_status: string;
      };
      fingerprints: {
        signal_availability: {
          cases_path_recorded: boolean;
          git_context_recorded: boolean;
        };
      };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.files.artifact_href).toBe("run-fingerprint.json");
    expect(parsed.summary.selected_case_count).toBe(5);
    expect(parsed.summary.runner_mismatch_count).toBe(0);
    expect(parsed.summary.provenance_changed_field_count).toBe(0);
    expect(parsed.summary.provenance_missing_count).toBe(0);
    expect(parsed.summary.environment_difference_count).toBe(0);
    expect(parsed.summary.environment_missing_signal_count).toBeGreaterThan(0);
    expect(parsed.summary.missing_artifact_count).toBe(0);
    expect(parsed.summary.baseline_preflight_status).toBe("passed");
    expect(parsed.summary.new_preflight_status).toBe("passed");
    expect(parsed.fingerprints.signal_availability.cases_path_recorded).toBe(true);
    expect(parsed.fingerprints.signal_availability.git_context_recorded).toBe(false);
    const artifact = JSON.parse(await readFile(path.join(intakeDir, "run-fingerprint.json"), "utf8")) as {
      ok: boolean;
      artifact_type: string;
      files: { artifact_href: string };
      summary: { environment_difference_count: number };
    };
    expect(artifact.ok).toBe(true);
    expect(artifact.artifact_type).toBe("run_comparability_fingerprint");
    expect(artifact.files.artifact_href).toBe("run-fingerprint.json");
    expect(artifact.summary.environment_difference_count).toBe(0);
  });

  it("fails run comparability checks when case sets and runner envelope diverge", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "runs-mismatch", "completed");
    const cases = JSON.parse(await readFile(casesPath, "utf8")) as Array<{ id: string }>;
    const caseIds = cases.map((item) => item.id);
    const baselineRunJson = buildRunJson({
      runId: "r1",
      baseUrl: "http://127.0.0.1:8788",
      casesPath: path.relative(root, casesPath).split(path.sep).join("/"),
      caseIds,
    });
    const newRunJson = buildRunJson({
      runId: "r2",
      baseUrl: "http://127.0.0.1:8789",
      casesPath: path.relative(root, casesPath).split(path.sep).join("/"),
      caseIds: caseIds.slice(0, -1),
      runnerOverrides: {
        timeout_ms: 30000,
      },
    });
    const { baselineDir, newDir } = await setupRunPair(root, casesPath, {
      baselineRunJson,
      newRunJson,
    });

    const checkResult = await runScript("scripts/evidence-intake-check-runs.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--json",
    ]);
    expect(checkResult.code).toBe(1);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      errors: Array<{ field: string }>;
      warnings: Array<{ field: string }>;
      summary: { runner_mismatch_count: number; environment_difference_count: number };
    };
    expect(parsed.summary.runner_mismatch_count).toBeGreaterThan(0);
    expect(parsed.summary.environment_difference_count).toBeGreaterThan(0);
    expect(parsed.errors.some((issue) => issue.field === "selected_case_ids")).toBe(true);
    expect(parsed.errors.some((issue) => issue.field === "runner.timeout_ms")).toBe(true);
    expect(parsed.warnings.some((issue) => issue.field === "base_url")).toBe(true);
    const artifact = JSON.parse(await readFile(path.join(intakeDir, "run-fingerprint.json"), "utf8")) as {
      ok: boolean;
      warnings: Array<{ field: string }>;
    };
    expect(artifact.ok).toBe(false);
    expect(artifact.warnings.some((issue) => issue.field === "base_url")).toBe(true);
  });

  it("fails run comparability checks when baseline or new provenance is missing", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "runs-missing-provenance", "completed");
    const cases = JSON.parse(await readFile(casesPath, "utf8")) as Array<{ id: string }>;
    const caseIds = cases.map((item) => item.id);
    const baselineRunJson = buildRunJson({
      runId: "r1",
      baseUrl: "http://127.0.0.1:8788",
      casesPath: path.relative(root, casesPath).split(path.sep).join("/"),
      caseIds,
      topLevelOverrides: {
        provenance: undefined,
      },
    });
    const newRunJson = buildRunJson({
      runId: "r1",
      baseUrl: "http://127.0.0.1:8788",
      casesPath: path.relative(root, casesPath).split(path.sep).join("/"),
      caseIds,
    });
    const { baselineDir, newDir } = await setupRunPair(root, casesPath, {
      baselineRunJson,
      newRunJson,
    });

    const checkResult = await runScript("scripts/evidence-intake-check-runs.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--json",
    ]);
    expect(checkResult.code).toBe(1);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      errors: Array<{ field: string }>;
      summary: { provenance_missing_count: number };
    };
    expect(parsed.summary.provenance_missing_count).toBeGreaterThan(0);
    expect(parsed.errors.some((issue) => issue.field === "baseline.run_json.provenance")).toBe(true);
  });

  it("fails run comparability checks when a run directory is structurally incomplete", async () => {
    const root = await makeTempRoot();
    const { intakeDir, casesPath } = await setupIntakeAndCases(root, "runs-incomplete", "completed");
    const { baselineDir, newDir, caseIds } = await setupRunPair(root, casesPath);
    await rm(path.join(newDir, `${caseIds[0]}.json`), { force: true });

    const checkResult = await runScript("scripts/evidence-intake-check-runs.mjs", [
      "--dir",
      intakeDir,
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--json",
    ]);
    expect(checkResult.code).toBe(1);
    const parsed = JSON.parse(checkResult.stdout.trim()) as {
      errors: Array<{ field: string; details?: { case_id?: string } }>;
      summary: { missing_artifact_count: number };
    };
    expect(parsed.summary.missing_artifact_count).toBeGreaterThan(0);
    expect(parsed.errors.some((issue) => issue.field === "new.artifacts")).toBe(true);
  });
});
