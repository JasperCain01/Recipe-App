// Local ingredient-matching search — no AI required.
// All computation is in-memory over recipe records loaded from IndexedDB.
// Per-ingredient tokens are precomputed at enrichment time (shared/tokens.js),
// so the hot loop here is pure Set arithmetic — no regex or tokenising.

import { normTokens, tokenise } from "../../shared/tokens.js";
import type { SourceMeta, RecipeRecord, SearchResult, IngredientEntry } from "./types";

// "Chicken broth" / "beef stock" should not satisfy a plain protein
// requirement unless the user explicitly required broth/stock.
const STOCK_TERMS = new Set(["broth", "stock"]);

/**
 * Build the normalised token set for the user's available ingredients
 * (their entered ingredient texts plus their store cupboard).
 */
export function buildAvailableTokens(
  ingredientTexts: string[],
  cupboard: string[]
): Set<string> {
  return normTokens([...ingredientTexts, ...cupboard].flatMap(tokenise));
}

/**
 * Score and rank all enriched recipes from the selected sources against the
 * user's available ingredients. Returns all matches above minScore, sorted
 * by match score descending. Post-search filtering (time, complexity) is
 * handled client-side in the results table.
 *
 * Recipes must already carry precomputed `tokens` (see
 * `tokensForIngredientLine` / the lazy-migration step in App.tsx) — a recipe
 * without them is skipped rather than tokenised here.
 */
export function searchRecipes(
  entries: IngredientEntry[],
  cupboard: string[],
  sources: { meta: SourceMeta; recipes: RecipeRecord[] }[],
  minScore = 25
): SearchResult[] {
  const available = buildAvailableTokens(entries.map((e) => e.text), cupboard);

  // Token sets for required ingredients — every recipe must match all of them
  const requiredSets = entries
    .filter((e) => e.required && e.text.trim())
    .map((e) => normTokens(tokenise(e.text)));

  const results: SearchResult[] = [];

  for (const { meta: source, recipes } of sources) {
    for (const recipe of recipes) {
      if (recipe.ingredients.length === 0 || !recipe.tokens) continue;
      const tokens = recipe.tokens;

      // Drop recipe if it doesn't contain every required ingredient
      if (requiredSets.length > 0) {
        const meetsRequired = requiredSets.every((reqTokens) =>
          tokens.some(({ strict }) => {
            const strictSet = new Set(strict);
            return [...reqTokens].some((t) => {
              if (!strictSet.has(t)) return false;
              // "chicken broth" / "beef stock" should not satisfy a protein requirement;
              // only skip if the user didn't explicitly require broth/stock
              if (!STOCK_TERMS.has(t) && (strictSet.has("broth") || strictSet.has("stock"))) return false;
              return true;
            });
          })
        );
        if (!meetsRequired) continue;
      }

      const matched: string[] = [];
      const missing: string[] = [];

      recipe.ingredients.forEach((line, i) => {
        const isMatched = tokens[i].all.some((t) => available.has(t));
        if (isMatched) {
          matched.push(line);
        } else {
          missing.push(line);
        }
      });

      const matchScore = Math.round(
        (matched.length / recipe.ingredients.length) * 100
      );
      if (matchScore < minScore) continue;

      results.push({
        title: recipe.title,
        source: source.name,
        sourceEmoji: source.emoji,
        sourceUrl: recipe.url,
        cuisine: recipe.cuisine,
        mealType: recipe.mealType,
        totalTime: recipe.totalTime,
        totalTimeMinutes: recipe.totalTimeMinutes,
        servings: recipe.servings,
        image: recipe.image,
        matchScore,
        instructionCount: recipe.instructionCount,
        missingIngredients: missing,
        ingredientsRaw: recipe.ingredients,
      });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
