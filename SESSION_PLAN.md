# Session-by-Session Implementation Plan

Companion to `IMPROVEMENTS.md` (item codes E1–E7, U1–U12, B1–B5 refer to it).
All suggestions accepted; **token cost is the optimisation target**. Ordering
principles:

1. **No rework** — schema and data-format decisions land before their consumers.
   Code that a later session deletes (Vercel handlers) is never polished first.
2. **Group by file** — each source file is substantially rewritten in at most
   one session, so no session re-reads work another just did.
3. **Cheapest adequate model** — Sonnet executes; Haiku only where failure is
   near-impossible; Opus/Fable only on the escalation triggers listed.

## Instructions for the executing model (every session)

- Read **only** this file's section for your session, `IMPROVEMENTS.md` items it
  cites, and the files listed under *Read*. Do not explore further unless a step
  fails.
- Work on a fresh branch `claude_s<N>-<slug>` per repo convention (CLAUDE.md);
  record the instigating prompt with `git branch --edit-description`. Commit
  after each numbered step.
- End with the *Validate* block. Every check must pass before merging to `main`
  (CLAUDE.md: merge and push when build passes).
- **Escalate** (stop, report, recommend Opus/Fable) if: a step requires a design
  decision this plan doesn't answer; typecheck/build failures persist after two
  fix attempts; or a migration risks user data loss.

Global commands: `cd trusted-recipe-finder && npm run typecheck && npm run build`.

---

## Session 1 — Data layer rebuild — **Sonnet, ~90–120k**

Implements: E2, E3, E4, U1. Foundation for everything else.

**Read:** `src/lib/storage.ts`, `src/lib/types.ts`, `src/App.tsx`,
`src/components/SearchTab.tsx` (state only), `src/components/SourcesTab.tsx` (props only).

**Steps:**
1. New types in `types.ts`: `SourceMeta` (Source minus `index`/`enrichedIndex`,
   plus `builtin?: boolean` for Session 5) and `RecipeRecord`
   (`{ sourceId, url, title, ...enriched fields, tokens?: string[][] }` —
   `tokens` optional until Session 2 fills it).
2. IndexedDB v2 in `storage.ts`: `sources` store (keyPath `id`, metadata only),
   `recipes` store (keyPath `[sourceId, url]` compound, index on `sourceId`),
   `pending` store or an `index` field on SourceMeta for the un-enriched URL
   list. v1→v2 migration inside the `upgrade` callback: split each old Source
   into meta + recipe records; keep the localStorage-cupboard logic untouched.
3. Replace `saveSources` with `putSource(meta)`, `deleteSource(id)`
   (also deletes its recipes), `putRecipes(records[])`,
   `getRecipesBySource(id)`, `getRecipeUrlsBySource(id)` (keys only, for resume).
4. `App.tsx`: state becomes `SourceMeta[]`. Enrichment loop writes each batch
   via `putRecipes` immediately (replaces the every-10-batches partial save),
   skips URLs already in `recipes` (resume), and checks a cancel ref between
   batches; add a Cancel button next to the progress bar in `SourcesTab`.
   Update enriched counts on the meta record as batches land.
5. Search path: `handleSearch` loads recipes for selected sources from IDB
   (cache in a `useRef` map, invalidated on enrich/remove) and passes them to
   `searchRecipes` — adjust its signature to take
   `{ meta: SourceMeta, recipes: RecipeRecord[] }[]`.
6. U1: lift ingredient `entries` state from `SearchTab` to `App`.

**Validate:** typecheck + build. Manual (`npm run dev:all`): add a source,
start enrichment, reload mid-way, confirm resume skips completed URLs;
cancel works; toggling a source chip is instant; ingredients survive tab
switches; a v1 profile (seed via DevTools if available, else note as untested)
migrates without data loss.

---

## Session 2 — Search engine: precomputed tokens + live search — **Sonnet, ~60–90k**

Implements: E1, U5, U11, B3. Depends on Session 1.

**Read:** `src/lib/search.ts`, `src/lib/types.ts`, `src/App.tsx` (search path),
`src/components/SearchTab.tsx` (search invocation + threshold UI location).

**Steps:**
1. Create `shared/tokens.js` (plain ESM JS + `shared/tokens.d.ts`, so Node
   scripts and Workers can import it without a TS toolchain): move
   `STOPWORDS`, `SYNONYMS`, `stripQuantities`, `tokenise`, `stem`,
   `normTokens`, `stripIngredientNotes` there. Add
   `tokensForIngredientLine(line) → { all: string[], strict: string[] }`
   (strict = notes-stripped variant for required matching). `search.ts`
   re-exports from it.
