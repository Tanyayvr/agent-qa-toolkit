#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

print_help() {
  cat <<'EOF'
Usage:
  npm run compliance:eu-ai-act:starter -- --baseUrl <url> [--systemType <type>] [--profile <name>] [--draftJson <path>] [--dry-run]

Options:
  --baseUrl <url>       Running adapter URL (required)
  --systemType <type>   fraud | credit | insurance | healthcare | hr | support | general
                        Default: general
  --profile <name>      User-facing starter profile name
                        Default: <systemType>
  --draftJson <path>    Builder draft JSON to copy into the starter package as a user-authored supplement
  --dry-run             Show planned paths and commands without executing
  --help                Show this help

Examples:
  npm run compliance:eu-ai-act:starter -- --baseUrl http://localhost:8787 --systemType fraud
  npm run compliance:eu-ai-act:starter -- --baseUrl http://localhost:8787 --systemType support --profile my-agent
  npm run compliance:eu-ai-act:starter -- --baseUrl http://localhost:8787 --systemType fraud --draftJson ./eu-ai-act-legal-draft.json
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
DRAFT_JSON=""
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
    --draftJson)
      DRAFT_JSON="${2:-}"
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

if [[ -n "${DRAFT_JSON}" ]]; then
  if [[ "${DRAFT_JSON}" = /* ]]; then
    DRAFT_JSON_ABS="${DRAFT_JSON}"
  else
    DRAFT_JSON_ABS="$(cd "$(pwd)" && pwd)/${DRAFT_JSON}"
  fi
  if [[ ! -f "${DRAFT_JSON_ABS}" ]]; then
    echo "Missing --draftJson file: ${DRAFT_JSON}" >&2
    exit 2
  fi
else
  DRAFT_JSON_ABS=""
fi

PROFILE_SLUG="$(sanitize_slug "${PROFILE_NAME}")"
if [[ -z "${PROFILE_SLUG}" ]]; then
  echo "Profile name resolves to an empty slug: ${PROFILE_NAME}" >&2
  exit 2
fi

STARTER_ID="eu-ai-act-starter-${PROFILE_SLUG}"
WORKSPACE_ROOT="${EU_AI_STARTER_ROOT:-${REPO_ROOT}/.agent-qa/eu-ai-act-starter}"
WORKSPACE_DIR="${WORKSPACE_ROOT}/${PROFILE_SLUG}"
WORKSPACE_DIR_REL="$(relative_to_repo "${WORKSPACE_DIR}")"
CASES_TEMPLATE="${REPO_ROOT}/cases/starter/${SYSTEM_TYPE}.json"
CASES_PATH="${WORKSPACE_DIR}/cases.json"
CASES_PATH_REL="$(relative_to_repo "${CASES_PATH}")"
ENV_PATH="${WORKSPACE_DIR}/${STARTER_ID}.env"
ENV_PATH_REL="$(relative_to_repo "${ENV_PATH}")"
REPORTS_DIR="${WORKSPACE_DIR}/reports"
REPORTS_DIR_REL="$(relative_to_repo "${REPORTS_DIR}")"
RUNS_DIR="${WORKSPACE_DIR}/runs"
RUNS_DIR_REL="$(relative_to_repo "${RUNS_DIR}")"

if [[ ! -f "${CASES_TEMPLATE}" ]]; then
  echo "Missing starter cases template: ${CASES_TEMPLATE}" >&2
  exit 2
fi

echo "EU starter plan:"
echo "  baseUrl=${BASE_URL}"
echo "  systemType=${SYSTEM_TYPE}"
echo "  profile=${PROFILE_SLUG}"
echo "  starterId=${STARTER_ID}"
echo "  workspace=${WORKSPACE_DIR_REL}"
echo "  starterCases=${CASES_PATH_REL}"
if [[ -n "${DRAFT_JSON_ABS}" ]]; then
  echo "  builderDraft=${DRAFT_JSON}"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run only. No health check, files, or packaging were performed."
  echo "Planned commands:"
  echo "  bash scripts/run-agent-profile.sh --file ${ENV_PATH_REL}"
  echo "  node scripts/eu-ai-act-package.mjs --contract minimum --cases ${CASES_PATH_REL} --baselineDir <latest-smoke-baseline> --newDir <latest-smoke-new> --outDir ${REPORTS_DIR_REL}/<starter-report-id> --reportId <starter-report-id> --sign-if-key-present --no-trend"
  if [[ -n "${DRAFT_JSON_ABS}" ]]; then
    echo "  copy ${DRAFT_JSON} -> ${REPORTS_DIR_REL}/<starter-report-id>/supplemental/builder-draft.json"
  fi
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
AGENT_ID=eu-ai-act-starter-${PROFILE_SLUG}
AGENT_VERSION=eu-starter-proof
AGENT_MODEL=unknown
MODEL_VERSION=starter-unknown
PROMPT_VERSION=starter-unknown
TOOLS_VERSION=starter-unknown
CONFIG_HASH=eu-ai-act-starter-${PROFILE_SLUG}
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
echo "✓ EU starter profile written: ${ENV_PATH_REL}"

set +e
bash "${REPO_ROOT}/scripts/run-agent-profile.sh" --file "${ENV_PATH}"
CAMPAIGN_STATUS=$?
set -e

LATEST_SMOKE_REPORT_DIR="$(find_latest_dir "${REPORTS_DIR}" "${STARTER_ID}-*-smoke")"
LATEST_BASELINE_DIR="$(find_latest_dir "${RUNS_DIR}/baseline" "*_smoke_base")"
LATEST_NEW_DIR="$(find_latest_dir "${RUNS_DIR}/new" "*_smoke_base")"

if [[ "${CAMPAIGN_STATUS}" -ne 0 ]]; then
  echo "EU starter smoke campaign failed." >&2
  if [[ -n "${LATEST_SMOKE_REPORT_DIR}" ]]; then
    echo "Partial smoke report dir: $(relative_to_repo "${LATEST_SMOKE_REPORT_DIR}")" >&2
  fi
  exit "${CAMPAIGN_STATUS}"
fi

if [[ -z "${LATEST_BASELINE_DIR}" || -z "${LATEST_NEW_DIR}" ]]; then
  echo "EU starter completed without a detectable baseline/new smoke run under ${RUNS_DIR_REL}" >&2
  exit 1
fi

STARTER_TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
STARTER_REPORT_ID="${STARTER_ID}-${STARTER_TIMESTAMP}"
STARTER_REPORT_DIR="${REPORTS_DIR}/${STARTER_REPORT_ID}"

set +e
node "${REPO_ROOT}/scripts/eu-ai-act-package.mjs" \
  --contract minimum \
  --cases "${CASES_PATH}" \
  --baselineDir "${LATEST_BASELINE_DIR}" \
  --newDir "${LATEST_NEW_DIR}" \
  --outDir "${STARTER_REPORT_DIR}" \
  --reportId "${STARTER_REPORT_ID}" \
  --sign-if-key-present \
  --no-trend
PACKAGE_STATUS=$?
set -e

if [[ "${PACKAGE_STATUS}" -ne 0 ]]; then
  echo "EU starter packaging failed after the smoke run." >&2
  echo "Smoke report dir: $(relative_to_repo "${LATEST_SMOKE_REPORT_DIR}")" >&2
  exit "${PACKAGE_STATUS}"
fi

STARTER_REPORT_DIR_REL="$(relative_to_repo "${STARTER_REPORT_DIR}")"
REPORT_HTML_REL="$(relative_to_repo "${STARTER_REPORT_DIR}/report.html")"
COMPARE_JSON_REL="$(relative_to_repo "${STARTER_REPORT_DIR}/compare-report.json")"
ANNEX_IV_REL="$(relative_to_repo "${STARTER_REPORT_DIR}/compliance/eu-ai-act-annex-iv.json")"
ARTICLE_16_REL="$(relative_to_repo "${STARTER_REPORT_DIR}/compliance/article-16-provider-obligations.json")"
BUILDER_DRAFT_REL=""

if [[ -n "${DRAFT_JSON_ABS}" ]]; then
  SUPPLEMENTAL_DIR="${STARTER_REPORT_DIR}/supplemental"
  mkdir -p "${SUPPLEMENTAL_DIR}"
  cp "${DRAFT_JSON_ABS}" "${SUPPLEMENTAL_DIR}/builder-draft.json"
  cat > "${SUPPLEMENTAL_DIR}/builder-draft-note.json" <<EOF
{
  "artifact_type": "eu_ai_act_builder_draft_attachment",
  "attached_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source_path": "${DRAFT_JSON}",
  "copied_to": "supplemental/builder-draft.json",
  "note": "This file is the user-authored Builder draft copied into the same report directory as the runtime starter artifacts. It is not generated from the runtime run and is not merged automatically into the runtime-generated compliance outputs."
}
EOF
  BUILDER_DRAFT_REL="$(relative_to_repo "${STARTER_REPORT_DIR}/supplemental/builder-draft.json")"
fi

cat <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  First EU Starter Package — ${PROFILE_SLUG}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Report:    ${REPORT_HTML_REL}
  Compare:   ${COMPARE_JSON_REL}
  Annex IV:  ${ANNEX_IV_REL}
  Art. 16:   ${ARTICLE_16_REL}
$(if [[ -n "${BUILDER_DRAFT_REL}" ]]; then printf '  Draft:     %s\n' "${BUILDER_DRAFT_REL}"; fi)
  Workspace: ${WORKSPACE_DIR_REL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  This is a lightweight EU starter package on your own agent.
  It is not the final provider-side package.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
