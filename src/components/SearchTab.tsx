import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Star, Search as SearchIcon, X, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { getStyles, chipStyle, iconBtn, selectStyle, displayFontFamily, type ThemeTokens } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import { useNarrowViewport, useWindowedRange } from "../lib/hooks";
import { thresholdDescriptor } from "../lib/utils";
import ResultRow from "./ResultRow";
import ResultCard from "./ResultCard";
import IngredientEntryBox from "./IngredientEntryBox";
import FilterDropdown, { type FilterOption } from "./FilterDropdown";
import type { IngredientEntry, SearchNotice, SearchResult, SourceMeta } from "../lib/types";

interface SearchTabProps {
  sources: SourceMeta[];
  selectedSources: string[];
  onToggleSource: (id: string) => void;
  entries: IngredientEntry[];
  onAddIngredient: (text: string) => void;
  onToggleRequired: (index: number) => void;
  onRemoveEntry: (index: number) => void;
  vocabulary: string[];
  notice: SearchNotice;
  results: SearchResult[];
  matchThreshold: number;
  onThresholdChange: (value: number) => void;
  favourites: Set<string>;
  onToggleFavourite: (url: string) => void;
  showFavouritesOnly: boolean;
  onToggleFavouritesOnly: () => void;
  onGoToSourcesTab: () => void;
}

const NARROW_BREAKPOINT = 640;
// Nominal collapsed-row height for the dense list view's windowing math (grid
// view isn't virtualised — see the SearchTab.tsx doc comment below).
const DESKTOP_ROW_HEIGHT = 69;
const VIRTUALIZE_THRESHOLD = 200;

const TIME_OPTIONS: FilterOption[] = [
  { value: "30", label: "≤ 30 min" },
  { value: "60", label: "≤ 1 hour" },
  { value: "120", label: "≤ 2 hours" },
  { value: "unknown", label: "Unknown" },
];

const COMPLEXITY_OPTIONS: FilterOption[] = [
  { value: "simple", label: "Simple (≤ 5)" },
  { value: "moderate", label: "Moderate (6–10)" },
  { value: "complex", label: "Complex (11+)" },
  { value: "unknown", label: "Unknown" },
];

const SAMPLE_SEARCH = ["chicken", "lemon", "rice"];

type SortColumn = "title" | "match" | "time" | "steps";
type SortDirection = "asc" | "desc";

// 4.4: one compact "Sort: Best match ▾" control instead of four sortable
// column headers / sort chips + a separate direction toggle.
const SORT_PRESETS: { value: string; label: string; column: SortColumn; direction: SortDirection }[] = [
  { value: "match", label: "Best match", column: "match", direction: "desc" },
  { value: "quick", label: "Quickest first", column: "time", direction: "asc" },
  { value: "steps", label: "Fewest steps", column: "steps", direction: "asc" },
  { value: "az", label: "A–Z", column: "title", direction: "asc" },
];

function compareResults(a: SearchResult, b: SearchResult, column: SortColumn, direction: SortDirection): number {
  const dir = direction === "asc" ? 1 : -1;
  switch (column) {
    case "title":
      return a.title.localeCompare(b.title) * dir;
    case "match":
      return (a.matchScore - b.matchScore) * dir;
    case "time": {
      if (a.totalTimeMinutes === null && b.totalTimeMinutes === null) return 0;
      if (a.totalTimeMinutes === null) return 1; // unknown always sorts last
      if (b.totalTimeMinutes === null) return -1;
      return (a.totalTimeMinutes - b.totalTimeMinutes) * dir;
    }
    case "steps": {
      if (a.instructionCount === 0 && b.instructionCount === 0) return 0;
      if (a.instructionCount === 0) return 1; // unknown always sorts last
      if (b.instructionCount === 0) return -1;
      return (a.instructionCount - b.instructionCount) * dir;
    }
  }
}

