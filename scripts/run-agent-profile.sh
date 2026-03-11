#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROFILES_DIR="${REPO_ROOT}/ops/agents"

print_help() {
  cat <<'EOF'
Usage:
  ./scripts/run-agent-profile.sh <profile-name>
  ./scripts/run-agent-profile.sh --full-lite <profile-name>
  ./scripts/run-agent-profile.sh --full <profile-name>
  ./scripts/run-agent-profile.sh --diagnostic <profile-name>
  ./scripts/run-agent-profile.sh --dry-run <profile-name>
  ./scripts/run-agent-profile.sh --file <path/to/profile.env>
  ./scripts/run-agent-profile.sh --list

Examples:
  ./scripts/run-agent-profile.sh goose-ollama
  ./scripts/run-agent-profile.sh --full-lite goose-ollama
  ./scripts/run-agent-profile.sh --full goose-ollama
  ./scripts/run-agent-profile.sh --diagnostic goose-ollama
  ./scripts/run-agent-profile.sh --dry-run gooseteam-ollama
  TIMEOUT_MS=180000 RETRIES=0 ./scripts/run-agent-profile.sh gooseteam-ollama
EOF
}

list_profiles() {
  if [[ ! -d "${PROFILES_DIR}" ]]; then
    echo "No profiles directory: ${PROFILES_DIR}"
    return 0
  fi
  find "${PROFILES_DIR}" -maxdepth 1 -type f -name '*.env' -print \
    | sed "s#^${PROFILES_DIR}/##" \
    | sed 's/\.env$//' \
    | sort
}

load_env_if_unset() {
  local file="$1"
  while IFS= read -r raw || [[ -n "${raw}" ]]; do
    local line="${raw#"${raw%%[![:space:]]*}"}"
    if [[ -z "${line}" || "${line:0:1}" == "#" ]]; then
      continue
    fi
    if [[ "${line}" != *=* ]]; then
      continue
    fi
    local key="${line%%=*}"
    local val="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"
    if [[ ! "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "Invalid env key in profile: ${key}" >&2
      exit 2
    fi
    if [[ -z "${!key+x}" ]]; then
      export "${key}=${val}"
    fi
  done < "${file}"
}

detect_runtime_class() {
  local explicit_class="${AGENT_RUNTIME_CLASS:-}"
  if [[ -n "${explicit_class}" && "${explicit_class}" != "generic" ]]; then
    AGENT_RUNTIME_CLASS="${explicit_class}"
    AGENT_RUNTIME_CLASS_BASIS="${AGENT_RUNTIME_CLASS_BASIS:-profile}"
    return 0
  fi

  if [[ "${AGENT_USES_MCP:-0}" == "1" || "${AGENT_MULTI_PROCESS:-0}" == "1" ]]; then
    AGENT_RUNTIME_CLASS="heavy_mcp_agent"
    AGENT_RUNTIME_CLASS_BASIS="topology"
    return 0
  fi

  if [[ "${AGENT_PROVIDER_LOCATION:-unknown}" == "local" ]]; then
    AGENT_RUNTIME_CLASS="slow_local_cli"
    AGENT_RUNTIME_CLASS_BASIS="topology"
    return 0
  fi

  if [[ "${AGENT_PROVIDER_LOCATION:-unknown}" == "remote" && "${AGENT_INTERACTIVE:-0}" != "1" ]]; then
    AGENT_RUNTIME_CLASS="fast_remote"
    AGENT_RUNTIME_CLASS_BASIS="topology"
    return 0
  fi

  AGENT_RUNTIME_CLASS="standard_cli"
  AGENT_RUNTIME_CLASS_BASIS="${AGENT_RUNTIME_CLASS_BASIS:-fallback}"
}

class_default_timeout_ms() {
  local runtime_class="$1"
  local stage="$2"
  case "${runtime_class}:${stage}" in
    fast_remote:smoke) echo 120000 ;;
    fast_remote:full-lite) echo 300000 ;;
    fast_remote:full) echo 600000 ;;
    fast_remote:diagnostic) echo 1800000 ;;
    standard_cli:smoke|generic:smoke) echo 300000 ;;
    standard_cli:full-lite|generic:full-lite) echo 600000 ;;
    standard_cli:full|generic:full) echo 1200000 ;;
    standard_cli:diagnostic|generic:diagnostic) echo 3600000 ;;
    slow_local_cli:smoke) echo 900000 ;;
    slow_local_cli:full-lite) echo 1800000 ;;
    slow_local_cli:full) echo 3600000 ;;
    slow_local_cli:diagnostic) echo 7200000 ;;
    heavy_mcp_agent:smoke) echo 1800000 ;;
    heavy_mcp_agent:full-lite) echo 3600000 ;;
    heavy_mcp_agent:full) echo 7200000 ;;
    heavy_mcp_agent:diagnostic) echo 7200000 ;;
    *) echo 1200000 ;;
  esac
}