2. B3: split `SYNONYMS` into a bidirectional-equivalence map and drop or
   one-way-gate lossy pairs (`scallion→onion`, `bacon↔pancetta` stays,
   `capsicum→pepper` one-way).
3. Enrichment (App.tsx) fills `RecipeRecord.tokens` (the `{all, strict}` pairs,
   serialised as arrays) at write time. Legacy records without `tokens`:
   compute on first search and `putRecipes` the result back (lazy migration).
4. Rewrite `searchRecipes` to pure Set operations over precomputed tokens —
   no regex work in the hot loop.
5. U5: in `App.tsx`/`SearchTab`, run search automatically (150ms debounce) on
   any change to entries, required flags, cupboard, or selected sources.
   Remove the Search button; keep error messaging inline.
6. U11: threshold slider (10–90%, default 25) above results; pass to
   `searchRecipes`; persist in localStorage.

**Validate:** typecheck + build. `console.time` a search over the largest
enriched source before/after (expect ≥10× faster; remove timers after).
Manual: results update as you type; slider filters live; legacy (token-less)
records still match and get upgraded in IDB.

---

## Session 3 — Shared scrape library — **Sonnet, ~50–70k**

Implements: E5, B1 (in the new code path). Prereq for Sessions 4 and 6.

**Read:** `api/scrape.js`, `api/fetch-recipe.js`.

**Steps:**
1. Create `shared/scrape-lib.js` (plain ESM): `indexSite(baseUrl, fetchImpl)`
   (sitemap discovery → recursive resolve → filter → `{recipes, count}`) and
   `extractRecipeFromHtml(html, url)` (JSON-LD walk → normalised recipe).
   Pure functions, injected `fetch`, no `req`/`res`.
2. E5 inside the lib: hoist `hasRecipePaths` out of the filter callback;
   fetch child sitemaps with `Promise.allSettled` (concurrency ~5).
3. Rewrite both `api/*.js` as thin handlers over the lib, with CORS/OPTIONS
   handled **before** the method check (B1).
4. Delete the no-op rewrite from `vercel.json` (B4).

**Validate:** `npm run dev:all`, then curl both endpoints against a real site
(e.g. recipetineats.com) — index returns >100 recipes in well under 10s;
fetch-recipe returns ingredients for one of them; `curl -X OPTIONS` returns
200 with CORS headers on both.

---

## Session 4 — Build script + scheduled Action — **Sonnet, ~50–80k**

Implements the pipeline build half of §4. Depends on Sessions 2 (tokens) and 3.

**Read:** `shared/scrape-lib.js`, `shared/tokens.js`, `IMPROVEMENTS.md` §4.

**Steps:**
1. `data/sources.json`: 2–3 defaults (e.g. RecipeTin Eats, BBC Good Food) —
   `{ id, name, url, emoji }`. Check robots.txt permits crawling; note result
   in the commit message.
2. `scripts/build-index.mjs` (plain Node, no new deps): for each source,
   `indexSite` → fetch pages with concurrency 3 + 500ms batch delay + 2
   retries → `extractRecipeFromHtml` → attach `tokens` via `shared/tokens.js`
   → write `data/<id>.json` (recipes array) and `data/manifest.json`
   (`{ generated_at, sources: [{id, name, url, emoji, count, file, updated_at}] }`).
   `--source <id>` flag for single-source runs; exit non-zero only if *all*
   sources fail; print a per-source success/fail summary.
3. `.github/workflows/refresh-index.yml`: weekly cron + `workflow_dispatch`;
   run script; commit `data/` only if `git status` shows changes
   (commit message `chore(data): refresh recipe index`).
4. Copy `data/` into the Vite build (`public/data` symlink or a small copy
   step in the build script) so the app can fetch it same-origin.

**Validate:** run `node scripts/build-index.mjs --source <smallest>` locally;
inspect JSON (ingredients non-empty, tokens present, count matches summary).
Push, trigger `workflow_dispatch`, confirm the Action commits data.

---

## Session 5 — Built-in sources in the app — **Sonnet, ~40–60k**

Implements the app half of §4 + U8. Depends on Sessions 1 and 4.

**Read:** `src/App.tsx`, `src/lib/storage.ts`, `src/lib/api.ts`,
`src/components/SourcesTab.tsx`, `data/manifest.json` (generated).

