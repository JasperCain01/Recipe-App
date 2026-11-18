// Tests for shared/scrape-lib.js: turning a recipe page into a recipe, and a
// site's sitemaps into a list of recipe URLs. These run unattended every week
// in refresh-index.yml, so a regression here ships a broken index without
// anyone looking. Fixtures are small synthetic pages and sitemaps modelled on
// the structures real recipe sites use (Yoast/Rank Math @graph, HowToSection,
// sitemap indexes declared in robots.txt). See tests/TESTS.md.
import { describe, it, expect } from "vitest";
import { extractRecipeFromHtml, indexSite } from "../shared/scrape-lib.js";

const ldJson = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
const page = (...scripts) => `<!doctype html><html><head>${scripts.join("\n")}</head><body></body></html>`;

describe("extractRecipeFromHtml", () => {
  it("finds a Recipe inside a Yoast-style @graph and normalises every field", () => {
    const html = page(
      ldJson({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", name: "Not the recipe" },
          {
            "@type": "Recipe",
            name: "Chicken Tikka Masala",
            description: "  A curry.  ",
            image: [{ "@type": "ImageObject", url: "https://example.com/tikka.jpg" }],
            prepTime: "PT20M",
            cookTime: "PT40M",
            totalTime: "PT1H",
            recipeYield: ["4", "4 servings"],
            recipeCuisine: ["Indian"],
            recipeCategory: "Dinner",
            keywords: "curry, chicken",
            recipeIngredient: ["500g chicken thighs", "2 tbsp garam masala"],
            recipeInstructions: [
              { "@type": "HowToStep", text: "Mix the marinade." },
              { "@type": "HowToStep", text: "Grill the chicken." },
            ],
            nutrition: { "@type": "NutritionInformation", calories: "450 kcal", proteinContent: "35 g" },
            author: { "@type": "Person", name: "A Cook" },
          },
        ],
      }),
    );

    expect(extractRecipeFromHtml(html, "https://example.com/tikka/")).toEqual({
      url: "https://example.com/tikka/",
      title: "Chicken Tikka Masala",
      description: "A curry.",
      image: "https://example.com/tikka.jpg",
      totalTime: "1h",
      prepTime: "20 mins",
      cookTime: "40 mins",
      servings: "4, 4 servings",
      cuisine: "Indian",
      category: "Dinner",
      keywords: "curry, chicken",
      ingredients: ["500g chicken thighs", "2 tbsp garam masala"],
      instructions: ["Mix the marinade.", "Grill the chicken."],
      nutrition: { calories: "450 kcal", protein: "35 g", fat: null, carbs: null },
      author: "A Cook",
    });
  });

  // A named HowToSection is the standard schema.org shape for sectioned
  // instructions. Regression: the section's name used to be returned instead
  // of its steps, losing every step inside it.
  it("expands named HowToSection instructions into their steps", () => {
    const html = page(
      ldJson({
        "@type": "Recipe",
        name: "Sectioned",
        recipeIngredient: ["x"],
        recipeInstructions: [
          {
            "@type": "HowToSection",
            name: "Marinate",
            itemListElement: [
              { "@type": "HowToStep", text: "Mix the marinade." },
              { "@type": "HowToStep", text: "Coat the chicken." },
            ],
          },
          { "@type": "HowToSection", name: "Cook", itemListElement: [{ "@type": "HowToStep", text: "Grill." }] },
        ],
      }),
    );
    expect(extractRecipeFromHtml(html, "u").instructions).toEqual([
      "Mix the marinade.",
      "Coat the chicken.",
      "Grill.",
    ]);

    // A HowToStep whose directions are nested rather than given as text.
    const nested = page(
      ldJson({
        "@type": "Recipe",
        name: "Nested",
        recipeInstructions: [
          { "@type": "HowToStep", name: "Step 1", itemListElement: [{ "@type": "HowToDirection", text: "Whisk." }] },
        ],
      }),
    );
    expect(extractRecipeFromHtml(nested, "u").instructions).toEqual(["Whisk."]);
  });

  it("skips an unparseable JSON-LD block and a non-recipe block to find the recipe after them", () => {
    const html = page(
      `<script type='application/ld+json'>{ this is not json }</script>`,
      ldJson({ "@type": "Organization", name: "Site" }),
      ldJson([{ "@type": ["Recipe", "NewsArticle"], name: "Scones", recipeIngredient: ["flour"] }]),
    );
    const recipe = extractRecipeFromHtml(html, "https://example.com/scones");
    expect(recipe.title).toBe("Scones");
    expect(recipe.ingredients).toEqual(["flour"]);
  });

  it("formats ISO durations, falls back to cookTime, and passes non-ISO text through", () => {
    const base = { "@type": "Recipe", name: "R", recipeIngredient: ["x"] };
    const times = (extra) => extractRecipeFromHtml(page(ldJson({ ...base, ...extra })), "u");
    expect(times({ totalTime: "PT1H30M" }).totalTime).toBe("1h 30m");
    expect(times({ cookTime: "PT45M" }).totalTime).toBe("45 mins"); // no totalTime
    expect(times({ totalTime: "about an hour" }).totalTime).toBe("about an hour");
    expect(times({}).totalTime).toBeNull();
  });

  it("throws distinct errors for a page with no structured data and one with no Recipe", () => {
    expect(() => extractRecipeFromHtml(page(), "u")).toThrow("No structured recipe data");
    expect(() => extractRecipeFromHtml(page(ldJson({ "@type": "Article" })), "u")).toThrow(
      "no Recipe schema",
    );
  });
});

