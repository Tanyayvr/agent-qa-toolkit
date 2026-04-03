# EU AI Act Product Surface

This is the canonical EU-specific entry point inside the monorepo.

Use this folder if you only need the EU AI Act path and do not want to start from the general Agent QA Toolkit surface.

## What This Is

This product surface is for teams building the EU AI Act package path for a high-risk AI system.

It gives you:

- the EU-specific commands
- the EU-specific docs
- the shortest path to the EU starter and the real minimum package

## Important Boundary

There is still one shared repository.

The EU path reuses the same core engine, runner, evaluator, and packaging logic as the wider toolkit.

That means:

- you clone one repository
- you use the EU-specific entry surface in this folder
- you ignore the generic toolkit quickstart unless you intentionally want the broader product

## Start Here

1. From this folder, install the shared core once:

```bash
npm install
```

This command prepares the shared monorepo dependencies that the EU path reuses.

2. Run the EU starter on your own running adapter:

```bash
npm run starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

3. Build the real minimum package when you are ready:

```bash
npm run package -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id>
```

4. Verify the resulting package:

```bash
npm run verify -- --reportDir <report-dir>
```

## EU Docs

- [Get started](docs/get-started.md)
- [Commands](docs/commands.md)
- [EU starter](docs/starter.md)
- [Self-hosted](docs/self-hosted.md)
- [Operator runbook](docs/runbook.md)
- [Boundary](docs/boundary.md)
- [Verification checklist](docs/verification.md)

## What To Ignore If You Only Need The EU Path

Do not start with:

- the generic toolkit quickstart
- generic agent demos
- non-EU commands unless you are intentionally inspecting the wider toolkit
