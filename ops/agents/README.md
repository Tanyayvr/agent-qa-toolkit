# Agent Profiles

These `.env` files define per-agent campaign settings for `scripts/run-local-campaign.sh`.

Usage:

```bash
npm run campaign:agent:init -- --profile claude --cliCmd claude --cliArg --print --cliArg --json
./scripts/run-agent-profile.sh --dry-run goose-ollama
./scripts/run-agent-profile.sh goose-ollama
./scripts/run-agent-profile.sh --full-lite goose-ollama
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
- Use `campaign:agent:init` for first-time setup of a new external agent profile. It writes `ops/agents/<name>.env` from template, auto-detects runtime class from topology hints, and seeds first-run budgets from runtime policy defaults.
- `RUN_PREFIX` and `REPORT_PREFIX` are auto-generated with timestamp unless you set them.
- The launcher writes current prefixes to `/tmp/aq_run_prefix` and `/tmp/aq_report_prefix`.
- If a profile sets `ADAPTER_MANAGED=1`, the launcher restarts `cli-agent-adapter` automatically with a timeout envelope aligned to the selected mode. Do not hand-tune adapter timeouts separately.
- If a profile sets `MCP_MANAGED=1`, the launcher also restarts the MCP service with a larger timeout envelope so the full chain stays ordered: `runner < adapter < MCP`.
- If timeout history is missing, the launcher treats the run as `first-run` and seeds it from runtime-class defaults for the selected mode. Set topology hints (`AGENT_PROVIDER_LOCATION`, `AGENT_USES_MCP`, `AGENT_MULTI_PROCESS`, `AGENT_INTERACTIVE`) so that unknown agents are classified conservatively on day one.
- After a successful run exists, timeout learning becomes `learned-run` and uses only that profile/mode/case-set history.
- External dependencies outside `cli-agent-adapter` only need to be running when they are not managed by the profile. For managed MCP profiles, the launcher verifies MCP health and runtime envelope before the run starts.
- For slow local Goose/Ollama profiles, preflight is set to `off` by default to avoid strict timeout-contract mismatch at smoke stage.
- Slow local profiles can auto-run a one-case `calibration` stage before `smoke` when timeout history is missing.
- Launcher default is `quick` mode: stop after successful smoke. Use `--full-lite`, `--full`, or `--diagnostic` to continue into a heavier path.
- Use `--full-lite` for the reduced quality subset path between quick and full.
- Use `--diagnostic` when a known slow agent is healthy but the normal full envelope is too small.
- Every profile should set `AGENT_RUNTIME_CLASS` explicitly:
  - `fast_remote`
  - `standard_cli`
  - `slow_local_cli`
  - `heavy_mcp_agent`
- Do not assume every local agent should default to local `full`; slow/heavy agents should usually start with `quick` and often use `full-lite` as the normal developer loop.
- Treat green `quick` as `ready_for_full`; it is not the final quality verdict.
- Treat green `full-lite` as "practical local regression path exists"; it is still not the same as a release-grade `full` verdict.
- The launcher prints a pre-run estimate (`estimatedStageUpperBoundMinutes`, `recommendedMode`, `confidence`) before execution starts.
- The launcher also prints the required adapter envelope (`timeoutMs`, `timeoutCapMs`, `serverRequestTimeoutMs`) before execution starts.
- Managed MCP profiles print the required MCP envelope (`timeoutMs`, `serverRequestTimeoutMs`, `headersTimeoutMs`, `keepAliveTimeoutMs`) before execution starts.
- Use `npm run campaign:agent:dry-run -- <profile>` to inspect both the first-run campaign budget and the managed-adapter envelope before you commit to a long run.
- Use `--dry-run` to inspect the resolved campaign + adapter envelope before committing to a long run.
- Check adapter liveness before a run:
  `npm run campaign:agent:health -- --baseUrl http://127.0.0.1:8788`
- Print a compact post-run summary:
  `npm run campaign:agent:status`
  or `npm run campaign:agent:status -- --reportPrefix <reportPrefix>`
- For failed/full runs, check `next-envelope.json`; it carries the recommended next mode and timeout envelope.
