// Ingredient-text normalisation, shared between the browser app, the Worker
// scrape handlers, and the build script. Plain ESM so it can be imported
// directly by Node without a TypeScript toolchain.

export const STOPWORDS = new Set([
  "fresh", "dried", "large", "small", "medium", "whole", "chopped", "sliced",
  "diced", "minced", "grated", "ground", "cooked", "raw", "organic", "sea",
  "fine", "coarse", "extra", "virgin", "the", "and", "or", "for", "with",
  "into", "from", "plus", "about", "piece", "pieces", "handful", "little",
  "few", "some", "good", "quality", "best", "homemade", "bought", "store",
  "approximately", "optional", "taste", "needed", "required",
]);

// Genuinely interchangeable ingredient pairs — safe to substitute either way.
const EQUIVALENCES = [
  ["courgette", "zucchini"],
  ["aubergine", "eggplant"],
  ["coriander", "cilantro"],
  ["prawn", "shrimp"],
  ["cornflour", "cornstarch"],
  ["sultana", "raisin"],
  ["bacon", "pancetta"],
];

// One-way "close enough" gates: the left term implies the right (broader)
// term, but not the reverse — the broader term is too ambiguous to imply the
// specific one. `scallion -> onion` was dropped entirely (not listed here):
// it was one-way in both directions of harm, matching recipes that need
// scallions against anyone holding a regular onion (see IMPROVEMENTS.md B3).
const ONE_WAY_SYNONYMS = {
  capsicum: "pepper",
};

const SYNONYMS = {};
for (const [a, b] of EQUIVALENCES) {
  (SYNONYMS[a] ??= []).push(b);
  (SYNONYMS[b] ??= []).push(a);
}
for (const [from, to] of Object.entries(ONE_WAY_SYNONYMS)) {
  (SYNONYMS[from] ??= []).push(to);
}

export function stripQuantities(text) {
  return text
    .replace(
      /\d[\d½¼¾⅓⅔/.\s-]*\s*(?:g|kg|ml|l|oz|lb|lbs|tsp|tbsp|tablespoons?|teaspoons?|cups?|cloves?|bunches?|handfuls?|pinch(?:es)?|slices?|cans?|tins?|bags?|packs?|sprigs?|heads?|stalks?|pieces?|portions?)\b/gi,
      " "
    )
    .replace(/\b\d+\b/g, " ");
}

export function tokenise(text) {
  return stripQuantities(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Strips parenthetical notes and trailing " or ..." alternatives before
 *  required-ingredient matching, so that "(or chicken)" in a pork recipe
 *  does not falsely satisfy a "chicken" requirement. */
export function stripIngredientNotes(line) {
  return line
    .replace(/\([^)]*\)/g, " ")       // remove (parenthetical content)
    .replace(/\s*,?\s+or\s+.+/i, "")  // remove " or ..." alternatives
    .trim();
}

export function stem(word) {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ves") && word.length > 4) return word.slice(0, -3) + "f";
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function normTokens(tokens) {
  const result = new Set();
  for (const t of tokens) {
    result.add(stem(t));
    for (const syn of SYNONYMS[t] ?? []) result.add(stem(syn));
  }
  return result;
}

/** Precompute both token variants for a single ingredient line: `all` for
 *  general match scoring, `strict` (notes/alternatives stripped) for
 *  required-ingredient matching. Meant to be computed once at enrichment
 *  time so search is pure Set arithmetic over the result. */
export function tokensForIngredientLine(line) {
  return {
    all: [...normTokens(tokenise(line))],
    strict: [...normTokens(tokenise(stripIngredientNotes(line)))],
  };
}
