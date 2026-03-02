# Comparison Rationale

This document explains the comparison table in README.

## Agent QA Toolkit vs LangSmith/Langfuse
- **Evidence Pack**: we output a portable, offline report directory with a manifest and sha256 checks. These platforms emphasize hosted trace views; exports are not the primary unit of handoff.
- **CI gate decision**: we provide a per‑case `gate_recommendation` designed for CI gating. Hosted platforms expose rich telemetry but not a single canonical gate field.
- **Offline artifact**: our packs are self‑contained and designed for air‑gapped environments; hosted dashboards are not.

## Agent QA Toolkit vs Galileo (positioning)
- **Galileo strength**: enterprise evaluation + observability + runtime guardrails in one platform (SaaS/VPC/on-prem).
- **Our strength**: portable, offline Evidence Pack as the handoff unit for CI/release/compliance (`report.html`, `compare-report.json`, `manifest.json`).
- **Deterministic release gate**: per-case gate fields designed for CI policy checks and artifact-based incident review.
- **No dashboard dependency**: artifact-first workflow for air-gapped or vendor-neutral environments.

## Coexistence pattern (recommended)
- Use Galileo for runtime tracing/monitoring/guardrails.
- Use Agent QA Toolkit as release-quality evidence layer in CI (baseline/new + portable bundle).
- Attach bundle artifacts to PRs/tickets/incidents so external teams can review without dashboard access.

## Agent QA Toolkit vs Custom Scripts
- Scripts can reproduce parts of the pipeline, but typically lack:
  - standardized contract (`compare-report.json`)
  - portability checks (href rules, manifest integrity)
  - report UI (report.html + case diffs)
  - security scanning pipeline

This is a practical comparison, not a claim of exclusivity.
