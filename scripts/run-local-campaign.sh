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
STAGED_MODE="${STAGED_MODE:-1}"            # 1 (default): smoke->full; 0: single campaign (legacy)
STAGED_AUTO_PROMOTE_FULL="${STAGED_AUTO_PROMOTE_FULL:-1}"
CAMPAIGN_STAGE_LABEL="${CAMPAIGN_STAGE_LABEL:-full}"
PRINT_DEVOPS_ENVELOPE="${PRINT_DEVOPS_ENVELOPE:-1}"
CAMPAIGN_SAMPLE_COUNT="${CAMPAIGN_SAMPLE_COUNT:-3}"
SMOKE_CASES="${SMOKE_CASES:-}"             # optional explicit smoke cases file
SMOKE_MAX_CASES="${SMOKE_MAX_CASES:-4}"    # used when SMOKE_CASES is not provided
SMOKE_CAMPAIGN_SAMPLE_COUNT="${SMOKE_CAMPAIGN_SAMPLE_COUNT:-1}"
SMOKE_TIMEOUT_PROFILE="${SMOKE_TIMEOUT_PROFILE:-}"
SMOKE_TIMEOUT_MS="${SMOKE_TIMEOUT_MS:-30000}"
SMOKE_RETRIES="${SMOKE_RETRIES:-0}"
SMOKE_CONCURRENCY="${SMOKE_CONCURRENCY:-1}"
SMOKE_PREFLIGHT_MODE="${SMOKE_PREFLIGHT_MODE:-strict}"
SMOKE_PREFLIGHT_TIMEOUT_MS="${SMOKE_PREFLIGHT_TIMEOUT_MS:-10000}"
SMOKE_FAIL_FAST_TRANSPORT_STREAK="${SMOKE_FAIL_FAST_TRANSPORT_STREAK:-1}"
SMOKE_ENFORCE_CASE_QUALITY="${SMOKE_ENFORCE_CASE_QUALITY:-0}"
SMOKE_LIBRARY_INGEST="${SMOKE_LIBRARY_INGEST:-0}"
SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-}"
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
CASE_QUALITY_REQUIRE_ASSUMPTION_STATE="${CASE_QUALITY_REQUIRE_ASSUMPTION_STATE:-1}"
ALLOW_EXISTING_RUN_PREFIX="${ALLOW_EXISTING_RUN_PREFIX:-0}"
LIBRARY_INGEST="${LIBRARY_INGEST:-1}"
LIBRARY_DIR="${LIBRARY_DIR:-.agent-qa/library}"
LIBRARY_AGENT_ID="${LIBRARY_AGENT_ID:-}"
LIBRARY_SOURCE="${LIBRARY_SOURCE:-local-campaign}"
EVAL_FAIL_ON_EXECUTION_DEGRADED="${EVAL_FAIL_ON_EXECUTION_DEGRADED:-1}"
AQ_MIN_PRE_ACTION_ENTROPY_REMOVED="${AQ_MIN_PRE_ACTION_ENTROPY_REMOVED:-0}"
AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK="${AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK:-0}"
AGENT_RUNTIME_CLASS="${AGENT_RUNTIME_CLASS:-generic}"
AGENT_RUN_MODE="${AGENT_RUN_MODE:-}"
DIAGNOSTIC_RECOMMEND_RUNTIME_MS="${DIAGNOSTIC_RECOMMEND_RUNTIME_MS:-5400000}"
CALIBRATION_MODE="${CALIBRATION_MODE:-auto}"   # auto | always | off
CALIBRATION_CASES="${CALIBRATION_CASES:-}"
CALIBRATION_MAX_CASES="${CALIBRATION_MAX_CASES:-1}"
CALIBRATION_SAMPLE_COUNT="${CALIBRATION_SAMPLE_COUNT:-1}"
CALIBRATION_TIMEOUT_PROFILE="${CALIBRATION_TIMEOUT_PROFILE:-off}"
CALIBRATION_TIMEOUT_MS="${CALIBRATION_TIMEOUT_MS:-900000}"
CALIBRATION_RETRIES="${CALIBRATION_RETRIES:-0}"
CALIBRATION_CONCURRENCY="${CALIBRATION_CONCURRENCY:-1}"
CALIBRATION_PREFLIGHT_MODE="${CALIBRATION_PREFLIGHT_MODE:-off}"
CALIBRATION_PREFLIGHT_TIMEOUT_MS="${CALIBRATION_PREFLIGHT_TIMEOUT_MS:-10000}"
CALIBRATION_FAIL_FAST_TRANSPORT_STREAK="${CALIBRATION_FAIL_FAST_TRANSPORT_STREAK:-1}"
CALIBRATION_ENFORCE_CASE_QUALITY="${CALIBRATION_ENFORCE_CASE_QUALITY:-0}"
CALIBRATION_LIBRARY_INGEST="${CALIBRATION_LIBRARY_INGEST:-0}"
CALIBRATION_EVAL_FAIL_ON_EXECUTION_DEGRADED="${CALIBRATION_EVAL_FAIL_ON_EXECUTION_DEGRADED:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/run-local-campaign.sh"

build_run_ids() {
  local prefix="$1"
  local count_raw="$2"
  local count="${count_raw}"
  if ! [[ "${count}" =~ ^[0-9]+$ ]] || [[ "${count}" -lt 1 ]]; then
    echo "Invalid CAMPAIGN_SAMPLE_COUNT: ${count_raw}. Must be >= 1." >&2
    exit 2
  fi

  local ids=("${prefix}_base")
  local i
  for ((i = 2; i <= count; i += 1)); do
    ids+=("${prefix}_new${i}")
  done
  printf '%s\n' "${ids[@]}"
}

