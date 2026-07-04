# Trusted Recipe Finder — App Review & Improvement Plan

Review date: 2026-07-04. Covers efficiency, UI/UX, hosting (GitHub Pages), and a
pre-indexed data pipeline. No code has been changed — this is the plan only.

**Effort key** (approximate Claude Code usage per item, including reading,
implementation, and verification):

| Size | Meaning | Typical token usage |
|------|---------|--------------------|
| S | Under an hour, one focused change | ~10–40k |
| M | A solid session, touches several files | ~50–120k |
| L | Multi-session, architectural | ~150–300k+ |

---

## 1. Efficiency

### E1. Pre-compute ingredient tokens at enrichment time — **M (~40–60k)**
`search.ts` re-tokenises every ingredient line of every recipe on **every
search**: `tokenise` + `normTokens` per line, and the required-ingredient check
re-tokenises each line again per required ingredient (`stripIngredientNotes` →
`tokenise` → `normTokens` inside a nested `every/some`). With 2,000 enriched
recipes × ~10 lines that's 20,000+ regex-heavy tokenisations per keystroke-search.

**Fix:** compute the normalised token set (and the notes-stripped variant for
required matching) once at enrichment time and store it on `EnrichedEntry`
(e.g. `tokens: string[][]`). Search becomes pure set intersection — fast enough
to run live on every input change (enables U5). Add a lazy migration for
already-enriched data (tokenise on first load, write back).

### E2. Stop rewriting the entire IndexedDB store on every save — **S (~15–25k)**
`storage.saveSources` does `clear()` then re-`put`s **every** source — including
their full enriched indexes — on every toggle, add, or remove. Toggling a chip
re-serialises potentially tens of MB. **Fix:** add `saveSource(source)` /
`deleteSource(id)` that touch only the changed record; keep `saveSources` for
bulk import only.

### E3. Keep heavy recipe data out of React state — **M (~60–100k)**
The full `sources` array (with every enriched recipe) lives in `App` state and
is copied on every state update, and passed as props into both tabs. **Fix:**
split IndexedDB into a light `sources` store (metadata: name, url, counts,
timestamps) and a `recipes` store keyed by source id. React state holds only
metadata; search loads recipe records from IDB (or a module-level cache) when
needed. Pairs naturally with E1/E4.

### E4. Resumable, incremental enrichment — **M (~50–80k)**
Enrichment always starts from URL 0. If it fails at 800/1000 (tab closed, rate
limited), "Re-enrich" refetches everything. **Fix:** key enriched records by
recipe URL; skip URLs already enriched; after a re-index, enrich only new URLs;
offer "retry failed only". Also add a Cancel button (an `AbortController` flag
checked between batches).

### E5. Fix O(n²) loop + serial fetches in `api/scrape.js` — **S (~10–15k)**
In `filterRecipeUrls`, `hasRecipePaths` is computed via `urls.some(...)`
**inside** the filter callback → O(n²) over up to tens of thousands of sitemap
URLs. Hoist it out. Also child sitemaps are fetched serially — fetch them with
`Promise.allSettled` to fit comfortably inside the free-tier 10s budget
(`maxDuration: 60` needs Vercel Pro, so free-tier timeouts are a real risk today).

### E6. Memoise + virtualise the results table — **S–M (~30–60k)**
`SearchTab` rebuilds filter options and `filteredResults` on every render, rows
are keyed by array index, and 1,000+ inline-styled rows render eagerly.
**Fix:** `useMemo` the derived data, key rows by `r.sourceUrl`, extract a
memoised `ResultRow`, and virtualise with `react-window` above ~200 rows.

### E7. HTTP caching on the API — **S (~10–15k)**
Add `Cache-Control: s-maxage=86400, stale-while-revalidate` to
`fetch-recipe`/`scrape` responses so Vercel's edge cache absorbs repeat
enrichment of the same URLs across users/sessions.

---

## 2. UI / UX

### U1. Don't lose search inputs when switching tabs — **S (~15–20k)** ⭐ quick win
`SearchTab` is conditionally unmounted, so entered ingredients (local state)
vanish if the user visits Sources or Cupboard mid-flow. Lift `entries` into
`App` (results already live there) or keep tabs mounted with `display: none`.

