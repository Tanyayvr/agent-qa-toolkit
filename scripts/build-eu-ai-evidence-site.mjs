import { fileURLToPath } from "node:url";

import { DEFAULT_ORIGIN, SITE_OUTPUT_ROOT, getSiteOutputs, writeSiteOutputs } from "./lib/eu-ai-site.mjs";

export function parseCliArgs(argv) {
  const args = {
    origin: DEFAULT_ORIGIN,
    outputRoot: SITE_OUTPUT_ROOT,
    json: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--origin") {
      args.origin = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--outputRoot") {
      args.outputRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--json") {
      args.json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

export function buildSite({ origin = DEFAULT_ORIGIN, outputRoot = SITE_OUTPUT_ROOT } = {}) {
  const { definition } = getSiteOutputs(origin, outputRoot);
  const outputs = writeSiteOutputs(origin, outputRoot);
  const localeCounts = definition.pages.reduce((acc, page) => {
    acc[page.locale] = (acc[page.locale] || 0) + 1;
    return acc;
  }, {});

  return {
    ok: true,
    origin,
    output_root: outputRoot,
    outputs_written: outputs.length,
    page_count: definition.pages.length,
    download_count: outputs.length - definition.pages.length - 3,
    locale_counts: localeCounts,
  };
}

export function renderBuildSummary(result, json = false) {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  return [
    "EU AI Evidence Builder site build complete.",
    `Origin: ${result.origin}`,
    `Output root: ${result.output_root}`,
    `Pages: ${result.page_count}`,
    `Downloads: ${result.download_count}`,
    `Files written: ${result.outputs_written}`,
    `Locales: ${Object.entries(result.locale_counts)
      .map(([locale, count]) => `${locale}=${count}`)
      .join(", ")}`,
  ].join("\n");
}

async function main() {
  const args = parseCliArgs(process.argv);
  const result = buildSite({ origin: args.origin, outputRoot: args.outputRoot });
  process.stdout.write(`${renderBuildSummary(result, args.json)}\n`);
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && entryPath === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
