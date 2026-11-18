// End-to-end tests for scripts/build-index.mjs, the weekly unattended job in
// refresh-index.yml that rebuilds data/<source>.json and data/manifest.json.
// The script runs in a throwaway copy of the repo layout, with `fetch`
// replaced by a fake site (tests/support/fake-fetch.mjs), so no network is
// used and the real data/ is never touched. See tests/TESTS.md.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAKE_FETCH = path.join(ROOT, "tests", "support", "fake-fetch.mjs");

const SITE = "https://site.example";
const SOURCE = { id: "testsite", name: "Test Site", url: SITE, emoji: "🧪" };

const recipePage = (name, ingredients, totalTime) =>
  `<html><head><script type="application/ld+json">${JSON.stringify({
    "@type": "Recipe",
    name,
    recipeIngredient: ingredients,
    recipeInstructions: [{ "@type": "HowToStep", text: "Cook it." }],
    totalTime,
    recipeCategory: "Dinner",
  })}</script></head></html>`;

const sitemap = (...urls) => `<urlset>${urls.map((u) => `<url><loc>${u}</loc></url>`).join("")}</urlset>`;

let dir;

function setUp(pages, existingRecords) {
  // Mirror the repo layout the script resolves against: scripts/, shared/, data/.
  cpSync(path.join(ROOT, "scripts", "build-index.mjs"), path.join(dir, "scripts", "build-index.mjs"));
  cpSync(path.join(ROOT, "shared"), path.join(dir, "shared"), { recursive: true });
  writeFileSync(path.join(dir, "data", "sources.json"), JSON.stringify([SOURCE]));
  if (existingRecords) {
    writeFileSync(path.join(dir, "data", "testsite.json"), JSON.stringify(existingRecords));
    writeFileSync(
      path.join(dir, "data", "manifest.json"),
      JSON.stringify({ generated_at: "earlier", sources: [{ ...SOURCE, count: existingRecords.length, file: "testsite.json" }] }),
    );
  }
  writeFileSync(path.join(dir, "fake-site.json"), JSON.stringify(pages));
}

function runBuild() {
  return spawnSync(process.execPath, ["--import", FAKE_FETCH, path.join(dir, "scripts", "build-index.mjs")], {
    env: { ...process.env, FAKE_SITE: path.join(dir, "fake-site.json") },
    encoding: "utf-8",
    timeout: 60000,
  });
}

const readJson = (rel) => JSON.parse(readFileSync(path.join(dir, rel), "utf-8"));

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "build-index-test-"));
  mkdirSync(path.join(dir, "scripts"));
  mkdirSync(path.join(dir, "data"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("build-index.mjs", () => {
  it("writes search-ready records and a manifest entry for a working site", () => {
    setUp({
      [`${SITE}/sitemap.xml`]: sitemap(`${SITE}/beef-ragu/`, `${SITE}/pea-soup/`),
      [`${SITE}/beef-ragu/`]: recipePage("Beef Ragu", ["500g beef mince", "1 tin chopped tomatoes"], "PT1H30M"),
      [`${SITE}/pea-soup/`]: recipePage("Pea Soup", ["300g frozen peas"], "PT25M"),
    });

    const run = runBuild();
    expect(run.status, run.stdout + run.stderr).toBe(0);

    const records = readJson("data/testsite.json");
    expect(records.map((r) => r.title).sort()).toEqual(["Beef Ragu", "Pea Soup"]);
    const ragu = records.find((r) => r.title === "Beef Ragu");
    expect(ragu).toMatchObject({
      sourceId: "testsite",
      url: `${SITE}/beef-ragu/`,
      ingredients: ["500g beef mince", "1 tin chopped tomatoes"],
      mealType: "Dinner",
      totalTime: "1h 30m",
      totalTimeMinutes: 90,
      instructionCount: 1,
    });
    // One token entry per ingredient line, used by ingredient search, with
    // quantities and preparation words stripped and plurals normalised.
    expect(ragu.tokens).toEqual([
      { all: ["beef", "mince"], strict: ["beef", "mince"] },
      { all: ["tomato"], strict: ["tomato"] },
    ]);

    const manifest = readJson("data/manifest.json");
    expect(manifest.sources).toEqual([
      expect.objectContaining({ id: "testsite", count: 2, file: "testsite.json" }),
    ]);
  });

  it("never overwrites good data with an empty result when every recipe page fails", () => {
    // The sitemap still lists recipes, but the pages no longer carry recipe
    // data (a redesign or a bot block). The previous index must survive and
    // the run must fail loudly, so the scheduled job doesn't commit an empty
    // source.
    const previous = [{ sourceId: "testsite", url: `${SITE}/old/`, title: "Old Favourite", ingredients: ["x"], tokens: [{ all: ["x"], strict: ["x"] }] }];
    setUp(
      {
        [`${SITE}/sitemap.xml`]: sitemap(`${SITE}/beef-ragu/`, `${SITE}/pea-soup/`),
        [`${SITE}/beef-ragu/`]: "<html>Access denied</html>",
        [`${SITE}/pea-soup/`]: "<html>Access denied</html>",
      },
      previous,
    );

    const run = runBuild();
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("keeping existing data");
    expect(readJson("data/testsite.json")).toEqual(previous);
    expect(readJson("data/manifest.json").sources).toEqual([
      expect.objectContaining({ id: "testsite", count: 1 }),
    ]);
  });

  it("skips recipe pages with no ingredients rather than indexing empty records", () => {
    setUp({
      [`${SITE}/sitemap.xml`]: sitemap(`${SITE}/beef-ragu/`, `${SITE}/empty-shell/`),
      [`${SITE}/beef-ragu/`]: recipePage("Beef Ragu", ["500g beef mince"], "PT1H"),
      [`${SITE}/empty-shell/`]: recipePage("Empty Shell", [], "PT1H"),
    });

    const run = runBuild();
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(readJson("data/testsite.json").map((r) => r.title)).toEqual(["Beef Ragu"]);
  });
});
