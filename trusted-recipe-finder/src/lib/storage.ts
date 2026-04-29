// Storage abstraction.
//
// Sources (potentially large — thousands of enriched recipes) live in IndexedDB.
// Cupboard stays in localStorage — tiny, benefits from synchronous reads.
//
// Migration: on first read after upgrade, any existing localStorage sources
// are moved to IndexedDB and legacy keys removed.

import { openDB, type IDBPDatabase } from "idb";
import type { Source } from "./types";

const DB_NAME = "trusted-recipe-finder";
const DB_VERSION = 1;
const STORE_SOURCES = "sources";

const KEYS = {
  CUPBOARD: "trf_cupboard",
  SOURCES_LEGACY: "trf_sources",
  MIGRATED_FLAG: "trf_idb_migrated",
} as const;

const LEGACY_KEYS = {
  CUPBOARD: "p2p_cupboard",
  SOURCES: "p2p_sources",
} as const;

// ─── IndexedDB connection ────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  const promise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_SOURCES)) {
        db.createObjectStore(STORE_SOURCES, { keyPath: "id" });
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
    readJSON<Source[]>(KEYS.SOURCES_LEGACY) ??
    readJSON<Source[]>(LEGACY_KEYS.SOURCES);
  if (sources && Array.isArray(sources)) {
    const db = await getDB();
    const tx = db.transaction(STORE_SOURCES, "readwrite");
    await Promise.all(sources.map((s) => tx.store.put(s)));
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

  // ── Sources (IndexedDB) ──────────────────────────────────────────────────
  async loadSources(): Promise<Source[]> {
    try {
      await migrateSourcesIfNeeded();
      const db = await getDB();
      return (await db.getAll(STORE_SOURCES)) as Source[];
    } catch (err) {
      console.error("Failed to load sources from IndexedDB:", err);
      return [];
    }
  },
  async saveSources(items: Source[]): Promise<boolean> {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_SOURCES, "readwrite");
      await tx.store.clear();
      await Promise.all(items.map((s) => tx.store.put(s)));
      await tx.done;
      return true;
    } catch (err) {
      console.error("Failed to save sources to IndexedDB:", err);
      return false;
    }
  },
};
