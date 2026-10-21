// Axial hex grid helpers. Maps of the same radius share one shape, so
// neighbourhood lookups are cached per radius.
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const key = (q, r) => q + ',' + r;
export const parse = (k) => k.split(',').map(Number);

export function dist(a, b) {
  const [q1, r1] = parse(a);
  const [q2, r2] = parse(b);
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
}

// All keys of a map with radius R, plus the six orbital slots at R+1 corners.
const shapeCache = new Map();
export function shape(R) {
  if (shapeCache.has(R)) return shapeCache.get(R);
  const land = [];
  for (let q = -R; q <= R; q++) {
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) land.push(key(q, r));
  }
  const orbit = DIRS.map(([dq, dr]) => key(dq * (R + 1), dr * (R + 1)));
  const s = { land, orbit, all: land.concat(orbit) };
  shapeCache.set(R, s);
  return s;
}

const nearCache = new Map();
// Keys within distance r of k (excluding k), ordered by distance then key.
export function near(R, k, r = 1) {
  const ck = R + '|' + k + '|' + r;
  let v = nearCache.get(ck);
  if (v) return v;
  v = shape(R)
    .all.filter((o) => o !== k && dist(o, k) <= r)
    .sort((a, b) => dist(a, k) - dist(b, k) || (a < b ? -1 : 1));
  nearCache.set(ck, v);
  return v;
}

export function pixel(k, size = 1) {
  const [q, r] = parse(k);
  return [size * Math.sqrt(3) * (q + r / 2), size * 1.5 * r];
}

export function corners(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  return pts;
}
