import { useState, useEffect, useRef } from "react";
import { getStyles, globalCss } from "./lib/styles";
import { useTheme } from "./lib/ThemeContext";
import { DEFAULT_CUPBOARD } from "./lib/constants";
import { pickEmoji, normaliseUrl, makeId, deriveMealType } from "./lib/utils";
import { storage } from "./lib/storage";
import { indexSource, fetchRecipe, fetchManifest, fetchBuiltinSource } from "./lib/api";
import { searchRecipes } from "./lib/search";
import { tokensForIngredientLine, tokenise } from "../shared/tokens.js";
import { parseTimeToMinutes } from "../shared/recipe-meta.js";
import Header from "./components/Header";
import SearchTab from "./components/SearchTab";
import SourcesTab from "./components/SourcesTab";
import CupboardTab from "./components/CupboardTab";
import type { IndexEntry, IngredientEntry, RecipeRecord, SearchResult, SourceMeta, Tab } from "./lib/types";

// How many recipe pages to fetch simultaneously during enrichment
const ENRICH_CONCURRENCY = 5;
// Polite delay (ms) between enrichment batches
const ENRICH_DELAY_MS = 300;
// Debounce for live search as the user types/toggles ingredients
const SEARCH_DEBOUNCE_MS = 150;
const DEFAULT_MATCH_THRESHOLD = 25;
// Top-N ingredient words (by frequency) kept for the autocomplete vocabulary
const VOCABULARY_SIZE = 500;

