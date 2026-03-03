# 2026-03-03 Production Hardening Plan (Research-Log Alignment)

## Goal

Close the gap between current shipped capabilities and the next production-hardening layer
highlighted by external agent research logs.

Scope is OSS in this repository.

## Workstream A: Deterministic eval for objective tasks

### Tasks
- add objective-eval comparators for task classes where exactness is expected:
  - set similarity
  - sequence alignment
  - optional layout/pixel checks for visual/document outputs
- connect comparator outputs to per-case gate logic and replay diff rendering

### DoD
- comparator modules and tests are merged
- at least one quality suite uses deterministic comparator assertions
- comparator signals appear in `compare-report.json` and `report.html`
- no regression in existing evaluator test suite

## Workstream B: Stronger planning gate before mutations

### Tasks
- require a machine-readable pre-execution plan envelope for mutating operations
- validate `declared_end_state` and constraints against outbound mutation payloads
- enforce gate escalation:
  - mismatch -> `require_approval`
  - high-risk mismatch -> `block`

### DoD
- plan envelope schema is documented and validated
- evaluator emits deterministic planning-gate signals
- CI gate behavior is covered by unit tests
- replay report shows planning mismatch evidence

## Workstream C: REPL policy hardening

### Tasks
- add explicit allowlist policy for REPL commands/tools
- add IO/time/size limits and forbidden path/syscall checks
- persist policy decisions and violations in artifacts for auditability

### DoD
- policy config is documented for self-hosted operators
- violations are surfaced in scanner/risk signals and gate recommendation
- unit tests cover allow/deny and limit enforcement branches
- no hidden fallback to unrestricted REPL execution

## Release criteria

- all workstreams have passing tests and are included in `npm run quality:gate`
- update `docs/CHRONOLOGY.md` with metric deltas for each shipped workstream
- add at least one reproducible report artifact for each workstream outcome

