# 🍽 Trusted Recipe Finder

A recipe finder that matches recipes from your own trusted recipe websites against the ingredients you have at home. No AI API keys required — all matching runs locally in the browser. Built with React + Vite for the frontend, with a small backend (Vercel Functions today, an additive Cloudflare Worker alternative) used only for indexing and enriching recipe sites.

## Features

- 🥘 **Ingredient-based search** — enter what you have, get matched recipes, no AI required
- 📚 **Built-in + custom sources** — ships with a curated set of pre-indexed recipe sites (refreshed weekly), plus add any recipe website of your own
- 🫙 **Store cupboard** — define staples that are always assumed present
- ✅ **Required vs optional ingredients** — mark an ingredient as required to hard-filter recipes that don't include it
- 🎯 **Match scoring + threshold** — see how well each recipe fits, with a slider to control the minimum match shown
- ⚠️ **Missing ingredients + shopping list** — clearly shown what you'd need to buy, with one-click copy/share
- 🗂 **Sortable, filterable results table** — filter by meal type, cuisine, time, and step count; sort by any column; responsive card layout on mobile
- ⭐ **Favourites** — star recipes and switch to a favourites-only view
- 🌗 **Dark mode** — follows your OS preference by default, with a manual toggle that's remembered
- ♿ **Accessible** — keyboard navigable, focus-visible outlines, ARIA labelling throughout
- ✓ **Verified recipes** — ingredients, cooking time, and instructions are extracted directly from the source site's structured data (`schema.org/Recipe`), so what you see is what's actually published

## Architecture

```
trusted-recipe-finder/
├── api/                    ← Vercel Functions (current default backend)
│   ├── scrape.js             fetches & parses a site's sitemap
│   └── fetch-recipe.js       extracts structured recipe data from a page
├── worker/                  ← Cloudflare Worker (additive alternative backend, not yet default)
│   ├── index.js               same routes as api/, CORS-locked to the deployed Pages origin
│   └── wrangler.toml
├── shared/                  ← plain ESM, used by both api/, worker/, and scripts/ (no TS toolchain needed)
│   ├── scrape-lib.js          sitemap indexing + schema.org/Recipe extraction
│   ├── tokens.js              ingredient tokenising for search
│   └── recipe-meta.js         meal-type/cuisine/time derivation
├── scripts/
│   ├── build-index.mjs        crawls data/sources.json, writes data/manifest.json + data/<id>.json
│   └── copy-data.mjs          copies data/ into public/data/ before dev/build
├── data/                     ← built-in recipe sources + their pre-enriched output (see below)
├── src/
│   ├── App.tsx               ← top-level orchestration
│   ├── ErrorBoundary.tsx
│   ├── main.tsx
│   ├── components/            ← UI components (TypeScript)
│   │   ├── Header.tsx
│   │   ├── SearchTab.tsx
│   │   ├── SourcesTab.tsx
│   │   ├── CupboardTab.tsx
│   │   ├── IngredientEntryBox.tsx
│   │   ├── FilterDropdown.tsx
│   │   ├── ResultRow.tsx
│   │   └── RecipeCard.tsx
│   └── lib/                   ← shared logic (TypeScript)
│       ├── types.ts             domain types (SourceMeta, RecipeRecord, SearchResult, ...)
│       ├── constants.ts
│       ├── utils.ts              pure helpers
│       ├── search.ts             local ingredient-matching engine
│       ├── storage.ts            IndexedDB (sources + recipes) + localStorage (cupboard, favourites, theme)
│       ├── hooks.ts              shared React hooks (e.g. list virtualisation)
│       ├── api.ts                backend client + built-in data fetch
│       ├── styles.ts             semantic theme tokens + shared style helpers
│       └── ThemeContext.tsx      theme provider (OS detection, manual toggle, persistence)
├── index.html
├── tsconfig.json
├── vite.config.js
├── vercel.json               ← Vercel build + routing config
└── package.json
```

The frontend is a Vite + React app. All ingredient matching happens client-side in `src/lib/search.ts` — no API key, no network call, no AI provider. The backend exists only to fetch pages a browser can't fetch cross-origin:

