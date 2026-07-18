// Cloudflare Worker: hosts /api/scrape and /api/fetch-recipe for the
// GitHub-Pages-hosted frontend, over the same shared/scrape-lib.js the
// build script uses. CORS is restricted to the deployed Pages origin
// (env.ALLOWED_ORIGIN) plus localhost, instead of "*".

import { indexSite, fetchPage, extractRecipeFromHtml } from "../shared/scrape-lib.js";

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h (E7)
const LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function corsHeaders(origin, env) {
  const allowed = env.ALLOWED_ORIGIN ? [...LOCAL_ORIGINS, env.ALLOWED_ORIGIN] : LOCAL_ORIGINS;
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function handleScrape(request, headers) {
  const { url } = await readBody(request);
  if (!url) return json({ error: "url is required in request body" }, 400, headers);

  let baseUrl;
  try {
    baseUrl = new URL(url.startsWith("http") ? url : `https://${url}`).origin;
  } catch {
    return json({ error: `Invalid URL: ${url}` }, 400, headers);
  }

  try {
    const { recipes, count } = await indexSite(baseUrl, fetch);
    return json({ source: baseUrl, recipes, count, indexed_at: new Date().toISOString() }, 200, headers);
  } catch (err) {
    return json({ error: err.message || "Failed to index site", source: baseUrl }, 500, headers);
  }
}

/** Cache successful fetch-recipe results by target URL (E7) — the Cache API
 *  keys off a Request, so a synthetic GET request encodes the target URL. */
function cacheKeyFor(url) {
  return new Request(`https://cache-key.trusted-recipe-finder.internal/fetch-recipe?url=${encodeURIComponent(url)}`);
}

async function handleFetchRecipe(request, headers, ctx) {
  const { url } = await readBody(request);
  if (!url) return json({ error: "url is required" }, 400, headers);
  try {
    new URL(url);
  } catch {
    return json({ error: `Invalid URL: ${url}` }, 400, headers);
  }

  const cache = caches.default;
  const cacheKey = cacheKeyFor(url);
  const cached = await cache.match(cacheKey);
  if (cached) return json(await cached.json(), 200, headers);

  try {
    const html = await fetchPage(url, fetch);
    const recipe = extractRecipeFromHtml(html, url);
    if (recipe.ingredients.length === 0) {
      throw new Error("Recipe found but no ingredients could be extracted");
    }

    const cacheEntry = new Response(JSON.stringify(recipe), {
      headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` },
    });
    ctx.waitUntil(cache.put(cacheKey, cacheEntry));

    return json(recipe, 200, headers);
  } catch (err) {
    return json({ error: err.message || "Failed to fetch recipe", url }, 500, headers);
  }
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env);

    if (request.method === "OPTIONS") return new Response(null, { status: 200, headers });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);

    if (pathname === "/api/scrape") return handleScrape(request, headers);
    if (pathname === "/api/fetch-recipe") return handleFetchRecipe(request, headers, ctx);

    return json({ error: "Not found" }, 404, headers);
  },
};
