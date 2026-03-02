# Agent Validation + Hardening Plan (After 3 External Agents)

Date: 2026-02-27
Scope: `/Users/tatanapanfilova/Documents/Project/tool`

## Goal

Finish validation on 3 real external agents, then immediately harden the product on verified gaps so customers can reliably detect agent failures (not only regressions).

## Phase A: Finish 3-Agent Validation

1. Run profile for each agent:
- `--timeoutMs 210000 --retries 0 --concurrency 1`
- 3 runs per agent: `base`, `new2`, `new3`

2. Mandatory artifacts per agent:
- `report.html`
- `compare-report.json`
- `trend.html`
- `manifest.json`
- `deliverables.zip`

3. Incident capture per run:
- Transport failures (`runner_failure`)
- Model/tool errors
- Infra failures (port/process/env/proxy/timeouts)

4. Exit criteria for Phase A:
- 3 agents completed with full artifact sets
- each agent has a short summary with observed failures and root causes

## Phase B: Immediate Product Hardening (Verified Gaps)

## P0 (must-do first)

1. Execution-quality gating (avoid false confidence):
- Add explicit summary metrics for `runner_failure_rate` and `transport_success_rate`.
- Add evaluator gate: do not mark run healthy if transport success is below threshold.
- Add assertion-quality gate: fail/flag when too many cases have weak/empty expectations.

2. Atomic report writes:
- Write JSON/HTML to temp files and `rename` on success.
- Prevent partially written/corrupted reports on crash/interruption.

3. Graceful shutdown:
- Handle `SIGINT`/`SIGTERM` in runner/evaluator.
- Persist partial progress safely and exit with deterministic status.

## P1 (next)

1. Structured logging:
- JSON logs with `runId`, `caseId`, `attempt`, `durationMs`, `errorKind`.
- Keep current human-readable summary, but add machine-ingestable log stream.

2. Runtime predictability:
- Keep worst-case runtime estimate and add profile presets (`smoke`, `prod`, `soak`).
- Print actionable warning when configuration implies multi-hour runs.

3. Adapter reliability:
- Keep child-process abort/cleanup guarantees.
- Add health payload fields needed for operations (`active_cli_processes`, queue/backpressure hint).

## P2 (scale/UX)

1. Memory/streaming improvements in evaluator for large case sets.
2. HTML report scalability (pagination/lazy sections for large runs).

## Test/Quality Gates for Hardening

1. Add/expand tests for:
- transport gate and assertion-quality gate behavior
- atomic write and crash-safety path
- signal handling and graceful stop
- structured logging schema

2. CI checks:
- `npm test`
- workspace typecheck
- one smoke run against a live external agent adapter

## Definition of Done

1. On bad transport runs, report clearly shows execution failure (not "all green").
2. Interrupted evaluator leaves no corrupted primary artifacts.
3. Operator can diagnose failures from structured logs without opening raw JSON manually.
4. 3 external-agent validations are reproducible with same profiles and comparable trend output.
