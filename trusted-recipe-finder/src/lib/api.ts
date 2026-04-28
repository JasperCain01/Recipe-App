// Thin wrapper over our backend Vercel Functions.
// Centralising this means component code never deals with fetch directly.

import type {
  ApiKeys,
  FetchRecipeResponse,
  IndexEntry,
  IndexSourceResponse,
  ProviderId,
  Recipe,
  SuggestResponse,
} from "./types";

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = (data && typeof data === "object" && "error" in data && typeof data.error === "string")
      ? data.error
      : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

/**
 * Index a recipe site by fetching and parsing its sitemap.
 */
export function indexSource(url: string): Promise<IndexSourceResponse> {
  return postJSON<IndexSourceResponse>("/api/scrape", { url });
}

export interface SuggestParams {
  provider: ProviderId;
  apiKey: string;
  model: string;
  ingredients: string;
  cupboard: string[];
  sources: Array<{ name: string; url: string; index: IndexEntry[] }>;
  cuisines: string[];
}

/**
 * Get AI recipe suggestions.
 */
export function getSuggestions(params: SuggestParams): Promise<SuggestResponse> {
  return postJSON<SuggestResponse>("/api/suggest", params);
}

/**
 * Fetch verified recipe data from a recipe page.
 */
export function fetchRecipe(url: string): Promise<FetchRecipeResponse> {
  return postJSON<FetchRecipeResponse>("/api/fetch-recipe", { url });
}

// Re-export types that components may want
export type { ApiKeys, Recipe };