class_default_cap_ms() {
  local runtime_class="$1"
  case "${runtime_class}" in
    fast_remote) echo 3600000 ;;
    standard_cli|generic) echo 7200000 ;;
    slow_local_cli) echo 21600000 ;;
    heavy_mcp_agent) echo 21600000 ;;
    *) echo 7200000 ;;
  esac
}

class_default_max_factor() {
  local runtime_class="$1"
  case "${runtime_class}" in
    fast_remote) echo 3 ;;
    standard_cli|generic) echo 4 ;;
    slow_local_cli) echo 6 ;;
    heavy_mcp_agent) echo 6 ;;
    *) echo 4 ;;
  esac
}

apply_class_runtime_defaults() {
  local runtime_class="$1"
  local class_cap
  local class_factor
  class_cap="$(class_default_cap_ms "${runtime_class}")"
  class_factor="$(class_default_max_factor "${runtime_class}")"

  : "${TIMEOUT_MS:=$(class_default_timeout_ms "${runtime_class}" "full")}"
  : "${TIMEOUT_AUTO_CAP_MS:=${class_cap}}"
  : "${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:=${class_factor}}"
  : "${SMOKE_TIMEOUT_MS:=$(class_default_timeout_ms "${runtime_class}" "smoke")}"
  : "${SMOKE_TIMEOUT_AUTO_CAP_MS:=${class_cap}}"
  : "${SMOKE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:=${class_factor}}"
  : "${FULL_LITE_TIMEOUT_MS:=$(class_default_timeout_ms "${runtime_class}" "full-lite")}"
  : "${FULL_LITE_TIMEOUT_AUTO_CAP_MS:=${class_cap}}"
  : "${FULL_LITE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:=${class_factor}}"
  : "${DIAGNOSTIC_TIMEOUT_MS:=$(class_default_timeout_ms "${runtime_class}" "diagnostic")}"
  : "${DIAGNOSTIC_TIMEOUT_AUTO_CAP_MS:=${class_cap}}"
  : "${DIAGNOSTIC_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:=${class_factor}}"
}

json_field() {
  local json="$1"
  local field="$2"
  if [[ -z "${json}" ]]; then
    printf '\n'
    return 0
  fi
  printf '%s' "${json}" | node -e '
const fs = require("fs");
const path = (process.argv[1] || "").split(".");
let value = JSON.parse(fs.readFileSync(0, "utf8"));
for (const key of path) {
  if (!key) continue;
  value = value?.[key];
}
if (value === undefined || value === null) process.stdout.write("");
else if (typeof value === "object") process.stdout.write(JSON.stringify(value));
else process.stdout.write(String(value));
' "${field}"
}

max_ms() {
  local max=0
  local value
  for value in "$@"; do
    if [[ -n "${value}" && "${value}" =~ ^[0-9]+$ && "${value}" -gt "${max}" ]]; then
      max="${value}"
    fi
  done
  printf '%s\n' "${max}"
}

runtime_plan_json() {
  local mode="$1"
  local cases="$2"
  local max_cases="$3"
  local timeout_profile="$4"
  local timeout_ms="$5"
  local timeout_cap_ms="$6"
  local timeout_lookback_runs="$7"
  local timeout_min_success="$8"
  local timeout_max_factor="$9"
  local retries="${10}"
  local concurrency="${11}"
  local sample_count="${12}"

  if [[ -z "${cases}" || ! -f "${cases}" ]]; then
    return 1
  fi

  node "${REPO_ROOT}/scripts/runtime-advisor.mjs" plan \
    --mode "${mode}" \
    --cases "${cases}" \
    --outDir "${OUT_DIR:-apps/runner/runs}" \
    --timeoutProfile "${timeout_profile}" \
    --timeoutMs "${timeout_ms}" \
    --timeoutAutoCapMs "${timeout_cap_ms}" \
    --timeoutAutoLookbackRuns "${timeout_lookback_runs}" \
    --timeoutAutoMinSuccessSamples "${timeout_min_success}" \
    --timeoutAutoMaxIncreaseFactor "${timeout_max_factor}" \
    --sampleCount "${sample_count}" \
    --retries "${retries}" \
    --concurrency "${concurrency}" \
    --runtimeClass "${AGENT_RUNTIME_CLASS}" \
    --diagnosticThresholdMs "${DIAGNOSTIC_RECOMMEND_RUNTIME_MS}" \
    --maxCases "${max_cases}"
}

print_plan_summary() {
  local json="$1"
  local estimated_minutes
  estimated_minutes="$(printf '%s' "${json}" | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));const ms=j.estimated_stage_runtime_upper_bound_ms||0;process.stdout.write(String(ms>0?Math.ceil(ms/60000):0));')"
  echo "  estimatedRequestTimeoutMs=$(json_field "${json}" "estimated_request_timeout_ms")"
  echo "  estimatedStageUpperBoundMinutes=${estimated_minutes}"
  echo "  recommendedMode=$(json_field "${json}" "recommended_mode")"
  echo "  confidence=$(json_field "${json}" "confidence")"
  local notes_json
  notes_json="$(json_field "${json}" "notes")"
  if [[ -n "${notes_json}" ]]; then
    printf '%s' "${notes_json}" | node -e 'const fs=require("fs");const notes=JSON.parse(fs.readFileSync(0,"utf8"));for(const note of (Array.isArray(notes)?notes.slice(0,3):[])) console.log(`  note=${note}`);'
  fi
}

