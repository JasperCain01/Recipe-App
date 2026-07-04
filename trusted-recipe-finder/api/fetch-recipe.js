/**
 * Vercel Function: /api/fetch-recipe
 *
 * Fetches a single recipe page and extracts the real ingredients,
 * instructions, timing, and metadata from its embedded schema.org/Recipe
 * structured data (JSON-LD).
 *
 * Most modern recipe sites include this markup for SEO — RecipeTin Eats,
 * Jane's Patisserie, BBC Good Food, NYT Cooking, Serious Eats, etc.
 *
 * POST body: { url: "https://www.recipetineats.com/some-recipe/" }
 * Response: {
 *   url, title, description, image, totalTime, servings,
 *   cuisine, category, keywords,
 *   ingredients: [string, ...],
 *   instructions: [string, ...],
 *   nutrition: { calories, ... } | null
 * }
 */

import { fetchPage, extractRecipeFromHtml } from "../shared/scrape-lib.js";

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url is required" });

  // Validate URL
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: `Invalid URL: ${url}` });
  }

  try {
    const html = await fetchPage(url, fetch);
    const recipe = extractRecipeFromHtml(html, url);

    if (recipe.ingredients.length === 0) {
      throw new Error("Recipe found but no ingredients could be extracted");
    }

    return res.status(200).json(recipe);
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Failed to fetch recipe",
      url,
    });
  }
}
