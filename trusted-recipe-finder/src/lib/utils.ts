// Pure functions used across the app — no React, no side effects.

/**
 * Pick a relevant emoji for a recipe-source name based on keywords.
 * Falls back to 🍽 for unknown sites.
 */
export function pickEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bake") || n.includes("pastry") || n.includes("cake") || n.includes("bread")) return "🎂";
  if (n.includes("vegan") || n.includes("plant") || n.includes("veggie") || n.includes("green")) return "🥗";
  if (n.includes("bbq") || n.includes("grill") || n.includes("smoke")) return "🔥";
  if (n.includes("noodle") || n.includes("ramen") || n.includes("asian") || n.includes("wok")) return "🍜";
  if (n.includes("pizza") || n.includes("italian") || n.includes("pasta")) return "🍕";
  if (n.includes("curry") || n.includes("indian") || n.includes("spice")) return "🍛";
  if (n.includes("sweet") || n.includes("dessert") || n.includes("chocolate")) return "🍫";
  if (n.includes("healthy") || n.includes("fit") || n.includes("diet")) return "🥦";
  if (n.includes("jamie") || n.includes("nigella") || n.includes("gordon") || n.includes("delia")) return "👨‍🍳";
  return "🍽";
}

/**
 * Normalise a user-entered URL to its origin (scheme + host).
 * Adds https:// if missing, returns input unchanged on failure.
 */
export function normaliseUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  try {
    return new URL(u).origin;
  } catch {
    return u;
  }
}

/**
 * Generate a stable-ish unique id from a name plus a timestamp.
 */
export function makeId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Date.now();
}

/**
 * Map a 0-100 match score to a colour for visual feedback.
 */
export function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

const MEAL_TYPE_PATTERNS: [RegExp, string][] = [
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

/**
 * Derive a meal type label from a recipe's category and keywords fields.
 * Returns null if no recognisable meal type is found.
 */
export function deriveMealType(
  category: string | null,
  keywords: string | null
): string | null {
  const text = [category, keywords].filter(Boolean).join(" ");
  if (!text) return null;
  for (const [pattern, label] of MEAL_TYPE_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}
