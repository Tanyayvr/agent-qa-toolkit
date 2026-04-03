import { hasFlag, runNpm } from "./shared-root.mjs";

async function main() {
  const args = process.argv.slice(2);
  if (!hasFlag("--reportDir", args)) {
    console.error("EU verify requires an explicit --reportDir <report-dir>.");
    process.exit(1);
  }

  await runNpm(["run", "compliance:eu-ai-act:verify", "--", ...args]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
