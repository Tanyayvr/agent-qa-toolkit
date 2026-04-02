import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { ensureDir } from "cli-utils";
import { finalizeManifest } from "./evaluatorFinalization";

describe("evaluatorFinalization", () => {
  let root = "";

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("throws when a manifest item points at a missing file", async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-finalize-manifest-"));
    await expect(
      finalizeManifest({
        reportDirAbs: root,
        manifestItems: [
          {
            manifest_key: "missing/file",
            rel_path: "artifacts/missing.json",
            media_type: "application/json",
          },
        ],
      })
    ).rejects.toThrow("Manifest item file is missing");
  });

  it("writes sha256 for every manifest item", async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-finalize-manifest-"));
    const relPath = path.join("artifacts", "sample.json");
    await ensureDir(path.join(root, "artifacts"));
    await writeFile(path.join(root, relPath), JSON.stringify({ ok: true }), "utf8");

    const result = await finalizeManifest({
      reportDirAbs: root,
      manifestItems: [
        {
          manifest_key: "sample/file",
          rel_path: relPath,
          media_type: "application/json",
        },
      ],
    });

    expect(result.manifest.items[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
