# Product Surface Publishing

This runbook describes how to publish the two deterministic product demos into a website-ready proof root.

## Goal

Produce one stable publish root under `docs/demo/` that contains:

- a landing page for both surfaces
- a machine-readable index
- a published Agent Evidence demo bundle
- a published EU AI Act demo bundle

## Command

```bash
npm run demo:publish:surfaces
```

That command:

- runs `demo:agent-evidence`
- runs `demo:eu-ai-act`
- copies both report directories into `docs/demo/agent-evidence/` and `docs/demo/eu-ai-act/`
- generates `docs/demo/index.html`
- generates `docs/demo/product-surfaces.json`
- verifies that every published link points to a real file

## Verify-Only Mode

If the publish root already exists and you only want to verify it:

```bash
npm run demo:publish:surfaces:verify
```

## Published Paths

After a successful run, the website-safe proof surface is:

- `docs/demo/index.html`
- `docs/demo/product-surfaces.json`
- `docs/demo/agent-evidence/report.html`
- `docs/demo/agent-evidence/compare-report.json`
- `docs/demo/eu-ai-act/report.html`
- `docs/demo/eu-ai-act/compliance/eu-ai-act-report.html`

## When To Use It

Use this path when you need:

- stable demo links for a marketing site
- deterministic artifacts for pilot handoff
- one canonical place to point buyers instead of local `apps/evaluator/reports/*`

Do not use local report directories as website links.
Publish them first.

## Operating Pattern

Recommended sequence:

1. run `npm run release:gate:agent-evidence`
2. run `npm run release:gate:eu-ai-act`
3. run `npm run demo:publish:surfaces`
4. point the site to `docs/demo/`

That keeps the site pointing only at bundles that already passed the product-surface gates.

## Related Docs

- [Product Matrix](product-matrix.md)
- [Agent Evidence Operator Runbook](agent-evidence-operator-runbook.md)
- [EU AI Act Operator Runbook](eu-ai-act-operator-runbook.md)
