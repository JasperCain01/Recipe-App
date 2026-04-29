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
