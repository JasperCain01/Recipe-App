/**
 * Vercel Function: /api/suggest
 *
 * Provider-agnostic AI proxy. Accepts user's API key in the request body,
 * forwards to the chosen provider, and returns normalised recipe suggestions.
 *
 * The user's API key is NEVER stored or logged. It is forwarded once to the
 * AI provider and discarded.
 *
 * POST body: {
 *   provider: "anthropic" | "openai",
 *   apiKey: "sk-...",
 *   model: "claude-sonnet-4-20250514" | "gpt-4o" | etc.,
 *   ingredients: "chicken, tomatoes, basil",
 *   cupboard: ["salt", "olive oil", ...],
 *   sources: [{ name, url, index?: [{title, url}] }],
 *   cuisines: ["Italian", "British"]
 * }
 *
 * Response: { recipes: [...] } — same shape regardless of provider
 */

export const config = {
  maxDuration: 30,
};

// ---------------------------------------------------------------------------
// Shared system prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a recipe suggestion assistant. Suggest up to 3 recipes from the specified websites based on the user's ingredients plus their store cupboard staples.

Respond with ONLY valid JSON in this exact shape (no markdown fences, no preamble, no commentary):
{
  "recipes": [
    {
      "title": "Recipe Name",
      "source": "Website Name",
      "sourceUrl": "https://full-url-to-recipe-or-null",
      "cuisine": "Cuisine type",
      "totalTime": "X mins",
      "difficulty": "Easy" | "Medium" | "Hard",
      "matchScore": 0-100,
      "missingIngredients": ["ingredient1"],
      "ingredients": [{"name": "ingredient", "amount": "200g"}],
      "instructions": ["Step 1: ...", "Step 2: ..."],
      "description": "One sentence description"
    }
  ]
}

CRITICAL RULES:
1. If a source's "Known recipes" list is provided, sourceUrl MUST be one of those exact URLs. Never invent URLs for indexed sources.
2. matchScore = (ingredients used from user's list / total recipe ingredients) × 100, rounded to nearest integer.
3. Only suggest recipes from the specified websites. Do not invent recipes from other sites.
4. If fewer than 3 good matches exist, return fewer recipes — do not pad with poor matches.
5. All ingredient quantities in metric only (g, kg, ml, l). Convert imperial to metric where needed.
6. Maximum 7 instruction steps per recipe; keep each step concise (one sentence).
7. Prioritise recipes matching the user's selected cuisines, but other cuisines are acceptable if match scores are higher.
8. If no good matches exist at all, return an empty recipes array.`;

// ---------------------------------------------------------------------------
// Build the user message from the request data
// ---------------------------------------------------------------------------

function buildUserMessage({ ingredients, cupboard, sources, cuisines }) {
  const sourceList = sources.map((s) => s.name).join(", ");
  const indexContext = sources
    .filter((s) => s.index && s.index.length > 0)
    .map((s) => {
      // Limit to 300 titles per source to keep prompt within token budget
      const sample = s.index.slice(0, 300).map((r) => `${r.title} (${r.url})`).join("\n  - ");
      return `${s.name} known recipes:\n  - ${sample}`;
    })
    .join("\n\n");

  return `Ingredients I have: ${ingredients}
Store cupboard (always available): ${cupboard.join(", ")}
Recipe sources to use: ${sourceList}
Cuisine preferences: ${cuisines.join(", ")}
${indexContext ? `\n${indexContext}\n\nIMPORTANT: When suggesting from indexed sources, the sourceUrl MUST be one of the URLs listed above.` : ""}`;
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function callAnthropic({ apiKey, model, userMessage }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error (${response.status})`);
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

async function callOpenAI({ apiKey, model, userMessage }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error (${response.status})`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// ---------------------------------------------------------------------------
// Robust JSON extraction
// ---------------------------------------------------------------------------

function extractJSON(text) {
  if (!text) throw new Error("Empty response from AI provider");

  // Strip code fences if present
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Find the first { and matching last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch (err) {
        throw new Error(`Could not parse AI response as JSON: ${err.message}`);
      }
    }
    throw new Error("AI response did not contain valid JSON");
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // CORS — allow same-origin requests from your frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { provider, apiKey, model, ingredients, cupboard, sources, cuisines } = req.body || {};

  // Validate inputs
  if (!provider) return res.status(400).json({ error: "provider is required" });
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" });
  if (!ingredients) return res.status(400).json({ error: "ingredients is required" });
  if (!Array.isArray(sources) || sources.length === 0) {
    return res.status(400).json({ error: "At least one source is required" });
  }
  if (!Array.isArray(cuisines) || cuisines.length === 0) {
    return res.status(400).json({ error: "At least one cuisine is required" });
  }

  const userMessage = buildUserMessage({
    ingredients,
    cupboard: cupboard || [],
    sources,
    cuisines,
  });

  try {
    let rawText;
    switch (provider) {
      case "anthropic":
        rawText = await callAnthropic({ apiKey, model, userMessage });
        break;
      case "openai":
        rawText = await callOpenAI({ apiKey, model, userMessage });
        break;
      default:
        return res.status(400).json({
          error: `Unknown provider: ${provider}. Supported: anthropic, openai`,
        });
    }

    const parsed = extractJSON(rawText);
    return res.status(200).json({
      recipes: parsed.recipes || [],
      provider,
      model: model || "default",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Failed to generate suggestions",
      provider,
    });
  }
}
