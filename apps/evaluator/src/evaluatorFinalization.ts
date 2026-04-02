import path from "node:path";
import { ensureDir, writeFileAtomic, writeJsonAtomic } from "cli-utils";
import type { Manifest, ManifestDraftItem, ManifestItem, ThinIndex } from "./manifest";
import { fileBytesForRel, fileSha256ForRel, sha256Hex } from "./evaluatorIo";

export async function writeRedactionSummaryIfNeeded(params: {
  reportDirAbs: string;
  redactionStatus: "none" | "applied";
  redactionPresetId?: string;
  redactionWarnings: string[];
  manifestItems: ManifestDraftItem[];
}): Promise<void> {
  const { reportDirAbs, redactionStatus, redactionPresetId, redactionWarnings, manifestItems } = params;
  if (redactionStatus !== "applied") return;

  const redactionSummary = {
    preset_id: redactionPresetId ?? "unknown",
    categories_targeted: [],
    actions: [],
    touched: [],
    warnings: [
      "Redaction is best-effort; not a guarantee of complete removal.",
      ...redactionWarnings,
    ],
  };
  const redactionRel = "artifacts/redaction-summary.json";
  await writeJsonAtomic(path.join(reportDirAbs, redactionRel), redactionSummary);
  manifestItems.push({
    manifest_key: "redaction/summary",
    rel_path: redactionRel,
    media_type: "application/json",
  });
}

export async function finalizeManifest(params: {
  reportDirAbs: string;
  manifestItems: ManifestDraftItem[];
}): Promise<{ manifest: Manifest; thinIndex: ThinIndex }> {
  const { reportDirAbs } = params;
  const manifestItems = params.manifestItems;

  const finalizedItems: ManifestItem[] = [];
  for (const it of manifestItems) {
    const bytes = await fileBytesForRel(reportDirAbs, it.rel_path);
    const sha256 = await fileSha256ForRel(reportDirAbs, it.rel_path);
    if (bytes === undefined) {
      throw new Error(`Manifest item file is missing: ${it.rel_path}`);
    }
    if (!sha256) {
      throw new Error(`Manifest item sha256 could not be computed: ${it.rel_path}`);
    }
    finalizedItems.push({
      ...it,
      bytes,
      sha256,
    });
  }

  const manifest: Manifest = {
    manifest_version: "v1",
    generated_at: Date.now(),
    items: finalizedItems,
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  await ensureDir(path.join(reportDirAbs, "artifacts"));
  await writeFileAtomic(path.join(reportDirAbs, "artifacts", "manifest.json"), manifestJson, "utf-8");

  const thinIndex: ThinIndex = {
    manifest_version: "v1",
    generated_at: manifest.generated_at,
    source_manifest_sha256: sha256Hex(manifestJson),
    items: manifest.items.map((it) => ({
      manifest_key: it.manifest_key,
      rel_path: it.rel_path,
      media_type: it.media_type,
    })),
  };

  return { manifest, thinIndex };
}
