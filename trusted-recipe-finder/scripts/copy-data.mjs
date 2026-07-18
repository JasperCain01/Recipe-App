#!/usr/bin/env node
// Copies data/ (built by scripts/build-index.mjs) into public/data/ so Vite
// serves the prebuilt recipe index as a same-origin static asset, in both
// dev and the production build.

import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "data");
const DEST = path.join(ROOT, "public", "data");

await mkdir(DEST, { recursive: true });
await cp(SRC, DEST, { recursive: true });
console.log(`Copied ${SRC} -> ${DEST}`);
