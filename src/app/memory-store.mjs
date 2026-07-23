// src/app/memory-store.mjs

/**
 * The store interface, backed by a Map. Used by tests, and as the fallback when
 * IndexedDB is unavailable (private browsing on some platforms).
 */
export function createMemoryStore() {
  const map = new Map();
  return {
    async put(key, value) { map.set(key, value); },
    async get(key) { return map.get(key); },
    async delete(key) { map.delete(key); },
    async entries() { return [...map.entries()]; },
  };
}
