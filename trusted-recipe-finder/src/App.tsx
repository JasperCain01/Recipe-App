import { useState, useEffect, useRef } from "react";
import { styles } from "./lib/styles";
import { DEFAULT_CUPBOARD } from "./lib/constants";
import { pickEmoji, normaliseUrl, makeId, deriveMealType } from "./lib/utils";
import { storage } from "./lib/storage";
import { indexSource, fetchRecipe } from "./lib/api";
import { searchRecipes } from "./lib/search";
import Header from "./components/Header";
import SearchTab from "./components/SearchTab";
import SourcesTab from "./components/SourcesTab";
import CupboardTab from "./components/CupboardTab";
import type { IngredientEntry, RecipeRecord, SearchResult, SourceMeta, Tab } from "./lib/types";

// How many recipe pages to fetch simultaneously during enrichment
const ENRICH_CONCURRENCY = 5;
// Polite delay (ms) between enrichment batches
const ENRICH_DELAY_MS = 300;

/** Parse the human-readable time string produced by fetch-recipe into minutes. */
function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const h = timeStr.match(/(\d+)\s*h/);
  const m = timeStr.match(/(\d+)\s*m/);
  const total = (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
  return total > 0 ? total : null;
}

export default function App() {
  // ── Search state ──────────────────────────────────────────────────────────
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>("");
  const nextEntryId = useRef(1);
  const [entries, setEntries] = useState<IngredientEntry[]>([{ id: "0", text: "", required: true }]);

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

    storage.loadSourceMetas().then((src) => {
      if (src && src.length > 0) {
        setSources(src);
        setSelectedSources(src.filter((s) => s.active).map((s) => s.id));
      }
      setSourcesLoaded(true);
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
    recipeCacheRef.current.set(id, recs);
    return recs;
  };

  const saveCupboard = (items: string[]): void => {
    setCupboard(items);
    storage.saveCupboard(items);
  };

  // ── Ingredient entries (U1: lifted out of SearchTab so they survive tab switches) ──
  const newEntry = (text = "", required = true): IngredientEntry => ({
    id: String(nextEntryId.current++),
    text,
    required,
  });

  const handleIngredientChange = (index: number, text: string): void => {
    setEntries((prev) => {
      const next = prev.map((e, i) => (i === index ? { ...e, text } : e));
      if (next[next.length - 1].text.trim()) next.push(newEntry());
      return next;
    });
  };

  const toggleRequired = (index: number): void => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, required: !e.required } : e)));
  };

  const removeEntry = (index: number): void => {
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0 || next[next.length - 1].text.trim()) next.push(newEntry());
      return next;
    });
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
      setSourceSuccess(`✓ "${newSrc.name}" added — ${data.count} recipes indexed. Click "Enrich now" to enable ingredient search.`);
    } catch (err) {
      setSourceError(
        `"${newSrc.name}" added but indexing failed: ${errorMessage(err)}. You can re-index from the source list.`,
      );
    } finally {
      setIndexing(null);
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

  const enrichSource = async (id: string): Promise<void> => {
    const src = sources.find((s) => s.id === id);
    if (!src || !src.index || src.index.length === 0) return;

    enrichCancelRef.current = false;
    setEnriching(id);

    const urls = src.index;
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
    const filled = entries.filter((e) => e.text.trim());
    if (filled.length === 0) {
      setError("Please enter at least one ingredient.");
      return;
    }
    const activeEnrichedSources = sources.filter(
      (s) => selectedSources.includes(s.id) && s.enrichedCount > 0,
    );
    if (activeEnrichedSources.length === 0) {
      setError(
        'No enriched sources selected. Go to Sources tab and click "Enrich now" to enable ingredient search.',
      );
      return;
    }
    const sourcesWithRecipes = await Promise.all(
      activeEnrichedSources.map(async (meta) => ({ meta, recipes: await getRecipesCached(meta.id) })),
    );
    const found = searchRecipes(filled, cupboard, sourcesWithRecipes);
    setResults(found);
    if (found.length === 0) {
      setError("No matches found above 25%. Try fewer or more general ingredients.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.app}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={styles.main}>
        {activeTab === "search" && (
          <SearchTab
            sources={sources}
            selectedSources={selectedSources}
            onToggleSource={toggleSource}
            entries={entries}
            onIngredientChange={handleIngredientChange}
            onToggleRequired={toggleRequired}
            onRemoveEntry={removeEntry}
            error={error}
            onSearch={handleSearch}
            results={results}
            onGoToSourcesTab={() => setActiveTab("sources")}
          />
        )}

        {activeTab === "sources" && (
          <SourcesTab
            sources={sources}
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
          />
        )}

        {activeTab === "cupboard" && (
          <CupboardTab cupboard={cupboard} onSave={saveCupboard} />
        )}
      </main>
    </div>
  );
}