**Steps:**
1. `api.ts`: `fetchManifest()` and `fetchBuiltinSource(file)` against
   `/data/…` static paths.
2. On app start: fetch manifest (silently skip if 404/offline); for each
   entry newer than the stored `updated_at`, import meta (`builtin: true`,
   active by default on first import only) + recipe records into IDB.
3. `SourcesTab`: builtin sources render with a "built-in · updated <date>"
   badge, toggle + hide (not delete) available, no Index/Enrich/Remove buttons.
4. U8: Search-tab empty state now says defaults are ready; keep the
   add-your-own pointer for the Sources tab.

**Validate:** typecheck + build. Clear site data, reload: defaults appear
already searchable with zero network calls to `/api/*`; a user-added source
still indexes/enriches; bump a manifest timestamp locally and confirm
re-import.

---

## Session 6 — Cloudflare Worker + GitHub Pages deploy — **Sonnet, ~60–90k**

Implements §3 option A + E7 equivalent. Depends on Sessions 3–5.
**Manual prerequisites (user):** Cloudflare account + `wrangler login`;
enable Pages (Settings → Pages → GitHub Actions) on the repo.

**Read:** `shared/scrape-lib.js`, `api/*.js`, `src/lib/api.ts`,
`vite.config.js`, `package.json`.

**Steps:**
1. `worker/` with `wrangler.toml` + `worker/index.js`: routes
   `/api/scrape` and `/api/fetch-recipe` over the shared lib; CORS restricted
   to the Pages origin (env var) + localhost; cache successful fetch-recipe
   responses in the Worker Cache API for 24h (E7).
2. `src/lib/api.ts`: prefix paths with `import.meta.env.VITE_API_BASE ?? ""`.
3. `.github/workflows/deploy-pages.yml`: build with
   `VITE_API_BASE` repo variable, `base` set for project pages (or `/` if
   custom domain), upload `dist/`, `actions/deploy-pages`.
4. After the Pages site is verified end-to-end: delete `api/`, `vercel.json`,
   and the `vercel` devDependency; update `dev:all` to `wrangler dev` + vite.

**Validate:** `wrangler dev` + curl both routes; deployed Pages site loads
builtin sources, and adding a *user-defined* source indexes + enriches through
the Worker. Only then remove Vercel files, re-run typecheck + build.
**Escalate** rather than guess if Pages/Worker auth or DNS blocks progress.

---

## Session 7 — Results table overhaul — **Sonnet, ~80–120k**

Implements: U2, U3, U6, E6, B2. Depends on Sessions 1–2 (App/SearchTab APIs stable).

**Read:** `src/components/SearchTab.tsx`, `src/components/RecipeCard.tsx`,
`src/lib/styles.ts`, `src/lib/utils.ts`.

**Steps:**
1. Extract a memoised `ResultRow` component; key rows by `r.sourceUrl` (B2);
   expansion state keyed by URL, not index.
2. `useMemo` filter options + filtered/sorted results (E6).
3. U6: clickable sort headers (Match default desc; Time, Steps, Title);
   arrow indicator; sort applied before virtualisation.
4. U3: 40px `loading="lazy"` thumbnail (fallback emoji block) leading each row.
5. U2: track viewport via `matchMedia` (~640px). Narrow layout = card per
   result: thumbnail, title, match %, missing count, meta as wrapped chips;
   filters collapse into a single "Filters" disclosure. Ensure ≥40px tap targets.
6. E6: virtualise the desktop list when results > 200 — prefer a small
   windowing hook (~30 lines) over adding `react-window` to keep deps flat;
   use the dependency only if the hook proves fiddly.

**Validate:** typecheck + build. Manual at 375px and 1280px; expand/collapse
correct while filtering + sorting; generate/enrich a large source and confirm
smooth scrolling with 500+ results.

---

## Session 8 — Ingredient entry + one-step add — **Sonnet, ~70–100k**

Implements: U4, U7. Depends on Sessions 1, 2, 5 (SourcesTab final shape).

**Read:** `src/components/SearchTab.tsx` (entry section), `src/App.tsx`,
`src/components/SourcesTab.tsx`, `src/lib/storage.ts` (recipe access).

**Steps:**
1. U4: single input + chip list replacing stacked inputs. Enter/comma adds a
   chip; click toggles Required/Optional (visual distinction); × removes;
   Backspace on empty input removes last. Keep `IngredientEntry` shape so
   search is untouched.
