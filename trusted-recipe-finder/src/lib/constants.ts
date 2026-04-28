// All static configuration for the app — providers, cuisines, default cupboard.

import type { Provider, Tab } from "./types";

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

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic Claude",
    keyPlaceholder: "sk-ant-...",
    keyHelp: "Get a key at console.anthropic.com",
    keyUrl: "https://console.anthropic.com",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (recommended)" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4 (slower, smarter)" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5 (fastest, cheapest)" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI GPT",
    keyPlaceholder: "sk-...",
    keyHelp: "Get a key at platform.openai.com",
    keyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o mini (recommended)" },
      { id: "gpt-4o", name: "GPT-4o (slower, smarter)" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    ],
  },
];

export const TABS: Tab[] = ["search", "sources", "cupboard", "settings"];
