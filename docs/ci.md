# CI Integration (Self-hosted)

This toolkit is designed for self-hosted CI pipelines.
Below are minimal examples for GitHub Actions and GitLab CI.

## GitHub Actions

```yaml
name: agent-qa
on: [push, pull_request]

jobs:
  agent-qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
      - run: npm ci
      - run: npm run release:gate:ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: release-gate-report
          path: apps/evaluator/reports/release-gate-ci.json
```

## GitLab CI

```yaml
stages:
  - test

agent_qa:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run release:gate:ci
```
