import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { renderTrendHtml } from "./renderTrendHtml";

async function makeTmpOutFile(name: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "aq-trend-html-"));
  return path.join(dir, name);
}

describe("renderTrendHtml", () => {
  it("renders html with chart scripts and trend data payload when vendor bundle passes integrity", async () => {
    const outFile = await makeTmpOutFile("trend-ok.html");
    renderTrendHtml({
      outFile,
      runRows: [
        {
          generated_at: Date.UTC(2026, 1, 28),
          run_id: "r1",
          report_id: "rep1",
          total_cases: 4,
          executed_cases: 4,
          pass_count: 4,
          fail_count: 0,
          regressions: 0,
          improvements: 0,
          skipped_count: 0,
          model: null,
          git_commit: null,
          ingest_mode: "auto",
          kpi_risk_mass_before: 5,
          kpi_risk_mass_after: 2,
          kpi_pre_action_entropy_removed: 0.6,
          kpi_blocked_cases: 1,
          kpi_recon_minutes_saved_total: 90,
          kpi_recon_minutes_saved_per_block: 90,
        },
      ],
      tokenRows: [
        {
          generated_at: Date.UTC(2026, 1, 28),
          report_id: "rep1",
          model: null,
          total_input: 100,
          total_output: 50,
          total_tokens: 150,
          cases_with_tokens: 1,
          executed_cases: 1,
        },
      ],
      tokenCoverage: {
        totalRows: 1,
        nonNullRows: 1,
        coveragePercent: 100,
      },
      note: "integration smoke",
    });

    const html = await readFile(outFile, "utf-8");
    expect(html).toContain("Historical Trending");
    expect(html).toContain("integration smoke");
    expect(html).toContain('id="trend-data"');
    expect(html).toContain('"run_id":"r1"');
    expect(html).toContain("passChart");
    expect(html).toContain("gateChart");
    expect(html).toContain("tokenChart");
    expect(html).toContain("kpiChart");
    expect(html).not.toContain("integrity check failed");
  });

  it("falls back to tables and warning when chart bundle integrity check fails", async () => {
    const outFile = await makeTmpOutFile("trend-fallback.html");
    const vendorDir = path.join(__dirname, "..", "vendor");
    const hashFile = path.join(vendorDir, "chart.umd.min.js.sha256");
    const originalHash = await readFile(hashFile, "utf-8");

    try {
      await writeFile(hashFile, "invalid-sha256\n", "utf-8");

      renderTrendHtml({
        outFile,
        runRows: [
          {
            generated_at: Date.UTC(2026, 1, 28),
            run_id: "r2",
            report_id: "rep2",
            total_cases: 2,
            executed_cases: 2,
            pass_count: 0,
            fail_count: 2,
            regressions: 1,
            improvements: 0,
            skipped_count: 0,
            model: null,
            git_commit: null,
            ingest_mode: "auto",
            kpi_risk_mass_before: null,
            kpi_risk_mass_after: null,
            kpi_pre_action_entropy_removed: null,
            kpi_blocked_cases: null,
            kpi_recon_minutes_saved_total: null,
            kpi_recon_minutes_saved_per_block: null,
          },
        ],
        tokenRows: [],
        tokenCoverage: {
          totalRows: 0,
          nonNullRows: 0,
          coveragePercent: 0,
        },
      });

      const html = await readFile(outFile, "utf-8");
      expect(html).toContain("integrity check failed");
      expect(html).toContain("Rendering tables only.");
      expect(html).toContain("<table>");
      expect(html).not.toContain("passChart");
      expect(html).not.toContain("gateChart");
      expect(html).not.toContain("tokenChart");
      expect(html).not.toContain("kpiChart");
    } finally {
      await writeFile(hashFile, originalHash, "utf-8");
    }
  });
});