base_url_port() {
  node -e 'const u=new URL(process.argv[1]);process.stdout.write(u.port || (u.protocol==="https:"?"443":"80"));' "${BASE_URL}"
}

build_adapter_command_preview() {
  local adapter_port="$1"
  local timeout_ms="$2"
  local timeout_cap_ms="$3"
  local request_timeout_ms="$4"
  local max_concurrency="${ADAPTER_MAX_CONCURRENCY:-${CONCURRENCY:-1}}"
  local workdir="${ADAPTER_CLI_AGENT_WORKDIR:-${REPO_ROOT}}"

  printf 'cd %q && PORT=%q CLI_AGENT_CMD=%q CLI_AGENT_ARGS=%q' \
    "${REPO_ROOT}" \
    "${adapter_port}" \
    "${ADAPTER_CLI_AGENT_CMD}" \
    "${ADAPTER_CLI_AGENT_ARGS:-[]}"
  if [[ -n "${ADAPTER_CLI_AGENT_WORKDIR:-}" ]]; then
    printf ' CLI_AGENT_WORKDIR=%q' "${workdir}"
  fi
  printf ' CLI_AGENT_TIMEOUT_MS=%q CLI_AGENT_TIMEOUT_CAP_MS=%q CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS=%q CLI_AGENT_MAX_CONCURRENCY=%q npm --workspace cli-agent-adapter run dev\n' \
    "${timeout_ms}" \
    "${timeout_cap_ms}" \
    "${request_timeout_ms}" \
    "${max_concurrency}"
}

fetch_adapter_health_json() {
  node "${REPO_ROOT}/scripts/check-adapter-health.mjs" --baseUrl "${BASE_URL}" --json 2>/dev/null
}

stop_adapter_on_port() {
  local adapter_port="$1"
  local pids=""
  pids="$(lsof -ti "tcp:${adapter_port}" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    kill ${pids} 2>/dev/null || true
    sleep 1
  fi
}

ensure_managed_adapter() {
  local adapter_port="$1"
  local timeout_ms="$2"
  local timeout_cap_ms="$3"
  local request_timeout_ms="$4"
  local adapter_log_dir="${REPO_ROOT}/.agent-qa/adapter-logs"
  local adapter_log="${adapter_log_dir}/${profile_id}-adapter.log"
  mkdir -p "${adapter_log_dir}"

  stop_adapter_on_port "${adapter_port}"
  echo "Managed adapter:"
  echo "  action=start_or_restart"
  echo "  port=${adapter_port}"
  echo "  timeoutMs=${timeout_ms}"
  echo "  timeoutCapMs=${timeout_cap_ms}"
  echo "  serverRequestTimeoutMs=${request_timeout_ms}"
  echo "  log=${adapter_log}"

  (
    export PORT="${adapter_port}"
    export CLI_AGENT_CMD="${ADAPTER_CLI_AGENT_CMD}"
    export CLI_AGENT_ARGS="${ADAPTER_CLI_AGENT_ARGS:-[]}"
    export CLI_AGENT_TIMEOUT_MS="${timeout_ms}"
    export CLI_AGENT_TIMEOUT_CAP_MS="${timeout_cap_ms}"
    export CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS="${request_timeout_ms}"
    export CLI_AGENT_MAX_CONCURRENCY="${ADAPTER_MAX_CONCURRENCY:-${CONCURRENCY:-1}}"
    if [[ -n "${ADAPTER_CLI_AGENT_WORKDIR:-}" ]]; then
      export CLI_AGENT_WORKDIR="${ADAPTER_CLI_AGENT_WORKDIR}"
    fi
    cd "${REPO_ROOT}"
    npm --workspace cli-agent-adapter run dev
  ) >"${adapter_log}" 2>&1 &

  local attempt=1
  local health_json=""
  while [[ "${attempt}" -le 20 ]]; do
    if health_json="$(fetch_adapter_health_json)"; then
      local current_timeout
      local current_server
      current_timeout="$(json_field "${health_json}" "runtime.timeout_ms")"
      current_server="$(json_field "${health_json}" "runtime.server_request_timeout_ms")"
      if [[ "${current_timeout}" =~ ^[0-9]+$ && "${current_timeout}" -ge "${timeout_ms}" ]] && \
         [[ "${current_server}" =~ ^[0-9]+$ && "${current_server}" -ge "${request_timeout_ms}" ]]; then
        echo "  status=ready"
        return 0
      fi
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  echo "ERROR: managed adapter did not become ready with the required envelope." >&2
  echo "See adapter log: ${adapter_log}" >&2
  tail -n 40 "${adapter_log}" >&2 || true
  return 1
}

