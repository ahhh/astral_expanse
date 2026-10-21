// localStorage persistence. Every access is guarded: private windows or
// blocked storage simply mean the game runs without saving.
const KEY = 'astral-expanse.save.v1';
const META = 'astral-expanse.meta.v1';

function read(k) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v, (key, val) => (key === '_q' || key === '_nc' ? undefined : val)));
    return true;
  } catch {
    return false;
  }
}

export const loadSave = () => {
  const s = read(KEY);
  return s && s.v === 1 ? s : null;
};
export const writeSave = (data) => write(KEY, Object.assign({ v: 1, at: Date.now() }, data));
export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
export const loadMeta = () => read(META) || { runs: 0, wins: 0, bestColony: 0 };
export const writeMeta = (m) => write(META, m);
