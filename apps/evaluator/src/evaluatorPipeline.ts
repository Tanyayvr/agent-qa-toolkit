// apps/evaluator/src/evaluator.ts
import path from "node:path";
import { appendFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Ajv from "ajv";
import {
  renderHtmlReport,
  type CompareReport,
  type TraceIntegrity,
  type SecurityPack,
  type SecuritySignal,
} from "./htmlReport";
import { renderCaseDiffHtml } from "./replayDiff";
import {
  manifestItemForRunnerFailureArtifact,
  manifestItemForCaseResponse,
  manifestItemForFinalOutput,
  manifestItemForTraceAnchor,
  manifestKeyFor,
} from "./manifest";
import type { ManifestItem, ThinIndex } from "./manifest";
import { runSecurityScanners } from "./securityScanner";
import { TOOLKIT_VERSION } from "./version";
import {
  CliUsageError,
  InterruptedRunError,
  emitStructuredLog,
  makeArgvHelpers,
  makeCliUsageGuards,
  writeFileAtomic,
  writeJsonAtomic,
  ensureDir,
} from "cli-utils";
import {
  copyRawCaseJson,
  copyRunMetaJson,
  fileBytesForRel,
  maybeCopyFailureAsset,
  normRel,
  renderMissingCaseHtml,
  resolveFromRoot,
} from "./evaluatorIo";
import {
  loadComplianceMapping,
  loadEnvironmentContext,
  resolveTransferClass,
  type ComplianceMappingEntry,
} from "./evaluatorMetadata";
import { assessRedactionState, verifyRedactionCoverage } from "./evaluatorRedaction";
import { buildSecurityScanners } from "./evaluatorScanners";
import {
  buildCompareReportDocument,
  buildQualityEntries,
  maybeAttachLargePayloadWarnings,
} from "./evaluatorSummary";
import { finalizeManifest, writeRedactionSummaryIfNeeded } from "./evaluatorFinalization";
import { ingestTrendIfEnabled } from "./evaluatorTrend";
import { HELP_TEXT } from "./evaluatorHelp";
import { cleanupOldReports } from "./evaluatorRetention";
import { ExecutionQualityGateError } from "./evaluatorErrors";

import {
  computeExecutionQuality,
  parseRateThreshold,
  type ExecutionQualitySummary,
} from "./executionQuality";
import { computeSummaryBySuite } from "./summaryBySuite";
import {
  computeQualityFlags,
  deriveCaseStatus,
  extractCaseTs,
  extractTraceAnchor,
  readCases,
  readRunDir,
  toReplayResponse,
} from "./evaluatorRuntime";
import {
  evaluateOne,
  mapPolicyRules,
  computeTraceIntegritySide,
  missingTraceSide,
  computeSecuritySide,
  derivePolicySignals,
  deriveGateRecommendation,
  deriveRiskLevel,
  deriveRiskTags,
  deriveFailureSummarySide,
  topKinds,
  severityCountsInit,
  bumpCounts,
  type EvaluationResult,
  type DataAvailabilitySide,
} from "./core";

export { parseRateThreshold, isWeakExpected } from "./executionQuality";
export { deriveCaseStatus, extractTraceAnchor } from "./evaluatorRuntime";

const { hasFlag, getArg, getFlag, assertNoUnknownOptions, assertHasValue, parseIntFlag } = makeArgvHelpers(process.argv);
const { assertNoUnknownOptionsOrThrow, assertHasValueOrThrow, parseIntFlagOrThrow } = makeCliUsageGuards(
  HELP_TEXT,
  { assertNoUnknownOptions, assertHasValue, parseIntFlag }
);
const AUDIT_LOG_ENV = process.env.AUDIT_LOG_PATH;

async function appendAuditLog(entry: Record<string, unknown>): Promise<void> {
  if (!AUDIT_LOG_ENV) return;
  const line = JSON.stringify({ ts: Date.now(), ...entry }) + "\n";
  try {
    await appendFile(AUDIT_LOG_ENV, line, "utf-8");
  } catch {
    // audit logging must not fail the run
  }
}

export async function runEvaluator(): Promise<void> {
  const projectRoot = process.env.INIT_CWD ?? process.cwd();
  const minTransportSuccessRate = parseRateThreshold(process.env.AQ_MIN_TRANSPORT_SUCCESS_RATE, 0.95);
  const maxWeakExpectedRate = parseRateThreshold(process.env.AQ_MAX_WEAK_EXPECTED_RATE, 0.2);

  let interruptedBy: { signal: "SIGINT" | "SIGTERM"; at: number } | null = null;
  const interruptController = new AbortController();
  const onSigInt = () => {
    if (interruptedBy) return;
    interruptedBy = { signal: "SIGINT", at: Date.now() };
    interruptController.abort();
    console.warn("Evaluator: SIGINT received, preparing graceful stop...");
    emitStructuredLog("evaluator", "warn", "signal", { signal: "SIGINT" });
  };
  const onSigTerm = () => {
    if (interruptedBy) return;
    interruptedBy = { signal: "SIGTERM", at: Date.now() };
    interruptController.abort();
    console.warn("Evaluator: SIGTERM received, preparing graceful stop...");
    emitStructuredLog("evaluator", "warn", "signal", { signal: "SIGTERM" });
  };
  process.once("SIGINT", onSigInt);
  process.once("SIGTERM", onSigTerm);

  if (hasFlag("--help", "-h")) {
    console.log(HELP_TEXT);
    process.removeListener("SIGINT", onSigInt);
    process.removeListener("SIGTERM", onSigTerm);
    return;
  }

  try {

  assertNoUnknownOptionsOrThrow(
    new Set([
      "--cases",
      "--baselineDir",
      "--newDir",
      "--outDir",
      "--reportId",
      "--transferClass",
      "--strictPortability",
      "--strictRedaction",
      "--failOnExecutionDegraded",
      "--entropyScanner",
      "--warnBodyBytes",
      "--maxCaseBytes",
      "--maxMetaBytes",
      "--retentionDays",
      "--environment",
      "--complianceProfile",
      "--trend-db",
      "--no-trend",
      "--help",
      "-h",
    ])
  );
  assertHasValueOrThrow("--cases");
  assertHasValueOrThrow("--baselineDir");
  assertHasValueOrThrow("--newDir");
  assertHasValueOrThrow("--outDir");
  assertHasValueOrThrow("--reportId");
  assertHasValueOrThrow("--transferClass");
  assertHasValueOrThrow("--maxCaseBytes");
  assertHasValueOrThrow("--maxMetaBytes");
  assertHasValueOrThrow("--retentionDays");

  const casesArg = getArg("--cases");
  const baselineArg = getArg("--baselineDir");
  const newArg = getArg("--newDir");

  if (!casesArg || !baselineArg || !newArg) {
    throw new CliUsageError(`Missing required arguments.\n\n${HELP_TEXT}`);
  }


  const casesPathAbs = resolveFromRoot(projectRoot, casesArg);
  const baselineDirAbs = resolveFromRoot(projectRoot, baselineArg);
  const newDirAbs = resolveFromRoot(projectRoot, newArg);
  const maxCaseBytes = parseIntFlagOrThrow("--maxCaseBytes", 10_000_000);
  const maxMetaBytes = parseIntFlagOrThrow("--maxMetaBytes", 2_000_000);
  if (maxCaseBytes <= 0) {
    throw new CliUsageError(`Invalid --maxCaseBytes value: ${maxCaseBytes}. Must be > 0.\n\n${HELP_TEXT}`);
  }
  if (maxMetaBytes <= 0) {
    throw new CliUsageError(`Invalid --maxMetaBytes value: ${maxMetaBytes}. Must be > 0.\n\n${HELP_TEXT}`);
  }

  const envFile = getArg("--environment");
  const complianceFile = getArg("--complianceProfile");
  let environment: Record<string, unknown> | undefined;
  let complianceMapping: ComplianceMappingEntry[] | undefined;
  try {
    environment = await loadEnvironmentContext({
      projectRoot,
      maxMetaBytes,
      ...(envFile ? { envFile } : {}),
    });
  } catch {
    throw new CliUsageError(`Invalid --environment JSON file: ${String(envFile)}\n\n${HELP_TEXT}`);
  }

  try {
    complianceMapping = await loadComplianceMapping({
      projectRoot,
      maxMetaBytes,
      ...(complianceFile ? { complianceFile } : {}),
    });
  } catch {
    throw new CliUsageError(`Invalid --complianceProfile JSON file: ${String(complianceFile)}\n\n${HELP_TEXT}`);
  }

  const transferClass = resolveTransferClass(getArg("--transferClass") ?? undefined);
  if (!transferClass) {
    throw new CliUsageError(`Invalid --transferClass value: ${String(getArg("--transferClass"))}. Must be "internal_only" or "transferable".\n\n${HELP_TEXT}`);
  }
  const failOnExecutionDegraded = getFlag("--failOnExecutionDegraded");
  const warnBodyBytes = Math.max(0, parseIntFlagOrThrow("--warnBodyBytes", 1_000_000));
  const retentionDays = Math.max(0, parseIntFlagOrThrow("--retentionDays", 0));

  const reportId = getArg("--reportId") ?? randomUUID();
  const outDirArg = getArg("--outDir") ?? path.join("apps", "evaluator", "reports", reportId);
  const reportDirAbs = resolveFromRoot(projectRoot, outDirArg);

  const progress = {
    phase: "init",
    cases_processed: 0,
    items_emitted: 0,
    last_case_id: undefined as string | undefined,
  };

  const throwIfInterrupted = async (): Promise<void> => {
    if (!interruptController.signal.aborted || !interruptedBy) return;
    await ensureDir(path.join(reportDirAbs, "artifacts"));
    await writeJsonAtomic(path.join(reportDirAbs, "artifacts", "interrupted.json"), {
      report_id: reportId,
      interrupted: true,
      signal: interruptedBy.signal,
      interrupted_at: interruptedBy.at,
      progress,
    });
    await appendAuditLog({
      component: "evaluator",
      event: "interrupted",
      report_id: reportId,
      signal: interruptedBy.signal,
      phase: progress.phase,
      cases_processed: progress.cases_processed,
      items_emitted: progress.items_emitted,
      last_case_id: progress.last_case_id,
    });
    throw new InterruptedRunError("Evaluator", interruptedBy.signal);
  };

  await ensureDir(reportDirAbs);
  await ensureDir(path.join(reportDirAbs, "assets"));
  await appendAuditLog({
    component: "evaluator",
    event: "start",
    report_id: reportId,
    cases_path: normRel(projectRoot, casesPathAbs),
    baseline_dir: normRel(projectRoot, baselineDirAbs),
    new_dir: normRel(projectRoot, newDirAbs),
    out_dir: normRel(projectRoot, reportDirAbs),
    transfer_class: transferClass,
    fail_on_execution_degraded: failOnExecutionDegraded,
    warn_body_bytes: warnBodyBytes,
    retention_days: retentionDays,
  });
  emitStructuredLog("evaluator", "info", "start", {
    report_id: reportId,
    cases_path: normRel(projectRoot, casesPathAbs),
    baseline_dir: normRel(projectRoot, baselineDirAbs),
    new_dir: normRel(projectRoot, newDirAbs),
    out_dir: normRel(projectRoot, reportDirAbs),
    transfer_class: transferClass,
    fail_on_execution_degraded: failOnExecutionDegraded,
    max_case_bytes: maxCaseBytes,
    max_meta_bytes: maxMetaBytes,
  });
  await throwIfInterrupted();

  const cases = await readCases(casesPathAbs, maxCaseBytes);
  const baselineRun = await readRunDir(baselineDirAbs, maxCaseBytes, maxMetaBytes);
  const newRun = await readRunDir(newDirAbs, maxCaseBytes, maxMetaBytes);
  const scanners = buildSecurityScanners(hasFlag("--entropyScanner"));

  const baselineById = baselineRun.byId;
  const newById = newRun.byId;
  const baselineSelected = new Set(baselineRun.ids);
  const newSelected = new Set(newRun.ids);

  const ajv = new Ajv({ allErrors: true, strict: false });

  const baselineEval: EvaluationResult[] = [];
  const newEval: EvaluationResult[] = [];

  for (const c of cases) {
    if (interruptController.signal.aborted) break;
    progress.phase = "evaluate_cases";
    progress.last_case_id = c.id;
    const b = baselineById[c.id];
    if (b) baselineEval.push(evaluateOne(c, b, ajv));

    const n = newById[c.id];
    if (n) newEval.push(evaluateOne(c, n, ajv));
    progress.cases_processed += 1;
    emitStructuredLog("evaluator", "info", "case_evaluated", {
      report_id: reportId,
      case_id: c.id,
      index: progress.cases_processed,
    });
  }
  await throwIfInterrupted();

  await writeJsonAtomic(path.join(baselineDirAbs, "evaluation.json"), baselineEval);
  await writeJsonAtomic(path.join(newDirAbs, "evaluation.json"), newEval);

  let baselinePass = 0;
  let newPass = 0;
  let regressions = 0;
  let improvements = 0;
  const breakdown: Record<string, number> = {};

  const items: CompareReport["items"] = [];
  const suiteById = new Map<string, string>();
  for (const c of cases) {
    suiteById.set(c.id, c.suite ?? "default");
  }

  const baselineRunHref = await copyRunMetaJson({ reportDir: reportDirAbs, version: "baseline", srcAbs: path.join(baselineDirAbs, "run.json") });
  const newRunHref = await copyRunMetaJson({ reportDir: reportDirAbs, version: "new", srcAbs: path.join(newDirAbs, "run.json") });

  const redactionState = assessRedactionState({
    baselineMeta: baselineRun.meta,
    newMeta: newRun.meta,
  });
  const redactionWarnings = [...redactionState.warnings];
  const redactionStatus = redactionState.status;
  const redactionPresetId = redactionState.presetId;
  const { violations: redactionViolations, warnings: redactionCoverageWarnings } = verifyRedactionCoverage({
    state: redactionState,
    baselineById,
    newById,
  });
  redactionWarnings.push(...redactionCoverageWarnings);
  if (redactionViolations > 0 && getFlag("--strictRedaction")) {
    throw new CliUsageError(`Redaction check failed. See redaction-summary.json warnings.\n\n${HELP_TEXT}`);
  }

  let manifestItems: ManifestItem[] = [];
  let casesWithAnchorBaseline = 0;
  let casesWithAnchorNew = 0;

  for (const c of cases) {
    if (interruptController.signal.aborted) break;
    progress.phase = "build_items";
    progress.last_case_id = c.id;
    const bEval = baselineEval.find((x) => x.case_id === c.id);
    const nEval = newEval.find((x) => x.case_id === c.id);
    const baseResp = baselineById[c.id];
    const newResp = newById[c.id];
    const baselineTraceAnchor = extractTraceAnchor(baseResp);
    const newTraceAnchor = extractTraceAnchor(newResp);
    if (baselineTraceAnchor) casesWithAnchorBaseline += 1;
    if (newTraceAnchor) casesWithAnchorNew += 1;

    const baselineAvail: DataAvailabilitySide = baselineSelected.has(c.id)
      ? baselineRun.availability[c.id] ?? { status: "missing", reason_code: "missing_file" }
      : { status: "missing", reason_code: "excluded_by_filter" };

    const newAvail: DataAvailabilitySide = newSelected.has(c.id)
      ? newRun.availability[c.id] ?? { status: "missing", reason_code: "missing_file" }
      : { status: "missing", reason_code: "excluded_by_filter" };

    if (baseResp?.runner_failure && baselineAvail.status === "present") {
      baselineAvail.reason_code = baseResp.runner_failure.class;
      baselineAvail.details = {
        timeout_ms: baseResp.runner_failure.timeout_ms,
        http_status: baseResp.runner_failure.status,
        attempt: baseResp.runner_failure.attempt,
        net_error_kind: baseResp.runner_failure.net_error_kind,
      };
    }
    if (newResp?.runner_failure && newAvail.status === "present") {
      newAvail.reason_code = newResp.runner_failure.class;
      newAvail.details = {
        timeout_ms: newResp.runner_failure.timeout_ms,
        http_status: newResp.runner_failure.status,
        attempt: newResp.runner_failure.attempt,
        net_error_kind: newResp.runner_failure.net_error_kind,
      };
    }

    const selected = baselineSelected.has(c.id) || newSelected.has(c.id);
    const hasAnyResp = Boolean(baseResp || newResp);
    const { status: caseStatus, reason: caseStatusReason } = deriveCaseStatus(selected, hasAnyResp);

    let baselinePassFlag = bEval?.pass ?? false;
    let newPassFlag = nEval?.pass ?? false;
    if (caseStatus !== "executed") {
      baselinePassFlag = false;
      newPassFlag = false;
    }
    // Defense-in-depth: a captured runner failure must never count as a passing side,
    // even if upstream evaluation logic regresses and marks assertions as pass=true.
    if (baseResp?.runner_failure) baselinePassFlag = false;
    if (newResp?.runner_failure) newPassFlag = false;

    if (baselinePassFlag) baselinePass += 1;
    if (newPassFlag) newPass += 1;
    if (baselinePassFlag && !newPassFlag) regressions += 1;
    if (!baselinePassFlag && newPassFlag) improvements += 1;

    const newRoot = nEval?.root_cause ?? (newResp ? undefined : "missing_case");
    if (!newPassFlag && newRoot) breakdown[newRoot] = (breakdown[newRoot] ?? 0) + 1;

    const replayDiffHref = `case-${c.id}.html`;

    const artifactLinks: CompareReport["items"][number]["artifacts"] = {
      replay_diff_href: replayDiffHref,
    };

    if (baselineRunHref) artifactLinks.baseline_run_meta_href = baselineRunHref;
    if (newRunHref) artifactLinks.new_run_meta_href = newRunHref;

    if (baseResp) {
      const baseRf = baseResp.runner_failure;
      if (baseRf && typeof baseRf.full_body_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "baseline",
          relOrAbsPath: baseRf.full_body_saved_to,
        });
        if (rel) artifactLinks.baseline_failure_body_href = rel;
      }
      if (baseRf && typeof baseRf.full_body_meta_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "baseline",
          relOrAbsPath: baseRf.full_body_meta_saved_to,
        });
        if (rel) artifactLinks.baseline_failure_meta_href = rel;
      }
      if (baseRf) {
        const bodyRel = artifactLinks.baseline_failure_body_href;
        const metaRel = artifactLinks.baseline_failure_meta_href;
        const items = manifestItemForRunnerFailureArtifact({
          caseId: c.id,
          version: "baseline",
          ...(bodyRel ? { bodyRel } : {}),
          ...(metaRel ? { metaRel } : {}),
        });
        for (const it of items) {
          const bytes = await fileBytesForRel(reportDirAbs, it.rel_path);
          manifestItems.push({ ...it, ...(bytes !== undefined ? { bytes } : {}) });
        }
        if (bodyRel) artifactLinks.baseline_failure_body_key = manifestKeyFor({ caseId: c.id, version: "baseline", kind: "runner_failure_body" });
        if (metaRel) artifactLinks.baseline_failure_meta_key = manifestKeyFor({ caseId: c.id, version: "baseline", kind: "runner_failure_meta" });
      }
    }

    if (newResp) {
      const newRf = newResp.runner_failure;
      if (newRf && typeof newRf.full_body_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "new",
          relOrAbsPath: newRf.full_body_saved_to,
        });
        if (rel) artifactLinks.new_failure_body_href = rel;
      }
      if (newRf && typeof newRf.full_body_meta_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "new",
          relOrAbsPath: newRf.full_body_meta_saved_to,
        });
        if (rel) artifactLinks.new_failure_meta_href = rel;
      }
      if (newRf) {
        const bodyRel = artifactLinks.new_failure_body_href;
        const metaRel = artifactLinks.new_failure_meta_href;
        const items = manifestItemForRunnerFailureArtifact({
          caseId: c.id,
          version: "new",
          ...(bodyRel ? { bodyRel } : {}),
          ...(metaRel ? { metaRel } : {}),
        });
        for (const it of items) {
          const bytes = await fileBytesForRel(reportDirAbs, it.rel_path);
          manifestItems.push({ ...it, ...(bytes !== undefined ? { bytes } : {}) });
        }
        if (bodyRel) artifactLinks.new_failure_body_key = manifestKeyFor({ caseId: c.id, version: "new", kind: "runner_failure_body" });
        if (metaRel) artifactLinks.new_failure_meta_key = manifestKeyFor({ caseId: c.id, version: "new", kind: "runner_failure_meta" });
      }
    }

    const baseCaseSrc = path.join(baselineDirAbs, `${c.id}.json`);
    const newCaseSrc = path.join(newDirAbs, `${c.id}.json`);

    const baseCaseHref = await copyRawCaseJson({ reportDir: reportDirAbs, caseId: c.id, version: "baseline", srcAbs: baseCaseSrc });
    const newCaseHref = await copyRawCaseJson({ reportDir: reportDirAbs, caseId: c.id, version: "new", srcAbs: newCaseSrc });

    if (baseCaseHref) artifactLinks.baseline_case_response_href = baseCaseHref;
    if (newCaseHref) artifactLinks.new_case_response_href = newCaseHref;

    if (baseCaseHref) {
      const bytes = await fileBytesForRel(reportDirAbs, baseCaseHref);
      manifestItems.push({
        ...manifestItemForCaseResponse({ caseId: c.id, version: "baseline", rel_path: baseCaseHref }),
        ...(bytes !== undefined ? { bytes } : {}),
      });
    }
    if (newCaseHref) {
      const bytes = await fileBytesForRel(reportDirAbs, newCaseHref);
      manifestItems.push({
        ...manifestItemForCaseResponse({ caseId: c.id, version: "new", rel_path: newCaseHref }),
        ...(bytes !== undefined ? { bytes } : {}),
      });
    }

    if (baseCaseHref) artifactLinks.baseline_case_response_key = manifestKeyFor({ caseId: c.id, version: "baseline", kind: "case_response" });
    if (newCaseHref) artifactLinks.new_case_response_key = manifestKeyFor({ caseId: c.id, version: "new", kind: "case_response" });

    const traceDir = path.join(reportDirAbs, "assets", "trace_anchor", c.id);
    if (baselineTraceAnchor) {
      await ensureDir(traceDir);
      const baseTraceAbs = path.join(traceDir, "baseline.json");
      await writeJsonAtomic(baseTraceAbs, baselineTraceAnchor);
      const rel = normRel(reportDirAbs, baseTraceAbs);
      artifactLinks.baseline_trace_anchor_href = rel;
      artifactLinks.baseline_trace_anchor_key = manifestKeyFor({ caseId: c.id, version: "baseline", kind: "trace_anchor" });
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item = manifestItemForTraceAnchor({ caseId: c.id, version: "baseline", rel_path: rel });
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }
    if (newTraceAnchor) {
      await ensureDir(traceDir);
      const newTraceAbs = path.join(traceDir, "new.json");
      await writeJsonAtomic(newTraceAbs, newTraceAnchor);
      const rel = normRel(reportDirAbs, newTraceAbs);
      artifactLinks.new_trace_anchor_href = rel;
      artifactLinks.new_trace_anchor_key = manifestKeyFor({ caseId: c.id, version: "new", kind: "trace_anchor" });
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item = manifestItemForTraceAnchor({ caseId: c.id, version: "new", rel_path: rel });
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }

    const trace: TraceIntegrity = {
      baseline: baseResp ? computeTraceIntegritySide(baseResp, c.expected) : missingTraceSide("missing_response"),
      new: newResp ? computeTraceIntegritySide(newResp, c.expected) : missingTraceSide("missing_response"),
    };

    const finalOutputDir = path.join(reportDirAbs, "assets", "final_output", c.id);
    await ensureDir(finalOutputDir);
    if (baseResp) {
      const baseFinal = path.join(finalOutputDir, "baseline.json");
      await writeJsonAtomic(baseFinal, baseResp.final_output ?? {});
      const rel = normRel(reportDirAbs, baseFinal);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item = manifestItemForFinalOutput({
        caseId: c.id,
        version: "baseline",
        rel_path: rel,
        media_type: "application/json",
      });
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }
    if (newResp) {
      const newFinal = path.join(finalOutputDir, "new.json");
      await writeJsonAtomic(newFinal, newResp.final_output ?? {});
      const rel = normRel(reportDirAbs, newFinal);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item = manifestItemForFinalOutput({
        caseId: c.id,
        version: "new",
        rel_path: rel,
        media_type: "application/json",
      });
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }

    if (baseResp?.runner_failure) {
      const rfDir = path.join(reportDirAbs, "assets", "runner_failure", c.id);
      await ensureDir(rfDir);
      const baseSum = path.join(rfDir, "baseline.json");
      await writeJsonAtomic(baseSum, baseResp.runner_failure);
      const rel = normRel(reportDirAbs, baseSum);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item: ManifestItem = {
        manifest_key: manifestKeyFor({ caseId: c.id, version: "baseline", kind: "runner_failure" }),
        rel_path: rel,
        media_type: "application/json",
      };
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }
    if (newResp?.runner_failure) {
      const rfDir = path.join(reportDirAbs, "assets", "runner_failure", c.id);
      await ensureDir(rfDir);
      const newSum = path.join(rfDir, "new.json");
      await writeJsonAtomic(newSum, newResp.runner_failure);
      const rel = normRel(reportDirAbs, newSum);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item: ManifestItem = {
        manifest_key: manifestKeyFor({ caseId: c.id, version: "new", kind: "runner_failure" }),
        rel_path: rel,
        media_type: "application/json",
      };
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }

    const baselineSecurityBase = baseResp ? computeSecuritySide(baseResp) : { signals: [], requires_gate_recommendation: false };
    const newSecurityBase = newResp ? computeSecuritySide(newResp) : { signals: [], requires_gate_recommendation: false };

    const baselineExtra = baseResp ? await runSecurityScanners(baseResp, scanners) : [];
    const newExtra = newResp ? await runSecurityScanners(newResp, scanners) : [];

    const baselinePolicySignals = baseResp ? derivePolicySignals(baseResp, bEval) : [];
    const newPolicySignals = newResp ? derivePolicySignals(newResp, nEval) : [];

    const baselineSecurity = {
      ...baselineSecurityBase,
      signals: [...baselineSecurityBase.signals, ...baselineExtra, ...baselinePolicySignals],
    };
    const newSecurity = {
      ...newSecurityBase,
      signals: [...newSecurityBase.signals, ...newExtra, ...newPolicySignals],
    };

    const regression = baselinePassFlag && !newPassFlag;
    const gateRecommendation = deriveGateRecommendation({
      newSignals: newSecurity.signals,
      newAvailability: newAvail,
      caseStatus,
    });
    const riskLevel = deriveRiskLevel(gateRecommendation);
    const riskTags = deriveRiskTags({ newSignals: newSecurity.signals, regression, caseStatus, newAvailability: newAvail });
    const requiresGate = gateRecommendation !== "none";

    const security: SecurityPack = {
      baseline: { signals: baselineSecurity.signals, requires_gate_recommendation: requiresGate },
      new: { signals: newSecurity.signals, requires_gate_recommendation: requiresGate },
    };

    const failureSummary: {
      baseline?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number; net_error_kind?: string };
      new?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number; net_error_kind?: string };
    } = {};
    const fsBaseline = deriveFailureSummarySide(baseResp?.runner_failure);
    const fsNew = deriveFailureSummarySide(newResp?.runner_failure);
    if (fsBaseline) failureSummary.baseline = fsBaseline;
    if (fsNew) failureSummary.new = fsNew;
    const hasFailureSummary = Boolean(failureSummary.baseline || failureSummary.new);

    const suite = suiteById.get(c.id);
    const baseTs = extractCaseTs(baseResp);
    const newTs = extractCaseTs(newResp);
    const caseTs =
      baseTs !== undefined && newTs !== undefined
        ? Math.min(baseTs, newTs)
        : baseTs ?? newTs;
    const item: CompareReport["items"][number] = {
      case_id: c.id,
      title: c.title,
      ...(suite ? { suite } : {}),
      data_availability: { baseline: baselineAvail, new: newAvail },
      case_status: caseStatus,
      baseline_pass: baselinePassFlag,
      new_pass: newPassFlag,
      preventable_by_policy: nEval ? nEval.preventable_by_policy : true,
      recommended_policy_rules: nEval ? nEval.recommended_policy_rules : mapPolicyRules("missing_case", false),
      artifacts: artifactLinks,
      trace_integrity: trace,
      security,
      policy_evaluation: {
        baseline: {
          planning_gate_pass: true,
          repl_policy_pass: true,
        },
        new: {
          planning_gate_pass: true,
          repl_policy_pass: true,
        },
      },
      risk_level: riskLevel,
      risk_tags: riskTags,
      gate_recommendation: gateRecommendation,
    };
    const baselinePlanning = bEval?.assertions?.find((a) => a.name === "planning_gate");
    const newPlanning = nEval?.assertions?.find((a) => a.name === "planning_gate");
    const baselineRepl = bEval?.assertions?.find((a) => a.name === "repl_policy");
    const newRepl = nEval?.assertions?.find((a) => a.name === "repl_policy");
    item.policy_evaluation = {
      baseline: {
        planning_gate_pass: baselinePlanning ? baselinePlanning.pass : true,
        repl_policy_pass: baselineRepl ? baselineRepl.pass : true,
      },
      new: {
        planning_gate_pass: newPlanning ? newPlanning.pass : true,
        repl_policy_pass: newRepl ? newRepl.pass : true,
      },
    };
    if (baselineTraceAnchor || newTraceAnchor) {
      item.trace_anchors = {
        ...(baselineTraceAnchor ? { baseline: baselineTraceAnchor } : {}),
        ...(newTraceAnchor ? { new: newTraceAnchor } : {}),
      };
    }
    if (bEval?.assertions?.length) item.assertions_baseline = bEval.assertions;
    if (nEval?.assertions?.length) item.assertions_new = nEval.assertions;
    if (nEval?.assertions?.length) item.assertions = nEval.assertions;
    if (caseTs !== undefined) item.case_ts = caseTs;
    if (caseStatusReason) item.case_status_reason = caseStatusReason;
    if (hasFailureSummary) item.failure_summary = failureSummary;

    if (bEval?.root_cause !== undefined) item.baseline_root = bEval.root_cause;
    else if (!baseResp) item.baseline_root = "missing_case";

    if (nEval?.root_cause !== undefined) item.new_root = nEval.root_cause;
    else if (!newResp) item.new_root = "missing_case";

    items.push(item);
    progress.items_emitted += 1;
  }
  await throwIfInterrupted();

  const total_cases = items.length;

  const signal_counts_new = severityCountsInit();
  const signal_counts_baseline = severityCountsInit();

  let cases_with_signals_new = 0;
  let cases_with_signals_baseline = 0;

  const risk_summary = { low: 0, medium: 0, high: 0 };
  let cases_requiring_approval = 0;
  let cases_block_recommended = 0;

  const data_coverage = {
    total_cases,
    items_emitted: total_cases,
    missing_baseline_artifacts: 0,
    missing_new_artifacts: 0,
    broken_baseline_artifacts: 0,
    broken_new_artifacts: 0,
  };

  const allNewSignals: SecuritySignal[] = [];
  const allBaselineSignals: SecuritySignal[] = [];

  for (const it of items) {
    const bSigs = it.security.baseline.signals;
    const nSigs = it.security.new.signals;

    if (bSigs.length) cases_with_signals_baseline += 1;
    if (nSigs.length) cases_with_signals_new += 1;

    for (const s of bSigs) {
      bumpCounts(signal_counts_baseline, s.severity);
      allBaselineSignals.push(s);
    }
    for (const s of nSigs) {
      bumpCounts(signal_counts_new, s.severity);
      allNewSignals.push(s);
    }

    risk_summary[it.risk_level] += 1;
    if (it.gate_recommendation === "require_approval") cases_requiring_approval += 1;
    if (it.gate_recommendation === "block") cases_block_recommended += 1;

    if (it.data_availability.baseline.status === "missing") data_coverage.missing_baseline_artifacts += 1;
    if (it.data_availability.baseline.status === "broken") data_coverage.broken_baseline_artifacts += 1;
    if (it.data_availability.new.status === "missing") data_coverage.missing_new_artifacts += 1;
    if (it.data_availability.new.status === "broken") data_coverage.broken_new_artifacts += 1;
  }

  for (const it of items) {
    if (interruptController.signal.aborted) break;
    progress.phase = "render_case_html";
    progress.last_case_id = it.case_id;
    const b = baselineById[it.case_id];
    const n = newById[it.case_id];

    if (!b || !n) {
      const caseHtml = renderMissingCaseHtml(it.case_id, { baseline: !b, new: !n });
      await writeFileAtomic(path.join(reportDirAbs, `case-${it.case_id}.html`), caseHtml, "utf-8");
      continue;
    }

    const baseReplay = toReplayResponse(b);
    const newReplay = toReplayResponse(n);

    const brf = (baseReplay as unknown as { runner_failure?: Record<string, unknown> }).runner_failure;
    if (brf && typeof brf === "object") {
      if (typeof it.artifacts.baseline_failure_body_href === "string") brf.full_body_saved_to = it.artifacts.baseline_failure_body_href;
      if (typeof it.artifacts.baseline_failure_meta_href === "string") brf.full_body_meta_saved_to = it.artifacts.baseline_failure_meta_href;
    }

    const nrf = (newReplay as unknown as { runner_failure?: Record<string, unknown> }).runner_failure;
    if (nrf && typeof nrf === "object") {
      if (typeof it.artifacts.new_failure_body_href === "string") nrf.full_body_saved_to = it.artifacts.new_failure_body_href;
      if (typeof it.artifacts.new_failure_meta_href === "string") nrf.full_body_meta_saved_to = it.artifacts.new_failure_meta_href;
    }

    try {
      const caseHtml = renderCaseDiffHtml(it.case_id, baseReplay, newReplay);
      await writeFileAtomic(path.join(reportDirAbs, `case-${it.case_id}.html`), caseHtml, "utf-8");
    } catch (e) {
      const note = e instanceof Error ? e.message : String(e);
      const fallback = renderMissingCaseHtml(it.case_id, { baseline: false, new: false }, `render_error: ${note}`);
      await writeFileAtomic(path.join(reportDirAbs, `case-${it.case_id}.html`), fallback, "utf-8");
    }
  }
  await throwIfInterrupted();

  const qualityEntries = buildQualityEntries({
    projectRoot,
    baselineDirAbs,
    newDirAbs,
    casesPathAbs,
    items,
  });

  const quality_flags = await computeQualityFlags(reportDirAbs, qualityEntries);
  await maybeAttachLargePayloadWarnings({
    cases,
    baselineDirAbs,
    newDirAbs,
    warnBodyBytes,
    qualityFlags: quality_flags,
  });

  const expectedById = new Map(cases.map((c) => [c.id, c.expected] as const));
  const executionQuality: ExecutionQualitySummary = computeExecutionQuality({
    items,
    expectedById,
    minTransportSuccessRate,
    maxWeakExpectedRate,
    ...(interruptedBy ? { interruptedBySignal: interruptedBy.signal } : {}),
  });
  if (getFlag("--strictPortability") && !quality_flags.portable_paths) {
    throw new CliUsageError(`Portability violations detected. See quality_flags.path_violations in compare-report.json.\n\n${HELP_TEXT}`);
  }

  const summary_by_suite = computeSummaryBySuite(items);

  const report: CompareReport & { embedded_manifest_index?: ThinIndex } = buildCompareReportDocument({
    reportId,
    toolkitVersion: TOOLKIT_VERSION,
    generatedAt: Date.now(),
    environment,
    projectRoot,
    baselineDirAbs,
    newDirAbs,
    casesPathAbs,
    baselinePass,
    newPass,
    regressions,
    improvements,
    breakdown,
    transferClass,
    redactionStatus,
    ...(redactionPresetId ? { redactionPresetId } : {}),
    totalCases: total_cases,
    casesWithSignalsNew: cases_with_signals_new,
    casesWithSignalsBaseline: cases_with_signals_baseline,
    signalCountsNew: signal_counts_new,
    signalCountsBaseline: signal_counts_baseline,
    topSignalKindsNew: topKinds(allNewSignals),
    topSignalKindsBaseline: topKinds(allBaselineSignals),
    riskSummary: risk_summary,
    casesRequiringApproval: cases_requiring_approval,
    casesBlockRecommended: cases_block_recommended,
    dataCoverage: data_coverage,
    executionQuality,
    traceAnchorCoverage: {
      cases_with_anchor_baseline: casesWithAnchorBaseline,
      cases_with_anchor_new: casesWithAnchorNew,
    },
    summaryBySuite: summary_by_suite,
    qualityFlags: quality_flags,
    ...(complianceMapping ? { complianceMapping } : {}),
    items,
  });

  await writeJsonAtomic(path.join(reportDirAbs, "compare-report.json"), report);

  await writeRedactionSummaryIfNeeded({
    reportDirAbs,
    redactionStatus,
    ...(redactionPresetId ? { redactionPresetId } : {}),
    redactionWarnings,
    manifestItems,
  });
  const { thinIndex } = await finalizeManifest({
    reportDirAbs,
    manifestItems,
  });

  report.embedded_manifest_index = thinIndex;

  const html = renderHtmlReport(report);
  await writeFileAtomic(path.join(reportDirAbs, "report.html"), html, "utf-8");

  console.log(`html report: ${normRel(projectRoot, path.join(reportDirAbs, "report.html"))}`);
  console.log(`compare report: ${normRel(projectRoot, path.join(reportDirAbs, "compare-report.json"))}`);

  await ingestTrendIfEnabled({
    enabled: !hasFlag("--no-trend"),
    ...(getArg("--trend-db") ? { trendDbArg: getArg("--trend-db") as string } : {}),
    report,
    reportId,
    reportDirAbs,
    newDirAbs,
    newRunMeta: newRun.meta,
    responses: newRun.byId,
  });

  const interruption = interruptedBy as { signal: "SIGINT" | "SIGTERM"; at: number } | null;
  if (interruption) {
    await ensureDir(path.join(reportDirAbs, "artifacts"));
    await writeJsonAtomic(path.join(reportDirAbs, "artifacts", "interrupted.json"), {
      report_id: reportId,
      interrupted: true,
      signal: interruption.signal,
      interrupted_at: interruption.at,
      progress,
      execution_quality: executionQuality,
    });
    await appendAuditLog({
      component: "evaluator",
      event: "finish_interrupted",
      report_id: reportId,
      signal: interruption.signal,
      items_count: items.length,
      report_dir: normRel(projectRoot, reportDirAbs),
    });
    if (retentionDays > 0) {
      await cleanupOldReports(path.dirname(reportDirAbs), retentionDays, async (deletedPath) => {
        await appendAuditLog({ component: "evaluator", event: "retention_delete", path: deletedPath });
      });
    }
    emitStructuredLog("evaluator", "warn", "finish_interrupted", {
      report_id: reportId,
      signal: interruption.signal,
      cases_processed: progress.cases_processed,
      items_emitted: items.length,
    });
    throw new InterruptedRunError("Evaluator", interruption.signal);
  }

  if (executionQuality.status === "degraded" && failOnExecutionDegraded) {
    await appendAuditLog({
      component: "evaluator",
      event: "finish_degraded_gate",
      report_id: reportId,
      reasons: executionQuality.reasons,
      report_dir: normRel(projectRoot, reportDirAbs),
    });
    if (retentionDays > 0) {
      await cleanupOldReports(path.dirname(reportDirAbs), retentionDays, async (deletedPath) => {
        await appendAuditLog({ component: "evaluator", event: "retention_delete", path: deletedPath });
      });
    }
    emitStructuredLog("evaluator", "error", "finish_degraded_gate", {
      report_id: reportId,
      reasons: executionQuality.reasons,
    });
    throw new ExecutionQualityGateError(executionQuality.reasons);
  }

  await appendAuditLog({
    component: "evaluator",
    event: "finish",
    report_id: reportId,
    items_count: items.length,
    report_dir: normRel(projectRoot, reportDirAbs),
  });

  if (retentionDays > 0) {
    await cleanupOldReports(path.dirname(reportDirAbs), retentionDays, async (deletedPath) => {
      await appendAuditLog({ component: "evaluator", event: "retention_delete", path: deletedPath });
    });
  }
  emitStructuredLog("evaluator", "info", "finish", {
    report_id: reportId,
    items_count: items.length,
    execution_quality: executionQuality.status,
  });
  } finally {
    process.removeListener("SIGINT", onSigInt);
    process.removeListener("SIGTERM", onSigTerm);
  }
}
