/**
 * Vercel Function: /api/scrape
 *
 * Accepts a POST request with a recipe site URL, fetches its sitemap,
 * parses recipe titles and URLs, and returns a lightweight index.
 *
 * POST body: { url: "https://www.recipetineats.com" }
 * Response:  { source: "...", recipes: [{ title, url }], count: N }
 */

export const config = {
  maxDuration: 60, // seconds — requires Vercel Pro; free tier allows 10s
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a URL with a browser-like User-Agent so sites don't block us.
 */
async function fetchWithUA(url) {
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

/**
 * Extract all <loc> values from a sitemap XML string.
 */
function extractLocs(xml) {
  const matches = [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi)];
  return matches.map((m) => m[1].trim());
}

/**
 * Try to derive a human-readable title from a recipe URL.
 * e.g. "https://recipetineats.com/chicken-tikka-masala/" → "Chicken Tikka Masala"
 */
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

/**
 * Attempt to fetch a sitemap from a list of common locations.
 * Returns the raw XML of the first one found.
 */
async function findSitemap(baseUrl) {
  const candidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap`,
    `${baseUrl}/recipe-sitemap.xml`,
    `${baseUrl}/post-sitemap.xml`,
  ];

  for (const candidate of candidates) {
    try {
      const text = await fetchWithUA(candidate);
      // Only accept if it looks like XML with <loc> tags
      if (text.includes("<loc>") && text.includes("<url")) return { url: candidate, text };
    } catch {
      // Try next candidate
    }
  }
  throw new Error(`No sitemap found at ${baseUrl}. Tried: ${candidates.join(", ")}`);
}

/**
 * Given sitemap XML, recursively resolve any nested sitemaps (sitemap index),
 * then return all recipe-like URLs.
 */
async function resolveAllUrls(xml, baseUrl, depth = 0) {
  const locs = extractLocs(xml);

  // If this is a sitemap index (contains other sitemaps), fetch each child
  const isSitemapIndex = xml.includes("<sitemapindex") || xml.includes("<sitemap>");
  if (isSitemapIndex && depth < 2) {
    const childSitemaps = locs.filter(
      (l) => l.endsWith(".xml") || l.includes("sitemap")
    );
    const allUrls = [];
    // Limit to 10 child sitemaps to stay within time budget
    for (const child of childSitemaps.slice(0, 10)) {
      try {
        const childXml = await fetchWithUA(child);
        const childUrls = await resolveAllUrls(childXml, baseUrl, depth + 1);
        allUrls.push(...childUrls);
      } catch {
        // Skip failed child sitemaps
      }
    }
    return allUrls;
  }

  return locs;
}

/**
 * Filter URLs to likely recipe pages only, based on URL patterns.
 */
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
      const hasRecipePaths = urls.some((u) => recipePatterns.some((p) => p.test(u)));
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

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS headers — allow requests from your frontend domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url is required in request body" });

  // Normalise base URL
  let baseUrl;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    baseUrl = parsed.origin;
  } catch {
    return res.status(400).json({ error: `Invalid URL: ${url}` });
  }

  try {
    // 1. Find the sitemap
    const { text: sitemapXml } = await findSitemap(baseUrl);

    // 2. Resolve all URLs (including nested sitemaps)
    const allUrls = await resolveAllUrls(sitemapXml, baseUrl);

    // 3. Filter to recipe pages only
    const recipeUrls = filterRecipeUrls(allUrls, baseUrl);

    // 4. Build index — title derived from URL slug
    const recipes = recipeUrls.slice(0, 2000).map((url) => ({
      title: titleFromUrl(url),
      url,
    }));

    return res.status(200).json({
      source: baseUrl,
      recipes,
      count: recipes.length,
      indexed_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Failed to index site",
      source: baseUrl,
    });
  }
}
