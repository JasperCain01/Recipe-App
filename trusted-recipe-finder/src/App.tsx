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
import type { EnrichedEntry, IngredientEntry, SearchResult, Source, Tab } from "./lib/types";

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

  // ── Source state ──────────────────────────────────────────────────────────
  const [sources, setSources] = useState<Source[]>([]);
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

  // ── Cupboard state ────────────────────────────────────────────────────────
  const [cupboard, setCupboard] = useState<string[]>(DEFAULT_CUPBOARD);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("search");

  // ── Load persisted state on mount ─────────────────────────────────────────
  useEffect(() => {
    const cup = storage.loadCupboard();
    if (cup) setCupboard(cup);

    storage.loadSources().then((src) => {
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

  const persistSources = (next: Source[]): Promise<boolean> => storage.saveSources(next);

  const saveCupboard = (items: string[]): void => {
    setCupboard(items);
    storage.saveCupboard(items);
  };

  // ── Sources ───────────────────────────────────────────────────────────────
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

    const newSrc: Source = {
      id: makeId(newSourceName),
      name: newSourceName.trim(),
      url,
      emoji: pickEmoji(newSourceName),
      active: true,
      index: null,
      enrichedIndex: null,
      indexedAt: null,
      indexCount: 0,
      enrichedCount: 0,
      enrichedAt: null,
    };
    setNewSourceName("");
    setNewSourceUrl("");

    setSources((prev) => {
      const next = [...prev, newSrc];
      persistSources(next);
      return next;
    });
    setSelectedSources((prev) => [...prev, newSrc.id]);
    setIndexing(newSrc.id);

    try {
      const data = await indexSource(url);
      setSources((prev) => {
        const next = prev.map((s) =>
          s.id === newSrc.id
            ? { ...s, index: data.recipes, indexedAt: data.indexed_at, indexCount: data.count }
            : s,
        );
        persistSources(next);
        return next;
      });
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
      setSources((prev) => {
        const next = prev.map((s) =>
          s.id === id
            ? { ...s, index: data.recipes, indexedAt: data.indexed_at, indexCount: data.count }
            : s,
        );
        persistSources(next);
        return next;
      });
      setSourceSuccess(`✓ "${src.name}" re-indexed — ${data.count} recipes found.`);
    } catch (err) {
      setSourceError(`Re-indexing failed: ${errorMessage(err)}`);
    } finally {
      setIndexing(null);
      scheduleClearMessages();
    }
  };

  const enrichSource = async (id: string): Promise<void> => {
    const src = sources.find((s) => s.id === id);
    if (!src || !src.index || src.index.length === 0) return;

    setEnriching(id);
    setEnrichProgress({ done: 0, total: src.index.length });

    const enriched: EnrichedEntry[] = [];
    const urls = src.index;

    for (let i = 0; i < urls.length; i += ENRICH_CONCURRENCY) {
      const batch = urls.slice(i, i + ENRICH_CONCURRENCY);
      const settled = await Promise.allSettled(batch.map((entry) => fetchRecipe(entry.url)));

      settled.forEach((result, j) => {
        if (result.status === "fulfilled" && result.value.ingredients.length > 0) {
          const data = result.value;
          enriched.push({
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

      const done = Math.min(i + ENRICH_CONCURRENCY, urls.length);
      setEnrichProgress({ done, total: urls.length });

      // Save progress every 10 batches (50 recipes) so data isn't lost on close
      if (enriched.length > 0 && (i / ENRICH_CONCURRENCY) % 10 === 9) {
        setSources((prev) => {
          const next = prev.map((s) =>
            s.id === id ? { ...s, enrichedIndex: [...enriched], enrichedCount: enriched.length } : s,
          );
          persistSources(next);
          return next;
        });
      }

      if (i + ENRICH_CONCURRENCY < urls.length) {
        await new Promise((r) => setTimeout(r, ENRICH_DELAY_MS));
      }
    }

    const enrichedAt = new Date().toISOString();
    setSources((prev) => {
      const next = prev.map((s) =>
        s.id === id
          ? { ...s, enrichedIndex: enriched, enrichedCount: enriched.length, enrichedAt }
          : s,
      );
      persistSources(next);
      return next;
    });
    setEnriching(null);
  };

  const removeSource = (id: string): void => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSources(next);
      return next;
    });
    setSelectedSources((prev) => prev.filter((s) => s !== id));
  };

  const toggleSource = (id: string): void => {
    const nowActive = !selectedSources.includes(id);
    setSources((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, active: nowActive } : s));
      persistSources(next);
      return next;
    });
    setSelectedSources((p) => (nowActive ? [...p, id] : p.filter((s) => s !== id)));
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = (entries: IngredientEntry[]): void => {
    setError("");
    if (entries.length === 0) {
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
    const found = searchRecipes(entries, cupboard, sources, selectedSources);
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
          />
        )}

        {activeTab === "cupboard" && (
          <CupboardTab cupboard={cupboard} onSave={saveCupboard} />
        )}
      </main>
    </div>
  );
}
