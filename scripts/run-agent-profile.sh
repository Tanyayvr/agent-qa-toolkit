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
  ./scripts/run-agent-profile.sh --file <path/to/profile.env>
  ./scripts/run-agent-profile.sh --list

Examples:
  ./scripts/run-agent-profile.sh goose-ollama
  ./scripts/run-agent-profile.sh --full-lite goose-ollama
  ./scripts/run-agent-profile.sh --full goose-ollama
  ./scripts/run-agent-profile.sh --diagnostic goose-ollama
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

PROFILE_ARG=""
PROFILE_FILE=""
RUN_FULL_LITE=0
RUN_FULL=0
RUN_DIAGNOSTIC=0

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

export RUN_PREFIX REPORT_PREFIX CAMPAIGN_SAMPLE_COUNT STAGED_AUTO_PROMOTE_FULL AGENT_RUNTIME_CLASS DIAGNOSTIC_RECOMMEND_RUNTIME_MS
export AGENT_PROFILE_NAME="${profile_id}"
export AGENT_RUN_MODE="${MODE}"

echo "Agent profile run:"
echo "  profile=${PROFILE_FILE}"
echo "  baseUrl=${BASE_URL:-unset}"
echo "  suite=${AGENT_SUITE:-unset}"
echo "  campaignProfile=${CAMPAIGN_PROFILE:-unset}"
echo "  mode=${MODE}"
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
RUNTIME_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-3}"
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
  RUNTIME_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES="${SMOKE_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES:-1}"
  RUNTIME_PLAN_RETRIES="${SMOKE_RETRIES:-0}"
  RUNTIME_PLAN_CONCURRENCY="${SMOKE_CONCURRENCY:-1}"
elif [[ "${MODE}" == "full-lite" ]]; then
  RUNTIME_PLAN_MODE="full-lite"
  RUNTIME_PLAN_CASES="${FULL_LITE_CASES:-${RUNTIME_PLAN_CASES}}"
  RUNTIME_PLAN_MAX_CASES="${FULL_LITE_MAX_CASES:-5}"
fi

if [[ -n "${RUNTIME_PLAN_CASES}" && -f "${RUNTIME_PLAN_CASES}" ]]; then
  echo "Operator runtime estimate:"
  node scripts/runtime-advisor.mjs plan \
    --mode "${RUNTIME_PLAN_MODE}" \
    --cases "${RUNTIME_PLAN_CASES}" \
    --outDir "${OUT_DIR:-apps/runner/runs}" \
    --timeoutProfile "${RUNTIME_PLAN_TIMEOUT_PROFILE}" \
    --timeoutMs "${RUNTIME_PLAN_TIMEOUT_MS}" \
    --timeoutAutoCapMs "${TIMEOUT_AUTO_CAP_MS:-3600000}" \
    --timeoutAutoLookbackRuns "${TIMEOUT_AUTO_LOOKBACK_RUNS:-12}" \
    --timeoutAutoMinSuccessSamples "${RUNTIME_PLAN_TIMEOUT_AUTO_MIN_SUCCESS_SAMPLES}" \
    --timeoutAutoMaxIncreaseFactor "${TIMEOUT_AUTO_MAX_INCREASE_FACTOR:-3}" \
    --sampleCount "${CAMPAIGN_SAMPLE_COUNT}" \
    --retries "${RUNTIME_PLAN_RETRIES}" \
    --concurrency "${RUNTIME_PLAN_CONCURRENCY}" \
    --runtimeClass "${AGENT_RUNTIME_CLASS}" \
    --diagnosticThresholdMs "${DIAGNOSTIC_RECOMMEND_RUNTIME_MS}" \
    --maxCases "${RUNTIME_PLAN_MAX_CASES}" \
    | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));const min=Math.ceil((j.estimated_stage_runtime_upper_bound_ms||0)/60000);console.log(`  estimatedRequestTimeoutMs=${j.estimated_request_timeout_ms}`);console.log(`  estimatedStageUpperBoundMinutes=${min}`);console.log(`  recommendedMode=${j.recommended_mode}`);console.log(`  confidence=${j.confidence}`);if(Array.isArray(j.notes)){for(const note of j.notes.slice(0,3)) console.log(`  note=${note}`);}';
fi

./scripts/run-local-campaign.sh