PROFILE_ARG=""
PROFILE_FILE=""
RUN_FULL_LITE=0
RUN_FULL=0
RUN_DIAGNOSTIC=0
DRY_RUN=0

USER_SET_CAMPAIGN_SAMPLE_COUNT="${CAMPAIGN_SAMPLE_COUNT+x}"
USER_SET_STAGED_AUTO_PROMOTE_FULL="${STAGED_AUTO_PROMOTE_FULL+x}"
USER_SET_TIMEOUT_PROFILE="${TIMEOUT_PROFILE+x}"
USER_SET_TIMEOUT_MS="${TIMEOUT_MS+x}"
USER_SET_TIMEOUT_AUTO_CAP_MS="${TIMEOUT_AUTO_CAP_MS+x}"
USER_SET_TIMEOUT_AUTO_LOOKBACK_RUNS="${TIMEOUT_AUTO_LOOKBACK_RUNS+x}"
USER_SET_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES+x}"
USER_SET_TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${TIMEOUT_AUTO_MAX_INCREASE_FACTOR+x}"
USER_SET_RETRIES="${RETRIES+x}"
USER_SET_CONCURRENCY="${CONCURRENCY+x}"
USER_SET_PREFLIGHT_MODE="${PREFLIGHT_MODE+x}"
USER_SET_PREFLIGHT_TIMEOUT_MS="${PREFLIGHT_TIMEOUT_MS+x}"
USER_SET_FAIL_FAST_TRANSPORT_STREAK="${FAIL_FAST_TRANSPORT_STREAK+x}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      print_help
      exit 0
      ;;
    --list)
      list_profiles
      exit 0
      ;;
    --file)
      PROFILE_FILE="${2:-}"
      shift 2
      ;;
    --full)
      RUN_FULL=1
      shift
      ;;
    --full-lite)
      RUN_FULL_LITE=1
      shift
      ;;
    --diagnostic)
      RUN_DIAGNOSTIC=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      if [[ -z "${PROFILE_ARG}" ]]; then
        PROFILE_ARG="$1"
        shift
      else
        echo "Unexpected argument: $1" >&2
        print_help >&2
        exit 2
      fi
      ;;
  esac
done

if [[ -z "${PROFILE_FILE}" && -z "${PROFILE_ARG}" ]]; then
  print_help >&2
  exit 2
fi

if [[ -z "${PROFILE_FILE}" ]]; then
  if [[ "${PROFILE_ARG}" == *"/"* || "${PROFILE_ARG}" == *.env ]]; then
    PROFILE_FILE="${PROFILE_ARG}"
  else
    PROFILE_FILE="${PROFILES_DIR}/${PROFILE_ARG}.env"
  fi
fi

if [[ ! -f "${PROFILE_FILE}" ]]; then
  echo "Profile not found: ${PROFILE_FILE}" >&2
  echo "Use --list to see available profiles." >&2
  exit 2
fi

load_env_if_unset "${PROFILE_FILE}"
detect_runtime_class
apply_class_runtime_defaults "${AGENT_RUNTIME_CLASS}"

profile_id="$(basename "${PROFILE_FILE}" .env | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
profile_id="${profile_id#-}"
profile_id="${profile_id%-}"
timestamp="$(date +%Y%m%d_%H%M%S)"

: "${RUN_PREFIX:=${profile_id//-/_}_${timestamp}}"
: "${REPORT_PREFIX:=${profile_id}-${timestamp}}"
: "${CAMPAIGN_SAMPLE_COUNT:=1}"
: "${AGENT_RUNTIME_CLASS:=generic}"
: "${DIAGNOSTIC_RECOMMEND_RUNTIME_MS:=5400000}"

