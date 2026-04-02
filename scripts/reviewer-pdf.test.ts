import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  EU_REVIEWER_MARKDOWN_REL_PATH,
  EU_REVIEWER_PDF_REL_PATH,
  renderEuReviewerPdf,
} from "./lib/reviewer-pdf.mjs";

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-reviewer-pdf-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("reviewer-pdf", () => {
  it("renders a reviewer PDF with outlines, metadata, and page numbers", () => {
    const root = makeTempRoot();
    const markdownAbs = path.join(root, EU_REVIEWER_MARKDOWN_REL_PATH);
    mkdirSync(path.dirname(markdownAbs), { recursive: true });
    writeFileSync(
      markdownAbs,
      `# EU AI Act reviewer pack

## Summary
- First summary point

## Article 9 risk management
### What this section is for
Text line

## Article 12 logging and traceability
- Another point
`,
      "utf8"
    );

    const result = renderEuReviewerPdf(root);
    const pdfAbs = path.join(root, EU_REVIEWER_PDF_REL_PATH);
    const pdf = readFileSync(pdfAbs, "utf8");

    expect(result.pages).toBeGreaterThan(0);
    expect(result.outlineEntries).toBeGreaterThanOrEqual(3);
    expect(pdf).toContain("%PDF-1.4");
    expect(pdf).toContain("/PageMode /UseOutlines");
    expect(pdf).toContain("/Type /Outlines");
    expect(pdf).toContain("/Title (EU AI Act reviewer pack)");
    expect(pdf).toContain("/Title (Summary)");
    expect(pdf).toContain("/Title (Article 9 risk management)");
    expect(pdf).toContain("Page 1 of 1");
  });
});
