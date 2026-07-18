/**
 * Vercel Function: /api/scrape
 *
 * Accepts a POST request with a recipe site URL, fetches its sitemap,
 * parses recipe titles and URLs, and returns a lightweight index.
 *
 * POST body: { url: "https://www.recipetineats.com" }
 * Response:  { source: "...", recipes: [{ title, url }], count: N }
 */

import { indexSite } from "../shared/scrape-lib.js";

export const config = {
  maxDuration: 60, // seconds — requires Vercel Pro; free tier allows 10s
};

export default async function handler(req, res) {
  // CORS headers, set before any method branching so preflights get them too (B1)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    const { recipes, count } = await indexSite(baseUrl, fetch);
    return res.status(200).json({
      source: baseUrl,
      recipes,
      count,
      indexed_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Failed to index site",
      source: baseUrl,
    });
  }
}
