// Storage abstraction.
//
// Mixed model:
// - Sources (potentially huge — thousands of recipe titles) live in IndexedDB.
//   localStorage's ~5 MB limit gets hit fast with multiple indexed sources.
// - Everything else (cupboard, API keys, provider preference) stays in localStorage.
//   These are tiny and benefit from synchronous reads.
//
// All public methods that touch sources are async.
// Other methods remain synchronous.
//
// Migration: on first read after upgrade, any existing localStorage data
// is automatically copied to its new home and the legacy keys removed.
// Two migration paths are supported:
//   1. trf_sources (current localStorage version) -> IndexedDB
//   2. p2p_* (legacy from earlier app name) -> trf_* -> IndexedDB

import { openDB, type IDBPDatabase } from "idb";
import type { ApiKeys, ProviderId, Source } from "./types";

const DB_NAME = "trusted-recipe-finder";
const DB_VERSION = 1;
const STORE_SOURCES = "sources";

const KEYS = {
  CUPBOARD: "trf_cupboard",
  SOURCES_LEGACY: "trf_sources", // localStorage location pre-IndexedDB
  API_KEYS: "trf_keys",
  PROVIDER: "trf_provider",
  MODEL_PREFIX: "trf_model_",
  MIGRATED_FLAG: "trf_idb_migrated", // set once after sources are moved to IDB
} as const;

const LEGACY_KEYS = {
  CUPBOARD: "p2p_cupboard",
  SOURCES: "p2p_sources",
  API_KEY: "p2p_key",
} as const;

// ---------------------------------------------------------------------------
// IndexedDB connection
// ---------------------------------------------------------------------------

// Lazy single-promise — opens the DB on first use, returns the same promise
// for all subsequent calls. No connection management needed by callers.
// On failure, the promise is reset so the next call can retry.
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

  // Reset cached promise on failure so callers can retry
  promise.catch(() => {
    dbPromise = null;
  });

  dbPromise = promise;
  return promise;
}

// ---------------------------------------------------------------------------
// localStorage helpers (used for cupboard, keys, settings)
// ---------------------------------------------------------------------------

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
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Source migrations: legacy localStorage -> IndexedDB (one-time)
// ---------------------------------------------------------------------------

async function migrateSourcesIfNeeded(): Promise<void> {
  if (localStorage.getItem(KEYS.MIGRATED_FLAG) === "1") return;

  const fromCurrent = readJSON<Source[]>(KEYS.SOURCES_LEGACY);
  const fromLegacy = readJSON<Source[]>(LEGACY_KEYS.SOURCES);
  const sources = fromCurrent || fromLegacy;

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface Storage {
  loadCupboard(): string[] | null;
  saveCupboard(items: string[]): boolean;

  loadSources(): Promise<Source[]>;
  saveSources(items: Source[]): Promise<boolean>;

  loadApiKeys(): ApiKeys;
  saveApiKeys(keys: ApiKeys): boolean;

  loadProvider(): string | null;
  saveProvider(providerId: ProviderId): void;

  loadModel(providerId: ProviderId): string | null;
  saveModel(providerId: ProviderId, modelId: string): void;
}

export const storage: Storage = {
  // ── Cupboard (localStorage) ────────────────────────────────────────────
  loadCupboard() {
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
  saveCupboard(items) {
    return writeJSON(KEYS.CUPBOARD, items);
  },

  // ── Sources (IndexedDB) ────────────────────────────────────────────────
  async loadSources() {
    try {
      await migrateSourcesIfNeeded();
      const db = await getDB();
      return await db.getAll(STORE_SOURCES) as Source[];
    } catch (err) {
      console.error("Failed to load sources from IndexedDB:", err);
      return [];
    }
  },

  async saveSources(items) {
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

  // ── API keys (localStorage) ────────────────────────────────────────────
  loadApiKeys() {
    const trf = readJSON<ApiKeys>(KEYS.API_KEYS);
    if (trf) return trf;
    try {
      const oldKey = localStorage.getItem(LEGACY_KEYS.API_KEY);
      if (oldKey) {
        const migrated: ApiKeys = { anthropic: oldKey };
        writeJSON(KEYS.API_KEYS, migrated);
        removeKey(LEGACY_KEYS.API_KEY);
        return migrated;
      }
    } catch {
      /* ignore */
    }
    return {};
  },
  saveApiKeys(keys) {
    return writeJSON(KEYS.API_KEYS, keys);
  },

  // ── Provider / model preference (localStorage) ─────────────────────────
  loadProvider() {
    try {
      return localStorage.getItem(KEYS.PROVIDER);
    } catch {
      return null;
    }
  },
  saveProvider(providerId) {
    try {
      localStorage.setItem(KEYS.PROVIDER, providerId);
    } catch {
      /* ignore */
    }
  },
  loadModel(providerId) {
    try {
      return localStorage.getItem(KEYS.MODEL_PREFIX + providerId);
    } catch {
      return null;
    }
  },
  saveModel(providerId, modelId) {
    try {
      localStorage.setItem(KEYS.MODEL_PREFIX + providerId, modelId);
    } catch {
      /* ignore */
    }
  },
};
