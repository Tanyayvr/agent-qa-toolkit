export const HELP_TEXT = `
Usage:
  evaluator --cases <path> --baselineDir <dir> --newDir <dir> [--outDir <dir>] [--reportId <id>]

Required:
  --cases        Path to cases JSON (e.g. cases/cases.json)
  --baselineDir  Baseline run directory (e.g. apps/runner/runs/baseline/latest)
  --newDir       New run directory (e.g. apps/runner/runs/new/latest)

Optional:
  --outDir          Output directory for reports (default: apps/evaluator/reports/<reportId>)
  --reportId        Report id (default: random UUID)
  --transferClass   Transfer classification: internal_only (default) or transferable
  --strictPortability  Fail if portability violations are detected
  --strictRedaction    Fail if redaction is applied but sensitive markers remain
  --failOnExecutionDegraded  Exit non-zero when execution quality is degraded
  --entropyScanner     Enable local entropy-based token scanner (optional)
  --warnBodyBytes      Warn when case response JSON exceeds this size (default: 1000000)
  --maxCaseBytes       Max bytes for a single case JSON payload (default: 10000000)
  --maxMetaBytes       Max bytes for run/config JSON files (default: 2000000)
  --retentionDays      Delete report directories older than N days (default: 0 = disabled)
  --environment     JSON file with environment metadata (agent_id, model, prompt_version, tools_version)
  --complianceProfile  JSON file with compliance mapping
  --trend-db        SQLite path for historical trending (default: .agent-qa/trend.sqlite)
  --no-trend        Disable historical trending ingest
  --help, -h        Show this help
`.trim();