if [[ "${RUN_DIAGNOSTIC}" == "1" ]]; then
  if [[ -z "${USER_SET_STAGED_AUTO_PROMOTE_FULL}" ]]; then STAGED_AUTO_PROMOTE_FULL=1; fi
  if [[ -z "${USER_SET_CAMPAIGN_SAMPLE_COUNT}" ]]; then CAMPAIGN_SAMPLE_COUNT=1; fi
  if [[ -z "${USER_SET_TIMEOUT_PROFILE}" ]]; then TIMEOUT_PROFILE="${DIAGNOSTIC_TIMEOUT_PROFILE:-auto}"; fi
  if [[ -z "${USER_SET_TIMEOUT_MS}" ]]; then TIMEOUT_MS="${DIAGNOSTIC_TIMEOUT_MS:-300000}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_CAP_MS}" ]]; then TIMEOUT_AUTO_CAP_MS="${DIAGNOSTIC_TIMEOUT_AUTO_CAP_MS:-7200000}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_LOOKBACK_RUNS}" ]]; then TIMEOUT_AUTO_LOOKBACK_RUNS="${DIAGNOSTIC_TIMEOUT_AUTO_LOOKBACK_RUNS:-20}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" ]]; then TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${DIAGNOSTIC_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-1}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" ]]; then TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${DIAGNOSTIC_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-6}"; fi
  if [[ -z "${USER_SET_RETRIES}" ]]; then RETRIES="${DIAGNOSTIC_RETRIES:-0}"; fi
  if [[ -z "${USER_SET_CONCURRENCY}" ]]; then CONCURRENCY="${DIAGNOSTIC_CONCURRENCY:-1}"; fi
  if [[ -z "${USER_SET_PREFLIGHT_MODE}" ]]; then PREFLIGHT_MODE="${DIAGNOSTIC_PREFLIGHT_MODE:-off}"; fi
  if [[ -z "${USER_SET_PREFLIGHT_TIMEOUT_MS}" ]]; then PREFLIGHT_TIMEOUT_MS="${DIAGNOSTIC_PREFLIGHT_TIMEOUT_MS:-1900000}"; fi
  if [[ -z "${USER_SET_FAIL_FAST_TRANSPORT_STREAK}" ]]; then FAIL_FAST_TRANSPORT_STREAK="${DIAGNOSTIC_FAIL_FAST_TRANSPORT_STREAK:-0}"; fi
elif [[ "${RUN_FULL_LITE}" == "1" ]]; then
  if [[ -z "${USER_SET_STAGED_AUTO_PROMOTE_FULL}" ]]; then STAGED_AUTO_PROMOTE_FULL=1; fi
  if [[ -z "${USER_SET_CAMPAIGN_SAMPLE_COUNT}" ]]; then CAMPAIGN_SAMPLE_COUNT="${FULL_LITE_CAMPAIGN_SAMPLE_COUNT:-${CAMPAIGN_SAMPLE_COUNT:-1}}"; fi
  if [[ -z "${USER_SET_TIMEOUT_PROFILE}" ]]; then TIMEOUT_PROFILE="${FULL_LITE_TIMEOUT_PROFILE:-${TIMEOUT_PROFILE:-auto}}"; fi
  if [[ -z "${USER_SET_TIMEOUT_MS}" ]]; then TIMEOUT_MS="${FULL_LITE_TIMEOUT_MS:-${TIMEOUT_MS:-180000}}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_CAP_MS}" ]]; then TIMEOUT_AUTO_CAP_MS="${FULL_LITE_TIMEOUT_AUTO_CAP_MS:-${TIMEOUT_AUTO_CAP_MS:-3600000}}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_LOOKBACK_RUNS}" ]]; then TIMEOUT_AUTO_LOOKBACK_RUNS="${FULL_LITE_TIMEOUT_AUTO_LOOKBACK_RUNS:-${TIMEOUT_AUTO_LOOKBACK_RUNS:-20}}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" ]]; then TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${FULL_LITE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-1}}"; fi
  if [[ -z "${USER_SET_TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" ]]; then TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${FULL_LITE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-4}}"; fi
  if [[ -z "${USER_SET_RETRIES}" ]]; then RETRIES="${FULL_LITE_RETRIES:-${RETRIES:-0}}"; fi
  if [[ -z "${USER_SET_CONCURRENCY}" ]]; then CONCURRENCY="${FULL_LITE_CONCURRENCY:-${CONCURRENCY:-1}}"; fi
  if [[ -z "${USER_SET_PREFLIGHT_MODE}" ]]; then PREFLIGHT_MODE="${FULL_LITE_PREFLIGHT_MODE:-${PREFLIGHT_MODE:-off}}"; fi
  if [[ -z "${USER_SET_PREFLIGHT_TIMEOUT_MS}" ]]; then PREFLIGHT_TIMEOUT_MS="${FULL_LITE_PREFLIGHT_TIMEOUT_MS:-${PREFLIGHT_TIMEOUT_MS:-600000}}"; fi
  if [[ -z "${USER_SET_FAIL_FAST_TRANSPORT_STREAK}" ]]; then FAIL_FAST_TRANSPORT_STREAK="${FULL_LITE_FAIL_FAST_TRANSPORT_STREAK:-${FAIL_FAST_TRANSPORT_STREAK:-0}}"; fi
elif [[ "${RUN_FULL}" == "1" ]]; then
  : "${STAGED_AUTO_PROMOTE_FULL:=1}"
else
  : "${STAGED_AUTO_PROMOTE_FULL:=0}"
fi

MODE="quick"
if [[ "${RUN_DIAGNOSTIC}" == "1" ]]; then
  MODE="diagnostic"
elif [[ "${RUN_FULL_LITE}" == "1" ]]; then
  MODE="full-lite"
elif [[ "${RUN_FULL}" == "1" ]]; then
  MODE="full"
fi

