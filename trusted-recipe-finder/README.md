# 🍽 Trusted Recipe Finder

An AI-powered recipe finder that suggests recipes based on the ingredients you have. Built with React + Vite for the frontend, and Vercel Functions for the backend scraping API.

## Features

- 🥘 **Ingredient-based search** — enter what you have, get matched recipes
- 🌍 **Cuisine preferences** — filter by British, French, Asian, Indian, Italian, Mediterranean, Mexican
- 📚 **Custom recipe sources** — add any recipe website, toggle active/inactive, delete anytime
- 🗂 **Recipe indexing** — optionally index a source's sitemap so Claude suggests real, verified recipes
- 🫙 **Store cupboard** — define staples that are always assumed present
- 📏 **Metric quantities** — all ingredients returned in grams, ml, etc.
- 🎯 **Match scoring** — see how well each recipe fits your ingredients
- ⚠️ **Missing ingredients** — clearly shown what you'd need to buy
- 🤖 **Bring-your-own AI** — supports Anthropic Claude and OpenAI GPT, you provide the key
- ✓ **Verified recipes** — after AI suggests a recipe, the real ingredients and instructions are fetched directly from the source site (using schema.org structured data), so what you see is what's actually published

## Architecture

```
trusted-recipe-finder/
├── api/
│   ├── scrape.js        ← Vercel Function: fetches & parses recipe site sitemaps
│   ├── suggest.js       ← Vercel Function: AI proxy (Anthropic / OpenAI)
│   └── fetch-recipe.js  ← Vercel Function: extracts real recipe data from a page
├── src/
│   ├── App.tsx          ← top-level orchestration
│   ├── ErrorBoundary.tsx
│   ├── main.tsx
│   ├── components/      ← UI components (TypeScript)
│   │   ├── Header.tsx
│   │   ├── SearchTab.tsx
│   │   ├── SourcesTab.tsx
│   │   ├── CupboardTab.tsx
│   │   ├── SettingsTab.tsx
│   │   └── RecipeCard.tsx
│   └── lib/             ← shared logic (TypeScript)
│       ├── types.ts     ← domain types (Source, Recipe, Provider, ...)
│       ├── constants.ts
│       ├── utils.ts     ← pure helpers
│       ├── storage.ts   ← IndexedDB + localStorage abstraction
│       ├── api.ts       ← backend client
│       └── styles.ts    ← shared style tokens
├── index.html
├── tsconfig.json
├── vite.config.js
├── vercel.json          ← Vercel build + routing config
└── package.json
```

The frontend is a Vite + React app. The backend has three Vercel Functions:

- **`api/scrape.js`** — proxies sitemap requests for recipe site indexing (bypasses browser CORS)
- **`api/suggest.js`** — proxies AI provider requests so user API keys never appear in browser network logs to third-party domains, and so we can swap providers without changing the frontend
- **`api/fetch-recipe.js`** — fetches a recipe page and extracts the real ingredients/instructions from its embedded `schema.org/Recipe` structured data, so that suggestions show genuine recipe content rather than AI-hallucinated ingredients

## Getting Started

### Prerequisites

- Node.js 18+
- An API key from one of the supported AI providers:
  - **Anthropic Claude** — [get a key](https://console.anthropic.com)
  - **OpenAI GPT** — [get a key](https://platform.openai.com/api-keys)
- A Vercel account ([free at vercel.com](https://vercel.com)) — needed for the backend functions

### Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/trusted-recipe-finder.git
cd trusted-recipe-finder

# Install dependencies
npm install

# Install Vercel CLI globally (if not already installed)
npm i -g vercel

# Log in to Vercel
vercel login

# Run frontend + backend together locally
npm run dev:all
```

`npm run dev:all` uses `vercel dev` which runs both the Vite frontend and the API function locally at the same time.

> **Note:** `npm run dev` (Vite only) will work for the UI, but the indexing feature won't work without the Vercel backend running.

### TypeScript

The frontend is fully TypeScript with strict mode enabled. The shared types in `src/lib/types.ts` are the single source of truth for `Source`, `Recipe`, `Provider`, etc. Run `npm run typecheck` to validate types without producing a build. The Vercel Functions in `api/` remain as JavaScript since they're handled separately by Vercel and don't need bundling.

### API Key Setup

Open the app, go to the **Settings** tab:
1. Choose your AI provider (Anthropic or OpenAI)
2. Pick a model
3. Paste your API key

Your key is stored in your browser's localStorage only and is never logged by this app. It is forwarded to the AI provider via the `/api/suggest` proxy on each request and immediately discarded.

## Deploying to Vercel

```bash
# Deploy to production
npm run deploy
```

Or connect your GitHub repo to Vercel at [vercel.com/new](https://vercel.com/new) for automatic deployments on every push.

## How It Works

### Indexing (when you add a source)
1. App calls `api/scrape.js` with the site URL
2. Function finds and parses `sitemap.xml` (handles nested sitemaps)
3. Filters URLs to recipe pages only
4. Returns `{ title, url }` pairs stored alongside the source in IndexedDB

Sources and their indexes are stored in IndexedDB (via the `idb` library) so that large recipe indexes don't hit localStorage's ~5 MB limit. API keys, the store cupboard, and provider preferences remain in localStorage since they're tiny and benefit from synchronous access.

This index is given to the AI as context, so suggestions are grounded in real recipe URLs.

### Suggesting (when you search for recipes)
1. App calls `api/suggest.js` with your ingredients, sources, and AI key
2. The AI picks 3 candidates from the index
3. App immediately calls `api/fetch-recipe.js` for each candidate in parallel
4. Each function fetches the recipe page and extracts the real ingredients/instructions from `schema.org/Recipe` JSON-LD markup
5. AI-generated ingredients are replaced with the real ones — verified recipes show a ✓ badge

If a recipe page can't be fetched or has no structured data, the AI's version is kept and shown with an "AI-only" badge to flag uncertainty.

## Adding Recipe Sources

Go to the **Sources** tab, enter a name and URL, and click **Add**. The app will immediately attempt to index the site. You can also manually trigger re-indexing from the source list at any time.

## Roadmap

- [ ] Save favourite recipes
- [ ] Recipe history
- [ ] Dietary filters (vegetarian, vegan, gluten-free)
- [ ] Serving size adjuster
- [ ] Shopping list generator
- [ ] PWA support

## License

MIT
