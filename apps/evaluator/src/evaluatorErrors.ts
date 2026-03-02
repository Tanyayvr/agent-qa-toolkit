export class ExecutionQualityGateError extends Error {
  public readonly exitCode = 1;
  constructor(public readonly reasons: string[]) {
    super(
      `Execution quality gate failed: ${reasons.length ? reasons.join(" | ") : "degraded status"}`
    );
    this.name = "ExecutionQualityGateError";
  }
}