export RUN_PREFIX REPORT_PREFIX CAMPAIGN_SAMPLE_COUNT STAGED_AUTO_PROMOTE_FULL AGENT_RUNTIME_CLASS AGENT_RUNTIME_CLASS_BASIS DIAGNOSTIC_RECOMMEND_RUNTIME_MS
export AGENT_PROFILE_NAME="${profile_id}"
export AGENT_RUN_MODE="${MODE}"

echo "Agent profile run:"
echo "  profile=${PROFILE_FILE}"
echo "  baseUrl=${BASE_URL:-unset}"
echo "  suite=${AGENT_SUITE:-unset}"
echo "  campaignProfile=${CAMPAIGN_PROFILE:-unset}"
echo "  mode=${MODE}"
echo "  detectedRuntimeClass=${AGENT_RUNTIME_CLASS}"
echo "  runtimeClassBasis=${AGENT_RUNTIME_CLASS_BASIS:-profile}"
echo "  sampleCount=${CAMPAIGN_SAMPLE_COUNT}"
echo "  autoPromoteFull=${STAGED_AUTO_PROMOTE_FULL}"
echo "  runPrefix=${RUN_PREFIX}"
echo "  reportPrefix=${REPORT_PREFIX}"

printf '%s\n' "${RUN_PREFIX}" > /tmp/aq_run_prefix
printf '%s\n' "${REPORT_PREFIX}" > /tmp/aq_report_prefix
echo "  prefixFiles=/tmp/aq_run_prefix,/tmp/aq_report_prefix"

cd "${REPO_ROOT}"

RUNTIME_PLAN_MODE="${MODE}"
RUNTIME_PLAN_CASES="${CASES:-}"
RUNTIME_PLAN_MAX_CASES=0
RUNTIME_PLAN_TIMEOUT_PROFILE="${TIMEOUT_PROFILE:-off}"
RUNTIME_PLAN_TIMEOUT_MS="${TIMEOUT_MS:-120000}"
RUNTIME_PLAN_TIMEOUT_AUTO_CAP_MS="${TIMEOUT_AUTO_CAP_MS:-3600000}"
RUNTIME_PLAN_TIMEOUT_AUTO_LOOKBACK_RUNS="${TIMEOUT_AUTO_LOOKBACK_RUNS:-12}"
RUNTIME_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-3}"
RUNTIME_PLAN_TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-3}"
RUNTIME_PLAN_RETRIES="${RETRIES:-0}"
RUNTIME_PLAN_CONCURRENCY="${CONCURRENCY:-1}"
if [[ -z "${RUNTIME_PLAN_CASES}" ]]; then
  case "${AGENT_SUITE:-cli}:${CAMPAIGN_PROFILE:-quality}" in
    cli:quality) RUNTIME_PLAN_CASES="cases/agents/cli-agent-quality.json" ;;
    cli:infra) RUNTIME_PLAN_CASES="cases/agents/cli-agent.json" ;;
    autonomous:quality) RUNTIME_PLAN_CASES="cases/agents/autonomous-cli-agent-quality.json" ;;
    autonomous:infra) RUNTIME_PLAN_CASES="cases/agents/autonomous-cli-agent.json" ;;
  esac
fi

if [[ "${MODE}" == "quick" ]]; then
  RUNTIME_PLAN_MODE="quick"
  RUNTIME_PLAN_MAX_CASES="${SMOKE_MAX_CASES:-4}"
  RUNTIME_PLAN_TIMEOUT_PROFILE="${SMOKE_TIMEOUT_PROFILE:-off}"
  RUNTIME_PLAN_TIMEOUT_MS="${SMOKE_TIMEOUT_MS:-30000}"
  RUNTIME_PLAN_TIMEOUT_AUTO_CAP_MS="${SMOKE_TIMEOUT_AUTO_CAP_MS:-${TIMEOUT_AUTO_CAP_MS:-3600000}}"
  RUNTIME_PLAN_TIMEOUT_AUTO_LOOKBACK_RUNS="${SMOKE_TIMEOUT_AUTO_LOOKBACK_RUNS:-${TIMEOUT_AUTO_LOOKBACK_RUNS:-12}}"
  RUNTIME_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-1}"
  RUNTIME_PLAN_TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${SMOKE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-3}}"
  RUNTIME_PLAN_RETRIES="${SMOKE_RETRIES:-0}"
  RUNTIME_PLAN_CONCURRENCY="${SMOKE_CONCURRENCY:-1}"
elif [[ "${MODE}" == "full-lite" ]]; then
  RUNTIME_PLAN_MODE="full-lite"
  RUNTIME_PLAN_CASES="${FULL_LITE_CASES:-${RUNTIME_PLAN_CASES}}"
  RUNTIME_PLAN_MAX_CASES="${FULL_LITE_MAX_CASES:-5}"
  RUNTIME_PLAN_TIMEOUT_AUTO_CAP_MS="${FULL_LITE_TIMEOUT_AUTO_CAP_MS:-${TIMEOUT_AUTO_CAP_MS:-3600000}}"
  RUNTIME_PLAN_TIMEOUT_AUTO_LOOKBACK_RUNS="${FULL_LITE_TIMEOUT_AUTO_LOOKBACK_RUNS:-${TIMEOUT_AUTO_LOOKBACK_RUNS:-12}}"
  RUNTIME_PLAN_TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${FULL_LITE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-3}}"
