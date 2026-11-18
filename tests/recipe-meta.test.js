// Tests for shared/recipe-meta.js: the fields build-index.mjs derives for
// every indexed recipe. See tests/TESTS.md.
import { describe, it, expect } from "vitest";
import { deriveMealType, parseTimeToMinutes } from "../shared/recipe-meta.js";

describe("parseTimeToMinutes", () => {
  it("reads every format scrape-lib's duration formatter produces", () => {
    // build-index.mjs pipes extractRecipeFromHtml's totalTime straight into
    // this function, so the two must agree on the format.
    expect(parseTimeToMinutes("1h 30m")).toBe(90);
    expect(parseTimeToMinutes("2h")).toBe(120);
    expect(parseTimeToMinutes("45 mins")).toBe(45);
  });

  it("returns null rather than 0 for a missing or unreadable time", () => {
    // 0 would make a recipe match every "under N minutes" filter.
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("about an hour")).toBeNull();
  });
});

describe("deriveMealType", () => {
  it("maps category and keyword text to a meal type", () => {
    expect(deriveMealType("Breakfast", null)).toBe("Breakfast");
    expect(deriveMealType("Main course", "chicken, curry")).toBe("Dinner");
    expect(deriveMealType(null, "chocolate cake, baking")).toBe("Dessert");
    expect(deriveMealType("Soup", null)).toBe("Soup");
  });

  it("matches whole words, so 'side' in 'sideways' or 'pie' in 'piece' do not count", () => {
    expect(deriveMealType("sideways glance", null)).toBeNull();
    expect(deriveMealType(null, "a piece of chicken")).toBeNull();
  });

  it("returns null when there is nothing to go on", () => {
    expect(deriveMealType(null, null)).toBeNull();
    expect(deriveMealType("Uncategorised", "")).toBeNull();
  });
});
