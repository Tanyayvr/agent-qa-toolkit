#!/usr/bin/env bash
set -euo pipefail

# Post-run evidence workflow:
# - evaluator reports (base/new2/new3)
# - optional execution-quality gate check (new3 vs base)
# - trend html
# - deliverables folder + zip + summary note

CASES="${CASES:-cases/agents/autonomous-cli-agent.json}"
OUT_DIR="${OUT_DIR:-apps/runner/runs}"
REPORTS_DIR="${REPORTS_DIR:-apps/evaluator/reports}"
RUN_BASE="${RUN_BASE:-auto_prod_auto_base}"
RUN_NEW2="${RUN_NEW2:-auto_prod_auto_new2}"
RUN_NEW3="${RUN_NEW3:-auto_prod_auto_new3}"
REPORT_PREFIX="${REPORT_PREFIX:-auto-prod-auto}"
PROJECT_KEY="${PROJECT_KEY:-autonomous-cli-agent}"
TREND_LAST="${TREND_LAST:-20}"

report_dir() {
  local report_id="$1"
  echo "${REPORTS_DIR}/${report_id}"
}

run_eval() {
  local report_id="$1"
  local new_run="$2"
  npm --workspace evaluator run dev -- \
    --cases "${CASES}" \
    --baselineDir "${OUT_DIR}/baseline/${RUN_BASE}" \
    --newDir "${OUT_DIR}/new/${new_run}" \
    --outDir "$(report_dir "${report_id}")" \
    --reportId "${report_id}"
}

echo "Evaluating: ${RUN_BASE} vs ${RUN_BASE}/${RUN_NEW2}/${RUN_NEW3}"
run_eval "${REPORT_PREFIX}" "${RUN_BASE}"
run_eval "${REPORT_PREFIX}-2" "${RUN_NEW2}"
run_eval "${REPORT_PREFIX}-3" "${RUN_NEW3}"

echo "Running execution-quality gate on ${REPORT_PREFIX}-3"
GATE_EXIT_CODE=0
set +e
npm --workspace evaluator run dev -- \
  --cases "${CASES}" \
  --baselineDir "${OUT_DIR}/baseline/${RUN_BASE}" \
  --newDir "${OUT_DIR}/new/${RUN_NEW3}" \
  --outDir "$(report_dir "${REPORT_PREFIX}-gated")" \
  --reportId "${REPORT_PREFIX}-gated" \
  --failOnExecutionDegraded
GATE_EXIT_CODE=$?
set -e

echo "Building trend HTML"
npm run trend -- html --last "${TREND_LAST}" --out "$(report_dir "${REPORT_PREFIX}")"

PROJECT_DIR="${REPORTS_DIR}/agent-projects/${PROJECT_KEY}"
DELIVERABLES_DIR="${PROJECT_DIR}/deliverables"
ZIP_PATH="${PROJECT_DIR}/${REPORT_PREFIX}-deliverables.zip"

mkdir -p "${DELIVERABLES_DIR}"

cp "$(report_dir "${REPORT_PREFIX}")/report.html" "${DELIVERABLES_DIR}/report.html"
cp "$(report_dir "${REPORT_PREFIX}")/compare-report.json" "${DELIVERABLES_DIR}/compare-report.json"
cp "$(report_dir "${REPORT_PREFIX}")/trend.html" "${DELIVERABLES_DIR}/trend.html"
if [[ -f "$(report_dir "${REPORT_PREFIX}")/manifest.json" ]]; then
  cp "$(report_dir "${REPORT_PREFIX}")/manifest.json" "${DELIVERABLES_DIR}/manifest.json"
fi

node -e "
const fs=require('fs');
const comparePath='${REPORTS_DIR}/${REPORT_PREFIX}/compare-report.json';
const outPath='${PROJECT_DIR}/summary.md';
const gateExit=${GATE_EXIT_CODE};
const j=JSON.parse(fs.readFileSync(comparePath,'utf8'));
const eq=(j.summary&&j.summary.execution_quality)||{};
const dc=(j.summary&&j.summary.data_coverage)||{};
const lines=[
  '# Agent Evidence Summary',
  '',
  '- project: ${PROJECT_KEY}',
  '- report_id: ${REPORT_PREFIX}',
  '- run_base: ${RUN_BASE}',
  '- run_new2: ${RUN_NEW2}',
  '- run_new3: ${RUN_NEW3}',
  '- gate_exit_code: '+gateExit,
  '',
  '## Execution Quality',
  '- status: '+String(eq.status||'n/a'),
  '- baseline_transport_success_rate: '+String(eq.baseline_transport_success_rate??'n/a'),
  '- new_transport_success_rate: '+String(eq.new_transport_success_rate??'n/a'),
  '- weak_expected_rate: '+String(eq.weak_expected_rate??'n/a'),
  '- model_quality_inconclusive: '+String(eq.model_quality_inconclusive??'n/a'),
  '',
  '## Data Coverage',
  '- total_cases: '+String(dc.total_cases??'n/a'),
  '- missing_new_artifacts: '+String(dc.missing_new_artifacts??'n/a'),
  '- broken_new_artifacts: '+String(dc.broken_new_artifacts??'n/a'),
  '',
  '## Artifacts',
  '- report.html',
  '- compare-report.json',
  '- trend.html',
  fs.existsSync('${DELIVERABLES_DIR}/manifest.json') ? '- manifest.json' : '- manifest.json (not present)',
].join('\n');
fs.writeFileSync(outPath, lines);
"

(
  cd "${DELIVERABLES_DIR}"
  zip -r "${ZIP_PATH}" . >/dev/null
)

echo "Done"
echo "Report: $(report_dir "${REPORT_PREFIX}")/report.html"
echo "Compare: $(report_dir "${REPORT_PREFIX}")/compare-report.json"
echo "Trend: $(report_dir "${REPORT_PREFIX}")/trend.html"
echo "Summary: ${PROJECT_DIR}/summary.md"
echo "Zip: ${ZIP_PATH}"
echo "Gate exit code: ${GATE_EXIT_CODE}"

