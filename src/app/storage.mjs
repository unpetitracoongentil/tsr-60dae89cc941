// src/app/storage.mjs

const DB_NAME = 'tsr-reports';
const STORE = 'drafts';

/** Open IndexedDB, exposing the same interface as the memory store. */
export function createIndexedDbStore() {
  const open = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };

  return {
    put: (key, value) => run('readwrite', (s) => s.put(value, key)),
    get: (key) => run('readonly', (s) => s.get(key)),
    delete: (key) => run('readwrite', (s) => s.delete(key)),
    entries: async () => {
      const keys = await run('readonly', (s) => s.getAllKeys());
      const values = await run('readonly', (s) => s.getAll());
      return keys.map((k, i) => [k, values[i]]);
    },
  };
}

export async function saveDraft(store, id, report) {
  await store.put(id, report);
}

export async function loadDraft(store, id) {
  return store.get(id);
}

export async function deleteDraft(store, id) {
  await store.delete(id);
}

/** Newest first, so the picker shows the most recent work at the top. */
export async function listDrafts(store) {
  const entries = await store.entries();
  return entries
    .map(([id, report]) => ({ id, report, updatedAt: report.updatedAt ?? 0 }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Keep the newest `keep` drafts, plus `protectedId` whatever its age.
 * Storage pressure must never destroy the report currently being filled in.
 */
export async function pruneDrafts(store, keep, protectedId) {
  const drafts = await listDrafts(store);
  const doomed = drafts.slice(keep).filter((d) => d.id !== protectedId);
  for (const d of doomed) await store.delete(d.id);
}
