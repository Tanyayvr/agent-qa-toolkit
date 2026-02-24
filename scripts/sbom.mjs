import { execFileSync } from "node:child_process";
try {
  const out = execFileSync("npm", ["sbom", "--omit", "dev"], { encoding: "utf-8" });
  console.log(out);
} catch (err) {
  console.error("SBOM generation failed.");
  process.exit(1);
}
