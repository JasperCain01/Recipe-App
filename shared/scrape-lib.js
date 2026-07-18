// Shared recipe-site scraping/extraction logic — plain ESM so it can be
// imported by the Worker API handlers *and* the build script without a
// TypeScript toolchain. `fetch` is injected so callers can swap in
// a platform-specific implementation.

// Recipe sites behind CDN bot protection (Cloudflare et al) hard-403 anything
// that self-identifies as a bot, so the UA has to look like a real browser.
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function fetchWithUA(url, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sitemap child fetches get their own retries: CDN rate limiting shows up as
// intermittent 403/429 on burst traffic, and losing a child sitemap silently
// loses every recipe underneath it.
async function fetchWithUARetries(url, fetchImpl, retries = 2, delayMs = 750) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithUA(url, fetchImpl);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastErr;
}

/** Fetch a batch of URLs with bounded concurrency, tolerating individual failures. */
async function fetchAllSettled(urls, fetchImpl, concurrency = 3, batchDelayMs = 250) {
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map((u) => fetchWithUARetries(u, fetchImpl)));
    results.push(...settled);
    if (i + concurrency < urls.length) await sleep(batchDelayMs);
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

// The sites' own robots.txt is the authoritative place sitemaps are declared;
// guessed paths are only a fallback for sites that don't declare one.
async function sitemapsFromRobots(baseUrl, fetchImpl) {
  try {
    const text = await fetchWithUARetries(`${baseUrl}/robots.txt`, fetchImpl);
    return [...text.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  } catch {
    return [];
  }
}

async function findSitemap(baseUrl, fetchImpl, diagnostics) {
  const candidates = [
    ...(await sitemapsFromRobots(baseUrl, fetchImpl)),
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap`,
    `${baseUrl}/recipe-sitemap.xml`,
    `${baseUrl}/post-sitemap.xml`,
  ];

  for (const candidate of candidates) {
    try {
      const text = await fetchWithUARetries(candidate, fetchImpl);
      // Only accept if it looks like XML with <loc> tags — either a regular
      // <urlset> sitemap or a <sitemapindex> of child sitemaps (the latter
      // has no <url> tags of its own, only <sitemap> ones).
      if (text.includes("<loc>") && (text.includes("<url") || text.includes("<sitemap"))) {
        if (diagnostics) diagnostics.sitemapUrl = candidate;
        return text;
      }
      if (diagnostics) diagnostics.errors.push(`${candidate}: not a sitemap`);
    } catch (err) {
      if (diagnostics) diagnostics.errors.push(`${candidate}: ${err.message}`);
    }
  }
  throw new Error(`No sitemap found at ${baseUrl}. Tried: ${candidates.join(", ")}`);
}

// Crawl budgets: enough to cover a large recipe site's full sitemap index
// without letting a pathological one (news sites list hundreds of children)
// run away with the build.
const MAX_CHILD_SITEMAPS = 50;
const MAX_LEAF_URLS = 20000;

// Children whose URL looks recipe/content-bearing are fetched first, so the
// leaf-URL budget is spent on the sitemaps most likely to contain recipes.
function childPriority(url) {
  if (/recipe/i.test(url)) return 0;
  if (/post|content|page-?\d/i.test(url)) return 1;
  return 2;
}

/** Recursively resolve a sitemap index into the full list of leaf URLs. */
async function resolveAllUrls(xml, fetchImpl, depth = 0, diagnostics = null) {
  const locs = extractLocs(xml);

  const isSitemapIndex = xml.includes("<sitemapindex") || xml.includes("<sitemap>");
  if (isSitemapIndex && depth < 2) {
    const childSitemaps = locs
      .filter((l) => l.endsWith(".xml") || l.includes("sitemap"))
      .sort((a, b) => childPriority(a) - childPriority(b))
      .slice(0, MAX_CHILD_SITEMAPS);
    if (diagnostics && depth === 0) diagnostics.childSitemaps = childSitemaps.length;

    const urls = [];
    // Batches of 3 with a pause, rather than one big concurrent burst, to stay
    // under CDN rate limits — a burst is how child sitemaps got dropped before.
    for (let i = 0; i < childSitemaps.length && urls.length < MAX_LEAF_URLS; i += 3) {
      const batch = childSitemaps.slice(i, i + 3);
      const settled = await fetchAllSettled(batch, fetchImpl, 3);
      for (let j = 0; j < settled.length; j++) {
        const r = settled[j];
        if (r.status === "fulfilled") {
          urls.push(...(await resolveAllUrls(r.value, fetchImpl, depth + 1, diagnostics)));
        } else if (diagnostics) {
          diagnostics.errors.push(`${batch[j]}: ${String(r.reason?.message || r.reason)}`);
        }
      }
    }
    return urls;
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
  // Only trust recipe-specific paths when they form a real cluster. Sites like
  // RecipeTin Eats keep recipes at root level (/<slug>/) with a single
  // /recipes/ hub page — treating that one match as "the recipe section"
  // used to swallow the entire site down to that hub URL.
  const recipeMatchCount = urls.filter((u) => recipePatterns.some((p) => p.test(u))).length;
  const hasRecipePaths = recipeMatchCount >= Math.max(10, urls.length * 0.01);

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
  const diagnostics = { sitemapUrl: null, childSitemaps: 0, leafUrls: 0, errors: [] };
  const sitemapXml = await findSitemap(baseUrl, fetchImpl, diagnostics);
  const allUrls = [...new Set(await resolveAllUrls(sitemapXml, fetchImpl, 0, diagnostics))];
  diagnostics.leafUrls = allUrls.length;
  const recipeUrls = filterRecipeUrls(allUrls, baseUrl);
  const recipes = recipeUrls.slice(0, 2000).map((url) => ({ title: titleFromUrl(url), url }));
  return { recipes, count: recipes.length, diagnostics };
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
