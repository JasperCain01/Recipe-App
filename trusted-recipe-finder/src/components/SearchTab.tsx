import { useState } from "react";
import { styles, chipStyle } from "../lib/styles";
import { scoreColor } from "../lib/utils";
import RecipeCard from "./RecipeCard";
import FilterDropdown, { type FilterOption } from "./FilterDropdown";
import type { IngredientEntry, SearchResult, SourceMeta } from "../lib/types";

interface SearchTabProps {
  sources: SourceMeta[];
  selectedSources: string[];
  onToggleSource: (id: string) => void;
  entries: IngredientEntry[];
  onIngredientChange: (index: number, text: string) => void;
  onToggleRequired: (index: number) => void;
  onRemoveEntry: (index: number) => void;
  error: string;
  results: SearchResult[];
  matchThreshold: number;
  onThresholdChange: (value: number) => void;
  onGoToSourcesTab: () => void;
}

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

export default function SearchTab({
  sources,
  selectedSources,
  onToggleSource,
  entries,
  onIngredientChange,
  onToggleRequired,
  onRemoveEntry,
  error,
  results,
  matchThreshold,
  onThresholdChange,
  onGoToSourcesTab,
}: SearchTabProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [timeFilters, setTimeFilters] = useState<Set<string>>(new Set());
  const [complexityFilters, setComplexityFilters] = useState<Set<string>>(new Set());
  const [mealTypeFilters, setMealTypeFilters] = useState<Set<string>>(new Set());
  const [cuisineFilters, setCuisineFilters] = useState<Set<string>>(new Set());

  const enrichedSources = sources.filter((s) => s.enrichedCount > 0);
  const activeEnrichedCount = selectedSources.filter((id) =>
    enrichedSources.some((s) => s.id === id)
  ).length;

  // Unique options for each filterable column, derived from the full result set
  const mealTypeOptions: FilterOption[] = [];
  const cuisineOptions: FilterOption[] = [];
  {
    const seen = new Set<string>(); let hasUnknown = false;
    for (const r of results) {
      if (r.mealType) { if (!seen.has(r.mealType)) { seen.add(r.mealType); mealTypeOptions.push({ value: r.mealType, label: r.mealType }); } }
      else hasUnknown = true;
    }
    mealTypeOptions.sort((a, b) => a.label.localeCompare(b.label));
    if (hasUnknown) mealTypeOptions.push({ value: "Unknown", label: "Unknown" });
  }
  {
    const seen = new Set<string>(); let hasUnknown = false;
    for (const r of results) {
      if (r.cuisine) { if (!seen.has(r.cuisine)) { seen.add(r.cuisine); cuisineOptions.push({ value: r.cuisine, label: r.cuisine }); } }
      else hasUnknown = true;
    }
    cuisineOptions.sort((a, b) => a.label.localeCompare(b.label));
    if (hasUnknown) cuisineOptions.push({ value: "Unknown", label: "Unknown" });
  }

  // Apply column filters — OR logic within each filter, AND across filters
  const filteredResults = results.filter((r) => {
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
  });

  const hasActiveFilter =
    timeFilters.size > 0 || complexityFilters.size > 0 ||
    mealTypeFilters.size > 0 || cuisineFilters.size > 0;

  const clearFilters = () => {
    setTimeFilters(new Set());
    setComplexityFilters(new Set());
    setMealTypeFilters(new Set());
    setCuisineFilters(new Set());
  };

  return (
    <div>
      {/* Recipe sources */}
      <section style={styles.section}>
        <label style={styles.label}>
          Recipe Sources
          <span style={{ color: "#9E9E9E", marginLeft: "0.5rem", fontSize: "0.6rem", textTransform: "none", letterSpacing: 0 }}>
            — manage in Sources tab
          </span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {sources.length === 0 && (
            <span style={{ color: "#757575", fontSize: "0.8rem" }}>
              No sources yet —{" "}
              <button
                onClick={onGoToSourcesTab}
                style={{
                  background: "none", border: "none", color: "#00796B",
                  cursor: "pointer", padding: 0, fontSize: "0.8rem",
                  fontFamily: "inherit", textDecoration: "underline",
                }}
              >
                add one in Sources
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
                style={{ ...chipStyle(active), opacity: enriched ? 1 : 0.45 }}
              >
                {src.emoji} {src.name}
                {!enriched && <span style={{ marginLeft: "0.3rem", fontSize: "0.65rem" }}>⚠</span>}
              </button>
            );
          })}
        </div>
        {sources.length > 0 && activeEnrichedCount === 0 && (
          <p style={{ color: "#757575", fontSize: "0.72rem", marginTop: "0.5rem" }}>
            No enriched sources selected. Go to Sources tab and click "Enrich now" to enable ingredient matching.
          </p>
        )}
      </section>

      {/* Ingredients */}
      <section style={styles.section}>
        <label style={styles.label}>
          Your Ingredients
          <span style={{ color: "#9E9E9E", marginLeft: "0.5rem", fontSize: "0.6rem", textTransform: "none", letterSpacing: 0 }}>
            — store cupboard always included
          </span>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {entries.map((entry, i) => {
            const isTrailing = i === entries.length - 1 && !entry.text.trim();
            return (
              <div key={entry.id} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="text"
                  value={entry.text}
                  onChange={(e) => onIngredientChange(i, e.target.value)}
                  placeholder={isTrailing ? "Add ingredient…" : ""}
                  style={styles.input}
                />
                {!isTrailing && (
                  <>
                    <button
                      onClick={() => onToggleRequired(i)}
                      title={entry.required ? "This ingredient is required — click to make optional" : "This ingredient is optional — click to require it"}
                      style={{
                        padding: "0.35rem 0.6rem",
                        border: "1px solid",
                        borderColor: entry.required ? "#00796B" : "#E0E0E0",
                        background: entry.required ? "rgba(0,121,107,0.1)" : "transparent",
                        color: entry.required ? "#00796B" : "#9E9E9E",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "0.65rem",
                        whiteSpace: "nowrap",
                        minWidth: "68px",
                        textAlign: "center",
                      }}
                    >
                      {entry.required ? "Required" : "Optional"}
                    </button>
                    <button
                      onClick={() => onRemoveEntry(i)}
                      title="Remove ingredient"
                      style={{
                        padding: "0.35rem 0.5rem",
                        border: "1px solid #E0E0E0",
                        background: "transparent",
                        color: "#9E9E9E",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "0.8rem",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
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
          style={{ color: "#9E9E9E", fontSize: "0.75rem", cursor: "help" }}
        >
          ⓘ
        </span>
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <div style={{ marginTop: "2rem" }}>

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
            {/* Recipe column — no filter */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Recipe</span>
            </div>

            {/* Match column */}
            <div style={colStyle(52)}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Match ↓</span>
            </div>

            {/* Meal type column */}
            <div style={colStyle(96)}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Meal</span>
              <FilterDropdown
                options={mealTypeOptions}
                selected={mealTypeFilters}
                onChange={(next) => { setMealTypeFilters(next); setExpandedIndex(null); }}
              />
            </div>

            {/* Cuisine column */}
            <div style={colStyle(104)}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Cuisine</span>
              <FilterDropdown
                options={cuisineOptions}
                selected={cuisineFilters}
                onChange={(next) => { setCuisineFilters(next); setExpandedIndex(null); }}
              />
            </div>

            {/* Time column */}
            <div style={colStyle(88)}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Time</span>
              <FilterDropdown
                options={TIME_OPTIONS}
                selected={timeFilters}
                onChange={(next) => { setTimeFilters(next); setExpandedIndex(null); }}
              />
            </div>

            {/* Steps column */}
            <div style={colStyle(96)}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Steps</span>
              <FilterDropdown
                options={COMPLEXITY_OPTIONS}
                selected={complexityFilters}
                onChange={(next) => { setComplexityFilters(next); setExpandedIndex(null); }}
                alignRight
              />
            </div>

            {/* Missing column */}
            <div style={colStyle(60)}>
              <span style={{ ...styles.label, marginBottom: 0 }}>Missing</span>
            </div>
          </div>

          {/* Result count + clear filters */}
          <div style={{ padding: "0.35rem 1rem 0.5rem", fontSize: "0.68rem", color: "#757575", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span>
              {hasActiveFilter
                ? `${filteredResults.length} of ${results.length} recipes`
                : `${results.length} ${results.length === 1 ? "recipe" : "recipes"}`}
            </span>
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                style={{
                  background: "none",
                  border: "1px solid #E0E0E0",
                  color: "#757575",
                  borderRadius: "4px",
                  padding: "0.1rem 0.45rem",
                  fontSize: "0.62rem",
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Clear filters ×
              </button>
            )}
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {filteredResults.map((r, i) => (
              <div key={i}>
                {/* Collapsed row */}
                <button
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.65rem 1rem",
                    background: expandedIndex === i ? "rgba(93,64,55,0.04)" : "#FFFFFF",
                    border: "1px solid",
                    borderColor: expandedIndex === i ? "#BDBDBD" : "#E0E0E0",
                    borderRadius: expandedIndex === i ? "6px 6px 0 0" : "6px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  {/* Recipe + source */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: "#212121",
                      fontSize: "0.85rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: "1.3",
                    }}>
                      {r.title}
                    </div>
                    <div style={{ color: "#9E9E9E", fontSize: "0.68rem", marginTop: "0.1rem" }}>
                      {r.sourceEmoji} {r.source}
                    </div>
                  </div>

                  {/* Match % */}
                  <div style={{ ...colStyle(52), textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.92rem", fontWeight: "bold", color: scoreColor(r.matchScore) }}>
                      {r.matchScore}%
                    </span>
                  </div>

                  {/* Meal type */}
                  <div style={{ ...colStyle(96), flexShrink: 0 }}>
                    <span style={{ fontSize: "0.75rem", color: r.mealType ? "#757575" : "#BDBDBD" }}>
                      {r.mealType ?? "Unknown"}
                    </span>
                  </div>

                  {/* Cuisine */}
                  <div style={{ ...colStyle(104), flexShrink: 0 }}>
                    <span style={{ fontSize: "0.75rem", color: r.cuisine ? "#757575" : "#BDBDBD" }}>
                      {r.cuisine ?? "Unknown"}
                    </span>
                  </div>

                  {/* Time */}
                  <div style={{ ...colStyle(88), flexShrink: 0 }}>
                    <span style={{ fontSize: "0.75rem", color: r.totalTime ? "#757575" : "#BDBDBD" }}>
                      {r.totalTime ?? "Unknown"}
                    </span>
                  </div>

                  {/* Steps */}
                  <div style={{ ...colStyle(96), flexShrink: 0 }}>
                    <span style={{ fontSize: "0.75rem", color: r.instructionCount > 0 ? "#757575" : "#BDBDBD" }}>
                      {r.instructionCount > 0 ? `${r.instructionCount} steps` : "Unknown"}
                    </span>
                  </div>

                  {/* Missing count */}
                  <div style={{ ...colStyle(60), flexShrink: 0, textAlign: "right" }}>
                    {r.missingIngredients.length > 0 ? (
                      <span style={{ fontSize: "0.75rem", color: "#B00020" }}>
                        {r.missingIngredients.length}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#2E7D32" }}>✓</span>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedIndex === i && (
                  <div style={{
                    border: "1px solid #BDBDBD",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                  }}>
                    <RecipeCard result={r} />
                  </div>
                )}
              </div>
            ))}

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