fi

SMOKE_PLAN_CASES="${SMOKE_CASES:-${RUNTIME_PLAN_CASES}}"
SMOKE_PLAN_MAX_CASES="${SMOKE_MAX_CASES:-4}"
SMOKE_PLAN_TIMEOUT_PROFILE="${SMOKE_TIMEOUT_PROFILE:-off}"
SMOKE_PLAN_TIMEOUT_MS="${SMOKE_TIMEOUT_MS:-30000}"
SMOKE_PLAN_TIMEOUT_AUTO_CAP_MS="${SMOKE_TIMEOUT_AUTO_CAP_MS:-${TIMEOUT_AUTO_CAP_MS:-3600000}}"
SMOKE_PLAN_TIMEOUT_AUTO_LOOKBACK_RUNS="${SMOKE_TIMEOUT_AUTO_LOOKBACK_RUNS:-${TIMEOUT_AUTO_LOOKBACK_RUNS:-12}}"
SMOKE_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-1}"
SMOKE_PLAN_TIMEOUT_AUTO_MAX_INCREASE_FACTOR="${SMOKE_TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-3}}"
SMOKE_PLAN_RETRIES="${SMOKE_RETRIES:-0}"
SMOKE_PLAN_CONCURRENCY="${SMOKE_CONCURRENCY:-1}"

TARGET_PLAN_JSON=""
SMOKE_PLAN_JSON=""
if [[ -n "${RUNTIME_PLAN_CASES}" && -f "${RUNTIME_PLAN_CASES}" ]]; then
  TARGET_PLAN_JSON="$(runtime_plan_json \
    "${RUNTIME_PLAN_MODE}" \
    "${RUNTIME_PLAN_CASES}" \
    "${RUNTIME_PLAN_MAX_CASES}" \
    "${RUNTIME_PLAN_TIMEOUT_PROFILE}" \
    "${RUNTIME_PLAN_TIMEOUT_MS}" \
    "${RUNTIME_PLAN_TIMEOUT_AUTO_CAP_MS}" \
    "${RUNTIME_PLAN_TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    "${RUNTIME_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
    "${RUNTIME_PLAN_TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
    "${RUNTIME_PLAN_RETRIES}" \
    "${RUNTIME_PLAN_CONCURRENCY}" \
    "${CAMPAIGN_SAMPLE_COUNT}")"
  echo "Operator runtime estimate:"
  print_plan_summary "${TARGET_PLAN_JSON}"
  echo "  configuredInitialTimeoutMs=${RUNTIME_PLAN_TIMEOUT_MS}"
  echo "  configuredHardCapMs=${RUNTIME_PLAN_TIMEOUT_AUTO_CAP_MS}"
fi

if [[ "${MODE}" != "quick" && -n "${SMOKE_PLAN_CASES}" && -f "${SMOKE_PLAN_CASES}" ]]; then
  SMOKE_PLAN_JSON="$(runtime_plan_json \
    "quick" \
    "${SMOKE_PLAN_CASES}" \
    "${SMOKE_PLAN_MAX_CASES}" \
    "${SMOKE_PLAN_TIMEOUT_PROFILE}" \
    "${SMOKE_PLAN_TIMEOUT_MS}" \
    "${SMOKE_PLAN_TIMEOUT_AUTO_CAP_MS}" \
    "${SMOKE_PLAN_TIMEOUT_AUTO_LOOKBACK_RUNS}" \
    "${SMOKE_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
    "${SMOKE_PLAN_TIMEOUT_AUTO_MAX_INCREASE_FACTOR}" \
    "${SMOKE_PLAN_RETRIES}" \
    "${SMOKE_PLAN_CONCURRENCY}" \
    "${SMOKE_CAMPAIGN_SAMPLE_COUNT:-1}")"
elif [[ "${MODE}" == "quick" ]]; then
  SMOKE_PLAN_JSON="${TARGET_PLAN_JSON}"
fi

REQUIRED_ADAPTER_TIMEOUT_MS="$(max_ms \
  "$(json_field "${SMOKE_PLAN_JSON}" "estimated_request_timeout_ms")" \
  "$(json_field "${TARGET_PLAN_JSON}" "estimated_request_timeout_ms")" \
  "${CALIBRATION_TIMEOUT_MS:-0}")"
REQUIRED_ADAPTER_TIMEOUT_CAP_MS="$(max_ms \
  "${REQUIRED_ADAPTER_TIMEOUT_MS}" \
  "${SMOKE_PLAN_TIMEOUT_AUTO_CAP_MS}" \
  "${RUNTIME_PLAN_TIMEOUT_AUTO_CAP_MS}" \
  "${DIAGNOSTIC_TIMEOUT_AUTO_CAP_MS:-0}")"
