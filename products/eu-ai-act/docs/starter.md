# EU Starter

Use the starter when you want the first honest EU-shaped signal on your own running agent.

## Command

Run this from `products/eu-ai-act/`:

```bash
npm run starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

Optional:

```bash
npm run starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent --draftJson ./eu-ai-act-legal-draft.json
```

## What You Need First

- `npm install` completed in `products/eu-ai-act/`
- a running adapter that answers:
  - `GET /health`
  - `POST /run-case`
- Node.js `20+`
- the adapter base URL, for example `http://localhost:8787`

This command does not start your adapter for you.

## What It Creates

The starter writes a lightweight report directory under:

```text
.agent-qa/eu-ai-act-starter/<profile>/
```

That output includes:

- a first runtime report
- a compare report
- a manifest and retention controls
- the minimum EU-shaped compliance outputs

If `--draftJson` is provided, the starter also copies that file into `supplemental/builder-draft.json` inside the same report directory.

## What It Does Not Replace

The starter does not replace:

- a reviewed case set
- real baseline vs new runs
- final provider-side completion
- final legal sign-off

## Next Step

When the starter looks real enough, move to the real minimum package:

```bash
npm run package -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id>
```