2. Autocomplete: build a ranked ingredient vocabulary once per session from
   recipe tokens (top ~500 by frequency, cached in a ref); show ≤6 matches
   under the input; keyboard up/down/enter; plus a static quick-add row of
   ~10 staples.
3. U7: `addSource` chains index → enrich automatically with one combined
   progress line ("Adding X… 340/1,900 ready — searchable now"); results
   include partially-enriched sources (Session 1 made writes incremental).
   Keep Re-index / Re-enrich as advanced buttons.

**Validate:** typecheck + build. Manual: chip flows incl. keyboard-only;
autocomplete suggests from enriched data; adding a fresh source becomes
searchable before enrichment completes.

---

## Session 9 — a11y + favourites + shopping list — **Sonnet, ~70–110k**

Implements: U10, U9. Depends on Sessions 7–8 (final component shapes).

**Read:** `src/components/FilterDropdown.tsx`, `src/components/SearchTab.tsx`,
`src/components/RecipeCard.tsx`, `src/lib/styles.ts`, `src/lib/storage.ts`.

**Steps:**
1. U10: FilterDropdown — `aria-expanded`/`aria-haspopup`, Escape closes,
   arrow-key navigation, focus trap while open. Raise minimum font sizes to
   0.7rem; add `:focus-visible` outlines (inline `onFocus` style or a tiny
   injected stylesheet in `styles.ts`); `aria-label` on icon-only buttons;
   fix grey-on-white contrast to ≥4.5:1.
2. U9: `favourites` in localStorage keyed by recipe URL; star toggle on rows
   + RecipeCard; "Favourites" filter chip above results (shows favourites
   even at 0 ingredients entered).
3. Shopping list: "Copy missing ingredients" button on RecipeCard
   (`navigator.clipboard`, with textarea fallback) + Web Share API where available.

**Validate:** typecheck + build. Keyboard-only walkthrough of search → filter
→ expand → favourite → copy. Contrast spot-check on the new tokens.

---

## Session 10 — Dark mode — **Sonnet, ~50–70k**

Implements: U12. Last because it touches every component superficially.

**Read:** `src/lib/styles.ts`, then each component only while replacing literals.

**Steps:**
1. Consolidate every hex literal into semantic tokens in `styles.ts`
   (`text.primary`, `surface`, `border`, `accent`, `danger`, `success`, …) —
   mechanical sweep, one commit per component.
2. Dark palette; theme from `prefers-color-scheme`, overridable by a Header
   toggle persisted in localStorage; expose via a small ThemeContext returning
   the token object.

**Validate:** typecheck + build. Both themes at both breakpoints; no leftover
hex literals (`grep -rn "#[0-9A-Fa-f]\{6\}" src/ --include=*.tsx` returns only
styles.ts).

---

## Session 11 — Docs refresh — **Haiku, ~10–20k**

**Read:** `CLAUDE.md`, `README.md` (root + app), `SESSION_PLAN.md` (skim).

Update CLAUDE.md's architecture/How-It-Works/Key-Files/commands for: builtin
data pipeline, Worker API, Pages deploy, removed Vercel. Update READMEs.
Purely descriptive writing against the now-true codebase — the one genuinely
Haiku-safe session. **Validate:** every command quoted in the docs actually runs.

---

## Dependency graph & totals

```
S1 ─→ S2 ─→ S4 ─→ S5 ─→ S6 ─→ S11
 │     └──────→ S7 → S9 → S10
 │     └──────→ S8 ↗
 └─ S3 ─→ S4, S6          (S3 independent of S1/S2 — can run any time first)
```

| # | Session | Model | Est. tokens |
|---|---------|-------|------------|
| 1 | Data layer rebuild | Sonnet | 90–120k |
| 2 | Search tokens + live search | Sonnet | 60–90k |
| 3 | Shared scrape lib | Sonnet | 50–70k |
| 4 | Build script + Action | Sonnet | 50–80k |
| 5 | Built-in sources loader | Sonnet | 40–60k |
| 6 | Worker + Pages | Sonnet | 60–90k |
| 7 | Results table overhaul | Sonnet | 80–120k |
| 8 | Ingredient entry + one-step add | Sonnet | 70–100k |
| 9 | a11y + favourites | Sonnet | 70–110k |
| 10 | Dark mode | Sonnet | 50–70k |
| 11 | Docs refresh | Haiku | 10–20k |
| | **Total** | | **~630–930k** |

Opus/Fable appear nowhere as executors — the design decisions are encoded in
this plan; they're on call only via the escalation rule at the top.
