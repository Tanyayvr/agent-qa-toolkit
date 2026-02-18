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
      - run: npm install
      - run: npm run pilot
      - run: npm run pvip:verify:strict -- --reportDir apps/evaluator/reports/latest
```