build_report_ids() {
  local prefix="$1"
  local count_raw="$2"
  local count="${count_raw}"
  if ! [[ "${count}" =~ ^[0-9]+$ ]] || [[ "${count}" -lt 1 ]]; then
    echo "Invalid CAMPAIGN_SAMPLE_COUNT: ${count_raw}. Must be >= 1." >&2
    exit 2
  fi

  local ids=("${prefix}")
  local i
  for ((i = 2; i <= count; i += 1)); do
    ids+=("${prefix}-${i}")
  done
  printf '%s\n' "${ids[@]}"
}

read_lines_into_array() {
  local __var_name="$1"
  shift
  local __text
  local __old_ifs="${IFS}"
  __text="$("$@")"
  IFS=$'\n'
  # shellcheck disable=SC2206
  eval "${__var_name}=(\${__text})"
  IFS="${__old_ifs}"
}

map_report_to_run_id() {
  local index="$1"
  shift
  local run_ids=("$@")
  if [[ "${index}" -eq 0 ]]; then
    echo "${run_ids[0]}"
    return 0
  fi
  echo "${run_ids[${index}]}"
}

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

if [[ -z "${SMOKE_TIMEOUT_PROFILE}" ]]; then
  if [[ "${TIMEOUT_PROFILE}" == "auto" ]]; then
    SMOKE_TIMEOUT_PROFILE="auto"
  else
    SMOKE_TIMEOUT_PROFILE="off"
  fi
fi

if [[ -z "${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" ]]; then
  if [[ "${SMOKE_TIMEOUT_PROFILE}" == "auto" ]]; then
    SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="1"
  else
    SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}"
  fi
fi

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
    --requireSemanticQuality "${CASE_QUALITY_REQUIRE_SEMANTIC}" \
    --requireAssumptionState "${CASE_QUALITY_REQUIRE_ASSUMPTION_STATE}"
}

