# EU Verification Checklist

This is the canonical verification checklist for the EU AI Act product surface.

Use it when you want to confirm that a starter run or a minimum package was created correctly from the EU entry path.

## 1) Start From The EU Surface

From the repository root:

```bash
cd products/eu-ai-act
```

## 2) Install Shared Dependencies

```bash
npm install
```

Recommended:

- Node.js `>=20`
- a clean working tree if you want reproducible verification notes

## 3) Verify A Starter Run

Use the EU starter first:

```bash
npm run starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

Expected:

- the command completes without starter validation errors
- a report directory is created under `.agent-qa/eu-ai-act-starter/<profile>/`

## 4) Verify A Minimum Package

Build a real package from your own runs:

```bash
npm run package -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id>
```

Expected:

- the package command completes without packaging errors
- the output directory contains the generated EU package

## 5) Run Explicit Package Verification

Always verify with an explicit report directory:

```bash
npm run verify -- --reportDir <report-dir>
```

Expected:

- verification completes without contract errors
- missing or malformed files are reported explicitly

## 6) Required Output Files

Check that the generated package contains at least:

- `compare-report.json`
- `report.html`
- `artifacts/manifest.json`

And, for the EU path, the compliance output set relevant to your run, such as:

- `compliance/eu-ai-act-annex-iv.json`
- `compliance/article-9-risk-register.json`
- `compliance/article-10-data-governance.json`
- `compliance/human-oversight-summary.json`

## 7) What This Checklist Confirms

This checklist confirms that:

- the EU surface commands ran correctly
- the expected package files were generated
- the resulting package can be checked again deterministically

It does not confirm:

- legal sign-off
- final conformity assessment
- whether your written draft is complete for your organization without human review

## Related Docs

- [Get started](get-started.md)
- [EU starter](starter.md)
- [Self-hosted](self-hosted.md)
- [Operator runbook](runbook.md)
