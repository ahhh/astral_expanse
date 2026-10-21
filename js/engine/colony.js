// Colony-map rules engine. Pure functions over a JSON-serializable state `S`,
// so the browser UI, save files and the headless balance simulator share it.
//
// Turn order: place a card (On Build + reactive cascade) -> light rotates ->
// timed/periodic buildings fire in placement order (late cards last) ->
// scheduled local event -> boss hazard -> statuses decay -> checkpoint -> draw.
import { CARDS, CLANS, RARITY, canRepeatCard } from './cards.js';
import { RES, resIs } from './resources.js';
import * as H from './hex.js';
import { rnd, rint, pick, weighted } from './rng.js';

export const CAP = 2;
export const HAND_MAX = 5;
const card = (b) => CARDS[b.c];
const era = (S) => Math.ceil(S.turn / 5);

// ---------------------------------------------------------------- queries
export const bldAt = (S, k) => (S.hexes[k] && S.hexes[k].b ? S.blds[S.hexes[k].b] : null);
export const hasTag = (b, t) => card(b).tags.includes(t);
export const bldList = (S) => Object.keys(S.blds).map(Number).sort((a, b) => a - b).map((id) => S.blds[id]);

export function baseLit(S, k) {
  const h = S.hexes[k];
  if (!h) return false;
  if (h.kind === 'orbit') return true;
  if (h.kind === 'cavern' || h.kind === 'rock') return false;
  if (h.st.Shade) return false;
  const [x, y] = H.pixel(k, 1);
  const th = (S.phase * Math.PI) / 2;
  const d = x * Math.cos(th) + y * Math.sin(th);
  return d > 1e-6 || (Math.abs(d) <= 1e-6 && S.phase % 2 === 0);
}
export function isLit(S, k) {
  if (baseLit(S, k)) return true;
  const h = S.hexes[k];
  if (!h || h.kind === 'rock' || h.kind === 'cavern' || h.st.Shade) return false;
  for (const n of H.near(S.R, k, 1)) {
    const b = bldAt(S, n);
    if (b && card(b).mirror && baseLit(S, n)) return true;
  }
  return false;
}
function litMap(S) {
  const m = {};
  for (const k of H.shape(S.R).all) if (S.hexes[k].kind !== 'rock') m[k] = isLit(S, k);
  return m;
}
export const isFree = (S, k) => {
  const h = S.hexes[k];
  return !!h && (h.kind === 'surface' || h.kind === 'cavern') && !h.b && !h.res;
};
export function canPlace(S, cid, k) {
  const h = S.hexes[k];
  const c = CARDS[cid];
  if (!h || h.b) return false;
  if (h.res && !h.hid) return false;
  if (h.kind === 'orbit') return c.tags.includes('Orbit') || c.tags.includes('Orbital');
  return h.kind === 'surface' || h.kind === 'cavern';
}
export const legalHexes = (S, cid) => H.shape(S.R).all.filter((k) => canPlace(S, cid, k));

