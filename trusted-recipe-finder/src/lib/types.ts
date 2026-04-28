// Domain types shared across the app.
// Keep this file as the single source of truth for shapes that cross
// module boundaries (sources, recipes, providers, etc.).

// ─── Recipe sources ─────────────────────────────────────────────────────────

/** A single entry in a source's recipe index. */
export interface IndexEntry {
  title: string;
  url: string;
}

/** A recipe website the user has added. */
export interface Source {
  /** Stable unique id (used as IndexedDB key) */
  id: string;
  /** Display name */
  name: string;
  /** Origin URL (scheme + host) */
  url: string;
  /** Auto-assigned emoji for visual identification */
  emoji: string;
  /** Whether this source is currently selected for searches */
  active: boolean;
  /** The indexed recipes, or null if not yet indexed */
  index: IndexEntry[] | null;
  /** ISO timestamp of last successful indexing */
  indexedAt: string | null;
  /** Number of recipes in the index */
  indexCount: number;
}

// ─── Recipe results ─────────────────────────────────────────────────────────

/** AI-generated ingredient with name + amount. Used pre-verification. */
export interface RecipeIngredient {
  name: string;
  amount: string;
}

/** A recipe suggestion. Fields starting with `verify*` are added after
 *  the recipe is checked against its source page. */
export interface Recipe {
  title: string;
  source: string;
  sourceUrl: string | null;
  cuisine: string | null;
  totalTime: string | null;
  difficulty: "Easy" | "Medium" | "Hard" | null;
  matchScore: number;
  missingIngredients?: string[];
  ingredients: RecipeIngredient[];
  /** When verified, this contains the raw ingredient lines from the source page. */
  ingredientsRaw?: string[];
  instructions: string[];
  description: string;

  // Verification metadata (added after backend verification)
  verified?: boolean;
  verifyFailed?: boolean;
  servings?: string | null;
  image?: string | null;
}

// ─── AI providers ───────────────────────────────────────────────────────────

export type ProviderId = "anthropic" | "openai";

export interface ProviderModel {
  id: string;
  name: string;
}

export interface Provider {
  id: ProviderId;
  name: string;
  keyPlaceholder: string;
  keyHelp: string;
  keyUrl: string;
  models: ProviderModel[];
}

/** Map of provider id to API key (typed loosely because keys are user-supplied) */
export type ApiKeys = Partial<Record<ProviderId, string>>;

// ─── UI types ──────────────────────────────────────────────────────────────

export type Tab = "search" | "sources" | "cupboard" | "settings";

// ─── API responses (mirror what the Vercel functions return) ───────────────

export interface IndexSourceResponse {
  source: string;
  recipes: IndexEntry[];
  count: number;
  indexed_at: string;
}

export interface SuggestResponse {
  recipes: Recipe[];
  provider: ProviderId;
  model: string;
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
