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

/**
 * Derive a soft rgba() tint from one of the palette's solid hex tokens, at
 * the same alpha convention as the palette's own hand-picked tints (e.g.
 * `accentTint`, `dangerBg`). Used for positive-framing surfaces (the
 * shopping-list banner, sort/filter emphasis) that need a tint of a token
 * that doesn't already ship one, without inventing a new hue.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Bare hostname for friendly progress copy ("Finding recipes on jamieoliver.com…"). */
export function friendlyDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Plain-language descriptor for the match-threshold slider (U11 -> 4.5). */
export function thresholdDescriptor(threshold: number): string {
  if (threshold <= 30) return "Strict";
  if (threshold <= 60) return "Balanced";
  return "Flexible";
}
