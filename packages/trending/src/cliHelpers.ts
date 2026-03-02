import { accessSync, constants, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

export function parseDate(input: string, endOfDay: boolean): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error(`Invalid date: "${input}". Expected YYYY-MM-DD.`);
  }
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  const ms = new Date(input + suffix).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid date: "${input}" could not be parsed.`);
  }
  return ms;
}

export function resolveDbPath(explicitPath?: string): string {
  if (explicitPath) return resolve(explicitPath);
  const envPath = process.env.AGENT_QA_TREND_DB;
  if (envPath) return resolve(envPath);

  const projectRoot = process.env.INIT_CWD ?? process.cwd();
  const projectPath = resolve(projectRoot, ".agent-qa", "trend.sqlite");
  try {
    const dir = dirname(projectPath);
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    return projectPath;
  } catch {
    const homePath = resolve(homedir(), ".agent-qa", "trend.sqlite");
    mkdirSync(dirname(homePath), { recursive: true });
    return homePath;
  }
}
