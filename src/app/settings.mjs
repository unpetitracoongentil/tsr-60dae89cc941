const KEY = 'tsr-settings';
const DEFAULTS = { inspector: '' };

/** Read remembered settings. Corrupt storage falls back rather than throwing. */
export function readSettings(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Merge a patch into stored settings. */
export function writeSettings(storage, patch) {
  const next = { ...readSettings(storage), ...patch };
  storage.setItem(KEY, JSON.stringify(next));
  return next;
}
