// apps/runner/src/index.ts
import { runRunner } from "./runner";

runRunner().catch((err) => {
  if (err && typeof err === "object" && "exitCode" in err && typeof (err as { exitCode: unknown }).exitCode === "number") {
    const note = err instanceof Error ? err.message : String(err);
    console.error(note);
    process.exit((err as { exitCode: number }).exitCode);
  }

  console.error(String(err instanceof Error ? err.stack : err));
  process.exit(1);
});
