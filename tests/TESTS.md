# What the tests protect

There are 17 vitest tests in `tests/`. Run them with `npm test`. They take about 7 seconds, most of it a deliberate retry delay in one sitemap test. No CI workflow runs them yet.

## Why these tests, and not others

The app has no other tests. These cover the one part of the project that runs with nobody watching: the weekly `refresh-index.yml` job. It crawls each source's sitemap, extracts every recipe page, and commits and deploys the resulting `data/*.json` without review. A defect in the scraper or the index builder ships a broken or emptied recipe index to every user. A defect in the React UI, by contrast, is visible the moment someone opens the page. So the tests sit on `shared/scrape-lib.js`, `shared/recipe-meta.js` and `scripts/build-index.mjs`, and none sit on the components.

The fixtures are small synthetic pages and sitemaps modelled on the structures real recipe sites use (Yoast/Rank Math `@graph`, `HowToStep`, sitemap indexes declared in `robots.txt`). They are not copies of real pages, which are copyrighted, so they can't show that a specific site still has the shape they model. A change in a real site's markup will still only surface in the build log's failure counts.

Severity describes what goes wrong for users if the guarded behaviour breaks:

- **High**: the shipped index is wrong, emptied or missing recipes.
- **Medium**: some recipes are degraded.
- **Low**: a message is wrong.

## `scrape-lib.test.js`: extracting recipes and finding recipe URLs

| Test | Purpose | Severity |
|---|---|---|
| finds a Recipe inside a Yoast-style @graph and normalises every field | The full shape `extractRecipeFromHtml` returns, from the nested layout most WordPress recipe sites use: title, trimmed description, image from an ImageObject array, ISO durations formatted, array fields joined, ingredients, steps, nutrition and author. | High |
| expands named HowToSection instructions into their steps (`it.fails`, **known bug**) | Sectioned methods (`HowToSection` with a `name`) currently come back as their section titles, with every step inside them lost, because `asStringArray()` checks `name` before `itemListElement`. Pinned as an expected failure so the suite stays green. When the bug is fixed this test will report itself; change `it.fails` to `it`. | High |
| skips an unparseable JSON-LD block and a non-recipe block to find the recipe after them | One malformed block on a page doesn't hide its recipe; `@type` arrays are recognised. | Medium |
| formats ISO durations, falls back to cookTime, and passes non-ISO text through | `PT1H30M` → `1h 30m`, which `recipe-meta` then converts to minutes for the time filter. | Medium |
| throws distinct errors for a page with no structured data and one with no Recipe | The build log can tell "page blocked or redesigned" from "not a recipe page". | Low |
| follows robots.txt to a sitemap index and keeps only on-site recipe URLs | Sitemap discovery through `robots.txt` and a sitemap index; de-duplication; tag pages, assets, other sites and look-alike domains (`evilgood.example`) excluded; titles derived from slugs. | High |
| keeps root-level recipe slugs when a site has only a single /recipes/ hub page | Regression: one `/recipes/` URL on a root-level-slug site such as RecipeTin Eats once reduced the whole index to that hub page. | High |
| still indexes the other child sitemaps when one keeps failing, and records why | A rate-limited child sitemap is retried three times, then reported, without losing the others. | High |
| fails with the list of places it looked when no sitemap exists | | Low |

## `recipe-meta.test.js`: fields derived for every indexed recipe

| Test | Purpose | Severity |
|---|---|---|
| reads every format scrape-lib's duration formatter produces | `1h 30m`, `2h` and `45 mins` convert to minutes. The two modules must agree on the format, because the build pipes one into the other. | Medium |
| returns null rather than 0 for a missing or unreadable time | 0 minutes would make a recipe match every "under N minutes" filter. | Medium |
| maps category and keyword text to a meal type | | Medium |
| matches whole words, so 'side' in 'sideways' or 'pie' in 'piece' do not count | | Low |
| returns null when there is nothing to go on | | Low |

## `build-index.test.js`: the weekly build, end to end

Each test runs the real `scripts/build-index.mjs` as a child process, in a throwaway copy of the repository layout, with `fetch` replaced by a fake site (`support/fake-fetch.mjs`). No network is used, and the real `data/` is never touched.

| Test | Purpose | Severity |
|---|---|---|
| writes search-ready records and a manifest entry for a working site | The record shape the app reads: source, URL, ingredients, meal type, time in minutes, step count, and the per-line search tokens. The manifest gets the right count and file. | High |
| never overwrites good data with an empty result when every recipe page fails | If a site starts blocking the crawler or changes its markup, every page fails. The previous index must survive, and the run must exit non-zero so the scheduled job doesn't commit an emptied source. | High |
| skips recipe pages with no ingredients rather than indexing empty records | | Medium |