// ---------------------------------------------------------------- networks
function linkR(b) {
  const c = card(b);
  return c.link || (c.tags.includes('Link') ? 2 : 1);
}
function orbitish(S, b) {
  return S.hexes[b.k].kind === 'orbit' || !!card(b).orbitLink;
}
function nextToAnomaly(S, b) {
  return H.near(S.R, b.k, 1).some((k) => S.hexes[k].res === 'Anomaly' && !S.hexes[k].hid);
}
// Buildings are connected when adjacent; Link buildings reach 2 (or `link`);
// orbit slots and orbit-linking buildings share one ring network; an
// Uncertainty Gate joins every building next to an Anomaly.
function nets(S) {
  if (S._nc && S._nc.v === S.bver) return S._nc.m;
  const bs = bldList(S);
  const gates = bs.filter((b) => card(b).anomLink);
  const adj = new Map(bs.map((b) => [b.id, []]));
  const pairs = [];
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      const d = H.dist(a.k, b.k);
      let how = d === 1 ? 'adj' : d <= Math.max(linkR(a), linkR(b)) ? 'link' : null;
      if (!how && orbitish(S, a) && orbitish(S, b)) how = 'orbit';
      if (!how && gates.length) {
        const ag = card(a).anomLink, bg = card(b).anomLink;
        if ((ag && nextToAnomaly(S, b)) || (bg && nextToAnomaly(S, a))) how = 'gate';
      }
      if (how) { adj.get(a.id).push(b.id); adj.get(b.id).push(a.id); pairs.push({ a: a.id, b: b.id, how }); }
    }
  }
  const m = {};
  for (const b of bs) {
    if (m[b.id]) continue;
    const comp = [b.id];
    const seen = new Set(comp);
    for (let i = 0; i < comp.length; i++) for (const n of adj.get(comp[i])) if (!seen.has(n)) { seen.add(n); comp.push(n); }
    for (const id of comp) m[id] = comp;
  }
  Object.defineProperty(S, '_nc', { value: { v: S.bver, m, pairs }, enumerable: false, configurable: true, writable: true });
  return m;
}
// Every connected pair of buildings and how they connect ('adj', 'link' for
// Link reach, 'orbit' for the orbital ring, 'gate' for an Uncertainty Gate).
export function links(S) {
  nets(S);
  return S._nc.pairs;
}
export function network(S, b) {
  return (nets(S)[b.id] || [b.id]).filter((id) => id !== b.id).map((id) => S.blds[id]);
}
export function inNet(S, a, b) {
  return (nets(S)[a.id] || []).includes(b.id);
}
export function orbitLinked(S, b) {
  if (S.hexes[b.k].kind === 'orbit') return true;
  const c = card(b);
  if (c.orbitLink || c.tags.includes('Orbit') || c.tags.includes('Orbital')) return true;
  return network(S, b).some((x) => orbitish(S, x));
}
function effRange(S, b, n) {
  for (const o of bldList(S)) {
    const c = card(o);
    if (c.rangeBoost && o.id !== b.id && c.rangeBoost(mkApi(S, { b: o, notes: [] }), o, b)) return n + 1;
  }
  return n;
}
export function isShielded(S, k) {
  const h = S.hexes[k];
  if (h.st.Shielded) return true;
  if (hasTech(S, 'shieldgrid') && H.dist(k, '0,0') <= 2) return true;
  for (const b of bldList(S)) {
    const c = card(b);
    if (c.shields && c.shields(mkApi(S, { b, notes: [] }), b, k)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- event queue
function emit(S, ev) {
  S._q.push(ev);
}
function inRange(S, b, r, ev) {
  if (r === 'map') return true;
  if (r === 'self') return ev.k === b.k;
  if (r === 'orbit') return orbitLinked(S, b);
  if (r === 'net') {
    const src = ev.src && S.blds[ev.src];
    const at = bldAt(S, ev.k);
    return (src && inNet(S, b, src)) || (at && at.id !== b.id && inNet(S, b, at));
  }
  return ev.k != null && H.dist(b.k, ev.k) <= r;
}
function dispatch(S, ev) {
  for (const b of bldList(S)) {
    if (!S.blds[b.id] || ev.src === b.id) continue;
    const c = card(b);
    for (const L of c.L) {
      if (L.on !== ev.type || !inRange(S, b, L.r, ev)) continue;
      activate(S, b, ev, { fn: L.run });
    }
  }
}
export function processQueue(S) {
  let guard = 0;
  while (S._q.length && guard++ < 800) dispatch(S, S._q.shift());
  S._q.length = 0;
}

// ---------------------------------------------------------------- activation
// Aura points are added to the actor's score but credited to the aura's
// source building, so per-card statistics reflect who generated them.
function auraBonus(S, actor) {
  let s = 0;
  for (const b of bldList(S)) {
    const c = card(b);
    if (!c.aura || b.id === actor.id || blocked(S, b)) continue;
    const v = c.aura(mkApi(S, { b, notes: [] }), b, actor) || 0;
    if (v) { s += v; b.inf += v; }
  }
  return s;
}
function blocked(S, b) {
  const c = card(b);
  if (b.dis > 0) return true;
  return c.tags.includes('Habitat') && S.hexes[b.k].st.Radiation && !c.radOk && S.hexes[b.k].kind !== 'orbit';
}
export function activate(S, b, ev, o = {}) {
  if (!S.blds[b.id] || blocked(S, b)) return false;
  const c = card(b);
  const cap = (c.cap || CAP) + (hasTech(S, 'overclock') ? 1 : 0);
  if (b.acts >= cap && !o.extra) return false;
  const ctx = { b, ev, did: false, pts: 0, notes: [] };
  const fn = o.fn || c.run;
  if (!fn || (S._depth || 0) > 12) return false;
  // Reserve the activation slot first so nested repeats respect the cap.
  b.acts++;
  S._depth = (S._depth || 0) + 1;
  try {
    fn.call(c, mkApi(S, ctx), b, ev);
  } finally {
    S._depth--;
  }
  if (!ctx.did && ctx.pts <= 0) { b.acts--; return false; }
  const aura = ctx.pts > 0 ? auraBonus(S, b) : 0;
  const total = ctx.pts + aura;
  S.influence += total;
  b.inf += ctx.pts;
  if (o.isBuild) b.ib = (b.ib || 0) + ctx.pts;
  b.na = (b.na || 0) + 1;
  S.stats.acts++;
  if (o.repeat) S.stats.repeats++;
  S.tstat.acts.push({ id: b.id, k: b.k, clan: b.clan, tags: c.tags });
  S.tstat.clans[b.clan] = 1;
  if (c.tags.some((t) => t === 'Crystal' || t === 'Exotic' || t === 'Light' || t === 'Radiation')) S.stats.exotic++;
  if (c.tags.includes('Habitat')) S.stats.habitat++;
  logAct(S, { id: b.id, k: b.k, c: b.c, pts: total, note: ctx.notes.join(' · '), rep: !!o.repeat });
  emit(S, { type: 'act', k: b.k, src: b.id, n: b.acts, rep: !!o.repeat });
  if (o.repeat) emit(S, { type: 'repeat', k: b.k, src: b.id });
  if (o.periodic) emit(S, { type: 'periodic', k: b.k, src: b.id });
  return true;
}
function logAct(S, e) {
  e.t = S.turn;
  e.seq = S.seq++;
  S.feed.push(e);
}
function note(S, txt, k) {
  S.feed.push({ t: S.turn, seq: S.seq++, sys: txt, k });
}

// ---------------------------------------------------------------- mutations
// Units per natural deposit; loose tokens are always 1.
export const DEPOSIT_UNITS = { Ore: 3, Gold: 2, Ice: 3, Gas: 2, Crystal: 2, Loam: 3, Seam: 2, Wreck: 3, Regolith: 2, Anomaly: 2, Growth: 1 };
function setRes(S, k, type, amt = 1) {
  S.hexes[k].res = type;
  S.hexes[k].hid = false;
  S.hexes[k].amt = amt;
}
function recordCreate(S, type) {
  if (type === 'Alloy') {
    S.stats.alloy++;
    if (S.mega && S.mega.processor && S.stats.alloy % 3 === 0) megaScore(S, 'processor', 8);
  }
  if (type === 'Biomass') S.stats.biomass++;
  if (type === 'Anomaly') S.stats.exotic++;
}
function destroyBuilding(S, b, srcId) {
  if (!S.blds[b.id] || b.c === 'beacon') return false;
  delete S.blds[b.id];
  S.hexes[b.k].b = null;
  S.bver++;
  S.stats.destroyed++;
  note(S, `${card(b).n} destroyed`, b.k);
  emit(S, { type: 'destroy', k: b.k, card: b.c, clan: b.clan, src: srcId });
  return true;
}
function loseIntegrity(S, n, why) {
  if (n <= 0) return;
  if (S.insurance > 0) { S.insurance--; note(S, `Hazard Insurance absorbed ${why}`); return; }
  if (S.mega && S.mega.nexus && S.nexusEra !== era(S)) { S.nexusEra = era(S); note(S, `Civilization Nexus absorbed ${why}`); return; }
  for (const b of bldList(S)) {
    if (card(b).preventLoss && b.mem.ple !== era(S) && !blocked(S, b)) {
      b.mem.ple = era(S);
      note(S, `${card(b).n} prevented Integrity loss (${why})`, b.k);
      return;
    }
  }
  S.integrity -= n;
  note(S, `−${n} Integrity: ${why}`);
}
function addStatus(S, k, name, t = 99, src) {
  const h = S.hexes[k];
  if (!h || h.kind === 'rock') return false;
  const had = h.st[name];
  h.st[name] = Math.max(had || 0, t);
  if (name === 'Hot' && h.st.Cold) { delete h.st.Cold; }
  if (name === 'Cold' && h.st.Hot) { delete h.st.Hot; emit(S, { type: 'cool', k, src }); }
  if (!had) {
    if (name === 'Hot') emit(S, { type: 'heat', k, src });
    if (name === 'Radiation') { emit(S, { type: 'radiation', k, src }); S.stats.exotic++; }
  }
  return !had || t > had;
}
function removeStatus(S, k, name, src) {
  const h = S.hexes[k];
  if (!h || !h.st[name]) return false;
  delete h.st[name];
  if (name === 'Hot') { emit(S, { type: 'cool', k, src }); S.stats.cooled++; }
  return true;
}
function rotate(S) {
  const before = litMap(S);
  S.phase = (S.phase + 1) % 4;
  const after = litMap(S);
  let changed = 0;
  for (const k in after) {
    if (before[k] === after[k]) continue;
    if (S.hexes[k].b) changed++;
    emit(S, { type: after[k] ? 'enterLit' : 'enterShadow', k });
  }
  return changed;
}
function freeNear(S, k, r) {
  const out = [];
  if (isFree(S, k)) out.push(k);
  for (const n of H.near(S.R, k, r)) if (isFree(S, n)) out.push(n);
  return out;
}

const sysApi = (S) => mkApi(S, { b: null, ev: null, did: false, pts: 0, notes: [] });

// The API handed to card effects. Mutators flag the activation as "did
// something"; queries are side-effect free.
export function mkApi(S, ctx) {
  const self = ctx.b;
  const src = self ? self.id : null;
  const did = () => { ctx.did = true; };
  const a = {
    S, b: self, k: self && self.k, turn: S.turn, ev: ctx.ev, clans: S.clans, tstat: S.tstat,
    get era() { return era(S); },
    mem: (b = self) => b.mem,
    once(tag) {
      const m = self.mem;
      if (m['o_' + tag] === S.turn) return false;
      m['o_' + tag] = S.turn;
      return true;
    },
    dist: H.dist,
    near: (k, r = 1) => H.near(S.R, k, r),
    kind: (k) => S.hexes[k] && S.hexes[k].kind,
    res: (k) => (S.hexes[k] && !S.hexes[k].hid ? S.hexes[k].res : null),
    hidden: (k) => !!(S.hexes[k] && S.hexes[k].hid && S.hexes[k].res),
    is: resIs,
    resNear: (k, sel, r = 1) => H.near(S.R, k, r).filter((n) => { const h = S.hexes[n]; return h.res && !h.hid && resIs(h.res, sel); }),
    allRes: (sel) => H.shape(S.R).all.filter((n) => { const h = S.hexes[n]; return h.res && !h.hid && resIs(h.res, sel); }),
    bldAt: (k) => bldAt(S, k),
    byId: (id) => S.blds[id] || null,
    bldNear(k, sel, r = 1) {
      const out = [];
      for (const n of H.near(S.R, k, r)) {
        const b = bldAt(S, n);
        if (!b || (self && b.id === self.id) || b.c === 'beacon') continue;
        if (!sel || (typeof sel === 'string' ? hasTag(b, sel.replace('#', '')) : sel(b, card(b)))) out.push(b);
      }
      return out;
    },
    orbitBlds: () => bldList(S).filter((b) => S.hexes[b.k].kind === 'orbit'),
    cardOf: (b) => card(b),
    has: (b, t) => hasTag(b, t),
    lit: (k) => isLit(S, k),
    st: (k, n) => !!(S.hexes[k] && S.hexes[k].st[n]),
    free: (k) => isFree(S, k),
    net: (b = self) => network(S, b).filter((x) => x.c !== 'beacon'),
    inNet: (x, y) => inNet(S, x, y),
    orbitLinked: (b = self) => orbitLinked(S, b),
    canRepeat: (b) => !!b && b.id !== src && canRepeatCard(card(b)) && !blocked(S, b),
    R: (n) => (self && hasTag(self, 'Mining') ? effRange(S, self, n) : n),
    rand: () => rnd(S),
    lastActive(r) {
      for (let i = S.feed.length - 1; i >= 0; i--) {
        const e = S.feed[i];
        if (e.t < S.turn - 1) break;
        if (!e.id || e.id === src) continue;
        const b = S.blds[e.id];
        if (b && H.dist(b.k, self.k) <= r && canRepeatCard(card(b))) return b;
      }
      return null;
    },
    nextMeteor: () => S.events.find((e) => e.turn >= S.turn && e.type === 'meteor' && !e.done),

    // --- mutators
    score(n) { if (n > 0) ctx.pts += n; },
    note(s) { ctx.notes.push(s); },
    emit(ev) { emit(S, Object.assign({ src }, ev)); did(); },
    // Deposits with several units stay put and the product appears on an
    // adjacent free hex (nearest this building); the last unit, or a deposit
    // with no free neighbour, transforms in place.
    transform(k, to) {
      const h = S.hexes[k];
      const from = h.res;
      if (!from || h.hid) return false;
      let at = k;
      if ((h.amt || 1) > 1) {
        const opts = H.near(S.R, k, 1).filter((n) => isFree(S, n));
        if (opts.length) {
          at = self ? opts.sort((x, y) => H.dist(x, self.k) - H.dist(y, self.k))[0] : opts[0];
          h.amt--;
          setRes(S, at, to);
        }
      }
      if (at === k) { h.res = to; h.amt = 1; }
      did();
      ctx.notes.push(`${RES[from].ic}→${RES[to].ic}`);
      if (from === 'Gold') { S.stats.precious++; bossHook(S, 'gold'); }
      if ((from === 'Ice' && to === 'Water') || (from === 'Water' && to === 'Ice')) S.stats.icewater++;
      if (from === 'Ice' || from === 'Water') S.stats.water = (S.stats.water || 0) + 1;
      recordCreate(S, to);
      S.tstat.consumed.push({ k, res: from });
      emit(S, { type: 'consume', k, res: from, src });
      emit(S, { type: 'create', k: at, res: to, src });
      emit(S, { type: 'transform', k: at, from, to, src });
      if (from === 'Ice' && to === 'Water') { emit(S, { type: 'melt', k: at, src }); bossHook(S, 'melt'); }
      if (RES[from].tags.includes('Ore')) emit(S, { type: 'extract', k, res: from, src });
      return at;
    },
    create(type, k, r = 1) {
      const opts = freeNear(S, k, r);
      if (!opts.length) return null;
      const t = opts[0] === k ? k : opts[rint(S, opts.length)];
      return a.createAt(type, t) ? t : null;
    },
    createAt(type, k) {
      if (!isFree(S, k)) return false;
      setRes(S, k, type);
      did();
      ctx.notes.push(`+${RES[type].ic}`);
      recordCreate(S, type);
      emit(S, { type: 'create', k, res: type, src });
      return true;
    },
    // Takes one unit; `all` clears the whole deposit.
    consume(k, all = false) {
      const h = S.hexes[k];
      if (!h.res || h.hid) return null;
      const t = h.res;
      if (!all && (h.amt || 1) > 1) h.amt--;
      else { h.res = null; h.amt = 1; }
      did();
      if (t === 'Ice' || t === 'Water') S.stats.water = (S.stats.water || 0) + 1;
      ctx.notes.push(`−${RES[t].ic}`);
      S.tstat.consumed.push({ k, res: t });
      emit(S, { type: 'consume', k, res: t, src });
      return t;
    },
    move(f, t) {
      if (!S.hexes[f].res || !isFree(S, t)) return false;
      S.hexes[t].res = S.hexes[f].res;
      S.hexes[f].res = null;
      did();
      return true;
    },
    addSt(k, n, t = 99) { if (addStatus(S, k, n, t, src)) did(); },
    rmSt(k, n) { if (removeStatus(S, k, n, src)) did(); },
    excavate(k) {
      const h = S.hexes[k];
      if (h.kind !== 'rock') return false;
      h.kind = 'cavern';
      h.hid = false;
      did();
      S.stats.excavated++;
      ctx.notes.push('⛏ cavern');
      emit(S, { type: 'excavate', k, src });
      if (h.res) emit(S, { type: 'reveal', k, res: h.res, src });
      return true;
    },
    reveal(k) {
      const h = S.hexes[k];
      if (!h.hid || !h.res) return null;
      h.hid = false;
      did();
      emit(S, { type: 'reveal', k, res: h.res, src });
      return h.res;
    },
    integrity(d) { did(); if (d < 0) loseIntegrity(S, -d, card(self).n); else S.integrity = Math.min(S.maxIntegrity, S.integrity + d); },
    repeat(b, extra = false) {
      if (!b || b.id === src || !canRepeatCard(card(b))) return false;
      const c = card(b);
      const ok = activate(S, b, null, { repeat: true, extra, fn: c.run || c.build });
      if (ok) did();
      return ok;
    },
    draw(n) { S.bonusDraw += n; did(); },
    destroy(b) { if (destroyBuilding(S, b, src)) did(); },
    toHand(cid) {
      if (S.hand.length < HAND_MAX) { S.hand.push(cid); did(); }
    },
    launch(k) {
      const t = a.consume(k);
      if (!t) return false;
      S.stats.launched++;
      if (S.mega && S.mega.tradering && S.stats.launched % 3 === 0) megaScore(S, 'tradering', 10);
      const orbitK = H.shape(S.R).orbit.slice().sort((x, y) => H.dist(x, k) - H.dist(y, k))[0];
      emit(S, { type: 'launch', k, res: t, src });
      emit(S, { type: 'arrival', k: orbitK, res: t, src });
      ctx.notes.push('🚀');
      return true;
    },
    rotateLight() { did(); return rotate(S); },
    redirectMeteor(k) {
      const e = a.nextMeteor();
      if (!e) return;
      e.k = k;
      e.shep = src;
      did();
    },
  };
  return a;
}

// ---------------------------------------------------------------- local events
export const EVENT_INFO = {
  meteor: { n: 'Meteor Impact', ic: '☄️', d: 'A meteor strikes the marked hex: destroys an unprotected building there (−1 Integrity) and scatters Ore/Dust.' },
  flare: { n: 'Solar Flare', ic: '🌞', d: 'Sunlit Solar buildings fire again; Sunlit Signal buildings without a Shield neighbour shut down for a turn.' },
  cryonight: { n: 'Cryogenic Night', ic: '🌌', d: 'Water on Shadow hexes freezes into Ice.' },
  derelict: { n: 'Derelict Arrival', ic: '🛸', d: 'Two Ancient Wreckage drift onto the surface.' },
  tremor: { n: 'Core Tremor', ic: '🌋', d: 'Buildings on Unstable hexes collapse (−1 Integrity each, max 2). New Ore surfaces; new faults open.' },
  comet: { n: 'Organic Comet', ic: '🌠', d: 'Ice, Bio-Loam and an Organic Seam rain down around the marked hex.' },
  radsurge: { n: 'Radiation Surge', ic: '☢️', d: 'Three hexes near Anomalies become Radiated.' },
};

function impact(S, E) {
  const k = E.k;
  const h = S.hexes[k];
  let protectedBy = null;
  for (const b of bldList(S)) {
    const g = card(b).guard;
    if (g && H.dist(b.k, k) <= g.r && !blocked(S, b)) { protectedBy = b; break; }
  }
  const tgt = bldAt(S, k);
  let dmg = false;
  if (protectedBy) {
    note(S, `${card(protectedBy).n} intercepted the meteor`, k);
    activate(S, protectedBy, { type: 'impact', k }, { fn: card(protectedBy).guard.run, extra: true });
  } else if (tgt && tgt.c !== 'beacon' && !isShielded(S, k)) {
    destroyBuilding(S, tgt, null);
    loseIntegrity(S, 1, 'meteor impact');
    dmg = true;
  }
  const drop = E.drop || 'Ore';
  if (isFree(S, k)) setRes(S, k, drop, DEPOSIT_UNITS[drop] || 1);
  let extra = 1 + (E.shep ? 2 : 0);
  for (const n of H.near(S.R, k, 1)) {
    if (extra <= 0) break;
    if (isFree(S, n)) { setRes(S, n, rnd(S) < 0.5 ? 'Dust' : drop); extra--; }
  }
  if (E.shep && S.blds[E.shep]) activate(S, S.blds[E.shep], null, { fn: (a) => a.score(10), extra: true });
  emit(S, { type: 'impact', k, dmg });
  S.stats.impacts++;
}

function runEvent(S, E) {
  E.done = true;
  note(S, `${EVENT_INFO[E.type].ic} ${EVENT_INFO[E.type].n}`, E.k);
  const land = H.shape(S.R).land;
  if (E.type === 'meteor') impact(S, E);
  else if (E.type === 'comet') {
    impact(S, Object.assign({}, E, { drop: 'Ice' }));
    for (const t of ['Loam', 'Seam']) {
      const f = freeNear(S, E.k, 2);
      if (f.length) setRes(S, pick(S, f), t, DEPOSIT_UNITS[t]);
    }
  } else if (E.type === 'flare') {
    for (const b of bldList(S)) {
      if (!isLit(S, b.k)) continue;
      if (hasTag(b, 'Solar')) activate(S, b, null, { repeat: true, extra: true });
      const safe = card(b).flareProof || H.near(S.R, b.k, 1).some((n) => { const o = bldAt(S, n); return o && (hasTag(o, 'Shield') || card(o).flareProof); });
      if (hasTag(b, 'Signal') && !safe) b.dis = 2;
    }
    emit(S, { type: 'storm', k: '0,0' });
  } else if (E.type === 'cryonight') {
    const api = sysApi(S);
    for (const k of land) if (S.hexes[k].res === 'Water' && !S.hexes[k].hid && !isLit(S, k)) api.transform(k, 'Ice');
  } else if (E.type === 'derelict') {
    const f = land.filter((k) => isFree(S, k) && H.dist(k, '0,0') >= S.R - 1);
    for (let i = 0; i < 2 && f.length; i++) setRes(S, f.splice(rint(S, f.length), 1)[0], 'Wreck', 3);
  } else if (E.type === 'tremor') {
    let lost = 0;
    for (const b of bldList(S)) {
      const h = S.hexes[b.k];
      if (h.st.Unstable && !h.st.Stable && !isShielded(S, b.k) && b.c !== 'beacon') {
        destroyBuilding(S, b, null);
        lost++;
      }
    }
    if (lost) loseIntegrity(S, Math.min(2, lost), 'tremor collapse');
    const f = land.filter((k) => isFree(S, k));
    for (let i = 0; i < 2 && f.length; i++) setRes(S, f.splice(rint(S, f.length), 1)[0], 'Ore', 3);
    const g = land.filter((k) => S.hexes[k].kind !== 'rock' && !S.hexes[k].st.Stable && !S.hexes[k].st.Unstable);
    for (let i = 0; i < 2 && g.length; i++) S.hexes[g.splice(rint(S, g.length), 1)[0]].st.Unstable = 99;
  } else if (E.type === 'radsurge') {
    const anoms = land.filter((k) => S.hexes[k].res === 'Anomaly');
    const pool = (anoms.length ? anoms.flatMap((k) => H.near(S.R, k, 2)) : land).filter((k) => S.hexes[k].kind !== 'rock' && S.hexes[k].kind !== 'orbit');
    for (let i = 0; i < 3 && pool.length; i++) addStatus(S, pool.splice(rint(S, pool.length), 1)[0], 'Radiation');
  }
  processQueue(S);
}

// ---------------------------------------------------------------- boss hazards
function bossHook(S, what) {
  const B = S.boss;
  if (!B) return;
  if (B.type === 'aurelia' && what === 'gold') B.meter++;
  if (B.type === 'nyxea' && what === 'melt') B.meter++;
}
export const BOSS_INFO = {
  aurelia: { meterName: 'Fault Stress', max: 6 },
  nyxea: { meterName: 'Tidal Pressure', max: 8 },
  viridion: { meterName: 'Bloom', max: 3 },
};
function bossStep(S) {
  const B = S.boss;
  if (!B) return;
  const land = H.shape(S.R).land;
  if (B.type === 'aurelia') {
    if (B.meter >= 6 && wardOff(S)) B.meter = 0;
    if (B.meter >= 6) {
      note(S, '🌋 MANTLE ROAR – the golden mantle heaves!');
      let lost = 0;
      for (const b of bldList(S)) {
        const h = S.hexes[b.k];
        const anchored = h.st.Stable || H.near(S.R, b.k, 1).some((n) => { const o = bldAt(S, n); return o && hasTag(o, 'Anchor'); });
        if (!anchored && !isShielded(S, b.k) && b.c !== 'beacon' && h.kind !== 'orbit') { destroyBuilding(S, b, null); lost++; }
      }
      loseIntegrity(S, 2, 'Mantle Roar');
      const f = land.filter((k) => isFree(S, k));
      for (let i = 0; i < 3 && f.length; i++) setRes(S, f.splice(rint(S, f.length), 1)[0], 'Gold', 2);
      const g = land.filter((k) => S.hexes[k].kind === 'surface' && !S.hexes[k].st.Stable);
      for (let i = 0; i < 3 && g.length; i++) S.hexes[g.splice(rint(S, g.length), 1)[0]].st.Unstable = 99;
      B.meter = 0;
      B.roars++;
      processQueue(S);
    }
  } else if (B.type === 'nyxea') {
    B.clock++;
    if ((B.meter >= 8 || B.clock >= 5) && wardOff(S)) { B.meter = 0; B.clock = 0; }
    if (B.meter >= 8 || B.clock >= 5) {
      note(S, '🌊 FRACTURE TIDE – water floods through the cracks!');
      let lost = 0;
      for (const b of bldList(S)) {
        const h = S.hexes[b.k];
        const nearCrack = h.st.Crack || H.near(S.R, b.k, 1).some((n) => S.hexes[n].st.Crack);
        if (nearCrack && !h.st.Pressure && !isShielded(S, b.k) && b.c !== 'beacon' && h.kind !== 'orbit') { destroyBuilding(S, b, null); lost++; }
      }
      if (lost) loseIntegrity(S, 1, 'flood');
      const f = land.filter((k) => isFree(S, k) && (S.hexes[k].st.Crack || H.near(S.R, k, 1).some((n) => S.hexes[n].st.Crack)));
      for (let i = 0; i < 4 && f.length; i++) setRes(S, f.splice(rint(S, f.length), 1)[0], 'Water');
      B.meter = 0;
      B.clock = 0;
      processQueue(S);
    }
  } else if (B.type === 'viridion') {
    // Taming: Growth touched by 2+ buildings (or 1 Bio/Habitat) becomes Biomass.
    const api = sysApi(S);
    for (const k of land) {
      if (S.hexes[k].res !== 'Growth') continue;
      const nb = H.near(S.R, k, 1).map((n) => bldAt(S, n)).filter(Boolean);
      if (nb.length >= 2 || nb.some((b) => hasTag(b, 'Bio') || hasTag(b, 'Habitat'))) {
        api.transform(k, 'Biomass');
        S.influence += 3;
        B.tamed++;
      }
    }
    processQueue(S);
    B.clock++;
    if (B.clock >= 3 && wardOff(S)) B.clock = 0;
    if (B.clock >= 3) {
      B.clock = 0;
      const seeds = land.filter((k) => ['Growth', 'Loam', 'Biomass', 'Seam'].includes(S.hexes[k].res));
      const f = [...new Set(seeds.flatMap((k) => H.near(S.R, k, 1)))].filter((k) => isFree(S, k));
      let n = 0;
      for (const k of f.sort(() => rnd(S) - 0.5)) { if (n++ >= 4 + B.wave) break; setRes(S, k, 'Growth'); }
      B.wave++;
      note(S, `🌱 WILD GROWTH spreads (${Math.min(n, 4 + B.wave)} hexes)`);
    }
  }
}
// Thermal Reserve supply token: the first boss hazard fizzles.
function wardOff(S) {
  if (!S.boss.ward) return false;
  S.boss.ward = 0;
  note(S, '🧪 Thermal Reserve absorbed the planet\'s first hazard');
  return true;
}
// Every objective can be met by any trio (design guardrail: no compulsory clan).
export function bossObjective(S) {
  const B = S.boss;
  if (!B) return null;
  const land = H.shape(S.R).land;
  if (B.type === 'aurelia') {
    const stable = bldList(S).filter((b) => b.c !== 'beacon' && (S.hexes[b.k].st.Stable || isShielded(S, b.k))).length;
    const claimed = land.filter((k) => S.hexes[k].res === 'Gold' && !S.hexes[k].hid && H.near(S.R, k, 1).filter((n) => S.hexes[n].b).length >= 2).length;
    const gold = S.stats.precious + claimed;
    return { done: gold >= 6 && stable >= 5, text: `Work 6 Gold Veins – process them, or surround one with 2+ buildings (${gold}/6) – and hold 5 buildings on Stable or Shielded hexes (${stable}/5)` };
  }
  if (B.type === 'nyxea') {
    const ice = land.filter((k) => S.hexes[k].res === 'Ice' && !S.hexes[k].hid).length;
    const w = S.stats.water || 0;
    return { done: w >= 8 && ice >= 3, text: `Cycle water 8 times – transform or consume Ice/Water (${w}/8) – and keep 3 Ice deposits standing (${ice}/3)` };
  }
  return { done: B.tamed >= 6, text: `Tame 6 Wild Growth hexes (${B.tamed}/6) – surround Growth with 2 buildings, or 1 Bio/Habitat building` };
}

// ---------------------------------------------------------------- drawing
export function tierOpen(S, t) {
  const sh = S.draw.research || 0;
  if (t === 'E') return true;
  if (t === 'M') return S.turn >= 6 - 2 * sh;
  return S.turn >= 11 - 2 * sh;
}
export function cardWeight(S, c) {
  if (S.draw.ban.includes(c.id) || !tierOpen(S, c.t)) return 0;
  return RARITY[c.r].w * (S.draw.fav[c.id] || 1);
}
export function drawOne(S, opt = {}) {
  const clanW = S.clans.map((cl) => [cl, S.draw.presence[cl] || 1]);
  for (let tries = 0; tries < 6; tries++) {
    const cl = opt.clan || weighted(S, clanW);
    const pool = S.pool[cl].map((id) => CARDS[id]).filter((c) => !opt.tier || c.t === opt.tier);
    const id = weighted(S, pool.map((c) => [c.id, cardWeight(S, c)]));
    if (id) return id;
  }
  return null;
}
function dealDraws(S, n) {
  for (let i = 0; i < n; i++) {
    const id = drawOne(S);
    if (!id) continue;
    if (S.hand.length < HAND_MAX) S.hand.push(id);
    else { S.influence += 1; note(S, `Hand full – ${CARDS[id].n} scrapped (+1)`); }
  }
}

// ---------------------------------------------------------------- turn flow
export function resetTurnState(S) {
  for (const b of bldList(S)) b.acts = 0;
  S.tstat = { acts: [], consumed: [], clans: {} };
  S.scrapped = false;
  S.feed = S.feed.slice(-400);
  S._q = [];
}

export function playCard(S, handIdx, k) {
  if (S.status !== 'play') return false;
  const cid = S.hand[handIdx];
  if (!cid || !canPlace(S, cid, k)) return false;
  S._q = [];
  S.hand.splice(handIdx, 1);
  const c = CARDS[cid];
  const h = S.hexes[k];
  if (h.res && h.hid) { h.res = null; h.hid = false; }
  const id = S.nextId++;
  const b = { id, c: cid, k, clan: c.cl, acts: 0, age: 0, sun: 0, mem: {}, placed: S.turn, inf: 0, dis: 0 };
  S.blds[id] = b;
  h.b = id;
  S.bver++;
  S.stats.placed++;
  S.lastPlaced = id;
  if (S.boss && S.boss.type === 'aurelia' && c.tags.includes('Anchor')) S.boss.meter = Math.max(0, S.boss.meter - 1);
  emit(S, { type: 'placed', k, src: id });
  if (c.build) activate(S, b, null, { fn: c.build, isBuild: true });
  processQueue(S);
  endTurn(S);
  return true;
}

export function passTurn(S) {
  if (S.status !== 'play') return;
  S._q = [];
  endTurn(S);
}

export function scrapCard(S, handIdx) {
  if (S.scrapped || S.status !== 'play' || !S.hand[handIdx]) return false;
  const [cid] = S.hand.splice(handIdx, 1);
  S.influence += 1;
  S.scrapped = true;
  note(S, `Scrapped ${CARDS[cid].n} (+1)`);
  return true;
}

export function abilityState(S, b) {
  const ab = card(b).ability;
  if (!ab) return null;
  const a = mkApi(S, { b, notes: [] });
  const usedThisEra = b.mem.abEra === era(S);
  const ok = S.status === 'play' && !usedThisEra && !blocked(S, b) && (!ab.can || ab.can(a));
  return { ab, ok, usedThisEra };
}
export function abilityTargets(S, b) {
  const ab = card(b).ability;
  const a = mkApi(S, { b, notes: [] });
  if (ab.target === 'bld') return bldList(S).filter((o) => H.dist(o.k, b.k) <= (ab.range || 2) && ab.valid(a, o)).map((o) => o.k);
  if (ab.target === 'hex') return H.shape(S.R).land.filter((k) => ab.valid(a, k));
  return [];
}
export function useAbility(S, bid, k) {
  const b = S.blds[bid];
  if (!b) return false;
  const st = abilityState(S, b);
  if (!st || !st.ok) return false;
  if (st.ab.target && !abilityTargets(S, b).includes(k)) return false;
  S._q = [];
  b.mem.abEra = era(S);
  activate(S, b, null, { fn: (a) => st.ab.run(a, k), extra: true });
  processQueue(S);
  checkFail(S);
  return true;
}

// Artificial Dawn: Solar buildings in the project network keep working for
// the first Shadow turn after they were lit.
function dawnLit(S, b) {
  const lit = isLit(S, b.k);
  const prev = b.mem.litT;
  if (lit) b.mem.litT = S.turn;
  return !lit && !!(S.mega && S.mega.dawn) && prev === S.turn - 1 && hasTag(b, 'Solar') && (S.megaNet?.dawn || []).includes(b.id);
}

function periodicDue(S, b) {
  const c = card(b);
  switch (c.trig) {
    case 'turn': return true;
    case 'every': return b.age % c.every === 0;
    case 'sunlit': return isLit(S, b.k) || dawnLit(S, b);
    case 'sunlit2': if (isLit(S, b.k) || dawnLit(S, b)) { b.sun++; return b.sun % 2 === 0; } return false;
    case 'shadow': return !isLit(S, b.k);
    default: return false;
  }
}

export function endTurn(S) {
  S.turnStartSeq = S.turnStartSeq ?? 0;
  // 1. rotation
  rotate(S);
  processQueue(S);
  // 2. periodic buildings
  const bs = bldList(S);
  for (const b of bs) b.age++;
  const late = [];
  for (const b of bs) {
    if (!S.blds[b.id]) continue;
    const c = card(b);
    if (!c.run || !periodicDue(S, b)) continue;
    if (c.late) { late.push(b); continue; }
    activate(S, b, null, { periodic: true });
    processQueue(S);
  }
  for (const b of late) { activate(S, b, null, { periodic: true }); processQueue(S); }
  // 2b. mega-projects and local technologies
  megaStep(S);
  techStep(S);
  // 3. scheduled event
  for (const E of S.events) if (E.turn === S.turn && !E.done) runEvent(S, E);
  // 4. boss
  bossStep(S);
  // 5. status decay
  for (const k of H.shape(S.R).all) {
    const st = S.hexes[k].st;
    for (const n in st) if (st[n] < 99 && --st[n] <= 0) delete st[n];
  }
  for (const b of bldList(S)) if (b.dis > 0) b.dis--;
  // 6. stamps that are evaluated each turn
  const clansNow = Object.keys(S.tstat.clans).filter((c) => S.clans.includes(c)).length;
  if (clansNow >= 3) S.stats.triTurns++;
  // 7. checkpoint
  const cp = S.checkpoints.find((c) => c.turn === S.turn);
  if (cp) {
    cp.at = S.influence;
    cp.met = S.influence >= cp.need;
    if (cp.met) {
      note(S, `✅ Checkpoint ${cp.need} met`);
      if (cp.turn < S.turns) offerTech(S);
    }
    else if (cp.turn === S.turns) note(S, `❌ Final checkpoint ${cp.need} missed`);
    else { note(S, `⚠️ Checkpoint ${cp.need} missed`); loseIntegrity(S, 3, 'missed checkpoint'); }
  }
  checkFail(S);
  if (S.status !== 'play') return;
  if (S.turn >= S.turns) { finish(S); return; }
  // 8. next turn & draws
  S.lastClans = clansNow;
  const draws = drawsFor(S, clansNow) + S.bonusDraw + (hasTech(S, 'drone') ? 1 : 0) + ((S.tradeCharter || []).includes(S.turn + 1) ? 1 : 0);
  S.bonusDraw = 0;
  S.turn++;
  resetTurnState(S);
  dealDraws(S, draws);
  S.lastDraw = draws;
}

// 1 draw, +1 if two clans activated (or your only clan did), +1 more if all three did.
export function drawsFor(S, clansNow) {
  const n = S.clans.length;
  return 1 + (clansNow >= Math.min(2, n) ? 1 : 0) + (n >= 3 && clansNow >= 3 ? 1 : 0);
}

// ---------------------------------------------------------------- local technologies
// Offered at each met (non-final) checkpoint; they last for this map only.
export const TECHS = {
  echo: { n: 'Activation Echo', ic: '🔁', d: 'Once per era, at the end of a turn, your highest-earning building activates again.' },
  survey: { n: 'Field Survey', ic: '🛰️', d: 'Reveal every buried surface deposit now and draw 1 extra card next turn.' },
  weave: { n: 'Structural Weave', ic: '🧱', d: '+3 Integrity and +3 maximum Integrity.' },
  shieldgrid: { n: 'Shield Grid', ic: '🛡️', d: 'Every hex within range 2 of the Charter Beacon counts as Shielded.' },
  overclock: { n: 'Overclock', ic: '⚡', d: 'Every building may activate one extra time per turn.' },
  drone: { n: 'Supply Drones', ic: '📦', d: 'Draw 1 extra card every turn.' },
  resonance: { n: 'Clan Resonance', ic: '🎼', d: 'At the end of each turn, +2 Influence per clan that activated.' },
};
export const hasTech = (S, id) => !!(S.techs && S.techs.includes(id));
function offerTech(S) {
  const pool = Object.keys(TECHS).filter((t) => !hasTech(S, t));
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(rint(S, pool.length), 1)[0]);
  if (out.length) { S.techOffer = out; note(S, '🔬 Local technology available'); }
}
export function chooseTech(S, id) {
  if (!S.techOffer || !S.techOffer.includes(id)) return false;
  S.techOffer = null;
  S.techs = (S.techs || []).concat(id);
  note(S, `🔬 ${TECHS[id].n} installed`);
  if (id === 'weave') { S.integrity += 3; S.maxIntegrity += 3; }
  if (id === 'survey') {
    for (const k of H.shape(S.R).land) if (S.hexes[k].kind !== 'rock') S.hexes[k].hid = false;
    S.bonusDraw++;
  }
  return true;
}
function techStep(S) {
  if (hasTech(S, 'echo') && S.echoEra !== era(S)) {
    const best = bldList(S).filter((b) => b.c !== 'beacon' && canRepeatCard(card(b)) && !blocked(S, b)).sort((a, b) => b.inf - a.inf)[0];
    if (best) {
      S.echoEra = era(S);
      activate(S, best, null, { repeat: true, extra: true, fn: card(best).run || card(best).build });
      processQueue(S);
    }
  }
  if (hasTech(S, 'resonance')) {
    const n = Object.keys(S.tstat.clans).filter((c) => S.clans.includes(c)).length;
    if (n) { S.influence += 2 * n; note(S, `🎼 Clan Resonance +${2 * n}`); }
  }
}

// ---------------------------------------------------------------- mega-projects
// Recognized arrangements of buildings: +12 on completion, then a lasting perk.
export const MEGA = {
  dawn: { n: 'Artificial Dawn', ic: '🌄', req: '3 Solar and 2 other Power buildings in one network', d: 'Solar buildings in that network keep firing for one Shadow turn after sunset.' },
  biosphere: { n: 'Deep Biosphere', ic: '🌳', req: '4 connected Bio buildings, 2 of them on Pressurized or Cavern hexes', d: '+4 Influence every turn.' },
  tradering: { n: 'Orbital Trade Ring', ic: '💫', req: '3 Orbit/Orbital buildings and at least one Cargo launch', d: 'Every third Cargo launch scores +10.' },
  processor: { n: 'Planetary Processor', ic: '🏭', req: '3 connected Mining/Industry/Metal buildings and 2 Alloy created', d: 'Every third Alloy created scores +8.' },
  nexus: { n: 'Civilization Nexus', ic: '🏛️', req: 'Connected buildings on Pressurized hexes from every active clan (2+ clans)', d: '+2 Influence per active clan every turn; the first Integrity loss each era is prevented.' },
  reactor: { n: 'Exotic Reactor', ic: '☢️', req: '3 Exotic/Radiation/Crystal buildings next to an Anomaly', d: 'Each turn one of them activates again (+3); it may irradiate a hex.' },
};
function megaScore(S, id, n) {
  S.influence += n;
  note(S, `${MEGA[id].ic} ${MEGA[id].n} +${n}`);
}
function components(S) {
  const seen = new Set();
  const out = [];
  for (const b of bldList(S)) {
    if (seen.has(b.id) || b.c === 'beacon') continue;
    const comp = [b].concat(network(S, b)).filter((x) => x.c !== 'beacon');
    comp.forEach((x) => seen.add(x.id));
    out.push(comp);
  }
  return out;
}
export function megaProgress(S) {
  const comps = components(S);
  const tagged = (bs, ...ts) => bs.filter((b) => ts.some((t) => hasTag(b, t)));
  const best = (f) => comps.reduce((m, c) => Math.max(m, f(c)), 0);
  const nextAnom = bldList(S).filter((b) => (hasTag(b, 'Exotic') || hasTag(b, 'Radiation') || hasTag(b, 'Crystal')) && nextToAnomaly(S, b));
  return {
    dawn: { have: best((c) => Math.min(3, tagged(c, 'Solar').length) + Math.min(2, c.filter((b) => hasTag(b, 'Power') && !hasTag(b, 'Solar')).length)), need: 5, net: comps.find((c) => tagged(c, 'Solar').length >= 3 && c.filter((b) => hasTag(b, 'Power') && !hasTag(b, 'Solar')).length >= 2) },
    biosphere: { have: best((c) => { const bio = tagged(c, 'Bio'); return Math.min(4, bio.length) + Math.min(2, bio.filter((b) => S.hexes[b.k].st.Pressure || S.hexes[b.k].kind === 'cavern').length); }), need: 6 },
    tradering: { have: Math.min(3, bldList(S).filter((b) => S.hexes[b.k].kind === 'orbit' || hasTag(b, 'Orbit') || hasTag(b, 'Orbital')).length) + Math.min(1, S.stats.launched), need: 4 },
    processor: { have: best((c) => Math.min(3, tagged(c, 'Mining', 'Industry', 'Metal').length)) + Math.min(2, S.stats.alloy), need: 5 },
    nexus: { have: S.clans.length < 2 ? 0 : best((c) => new Set(c.filter((b) => S.hexes[b.k].st.Pressure).map((b) => b.clan)).size), need: S.clans.length < 2 ? 99 : S.clans.length },
    reactor: { have: Math.min(3, nextAnom.length), need: 3, blds: nextAnom },
  };
}
function megaStep(S) {
  S.mega = S.mega || {};
  const pr = megaProgress(S);
  for (const id of Object.keys(MEGA)) {
    if (S.mega[id] || pr[id].have < pr[id].need) continue;
    S.mega[id] = S.turn;
    note(S, `🏗 Mega-project complete: ${MEGA[id].n}!`);
    megaScore(S, id, 12);
  }
  if (S.mega.dawn && pr.dawn.net) S.megaNet = { dawn: pr.dawn.net.map((b) => b.id) };
  if (S.mega.biosphere) megaScore(S, 'biosphere', 4);
  if (S.mega.nexus) megaScore(S, 'nexus', 2 * S.clans.length);
  if (S.mega.reactor && pr.reactor.blds.length) {
    const b = pr.reactor.blds[rint(S, pr.reactor.blds.length)];
    if (activate(S, b, null, { repeat: true, extra: true, fn: card(b).run || card(b).build })) megaScore(S, 'reactor', 3);
    if (rnd(S) < 0.3) {
      const f = H.near(S.R, b.k, 2).filter((k) => S.hexes[k].kind !== 'rock' && S.hexes[k].kind !== 'orbit');
      if (f.length) addStatus(S, f[rint(S, f.length)], 'Radiation');
    }
    processQueue(S);
  }
}

function checkFail(S) {
  if (S.status === 'play' && S.integrity <= 0) {
    S.integrity = 0;
    S.status = 'failed';
    S.result = { success: false, reason: 'The asteroid fractured – Integrity reached 0.' };
  }
}

export function integrateDone(S) {
  const beacon = bldList(S).find((b) => b.c === 'beacon');
  if (!beacon) return false;
  const cl = new Set(network(S, beacon).map((b) => b.clan));
  return S.clans.every((c) => cl.has(c)) && network(S, beacon).length >= 2;
}

function finish(S) {
  const finalCp = S.checkpoints[S.checkpoints.length - 1];
  const ok = finalCp.met;
  let bossOk = true;
  if (S.boss) bossOk = bossObjective(S).done;
  S.status = ok && bossOk ? 'won' : 'failed';
  S.result = {
    success: ok && bossOk,
    reason: !ok ? `Final Influence checkpoint (${finalCp.need}) was not met.` : !bossOk ? 'The planet\'s stabilization objective was not completed.' : 'Colony secured!',
    integrate: integrateDone(S),
    masterwork: S.influence >= Math.round(finalCp.need * 1.25),
  };
}

// Specialization milestones per charter family (see expedition.js).
export const SPECIALIZE = {
  gold: { stat: 'precious', need: 3, text: 'Process 3 Gold Veins' },
  metal: { stat: 'alloy', need: 3, text: 'Create 3 Alloy' },
  ice: { stat: 'icewater', need: 5, text: '5 Ice↔Water transformations' },
  bio: { stat: 'biomass', need: 5, text: 'Grow 5 Biomass' },
  exotic: { stat: 'exotic', need: 8, text: '8 Exotic interactions (Crystal/Light/Exotic activations, Radiation, Anomalies)' },
  trade: { stat: 'trade', need: 1, text: 'Launch 3 Cargo or make 10 Habitat activations' },
};
export function specializeDone(S, fam) {
  if (S.prestamp) return true;
  if (fam === 'trade') return S.stats.launched >= 3 || S.stats.habitat >= 10;
  const sp = SPECIALIZE[fam];
  return S.stats[sp.stat] >= sp.need;
}

export function clone(S) {
  const c = structuredClone(S);
  c._q = [];
  return c;
}
export function serialize(S) {
  return JSON.parse(JSON.stringify(S, (k, v) => (k === '_q' ? undefined : v)));
}

// Simulated outcome of placing a card – used for UI forecasts and the AI.
// `look` extra quiet turns estimate the building's near-term payoff.
export function forecast(S, handIdx, k, look = 0) {
  const c = clone(S);
  const before = c.influence;
  const seq = c.seq;
  playCard(c, handIdx, k);
  const out = { gain: c.influence - before, integrity: c.integrity - S.integrity, feed: c.feed.filter((e) => e.seq >= seq), state: c };
  if (look) {
    const c2 = clone(c);
    for (let t = 0; t < look && c2.status === 'play'; t++) { c2.hand = []; passTurn(c2); }
    out.soon = c2.influence - before;
  }
  return out;
}
