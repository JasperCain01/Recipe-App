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

export const config = {
  maxDuration: 30,
};

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TrustedRecipeFinder/1.0; +https://github.com/your-username/trusted-recipe-finder)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Extract JSON-LD blocks from HTML
// ---------------------------------------------------------------------------

function extractJsonLdBlocks(html) {
  const blocks = [];
  // Match <script type="application/ld+json">...</script>
  // Type attribute may be in any order, with single or double quotes
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Some sites have invalid JSON in their LD blocks — skip them
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Find a Recipe object inside a (possibly nested) JSON-LD structure
// ---------------------------------------------------------------------------

function findRecipeNode(node) {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof node !== "object") return null;

  // Check this node
  const type = node["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
    return node;
  }

  // Check @graph (used by Yoast SEO, Rank Math, etc.)
  if (Array.isArray(node["@graph"])) {
    const found = findRecipeNode(node["@graph"]);
    if (found) return found;
  }

  // Check itemListElement, mainEntity, etc.
  for (const key of ["mainEntity", "itemListElement", "hasPart"]) {
    if (node[key]) {
      const found = findRecipeNode(node[key]);
      if (found) return found;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Normalise field shapes (schema.org allows a lot of variation)
// ---------------------------------------------------------------------------

function asString(value) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(asString).filter(Boolean).join(", ");
  if (typeof value === "object") {
    // Common shapes: { "@value": "..." } or { "name": "..." }
    return asString(value["@value"] || value.name || value.text);
  }
  return null;
}

function asStringArray(value) {
  if (value == null) return [];
  if (typeof value === "string") return [value.trim()].filter(Boolean);
  if (Array.isArray(value)) {
    return value.flatMap(asStringArray);
  }
  if (typeof value === "object") {
    // Schema HowToStep: { "@type": "HowToStep", "text": "..." }
    if (value.text) return [asString(value.text)].filter(Boolean);
    if (value.name && !value.text) return [asString(value.name)].filter(Boolean);
    // HowToSection: { "@type": "HowToSection", "itemListElement": [...] }
    if (value.itemListElement) return asStringArray(value.itemListElement);
  }
  return [];
}

function asImage(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return asImage(value[0]);
  if (typeof value === "object") return value.url || value["@id"] || null;
  return null;
}

// Convert ISO 8601 duration (PT1H30M) to "1h 30m" or just minutes
function parseDuration(iso) {
  if (!iso || typeof iso !== "string") return null;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) return iso; // Return as-is if it's not ISO format
  const hours = parseInt(match[1] || 0);
  const mins = parseInt(match[2] || 0);
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  if (mins) return `${mins} mins`;
  return null;
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

function extractRecipe(html, sourceUrl) {
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) {
    throw new Error("No structured recipe data found on this page");
  }

  // Try each JSON-LD block until we find a Recipe
  let recipe = null;
  for (const block of blocks) {
    recipe = findRecipeNode(block);
    if (recipe) break;
  }

  if (!recipe) {
    throw new Error("Page has structured data but no Recipe schema");
  }

  return {
    url: sourceUrl,
    title: asString(recipe.name) || "Untitled recipe",
    description: asString(recipe.description),
    image: asImage(recipe.image),
    totalTime: parseDuration(recipe.totalTime) || parseDuration(recipe.cookTime) || null,
    prepTime: parseDuration(recipe.prepTime),
    cookTime: parseDuration(recipe.cookTime),
    servings: asString(recipe.recipeYield) || asString(recipe.yield),
    cuisine: asString(recipe.recipeCuisine),
    category: asString(recipe.recipeCategory),
    keywords: asString(recipe.keywords),
    ingredients: asStringArray(recipe.recipeIngredient || recipe.ingredients),
    instructions: asStringArray(recipe.recipeInstructions),
    nutrition: recipe.nutrition && typeof recipe.nutrition === "object"
      ? {
          calories: asString(recipe.nutrition.calories),
          protein: asString(recipe.nutrition.proteinContent),
          fat: asString(recipe.nutrition.fatContent),
          carbs: asString(recipe.nutrition.carbohydrateContent),
        }
      : null,
    author: asString(recipe.author),
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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
    const html = await fetchPage(url);
    const recipe = extractRecipe(html, url);

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
