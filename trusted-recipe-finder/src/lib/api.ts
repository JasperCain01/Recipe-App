// Thin wrapper over the backend — a same-origin Vercel Function today, or a
// separately-hosted Cloudflare Worker (VITE_API_BASE) when deployed to
// GitHub Pages — plus the static prebuilt data pipeline output served
// same-origin from /data regardless of where the API lives.

import type { FetchRecipeResponse, IndexEntry, IndexSourceResponse, Manifest, RecipeRecord } from "./types";

// Empty string keeps requests same-origin (relative /api/...), matching
// today's Vercel deployment; set to the Worker's URL for GitHub Pages.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

/** Index a recipe site by fetching and parsing its sitemap. */
export function indexSource(url: string): Promise<IndexSourceResponse> {
  return postJSON<IndexSourceResponse>("/api/scrape", { url });
}

/** Fetch and extract structured recipe data from a single recipe page. */
export function fetchRecipe(url: string): Promise<FetchRecipeResponse> {
  return postJSON<FetchRecipeResponse>("/api/fetch-recipe", { url });
}

/** Fetch the manifest of prebuilt built-in recipe sources, or null if unavailable (offline, 404, etc). */
export async function fetchManifest(): Promise<Manifest | null> {
  try {
    const res = await fetch("/data/manifest.json");
    if (!res.ok) return null;
    return (await res.json()) as Manifest;
  } catch {
    return null;
  }
}

/** Fetch one built-in source's prebuilt, pre-enriched recipe records. */
export async function fetchBuiltinSource(file: string): Promise<RecipeRecord[]> {
  const res = await fetch(`/data/${file}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as RecipeRecord[];
}

export type { IndexEntry, FetchRecipeResponse };