check_fresh_targets() {
  if [[ "${ALLOW_EXISTING_RUN_PREFIX}" == "1" ]]; then
    return 0
  fi

  local collisions=()
  local targets=()
  local run_ids=()
  local report_ids=()
  read_lines_into_array run_ids build_run_ids "${RUN_PREFIX}" "${CAMPAIGN_SAMPLE_COUNT}"
  read_lines_into_array report_ids build_report_ids "${REPORT_PREFIX}" "${CAMPAIGN_SAMPLE_COUNT}"

  local run_id
  for run_id in "${run_ids[@]}"; do
    targets+=("${OUT_DIR}/baseline/${run_id}")
    targets+=("${OUT_DIR}/new/${run_id}")
  done

  local report_id
  for report_id in "${report_ids[@]}"; do
    targets+=("${REPORTS_DIR}/${report_id}")
  done

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

json_field() {
  local json="$1"
  local field="$2"
  node -e 'const j=JSON.parse(process.argv[1]);const v=j[process.argv[2]];process.stdout.write(typeof v==="string"?v:"");' "${json}" "${field}"
}

json_number_field() {
  local json="$1"
  local field="$2"
  node -e 'const j=JSON.parse(process.argv[1]);const v=j[process.argv[2]];if(typeof v==="number"&&Number.isFinite(v))process.stdout.write(String(v));' "${json}" "${field}"
}

emit_stage_result() {
  local stage="$1"
  local status="$2"
  local reason="$3"
  local next_action="$4"
  local source="$5"
  local report_dir="$6"
  local compare_report="$7"
  local payload
  payload="$(node -e 'const o={stage:process.argv[1],status:process.argv[2],reason:process.argv[3],next_action:process.argv[4],source:process.argv[5],report_dir:process.argv[6],compare_report:process.argv[7]};console.log(JSON.stringify(o));' "${stage}" "${status}" "${reason}" "${next_action}" "${source}" "${report_dir}" "${compare_report}")"
  echo "stage_result: ${payload}"
  if [[ -n "${report_dir}" ]]; then
    mkdir -p "${report_dir}"
    printf '%s\n' "${payload}" > "${report_dir}/stage-result.json"
  fi
}

print_devops_envelope() {
  if [[ "${PRINT_DEVOPS_ENVELOPE}" != "1" ]]; then
    return 0
  fi

  echo "DevOps envelope (${CAMPAIGN_STAGE_LABEL}):"
  echo "  baseUrl=${BASE_URL}"
  echo "  cases=${CASES}"
  echo "  suite=${AGENT_SUITE}"
  echo "  profile=${CAMPAIGN_PROFILE}"
  echo "  sampleCount=${CAMPAIGN_SAMPLE_COUNT}"
  echo "  timeoutProfile=${TIMEOUT_PROFILE}"
  echo "  timeoutMs=${TIMEOUT_MS}"
  echo "  timeoutAutoCapMs=${TIMEOUT_AUTO_CAP_MS}"
  echo "  timeoutAutoLookbackRuns=${TIMEOUT_AUTO_LOOKBACK_RUNS}"
  echo "  timeoutAutoMinSuccessSamples=${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}"
  echo "  timeoutAutoMaxIncreaseFactor=${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}"
  echo "  retries=${RETRIES}"
  echo "  concurrency=${CONCURRENCY}"
  echo "  preflightMode=${PREFLIGHT_MODE}"
  echo "  preflightTimeoutMs=${PREFLIGHT_TIMEOUT_MS}"
  echo "  failFastTransportStreak=${FAIL_FAST_TRANSPORT_STREAK}"
  echo "  inactivityTimeoutMs=${INACTIVITY_TIMEOUT_MS}"
}

write_devops_envelope_file() {
  local report_dir="$1"
  mkdir -p "${report_dir}"
  local out="${report_dir}/devops-envelope.json"
  node -e 'const fs=require("fs");const out=process.argv[1];const payload={stage:process.argv[2],generated_at:new Date().toISOString(),base_url:process.argv[3],cases:process.argv[4],suite:process.argv[5],profile:process.argv[6],sample_count:Number(process.argv[7]),timeout_profile:process.argv[8],timeout_ms:Number(process.argv[9]),timeout_auto_cap_ms:Number(process.argv[10]),timeout_auto_lookback_runs:Number(process.argv[11]),timeout_auto_min_success_samples:Number(process.argv[12]),timeout_auto_max_increase_factor:Number(process.argv[13]),retries:Number(process.argv[14]),concurrency:Number(process.argv[15]),preflight_mode:process.argv[16],preflight_timeout_ms:Number(process.argv[17]),fail_fast_transport_streak:Number(process.argv[18]),inactivity_timeout_ms:Number(process.argv[19])};fs.writeFileSync(out,JSON.stringify(payload,null,2));' \
    "${out}" \
    "${CAMPAIGN_STAGE_LABEL}" \
    "${BASE_URL}" \
    "${CASES}" \
    "${AGENT_SUITE}" \
    "${CAMPAIGN_PROFILE}" \
    "${CAMPAIGN_SAMPLE_COUNT}" \
    "${TIMEOUT_PROFILE}" \
    "${TIMEOUT_MS}" \
    "${TIMEOUT_AUTO_CAP_MS}" \
    "${TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    "${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
    "${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
    "${RETRIES}" \
    "${CONCURRENCY}" \
    "${PREFLIGHT_MODE}" \
    "${PREFLIGHT_TIMEOUT_MS}" \
    "${FAIL_FAST_TRANSPORT_STREAK}" \
    "${INACTIVITY_TIMEOUT_MS}"
  echo "DevOps envelope JSON: ${out}"
}

write_runtime_plan_file() {
  local out_path="$1"
  local mode="$2"
  local cases_path="$3"
  local timeout_profile="$4"
  local timeout_ms="$5"
  local timeout_auto_min_success_samples="$6"
  local timeout_auto_max_increase_factor="$7"
  local retries="$8"
  local concurrency="$9"
  local sample_count="${10}"
  local max_cases="${11:-0}"

  node "${SCRIPT_DIR}/runtime-advisor.mjs" plan \
    --mode "${mode}" \
    --cases "${cases_path}" \
    --outDir "${OUT_DIR}" \
    --timeoutProfile "${timeout_profile}" \
    --timeoutMs "${timeout_ms}" \
    --timeoutAutoCapMs "${TIMEOUT_AUTO_CAP_MS}" \
    --timeoutAutoLookbackRuns "${TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    --timeoutAutoMinSuccessSamples "${timeout_auto_min_success_samples}" \
    --timeoutAutoMaxIncreaseFactor "${timeout_auto_max_increase_factor}" \
    --sampleCount "${sample_count}" \
    --retries "${retries}" \
    --concurrency "${concurrency}" \
    --runtimeClass "${AGENT_RUNTIME_CLASS}" \
    --diagnosticThresholdMs "${DIAGNOSTIC_RECOMMEND_RUNTIME_MS}" \
    --maxCases "${max_cases}" \
    --out "${out_path}" >/dev/null
  echo "Next envelope JSON: ${out_path}"
}

write_runtime_recommendation_file() {
  local out_path="$1"
  local stage="$2"
  local compare_path="$3"
  local mode="$4"
  local cases_path="$5"
  local timeout_profile="$6"
  local timeout_ms="$7"
  local timeout_auto_min_success_samples="$8"
  local timeout_auto_max_increase_factor="$9"
  local retries="${10}"
  local concurrency="${11}"
  local sample_count="${12}"
  local max_cases="${13:-0}"

  node "${SCRIPT_DIR}/runtime-advisor.mjs" recommend \
    --stage "${stage}" \
    --mode "${mode}" \
    --compare "${compare_path}" \
    --cases "${cases_path}" \
    --outDir "${OUT_DIR}" \
    --timeoutProfile "${timeout_profile}" \
    --timeoutMs "${timeout_ms}" \
    --timeoutAutoCapMs "${TIMEOUT_AUTO_CAP_MS}" \
    --timeoutAutoLookbackRuns "${TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    --timeoutAutoMinSuccessSamples "${timeout_auto_min_success_samples}" \
    --timeoutAutoMaxIncreaseFactor "${timeout_auto_max_increase_factor}" \
    --sampleCount "${sample_count}" \
    --retries "${retries}" \
    --concurrency "${concurrency}" \
    --runtimeClass "${AGENT_RUNTIME_CLASS}" \
    --diagnosticThresholdMs "${DIAGNOSTIC_RECOMMEND_RUNTIME_MS}" \
    --maxCases "${max_cases}" \
    --out "${out_path}" >/dev/null
  echo "Next envelope JSON: ${out_path}"
}

print_next_envelope_summary() {
  local next_envelope_path="$1"
  if [[ ! -f "${next_envelope_path}" ]]; then
    return 0
  fi

  NEXT_ENVELOPE_PATH="${next_envelope_path}" \
  NEXT_ENVELOPE_REPO_ROOT="${REPO_ROOT}" \
  NEXT_ENVELOPE_PROFILE_NAME="${AGENT_PROFILE_NAME:-}" \
  node - <<'NODE'
const fs = require("fs");
const path = process.env.NEXT_ENVELOPE_PATH;
const repoRoot = process.env.NEXT_ENVELOPE_REPO_ROOT || ".";
const profile = process.env.NEXT_ENVELOPE_PROFILE_NAME || "";
const payload = JSON.parse(fs.readFileSync(path, "utf8"));
const suggested = payload.suggested_envelope || null;
const recommendedMode = suggested?.mode || payload.recommended_mode || "quick";
const estimatedRequestTimeoutMs = suggested?.estimated_request_timeout_ms ?? suggested?.timeout_ms ?? payload.estimated_request_timeout_ms ?? payload.current_plan?.estimated_request_timeout_ms ?? 0;
const estimatedStageUpperBoundMs =
  suggested?.estimated_stage_runtime_upper_bound_ms ??
  payload.estimated_stage_runtime_upper_bound_ms ??
  payload.current_plan?.estimated_stage_runtime_upper_bound_ms ??
  0;
const estimatedStageUpperBoundMinutes = estimatedStageUpperBoundMs > 0 ? Math.ceil(estimatedStageUpperBoundMs / 60000) : 0;
const confidence = suggested?.confidence || payload.confidence || payload.current_plan?.confidence || "unknown";
console.log("Next recommendation:");
if (suggested) {
  console.log(
    `  recommendedMode=${recommendedMode} timeoutMs=${suggested.timeout_ms} cap=${suggested.timeout_auto_cap_ms} maxIncreaseFactor=${suggested.timeout_auto_max_increase_factor} estimatedStageUpperBoundMinutes=${estimatedStageUpperBoundMinutes} confidence=${confidence}`
  );
} else {
  console.log(
    `  recommendedMode=${recommendedMode} estimatedRequestTimeoutMs=${estimatedRequestTimeoutMs} estimatedStageUpperBoundMinutes=${estimatedStageUpperBoundMinutes} confidence=${confidence}`
  );
}
if (Array.isArray(payload.timed_out_case_ids) && payload.timed_out_case_ids.length > 0) {
  console.log(`  timedOutCases=${payload.timed_out_case_ids.join(",")}`);
}
if (typeof payload.next_action === "string" && payload.next_action.length > 0) {
  console.log(`  nextAction=${payload.next_action}`);
}
if (Array.isArray(payload.notes)) {
  for (const note of payload.notes.slice(0, 3)) {
    console.log(`  note=${note}`);
  }
}
if (!profile) {
  process.exit(0);
}
let scriptName = "campaign:agent";
const envPrefix = [];
if (recommendedMode === "full") {
  scriptName = "campaign:agent:full";
} else if (recommendedMode === "diagnostic") {
  scriptName = "campaign:agent:diagnostic";
}
if (suggested) {
  if (recommendedMode === "quick") {
    envPrefix.push(`SMOKE_TIMEOUT_MS=${suggested.timeout_ms}`);
    envPrefix.push(`TIMEOUT_AUTO_CAP_MS=${suggested.timeout_auto_cap_ms}`);
    envPrefix.push(`TIMEOUT_AUTO_MAX_INCREASE_FACTOR=${suggested.timeout_auto_max_increase_factor}`);
  } else if (recommendedMode === "diagnostic") {
    envPrefix.push(`DIAGNOSTIC_TIMEOUT_MS=${suggested.timeout_ms}`);
    envPrefix.push(`DIAGNOSTIC_TIMEOUT_AUTO_CAP_MS=${suggested.timeout_auto_cap_ms}`);
    envPrefix.push(`DIAGNOSTIC_TIMEOUT_AUTO_MAX_INCREASE_FACTOR=${suggested.timeout_auto_max_increase_factor}`);
  } else {
    envPrefix.push(`TIMEOUT_MS=${suggested.timeout_ms}`);
    envPrefix.push(`TIMEOUT_AUTO_CAP_MS=${suggested.timeout_auto_cap_ms}`);
    envPrefix.push(`TIMEOUT_AUTO_MAX_INCREASE_FACTOR=${suggested.timeout_auto_max_increase_factor}`);
  }
}
const envPrefixText = envPrefix.length > 0 ? `${envPrefix.join(" ")} ` : "";
console.log("Suggested command:");
console.log(`  cd ${repoRoot} && ${envPrefixText}npm run ${scriptName} -- ${profile}`);
NODE
}

history_summary_json() {
  local cases_path="$1"
  node "${SCRIPT_DIR}/timeout-history-summary.mjs" \
    --outDir "${OUT_DIR}" \
    --cases "${cases_path}" \
    --lookbackRuns "${TIMEOUT_AUTO_LOOKBACK_RUNS}"
}

should_run_calibration() {
  local cases_path="$1"
  local required_samples="$2"

  case "${CALIBRATION_MODE}" in
    off) return 1 ;;
    always) return 0 ;;
    auto) ;;
    *)
      echo "Invalid CALIBRATION_MODE: ${CALIBRATION_MODE}. Use auto|always|off." >&2
      exit 2
      ;;
  esac

  if [[ "${TIMEOUT_PROFILE}" != "auto" && "${SMOKE_TIMEOUT_PROFILE}" != "auto" ]]; then
    return 1
  fi

  local summary
  local success_samples
  summary="$(history_summary_json "${cases_path}")"
  success_samples="$(json_number_field "${summary}" "success_sample_count")"
  if [[ -z "${success_samples}" ]]; then
    success_samples="0"
  fi

  if [[ "${success_samples}" -lt "${required_samples}" ]]; then
    return 0
  fi
  return 1
}

