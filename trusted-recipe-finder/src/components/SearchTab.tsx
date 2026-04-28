import { styles, chipStyle, primaryBtn } from "../lib/styles";
import { CUISINE_OPTIONS } from "../lib/constants";
import { scoreColor } from "../lib/utils";
import RecipeCard from "./RecipeCard";
import type { Recipe, Source } from "../lib/types";

interface SearchTabProps {
  // Source state
  sources: Source[];
  selectedSources: string[];
  onToggleSource: (id: string) => void;
  // Cuisine state
  selectedCuisines: string[];
  onToggleCuisine: (cuisine: string) => void;
  // Ingredients
  ingredients: string;
  onIngredientsChange: (value: string) => void;
  // Search state
  loading: boolean;
  error: string;
  onFindRecipes: () => void;
  // Results
  recipes: Recipe[];
  expandedRecipe: number | null;
  onExpandRecipe: (index: number) => void;
  verifying: Set<number>;
  // Navigation
  onGoToSourcesTab: () => void;
}

export default function SearchTab({
  sources,
  selectedSources,
  onToggleSource,
  selectedCuisines,
  onToggleCuisine,
  ingredients,
  onIngredientsChange,
  loading,
  error,
  onFindRecipes,
  recipes,
  expandedRecipe,
  onExpandRecipe,
  verifying,
  onGoToSourcesTab,
}: SearchTabProps) {
  return (
    <div>
      {/* Recipe sources */}
      <section style={styles.section}>
        <label style={styles.label}>
          Recipe Sources
          <span
            style={{
              color: "#2a2a2a",
              marginLeft: "0.5rem",
              fontSize: "0.6rem",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            — manage in Sources tab
          </span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {sources.length === 0 && (
            <span style={{ color: "#333", fontSize: "0.8rem" }}>
              No sources yet —{" "}
              <button
                onClick={onGoToSourcesTab}
                style={{
                  background: "none",
                  border: "none",
                  color: "#c4a96e",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                  textDecoration: "underline",
                }}
              >
                add one in Sources
              </button>
            </span>
          )}
          {sources.map((src) => (
            <button
              key={src.id}
              onClick={() => onToggleSource(src.id)}
              style={chipStyle(selectedSources.includes(src.id))}
            >
              {src.emoji} {src.name}
            </button>
          ))}
        </div>
      </section>

      {/* Cuisines */}
      <section style={styles.section}>
        <label style={styles.label}>Cuisine Preferences</label>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => onToggleCuisine(c)}
              style={chipStyle(selectedCuisines.includes(c), "#c4a96e")}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Ingredients */}
      <section style={styles.section}>
        <label style={styles.label}>
          Your Ingredients
          <span
            style={{
              color: "#2a2a2a",
              marginLeft: "0.5rem",
              fontSize: "0.6rem",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            store cupboard always included
          </span>
        </label>
        <textarea
          value={ingredients}
          onChange={(e) => onIngredientsChange(e.target.value)}
          placeholder="e.g. chicken thighs, cherry tomatoes, courgette, fresh basil..."
          rows={3}
          style={styles.textarea}
        />
      </section>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <button onClick={onFindRecipes} disabled={loading} style={primaryBtn(loading)}>
        {loading ? "Finding recipes..." : "Find Recipes →"}
      </button>

      {/* Results */}
      {recipes.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <p style={{ ...styles.label, marginBottom: "1rem" }}>
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} found
          </p>

          {/* Tab strip for switching between recipes */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {recipes.map((r, i) => (
              <button
                key={i}
                onClick={() => onExpandRecipe(i)}
                style={{
                  flex: 1,
                  padding: "0.65rem 0.4rem",
                  border: "1px solid",
                  borderColor: expandedRecipe === i ? "#e8d5b0" : "#1e1e1e",
                  background: expandedRecipe === i ? "rgba(232,213,176,0.05)" : "#141414",
                  color: expandedRecipe === i ? "#e8d5b0" : "#444",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.72rem",
                  transition: "all 0.15s",
                  textAlign: "center",
                  position: "relative",
                }}
              >
                {verifying.has(i) && (
                  <span style={{ position: "absolute", top: "0.3rem", right: "0.4rem", fontSize: "0.55rem", color: "#c4a96e" }}>
                    ⏳
                  </span>
                )}
                {r.verified && (
                  <span
                    title="Verified"
                    style={{ position: "absolute", top: "0.3rem", right: "0.4rem", fontSize: "0.55rem", color: "#4ade80" }}
                  >
                    ✓
                  </span>
                )}
                <div style={{ marginBottom: "0.2rem", lineHeight: "1.3" }}>{r.title}</div>
                <div style={{ color: scoreColor(r.matchScore), fontSize: "0.7rem" }}>{r.matchScore}% match</div>
              </button>
            ))}
          </div>

          {/* Expanded card */}
          {expandedRecipe !== null && recipes[expandedRecipe] && (
            <RecipeCard
              recipe={recipes[expandedRecipe]}
              source={sources.find((s) => s.name === recipes[expandedRecipe].source)}
              isVerifying={verifying.has(expandedRecipe)}
            />
          )}
        </div>
      )}
    </div>
  );
}
