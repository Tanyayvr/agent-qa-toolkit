# AEPF Standardization Plan (Public)

This document tracks what is required to move AEPF from **internal format (10/10)** to a **public standard (7/10 → 10/10)**.

## Current Status

- AEPF spec doc: `docs/aepf-spec-v1.md`
- JSON schema: `schemas/compare-report-v5.schema.json`
- Verifier: `scripts/pvip-verify.mjs`
- Reference implementation: `apps/evaluator`

## Missing for Public Standard

1. **Public spec repository**
   - separate repo with `aepf-spec-v1.md` + schema

2. **Conformance test suite**
   - golden evidence packs with expected outcomes
   - generator for synthetic packs

3. **Multi‑language validators**
   - Python validator
   - Go validator

4. **RFC numbering & version policy**
   - AEPF‑001, AEPF‑002…
   - semantic versioning for spec

5. **Adapter examples**
   - Promptfoo → AEPF
   - DeepEval → AEPF

## Suggested Repo Layout (future)

```
/aepf-spec
  /schema
  /rfc
  /conformance
  /validators
```

## Owners / Checklist

- [ ] Create public spec repo
- [ ] Move schema + spec doc
- [ ] Add conformance packs
- [ ] Publish Python validator
- [ ] Publish Go validator
- [ ] Add RFC policy + numbering
- [ ] Adapter examples
