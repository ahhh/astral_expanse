// Seeded RNG (mulberry32). The seed lives on a plain object so state stays
// JSON-serializable and clones replay deterministically.
export function rnd(o) {
  let t = (o.seed = (o.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rint = (o, n) => Math.floor(rnd(o) * n);
export const pick = (o, arr) => arr[rint(o, arr.length)];
export function shuffle(o, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(o, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function weighted(o, entries) {
  // entries: [[value, weight], ...]
  const total = entries.reduce((s, e) => s + e[1], 0);
  if (total <= 0) return null;
  let x = rnd(o) * total;
  for (const [v, w] of entries) {
    if ((x -= w) < 0) return v;
  }
  return entries[entries.length - 1][0];
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