run_calibration_stage() {
  local full_cases_path="$1"
  local calibration_cases_path="${CALIBRATION_CASES}"
  local tmp_calibration_cases=""
  local calibration_run_prefix="${RUN_PREFIX}_calibration"
  local calibration_report_prefix="${REPORT_PREFIX}-calibration"
  local calibration_report_dir="${REPORTS_DIR}/${calibration_report_prefix}"
  local calibration_compare="${calibration_report_dir}/compare-report.json"

  if [[ -z "${calibration_cases_path}" ]]; then
    tmp_calibration_cases="$(mktemp "${TMPDIR:-/tmp}/aq-calibration-cases.XXXXXX")"
    calibration_cases_path="${tmp_calibration_cases}"
    node "${SCRIPT_DIR}/staged-campaign-utils.mjs" smoke-subset \
      --cases "${full_cases_path}" \
      --out "${calibration_cases_path}" \
      --maxCases "${CALIBRATION_MAX_CASES}" >/dev/null
  fi

  echo "Staged campaign: stage=calibration (profile=infra, cases=${calibration_cases_path})"

  local calibration_exit=0
  set +e
  STAGED_MODE=0 \
    CAMPAIGN_STAGE_LABEL="calibration" \
    PRINT_DEVOPS_ENVELOPE="${PRINT_DEVOPS_ENVELOPE}" \
    CAMPAIGN_SAMPLE_COUNT="${CALIBRATION_SAMPLE_COUNT}" \
    BASE_URL="${BASE_URL}" \
    CASES="${calibration_cases_path}" \
    AGENT_SUITE="${AGENT_SUITE}" \
    CAMPAIGN_PROFILE="infra" \
    OUT_DIR="${OUT_DIR}" \
    REPORTS_DIR="${REPORTS_DIR}" \
    RUN_PREFIX="${calibration_run_prefix}" \
    REPORT_PREFIX="${calibration_report_prefix}" \
    TIMEOUT_PROFILE="${CALIBRATION_TIMEOUT_PROFILE}" \
    TIMEOUT_MS="${CALIBRATION_TIMEOUT_MS}" \
    TIMEOUT_AUTO_CAP_MS="${TIMEOUT_AUTO_CAP_MS}" \
    TIMEOUT_AUTO_LOOKBACK_RUNS="${TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="1" \
    TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
    RETRIES="${CALIBRATION_RETRIES}" \
    CONCURRENCY="${CALIBRATION_CONCURRENCY}" \
    PREFLIGHT_MODE="${CALIBRATION_PREFLIGHT_MODE}" \
    PREFLIGHT_TIMEOUT_MS="${CALIBRATION_PREFLIGHT_TIMEOUT_MS}" \
    FAIL_FAST_TRANSPORT_STREAK="${CALIBRATION_FAIL_FAST_TRANSPORT_STREAK}" \
    INACTIVITY_TIMEOUT_MS="${INACTIVITY_TIMEOUT_MS}" \
    HEALTH_RETRIES="${HEALTH_RETRIES}" \
    HEALTH_WAIT_SEC="${HEALTH_WAIT_SEC}" \
    VERIFY_OTEL_PROOF="0" \
    VERIFY_RUNTIME_HANDOFF="0" \
    RUNTIME_HANDOFF_MODE="${RUNTIME_HANDOFF_MODE}" \
    RUNCASE_TIMEOUT_MS="${RUNCASE_TIMEOUT_MS}" \
    ENFORCE_CASE_QUALITY="${CALIBRATION_ENFORCE_CASE_QUALITY}" \
    LIBRARY_INGEST="${CALIBRATION_LIBRARY_INGEST}" \
    EVAL_FAIL_ON_EXECUTION_DEGRADED="${CALIBRATION_EVAL_FAIL_ON_EXECUTION_DEGRADED}" \
    ALLOW_EXISTING_RUN_PREFIX="${ALLOW_EXISTING_RUN_PREFIX}" \
    "${SCRIPT_PATH}"
  calibration_exit=$?
  set -e

  if [[ -n "${tmp_calibration_cases}" ]]; then
    rm -f "${tmp_calibration_cases}"
  fi

  if [[ "${calibration_exit}" -ne 0 ]]; then
    local calibration_class
    local calibration_reason
    local calibration_next_action
    local calibration_source
    calibration_class="$(node "${SCRIPT_DIR}/staged-campaign-utils.mjs" classify --compare "${calibration_compare}" --defaultReason transport)"
    calibration_reason="$(json_field "${calibration_class}" "reason")"
    calibration_next_action="$(json_field "${calibration_class}" "next_action")"
    calibration_source="$(json_field "${calibration_class}" "source")"
    emit_stage_result "calibration" "failed" "${calibration_reason}" "${calibration_next_action}" "${calibration_source}" "${calibration_report_dir}" "${calibration_compare}"
    return "${calibration_exit}"
  fi

  emit_stage_result "calibration" "passed" "none" "run_smoke_stage" "stage_gate" "${calibration_report_dir}" "${calibration_compare}"
  return 0
}

