#!/usr/bin/env bash
set -euo pipefail

# Local benchmark campaign runner:
# - executes baseline + 2 comparison runs
# - evaluates each run against baseline
# - generates trend.html for recent runs

BASE_URL="${BASE_URL:-http://127.0.0.1:8788}"
CASES="${CASES:-}"
AGENT_SUITE="${AGENT_SUITE:-cli}"          # cli | autonomous
CAMPAIGN_PROFILE="${CAMPAIGN_PROFILE:-quality}"  # quality | infra
OUT_DIR="${OUT_DIR:-apps/runner/runs}"
REPORTS_DIR="${REPORTS_DIR:-apps/evaluator/reports}"
RUN_PREFIX="${RUN_PREFIX:-cli_prod}"
REPORT_PREFIX="${REPORT_PREFIX:-cli-prod}"
TIMEOUT_MS="${TIMEOUT_MS:-210000}"
TIMEOUT_PROFILE="${TIMEOUT_PROFILE:-off}"
TIMEOUT_AUTO_CAP_MS="${TIMEOUT_AUTO_CAP_MS:-3600000}"
TIMEOUT_AUTO_LOOKBACK_RUNS="${TIMEOUT_AUTO_LOOKBACK_RUNS:-12}"
TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-3}"
TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-3}"
RETRIES="${RETRIES:-1}"
CONCURRENCY="${CONCURRENCY:-1}"
PREFLIGHT_MODE="${PREFLIGHT_MODE:-warn}"
PREFLIGHT_TIMEOUT_MS="${PREFLIGHT_TIMEOUT_MS:-10000}"
FAIL_FAST_TRANSPORT_STREAK="${FAIL_FAST_TRANSPORT_STREAK:-3}"
INACTIVITY_TIMEOUT_MS="${INACTIVITY_TIMEOUT_MS:-0}"
HEALTH_RETRIES="${HEALTH_RETRIES:-5}"
HEALTH_WAIT_SEC="${HEALTH_WAIT_SEC:-2}"
VERIFY_OTEL_PROOF="${VERIFY_OTEL_PROOF:-0}"
VERIFY_RUNTIME_HANDOFF="${VERIFY_RUNTIME_HANDOFF:-0}"
RUNTIME_HANDOFF_MODE="${RUNTIME_HANDOFF_MODE:-endpoint}"
RUNCASE_TIMEOUT_MS="${RUNCASE_TIMEOUT_MS:-30000}"
ENFORCE_CASE_QUALITY="${ENFORCE_CASE_QUALITY:-1}"
CASE_QUALITY_MAX_WEAK_EXPECTED_RATE="${CASE_QUALITY_MAX_WEAK_EXPECTED_RATE:-0.2}"
CASE_QUALITY_REQUIRE_TOOL_EVIDENCE="${CASE_QUALITY_REQUIRE_TOOL_EVIDENCE:-1}"
CASE_QUALITY_REQUIRE_STRONG_TELEMETRY="${CASE_QUALITY_REQUIRE_STRONG_TELEMETRY:-1}"
CASE_QUALITY_REQUIRE_SEMANTIC="${CASE_QUALITY_REQUIRE_SEMANTIC:-1}"
ALLOW_EXISTING_RUN_PREFIX="${ALLOW_EXISTING_RUN_PREFIX:-0}"
LIBRARY_INGEST="${LIBRARY_INGEST:-1}"
LIBRARY_DIR="${LIBRARY_DIR:-.agent-qa/library}"
LIBRARY_AGENT_ID="${LIBRARY_AGENT_ID:-}"
LIBRARY_SOURCE="${LIBRARY_SOURCE:-local-campaign}"
EVAL_FAIL_ON_EXECUTION_DEGRADED="${EVAL_FAIL_ON_EXECUTION_DEGRADED:-1}"
AQ_MIN_PRE_ACTION_ENTROPY_REMOVED="${AQ_MIN_PRE_ACTION_ENTROPY_REMOVED:-0}"
AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK="${AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK:-0}"

RUN_BASE="${RUN_PREFIX}_base"
RUN_NEW2="${RUN_PREFIX}_new2"
RUN_NEW3="${RUN_PREFIX}_new3"

resolve_cases_path() {
  if [[ -n "${CASES}" ]]; then
    echo "${CASES}"
    return 0
  fi

  case "${AGENT_SUITE}:${CAMPAIGN_PROFILE}" in
    cli:quality) echo "cases/agents/cli-agent-quality.json" ;;
    cli:infra) echo "cases/agents/cli-agent.json" ;;
    autonomous:quality) echo "cases/agents/autonomous-cli-agent-quality.json" ;;
    autonomous:infra) echo "cases/agents/autonomous-cli-agent.json" ;;
    *)
      echo "Unsupported AGENT_SUITE/CAMPAIGN_PROFILE: ${AGENT_SUITE}/${CAMPAIGN_PROFILE}" >&2
      exit 2
      ;;
  esac
}

