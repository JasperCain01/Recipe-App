// Shared recipe-site scraping/extraction logic — plain ESM so it can be
// imported by the Vercel/Worker API handlers *and* the build script (Session 4)
// without a TypeScript toolchain. `fetch` is injected so callers can swap in
// a platform-specific implementation.

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; TrustedRecipeFinder/1.0; +https://github.com/your-username/trusted-recipe-finder)";

async function fetchWithUA(url, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

/** Fetch a batch of URLs with bounded concurrency, tolerating individual failures. */
async function fetchAllSettled(urls, fetchImpl, concurrency = 5) {
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map((u) => fetchWithUA(u, fetchImpl)));
    results.push(...settled);
  }
  return results;
}

// ─── Sitemap discovery & recipe URL indexing ────────────────────────────────

function extractLocs(xml) {
  const matches = [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi)];
  return matches.map((m) => m[1].trim());
}

function titleFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.replace(/\/$/, "").split("/").pop();
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  } catch {
    return url;
  }
}

async function findSitemap(baseUrl, fetchImpl) {
  const candidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap`,
    `${baseUrl}/recipe-sitemap.xml`,
    `${baseUrl}/post-sitemap.xml`,
  ];

  for (const candidate of candidates) {
    try {
      const text = await fetchWithUA(candidate, fetchImpl);
      // Only accept if it looks like XML with <loc> tags — either a regular
      // <urlset> sitemap or a <sitemapindex> of child sitemaps (the latter
      // has no <url> tags of its own, only <sitemap> ones).
      if (text.includes("<loc>") && (text.includes("<url") || text.includes("<sitemap"))) return text;
    } catch {
      // Try next candidate
    }
  }
  throw new Error(`No sitemap found at ${baseUrl}. Tried: ${candidates.join(", ")}`);
}

/** Recursively resolve a sitemap index into the full list of leaf URLs. */
async function resolveAllUrls(xml, fetchImpl, depth = 0) {
  const locs = extractLocs(xml);

  const isSitemapIndex = xml.includes("<sitemapindex") || xml.includes("<sitemap>");
  if (isSitemapIndex && depth < 2) {
    const childSitemaps = locs.filter((l) => l.endsWith(".xml") || l.includes("sitemap"));
    // Limit to 10 child sitemaps to stay within time budget; fetched concurrently (E5)
    // instead of serially so large sitemap indexes fit inside the free-tier 10s window.
    const settled = await fetchAllSettled(childSitemaps.slice(0, 10), fetchImpl, 5);
    const nested = await Promise.all(
      settled.map((r) => (r.status === "fulfilled" ? resolveAllUrls(r.value, fetchImpl, depth + 1) : [])),
    );
    return nested.flat();
  }

  return locs;
}

/** Filter URLs to likely recipe pages only, based on URL patterns. */
function filterRecipeUrls(urls, baseUrl) {
  const recipePatterns = [
    /\/recipe[s]?\//i,
    /\/dish\//i,
    /\/food\//i,
    /\/cook\//i,
    /\/meal\//i,
  ];

  // Common non-recipe paths to exclude
  const excludePatterns = [
    /\/tag\//i,
    /\/category\//i,
    /\/author\//i,
    /\/page\//i,
    /\/search/i,
    /\/about/i,
    /\/contact/i,
    /\/privacy/i,
    /\/sitemap/i,
    /\.(xml|json|css|js|png|jpg|jpeg|gif|svg|webp)$/i,
  ];

  const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
  // E5: computed once up front, not per-URL inside the filter callback (was O(n^2)).
  const hasRecipePaths = urls.some((u) => recipePatterns.some((p) => p.test(u)));

  return urls.filter((url) => {
    try {
      const u = new URL(url);
      const urlHost = u.hostname.replace(/^www\./, "");
      // Strict match: hostname must equal base or be a subdomain of base
      // This prevents "evilrecipetineats.com" from matching "recipetineats.com"
      if (urlHost !== baseHost && !urlHost.endsWith("." + baseHost)) return false;
      // Must not match exclusion patterns
      if (excludePatterns.some((p) => p.test(url))) return false;
      // If site has recipe-specific paths, prefer those; otherwise allow all paths
      if (hasRecipePaths) return recipePatterns.some((p) => p.test(url));
      // For sites like RecipeTin Eats where recipes are at root level,
      // accept any path that looks like a slug (has content after first slash)
      const pathParts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
      return pathParts.length >= 1 && pathParts[0].length > 3;
    } catch {
      return false;
    }
  });
}

/**
 * Crawl a recipe site's sitemap and return a lightweight {title, url} index.
 * `fetchImpl` is the injected fetch function (e.g. global `fetch`).
 */
export async function indexSite(baseUrl, fetchImpl) {
  const sitemapXml = await findSitemap(baseUrl, fetchImpl);
  const allUrls = await resolveAllUrls(sitemapXml, fetchImpl);
  const recipeUrls = filterRecipeUrls(allUrls, baseUrl);
  const recipes = recipeUrls.slice(0, 2000).map((url) => ({ title: titleFromUrl(url), url }));
  return { recipes, count: recipes.length };
}

/** Fetch a single page's HTML via the injected fetch, with a browser-like UA. */
export async function fetchPage(url, fetchImpl) {
  return fetchWithUA(url, fetchImpl);
}

// ─── JSON-LD Recipe extraction ──────────────────────────────────────────────

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

/** Find a Recipe object inside a (possibly nested) JSON-LD structure. */
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

  const type = node["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
    return node;
  }

  // Check @graph (used by Yoast SEO, Rank Math, etc.)
  if (Array.isArray(node["@graph"])) {
    const found = findRecipeNode(node["@graph"]);
    if (found) return found;
  }

  for (const key of ["mainEntity", "itemListElement", "hasPart"]) {
    if (node[key]) {
      const found = findRecipeNode(node[key]);
      if (found) return found;
    }
  }

  return null;
}

// Normalise field shapes — schema.org allows a lot of variation.

function asString(value) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(asString).filter(Boolean).join(", ");
  if (typeof value === "object") {
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

/** Parse a recipe page's HTML into a normalised recipe object, or throw. */
export function extractRecipeFromHtml(html, sourceUrl) {
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
