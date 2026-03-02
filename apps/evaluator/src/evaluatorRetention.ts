import path from "node:path";
import { readdir, rm, stat } from "node:fs/promises";

export async function cleanupOldReports(
  baseDir: string,
  retentionDays: number,
  onDelete?: (deletedPath: string) => Promise<void>
): Promise<void> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let names: string[] = [];
  try {
    names = await readdir(baseDir);
  } catch {
    return;
  }
  for (const name of names) {
    const p = path.join(baseDir, name);
    try {
      const st = await stat(p);
      if (st.isDirectory() && st.mtimeMs < cutoff) {
        await rm(p, { recursive: true, force: true });
        if (onDelete) {
          await onDelete(p);
        }
      }
    } catch {
      // ignore
    }
  }
}

