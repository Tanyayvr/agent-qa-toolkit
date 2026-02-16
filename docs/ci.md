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
      - run: npm ci
      - run: npm run demo:e2e -- --baseUrl http://localhost:8788
      - run: npm run pvip:verify
      - run: |
          export AQ_LICENSE_PUBLIC_KEY=${{ secrets.AQ_LICENSE_PUBLIC_KEY }}
          npm run pvip:verify:strict -- --reportDir apps/evaluator/reports/latest
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
    - npm run demo:e2e -- --baseUrl http://localhost:8788
    - npm run pvip:verify
    - export AQ_LICENSE_PUBLIC_KEY=$AQ_LICENSE_PUBLIC_KEY
    - npm run pvip:verify:strict -- --reportDir apps/evaluator/reports/latest
```