ADAPTER_SERVER_TIMEOUT_BUFFER_MS="${ADAPTER_SERVER_TIMEOUT_BUFFER_MS:-120000}"
REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS="$(( REQUIRED_ADAPTER_TIMEOUT_MS + ADAPTER_SERVER_TIMEOUT_BUFFER_MS ))"
ADAPTER_PORT="$(base_url_port)"

echo "Adapter envelope requirement:"
echo "  timeoutMs=${REQUIRED_ADAPTER_TIMEOUT_MS}"
echo "  timeoutCapMs=${REQUIRED_ADAPTER_TIMEOUT_CAP_MS}"
echo "  serverRequestTimeoutMs=${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}"

if [[ "${ADAPTER_MANAGED:-0}" == "1" ]]; then
  if [[ -z "${ADAPTER_CLI_AGENT_CMD:-}" ]]; then
    echo "ERROR: ADAPTER_MANAGED=1 but ADAPTER_CLI_AGENT_CMD is not configured in ${PROFILE_FILE}" >&2
    exit 2
  fi
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "Managed adapter preview:"
    build_adapter_command_preview "${ADAPTER_PORT}" "${REQUIRED_ADAPTER_TIMEOUT_MS}" "${REQUIRED_ADAPTER_TIMEOUT_CAP_MS}" "${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}"
    echo "Dry run complete."
    exit 0
  fi
  ensure_managed_adapter "${ADAPTER_PORT}" "${REQUIRED_ADAPTER_TIMEOUT_MS}" "${REQUIRED_ADAPTER_TIMEOUT_CAP_MS}" "${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}"
else
  ADAPTER_HEALTH_JSON=""
  if ADAPTER_HEALTH_JSON="$(fetch_adapter_health_json)"; then
    CURRENT_ADAPTER_TIMEOUT_MS="$(json_field "${ADAPTER_HEALTH_JSON}" "runtime.timeout_ms")"
    CURRENT_ADAPTER_SERVER_REQUEST_TIMEOUT_MS="$(json_field "${ADAPTER_HEALTH_JSON}" "runtime.server_request_timeout_ms")"
    if [[ "${DRY_RUN}" == "1" ]]; then
      echo "Current adapter runtime:"
      echo "  timeoutMs=${CURRENT_ADAPTER_TIMEOUT_MS:-unknown}"
      echo "  serverRequestTimeoutMs=${CURRENT_ADAPTER_SERVER_REQUEST_TIMEOUT_MS:-unknown}"
      if [[ -n "${ADAPTER_CLI_AGENT_CMD:-}" ]]; then
        echo "Suggested restart command:"
        build_adapter_command_preview "${ADAPTER_PORT}" "${REQUIRED_ADAPTER_TIMEOUT_MS}" "${REQUIRED_ADAPTER_TIMEOUT_CAP_MS}" "${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}"
      fi
      echo "Dry run complete."
      exit 0
    fi
    if [[ "${CURRENT_ADAPTER_TIMEOUT_MS:-0}" =~ ^[0-9]+$ && "${CURRENT_ADAPTER_SERVER_REQUEST_TIMEOUT_MS:-0}" =~ ^[0-9]+$ ]] && \
       [[ "${CURRENT_ADAPTER_TIMEOUT_MS}" -lt "${REQUIRED_ADAPTER_TIMEOUT_MS}" || "${CURRENT_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}" -lt "${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}" ]]; then
      echo "ERROR: adapter runtime envelope is too small for this run." >&2
      echo "  currentTimeoutMs=${CURRENT_ADAPTER_TIMEOUT_MS}" >&2
      echo "  currentServerRequestTimeoutMs=${CURRENT_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}" >&2
      echo "  requiredTimeoutMs=${REQUIRED_ADAPTER_TIMEOUT_MS}" >&2
      echo "  requiredServerRequestTimeoutMs=${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}" >&2
      if [[ -n "${ADAPTER_CLI_AGENT_CMD:-}" ]]; then
        echo "Restart adapter with:" >&2
        build_adapter_command_preview "${ADAPTER_PORT}" "${REQUIRED_ADAPTER_TIMEOUT_MS}" "${REQUIRED_ADAPTER_TIMEOUT_CAP_MS}" "${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}" >&2
      fi
      exit 2
    fi
  elif [[ "${DRY_RUN}" == "1" ]]; then
    echo "Current adapter runtime: unavailable"
    if [[ -n "${ADAPTER_CLI_AGENT_CMD:-}" ]]; then
      echo "Suggested start command:"
      build_adapter_command_preview "${ADAPTER_PORT}" "${REQUIRED_ADAPTER_TIMEOUT_MS}" "${REQUIRED_ADAPTER_TIMEOUT_CAP_MS}" "${REQUIRED_ADAPTER_SERVER_REQUEST_TIMEOUT_MS}"
    fi
    echo "Dry run complete."
    exit 0
  fi
fi

./scripts/run-local-campaign.sh
