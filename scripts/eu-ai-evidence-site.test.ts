import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildSite, parseCliArgs as parseBuildCliArgs, renderBuildSummary } from "./build-eu-ai-evidence-site.mjs";
import {
  parseCliArgs as parseVerifyCliArgs,
  renderVerificationSummary,
  verifyBuiltSite,
} from "./verify-eu-ai-evidence-site.mjs";

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = path.join(os.tmpdir(), `aq-eu-ai-site-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  tempRoots.push(root);
  return root;
}

function writeText(absPath: string, value: string) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, value, "utf8");
}

function writeStaticDependencies(root: string) {
  writeText(path.join(root, "site-assets", "site.css"), "body{}");
  writeText(path.join(root, "site-assets", "site.js"), "console.log('site');");
  writeText(path.join(root, "site-assets", "builder.js"), "console.log('builder');");
  writeText(path.join(root, "demo", "index.html"), "<!doctype html><title>demo</title>");
  writeText(path.join(root, "demo", "agent-evidence", "report.html"), "<!doctype html><title>agent-evidence</title>");
  writeText(
    path.join(root, "demo", "eu-ai-act", "compliance", "eu-ai-act-report.html"),
    "<!doctype html><title>eu-ai-act</title>"
  );
  writeText(
    path.join(root, "demo", "product-surfaces.json"),
    JSON.stringify(
      {
        surfaces: [
          {
            id: "eu-ai-act",
            label: "EU AI Act Evidence Engine",
            summary: {
              approvals: 1,
              blocks: 1,
              runs_in_window: 2,
              monitoring_status: "history_current",
              portable_paths: true,
              execution_quality_status: "degraded",
            },
          },
        ],
      },
      null,
      2
    )
  );
  writeText(path.join(root, "assets", "screenshots", "01.png"), "png");
  writeText(path.join(root, "assets", "screenshots", "05.png"), "png");
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("eu-ai-evidence-site", () => {
  it("parses build and verify cli args", () => {
    const buildArgs = parseBuildCliArgs([
      "node",
      "scripts/build-eu-ai-evidence-site.mjs",
      "--origin",
      "https://example.com",
      "--outputRoot",
      "/tmp/site",
      "--json",
    ]);
    expect(buildArgs.origin).toBe("https://example.com");
    expect(buildArgs.outputRoot).toBe("/tmp/site");
    expect(buildArgs.json).toBe(true);

    const verifyArgs = parseVerifyCliArgs([
      "node",
      "scripts/verify-eu-ai-evidence-site.mjs",
      "--origin",
      "https://example.com",
      "--outputRoot",
      "/tmp/site",
      "--json",
    ]);
    expect(verifyArgs.origin).toBe("https://example.com");
    expect(verifyArgs.outputRoot).toBe("/tmp/site");
    expect(verifyArgs.json).toBe(true);
  });

  it("builds a localized static site and verifies it strictly", () => {
    const root = makeTempRoot();
    writeStaticDependencies(root);

    const build = buildSite({ origin: "https://example.com", outputRoot: root });
    expect(build.ok).toBe(true);
    expect(build.page_count).toBeGreaterThan(10);
    expect(build.locale_counts.en).toBeGreaterThan(build.locale_counts.de);

    const landing = readFileSync(path.join(root, "en", "index.html"), "utf8");
    const builder = readFileSync(path.join(root, "en", "builder", "index.html"), "utf8");
    const technical = readFileSync(path.join(root, "en", "technical", "index.html"), "utf8");
    const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");

    expect(landing).toContain("EU AI Evidence Builder");
    expect(landing).toContain('hreflang="de"');
    expect(landing).toContain("Open technical view");
    expect(builder).toContain("builder-config");
    expect(builder).toContain("site-assets/builder.js");
    expect(technical).toContain("Time to first evidence");
    expect(technical).toContain("Professional operating model");
    expect(technical).toContain("Structured intake layer");
    expect(technical).toContain("system-scope.json");
    expect(technical).toContain("cases.json");
    expect(technical).toContain("run-fingerprint.json");
    expect(technical).toContain("evidence-intake-check-cases.mjs");
    expect(technical).toContain("Structured review handoff");
    expect(technical).toContain("review/review-decision.json");
    expect(technical).toContain("npm run review:init");
    expect(technical).toContain("Strong expectation signals");
    expect(sitemap).toContain("https://example.com/en/");
    expect(sitemap).toContain("https://example.com/de/");

    const verification = verifyBuiltSite({ origin: "https://example.com", outputRoot: root });
    expect(verification.ok).toBe(true);
    expect(verification.failed_checks).toHaveLength(0);

    expect(renderBuildSummary(build, false)).toContain("site build complete");
    expect(renderVerificationSummary(verification, false)).toContain("site verify passed");
  });

  it("fails verification when a generated file drifts", () => {
    const root = makeTempRoot();
    writeStaticDependencies(root);
    buildSite({ origin: "https://example.com", outputRoot: root });

    writeText(path.join(root, "en", "index.html"), "<!doctype html><title>drift</title>");

    const verification = verifyBuiltSite({ origin: "https://example.com", outputRoot: root });
    expect(verification.ok).toBe(false);
    expect(verification.failed_checks.some((check) => check.path === path.join("en", "index.html"))).toBe(true);
    expect(renderVerificationSummary(verification, false)).toContain("site verify failed");
  });
});
