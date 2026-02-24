<!-- /docs/architecture.md -->
# Architecture (Self‑Hosted)

## Core pipeline

1) **Runner** executes cases against `/run-case` and writes artifacts to `apps/runner/runs/*`.
2) **Evaluator** compares baseline vs new, produces HTML + JSON report under `apps/evaluator/reports/*`.
3) **Evidence pack** is the report directory (manifest + assets + report.html + compare-report.json).

## Drift / flakiness scenarios

Runner and evaluator support additional scenarios for production drift:

- **Token usage tracking**: agent may return `token_usage` (input/output/total tokens, tool call count, `loop_detected`, `loop_details`).
  Runner persists this per run and aggregates per-case in `flakiness.json` when `--runs > 1`.
- **Flakiness detection (`--runs N`)**: runner executes each case N times and writes `flakiness.json`
  with `baseline_pass_rate` / `new_pass_rate` and optional token usage aggregates.
- **Prompt version tracing**: runner captures Git context (`git_commit`, `git_branch`, `git_dirty`)
  and writes it into `run.json` and `flakiness.json`.
- **Overnight drift CI**: GitHub workflow `agent-drift-detection.yml` runs nightly or on-demand,
  evaluates drift, and gates on `cases_block_recommended` / `cases_requiring_approval`.

## Security scanners

Evaluator runs a layered scanner set (6 total):

- **Entropy scanner** (optional flag) — token exfiltration patterns + high-entropy strings
- **PII/secret scanner** — emails, phones, SSN/CC, passport, INN, secret-like fields
- **Prompt injection scanner** — prompt injection markers + context poisoning
- **Action risk scanner** — high‑risk tool calls, permission changes, unsafe code execution
- **Exfiltration scanner** — untrusted URLs, outbound requests, data exfiltration
- **Output quality scanner** — model refusals, hallucination signals, bias/compliance placeholders

## Validator modes & conformance

`pvip-verify` supports layered modes:

- **AEPF (format-only)** — schema + required fields
- **PVIP (default)** — portability, manifest integrity, href checks
- **Strict** — signature + zero violations

Golden packs live in `conformance/` with `expected.json` per pack.

## Optional adapters (external)

Adapters for specific stacks (LangChain, OpenAI Responses, OTel anchors) are maintained separately from the core repo.  
They are not required for the core pipeline to function.


## Environment metadata

Evaluator reads `--environment <json>` and preserves the full object in `compare-report.json.environment`.
Use this for:

- model/version/temperature
- deployment context (git SHA, config hash)
- OTel anchors (trace_id / span_id)