CASES="$(resolve_cases_path)"

run_runner() {
  local run_id="$1"
  local args=(
    --baseUrl "${BASE_URL}"
    --cases "${CASES}"
    --outDir "${OUT_DIR}"
    --runId "${run_id}"
    --timeoutMs "${TIMEOUT_MS}"
    --timeoutProfile "${TIMEOUT_PROFILE}"
    --timeoutAutoCapMs "${TIMEOUT_AUTO_CAP_MS}"
    --timeoutAutoLookbackRuns "${TIMEOUT_AUTO_LOOKBACK_RUNS}"
    --timeoutAutoMinSuccessSamples "${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}"
    --timeoutAutoMaxIncreaseFactor "${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}"
    --retries "${RETRIES}"
    --concurrency "${CONCURRENCY}"
    --preflightMode "${PREFLIGHT_MODE}"
    --preflightTimeoutMs "${PREFLIGHT_TIMEOUT_MS}"
    --failFastTransportStreak "${FAIL_FAST_TRANSPORT_STREAK}"
  )
  if [[ "${INACTIVITY_TIMEOUT_MS}" != "0" ]]; then
    args+=(--inactivityTimeoutMs "${INACTIVITY_TIMEOUT_MS}")
  fi

  npm --workspace runner run dev -- \
    "${args[@]}"
}

run_eval() {
  local report_id="$1"
  local new_run="$2"
  local report_dir="${REPORTS_DIR}/${report_id}"
  local args=(
    --cases "${CASES}"
    --baselineDir "${OUT_DIR}/baseline/${RUN_BASE}"
    --newDir "${OUT_DIR}/new/${new_run}"
    --outDir "${report_dir}"
    --reportId "${report_id}"
  )
  if [[ "${EVAL_FAIL_ON_EXECUTION_DEGRADED}" == "1" ]]; then
    args+=(--failOnExecutionDegraded)
  fi
  npm --workspace evaluator run dev -- "${args[@]}"
}

ingest_library() {
  local report_id="$1"
  if [[ "${LIBRARY_INGEST}" != "1" ]]; then
    return 0
  fi
  local args=(
    --reportDir "${REPORTS_DIR}/${report_id}"
    --libraryDir "${LIBRARY_DIR}"
    --suite "${AGENT_SUITE}"
    --profile "${CAMPAIGN_PROFILE}"
    --source "${LIBRARY_SOURCE}"
  )
  if [[ -n "${LIBRARY_AGENT_ID}" ]]; then
    args+=(--agentId "${LIBRARY_AGENT_ID}")
  fi
  node scripts/library-ingest.mjs "${args[@]}"
}

check_adapter_ready() {
  local health_url="${BASE_URL%/}/health"
  local attempt=1
  while [[ "${attempt}" -le "${HEALTH_RETRIES}" ]]; do
    if curl -fsS --max-time 5 "${health_url}" >/dev/null; then
      echo "Adapter health check passed: ${health_url}"
      return 0
    fi
    echo "Adapter health check failed (attempt ${attempt}/${HEALTH_RETRIES}): ${health_url}"
    if [[ "${attempt}" -lt "${HEALTH_RETRIES}" ]]; then
      sleep "${HEALTH_WAIT_SEC}"
    fi
    attempt=$((attempt + 1))
  done

  echo "ERROR: adapter is not reachable at ${health_url}. Start cli-agent-adapter first."
  return 1
}

check_cases_quality() {
  if [[ "${ENFORCE_CASE_QUALITY}" != "1" ]]; then
    return 0
  fi

  node scripts/validate-cases-quality.mjs \
    --cases "${CASES}" \
    --profile "${CAMPAIGN_PROFILE}" \
    --maxWeakExpectedRate "${CASE_QUALITY_MAX_WEAK_EXPECTED_RATE}" \
    --requireToolEvidence "${CASE_QUALITY_REQUIRE_TOOL_EVIDENCE}" \
    --requireStrongTelemetry "${CASE_QUALITY_REQUIRE_STRONG_TELEMETRY}" \
    --requireSemanticQuality "${CASE_QUALITY_REQUIRE_SEMANTIC}"
}

