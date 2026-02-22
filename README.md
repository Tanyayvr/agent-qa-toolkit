# Agent QA Toolkit — Portable Evidence Packs for AI Agents

A self‑hosted toolkit that turns agent runs into portable evidence packs
(HTML report + machine‑readable JSON for CI gating). Designed for offline handoff
and review‑ready artifacts.

Run your agent on a case suite → get `report.html` + `compare-report.json` you can attach to an issue/ticket or gate in CI.

## What you get
- Baseline vs new regression diff
- Per‑case CI gate decision: `none | require_approval | block`
- Offline report bundle (data stays local unless you export it)
- Optional drift detection: `--runs N` flakiness summary + nightly CI workflow
- Optional loop detection: similarity breaker + output hash tracking (reported in `token_usage.loop_details`)

## Demo bundle
Open an example pack: `examples/demo-bundle.zip` → extract → open `report.html`.
(Includes `report.html`, `compare-report.json`, plus referenced assets and manifest.)

## Evidence pack format (draft)
We’re collecting feedback on the evidence pack format (field set + structure).
This is **not** a standard yet. If you’re missing fields or already use a different format,
please open an issue.

- Schema: `schemas/compare-report-v5.schema.json`
- Agent contract: `docs/agent-integration-contract.md`

## Pilot support (first 5 teams)
We offer **self‑run** pilot support to 5 teams.
- Apply (issue template): https://github.com/Tanyayvr/agent-qa-toolkit/issues/new?template=pilot_request.yml
- Waitlist (issue template): https://github.com/Tanyayvr/agent-qa-toolkit/issues/new?template=pilot_waitlist.yml

Pilot deliverable: `docs/pilot.md`

## Data handling
Data stays local unless you export it.

## Paid plugins

The paid version includes adapter plugins for common agent stacks:

- **LangChain adapter** — wrap any LangChain `Runnable` as a `/run-case` handler
- **OpenAI Responses adapter** — wrap `client.responses.create(...)` as a `/run-case` handler
- **OTel anchor** — attach `trace_id` / `span_id` to report `environment` for tracing backend correlation

Contact us for access or see the pilot form above.
