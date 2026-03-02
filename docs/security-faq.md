# Security FAQ (Self-Hosted)

See also:
- `docs/threat-model.md`
- `docs/architecture.md`
- `docs/agent-integration-contract.md`

## 1. What is the security model of this toolkit?
The toolkit is local-first and self-hosted:
- runner/evaluator execute on your infrastructure
- artifacts are written to local disk
- no required SaaS control plane

Security boundaries are documented in `docs/threat-model.md` (assets, trust boundaries, attack paths, and mitigations).

## 2. Does the toolkit send data to external services?
Not by default.

External traffic can still happen through your own agent/adapter implementation.
The toolkit itself does not require outbound telemetry for core operation.

## 3. How should we protect the adapter endpoint?
For production, do not run an open `/run-case` endpoint.

Recommended baseline:
- set `CLI_AGENT_AUTH_TOKEN`
- optionally set `CLI_AGENT_AUTH_HEADER`
- restrict network access to CI/internal subnets
- run behind your reverse proxy/WAF policies

## 4. How do we minimize sensitive-data leakage in artifacts?
Use a layered approach:
- runner redaction preset: `--redactionPreset internal_only|transferable|transferable_extended`
- keep raw dumps disabled (`--keepRaw` off) unless explicitly required
- enforce evaluator checks with `--strictRedaction`
- review `artifacts/redaction-summary.json` in each report

## 5. Are security signals complete and deterministic?
No. Signals are best-effort detectors, not formal proof of absence.

Implication:
- empty signals != guaranteed safe output
- use scanners as defense-in-depth, plus business controls and human review

## 6. Which scanners are built in?
Evaluator runs six scanner families (plus optional entropy):
- PII/secret
- prompt injection
- action risk
- exfiltration
- output quality
- entropy scanner (`--entropyScanner`)

## 7. How do we harden for regulated workloads?
Suggested profile:
- `--strictPortability`
- `--strictRedaction`
- `--failOnExecutionDegraded`
- adapter auth token enabled
- artifact retention policy (`--retentionDays`)
- CI gate on `compare-report.json` plus manifest verification

## 8. How is integrity of artifacts verified?
Each evidence pack includes `manifest.json` with checksums.

Use verification in CI/review before sharing:
- verify paths are portable
- verify required assets exist
- verify checksums match

## 9. What does `--strictPortability` protect against?
It blocks reports with portability violations:
- absolute paths
- parent traversal patterns
- broken internal href references

This reduces risk of non-portable or unsafe bundle references.

## 10. What does `--failOnExecutionDegraded` protect against?
It prevents false confidence when transport/runtime is unhealthy.

If execution quality is degraded, evaluator exits non-zero.
This separates runtime failure from model-quality claims.

## 11. Is token usage security-sensitive?
Potentially yes.

Token metadata can expose workload patterns or prompt volume characteristics.
Treat token trend artifacts as internal operational telemetry unless policy allows wider sharing.

## 12. How should we handle raw artifacts for forensics?
Raw artifacts are useful for incident response, but higher risk.

Recommended:
- enable only for bounded investigations
- keep retention short
- store under restricted access controls
- re-disable after incident closure

## 13. How do we model residual risk?
Use both:
- threat model scenarios (`docs/threat-model.md`)
- release-level admissibility metrics in `summary.execution_quality.admissibility_kpi`

This gives a quantitative view of risk reduction plus qualitative attack-path coverage.

## 14. What is the minimum production checklist?
Before production rollout:
- adapter authentication configured
- redaction preset chosen and validated
- strict gates enabled in CI
- retention policy configured
- integrity verification in pipeline
- network boundaries documented
- ownership for incident response assigned

## 15. What is out of scope for this toolkit?
This toolkit does not replace:
- IAM/PAM controls
- endpoint hardening of your host runtime
- secrets management platform
- legal/privacy governance process
- model provider trust assessment

It is a QA and evidence layer, not a full security platform.