run_staged_flow() {
  local full_cases_path="${CASES}"
  local smoke_cases_path="${SMOKE_CASES}"
  local tmp_smoke_cases=""
  local smoke_run_prefix="${RUN_PREFIX}_smoke"
  local smoke_report_prefix="${REPORT_PREFIX}-smoke"
  local smoke_report_dir="${REPORTS_DIR}/${smoke_report_prefix}"
  local smoke_compare="${smoke_report_dir}/compare-report.json"
  local required_smoke_samples="${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}"

  if [[ -z "${smoke_cases_path}" ]]; then
    tmp_smoke_cases="$(mktemp "${TMPDIR:-/tmp}/aq-smoke-cases.XXXXXX")"
    smoke_cases_path="${tmp_smoke_cases}"
    node "${SCRIPT_DIR}/staged-campaign-utils.mjs" smoke-subset \
      --cases "${full_cases_path}" \
      --out "${smoke_cases_path}" \
      --maxCases "${SMOKE_MAX_CASES}" >/dev/null
  fi

  if should_run_calibration "${smoke_cases_path}" "${required_smoke_samples}"; then
    if ! run_calibration_stage "${full_cases_path}"; then
      if [[ -n "${tmp_smoke_cases}" ]]; then
        rm -f "${tmp_smoke_cases}"
      fi
      echo "Staged campaign stopped at calibration stage (smoke/full were not started)."
      return 21
    fi
  fi

  echo "Staged campaign: stage=smoke (profile=infra, cases=${smoke_cases_path})"

  local smoke_exit=0
  set +e
  STAGED_MODE=0 \
    CAMPAIGN_STAGE_LABEL="smoke" \
    PRINT_DEVOPS_ENVELOPE="${PRINT_DEVOPS_ENVELOPE}" \
    CAMPAIGN_SAMPLE_COUNT="${SMOKE_CAMPAIGN_SAMPLE_COUNT}" \
    BASE_URL="${BASE_URL}" \
    CASES="${smoke_cases_path}" \
    AGENT_SUITE="${AGENT_SUITE}" \
    CAMPAIGN_PROFILE="infra" \
    OUT_DIR="${OUT_DIR}" \
    REPORTS_DIR="${REPORTS_DIR}" \
    RUN_PREFIX="${smoke_run_prefix}" \
    REPORT_PREFIX="${smoke_report_prefix}" \
    TIMEOUT_PROFILE="${SMOKE_TIMEOUT_PROFILE}" \
    TIMEOUT_MS="${SMOKE_TIMEOUT_MS}" \
    TIMEOUT_AUTO_CAP_MS="${TIMEOUT_AUTO_CAP_MS}" \
    TIMEOUT_AUTO_LOOKBACK_RUNS="${TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
    TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
    RETRIES="${SMOKE_RETRIES}" \
    CONCURRENCY="${SMOKE_CONCURRENCY}" \
    PREFLIGHT_MODE="${SMOKE_PREFLIGHT_MODE}" \
    PREFLIGHT_TIMEOUT_MS="${SMOKE_PREFLIGHT_TIMEOUT_MS}" \
    FAIL_FAST_TRANSPORT_STREAK="${SMOKE_FAIL_FAST_TRANSPORT_STREAK}" \
    INACTIVITY_TIMEOUT_MS="${INACTIVITY_TIMEOUT_MS}" \
    HEALTH_RETRIES="${HEALTH_RETRIES}" \
    HEALTH_WAIT_SEC="${HEALTH_WAIT_SEC}" \
    VERIFY_OTEL_PROOF="0" \
    VERIFY_RUNTIME_HANDOFF="0" \
    RUNTIME_HANDOFF_MODE="${RUNTIME_HANDOFF_MODE}" \
    RUNCASE_TIMEOUT_MS="${RUNCASE_TIMEOUT_MS}" \
    ENFORCE_CASE_QUALITY="${SMOKE_ENFORCE_CASE_QUALITY}" \
    LIBRARY_INGEST="${SMOKE_LIBRARY_INGEST}" \
    ALLOW_EXISTING_RUN_PREFIX="${ALLOW_EXISTING_RUN_PREFIX}" \
    "${SCRIPT_PATH}"
  smoke_exit=$?
  set -e

  if [[ "${smoke_exit}" -ne 0 ]]; then
    local smoke_class
    smoke_class="$(node "${SCRIPT_DIR}/staged-campaign-utils.mjs" classify --compare "${smoke_compare}" --defaultReason transport)"
    local smoke_reason
    local smoke_next_action
    local smoke_source
    smoke_reason="$(json_field "${smoke_class}" "reason")"
    smoke_next_action="$(json_field "${smoke_class}" "next_action")"
    smoke_source="$(json_field "${smoke_class}" "source")"
    if [[ -f "${smoke_compare}" ]]; then
      write_runtime_recommendation_file \
        "${smoke_report_dir}/next-envelope.json" \
        "smoke" \
        "${smoke_compare}" \
        "quick" \
        "${smoke_cases_path}" \
        "${SMOKE_TIMEOUT_PROFILE}" \
        "${SMOKE_TIMEOUT_MS}" \
        "${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
        "${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
        "${SMOKE_RETRIES}" \
        "${SMOKE_CONCURRENCY}" \
        "${SMOKE_CAMPAIGN_SAMPLE_COUNT}" \
        "${SMOKE_MAX_CASES}"
      print_next_envelope_summary "${smoke_report_dir}/next-envelope.json"
    fi
    emit_stage_result "smoke" "failed" "${smoke_reason}" "${smoke_next_action}" "${smoke_source}" "${smoke_report_dir}" "${smoke_compare}"
    if [[ -n "${tmp_smoke_cases}" ]]; then
      rm -f "${tmp_smoke_cases}"
    fi
    echo "Staged campaign stopped at smoke stage (full stage was not started)."
    return 20
  fi

  emit_stage_result "smoke" "passed" "none" "run_full_stage" "stage_gate" "${smoke_report_dir}" "${smoke_compare}"
  local full_stage_mode="full"
  if [[ "${AGENT_RUN_MODE}" == "diagnostic" ]]; then
    full_stage_mode="diagnostic"
  fi
  write_runtime_plan_file \
    "${smoke_report_dir}/next-envelope.json" \
    "${full_stage_mode}" \
    "${full_cases_path}" \
    "${TIMEOUT_PROFILE}" \
    "${TIMEOUT_MS}" \
    "${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
    "${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
    "${RETRIES}" \
    "${CONCURRENCY}" \
    "${CAMPAIGN_SAMPLE_COUNT}" \
    "0"
  print_next_envelope_summary "${smoke_report_dir}/next-envelope.json"
  local smoke_next_mode
  smoke_next_mode="$(json_field "$(cat "${smoke_report_dir}/next-envelope.json")" "recommended_mode")"
  if [[ "${STAGED_AUTO_PROMOTE_FULL}" == "1" && "${smoke_next_mode}" == "diagnostic" && "${full_stage_mode}" != "diagnostic" ]]; then
    echo "WARNING: runtime advisor recommends diagnostic mode for the next stage; proceeding with standard full because auto-promote is enabled."
  fi
  if [[ "${STAGED_AUTO_PROMOTE_FULL}" != "1" ]]; then
    if [[ -n "${tmp_smoke_cases}" ]]; then
      rm -f "${tmp_smoke_cases}"
    fi
    echo "Staged campaign completed at smoke stage (auto-promote to full is disabled)."
    return 0
  fi
  if [[ -n "${tmp_smoke_cases}" ]]; then
    rm -f "${tmp_smoke_cases}"
  fi
  echo "Staged campaign: stage=full (profile=${CAMPAIGN_PROFILE}, cases=${full_cases_path})"

  local full_report_dir="${REPORTS_DIR}/${REPORT_PREFIX}"
  local full_compare="${full_report_dir}/compare-report.json"
  local full_exit=0
  set +e
  STAGED_MODE=0 \
    CAMPAIGN_STAGE_LABEL="full" \
    PRINT_DEVOPS_ENVELOPE="${PRINT_DEVOPS_ENVELOPE}" \
    CAMPAIGN_SAMPLE_COUNT="${CAMPAIGN_SAMPLE_COUNT}" \
    BASE_URL="${BASE_URL}" \
    CASES="${full_cases_path}" \
    AGENT_SUITE="${AGENT_SUITE}" \
    CAMPAIGN_PROFILE="${CAMPAIGN_PROFILE}" \
    OUT_DIR="${OUT_DIR}" \
    REPORTS_DIR="${REPORTS_DIR}" \
    RUN_PREFIX="${RUN_PREFIX}" \
    REPORT_PREFIX="${REPORT_PREFIX}" \
    TIMEOUT_PROFILE="${TIMEOUT_PROFILE}" \
    TIMEOUT_MS="${TIMEOUT_MS}" \
    TIMEOUT_AUTO_CAP_MS="${TIMEOUT_AUTO_CAP_MS}" \
    TIMEOUT_AUTO_LOOKBACK_RUNS="${TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
    TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
    RETRIES="${RETRIES}" \
    CONCURRENCY="${CONCURRENCY}" \
    PREFLIGHT_MODE="${PREFLIGHT_MODE}" \
    PREFLIGHT_TIMEOUT_MS="${PREFLIGHT_TIMEOUT_MS}" \
    FAIL_FAST_TRANSPORT_STREAK="${FAIL_FAST_TRANSPORT_STREAK}" \
    INACTIVITY_TIMEOUT_MS="${INACTIVITY_TIMEOUT_MS}" \
    HEALTH_RETRIES="${HEALTH_RETRIES}" \
    HEALTH_WAIT_SEC="${HEALTH_WAIT_SEC}" \
    VERIFY_OTEL_PROOF="${VERIFY_OTEL_PROOF}" \
    VERIFY_RUNTIME_HANDOFF="${VERIFY_RUNTIME_HANDOFF}" \
    RUNTIME_HANDOFF_MODE="${RUNTIME_HANDOFF_MODE}" \
    RUNCASE_TIMEOUT_MS="${RUNCASE_TIMEOUT_MS}" \
    ENFORCE_CASE_QUALITY="${ENFORCE_CASE_QUALITY}" \
    CASE_QUALITY_MAX_WEAK_EXPECTED_RATE="${CASE_QUALITY_MAX_WEAK_EXPECTED_RATE}" \
    CASE_QUALITY_REQUIRE_TOOL_EVIDENCE="${CASE_QUALITY_REQUIRE_TOOL_EVIDENCE}" \
    CASE_QUALITY_REQUIRE_STRONG_TELEMETRY="${CASE_QUALITY_REQUIRE_STRONG_TELEMETRY}" \
    CASE_QUALITY_REQUIRE_SEMANTIC="${CASE_QUALITY_REQUIRE_SEMANTIC}" \
    CASE_QUALITY_REQUIRE_ASSUMPTION_STATE="${CASE_QUALITY_REQUIRE_ASSUMPTION_STATE}" \
    LIBRARY_INGEST="${LIBRARY_INGEST}" \
    LIBRARY_DIR="${LIBRARY_DIR}" \
    LIBRARY_AGENT_ID="${LIBRARY_AGENT_ID}" \
    LIBRARY_SOURCE="${LIBRARY_SOURCE}" \
    EVAL_FAIL_ON_EXECUTION_DEGRADED="${EVAL_FAIL_ON_EXECUTION_DEGRADED}" \
    AQ_MIN_PRE_ACTION_ENTROPY_REMOVED="${AQ_MIN_PRE_ACTION_ENTROPY_REMOVED}" \
    AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK="${AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK}" \
    ALLOW_EXISTING_RUN_PREFIX="${ALLOW_EXISTING_RUN_PREFIX}" \
    "${SCRIPT_PATH}"
  full_exit=$?
  set -e

  if [[ "${full_exit}" -ne 0 ]]; then
    local full_class
    full_class="$(node "${SCRIPT_DIR}/staged-campaign-utils.mjs" classify --compare "${full_compare}" --defaultReason unknown)"
    local full_reason
    local full_next_action
    local full_source
    full_reason="$(json_field "${full_class}" "reason")"
    full_next_action="$(json_field "${full_class}" "next_action")"
    full_source="$(json_field "${full_class}" "source")"
    if [[ -f "${full_compare}" ]]; then
      write_runtime_recommendation_file \
        "${full_report_dir}/next-envelope.json" \
        "full" \
        "${full_compare}" \
        "${full_stage_mode}" \
        "${full_cases_path}" \
        "${TIMEOUT_PROFILE}" \
        "${TIMEOUT_MS}" \
        "${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
        "${TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
        "${RETRIES}" \
        "${CONCURRENCY}" \
        "${CAMPAIGN_SAMPLE_COUNT}" \
        "0"
      print_next_envelope_summary "${full_report_dir}/next-envelope.json"
    fi
    emit_stage_result "full" "failed" "${full_reason}" "${full_next_action}" "${full_source}" "${full_report_dir}" "${full_compare}"
    return "${full_exit}"
  fi

  emit_stage_result "full" "passed" "none" "none" "stage_gate" "${full_report_dir}" "${full_compare}"
  return 0
}

