// Preloaded with `node --import` by build-index.test.js. Replaces global fetch
// with a fake site read from the JSON file named in $FAKE_SITE: an object of
// URL -> page body. Unknown URLs get a 404, so robots.txt and the guessed
// sitemap paths behave as on a real site that doesn't have them.
import { readFileSync } from "node:fs";

const pages = JSON.parse(readFileSync(process.env.FAKE_SITE, "utf-8"));

globalThis.fetch = async (url) => {
  const key = String(url);
  if (key in pages) return new Response(pages[key], { status: 200 });
  return new Response("not found", { status: 404 });
};
