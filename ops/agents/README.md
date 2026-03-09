# Agent Profiles

These `.env` files define per-agent campaign settings for `scripts/run-local-campaign.sh`.

Usage:

```bash
./scripts/run-agent-profile.sh goose-ollama
./scripts/run-agent-profile.sh --full goose-ollama
./scripts/run-agent-profile.sh --diagnostic goose-ollama
./scripts/run-agent-profile.sh gooseteam-ollama
./scripts/run-agent-profile.sh autonomous-cli
```

Override any variable inline when needed:

```bash
TIMEOUT_MS=180000 RETRIES=0 ./scripts/run-agent-profile.sh goose-ollama
```

Notes:
- `RUN_PREFIX` and `REPORT_PREFIX` are auto-generated with timestamp unless you set them.
- The launcher writes current prefixes to `/tmp/aq_run_prefix` and `/tmp/aq_report_prefix`.
- Ensure the agent adapter is already running and `BASE_URL/health` returns `200`.
- For slow local Goose/Ollama profiles, preflight is set to `off` by default to avoid strict timeout-contract mismatch at smoke stage.
- Slow local profiles can auto-run a one-case `calibration` stage before `smoke` when timeout history is missing.
- Launcher default is `quick` mode: stop after successful smoke. Use `--full` to continue automatically into full quality campaign.
- Use `--diagnostic` when a known slow agent is healthy but the normal full envelope is too small.
- Treat green `quick` as `ready_for_full`; it is not the final quality verdict.
- The launcher prints a pre-run estimate (`estimatedStageUpperBoundMinutes`, `recommendedMode`, `confidence`) before execution starts.
- Check adapter liveness before a run:
  `npm run campaign:agent:health -- --baseUrl http://127.0.0.1:8788`
- Print a compact post-run summary:
  `npm run campaign:agent:status`
  or `npm run campaign:agent:status -- --reportPrefix <reportPrefix>`
- For failed/full runs, check `next-envelope.json`; it carries the recommended next mode and timeout envelope.