// A fake site served from a URL → body map, standing in for `fetch`.
function fakeSite(pages) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url in pages) {
      const p = pages[url];
      return new Response(typeof p === "string" ? p : p.body, { status: typeof p === "string" ? 200 : p.status });
    }
    return new Response("not found", { status: 404 });
  };
  return { fetchImpl, calls };
}

const urlset = (...urls) =>
  `<?xml version="1.0"?><urlset>${urls.map((u) => `<url><loc>${u}</loc></url>`).join("")}</urlset>`;
const sitemapIndex = (...urls) =>
  `<?xml version="1.0"?><sitemapindex>${urls.map((u) => `<sitemap><loc>${u}</loc></sitemap>`).join("")}</sitemapindex>`;

describe("indexSite", () => {
  it("follows robots.txt to a sitemap index and keeps only on-site recipe URLs", async () => {
    // A site whose recipes live under /recipes/ — at least 10 such URLs, so
    // the recipe-path filter switches on.
    const recipes = Array.from({ length: 12 }, (_, i) => `https://www.good.example/recipes/dish-${i + 1}`);
    const { fetchImpl } = fakeSite({
      "https://www.good.example/robots.txt": "User-agent: *\nSitemap: https://www.good.example/sitemap-index.xml\n",
      "https://www.good.example/sitemap-index.xml": sitemapIndex(
        "https://www.good.example/recipe-sitemap.xml",
        "https://www.good.example/page-sitemap.xml",
      ),
      "https://www.good.example/recipe-sitemap.xml": urlset(
        ...recipes,
        recipes[0], // duplicate
        "https://www.good.example/recipes/tag/vegan/", // tag page
        "https://www.good.example/recipes/photo.jpg", // asset
        "https://evilgood.example/recipes/lookalike", // lookalike host
      ),
      "https://www.good.example/page-sitemap.xml": urlset("https://www.good.example/about-us/"),
    });

    const { recipes: found, count, diagnostics } = await indexSite("https://www.good.example", fetchImpl);
    expect(found.map((r) => r.url).sort()).toEqual([...recipes].sort());
    expect(count).toBe(12);
    expect(found.find((r) => r.url.endsWith("dish-3")).title).toBe("Dish 3");
    expect(diagnostics.sitemapUrl).toBe("https://www.good.example/sitemap-index.xml");
    expect(diagnostics.childSitemaps).toBe(2);
  });

  it("keeps root-level recipe slugs when a site has only a single /recipes/ hub page", async () => {
    // RecipeTin Eats keeps recipes at /<slug>/. One /recipes/ hub URL must not
    // switch on the recipe-path filter and reduce the whole site to that hub.
    const { fetchImpl } = fakeSite({
      "https://tin.example/sitemap.xml": urlset(
        "https://tin.example/recipes/",
        "https://tin.example/beef-ragu/",
        "https://tin.example/crispy-pork-belly/",
        "https://tin.example/category/beef/",
        "https://tin.example/ab/",
      ),
    });
    const { recipes } = await indexSite("https://tin.example", fetchImpl);
    expect(recipes.map((r) => r.url).sort()).toEqual([
      "https://tin.example/beef-ragu/",
      "https://tin.example/crispy-pork-belly/",
      "https://tin.example/recipes/",
    ]);
  });

  it(
    "still indexes the other child sitemaps when one keeps failing, and records why",
    async () => {
      const recipes = Array.from({ length: 10 }, (_, i) => `https://flaky.example/recipes/r${i}`);
      const { fetchImpl, calls } = fakeSite({
        "https://flaky.example/sitemap.xml": sitemapIndex(
          "https://flaky.example/recipe-sitemap-1.xml",
          "https://flaky.example/recipe-sitemap-2.xml",
        ),
        "https://flaky.example/recipe-sitemap-1.xml": urlset(...recipes),
        "https://flaky.example/recipe-sitemap-2.xml": { status: 403, body: "blocked" },
      });
      const { recipes: found, diagnostics } = await indexSite("https://flaky.example", fetchImpl);
      expect(found).toHaveLength(10);
      expect(diagnostics.errors.some((e) => e.includes("recipe-sitemap-2.xml") && e.includes("403"))).toBe(true);
      // The failing child was retried (3 attempts) before being given up on.
      expect(calls.filter((u) => u.endsWith("recipe-sitemap-2.xml"))).toHaveLength(3);
    },
    15000,
  );

  it("fails with the list of places it looked when no sitemap exists", async () => {
    // Every candidate answers, but with HTML rather than a sitemap (as a site
    // that has dropped its sitemap does). Successful responses aren't retried,
    // so this runs quickly.
    const { fetchImpl, calls } = fakeSite({});
    const htmlEverywhere = async (url) => {
      calls.push(url);
      return new Response("<html>not xml</html>", { status: 200 });
    };
    await expect(indexSite("https://none.example", htmlEverywhere)).rejects.toThrow(
      /No sitemap found at https:\/\/none\.example\. Tried: .*sitemap\.xml/,
    );
    expect(calls).toContain("https://none.example/sitemap_index.xml");
  });
});
