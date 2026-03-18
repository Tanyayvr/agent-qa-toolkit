import path from "node:path";

export function resolveAgentEvidenceFixtureRoot(repoRoot) {
  return path.join(repoRoot, "conformance", "agent-evidence-contract-source");
}

export function resolveEuAiActFixtureRoot(repoRoot) {
  return path.join(repoRoot, "conformance", "eu-ai-act-contract-source");
}

export function buildAgentEvidenceFixtureArgs(repoRoot, params) {
  const fixtureRoot = resolveAgentEvidenceFixtureRoot(repoRoot);
  return [
    "--cases",
    path.join(fixtureRoot, "cases.json"),
    "--baselineDir",
    path.join(fixtureRoot, "runs", "baseline", "r1"),
    "--newDir",
    path.join(fixtureRoot, "runs", "new", "r1"),
    "--outDir",
    params.outDir,
    "--reportId",
    params.reportId,
    "--environment",
    path.join(fixtureRoot, "environment.json"),
    "--no-trend",
  ];
}

export function buildEuAiActFixtureArgs(repoRoot, params) {
  const fixtureRoot = resolveEuAiActFixtureRoot(repoRoot);
  return [
    "--cases",
    path.join(fixtureRoot, "cases.json"),
    "--baselineDir",
    path.join(fixtureRoot, params.variant, "runs", "baseline", "r1"),
    "--newDir",
    path.join(fixtureRoot, params.variant, "runs", "new", "r1"),
    "--outDir",
    params.outDir,
    "--reportId",
    params.reportId,
    "--environment",
    path.join(fixtureRoot, "environment.json"),
    "--trend-db",
    params.trendDb,
  ];
}
