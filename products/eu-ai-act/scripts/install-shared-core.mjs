import { hasFlag, runNpm } from "./shared-root.mjs";

async function main() {
  if (process.env.AQ_SKIP_SHARED_CORE_INSTALL === "1" || hasFlag("--skip-shared-core-install")) {
    return;
  }

  console.log("Installing shared monorepo dependencies for the EU product surface...");
  await runNpm(["install"]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
