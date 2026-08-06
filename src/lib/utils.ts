// Pure functions used across the app — no React, no side effects.

import type { ThemeTokens } from "./styles";

export { deriveMealType } from "../../shared/recipe-meta.js";

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
 * Red never appears in scores — scoreLow is a warm neutral, not a danger tone.
 */
export function scoreColor(score: number, t: ThemeTokens): string {
  if (score >= 80) return t.success;
  if (score >= 40) return t.scoreMid;
  return t.scoreLow;
}
