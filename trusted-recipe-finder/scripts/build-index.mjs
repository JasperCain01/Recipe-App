#!/usr/bin/env node
// Crawls the configured default recipe sites (data/sources.json) and writes
// pre-enriched, search-ready recipe data to data/<id>.json + data/manifest.json.
// Run by the weekly refresh-index GitHub Action, or manually:
//
//   node scripts/build-index.mjs             # all sources
//   node scripts/build-index.mjs --source recipetineats

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { indexSite, fetchPage, extractRecipeFromHtml } from "../shared/scrape-lib.js";
import { tokensForIngredientLine } from "../shared/tokens.js";
import { deriveMealType, parseTimeToMinutes } from "../shared/recipe-meta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SOURCES_PATH = path.join(DATA_DIR, "sources.json");
const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

const FETCH_CONCURRENCY = 3;
const BATCH_DELAY_MS = 500;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function fetchPageWithRetries(url) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchPage(url, fetch);
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

/** Fetch + extract one source's recipes with bounded concurrency and retries. */
async function enrichSource(source) {
  const { recipes: index, count: indexCount } = await indexSite(source.url, fetch);

  const records = [];
  const failures = [];

  for (let i = 0; i < index.length; i += FETCH_CONCURRENCY) {
    const batch = index.slice(i, i + FETCH_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (entry) => {
        const html = await fetchPageWithRetries(entry.url);
        return extractRecipeFromHtml(html, entry.url);
      }),
    );

    settled.forEach((result, j) => {
      if (result.status === "fulfilled" && result.value.ingredients.length > 0) {
        const data = result.value;
        records.push({
          sourceId: source.id,
          url: data.url,
          title: data.title || batch[j].title,
          ingredients: data.ingredients,
          cuisine: data.cuisine,
          mealType: deriveMealType(data.category, data.keywords),
          totalTime: data.totalTime,
          totalTimeMinutes: parseTimeToMinutes(data.totalTime),
          servings: data.servings,
          image: data.image,
          instructionCount: data.instructions.length,
          tokens: data.ingredients.map(tokensForIngredientLine),
        });
      } else {
        failures.push({
          url: batch[j].url,
          reason: result.status === "rejected" ? String(result.reason?.message || result.reason) : "no ingredients extracted",
        });
      }
    });

    if (i + FETCH_CONCURRENCY < index.length) await sleep(BATCH_DELAY_MS);
  }

  return { indexCount, records, failures };
}

async function main() {
  const args = process.argv.slice(2);
  const sourceFlagIndex = args.indexOf("--source");
  const onlySourceId = sourceFlagIndex !== -1 ? args[sourceFlagIndex + 1] : null;

  const allSources = JSON.parse(await readFile(SOURCES_PATH, "utf-8"));
  const sources = onlySourceId ? allSources.filter((s) => s.id === onlySourceId) : allSources;
  if (onlySourceId && sources.length === 0) {
    console.error(`No source with id "${onlySourceId}" in ${SOURCES_PATH}`);
    process.exitCode = 1;
    return;
  }

  const manifest = await readJsonIfExists(MANIFEST_PATH, { generated_at: null, sources: [] });
  const manifestById = new Map(manifest.sources.map((s) => [s.id, s]));

  const summary = [];

  for (const source of sources) {
    const startedAt = Date.now();
    try {
      const { indexCount, records, failures } = await enrichSource(source);
      const file = `${source.id}.json`;
      await writeFile(path.join(DATA_DIR, file), JSON.stringify(records, null, 2) + "\n");

      manifestById.set(source.id, {
        id: source.id,
        name: source.name,
        url: source.url,
        emoji: source.emoji,
        count: records.length,
        file,
        updated_at: new Date().toISOString(),
      });

      summary.push({
        id: source.id,
        ok: records.length > 0,
        indexCount,
        enrichedCount: records.length,
        failedCount: failures.length,
        elapsedMs: Date.now() - startedAt,
      });
    } catch (err) {
      summary.push({ id: source.id, ok: false, error: err.message || String(err) });
    }
  }

  manifest.generated_at = new Date().toISOString();
  manifest.sources = allSources
    .map((s) => manifestById.get(s.id))
    .filter(Boolean);
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  console.log("\n── Build summary ──");
  for (const s of summary) {
    if (s.error) {
      console.log(`  ✗ ${s.id}: FAILED — ${s.error}`);
    } else {
      console.log(
        `  ${s.ok ? "✓" : "✗"} ${s.id}: indexed ${s.indexCount}, enriched ${s.enrichedCount}/${s.indexCount}` +
          (s.failedCount ? ` (${s.failedCount} failed)` : "") +
          ` in ${(s.elapsedMs / 1000).toFixed(1)}s`,
      );
    }
  }

  const allFailed = summary.every((s) => s.error || s.enrichedCount === 0);
  if (allFailed) {
    console.error("\nAll sources failed — exiting non-zero.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