if [[ "${STAGED_MODE}" == "1" && "${CAMPAIGN_PROFILE}" == "quality" ]]; then
  set +e
  run_staged_flow
  staged_exit=$?
  set -e
  exit "${staged_exit}"
fi

print_devops_envelope

echo "Running baseline/new runs against ${BASE_URL}"
echo "Runner timeout profile: ${TIMEOUT_PROFILE} (timeoutMs=${TIMEOUT_MS}, cap=${TIMEOUT_AUTO_CAP_MS}, lookback=${TIMEOUT_AUTO_LOOKBACK_RUNS}, minSuccess=${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}, maxFactor=${TIMEOUT_AUTO_MAX_INCREASE_FACTOR})"
echo "Campaign profile: suite=${AGENT_SUITE}, profile=${CAMPAIGN_PROFILE}, cases=${CASES}"
echo "Campaign sample count: ${CAMPAIGN_SAMPLE_COUNT}"
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
run_ids=()
report_ids=()
read_lines_into_array run_ids build_run_ids "${RUN_PREFIX}" "${CAMPAIGN_SAMPLE_COUNT}"
read_lines_into_array report_ids build_report_ids "${REPORT_PREFIX}" "${CAMPAIGN_SAMPLE_COUNT}"
RUN_BASE="${run_ids[0]}"