### U2. Mobile / responsive layout — **M (~60–100k)** ⭐ highest UX impact
The results header/rows use fixed pixel columns (52/96/104/88/60px) — on a
phone (where a "what's in my fridge" app mostly lives) the table overflows.
Below a breakpoint, collapse rows into cards: title + match% + missing count,
with meta as small chips. Also enlarge tap targets (many controls are
0.6–0.68rem).

### U3. Thumbnails + visual polish in results — **S–M (~30–50k)**
Recipe image URLs are already captured but only shown when expanded. A 40px
lazy-loaded (`loading="lazy"`) thumbnail per row makes results dramatically
more scannable and engaging. Add hover states and a subtle match-score bar.

### U4. Better ingredient entry — **M (~50–80k)**
Replace stacked inputs with a single input + chips: type, press Enter, get a
chip; click chip to toggle Required/Optional; × to remove. Add autocomplete
sourced from the enriched-index ingredient vocabulary (you already have the
data) plus quick-add buttons for common proteins/veg.

### U5. Live search — **S (~15–25k, after E1)**
Once tokens are precomputed (E1), search is cheap enough to re-run on every
entry/toggle/source change — no Search button needed (keep it as a no-op
fallback). Instant feedback is the single biggest "feels modern" change.

### U6. Sortable columns — **S (~20–30k)**
Results only sort by match score. Make Match/Time/Steps/Title clickable sort
headers, keeping match-desc as default.

### U7. One-step "Add source" pipeline — **M (~40–70k)**
Index and Enrich are separate developer-facing concepts; users just want the
site searchable. On Add: index → auto-enrich with one combined progress bar
("Adding RecipeTin Eats… 340/1,900 recipes ready — searchable now"), searchable
incrementally as enrichment streams in. Keep Re-index/Re-enrich as advanced
actions.

### U8. Onboarding / empty state — **S (~20–30k)**
First-run: suggest 2–3 known-good default sources as one-click buttons on the
Search tab. Becomes near-instant when combined with the prebuilt data pipeline
(§4) — new users get search results in seconds instead of a 10-minute enrich.

### U9. Favourites + shopping list — **M (~50–80k)**
Star recipes (persisted, own filter/tab). "Copy missing ingredients" /
share-as-shopping-list from an expanded recipe — a natural next step after
"what can I cook".

### U10. Accessibility & keyboard support — **S–M (~30–50k)**
`FilterDropdown` has no keyboard support (no Escape/arrows, no
`aria-expanded`); several labels are 0.6rem; grey-on-white metadata is
low-contrast; icon-only buttons rely on `title`. Add aria attributes, Escape
handling, focus-visible states, and bump minimum font sizes.

### U11. Match threshold + score explanation — **S (~15–20k)**
The 25% cutoff is hardcoded. Expose a small slider ("show matches above N%")
and a tooltip explaining how the score is computed.

### U12. Dark mode — **M (~40–60k)**
Colours are hex literals scattered through every component. First consolidate
them into semantic tokens in `styles.ts` (worth doing regardless), then add a
dark palette + toggle persisted in localStorage.

---

## 3. Hosting on GitHub Pages

**Short answer: yes — the frontend is trivially Pages-hostable; the only
blocker is the two Vercel functions, which exist purely because browsers can't
fetch third-party recipe sites directly (CORS).**

| Option | What it means | Effort |
|--------|---------------|--------|
| **A. Pages + prebuilt data + small worker (recommended)** | Default sources served as static JSON built by a GitHub Action (§4). User-defined sources go through a Cloudflare Worker (free tier: 100k req/day) hosting ports of `scrape`/`fetch-recipe`. Vercel is fully retired. | Pages setup **S (~15–25k)** + worker port **S–M (~30–60k)** |
| B. Pages frontend + keep Vercel API | Deploy `dist/` to Pages, point `api.ts` at the absolute Vercel URL. CORS is already `*`, **but** `scrape.js` returns 405 to OPTIONS preflights before setting CORS headers (bug B1 below) — must fix first. Two deployments to maintain. | **S (~15–25k)** incl. the CORS fix |
| C. Fully static with public CORS proxies | No backend at all; route fetches via corsproxy.io etc. | Not recommended — unreliable, rate-limited, sends browsing data to a third party |

Pages mechanics (all in option A/B's estimate): set Vite `base` (or use a
custom domain), add a `deploy-pages` workflow, no SPA-router 404 handling
needed since the app has no routes.

