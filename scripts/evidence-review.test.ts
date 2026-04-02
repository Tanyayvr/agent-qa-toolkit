import { spawn } from "node:child_process";
import { closeSync, mkdtempSync, openSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const tempRoots: string[] = [];
const SCRIPT_TEST_TIMEOUT_MS = 20_000;

function runScript(script: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const ioRoot = mkdtempSync(path.join(tmpdir(), "aq-review-io-"));
    tempRoots.push(ioRoot);
    const stdoutPath = path.join(ioRoot, "stdout.txt");
    const stderrPath = path.join(ioRoot, "stderr.txt");
    const stdoutFd = openSync(stdoutPath, "w");
    const stderrFd = openSync(stderrPath, "w");
    const child = spawn("node", [script, ...args], { cwd: REPO_ROOT, stdio: ["ignore", stdoutFd, stderrFd] });
    child.on("close", async (code) => {
      closeSync(stdoutFd);
      closeSync(stderrFd);
      resolve({
        code: typeof code === "number" ? code : 0,
        stdout: await readFile(stdoutPath, "utf8"),
        stderr: await readFile(stderrPath, "utf8"),
      });
    });
  }, SCRIPT_TEST_TIMEOUT_MS);
}

async function makeTempRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "aq-review-"));
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
      minimum_case_count: 20,
      minimum_negative_case_ratio: 0.3,
      minimum_semantic_case_ratio: 0.2,
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

async function copyReportFixture(fixtureRelPath: string) {
  const root = await makeTempRoot();
  const src = path.join(REPO_ROOT, fixtureRelPath);
  const dest = path.join(root, "report");
  await cp(src, dest, { recursive: true });
  return dest;
}

