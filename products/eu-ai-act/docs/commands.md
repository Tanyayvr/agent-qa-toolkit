# EU Commands

These are the canonical commands to use from `products/eu-ai-act/`.

## Install Shared Core

```bash
npm install
```

## EU Starter

```bash
npm run starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

## Real Minimum Package

```bash
npm run package -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id>
```

By default this uses the EU compliance profile shipped here:

- `products/eu-ai-act/config/compliance-profile.json`

## Verify

```bash
npm run verify -- --reportDir <report-dir>
```

## Contract Check

```bash
npm run contracts
```