- **`api/scrape.js`** (or the Worker's equivalent route) — fetches and parses a recipe site's sitemap to build an index of recipe URLs
- **`api/fetch-recipe.js`** (or the Worker's equivalent route) — fetches a recipe page and extracts its real ingredients/instructions/metadata from embedded `schema.org/Recipe` structured data

## Getting Started

### Prerequisites

- Node.js 18+
- For the Vercel backend locally: a [Vercel account](https://vercel.com) (free tier is fine) and the Vercel CLI

### Local Development

```bash
# Clone the repo
git clone https://github.com/JasperCain01/Recipe-App.git
cd Recipe-App/trusted-recipe-finder

# Install dependencies
npm install

# Frontend only — built-in sources still load from public/data, but adding/
# indexing a custom source needs the backend running (see below)
npm run dev
```

To also run the indexing/enrichment backend locally, pick one:

```bash
# Vercel Functions (today's default backend)
npm i -g vercel   # first time only
vercel login      # first time only
npm run dev:all   # runs Vite + the Vercel functions together

# Cloudflare Worker (additive alternative backend)
npm run dev:worker
```

### TypeScript

The frontend is fully TypeScript with strict mode enabled. The shared types in `src/lib/types.ts` are the single source of truth for `SourceMeta`, `RecipeRecord`, `SearchResult`, etc. Run `npm run typecheck` to validate types without producing a build. The backend functions in `api/` and `worker/`, and the shared modules in `shared/`, stay as plain JS since they're consumed directly by Vercel/Cloudflare/Node without bundling.

## Deploying

**Vercel (current default):**

```bash
npm run deploy
```

Or connect the repo to Vercel at [vercel.com/new](https://vercel.com/new) for automatic deployments on every push.

**Cloudflare Worker + GitHub Pages (additive, not yet the default):** `worker/index.js` serves the same two routes as the Vercel functions, restricted by CORS to the origin set in `worker/wrangler.toml`. `.github/workflows/deploy-pages.yml` builds the frontend against that Worker's URL and publishes to GitHub Pages on every push to `main`. This path requires GitHub Pages to be enabled (repo must be public) and a Cloudflare account to deploy the Worker; it hasn't yet replaced the Vercel deployment.

## How It Works

### Built-in sources (on load)
1. The app fetches `data/manifest.json`, a static file listing pre-indexed sources and where their recipe data lives.
2. For any source whose data is newer than what's already stored, the app fetches `data/<id>.json` — pre-enriched, search-ready recipe records — straight into IndexedDB.
3. This data is generated by `scripts/build-index.mjs` and refreshed weekly by a scheduled GitHub Action (`.github/workflows/refresh-index.yml`) — no live scraping needed for these sources.

### Adding a custom source
1. Go to the **Sources** tab, enter a name and URL, and click **Add**.
2. The app calls `api/scrape.js` (or the Worker equivalent), which fetches and parses the site's `sitemap.xml` (handling nested sitemaps) and filters URLs down to recipe pages.
3. The resulting `{ title, url }` pairs are stored as the source's index in IndexedDB.
4. Click **Enrich now** to fetch each recipe page and extract its real ingredients, cooking time, servings, cuisine, meal type, and image from its `schema.org/Recipe` structured data.

Sources and their recipe records live in IndexedDB (via the `idb` library, split across a `sources` metadata store and a `recipes` store) so large indexes don't hit localStorage's ~5 MB limit. The store cupboard, favourites, match threshold, and theme choice are tiny and stay in localStorage for fast synchronous reads.

### Searching
1. Enter ingredients one at a time in the **Search** tab, marking each as Required or Optional.
2. `src/lib/search.ts` scores every enriched recipe (built-in and custom) using precomputed ingredient tokens — required ingredients must be present in the recipe; optional ones contribute to the match score.
3. Results above the match-threshold slider (25% by default) are shown in a sortable, filterable table, with missing ingredients called out and a one-click shopping list.

## Roadmap

- [ ] Dietary filters (vegetarian, vegan, gluten-free)
- [ ] Serving size adjuster
- [ ] PWA support
- [ ] Cut over from Vercel to the Cloudflare Worker + GitHub Pages deployment once verified end-to-end

## License

MIT
