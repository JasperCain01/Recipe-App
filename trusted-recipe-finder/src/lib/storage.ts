// Storage abstraction.
//
// Sources (metadata only) and recipes (potentially thousands per source) live
// in separate IndexedDB stores, so toggling/enabling a source never touches
// its recipe data. Cupboard stays in localStorage — tiny, benefits from
// synchronous reads.
//
// Migration: v1 stored full sources (metadata + enriched recipes) in one
// `sources` store; the v2 upgrade splits each into a metadata-only record and
// its recipes. Any pre-IndexedDB localStorage sources are migrated the same way.

import { openDB, type IDBPDatabase } from "idb";
import type { RecipeRecord, SourceMeta } from "./types";

const DB_NAME = "trusted-recipe-finder";
const DB_VERSION = 2;
const STORE_SOURCES = "sources";
const STORE_RECIPES = "recipes";
const RECIPES_BY_SOURCE_INDEX = "by-sourceId";

const KEYS = {
  CUPBOARD: "trf_cupboard",
  SOURCES_LEGACY: "trf_sources",
  MIGRATED_FLAG: "trf_idb_migrated",
} as const;

const LEGACY_KEYS = {
  CUPBOARD: "p2p_cupboard",
  SOURCES: "p2p_sources",
} as const;

// A v1 source record: metadata plus its full enriched recipe list inline.
interface V1Source extends SourceMeta {
  enrichedIndex: (Omit<RecipeRecord, "sourceId">)[] | null;
}

// ─── IndexedDB connection ────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  const promise = openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains(STORE_SOURCES)) {
        db.createObjectStore(STORE_SOURCES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_RECIPES)) {
        const recipesStore = db.createObjectStore(STORE_RECIPES, { keyPath: ["sourceId", "url"] });
        recipesStore.createIndex(RECIPES_BY_SOURCE_INDEX, "sourceId");
      }

      if (oldVersion < 2) {
        const sourcesStore = transaction.objectStore(STORE_SOURCES);
        const recipesStore = transaction.objectStore(STORE_RECIPES);
        const rows = (await sourcesStore.getAll()) as V1Source[];
        for (const row of rows) {
          const { enrichedIndex, ...meta } = row;
          if (enrichedIndex) {
            await Promise.all(enrichedIndex.map((r) => recipesStore.put({ ...r, sourceId: meta.id })));
          }
          await sourcesStore.put(meta);
        }
      }
    },
  });
  promise.catch(() => { dbPromise = null; });
  dbPromise = promise;
  return promise;
}

// ─── localStorage helpers ────────────────────────────────────────────────────

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ─── Migration ───────────────────────────────────────────────────────────────

async function migrateSourcesIfNeeded(): Promise<void> {
  if (localStorage.getItem(KEYS.MIGRATED_FLAG) === "1") return;
  const sources =
    readJSON<V1Source[]>(KEYS.SOURCES_LEGACY) ??
    readJSON<V1Source[]>(LEGACY_KEYS.SOURCES);
  if (sources && Array.isArray(sources)) {
    const db = await getDB();
    const tx = db.transaction([STORE_SOURCES, STORE_RECIPES], "readwrite");
    for (const row of sources) {
      const { enrichedIndex, ...meta } = row;
      if (enrichedIndex) {
        await Promise.all(
          enrichedIndex.map((r) => tx.objectStore(STORE_RECIPES).put({ ...r, sourceId: meta.id })),
        );
      }
      await tx.objectStore(STORE_SOURCES).put(meta);
    }
    await tx.done;
  }
  removeKey(KEYS.SOURCES_LEGACY);
  removeKey(LEGACY_KEYS.SOURCES);
  localStorage.setItem(KEYS.MIGRATED_FLAG, "1");
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const storage = {
  // ── Cupboard (localStorage) ──────────────────────────────────────────────
  loadCupboard(): string[] | null {
    const trf = readJSON<string[]>(KEYS.CUPBOARD);
    if (trf) return trf;
    const legacy = readJSON<string[]>(LEGACY_KEYS.CUPBOARD);
    if (legacy) {
      writeJSON(KEYS.CUPBOARD, legacy);
      removeKey(LEGACY_KEYS.CUPBOARD);
      return legacy;
    }
    return null;
  },
  saveCupboard(items: string[]): boolean {
    return writeJSON(KEYS.CUPBOARD, items);
  },

  // ── Source metadata (IndexedDB) ──────────────────────────────────────────
  async loadSourceMetas(): Promise<SourceMeta[]> {
    try {
      await migrateSourcesIfNeeded();
      const db = await getDB();
      return (await db.getAll(STORE_SOURCES)) as SourceMeta[];
    } catch (err) {
      console.error("Failed to load sources from IndexedDB:", err);
      return [];
    }
  },
  async putSource(meta: SourceMeta): Promise<boolean> {
    try {
      const db = await getDB();
      await db.put(STORE_SOURCES, meta);
      return true;
    } catch (err) {
      console.error("Failed to save source to IndexedDB:", err);
      return false;
    }
  },
  async deleteSource(id: string): Promise<boolean> {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_SOURCES, STORE_RECIPES], "readwrite");
      await tx.objectStore(STORE_SOURCES).delete(id);
      const recipeIndex = tx.objectStore(STORE_RECIPES).index(RECIPES_BY_SOURCE_INDEX);
      let cursor = await recipeIndex.openKeyCursor(IDBKeyRange.only(id));
      while (cursor) {
        await tx.objectStore(STORE_RECIPES).delete(cursor.primaryKey);
        cursor = await cursor.continue();
      }
      await tx.done;
      return true;
    } catch (err) {
      console.error("Failed to delete source from IndexedDB:", err);
      return false;
    }
  },

  // ── Recipes (IndexedDB) ──────────────────────────────────────────────────
  async putRecipes(records: RecipeRecord[]): Promise<boolean> {
    if (records.length === 0) return true;
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_RECIPES, "readwrite");
      await Promise.all(records.map((r) => tx.store.put(r)));
      await tx.done;
      return true;
    } catch (err) {
      console.error("Failed to save recipes to IndexedDB:", err);
      return false;
    }
  },
  async getRecipesBySource(id: string): Promise<RecipeRecord[]> {
    try {
      const db = await getDB();
      return (await db.getAllFromIndex(STORE_RECIPES, RECIPES_BY_SOURCE_INDEX, id)) as RecipeRecord[];
    } catch (err) {
      console.error("Failed to load recipes from IndexedDB:", err);
      return [];
    }
  },
  /** URLs already enriched for a source — used to resume interrupted enrichment. */
  async getRecipeUrlsBySource(id: string): Promise<Set<string>> {
    try {
      const db = await getDB();
      const keys = await db.getAllKeysFromIndex(STORE_RECIPES, RECIPES_BY_SOURCE_INDEX, id);
      return new Set((keys as [string, string][]).map(([, url]) => url));
    } catch (err) {
      console.error("Failed to load recipe keys from IndexedDB:", err);
      return new Set();
    }
  },
};
