#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

print_help() {
  cat <<'EOF'
Usage:
  npm run quickstart -- --baseUrl <url> [--systemType <type>] [--profile <name>] [--dry-run]

Options:
  --baseUrl <url>       Running adapter URL (required)
  --systemType <type>   fraud | credit | insurance | healthcare | hr | support | general
                        Default: general
  --profile <name>      User-facing quickstart profile name
                        Default: <systemType>
  --dry-run             Show planned paths and commands without executing
  --help                Show this help

Examples:
  npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud
  npm run quickstart -- --baseUrl http://localhost:8787 --systemType support --profile my-agent
EOF
}

relative_to_repo() {
  node -e 'const path=require("path");process.stdout.write(path.relative(process.argv[1], process.argv[2]).split(path.sep).join("/"));' \
    "${REPO_ROOT}" "$1"
}

sanitize_slug() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9._-]/-/g; s/-\{2,\}/-/g; s/^[.-]*//; s/[.-]*$//'
}

find_latest_dir() {
  local search_root="$1"
  local pattern="$2"
  if [[ ! -d "${search_root}" ]]; then
    return 0
  fi

  find "${search_root}" -mindepth 1 -maxdepth 1 -type d -name "${pattern}" -print 2>/dev/null \
    | while IFS= read -r dir; do
        stat -f '%m %N' "${dir}" 2>/dev/null || stat -c '%Y %n' "${dir}" 2>/dev/null || true
      done \
    | sort -nr \
    | head -n 1 \
    | cut -d' ' -f2-
}

BASE_URL=""
SYSTEM_TYPE="general"
PROFILE_NAME=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      print_help
      exit 0
      ;;
    --baseUrl)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --systemType)
      SYSTEM_TYPE="${2:-}"
      shift 2
      ;;
    --profile)
      PROFILE_NAME="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_help >&2
      exit 2
      ;;
  esac
done

if [[ -z "${BASE_URL}" ]]; then
  echo "--baseUrl is required" >&2
  print_help >&2
  exit 2
fi

case "${SYSTEM_TYPE}" in
  fraud|credit|insurance|healthcare|hr|support|general) ;;
  *)
    echo "Unsupported --systemType: ${SYSTEM_TYPE}" >&2
    exit 2
    ;;
esac

if [[ -z "${PROFILE_NAME}" ]]; then
  PROFILE_NAME="${SYSTEM_TYPE}"
fi

PROFILE_SLUG="$(sanitize_slug "${PROFILE_NAME}")"
if [[ -z "${PROFILE_SLUG}" ]]; then
  echo "Profile name resolves to an empty slug: ${PROFILE_NAME}" >&2
  exit 2
fi

QUICKSTART_ID="quickstart-${PROFILE_SLUG}"
WORKSPACE_ROOT="${QUICKSTART_ROOT:-${REPO_ROOT}/.agent-qa/quickstart}"
WORKSPACE_DIR="${WORKSPACE_ROOT}/${PROFILE_SLUG}"
WORKSPACE_DIR_REL="$(relative_to_repo "${WORKSPACE_DIR}")"
CASES_TEMPLATE="${REPO_ROOT}/cases/starter/${SYSTEM_TYPE}.json"
CASES_PATH="${WORKSPACE_DIR}/cases.json"
CASES_PATH_REL="$(relative_to_repo "${CASES_PATH}")"
ENV_PATH="${WORKSPACE_DIR}/${QUICKSTART_ID}.env"
ENV_PATH_REL="$(relative_to_repo "${ENV_PATH}")"
REPORTS_DIR="${WORKSPACE_DIR}/reports"
REPORTS_DIR_REL="$(relative_to_repo "${REPORTS_DIR}")"
RUNS_DIR="${WORKSPACE_DIR}/runs"
RUNS_DIR_REL="$(relative_to_repo "${RUNS_DIR}")"

if [[ ! -f "${CASES_TEMPLATE}" ]]; then
  echo "Missing starter cases template: ${CASES_TEMPLATE}" >&2
  exit 2
fi

echo "Quickstart plan:"
echo "  baseUrl=${BASE_URL}"
echo "  systemType=${SYSTEM_TYPE}"
echo "  profile=${PROFILE_SLUG}"
echo "  quickstartId=${QUICKSTART_ID}"
echo "  workspace=${WORKSPACE_DIR_REL}"
echo "  starterCases=${CASES_PATH_REL}"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run only. No health check, files, or campaign execution were performed."
  echo "Planned command:"
  echo "  bash scripts/run-agent-profile.sh --file ${ENV_PATH_REL}"
  exit 0
fi

HEALTH_JSON="$(node "${REPO_ROOT}/scripts/check-adapter-health.mjs" --baseUrl "${BASE_URL}" --json)"
HEALTH_STATUS="$(printf '%s' "${HEALTH_JSON}" | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(String(j.status ?? ""));')"
echo "✓ Health check passed (status=${HEALTH_STATUS:-unknown})"

mkdir -p "${WORKSPACE_DIR}"
cp "${CASES_TEMPLATE}" "${CASES_PATH}"
echo "✓ Starter cases copied: ${CASES_PATH_REL}"

