// Domain types shared across the app.

// ─── Recipe sources ─────────────────────────────────────────────────────────

/** A single entry in a source's lightweight URL index. */
export interface IndexEntry {
  title: string;
  url: string;
}

/** A recipe with full ingredient data fetched from its source page. */
export interface EnrichedEntry extends IndexEntry {
  ingredients: string[];
  cuisine: string | null;
  mealType: string | null;
  totalTime: string | null;
  /** Parsed cooking time in minutes, for filtering. Null if not available. */
  totalTimeMinutes: number | null;
  servings: string | null;
  image: string | null;
  /** Number of instruction steps, used as a complexity proxy. */
  instructionCount: number;
}

/** A recipe website the user has added. */
export interface Source {
  id: string;
  name: string;
  url: string;
  emoji: string;
  active: boolean;
  /** Lightweight URL+title index, or null if not yet indexed */
  index: IndexEntry[] | null;
  /** Enriched recipes with ingredient data */
  enrichedIndex: EnrichedEntry[] | null;
  indexedAt: string | null;
  indexCount: number;
  enrichedCount: number;
  enrichedAt: string | null;
}

// ─── Search filters ──────────────────────────────────────────────────────────

/** Max cooking time in minutes, "unknown" for recipes with no time data, or "any" for no filter. */
export type TimeFilter = "any" | "30" | "60" | "120" | "unknown";

/** Complexity based on instruction step count. */
export type ComplexityFilter = "any" | "simple" | "moderate" | "complex" | "unknown";

/** Meal type label, "unknown" for recipes with no meal type, or "any" for no filter. */
export type MealTypeFilter = string; // "any" | "unknown" | specific label

// ─── Search results ──────────────────────────────────────────────────────────

/** A local search result computed from the enriched index. */
export interface SearchResult {
  title: string;
  source: string;
  sourceEmoji: string;
  sourceUrl: string;
  cuisine: string | null;
  mealType: string | null;
  totalTime: string | null;
  totalTimeMinutes: number | null;
  servings: string | null;
  image: string | null;
  matchScore: number;
  instructionCount: number;
  missingIngredients: string[];
  ingredientsRaw: string[];
}

// ─── UI types ────────────────────────────────────────────────────────────────

export type Tab = "search" | "sources" | "cupboard";

// ─── API responses (mirror what the Vercel functions return) ─────────────────

export interface IndexSourceResponse {
  source: string;
  recipes: IndexEntry[];
  count: number;
  indexed_at: string;
}

export interface FetchRecipeResponse {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  totalTime: string | null;
  prepTime: string | null;
  cookTime: string | null;
  servings: string | null;
  cuisine: string | null;
  category: string | null;
  keywords: string | null;
  ingredients: string[];
  instructions: string[];
  nutrition: {
    calories: string | null;
    protein: string | null;
    fat: string | null;
    carbs: string | null;
  } | null;
  author: string | null;
}
