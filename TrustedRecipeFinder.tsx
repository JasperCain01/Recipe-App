import { useState, useEffect, useRef } from "react";
import { styles } from "./lib/styles";
import { PROVIDERS, CUISINE_OPTIONS, DEFAULT_CUPBOARD } from "./lib/constants";
import { pickEmoji, normaliseUrl, makeId } from "./lib/utils";
import { storage } from "./lib/storage";
import { indexSource, getSuggestions, fetchRecipe } from "./lib/api";
import Header from "./components/Header";
import SearchTab from "./components/SearchTab";
import SourcesTab from "./components/SourcesTab";
import CupboardTab from "./components/CupboardTab";
import SettingsTab from "./components/SettingsTab";
import type { ApiKeys, ProviderId, Recipe, Source, Tab } from "./lib/types";

export default function App() {
  // ── Search state ────────────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState<string>("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([...CUISINE_OPTIONS]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [verifying, setVerifying] = useState<Set<number>>(new Set());

  // ── Source state ────────────────────────────────────────────────────────
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [newSourceName, setNewSourceName] = useState<string>("");
  const [newSourceUrl, setNewSourceUrl] = useState<string>("");
  const [sourceError, setSourceError] = useState<string>("");
  const [sourceSuccess, setSourceSuccess] = useState<string>("");
  /** id of source currently being indexed, or null if none */
  const [indexing, setIndexing] = useState<string | null>(null);
  const clearMessagesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cupboard state ──────────────────────────────────────────────────────
  const [cupboard, setCupboard] = useState<string[]>(DEFAULT_CUPBOARD);

  // ── Settings state ──────────────────────────────────────────────────────
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [model, setModel] = useState<string>(PROVIDERS[0].models[0].id);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("search");
  /** Gates source-mutating actions until the IndexedDB load completes */
  const [sourcesLoaded, setSourcesLoaded] = useState<boolean>(false);

  // ── Helpers ─────────────────────────────────────────────────────────────
  /** Narrow an unknown string to a valid ProviderId, or fall back to anthropic */
  const asProviderId = (id: string | null): ProviderId => {
    if (id === "anthropic" || id === "openai") return id;
    return "anthropic";
  };

  /** Extract a useful message from an unknown thrown value (TS strict catch). */
  const errorMessage = (e: unknown): string =>
    e instanceof Error ? e.message : String(e);

  // ── Load persisted state on mount ───────────────────────────────────────
  useEffect(() => {
    const cup = storage.loadCupboard();
    if (cup) setCupboard(cup);

    // Sources are async — load them and update state when ready.
    // The sourcesLoaded flag prevents user actions from racing with the load.
    storage.loadSources().then((src) => {
      if (src && src.length > 0) {
        setSources(src);
        setSelectedSources(src.filter((s) => s.active).map((s) => s.id));
      }
      setSourcesLoaded(true);
    });

    setApiKeys(storage.loadApiKeys());

    const savedProviderRaw = storage.loadProvider();
    if (savedProviderRaw) {
      const savedProvider = asProviderId(savedProviderRaw);
      const providerObj = PROVIDERS.find((p) => p.id === savedProvider);
      if (providerObj) {
        setProvider(savedProvider);
        const savedModel = storage.loadModel(savedProvider);
        setModel(savedModel ?? providerObj.models[0].id);
      }
    }
  }, []);

  // ── Cleanup setTimeout on unmount ───────────────────────────────────────
  useEffect(
    () => () => {
      if (clearMessagesTimerRef.current) clearTimeout(clearMessagesTimerRef.current);
    },
    [],
  );

  // ── Helpers ─────────────────────────────────────────────────────────────
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

  // ── Sources ─────────────────────────────────────────────────────────────
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
      indexedAt: null,
      indexCount: 0,
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
      setSourceSuccess(`✓ "${newSrc.name}" added — ${data.count} recipes indexed.`);
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

  // ── Cuisines ────────────────────────────────────────────────────────────
  const toggleCuisine = (c: string): void =>
    setSelectedCuisines((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  // ── Settings ────────────────────────────────────────────────────────────
  const changeProvider = (newProviderId: ProviderId): void => {
    setProvider(newProviderId);
    storage.saveProvider(newProviderId);
    const providerObj = PROVIDERS.find((p) => p.id === newProviderId);
    if (!providerObj) return;
    const savedModel = storage.loadModel(newProviderId);
    setModel(savedModel ?? providerObj.models[0].id);
  };

  const changeModel = (newModelId: string): void => {
    setModel(newModelId);
    storage.saveModel(provider, newModelId);
  };

  const saveApiKey = (providerId: ProviderId, key: string): void => {
    const updated: ApiKeys = { ...apiKeys, [providerId]: key };
    setApiKeys(updated);
    storage.saveApiKeys(updated);
  };

  // ── Find recipes ────────────────────────────────────────────────────────
  const findRecipes = async (): Promise<void> => {
    const currentKey = apiKeys[provider];
    if (!ingredients.trim()) {
      setError("Please enter some ingredients.");
      return;
    }
    if (!selectedSources.length) {
      setError("Select at least one source.");
      return;
    }
    if (!selectedCuisines.length) {
      setError("Select at least one cuisine.");
      return;
    }
    if (!currentKey || !currentKey.trim()) {
      const providerName = PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
      setError(`Add your ${providerName} API key in Settings.`);
      return;
    }

    setLoading(true);
    setError("");
    setRecipes([]);

    const activeSources = selectedSources
      .map((id) => sources.find((s) => s.id === id))
      .filter((s): s is Source => Boolean(s))
      .map((s) => ({ name: s.name, url: s.url, index: s.index ?? [] }));

    try {
      const data = await getSuggestions({
        provider,
        apiKey: currentKey,
        model,
        ingredients,
        cupboard,
        sources: activeSources,
        cuisines: selectedCuisines,
      });

      const suggested = data.recipes ?? [];
      setRecipes(suggested);
      setExpandedRecipe(suggested.length ? 0 : null);
      setLoading(false);

      if (!suggested.length) {
        setError("No good matches found. Try different ingredients or add more recipe sources.");
        return;
      }

      // Verify each suggestion against its real source page in parallel
      const indexes = new Set(suggested.map((_, i) => i));
      setVerifying(indexes);

      await Promise.all(
        suggested.map(async (r, i) => {
          if (!r.sourceUrl) {
            setVerifying((prev) => {
              const n = new Set(prev);
              n.delete(i);
              return n;
            });
            return;
          }
          try {
            const real = await fetchRecipe(r.sourceUrl);
            setRecipes((prev) =>
              prev.map((recipe, idx) =>
                idx === i
                  ? {
                      ...recipe,
                      verified: true,
                      title: real.title || recipe.title,
                      totalTime: real.totalTime ?? recipe.totalTime,
                      servings: real.servings ?? null,
                      image: real.image ?? null,
                      ingredients: real.ingredients.map((ing) => ({ name: ing, amount: "" })),
                      ingredientsRaw: real.ingredients,
                      instructions:
                        real.instructions.length > 0 ? real.instructions : recipe.instructions,
                    }
                  : recipe,
              ),
            );
          } catch {
            setRecipes((prev) =>
              prev.map((recipe, idx) =>
                idx === i ? { ...recipe, verified: false, verifyFailed: true } : recipe,
              ),
            );
          } finally {
            setVerifying((prev) => {
              const n = new Set(prev);
              n.delete(i);
              return n;
            });
          }
        }),
      );
    } catch (e) {
      setError(`Error: ${errorMessage(e)}`);
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={styles.app}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={styles.main}>
        {activeTab === "search" && (
          <SearchTab
            sources={sources}
            selectedSources={selectedSources}
            onToggleSource={toggleSource}
            selectedCuisines={selectedCuisines}
            onToggleCuisine={toggleCuisine}
            ingredients={ingredients}
            onIngredientsChange={setIngredients}
            loading={loading}
            error={error}
            onFindRecipes={findRecipes}
            recipes={recipes}
            expandedRecipe={expandedRecipe}
            onExpandRecipe={setExpandedRecipe}
            verifying={verifying}
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
            onNameChange={(v) => {
              setNewSourceName(v);
              setSourceError("");
              setSourceSuccess("");
            }}
            onUrlChange={(v) => {
              setNewSourceUrl(v);
              setSourceError("");
              setSourceSuccess("");
            }}
            onAdd={addSource}
            onToggle={toggleSource}
            onRemove={removeSource}
            onReindex={reindexSource}
          />
        )}

        {activeTab === "cupboard" && <CupboardTab cupboard={cupboard} onSave={saveCupboard} />}

        {activeTab === "settings" && (
          <SettingsTab
            provider={provider}
            model={model}
            apiKeys={apiKeys}
            onProviderChange={changeProvider}
            onModelChange={changeModel}
            onApiKeyChange={saveApiKey}
          />
        )}
      </main>
    </div>
  );
}
