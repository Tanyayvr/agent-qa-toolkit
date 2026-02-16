# Compliance Mapping (Optional)

This toolkit can optionally emit a compliance mapping block in `compare-report.json`.
It is intended for enterprise reporting (ISO 42001 / NIST AI RMF).

## Load from file (recommended)

Evaluator CLI:

```bash
npm --workspace evaluator run dev -- --complianceProfile docs/compliance-profile.example.json
```

Example profiles:

- `docs/compliance-profile-iso42001.json`
- `docs/compliance-profile-nist-ai-rmf.json`
- `docs/compliance-profile-eu-ai-act.json`

## compare-report.json (optional)

```json
"compliance_mapping": [
  {
    "framework": "ISO_42001",
    "clause": "9.2",
    "title": "Monitoring, measurement, analysis",
    "evidence": ["summary", "items", "quality_flags"]
  },
  {
    "framework": "NIST_AI_RMF",
    "clause": "GOVERN-1.1",
    "title": "AI risk management strategy",
    "evidence": ["gate_recommendation", "risk_level", "risk_tags"]
  }
]
```

## Notes
- Mapping is documentation-only and does not affect gating.
- Teams can customize mapping per compliance profile.