async function writeIntake(root: string, profile: string) {
  const intakeDir = path.join(root, "ops", "intake", profile);
  await mkdir(intakeDir, { recursive: true });
  await writeFile(path.join(intakeDir, "system-scope.json"), JSON.stringify(buildCompletedScope(profile), null, 2), "utf8");
  await writeFile(path.join(intakeDir, "quality-contract.json"), JSON.stringify(buildCompletedQuality(profile), null, 2), "utf8");
  await writeFile(
    path.join(intakeDir, "cases-coverage.json"),
    JSON.stringify(
      {
        schema_version: 1,
        artifact_type: "intake_cases_coverage",
        ok: true,
        summary: {
          profile_id: profile,
          system_id: "support-agent",
        },
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(intakeDir, "adapter-capability.json"),
    JSON.stringify(
      {
        schema_version: 1,
        artifact_type: "adapter_capability_profile",
        ok: true,
        summary: {
          profile_id: profile,
          system_id: "support-agent",
          canary_ok: true,
        },
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(intakeDir, "run-fingerprint.json"),
    JSON.stringify(
      {
        schema_version: 1,
        artifact_type: "run_comparability_fingerprint",
        ok: true,
        summary: {
          profile_id: profile,
          system_id: "support-agent",
          environment_difference_count: 0,
        },
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(intakeDir, "corrective-action-register.json"),
    JSON.stringify(
      {
        schema_version: 1,
        artifact_type: "corrective_action_register",
        framework: "EU_AI_ACT",
        profile_id: profile,
        system_id: "support-agent",
        updated_at: 1700000000000,
        summary: {
          total_items: 2,
          open_items: 2,
          resolved_items: 0,
          recurring_items: 1,
          latest_report_id: "prior-report",
        },
        items: [
          {
            continuity_key: "eu_ai_act:eu-machine-release-decision",
            framework: "EU_AI_ACT",
            gap_id: "eu-machine-release-decision",
            source: "compliance/release-review.json.release_decision",
            severity: "block",
            description: "Machine release review rejected the previous bundle.",
            artifact_hrefs: ["compliance/release-review.json", "compliance/eu-ai-act-report.html"],
            first_seen_report_id: "prior-report",
            first_seen_at: 1700000000000,
            last_seen_report_id: "prior-report",
            last_seen_at: 1700000000000,
            last_review_decision_status: "reject",
            occurrence_count: 1,
            current_status: "mitigating",
            current_owner_name: "release-manager",
            latest_disposition: "mitigate",
            latest_note: "Previous run required mitigation before release.",
            history: [
              {
                report_id: "prior-report",
                generated_at: 1700000000000,
                seen_status: "present",
                decision_status: "reject",
                disposition: "mitigate",
                owner_name: "release-manager",
                note: "Previous run required mitigation before release.",
              },
            ],
          },
          {
            continuity_key: "eu_ai_act:legacy-gap",
            framework: "EU_AI_ACT",
            gap_id: "legacy-gap",
            source: "legacy.machine.signal",
            severity: "review",
            description: "Legacy recurring gap from a previous cycle.",
            artifact_hrefs: ["compare-report.json"],
            first_seen_report_id: "prior-report",
            first_seen_at: 1700000000000,
            last_seen_report_id: "prior-report",
            last_seen_at: 1700000000000,
            last_review_decision_status: "reject",
            occurrence_count: 1,
            current_status: "escalated",
            current_owner_name: "qa-lead",
            latest_disposition: "escalate",
            latest_note: "Escalated in the previous release review.",
            history: [
              {
                report_id: "prior-report",
                generated_at: 1700000000000,
                seen_status: "present",
                decision_status: "reject",
                disposition: "escalate",
                owner_name: "qa-lead",
                note: "Escalated in the previous release review.",
              },
            ],
          },
        ],
      },
      null,
      2
    ),
    "utf8"
  );
  return intakeDir;
}

async function completeReviewArtifacts(reportDir: string) {
  const decisionPath = path.join(reportDir, "review", "review-decision.json");
  const decision = JSON.parse(await readFile(decisionPath, "utf8")) as Record<string, any>;

  decision.human_completion.decision.status = "reject";
  decision.human_completion.decision.owner_name = "release-manager";
  decision.human_completion.decision.owner_role = "release_owner";
  decision.human_completion.decision.reviewers = [
    { name: "release-manager", role: "release_owner" },
    { name: "qa-lead", role: "evaluation_owner" },
  ];
  decision.human_completion.decision.rationale = [
    "Human review completed against the current machine evidence bundle.",
    "Release remains rejected until documented residual gaps are mitigated.",
  ];
  decision.human_completion.decision.override_machine_gap_ids = [];
  if (decision.human_completion.decision.legal_review_requested === true) {
    decision.human_completion.decision.legal_review_reason =
      "Legal review requested because the package will be used in an EU-facing compliance workflow.";
  } else {
    decision.human_completion.decision.legal_review_reason = "";
  }

  decision.human_completion.narrative.intended_use =
    "Support agent that drafts structured ticket resolutions for staged customer-service workflows.";
  decision.human_completion.narrative.system_boundary =
    "In scope: search_kb and create_ticket. Out of scope: refund_payment and finance execution paths.";
  decision.human_completion.narrative.deployment_context =
    "Staging environment, EU and UK evaluation context, assistant-level autonomy.";
  decision.human_completion.narrative.change_summary =
    "Baseline prompt is compared against a tool-routed release candidate before promotion.";
  decision.human_completion.narrative.monitoring_cadence =
    "Re-run on every release candidate and weekly for recurring monitoring.";
  decision.human_completion.narrative.reviewer_audience =
    "release_owner, evaluation_owner, compliance_owner, legal_reviewer";
  decision.human_completion.narrative.additional_notes =
    "Residual gaps remain tracked in the decision record and are not hidden from the handoff.";

  decision.human_completion.residual_gap_actions = decision.human_completion.residual_gap_actions.map((gap: Record<string, any>) => ({
    ...gap,
    owner_name: gap.severity === "block" ? "release-manager" : "qa-lead",
    disposition: gap.severity === "block" ? "mitigate" : "escalate",
    note: gap.severity === "block"
      ? "Mitigation is required before release can proceed."
      : "Escalated for explicit reviewer handling in the release meeting.",
  }));

  if (decision.human_completion.eu_scaffold_completion) {
    for (const section of Object.values(decision.human_completion.eu_scaffold_completion) as Array<Record<string, any>>) {
      section.status = "completed";
      section.owner_name =
        section.article === "Art_72" ? "support-platform" : "compliance-lead";
      section.owner_role =
        section.article === "Art_72" ? "system_owner" : "compliance_owner";
      section.completion_note =
        "Owner completed the scaffold inputs and linked the remaining operator-authored procedure outside the bundle.";
      section.required_inputs = (section.required_inputs || []).map((input: Record<string, any>) => ({
        ...input,
        status: "completed",
        note: "Captured in the controlled operator document set for this release.",
      }));
      section.residual_gap_acknowledged = true;
      section.residual_gap_note =
        "Residual gaps were reviewed and remain explicitly tracked in the release decision and operator-controlled documents.";
    }
  }

  await writeFile(decisionPath, JSON.stringify(decision, null, 2) + "\n", "utf8");
  await writeFile(
    path.join(reportDir, "review", "handoff-note.md"),
    [
      "# Review Handoff Note",
      "",
      `Report ID: ${decision.report_id}`,
      "",
      "Decision: reject",
      "",
      "Residual gaps are documented in review/review-decision.json and must remain visible in handoff.",
      "",
      "Bundle references:",
      "- compare-report.json",
      "- report.html",
      "- artifacts/manifest.json",
    ].join("\n"),
    "utf8"
  );
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("evidence review scripts", () => {
  it("scaffolds a core review bundle and fails check until human fields are completed", async () => {
    const reportDir = await copyReportFixture("scripts/fixtures/evidence-review/agent-evidence");

    const init = await runScript("scripts/evidence-review-init.mjs", [
      "--reportDir",
      reportDir,
      "--json",
    ]);
    expect(init.code, init.stderr).toBe(0);
    const initPayload = JSON.parse(init.stdout);
    expect(initPayload.framework).toBe("AGENT_EVIDENCE");
    const decision = JSON.parse(await readFile(path.join(reportDir, "review", "review-decision.json"), "utf8")) as {
      human_completion: { eu_scaffold_completion: null };
    };
    expect(decision.human_completion.eu_scaffold_completion).toBeNull();

    const check = await runScript("scripts/evidence-review-check.mjs", [
      "--reportDir",
      reportDir,
      "--json",
    ]);
    expect(check.code).toBe(1);
    const result = JSON.parse(check.stdout);
    expect(result.errors.some((issue: { field: string }) => issue.field === "human_completion.decision.status")).toBe(true);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("passes review check for a completed core review bundle", async () => {
    const reportDir = await copyReportFixture("scripts/fixtures/evidence-review/agent-evidence");

    const init = await runScript("scripts/evidence-review-init.mjs", [
      "--reportDir",
      reportDir,
      "--json",
    ]);
    expect(init.code, init.stderr).toBe(0);

    await completeReviewArtifacts(reportDir);

    const check = await runScript("scripts/evidence-review-check.mjs", [
      "--reportDir",
      reportDir,
      "--json",
    ]);
    expect(check.code, check.stderr).toBe(0);
    const result = JSON.parse(check.stdout);
    expect(result.framework).toBe("AGENT_EVIDENCE");
    expect(result.summary.decision_status).toBe("reject");
  });

  it("creates an intake snapshot and passes review check for a completed EU bundle", async () => {
    const reportDir = await copyReportFixture("scripts/fixtures/evidence-review/eu-ai-act");
    const tempRoot = path.dirname(reportDir);
    const intakeDir = await writeIntake(tempRoot, "support");

    const init = await runScript("scripts/evidence-review-init.mjs", [
      "--reportDir",
      reportDir,
      "--dir",
      intakeDir,
      "--json",
    ]);
    expect(init.code, init.stderr).toBe(0);
    const initPayload = JSON.parse(init.stdout);
    expect(initPayload.framework).toBe("EU_AI_ACT");
    expect(initPayload.files.intake_snapshot.system_scope_href).toBe("review/intake/system-scope.json");
    expect(initPayload.files.intake_snapshot.cases_coverage_href).toBe("review/intake/cases-coverage.json");
    expect(initPayload.files.intake_snapshot.adapter_capability_href).toBe("review/intake/adapter-capability.json");
    expect(initPayload.files.intake_snapshot.run_fingerprint_href).toBe("review/intake/run-fingerprint.json");
    expect(initPayload.files.intake_snapshot.corrective_action_register_href).toBe(
      "review/intake/corrective-action-register.json"
    );
    const initDecision = JSON.parse(
      await readFile(path.join(reportDir, "review", "review-decision.json"), "utf8")
    ) as Record<string, any>;
    const recurringGap = initDecision.human_completion.residual_gap_actions.find(
      (gap: Record<string, any>) => gap.gap_id === "eu-machine-release-decision"
    );
    expect(recurringGap.continuity_status).toBe("recurring");
    expect(recurringGap.previous_occurrence_count).toBe(1);
    expect(initDecision.human_completion.corrective_action_continuity.recurring_gap_count).toBeGreaterThanOrEqual(1);

    const initialCheck = await runScript("scripts/evidence-review-check.mjs", [
      "--reportDir",
      reportDir,
      "--dir",
      intakeDir,
      "--json",
    ]);
    expect(initialCheck.code).toBe(1);
    const initialResult = JSON.parse(initialCheck.stdout);
    expect(
      initialResult.errors.some(
        (issue: { field: string }) =>
          issue.field === "human_completion.eu_scaffold_completion.article_13_instructions.status"
      )
    ).toBe(true);
    expect(
      initialResult.errors.some(
        (issue: { field: string }) =>
          issue.field === "human_completion.eu_scaffold_completion.article_17_qms_lite.status"
      )
    ).toBe(true);
    expect(
      initialResult.errors.some(
        (issue: { field: string }) =>
          issue.field === "human_completion.eu_scaffold_completion.article_72_monitoring_plan.status"
      )
    ).toBe(true);
    expect(
      initialResult.errors.some(
        (issue: { field: string }) =>
          issue.field === "human_completion.eu_scaffold_completion.article_73_serious_incident_pack.status"
      )
    ).toBe(true);

    await completeReviewArtifacts(reportDir);

    const check = await runScript("scripts/evidence-review-check.mjs", [
      "--reportDir",
      reportDir,
      "--dir",
      intakeDir,
      "--json",
    ]);
    expect(check.code, check.stderr).toBe(0);
    const result = JSON.parse(check.stdout);
    expect(result.framework).toBe("EU_AI_ACT");
    expect(result.summary.legal_review_requested).toBe(true);
    expect(result.files.corrective_action_register_href).toBe("../ops/intake/support/corrective-action-register.json");
    expect(result.files.corrective_action_register_snapshot_href).toBe("review/intake/corrective-action-register.json");
    const register = JSON.parse(
      await readFile(path.join(tempRoot, "ops", "intake", "support", "corrective-action-register.json"), "utf8")
    ) as Record<string, any>;
    const repeatedItem = register.items.find((item: Record<string, any>) => item.gap_id === "eu-machine-release-decision");
    expect(repeatedItem.occurrence_count).toBe(2);
    expect(repeatedItem.current_status).toBe("mitigating");
    const resolvedItem = register.items.find((item: Record<string, any>) => item.gap_id === "legacy-gap");
    expect(resolvedItem.current_status).toBe("resolved");
    expect(result.summary.corrective_action_register_resolved_items).toBeGreaterThanOrEqual(1);
  }, 20_000);
});
