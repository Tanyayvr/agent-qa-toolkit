# EU AI Act Starter On Your Own Agent

`compliance:eu-ai-act:starter` is the shortest self-serve path from "I finished the draft" to "show me an EU-shaped starter package on my own agent."

It is lighter than the real provider workflow.

It does **not** replace:

- a reviewed case set
- comparable baseline/new runs for the real package
- final legal completion
- final provider-side sign-off

It only proves that the EU minimum packaging path can run on your already-running adapter and emit a first EU-shaped starter package.

## Command

```bash
npm run compliance:eu-ai-act:starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

Optional:

```bash
npm run compliance:eu-ai-act:starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent --draftJson ./eu-ai-act-legal-draft.json
```

Supported `--systemType` values:

- `fraud`
- `credit`
- `insurance`
- `healthcare`
- `hr`
- `support`
- `general`

## What You Need First

- the repo installed locally
- a running adapter that answers:
  - `GET /health`
  - `POST /run-case`
- Node.js `20+` on the same machine where you run the command
- the adapter base URL, for example `http://localhost:8787`

This command does not start your adapter for you.

## What The EU Starter Does

1. Checks adapter health at `--baseUrl`
2. Creates a temporary EU starter workspace under `.agent-qa/eu-ai-act-starter/<profile>/`
3. Copies a curated starter case set for the selected `--systemType`
4. Runs the staged smoke path against your adapter
5. Repackages those smoke runs through the EU AI Act minimum path
6. Verifies the resulting EU starter package

## What It Creates

Inside `.agent-qa/eu-ai-act-starter/<profile>/`:

```text
cases.json
eu-ai-act-starter-<profile>.env
runs/
reports/
```

The main output is a real EU starter report directory containing:

```text
report.html
compare-report.json
artifacts/manifest.json
archive/retention-controls.json
compliance/eu-ai-act-annex-iv.json
compliance/article-10-data-governance.json
compliance/article-13-instructions.json
compliance/article-16-provider-obligations.json
compliance/article-43-conformity-assessment.json
compliance/article-47-declaration-of-conformity.json
compliance/article-17-qms-lite.json
compliance/article-72-monitoring-plan.json
```

If `--draftJson` is provided, the starter also copies that file into `supplemental/builder-draft.json` in the same report directory. This keeps the user-authored draft next to the runtime starter artifacts, but it does not merge the draft automatically into the runtime-generated compliance outputs.

## What It Does Not Prove

`compliance:eu-ai-act:starter` does **not** prove:

- that your case coverage is production-grade
- that your baseline/new run boundary is the real review boundary
- that your provider-side package is complete
- that your legal sections are fully completed
- that your system is ready for external review or conformity assessment

## Next Step After The EU Starter

Move from starter proof to the real provider-side path:

1. complete the Builder draft
2. build or review the real case set
3. produce the real baseline/new runs
4. package the real minimum EU bundle:

```bash
npm run compliance:eu-ai-act -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id>
```

Use the starter when you want the first honest EU-shaped signal on your own agent.
Use the real provider path when you are assembling the actual package for review.
