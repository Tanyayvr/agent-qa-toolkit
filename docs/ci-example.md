# CI Example (GitHub Actions)

```yaml
name: agent-qa

on:
  push:
  workflow_dispatch:

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
      - run: npm install
      - run: npm run release:gate:ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: release-gate-report
          path: apps/evaluator/reports/release-gate-ci.json
```
