// All static configuration for the app.

import type { Tab } from "./types";

export const CUISINE_OPTIONS = [
  "British",
  "French",
  "Asian",
  "Indian",
  "Italian",
  "Mediterranean",
  "Mexican",
] as const;

export type Cuisine = (typeof CUISINE_OPTIONS)[number];

export const DEFAULT_CUPBOARD: string[] = [
  "salt", "black pepper", "olive oil", "vegetable oil", "plain flour",
  "sugar", "butter", "eggs", "garlic", "onions", "dried herbs",
  "soy sauce", "vinegar", "stock cubes", "tomato paste", "baking powder",
];

export const TABS: Tab[] = ["search", "sources", "cupboard"];

/** Cook-friendly display labels for the (unchanged) internal tab ids — 4.5. */
export const TAB_LABELS: Record<Tab, string> = {
  search: "Find recipes",
  sources: "My sites",
  cupboard: "My staples",
};

/** Always-visible quick-add buttons in the ingredient entry, alongside the ranked autocomplete vocabulary. */
export const QUICK_ADD_INGREDIENTS: string[] = [
  "chicken", "onion", "garlic", "egg", "rice",
  "pasta", "tomato", "cheese", "potato", "milk",
];
