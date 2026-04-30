// Local ingredient-matching search — no AI required.
// All computation is in-memory over the enriched index stored in IndexedDB.

import type { Source, SearchResult, IngredientEntry } from "./types";

// ─── Text normalisation ──────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "fresh", "dried", "large", "small", "medium", "whole", "chopped", "sliced",
  "diced", "minced", "grated", "ground", "cooked", "raw", "organic", "sea",
  "fine", "coarse", "extra", "virgin", "the", "and", "or", "for", "with",
  "into", "from", "plus", "about", "piece", "pieces", "handful", "little",
  "few", "some", "good", "quality", "best", "homemade", "bought", "store",
  "approximately", "optional", "taste", "needed", "required",
]);

// Common UK/US ingredient synonym pairs
const SYNONYMS: Record<string, string> = {
  courgette: "zucchini",   zucchini: "courgette",
  aubergine: "eggplant",   eggplant: "aubergine",
  coriander: "cilantro",   cilantro: "coriander",
  capsicum: "pepper",      prawn: "shrimp",
  shrimp: "prawn",         cornflour: "cornstarch",
  cornstarch: "cornflour", scallion: "onion",
  sultana: "raisin",       raisin: "sultana",
  bacon: "pancetta",       pancetta: "bacon",
};

function stripQuantities(text: string): string {
  return text
    .replace(
      /\d[\d½¼¾⅓⅔/.\s-]*\s*(?:g|kg|ml|l|oz|lb|lbs|tsp|tbsp|tablespoons?|teaspoons?|cups?|cloves?|bunches?|handfuls?|pinch(?:es)?|slices?|cans?|tins?|bags?|packs?|sprigs?|heads?|stalks?|pieces?|portions?)\b/gi,
      " "
    )
    .replace(/\b\d+\b/g, " ");
}

function tokenise(text: string): string[] {
  return stripQuantities(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function stem(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ves") && word.length > 4) return word.slice(0, -3) + "f";
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function normTokens(tokens: string[]): Set<string> {
  const result = new Set<string>();
  for (const t of tokens) {
    const s = stem(t);
    result.add(s);
    const syn = SYNONYMS[t];
    if (syn) result.add(stem(syn));
  }
  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

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
 */
export function searchRecipes(
  entries: IngredientEntry[],
  cupboard: string[],
  sources: Source[],
  selectedSourceIds: string[],
  minScore = 25
): SearchResult[] {
  const available = buildAvailableTokens(entries.map((e) => e.text), cupboard);

  // Token sets for required ingredients — every recipe must match all of them
  const requiredSets = entries
    .filter((e) => e.required && e.text.trim())
    .map((e) => normTokens(tokenise(e.text)));

  const results: SearchResult[] = [];

  for (const source of sources) {
    if (!selectedSourceIds.includes(source.id)) continue;
    if (!source.enrichedIndex || source.enrichedIndex.length === 0) continue;

    for (const recipe of source.enrichedIndex) {
      if (recipe.ingredients.length === 0) continue;

      // Drop recipe if it doesn't contain every required ingredient (only when 2+ required)
      if (requiredSets.length > 1) {
        const meetsRequired = requiredSets.every((reqTokens) =>
          recipe.ingredients.some((line) => {
            const lineTokens = normTokens(tokenise(line));
            return [...reqTokens].some((t) => lineTokens.has(t));
          })
        );
        if (!meetsRequired) continue;
      }

      const matched: string[] = [];
      const missing: string[] = [];

      for (const line of recipe.ingredients) {
        const tokens = normTokens(tokenise(line));
        const isMatched = [...tokens].some((t) => available.has(t));
        if (isMatched) {
          matched.push(line);
        } else {
          missing.push(line);
        }
      }

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
