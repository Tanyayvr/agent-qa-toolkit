# Get Started With The EU Path

Use this path if you want the EU AI Act minimum-package flow.

## Step 1

Open the public Builder on the site and prepare the first draft.

## Step 2

Install the shared core from this product surface:

```bash
npm install
```

## Step 3

Make sure your adapter is already running and answers:

- `GET /health`
- `POST /run-case`

## Step 4

Run the first EU starter:

```bash
npm run starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

## Step 5

When the starter looks real enough, move to the real minimum package:

```bash
npm run package -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id>
```