export default function SearchTab({
  sources,
  selectedSources,
  onToggleSource,
  entries,
  onAddIngredient,
  onToggleRequired,
  onRemoveEntry,
  vocabulary,
  notice,
  results,
  matchThreshold,
  onThresholdChange,
  favourites,
  onToggleFavourite,
  showFavouritesOnly,
  onToggleFavouritesOnly,
  onGoToSourcesTab,
}: SearchTabProps) {
  const { tokens: t } = useTheme();
  const styles = getStyles(t);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const [timeFilters, setTimeFilters] = useState<Set<string>>(new Set());
  const [complexityFilters, setComplexityFilters] = useState<Set<string>>(new Set());
  const [mealTypeFilters, setMealTypeFilters] = useState<Set<string>>(new Set());
  const [cuisineFilters, setCuisineFilters] = useState<Set<string>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortPreset, setSortPreset] = useState<string>("match");
  const [view, setView] = useState<"grid" | "list">("grid");

  const narrow = useNarrowViewport(NARROW_BREAKPOINT);
  const listContainerRef = useRef<HTMLDivElement>(null);
  // Phones always get the card grid — the list view is a desktop "power
  // user" option (4.4/4.8).
  const effectiveView = narrow ? "grid" : view;

  const enrichedSources = sources.filter((s) => s.enrichedCount > 0);
  const activeEnrichedCount = selectedSources.filter((id) =>
    enrichedSources.some((s) => s.id === id)
  ).length;

  // Unique options for each filterable facet, derived from the full result set
  const { mealTypeOptions, cuisineOptions } = useMemo(() => {
    const mealTypes: FilterOption[] = [];
    const cuisines: FilterOption[] = [];
    {
      const seen = new Set<string>(); let hasUnknown = false;
      for (const r of results) {
        if (r.mealType) { if (!seen.has(r.mealType)) { seen.add(r.mealType); mealTypes.push({ value: r.mealType, label: r.mealType }); } }
        else hasUnknown = true;
      }
      mealTypes.sort((a, b) => a.label.localeCompare(b.label));
      if (hasUnknown) mealTypes.push({ value: "Unknown", label: "Unknown" });
    }
    {
      const seen = new Set<string>(); let hasUnknown = false;
      for (const r of results) {
        if (r.cuisine) { if (!seen.has(r.cuisine)) { seen.add(r.cuisine); cuisines.push({ value: r.cuisine, label: r.cuisine }); } }
        else hasUnknown = true;
      }
      cuisines.sort((a, b) => a.label.localeCompare(b.label));
      if (hasUnknown) cuisines.push({ value: "Unknown", label: "Unknown" });
    }
    return { mealTypeOptions: mealTypes, cuisineOptions: cuisines };
  }, [results]);

  // Apply the filter bar — OR logic within each filter, AND across filters
  const filteredResults = useMemo(() => results.filter((r) => {
    if (timeFilters.size > 0) {
      const ok = [...timeFilters].some((tf) => {
        if (tf === "unknown") return r.totalTimeMinutes === null;
        const max = parseInt(tf, 10);
        return r.totalTimeMinutes !== null && r.totalTimeMinutes <= max;
      });
      if (!ok) return false;
    }
    if (complexityFilters.size > 0) {
      const ok = [...complexityFilters].some((cf) => {
        if (cf === "unknown") return r.instructionCount === 0;
        if (cf === "simple") return r.instructionCount > 0 && r.instructionCount <= 5;
        if (cf === "moderate") return r.instructionCount >= 6 && r.instructionCount <= 10;
        if (cf === "complex") return r.instructionCount >= 11;
        return false;
      });
      if (!ok) return false;
    }
    if (mealTypeFilters.size > 0) {
      if (!mealTypeFilters.has(r.mealType ?? "Unknown")) return false;
    }
    if (cuisineFilters.size > 0) {
      if (!cuisineFilters.has(r.cuisine ?? "Unknown")) return false;
    }
    return true;
  }), [results, timeFilters, complexityFilters, mealTypeFilters, cuisineFilters]);

  const activePreset = SORT_PRESETS.find((p) => p.value === sortPreset) ?? SORT_PRESETS[0];
  const sortedResults = useMemo(
    () => [...filteredResults].sort((a, b) => compareResults(a, b, activePreset.column, activePreset.direction)),
    [filteredResults, activePreset],
  );

  const hasActiveFilter =
    timeFilters.size > 0 || complexityFilters.size > 0 ||
    mealTypeFilters.size > 0 || cuisineFilters.size > 0;

  const clearFilters = () => {
    setTimeFilters(new Set());
    setComplexityFilters(new Set());
    setMealTypeFilters(new Set());
    setCuisineFilters(new Set());
  };

  const toggleExpanded = (url: string) => {
    setExpandedUrl((prev) => (prev === url ? null : url));
  };

  // E6: virtualise the dense list view once it's large — but not while a row
  // is expanded (fixed-row-height windowing doesn't account for the expanded
  // detail panel's extra height), and not in grid view. The grid isn't
  // virtualised: its row height depends on the live column count (which
  // needs a ResizeObserver to track), and VIRTUALIZE_THRESHOLD's 200-recipe
  // bar is a rare, power-user-only case that the list view already covers.
  const shouldVirtualize = effectiveView === "list" && sortedResults.length > VIRTUALIZE_THRESHOLD && expandedUrl === null;
  const virtualCount = shouldVirtualize ? sortedResults.length : 0;
  const [rangeStart, rangeEnd] = useWindowedRange(virtualCount, DESKTOP_ROW_HEIGHT, listContainerRef);
  const visibleResults = shouldVirtualize ? sortedResults.slice(rangeStart, rangeEnd) : sortedResults;

  const filterFields = (
    <>
      <FilterField label="Meal" t={t}>
        <FilterDropdown options={mealTypeOptions} selected={mealTypeFilters} onChange={(next) => { setMealTypeFilters(next); setExpandedUrl(null); }} />
      </FilterField>
      <FilterField label="Cuisine" t={t}>
        <FilterDropdown options={cuisineOptions} selected={cuisineFilters} onChange={(next) => { setCuisineFilters(next); setExpandedUrl(null); }} />
      </FilterField>
      <FilterField label="Time" t={t}>
        <FilterDropdown options={TIME_OPTIONS} selected={timeFilters} onChange={(next) => { setTimeFilters(next); setExpandedUrl(null); }} />
      </FilterField>
      <FilterField label="Steps" t={t}>
        <FilterDropdown options={COMPLEXITY_OPTIONS} selected={complexityFilters} onChange={(next) => { setComplexityFilters(next); setExpandedUrl(null); }} />
      </FilterField>
    </>
  );

  return (
    <div>
      {/* Recipe sources */}
      <section style={styles.section}>
        <label style={styles.label}>
          Recipe Sources
          <span style={{ color: t.textFaint, marginLeft: "0.5rem", fontSize: "0.75rem" }}>
            — manage in My sites
          </span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {sources.length === 0 && (
            <span style={{ color: t.textMuted, fontSize: "0.84rem" }}>
              Built-in default recipes couldn't be loaded (offline?) —{" "}
              <button
                onClick={onGoToSourcesTab}
                style={{
                  background: "none", border: "none", color: t.accent,
                  cursor: "pointer", padding: 0, fontSize: "0.84rem",
                  fontFamily: "inherit", textDecoration: "underline",
                }}
              >
                add your own in My sites
              </button>
            </span>
          )}
          {sources.map((src) => {
            const active = selectedSources.includes(src.id);
            const enriched = src.enrichedCount > 0;
            return (
              <button
                key={src.id}
                onClick={() => onToggleSource(src.id)}
                title={enriched ? `${src.enrichedCount} recipes enriched` : "Not enriched — enrich in My sites to enable ingredient search"}
                style={{ ...chipStyle(t, active), opacity: enriched ? 1 : 0.45, minHeight: "40px", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
              >
                {src.emoji} {src.name}
                {!enriched && <AlertTriangle size={12} />}
              </button>
            );
          })}
        </div>
        {sources.length > 0 && activeEnrichedCount === 0 && (
          <p style={{ color: t.textMuted, fontSize: "0.75rem", marginTop: "0.5rem" }}>
            No sources selected. Enable one above, or enrich a custom source in My sites first.
          </p>
        )}
      </section>

      {/* First-run hero (4.5/structure phase) — greets an empty search with
          what the app can already do, instead of a blank label + input. */}
      {entries.length === 0 && sources.length > 0 && (
        <div style={{ textAlign: "center", padding: "0.5rem 0.5rem 1.5rem" }}>
          <h2 style={{ margin: "0 0 0.35rem", fontFamily: displayFontFamily, fontSize: "1.375rem", color: t.text }}>
            What's in your kitchen?
          </h2>
          <p style={{ margin: 0, color: t.textMuted, fontSize: "0.94rem" }}>
            Add a few ingredients and we'll find recipes you can make right now. Try{" "}
            <button
              onClick={() => SAMPLE_SEARCH.forEach(onAddIngredient)}
              style={{ background: "none", border: "none", color: t.accent, cursor: "pointer", padding: 0, fontSize: "0.94rem", fontFamily: "inherit", textDecoration: "underline" }}
            >
              {SAMPLE_SEARCH.join(", ")}
            </button>
            .
          </p>
        </div>
      )}

      {/* Ingredients (U4: chip entry + autocomplete). Sticky on phones once
          there are results to scroll past (4.8). */}
      <section
        style={{
          ...styles.section,
          ...(narrow && results.length > 0
            ? { position: "sticky", top: 0, zIndex: 50, background: t.background, paddingTop: "0.5rem", paddingBottom: "0.5rem", borderBottom: `1px solid ${t.border}` }
            : {}),
        }}
      >
        <label style={styles.label}>
          Your Ingredients
          <span style={{ color: t.textFaint, marginLeft: "0.5rem", fontSize: "0.75rem" }}>
            — store cupboard always included
          </span>
        </label>
        <IngredientEntryBox
          entries={entries}
          onAdd={onAddIngredient}
          onToggleRequired={onToggleRequired}
          onRemove={onRemoveEntry}
          vocabulary={vocabulary}
        />
      </section>

      <NoticePanel notice={notice} entries={entries} onToggleRequired={onToggleRequired} onThresholdChange={onThresholdChange} onGoToSourcesTab={onGoToSourcesTab} t={t} />

      {/* Match threshold (U11) */}
      <div style={{ margin: "1.25rem 0 0.5rem" }}>
        <label htmlFor="match-threshold" style={{ ...styles.label, marginBottom: "0.35rem" }}>
          How close a match?
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            id="match-threshold"
            type="range"
            min={10}
            max={90}
            step={5}
            value={matchThreshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            style={{ flex: 1, maxWidth: "220px" }}
          />
          <span style={{ color: t.text, fontSize: "0.84rem", fontWeight: 600 }}>{matchThreshold}%</span>
        </div>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: t.textMuted }}>
          {thresholdDescriptor(matchThreshold)} — matches need at least {matchThreshold}% of a recipe's ingredients (required ones always count).
        </p>
      </div>

      {/* Favourites (U9) — shows favourited recipes even with no ingredients entered */}
      <button
        onClick={onToggleFavouritesOnly}
        aria-pressed={showFavouritesOnly}
        style={{ ...chipStyle(t, showFavouritesOnly, t.secondaryAccent), display: "inline-flex", alignItems: "center", gap: "0.35rem", minHeight: "40px", marginBottom: "0.5rem" }}
      >
        <Star size={14} fill={showFavouritesOnly ? "currentColor" : "none"} /> Favourites
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          {/* Unified filter bar (4.4) — one component, every device: an
              inline row on tablet/desktop, a bottom-sheet trigger on phones. */}
          {narrow ? (
            <button
              onClick={() => setFilterSheetOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                minHeight: "40px", padding: "0.4rem 0.8rem",
                background: t.surface, border: `1px solid ${t.border}`, borderRadius: "999px",
                color: t.textMuted, fontFamily: "inherit", fontSize: "0.84rem", cursor: "pointer",
                marginBottom: "0.75rem",
              }}
            >
              <SlidersHorizontal size={14} /> Filters{hasActiveFilter ? " •" : ""}
            </button>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "1rem", marginBottom: "0.5rem" }}>
              {filterFields}
              {hasActiveFilter && (
                <button onClick={clearFilters} style={{ ...clearFiltersBtnStyle(t), marginBottom: "0.55rem" }}>
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* Result count + sort + view toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem", padding: "0.35rem 0 0.75rem" }}>
            <span aria-live="polite" style={{ fontSize: "0.75rem", color: t.textMuted }}>
              {hasActiveFilter
                ? `${filteredResults.length} of ${results.length} recipes`
                : `${results.length} ${results.length === 1 ? "recipe" : "recipes"}`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <select
                aria-label="Sort by"
                value={sortPreset}
                onChange={(e) => setSortPreset(e.target.value)}
                style={selectStyle(t)}
              >
                {SORT_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>Sort: {p.label}</option>
                ))}
              </select>
              {!narrow && (
                <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden" }}>
                  <button onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Grid view" title="Grid view" style={viewToggleBtnStyle(t, view === "grid")}>
                    <LayoutGrid size={15} />
                  </button>
                  <button onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view" title="List view" style={viewToggleBtnStyle(t, view === "list")}>
                    <List size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          {filteredResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: t.textMuted, fontSize: "0.84rem" }}>
              <p style={{ margin: "0 0 0.6rem" }}>No results match the current filters.</p>
              <button onClick={clearFilters} style={clearFiltersBtnStyle(t)}>
                <X size={12} /> Clear filters
              </button>
            </div>
          ) : effectiveView === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {sortedResults.map((r, i) => (
                <ResultCard
                  key={r.sourceUrl}
                  result={r}
                  expanded={expandedUrl === r.sourceUrl}
                  onToggleExpand={() => toggleExpanded(r.sourceUrl)}
                  isFavourite={favourites.has(r.sourceUrl)}
                  onToggleFavourite={() => onToggleFavourite(r.sourceUrl)}
                  animationDelay={`${Math.min(i, 12) * 20}ms`}
                />
              ))}
            </div>
          ) : (
            <div
              ref={listContainerRef}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                position: "relative",
                ...(shouldVirtualize ? { height: sortedResults.length * DESKTOP_ROW_HEIGHT } : {}),
              }}
            >
              {visibleResults.map((r, i) => {
                const actualIndex = shouldVirtualize ? rangeStart + i : i;
                return (
                  <div
                    key={r.sourceUrl}
                    style={shouldVirtualize ? { position: "absolute", top: actualIndex * DESKTOP_ROW_HEIGHT, left: 0, right: 0 } : undefined}
                  >
                    <ResultRow
                      result={r}
                      expanded={expandedUrl === r.sourceUrl}
                      onToggleExpand={() => toggleExpanded(r.sourceUrl)}
                      isFavourite={favourites.has(r.sourceUrl)}
                      onToggleFavourite={() => onToggleFavourite(r.sourceUrl)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filter sheet — bottom drawer on phones (4.8) */}
      {narrow && filterSheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end" }}>
          <div onClick={() => setFilterSheetOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div
            style={{
              position: "relative",
              width: "100%",
              background: t.surface,
              borderRadius: "12px 12px 0 0",
              padding: "1rem",
              boxShadow: `0 -4px 16px ${t.shadow}`,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Filters</span>
              <button onClick={() => setFilterSheetOpen(false)} aria-label="Close filters" style={iconBtn(t)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {filterFields}
              {hasActiveFilter && (
                <button onClick={clearFilters} style={{ ...clearFiltersBtnStyle(t), alignSelf: "flex-start" }}>
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoticePanel({
  notice,
  entries,
  onToggleRequired,
  onThresholdChange,
  onGoToSourcesTab,
  t,
}: {
  notice: SearchNotice;
  entries: IngredientEntry[];
  onToggleRequired: (index: number) => void;
  onThresholdChange: (value: number) => void;
  onGoToSourcesTab: () => void;
  t: ThemeTokens;
}) {
  if (!notice) return null;

  const panelStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.6rem",
    alignItems: "flex-start",
    background: t.accentTint,
    border: `1px solid ${t.accentBorder}`,
    borderRadius: "12px",
    padding: "0.875rem 1rem",
    marginBottom: "0.875rem",
    color: t.text,
    fontSize: "0.84rem",
  };

  if (notice.kind === "no-sources") {
    return (
      <div style={panelStyle}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "0.1rem", color: t.accent }} />
        <div>
          <p style={{ margin: "0 0 0.5rem" }}>No sources selected — enable one above, or add a site of your own.</p>
          <button onClick={onGoToSourcesTab} style={noticeActionStyle(t)}>Go to My sites</button>
        </div>
      </div>
    );
  }

  if (notice.kind === "no-favourites") {
    return (
      <div style={panelStyle}>
        <Star size={16} style={{ flexShrink: 0, marginTop: "0.1rem", color: t.accent }} />
        <p style={{ margin: 0 }}>No favourites yet — star a recipe to save it here.</p>
      </div>
    );
  }

  // no-matches — guidance with one-tap actions, never a red error (4.4)
  const requiredEntries = entries.filter((e) => e.required);
  return (
    <div style={panelStyle}>
      <SearchIcon size={16} style={{ flexShrink: 0, marginTop: "0.1rem", color: t.accent }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <p style={{ margin: 0 }}>No matches above {notice.threshold}% yet. Try:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          <button onClick={() => onThresholdChange(Math.max(10, notice.threshold - 15))} style={noticeActionStyle(t)}>
            Lower the match threshold
          </button>
          {requiredEntries.map((e) => (
            <button key={e.id} onClick={() => onToggleRequired(entries.indexOf(e))} style={noticeActionStyle(t)}>
              Make "{e.text}" optional
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function noticeActionStyle(t: ThemeTokens): React.CSSProperties {
  return {
    background: t.surface,
    border: `1px solid ${t.accentBorder}`,
    color: t.accent,
    borderRadius: "999px",
    padding: "0.3rem 0.75rem",
    fontFamily: "inherit",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  };
}

function clearFiltersBtnStyle(t: ThemeTokens): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    background: "none",
    border: `1px solid ${t.border}`,
    color: t.textMuted,
    borderRadius: "8px",
    padding: "0.3rem 0.6rem",
    fontSize: "0.75rem",
    fontFamily: "inherit",
    cursor: "pointer",
  };
}

function viewToggleBtnStyle(t: ThemeTokens, active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "38px",
    minHeight: "38px",
    background: active ? t.accentTint : "transparent",
    color: active ? t.accent : t.textMuted,
    border: "none",
    cursor: "pointer",
  };
}

function FilterField({ label, children, t }: { label: string; children: React.ReactNode; t: ThemeTokens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "150px", maxWidth: "100%" }}>
      <span style={{ ...getStyles(t).label, marginBottom: 0 }}>{label}</span>
      {children}
    </div>
  );
}
