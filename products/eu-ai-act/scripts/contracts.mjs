import { runNpm } from "./shared-root.mjs";

async function main() {
  await runNpm(["run", "compliance:eu-ai-act:contracts"]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
