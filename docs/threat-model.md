# Threat Model (Self-Hosted Agent QA Toolkit)

## Scope

This model covers the toolkit pipeline components:
- `runner` (case execution + artifact capture)
- `evaluator` (comparison, scoring, report generation)
- local adapters (`/run-case`, `/handoff`)
- artifact storage (`apps/runner/runs`, `apps/evaluator/reports`, `.agent-qa/`)

Out of scope:
- your model provider and external tools called by your agent
- host OS hardening and network perimeter policy
- IAM policy design for your own infra

## Security Objectives

1. Prevent accidental sensitive-data leakage into shared artifacts.
2. Preserve artifact integrity so evidence cannot be silently altered.
3. Avoid false confidence from transport/runtime failures.
4. Keep release decisions deterministic and auditable.

## Assets

- Case inputs (`input.user`, `input.context`)
- Agent outputs/events/tool traces
- Security scan findings
- CI gate outcomes (`gate_recommendation`)
- Report bundle files (`report.html`, `compare-report.json`, `manifest.json`)
- Trend database (`.agent-qa/trend.sqlite`)

## Trust Boundaries

1. **Runner <-> Adapter boundary**  
   Untrusted network payloads from `/run-case` and `/handoff`.
2. **Adapter <-> Agent process boundary**  
   External process execution and timeouts.
3. **Artifact boundary**  
   Files can be copied/shared outside original host.
4. **CI boundary**  
   Pipeline consumes machine JSON and makes gate decisions.

## Threats and Mitigations

### T1. Sensitive data written to disk before masking
- Risk: prompts/tool outputs may contain PII/secrets.
- Mitigations:
  - runner redaction presets (`--redactionPreset`)
  - optional scanner layers in evaluator
  - raw artifact retention disabled by default (`--keepRaw` off)
- Residual risk:
  - unknown secret formats not covered by rules/scanners.

### T2. Artifact tampering after generation
- Risk: modified report files undermine audit trust.
- Mitigations:
  - `manifest.json` with sha256 per file
  - strict verification/proof scripts before sharing
  - optional manifest signing for signer identity workflows
- Residual risk:
  - compromised host can alter both artifact and key material.

### T3. Runtime transport failures mislabeled as model regressions
- Risk: bad operational decisions and false model blame.
- Mitigations:
  - execution-quality summary (transport success/weak-expected rate)
  - explicit `model_quality_inconclusive` state
  - preflight/fail-fast controls in runner
- Residual risk:
  - severe infra instability can still reduce usable sample count.

### T4. Prompt injection / unsafe tool behavior in outputs
- Risk: unsafe actions accepted by downstream systems.
- Mitigations:
  - evaluator security scanners (prompt injection, action risk, exfiltration, etc.)
  - gate recommendations (`none | require_approval | block`)
  - support for assertion-driven policies
- Residual risk:
  - detector bypasses and domain-specific unsafe patterns not in rules.

### T5. Long-running jobs fail in ambiguous ways
- Risk: partial artifacts, unclear failure source, repeated retries.
- Mitigations:
  - timeout profile (including auto tuning)
  - inactivity watchdog + heartbeat
  - structured runner failure artifacts (`runner_failure`)
  - graceful interruption handling with finalized `run.json`
- Residual risk:
  - extremely slow or unstable external agents may still fail frequently.

### T6. Unauthorized use of adapter endpoints
- Risk: untrusted clients invoke `/run-case` or `/handoff`.
- Mitigations:
  - optional adapter token auth (`CLI_AGENT_AUTH_TOKEN`)
  - local/network segmentation recommended for production
- Residual risk:
  - weak network policy around local services.

## Recommended Production Baseline

1. Enable redaction (`--redactionPreset internal_only` or stricter).
2. Keep `--keepRaw` disabled unless incident policy requires raw retention.
3. Enforce quality gates in CI (`--failOnExecutionDegraded` where relevant).
4. Verify artifact manifests before external sharing.
5. Use adapter auth token in non-local environments.
6. Configure timeout/preflight/fail-fast for your runtime profile.

## Verification Evidence

- `compare-report.json`:
  - `summary.execution_quality`
  - `items[].gate_recommendation`
  - scanner summaries
- `manifest.json`:
  - file checksums
- proof scripts:
  - `proof:otel`
  - `proof:runtime-handoff`

## Known Residual Risks

- No absolute prevention of all prompt-injection variants.
- No guarantee against malicious host/admin compromise.
- Scanner quality depends on local rules and workload-specific tuning.
