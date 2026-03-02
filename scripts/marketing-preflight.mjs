#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

const targetFiles = [
  "docs/internal/market/social/README.md",
  "docs/internal/market/social/guide-reddit.md",
  "docs/internal/market/social/guide-linkedin.md",
  "docs/internal/market/social/guide-twitter.md",
  "docs/internal/market/social/guide-hackernews.md",
  "docs/internal/market/social/reddit-texts.md",
  "docs/internal/market/social/linkedin-texts.md",
  "docs/internal/market/social/twitter-texts.md",
  "docs/internal/market/social/hackernews-texts.md",
];

const requiredMarkers = [
  "2026-02-28-marketing-claim-gates.md",
  "2026-02-28-pre-post-checklist.md",
  "2026-02-28-pre-outreach-checklist.md",
  "npm run docs:check-links",
];

const failures = [];

for (const relativePath of targetFiles) {
  const content = readFileSync(join(repoRoot, relativePath), "utf8");
  for (const marker of requiredMarkers) {
    if (!content.includes(marker)) {
      failures.push(`${relativePath} is missing marker: ${marker}`);
    }
  }
}

if (failures.length > 0) {
  console.error("marketing preflight failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`marketing preflight OK: ${targetFiles.length} files checked`);