cat > "${ENV_PATH}" <<EOF
BASE_URL=${BASE_URL}
CASES=${CASES_PATH_REL}
SMOKE_CASES=${CASES_PATH_REL}
AGENT_ID=quickstart-${PROFILE_SLUG}
AGENT_VERSION=starter-proof
AGENT_MODEL=unknown
MODEL_VERSION=starter-unknown
PROMPT_VERSION=starter-unknown
TOOLS_VERSION=starter-unknown
CONFIG_HASH=quickstart-${PROFILE_SLUG}
AGENT_SUITE=cli
CAMPAIGN_PROFILE=quality
STAGED_MODE=1
STAGED_AUTO_PROMOTE_FULL=0
ADAPTER_MANAGED=0
AGENT_PROVIDER_LOCATION=unknown
AGENT_USES_MCP=0
AGENT_MULTI_PROCESS=0
AGENT_INTERACTIVE=0
AGENT_RUNTIME_CLASS=generic
TIMEOUT_PROFILE=off
SMOKE_TIMEOUT_PROFILE=off
TIMEOUT_MS=60000
SMOKE_TIMEOUT_MS=30000
PREFLIGHT_MODE=off
SMOKE_PREFLIGHT_MODE=off
CALIBRATION_MODE=off
OUT_DIR=${RUNS_DIR_REL}
REPORTS_DIR=${REPORTS_DIR_REL}
SMOKE_ENFORCE_CASE_QUALITY=0
CAMPAIGN_SAMPLE_COUNT=1
SMOKE_CAMPAIGN_SAMPLE_COUNT=1
LIBRARY_INGEST=0
VERIFY_OTEL_PROOF=0
VERIFY_RUNTIME_HANDOFF=0
EVAL_FAIL_ON_EXECUTION_DEGRADED=0
ADAPTER_TIMEOUT_BUFFER_MS=5000
ADAPTER_SERVER_TIMEOUT_BUFFER_MS=5000
EOF
echo "✓ Quickstart profile written: ${ENV_PATH_REL}"

set +e
bash "${REPO_ROOT}/scripts/run-agent-profile.sh" --file "${ENV_PATH}"
CAMPAIGN_STATUS=$?
set -e

LATEST_REPORT_DIR="$(find_latest_dir "${REPORTS_DIR}" "${QUICKSTART_ID}-*-smoke")"
REPORT_HTML=""
COMPARE_JSON=""
if [[ -n "${LATEST_REPORT_DIR}" ]]; then
  REPORT_HTML="${LATEST_REPORT_DIR}/report.html"
  COMPARE_JSON="${LATEST_REPORT_DIR}/compare-report.json"
fi

if [[ "${CAMPAIGN_STATUS}" -ne 0 ]]; then
  echo "Quickstart starter campaign failed." >&2
  if [[ -n "${LATEST_REPORT_DIR}" ]]; then
    echo "Partial report dir: $(relative_to_repo "${LATEST_REPORT_DIR}")" >&2
  fi
  exit "${CAMPAIGN_STATUS}"
fi

if [[ -z "${LATEST_REPORT_DIR}" || ! -f "${COMPARE_JSON}" ]]; then
  echo "Quickstart completed without a detectable compare-report.json under ${REPORTS_DIR_REL}" >&2
  exit 1
fi

LATEST_BASELINE_DIR="$(find_latest_dir "${RUNS_DIR}/baseline" "*_smoke_base")"
LATEST_NEW_DIR="$(find_latest_dir "${RUNS_DIR}/new" "*_smoke_base")"

if [[ -z "${LATEST_BASELINE_DIR}" || -z "${LATEST_NEW_DIR}" ]]; then
  echo "Quickstart completed without a detectable baseline/new smoke run under ${RUNS_DIR_REL}" >&2
  exit 1
fi

PACKAGE_STATUS=0
set +e
node "${REPO_ROOT}/scripts/agent-evidence-package.mjs" \
  --cases "${CASES_PATH}" \
  --baselineDir "${LATEST_BASELINE_DIR}" \
  --newDir "${LATEST_NEW_DIR}" \
  --outDir "${LATEST_REPORT_DIR}" \
  --reportId "$(basename "${LATEST_REPORT_DIR}")" \
  --sign-if-key-present \
  --no-trend
PACKAGE_STATUS=$?
set -e

if [[ "${PACKAGE_STATUS}" -ne 0 ]]; then
  echo "Quickstart packaging failed after the starter campaign." >&2
  echo "Smoke report dir: $(relative_to_repo "${LATEST_REPORT_DIR}")" >&2
  exit "${PACKAGE_STATUS}"
fi

REPORT_HTML_REL="$(relative_to_repo "${REPORT_HTML}")"
COMPARE_JSON_REL="$(relative_to_repo "${COMPARE_JSON}")"

cat <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  First Proof Pack — ${PROFILE_SLUG}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Report:   ${REPORT_HTML_REL}
  Compare:  ${COMPARE_JSON_REL}
  Workspace: ${WORKSPACE_DIR_REL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠ This is a starter evidence pack.
    It proves the toolkit pipeline works with your agent.
    It is NOT a full qualification or compliance assessment.
    Version/provenance fields are starter placeholders until you provide real identity metadata.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Next steps:
  1. Open report.html in your browser
  2. Review the artifact structure
  3. Start a real intake path: npm run intake:init -- --profile <name>
  4. Build real cases:        npm run intake:scaffold:cases -- --profile <name>
  5. See the full guide:      docs/quickstart-your-agent.md
EOF
