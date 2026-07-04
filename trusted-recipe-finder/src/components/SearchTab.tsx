import { useMemo, useRef, useState } from "react";
import { styles, chipStyle } from "../lib/styles";
import { useNarrowViewport, useWindowedRange } from "../lib/hooks";
import ResultRow from "./ResultRow";
import IngredientEntryBox from "./IngredientEntryBox";
import FilterDropdown, { type FilterOption } from "./FilterDropdown";
import type { IngredientEntry, SearchResult, SourceMeta } from "../lib/types";

interface SearchTabProps {
  sources: SourceMeta[];
  selectedSources: string[];
  onToggleSource: (id: string) => void;
  entries: IngredientEntry[];
  onAddIngredient: (text: string) => void;
  onToggleRequired: (index: number) => void;
  onRemoveEntry: (index: number) => void;
  vocabulary: string[];
  error: string;
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
// Nominal collapsed-row heights used for windowing math (see useWindowedRange).
const DESKTOP_ROW_HEIGHT = 64;
const NARROW_ROW_HEIGHT = 118;
const VIRTUALIZE_THRESHOLD = 200;

const colStyle = (width: number | string): React.CSSProperties => ({
  width: typeof width === "number" ? `${width}px` : width,
  flexShrink: 0,
});

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

type SortColumn = "title" | "match" | "time" | "steps";
type SortDirection = "asc" | "desc";

const DEFAULT_SORT_DIRECTION: Record<SortColumn, SortDirection> = {
  title: "asc",
  match: "desc",
  time: "asc",
  steps: "asc",
};

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

function SortArrow({ direction }: { direction: SortDirection | null }) {
  if (!direction) return null;
  return <span style={{ marginLeft: "0.2rem" }}>{direction === "asc" ? "↑" : "↓"}</span>;
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
  error,
  results,
  matchThreshold,
  onThresholdChange,
  favourites,
  onToggleFavourite,
  showFavouritesOnly,
  onToggleFavouritesOnly,
  onGoToSourcesTab,
}: SearchTabProps) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const [timeFilters, setTimeFilters] = useState<Set<string>>(new Set());
  const [complexityFilters, setComplexityFilters] = useState<Set<string>>(new Set());
  const [mealTypeFilters, setMealTypeFilters] = useState<Set<string>>(new Set());
  const [cuisineFilters, setCuisineFilters] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: "match",
    direction: "desc",
  });

  const narrow = useNarrowViewport(NARROW_BREAKPOINT);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const enrichedSources = sources.filter((s) => s.enrichedCount > 0);
  const activeEnrichedCount = selectedSources.filter((id) =>
    enrichedSources.some((s) => s.id === id)
  ).length;

  // Unique options for each filterable column, derived from the full result set
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

  // Apply column filters — OR logic within each filter, AND across filters
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

  const sortedResults = useMemo(
    () => [...filteredResults].sort((a, b) => compareResults(a, b, sort.column, sort.direction)),
    [filteredResults, sort.column, sort.direction],
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

  const handleSortClick = (column: SortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: DEFAULT_SORT_DIRECTION[column] },
    );
  };

  const toggleExpanded = (url: string) => {
    setExpandedUrl((prev) => (prev === url ? null : url));
  };

  // E6: virtualise the list once it's large — but not while a row is expanded,
  // since fixed-row-height windowing math doesn't account for the expanded
  // row's extra height (see useWindowedRange).
  const rowHeight = narrow ? NARROW_ROW_HEIGHT : DESKTOP_ROW_HEIGHT;
  const shouldVirtualize = sortedResults.length > VIRTUALIZE_THRESHOLD && expandedUrl === null;
  const virtualCount = shouldVirtualize ? sortedResults.length : 0;
  const [rangeStart, rangeEnd] = useWindowedRange(virtualCount, rowHeight, listContainerRef);
  const visibleResults = shouldVirtualize ? sortedResults.slice(rangeStart, rangeEnd) : sortedResults;

  return (
    <div>
      {/* Recipe sources */}
      <section style={styles.section}>
        <label style={styles.label}>
          Recipe Sources
          <span style={{ color: "#616161", marginLeft: "0.5rem", fontSize: "0.7rem", textTransform: "none", letterSpacing: 0 }}>
            — manage in Sources tab
          </span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {sources.length === 0 && (
            <span style={{ color: "#757575", fontSize: "0.8rem" }}>
              Built-in default recipes couldn't be loaded (offline?) —{" "}
              <button
                onClick={onGoToSourcesTab}
                style={{
                  background: "none", border: "none", color: "#00796B",
                  cursor: "pointer", padding: 0, fontSize: "0.8rem",
                  fontFamily: "inherit", textDecoration: "underline",
                }}
              >
                add your own in Sources
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
                title={enriched ? `${src.enrichedCount} recipes enriched` : "Not enriched — enrich in Sources tab to enable ingredient search"}
                style={{ ...chipStyle(active), opacity: enriched ? 1 : 0.45, minHeight: "40px" }}
              >
                {src.emoji} {src.name}
                {!enriched && <span style={{ marginLeft: "0.3rem", fontSize: "0.7rem" }}>⚠</span>}
              </button>
            );
          })}
        </div>
        {sources.length > 0 && activeEnrichedCount === 0 && (
          <p style={{ color: "#757575", fontSize: "0.72rem", marginTop: "0.5rem" }}>
            No sources selected. Enable one above, or enrich a custom source in the Sources tab first.
          </p>
        )}
      </section>

      {/* Ingredients (U4: chip entry + autocomplete) */}
      <section style={styles.section}>
        <label style={styles.label}>
          Your Ingredients
          <span style={{ color: "#616161", marginLeft: "0.5rem", fontSize: "0.7rem", textTransform: "none", letterSpacing: 0 }}>
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

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Match threshold (U11) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0 0.5rem" }}>
        <label htmlFor="match-threshold" style={{ ...styles.label, marginBottom: 0, whiteSpace: "nowrap" }}>
          Show matches above {matchThreshold}%
        </label>
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
        <span
          title="Match % is the share of a recipe's ingredients you already have (from your entered ingredients plus your store cupboard). Required ingredients must always be present."
          style={{ color: "#616161", fontSize: "0.75rem", cursor: "help" }}
        >
          ⓘ
        </span>
      </div>

      {/* Favourites (U9) — shows favourited recipes even with no ingredients entered */}
      <button
        onClick={onToggleFavouritesOnly}
        aria-pressed={showFavouritesOnly}
        style={{ ...chipStyle(showFavouritesOnly, "#FF8F00"), minHeight: "40px", marginBottom: "0.5rem" }}
      >
        ★ Favourites
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          {narrow ? (
            <div style={{ marginBottom: "0.5rem" }}>
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                style={{
                  width: "100%",
                  minHeight: "40px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.75rem",
                  background: "#FFFFFF",
                  border: "1px solid #E0E0E0",
                  borderRadius: "6px",
                  color: "#757575",
                  fontFamily: "inherit",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                <span>Filters{hasActiveFilter ? " •" : ""}</span>
                <span aria-hidden="true" style={{ opacity: 0.5 }}>{filtersOpen ? "▴" : "▾"}</span>
              </button>
              {filtersOpen && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    padding: "0.75rem",
                    border: "1px solid #E0E0E0",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                  }}
                >
                  <FilterField label="Meal">
                    <FilterDropdown options={mealTypeOptions} selected={mealTypeFilters} onChange={(next) => { setMealTypeFilters(next); setExpandedUrl(null); }} />
                  </FilterField>
                  <FilterField label="Cuisine">
                    <FilterDropdown options={cuisineOptions} selected={cuisineFilters} onChange={(next) => { setCuisineFilters(next); setExpandedUrl(null); }} />
                  </FilterField>
                  <FilterField label="Time">
                    <FilterDropdown options={TIME_OPTIONS} selected={timeFilters} onChange={(next) => { setTimeFilters(next); setExpandedUrl(null); }} />
                  </FilterField>
                  <FilterField label="Steps">
                    <FilterDropdown options={COMPLEXITY_OPTIONS} selected={complexityFilters} onChange={(next) => { setComplexityFilters(next); setExpandedUrl(null); }} />
                  </FilterField>
                  {hasActiveFilter && (
                    <button onClick={clearFilters} style={{ ...clearFiltersBtnStyle, alignSelf: "flex-start" }}>
                      Clear filters ×
                    </button>
                  )}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.6rem" }}>
                {(["match", "time", "steps", "title"] as SortColumn[]).map((col) => (
                  <button key={col} onClick={() => handleSortClick(col)} style={sortChipStyle(sort.column === col)}>
                    {sortLabel(col)}
                    <SortArrow direction={sort.column === col ? sort.direction : null} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Column header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "0.75rem",
                  padding: "0 1rem 0.6rem",
                  borderBottom: "1px solid #E0E0E0",
                  marginBottom: "0.25rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SortHeaderButton column="title" sort={sort} onClick={handleSortClick} label="Recipe" />
                </div>

                <div style={colStyle(52)}>
                  <SortHeaderButton column="match" sort={sort} onClick={handleSortClick} label="Match" />
                </div>

                <div style={colStyle(96)}>
                  <span style={{ ...styles.label, marginBottom: 0 }}>Meal</span>
                  <FilterDropdown
                    options={mealTypeOptions}
                    selected={mealTypeFilters}
                    onChange={(next) => { setMealTypeFilters(next); setExpandedUrl(null); }}
                  />
                </div>

                <div style={colStyle(104)}>
                  <span style={{ ...styles.label, marginBottom: 0 }}>Cuisine</span>
                  <FilterDropdown
                    options={cuisineOptions}
                    selected={cuisineFilters}
                    onChange={(next) => { setCuisineFilters(next); setExpandedUrl(null); }}
                  />
                </div>

                <div style={colStyle(88)}>
                  <SortHeaderButton column="time" sort={sort} onClick={handleSortClick} label="Time" />
                  <FilterDropdown
                    options={TIME_OPTIONS}
                    selected={timeFilters}
                    onChange={(next) => { setTimeFilters(next); setExpandedUrl(null); }}
                  />
                </div>

                <div style={colStyle(96)}>
                  <SortHeaderButton column="steps" sort={sort} onClick={handleSortClick} label="Steps" />
                  <FilterDropdown
                    options={COMPLEXITY_OPTIONS}
                    selected={complexityFilters}
                    onChange={(next) => { setComplexityFilters(next); setExpandedUrl(null); }}
                    alignRight
                  />
                </div>

                <div style={colStyle(60)}>
                  <span style={{ ...styles.label, marginBottom: 0 }}>Missing</span>
                </div>
              </div>
            </>
          )}

          {/* Result count + clear filters */}
          <div style={{ padding: "0.35rem 1rem 0.5rem", fontSize: "0.7rem", color: "#757575", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span>
              {hasActiveFilter
                ? `${filteredResults.length} of ${results.length} recipes`
                : `${results.length} ${results.length === 1 ? "recipe" : "recipes"}`}
            </span>
            {!narrow && hasActiveFilter && (
              <button onClick={clearFilters} style={clearFiltersBtnStyle}>
                Clear filters ×
              </button>
            )}
          </div>

          {/* Rows */}
          <div
            ref={listContainerRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              position: "relative",
              ...(shouldVirtualize ? { height: sortedResults.length * rowHeight } : {}),
            }}
          >
            {visibleResults.map((r, i) => {
              const actualIndex = shouldVirtualize ? rangeStart + i : i;
              return (
                <div
                  key={r.sourceUrl}
                  style={shouldVirtualize ? { position: "absolute", top: actualIndex * rowHeight, left: 0, right: 0 } : undefined}
                >
                  <ResultRow
                    result={r}
                    expanded={expandedUrl === r.sourceUrl}
                    onToggleExpand={() => toggleExpanded(r.sourceUrl)}
                    narrow={narrow}
                    isFavourite={favourites.has(r.sourceUrl)}
                    onToggleFavourite={() => onToggleFavourite(r.sourceUrl)}
                  />
                </div>
              );
            })}

            {filteredResults.length === 0 && (
              <p style={{ color: "#757575", fontSize: "0.8rem", padding: "1rem 1rem 0" }}>
                No results match the current filters.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const clearFiltersBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #E0E0E0",
  color: "#757575",
  borderRadius: "4px",
  padding: "0.1rem 0.45rem",
  fontSize: "0.7rem",
  fontFamily: "inherit",
  cursor: "pointer",
};

function sortLabel(column: SortColumn): string {
  switch (column) {
    case "title": return "Title";
    case "match": return "Match";
    case "time": return "Time";
    case "steps": return "Steps";
  }
}

function sortChipStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: "40px",
    padding: "0.3rem 0.7rem",
    border: "1px solid",
    borderColor: active ? "#00796B" : "#E0E0E0",
    background: active ? "rgba(0,121,107,0.1)" : "#FFFFFF",
    color: active ? "#00796B" : "#757575",
    borderRadius: "20px",
    fontFamily: "inherit",
    fontSize: "0.72rem",
    cursor: "pointer",
  };
}

function SortHeaderButton({
  column,
  sort,
  onClick,
  label,
}: {
  column: SortColumn;
  sort: { column: SortColumn; direction: SortDirection };
  onClick: (column: SortColumn) => void;
  label: string;
}) {
  const active = sort.column === column;
  return (
    <button
      onClick={() => onClick(column)}
      style={{
        ...styles.label,
        marginBottom: 0,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        color: active ? "#00796B" : "#757575",
      }}
    >
      {label}
      <SortArrow direction={active ? sort.direction : null} />
    </button>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span style={{ ...styles.label, marginBottom: 0 }}>{label}</span>
      {children}
    </div>
  );
}
