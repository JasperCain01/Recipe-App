// Thin wrapper over the backend Vercel Functions.

import type { FetchRecipeResponse, IndexEntry, IndexSourceResponse } from "./types";

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
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

export type { IndexEntry, FetchRecipeResponse };