---

## 4. Pre-indexed data pipeline (scheduled GitHub Action)

Your instinct is right and it's the best single architectural improvement:
default sources become instant (no 10-minute enrich on first use), recipe
sites get scraped once per week by one Action instead of by every user, and it
unlocks fully-static hosting.

**Format recommendation: JSON (or NDJSON), not CSV.** Ingredients and
instructions are arrays; CSV forces escaping/JSON-in-a-cell and buys nothing —
the app consumes it programmatically either way. If you want spreadsheet
eyeballing, emit a flattened `summary.csv` (title, url, cuisine, time, n
ingredients) as a by-product.

### Architecture

```
data/
  sources.json            # config: default sites to index (name, url, emoji)
  manifest.json           # generated: per-source counts + timestamps + file list
  recipetineats.json      # generated: enriched recipes incl. precomputed tokens
  bbcgoodfood.json        # ...
scripts/
  build-index.mjs         # Node script reusing the shared scrape/extract lib
shared/
  scrape-lib.js           # sitemap crawl + JSON-LD extraction, refactored out of api/*.js
.github/workflows/
  refresh-index.yml       # cron (weekly) + workflow_dispatch → run script → commit if changed
```

- **Shared lib refactor** — extract the pure logic from `api/scrape.js` and
  `api/fetch-recipe.js` into `shared/`, imported by the Vercel/Worker handlers
  *and* the build script. One implementation, three consumers. **M (~50–80k)**
- **Build script + Action** — crawls each configured source with polite rate
  limiting, retries, and a failure report; writes per-source JSON +
  `manifest.json`; commits only when content changed. Weekly cron +
  manual `workflow_dispatch`. **M (~40–60k)**
- **App-side loader** — on startup, fetch `manifest.json` (a static asset on
  Pages); import new/updated built-in sources into IndexedDB flagged
  `builtin: true` (toggleable, no Enrich button, refreshed when the manifest
  timestamp advances). User-defined sources keep the existing runtime flow
  untouched. **M (~40–60k)**
- **Bonus synergy:** the Action precomputes search tokens (E1) at build time,
  so default sources ship search-ready.

**Total: L (~150–220k across 3 sessions).** Considerations: repo size is fine
(2,000 recipes ≈ 3–5 MB JSON per source; use a `data` branch or squashed
commits if history growth bothers you); respect robots.txt/ToS of the default
sites; weekly staleness is fine for recipe blogs.

---

## 5. Bugs & small fixes spotted during review — **S (~15–25k for the lot)**

- **B1** `api/scrape.js` rejects non-POST **before** the OPTIONS/CORS handling,
  so cross-origin preflights get a 405 without CORS headers. Latent today
  (same-origin) but breaks option 3B the moment the frontend moves off Vercel.
  `fetch-recipe.js` has the order right.
- **B2** Results rows keyed by array index — expanding a row then changing a
  filter re-associates state with the wrong recipe (currently masked by
  resetting `expandedIndex` on filter change). Key by `sourceUrl`.
- **B3** `SYNONYMS` maps `scallion → onion` one-way — a recipe needing
  scallions matches anyone holding a regular onion. Consider a separate
  "close-enough" tier or drop the pair.
- **B4** `vercel.json` rewrite `/api/(.*) → /api/$1` is a no-op; remove.
- **B5** `scrape.js` `maxDuration: 60` needs Vercel Pro; on the free tier large
  sitemap-index sites can time out at 10s (mitigated by E5's parallel fetches).

---

## 6. Suggested roadmap

| Phase | Contents | Total effort |
|-------|----------|--------------|
| **1. Quick wins** | U1, E2, E5, B1–B5, U6, U11 | ~1 session (~80–120k) |
| **2. Data pipeline + Pages** | shared lib, Action, app loader, Pages deploy, Worker port (§3A + §4) | ~3 sessions (~200–280k) |
| **3. Search feel** | E1 (or free via pipeline), U5, U4, E6 | ~2 sessions (~120–180k) |
| **4. UI overhaul** | U2, U3, U7, U8, U10 | ~2–3 sessions (~180–280k) |
| **5. Nice-to-haves** | U9, U12, E3, E4, E7 | as desired |

Phases 1–3 transform the app's economics and feel; phase 2 is the one that
removes the Vercel dependency and makes onboarding instant.
