# Comparison Rationale

This document explains the comparison table in README.

## Agent QA Toolkit vs LangSmith/Langfuse
- **Evidence Pack**: we output a portable, offline report directory with a manifest and sha256 checks. These platforms emphasize hosted trace views; exports are not the primary unit of handoff.
- **CI gate decision**: we provide a per‑case `gate_recommendation` designed for CI gating. Hosted platforms expose rich telemetry but not a single canonical gate field.
- **Offline artifact**: our packs are self‑contained and designed for air‑gapped environments; hosted dashboards are not.

## Agent QA Toolkit vs Custom Scripts
- Scripts can reproduce parts of the pipeline, but typically lack:
  - standardized contract (`compare-report.json`)
  - portability checks (href rules, manifest integrity)
  - report UI (report.html + case diffs)
  - security scanning pipeline

This is a practical comparison, not a claim of exclusivity.