for run_id in "${run_ids[@]}"; do
  run_runner "${run_id}"
done

echo "Evaluating reports"
for i in "${!report_ids[@]}"; do
  report_id="${report_ids[${i}]}"
  run_id="$(map_report_to_run_id "${i}" "${run_ids[@]}")"
  run_eval "${report_id}" "${run_id}"
  write_devops_envelope_file "${REPORTS_DIR}/${report_id}"
  ingest_library "${report_id}"
done

echo "Building trend HTML"
npm run trend -- html --last 8 --out "${REPORTS_DIR}/${report_ids[0]}"

if [[ "${VERIFY_OTEL_PROOF}" == "1" ]]; then
  echo "Verifying OTel anchor proof"
  node scripts/proof-otel-anchors.mjs --reportDir "${REPORTS_DIR}/${REPORT_PREFIX}" --minCases 1
fi

if [[ "${VERIFY_RUNTIME_HANDOFF}" == "1" ]]; then
  echo "Verifying runtime handoff proof (${RUNTIME_HANDOFF_MODE})"
  node scripts/proof-runtime-handoff.mjs --baseUrl "${BASE_URL}" --mode "${RUNTIME_HANDOFF_MODE}" --runCaseTimeoutMs "${RUNCASE_TIMEOUT_MS}"
fi

echo "Done"
echo "Base report: ${REPORTS_DIR}/${report_ids[0]}/report.html"
echo "Compare JSON: ${REPORTS_DIR}/${report_ids[0]}/compare-report.json"
echo "Trend: ${REPORTS_DIR}/${report_ids[0]}/trend.html"
