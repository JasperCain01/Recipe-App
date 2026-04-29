# Recipe App — Claude Code Guide

## Project Overview

**Trusted Recipe Finder** is a single-page web app that lets users search recipes from their own trusted recipe websites using ingredients they have at home. It requires no AI API keys — all matching is done locally in the browser.

The app is a Vite 8 + React 18 + TypeScript (strict) SPA, deployed to Vercel. The frontend lives in `trusted-recipe-finder/`.

## How It Works

1. **Sources** — The user adds recipe websites (e.g. a favourite food blog). The app indexes the site via a Vercel serverless function (`api/scrape.js`), which returns a list of recipe URLs and titles.
2. **Enrichment** — The user clicks "Enrich now" for a source. The app fetches each recipe page (`api/fetch-recipe.js`) and extracts structured data: ingredients, cooking time, instruction count, meal type, cuisine, servings, and image. This data is stored in IndexedDB.
3. **Search** — The user enters ingredients one at a time, toggling each as Required or Optional. The local search engine (`src/lib/search.ts`) scores every enriched recipe by how many of its ingredients the user has available (entered ingredients + store cupboard). Required ingredients must appear in the recipe; optional ones contribute to the score. Results above 25% match are shown.
4. **Filtering** — Results are displayed in a table with multi-select dropdown filters (meal type, cuisine, time, steps) that filter without re-running the search.

## Key Files

```
trusted-recipe-finder/
  src/
    App.tsx                    # Root — source/search/cupboard state + orchestration
    lib/
      types.ts                 # All shared TypeScript types
      search.ts                # Local ingredient-matching engine
      api.ts                   # Vercel function calls (indexSource, fetchRecipe)
      storage.ts               # IndexedDB (sources) + localStorage (cupboard)
      utils.ts                 # Pure helpers: pickEmoji, deriveMealType, scoreColor, etc.
      styles.ts                # Inline style tokens and shared style helpers
      constants.ts             # DEFAULT_CUPBOARD, TABS
    components/
      SearchTab.tsx            # Ingredient entry UI, results table, column filters
      SourcesTab.tsx           # Add/index/enrich/remove sources
      CupboardTab.tsx          # Edit the store-cupboard ingredient list
      FilterDropdown.tsx       # Reusable multi-select dropdown with keyword search
      RecipeCard.tsx           # Expanded recipe detail (ingredients, link, image)
      Header.tsx               # Tab navigation
  api/
    scrape.js                  # Vercel function: crawls a site for recipe URLs
    fetch-recipe.js            # Vercel function: fetches and parses a single recipe page
```

## Running Locally

```bash
cd trusted-recipe-finder
npm install

# Frontend only (no API calls)
npm run dev

# Frontend + Vercel serverless functions
npm run dev:all
```

Typecheck: `npm run typecheck`
Build: `npm run build`
Deploy: `npm run deploy`

## Git Workflow

- **Every change request gets its own branch** with the prefix `claude_` (e.g. `claude_multi-select-filters`).
- **The branch description must include the user's original prompt** that instigated the branch, verbatim. Set it with: `git branch --edit-description`
- **Commits are small and regular** — commit after each logical unit of work, not just at the end of a request.
- **No need to ask before committing** — commit freely as work progresses.
- **After completing a request**, assess whether the branch is ready to merge into `main`. If the work is complete and the build passes, merge and push without waiting to be asked.

## Code Style

- Inline styles throughout (no CSS files, no Tailwind) — keeps components self-contained.
- No comments unless the *why* is non-obvious.
- No error handling for impossible cases — trust TypeScript and framework guarantees.
- Validate only at system boundaries (user input, Vercel API responses).
- Prefer editing existing files over creating new ones.
