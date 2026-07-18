// Small pure helpers for deriving recipe metadata fields, shared between the
// browser app's enrichment step and the build script (Session 4) so both
// produce identically-shaped RecipeRecord data. Plain ESM, no TS toolchain.

const MEAL_TYPE_PATTERNS = [
  [/\bbreakfast\b|\bbrunch\b/i, "Breakfast"],
  [/\bdessert\b|\bsweet treat|\bcake\b|\bcookies?\b|\bbiscuit\b|\bpudding\b|\bpie\b|\btart\b|\bpastry\b|\bmuffin\b|\bbrownie\b|\bfudge\b|\bice cream\b/i, "Dessert"],
  [/\blunch\b|\bsandwich\b|\bwrap\b|\bpacked lunch\b/i, "Lunch"],
  [/\bdinner\b|\bsupper\b|\bmain course\b|\bmain dish\b|\bevening meal\b/i, "Dinner"],
  [/\bstarter\b|\bappetiz|\bcanap/i, "Starter"],
  [/\bside dish\b|\bside\b/i, "Side"],
  [/\bsnack\b/i, "Snack"],
  [/\bsoup\b|\bstew\b|\bbroth\b|\bchowder\b/i, "Soup"],
  [/\bsalad\b/i, "Salad"],
  [/\bdrink\b|\bcocktail\b|\bsmoothie\b|\bjuice\b|\bbeverage\b/i, "Drink"],
];

/** Derive a meal type label from a recipe's category and keywords fields. */
export function deriveMealType(category, keywords) {
  const text = [category, keywords].filter(Boolean).join(" ");
  if (!text) return null;
  for (const [pattern, label] of MEAL_TYPE_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/** Parse the human-readable time string produced by fetch-recipe (e.g. "1h 30m") into minutes. */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const h = timeStr.match(/(\d+)\s*h/);
  const m = timeStr.match(/(\d+)\s*m/);
  const total = (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
  return total > 0 ? total : null;
}
