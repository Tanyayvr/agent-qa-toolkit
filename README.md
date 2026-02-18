# Agent QA Toolkit — Portable Evidence Packs for AI Agents

A self‑hosted toolkit that turns agent runs into **portable evidence packs**
(HTML report + machine‑readable JSON for CI gating). Designed for offline handoff and audit‑ready artifacts.

## What you get
- baseline vs new regression diff
- CI gate recommendation (`none | require_approval | block`)
- self‑contained report bundle (no data egress)

## Demo bundle
Download and open the example pack:
- `examples/demo-bundle.zip` → extract and open `report.html`

## Evidence pack format (draft)
We are collecting feedback on the evidence pack **format** (field set + structure).
This is **not** a standard yet. If you have missing fields or a competing format, please open an issue.

- Schema: `schemas/compare-report-v5.schema.json`
- Agent contract: `docs/agent-integration-contract.md`

## Pilot support (first 5 teams)
We offer **self‑run** pilot support to 5 teams.
- Apply: https://github.com/Tanyayvr/agent-qa-toolkit/issues/new?template=pilot_request.yml
- Waitlist: https://github.com/Tanyayvr/agent-qa-toolkit/issues/new?template=pilot_waitlist.yml

Pilot deliverable (what you get): `docs/pilot.md`

## Data handling
Data stays local unless you export it.