check_fresh_targets() {
  if [[ "${ALLOW_EXISTING_RUN_PREFIX}" == "1" ]]; then
    return 0
  fi

  local collisions=()
  local targets=(
    "${OUT_DIR}/baseline/${RUN_BASE}"
    "${OUT_DIR}/new/${RUN_BASE}"
    "${OUT_DIR}/baseline/${RUN_NEW2}"
    "${OUT_DIR}/new/${RUN_NEW2}"
    "${OUT_DIR}/baseline/${RUN_NEW3}"
    "${OUT_DIR}/new/${RUN_NEW3}"
    "${REPORTS_DIR}/${REPORT_PREFIX}"
    "${REPORTS_DIR}/${REPORT_PREFIX}-2"
    "${REPORTS_DIR}/${REPORT_PREFIX}-3"
  )

  for t in "${targets[@]}"; do
    if [[ -e "${t}" ]]; then
      collisions+=("${t}")
    fi
  done

  if [[ "${#collisions[@]}" -gt 0 ]]; then
    echo "ERROR: RUN_PREFIX/REPORT_PREFIX already exists. Use a new prefix to avoid mixed artifacts."
    for c in "${collisions[@]}"; do
      echo " - ${c}"
    done
    echo "Hint: set unique RUN_PREFIX/REPORT_PREFIX (for example with timestamp) or set ALLOW_EXISTING_RUN_PREFIX=1 if overwrite is intentional."
    exit 3
  fi
}

echo "Running baseline/new runs against ${BASE_URL}"
echo "Runner timeout profile: ${TIMEOUT_PROFILE} (timeoutMs=${TIMEOUT_MS}, cap=${TIMEOUT_AUTO_CAP_MS}, lookback=${TIMEOUT_AUTO_LOOKBACK_RUNS}, minSuccess=${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}, maxFactor=${TIMEOUT_AUTO_MAX_INCREASE_FACTOR})"
echo "Campaign profile: suite=${AGENT_SUITE}, profile=${CAMPAIGN_PROFILE}, cases=${CASES}"
if [[ "${LIBRARY_INGEST}" == "1" ]]; then
  echo "Library ingest: enabled (dir=${LIBRARY_DIR}, agentId=${LIBRARY_AGENT_ID:-none}, source=${LIBRARY_SOURCE})"
fi
if [[ "${EVAL_FAIL_ON_EXECUTION_DEGRADED}" == "1" ]]; then
  echo "Execution quality gate: enabled (--failOnExecutionDegraded, minTransport=${AQ_MIN_TRANSPORT_SUCCESS_RATE:-0.95}, maxWeakExpected=${AQ_MAX_WEAK_EXPECTED_RATE:-0.2}, minPreActionEntropy=${AQ_MIN_PRE_ACTION_ENTROPY_REMOVED}, minReconMinutesPerBlock=${AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK})"
fi
if [[ "${RETRIES}" == "0" ]]; then
  echo "WARNING: RETRIES=0 disables transient transport recovery retries and can turn short adapter blips into failed runs."
fi
check_cases_quality
check_fresh_targets
check_adapter_ready
run_runner "${RUN_BASE}"
run_runner "${RUN_NEW2}"
run_runner "${RUN_NEW3}"

echo "Evaluating reports"
run_eval "${REPORT_PREFIX}" "${RUN_BASE}"
ingest_library "${REPORT_PREFIX}"
run_eval "${REPORT_PREFIX}-2" "${RUN_NEW2}"
ingest_library "${REPORT_PREFIX}-2"
run_eval "${REPORT_PREFIX}-3" "${RUN_NEW3}"
ingest_library "${REPORT_PREFIX}-3"

echo "Building trend HTML"
npm run trend -- html --last 8 --out "${REPORTS_DIR}/${REPORT_PREFIX}"

if [[ "${VERIFY_OTEL_PROOF}" == "1" ]]; then
  echo "Verifying OTel anchor proof"
  node scripts/proof-otel-anchors.mjs --reportDir "${REPORTS_DIR}/${REPORT_PREFIX}" --minCases 1
fi

if [[ "${VERIFY_RUNTIME_HANDOFF}" == "1" ]]; then
  echo "Verifying runtime handoff proof (${RUNTIME_HANDOFF_MODE})"
  node scripts/proof-runtime-handoff.mjs --baseUrl "${BASE_URL}" --mode "${RUNTIME_HANDOFF_MODE}" --runCaseTimeoutMs "${RUNCASE_TIMEOUT_MS}"
fi

echo "Done"
echo "Base report: ${REPORTS_DIR}/${REPORT_PREFIX}/report.html"
echo "Compare JSON: ${REPORTS_DIR}/${REPORT_PREFIX}/compare-report.json"
echo "Trend: ${REPORTS_DIR}/${REPORT_PREFIX}/trend.html"
