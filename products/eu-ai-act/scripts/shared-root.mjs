import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));

export function getRepoRoot() {
  return path.resolve(CURRENT_DIR, "../../..");
}

export function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function runNpm(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(getNpmCommand(), args, {
      cwd: getRepoRoot(),
      stdio: "inherit",
      ...options
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code ?? 1}`));
    });
  });
}

export function hasFlag(flag, args = process.argv.slice(2)) {
  return args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}
