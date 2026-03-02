import { describe, expect, it } from "vitest";
import {
  manifestKeyFor,
  manifestItemForFailure,
  manifestItemForCaseResponse,
  manifestItemForFinalOutput,
  manifestItemForTraceAnchor,
  manifestItemForRunnerFailureArtifact,
} from "./manifest";

describe("manifest helpers", () => {
  it("builds stable manifest key", () => {
    expect(manifestKeyFor({ caseId: "c1", version: "baseline", kind: "runner_failure" })).toBe(
      "c1/baseline/runner_failure"
    );
  });

  it("creates failure/case_response/final_output items with expected media types", () => {
    const failure = manifestItemForFailure({
      caseId: "c1",
      version: "new",
      rel_path: "assets/runner_failure/c1/new/summary.json",
      media_type: "application/json",
    });
    const caseResp = manifestItemForCaseResponse({
      caseId: "c1",
      version: "new",
      rel_path: "assets/cases/c1/new.json",
    });
    const finalOutput = manifestItemForFinalOutput({
      caseId: "c1",
      version: "new",
      rel_path: "assets/final_output/c1/new.txt",
      media_type: "text/plain",
    });
    const traceAnchor = manifestItemForTraceAnchor({
      caseId: "c1",
      version: "new",
      rel_path: "assets/trace_anchor/c1/new.json",
    });

    expect(failure).toMatchObject({
      manifest_key: "c1/new/runner_failure",
      media_type: "application/json",
    });
    expect(caseResp).toMatchObject({
      manifest_key: "c1/new/case_response",
      media_type: "application/json",
    });
    expect(finalOutput).toMatchObject({
      manifest_key: "c1/new/final_output",
      media_type: "text/plain",
    });
    expect(traceAnchor).toMatchObject({
      manifest_key: "c1/new/trace_anchor",
      media_type: "application/json",
    });
  });

  it("creates both runner failure artifact entries when body and meta paths exist", () => {
    const items = manifestItemForRunnerFailureArtifact({
      caseId: "c9",
      version: "baseline",
      bodyRel: "assets/runner_failure/c9/baseline/body.bin",
      metaRel: "assets/runner_failure/c9/baseline/body.meta.json",
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      manifest_key: "c9/baseline/runner_failure_body",
      media_type: "application/octet-stream",
    });
    expect(items[1]).toMatchObject({
      manifest_key: "c9/baseline/runner_failure_meta",
      media_type: "application/json",
    });
  });

  it("omits missing runner failure artifact entries", () => {
    expect(
      manifestItemForRunnerFailureArtifact({
        caseId: "c10",
        version: "new",
      })
    ).toEqual([]);
    expect(
      manifestItemForRunnerFailureArtifact({
        caseId: "c10",
        version: "new",
        bodyRel: "assets/runner_failure/c10/new/body.bin",
      })
    ).toHaveLength(1);
  });
});