export default function App() {
  const { theme, tokens, toggleTheme } = useTheme();
  const styles = getStyles(tokens);

  // ── Search state ──────────────────────────────────────────────────────────
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>("");
  const nextEntryId = useRef(1);
  const [entries, setEntries] = useState<IngredientEntry[]>([]);
  const [matchThreshold, setMatchThreshold] = useState<number>(DEFAULT_MATCH_THRESHOLD);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // U4 autocomplete: ranked ingredient vocabulary built once per session from enriched recipe data.
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  // U9: favourites, keyed by recipe URL.
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [showFavouritesOnly, setShowFavouritesOnly] = useState<boolean>(false);

  // ── Source state ──────────────────────────────────────────────────────────
  const [sources, setSources] = useState<SourceMeta[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [newSourceName, setNewSourceName] = useState<string>("");
  const [newSourceUrl, setNewSourceUrl] = useState<string>("");
  const [sourceError, setSourceError] = useState<string>("");
  const [sourceSuccess, setSourceSuccess] = useState<string>("");
  const [indexing, setIndexing] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [sourcesLoaded, setSourcesLoaded] = useState<boolean>(false);
  const clearMessagesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enrichCancelRef = useRef<boolean>(false);
  // Recipe records loaded from IndexedDB, cached per source until enrich/remove invalidates them.
  const recipeCacheRef = useRef<Map<string, RecipeRecord[]>>(new Map());

  // ── Cupboard state ────────────────────────────────────────────────────────
  const [cupboard, setCupboard] = useState<string[]>(DEFAULT_CUPBOARD);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("search");

  // ── Load persisted state on mount ─────────────────────────────────────────
  useEffect(() => {
    const cup = storage.loadCupboard();
    if (cup) setCupboard(cup);

    const threshold = storage.loadMatchThreshold();
    if (threshold !== null) setMatchThreshold(threshold);

    const favs = storage.loadFavourites();
    if (favs) setFavourites(new Set(favs));

    storage.loadSourceMetas().then(async (src) => {
      if (src && src.length > 0) {
        setSources(src);
        setSelectedSources(src.filter((s) => s.active).map((s) => s.id));
      }
      setSourcesLoaded(true);
      const merged = await importBuiltinSources(src ?? []);
      buildVocabulary(merged);
    });
  }, []);

  useEffect(
    () => () => {
      if (clearMessagesTimerRef.current) clearTimeout(clearMessagesTimerRef.current);
    },
    [],
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const errorMessage = (e: unknown): string =>
    e instanceof Error ? e.message : String(e);

  const scheduleClearMessages = (): void => {
    if (clearMessagesTimerRef.current) clearTimeout(clearMessagesTimerRef.current);
    clearMessagesTimerRef.current = setTimeout(() => {
      setSourceSuccess("");
      setSourceError("");
      clearMessagesTimerRef.current = null;
    }, 5000);
  };

  const invalidateRecipeCache = (id: string): void => {
    recipeCacheRef.current.delete(id);
  };

  const getRecipesCached = async (id: string): Promise<RecipeRecord[]> => {
    const cached = recipeCacheRef.current.get(id);
    if (cached) return cached;
    const recs = await storage.getRecipesBySource(id);

    // Lazily migrate any pre-Session-2 records that lack precomputed tokens.
    const toPersist: RecipeRecord[] = [];
    const upgraded = recs.map((r) => {
      if (r.tokens) return r;
      const withTokens: RecipeRecord = { ...r, tokens: r.ingredients.map(tokensForIngredientLine) };
      toPersist.push(withTokens);
      return withTokens;
    });
    if (toPersist.length > 0) await storage.putRecipes(toPersist);

    recipeCacheRef.current.set(id, upgraded);
    return upgraded;
  };

  const saveCupboard = (items: string[]): void => {
    setCupboard(items);
    storage.saveCupboard(items);
  };

  const setThreshold = (value: number): void => {
    setMatchThreshold(value);
    storage.saveMatchThreshold(value);
  };

  const toggleFavourite = (url: string): void => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      storage.saveFavourites([...next]);
      return next;
    });
  };

  // ── Ingredient entries (U1: lifted out of SearchTab so they survive tab switches) ──
  // U4: chip model — entries only ever hold committed (non-blank) ingredients;
  // the in-progress text being typed lives as local state inside SearchTab.
  const addIngredient = (text: string): void => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (entries.some((e) => e.text.toLowerCase() === trimmed.toLowerCase())) return;
    setEntries((prev) => [...prev, { id: String(nextEntryId.current++), text: trimmed, required: true }]);
  };

  const toggleRequired = (index: number): void => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, required: !e.required } : e)));
  };

  const removeEntry = (index: number): void => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Sources ───────────────────────────────────────────────────────────────
  /** Patch one source's metadata in state and persist just that record to IndexedDB. */
  const updateSource = (id: string, patch: Partial<SourceMeta>): void => {
    setSources((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      const updated = next.find((s) => s.id === id);
      if (updated) storage.putSource(updated);
      return next;
    });
  };

  /**
   * Import/refresh built-in (prebuilt) sources from the static data pipeline
   * (data/manifest.json + data/<id>.json, built weekly by an Action). Silently
   * does nothing if the manifest is unreachable (offline, 404, first deploy
   * before any data has been built). Only re-fetches a source's recipe file
   * when the manifest's timestamp has advanced past what's already stored.
   */
  const importBuiltinSources = async (existing: SourceMeta[]): Promise<SourceMeta[]> => {
    const manifest = await fetchManifest();
    if (!manifest) return existing;

    const existingById = new Map(existing.map((s) => [s.id, s]));
    const imported: SourceMeta[] = [];

    for (const entry of manifest.sources) {
      const current = existingById.get(entry.id);
      if (current?.enrichedAt && current.enrichedAt >= entry.updated_at) continue;

      try {
        const records = await fetchBuiltinSource(entry.file);
        await storage.putRecipes(records);
        const meta: SourceMeta = {
          id: entry.id,
          name: entry.name,
          url: entry.url,
          emoji: entry.emoji,
          // Active by default only on first import — respect the user's choice on refresh.
          active: current ? current.active : true,
          hidden: current?.hidden ?? false,
          index: null,
          indexedAt: entry.updated_at,
          indexCount: entry.count,
          enrichedCount: records.length,
          enrichedAt: entry.updated_at,
          builtin: true,
        };
        await storage.putSource(meta);
        imported.push(meta);
      } catch {
        // Skip this source on fetch failure — keep whatever was already stored.
      }
    }

    const merged = [...existingById.values()];
    for (const m of imported) {
      const i = merged.findIndex((s) => s.id === m.id);
      if (i === -1) merged.push(m);
      else merged[i] = m;
    }

    if (imported.length === 0) return merged;
    for (const m of imported) invalidateRecipeCache(m.id);
    setSources(merged);
    setSelectedSources((prev) => {
      const set = new Set(prev);
      for (const m of imported) {
        if (m.active) set.add(m.id);
        else set.delete(m.id);
      }
      return [...set];
    });
    return merged;
  };

  /** Hide a built-in source from the Sources list without deleting its data (it can reappear on the next manifest refresh if re-imported). */
  const hideSource = (id: string): void => {
    updateSource(id, { hidden: true, active: false });
    setSelectedSources((prev) => prev.filter((s) => s !== id));
  };

  /**
   * U4 autocomplete: build a ranked ingredient-word vocabulary from every
   * enriched source's recipe tokens, once per session (not rebuilt as
   * sources change later — see the mount effect below).
   */
  const buildVocabulary = async (sourcesToScan: SourceMeta[]): Promise<void> => {
    const freq = new Map<string, number>();
    for (const meta of sourcesToScan) {
      if (meta.enrichedCount === 0) continue;
      const recipes = await getRecipesCached(meta.id);
      for (const recipe of recipes) {
        for (const line of recipe.ingredients) {
          for (const word of tokenise(line)) {
            freq.set(word, (freq.get(word) ?? 0) + 1);
          }
        }
      }
    }
    const ranked = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, VOCABULARY_SIZE)
      .map(([word]) => word);
    setVocabulary(ranked);
  };

  const addSource = async (): Promise<void> => {
    setSourceError("");
    setSourceSuccess("");
    if (!sourcesLoaded) {
      setSourceError("Still loading your saved sources — please wait a moment.");
      return;
    }
    if (!newSourceName.trim()) {
      setSourceError("Please enter a website name.");
      return;
    }
    if (!newSourceUrl.trim()) {
      setSourceError("Please enter a URL.");
      return;
    }
    const url = normaliseUrl(newSourceUrl);
    try {
      new URL(url);
    } catch {
      setSourceError("Please enter a valid URL (e.g. https://example.com)");
      return;
    }

    const dup = sources.find(
      (s) => s.url === url || s.name.toLowerCase() === newSourceName.trim().toLowerCase(),
    );
    if (dup) {
      setSourceError(`"${dup.name}" is already in your sources.`);
      return;
    }

    const newSrc: SourceMeta = {
      id: makeId(newSourceName),
      name: newSourceName.trim(),
      url,
      emoji: pickEmoji(newSourceName),
      active: true,
      index: null,
      indexedAt: null,
      indexCount: 0,
      enrichedCount: 0,
      enrichedAt: null,
    };
    setNewSourceName("");
    setNewSourceUrl("");

    setSources((prev) => [...prev, newSrc]);
    storage.putSource(newSrc);
    setSelectedSources((prev) => [...prev, newSrc.id]);
    setIndexing(newSrc.id);

    try {
      const data = await indexSource(url);
      updateSource(newSrc.id, { index: data.recipes, indexedAt: data.indexed_at, indexCount: data.count });
      setIndexing(null);
      // U7: chain straight into enrichment — no separate manual step for a new source.
      // Session 1's incremental writes mean it's searchable before this finishes.
      await enrichSource(newSrc.id, data.recipes);
      setSourceSuccess(`✓ "${newSrc.name}" ready — ${data.count} recipes searchable.`);
    } catch (err) {
      setSourceError(
        `"${newSrc.name}" added but indexing failed: ${errorMessage(err)}. You can re-index from the source list.`,
      );
      setIndexing(null);
    } finally {
      scheduleClearMessages();
    }
  };

  const reindexSource = async (id: string): Promise<void> => {
    const src = sources.find((s) => s.id === id);
    if (!src) return;
    setIndexing(id);
    setSourceError("");
    setSourceSuccess("");
    try {
      const data = await indexSource(src.url);
      updateSource(id, { index: data.recipes, indexedAt: data.indexed_at, indexCount: data.count });
      setSourceSuccess(`✓ "${src.name}" re-indexed — ${data.count} recipes found.`);
    } catch (err) {
      setSourceError(`Re-indexing failed: ${errorMessage(err)}`);
    } finally {
      setIndexing(null);
      scheduleClearMessages();
    }
  };

  const cancelEnrich = (): void => {
    enrichCancelRef.current = true;
  };

  /**
   * `indexOverride` lets addSource chain straight into enrichment (U7) with
   * the just-fetched index, instead of reading `sources` state — which
   * hasn't re-rendered yet and would still be missing it at that point.
   */
  const enrichSource = async (id: string, indexOverride?: IndexEntry[]): Promise<void> => {
    const urls = indexOverride ?? sources.find((s) => s.id === id)?.index;
    if (!urls || urls.length === 0) return;

    enrichCancelRef.current = false;
    setEnriching(id);

    const alreadyDone = await storage.getRecipeUrlsBySource(id);
    const remaining = urls.filter((u) => !alreadyDone.has(u.url));
    let enrichedCount = alreadyDone.size;
    let attempted = alreadyDone.size;
    setEnrichProgress({ done: attempted, total: urls.length });

    for (let i = 0; i < remaining.length; i += ENRICH_CONCURRENCY) {
      if (enrichCancelRef.current) break;

      const batch = remaining.slice(i, i + ENRICH_CONCURRENCY);
      const settled = await Promise.allSettled(batch.map((entry) => fetchRecipe(entry.url)));

      const batchRecords: RecipeRecord[] = [];
      settled.forEach((result, j) => {
        if (result.status === "fulfilled" && result.value.ingredients.length > 0) {
          const data = result.value;
          batchRecords.push({
            sourceId: id,
            title: batch[j].title,
            url: batch[j].url,
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
        }
      });

      // Write each batch immediately so progress survives a closed tab or a cancel.
      if (batchRecords.length > 0) {
        await storage.putRecipes(batchRecords);
        invalidateRecipeCache(id);
        enrichedCount += batchRecords.length;
        updateSource(id, { enrichedCount });
      }

      attempted += batch.length;
      setEnrichProgress({ done: Math.min(attempted, urls.length), total: urls.length });

      if (i + ENRICH_CONCURRENCY < remaining.length && !enrichCancelRef.current) {
        await new Promise((r) => setTimeout(r, ENRICH_DELAY_MS));
      }
    }

    if (!enrichCancelRef.current) {
      updateSource(id, { enrichedAt: new Date().toISOString() });
    }
    setEnriching(null);
    enrichCancelRef.current = false;
  };

  const removeSource = (id: string): void => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setSelectedSources((prev) => prev.filter((s) => s !== id));
    invalidateRecipeCache(id);
    storage.deleteSource(id);
  };

  const toggleSource = (id: string): void => {
    const nowActive = !selectedSources.includes(id);
    updateSource(id, { active: nowActive });
    setSelectedSources((p) => (nowActive ? [...p, id] : p.filter((s) => s !== id)));
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (): Promise<void> => {
    setError("");
    // U9: the favourites view lists every favourited recipe regardless of
    // ingredients entered, so it's exempt from the "no ingredients" guard.
    if (entries.length === 0 && !showFavouritesOnly) {
      setResults([]);
      return;
    }
    const activeEnrichedSources = sources.filter(
      (s) => selectedSources.includes(s.id) && s.enrichedCount > 0,
    );
    if (activeEnrichedSources.length === 0) {
      setResults([]);
      setError(
        "No sources selected. Enable one above, or add and enrich a custom source in the Sources tab.",
      );
      return;
    }
    const sourcesWithRecipes = await Promise.all(
      activeEnrichedSources.map(async (meta) => ({ meta, recipes: await getRecipesCached(meta.id) })),
    );
    // Favourites view ignores the match threshold — a favourite should show
    // up even at 0% match — and is filtered down to favourited URLs after.
    const found = searchRecipes(entries, cupboard, sourcesWithRecipes, showFavouritesOnly ? 0 : matchThreshold);
    const finalResults = showFavouritesOnly ? found.filter((r) => favourites.has(r.sourceUrl)) : found;
    setResults(finalResults);
    if (finalResults.length === 0) {
      setError(
        showFavouritesOnly
          ? "No favourites yet — star a recipe to save it here."
          : `No matches found above ${matchThreshold}%. Try fewer ingredients, more general terms, or lowering the threshold.`,
      );
    }
  };

  // U5: live search — re-run automatically (debounced) as ingredients, the
  // cupboard, selected sources, the match threshold, or the favourites view change.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      handleSearch();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, cupboard, selectedSources, matchThreshold, showFavouritesOnly, favourites]);

  // ── Render ────────────────────────────────────────────────────────────────
  const visibleSources = sources.filter((s) => !s.hidden);

  return (
    <div style={styles.app}>
      <style>{globalCss(tokens)}</style>
      <Header activeTab={activeTab} onTabChange={setActiveTab} theme={theme} onToggleTheme={toggleTheme} />
      <main style={styles.main}>
        {activeTab === "search" && (
          <SearchTab
            sources={visibleSources}
            selectedSources={selectedSources}
            onToggleSource={toggleSource}
            entries={entries}
            onAddIngredient={addIngredient}
            onToggleRequired={toggleRequired}
            onRemoveEntry={removeEntry}
            vocabulary={vocabulary}
            error={error}
            results={results}
            matchThreshold={matchThreshold}
            onThresholdChange={setThreshold}
            favourites={favourites}
            onToggleFavourite={toggleFavourite}
            showFavouritesOnly={showFavouritesOnly}
            onToggleFavouritesOnly={() => setShowFavouritesOnly((v) => !v)}
            onGoToSourcesTab={() => setActiveTab("sources")}
          />
        )}

        {activeTab === "sources" && (
          <SourcesTab
            sources={visibleSources}
            selectedSources={selectedSources}
            newSourceName={newSourceName}
            newSourceUrl={newSourceUrl}
            sourceError={sourceError}
            sourceSuccess={sourceSuccess}
            indexing={indexing}
            enriching={enriching}
            enrichProgress={enrichProgress}
            onNameChange={(v) => { setNewSourceName(v); setSourceError(""); setSourceSuccess(""); }}
            onUrlChange={(v) => { setNewSourceUrl(v); setSourceError(""); setSourceSuccess(""); }}
            onAdd={addSource}
            onToggle={toggleSource}
            onRemove={removeSource}
            onReindex={reindexSource}
            onEnrich={enrichSource}
            onCancelEnrich={cancelEnrich}
            onHide={hideSource}
          />
        )}

        {activeTab === "cupboard" && (
          <CupboardTab cupboard={cupboard} onSave={saveCupboard} />
        )}
      </main>
    </div>
  );
}
