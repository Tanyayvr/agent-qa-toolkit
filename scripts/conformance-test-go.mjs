#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const versionCheck = spawnSync("go", ["version"], { encoding: "utf-8" });
if (versionCheck.error) {
  console.error("Go toolchain is required for conformance-test-go.");
  console.error(String(versionCheck.error));
  process.exit(2);
}

const root = path.resolve("conformance");
const packs = readdirSync(root).filter((d) => d.startsWith("golden-"));
if (packs.length === 0) {
  console.error("No golden packs found.");
  process.exit(1);
}

const modes = [
  { name: "aepf", flag: "aepf_mode" },
  { name: "pvip", flag: "pvip_mode" },
  { name: "strict", flag: "strict_mode" },
];

let failures = 0;
for (const pack of packs) {
  const dir = path.join(root, pack);
  const expectedPath = path.join(dir, "expected.json");
  const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

  for (const m of modes) {
    const res = spawnSync(
      "go",
      ["run", ".", "--reportDir", dir, "--mode", m.name, "--json"],
      {
        cwd: path.resolve("validators/go/aepf-validator"),
        encoding: "utf-8",
      }
    );

    const output = (res.stdout || "").trim() || (res.stderr || "").trim();
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      console.error(`FAILED: ${pack} (${m.name}) invalid JSON output`);
      failures++;
      continue;
    }

    const expectedOutcome = expected[m.flag]?.expected;
    const ok = parsed.ok === true;
    if ((expectedOutcome === "pass" && !ok) || (expectedOutcome === "fail" && ok)) {
      console.error(`FAILED: ${pack} (${m.name}) expected ${expectedOutcome} but got ${ok ? "pass" : "fail"}`);
      failures++;
    } else {
      console.log(`OK: ${pack} (${m.name})`);
    }
  }
}

if (failures > 0) {
  console.error(`Go conformance failed: ${failures} checks`);
  process.exit(1);
}

console.log("Go conformance passed");
