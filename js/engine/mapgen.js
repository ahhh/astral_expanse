// Procedural colony maps from a resource profile (0–5 per family).
import * as H from './hex.js';
import { rnd, rint, pick, shuffle, weighted } from './rng.js';
import { CARDS, clanCards } from './cards.js';
import { drawOne, resetTurnState, isFree, DEPOSIT_UNITS } from './colony.js';

// Resources each clan needs to get its first engine going (minimum-viability rule).
export const CLAN_SEEDS = {
  iron: ['Ore', 'Ore', 'Ore', 'Regolith'], helio: ['Ice', 'Crystal', 'Gas'], cryo: ['Ice', 'Ice', 'Ice'], verd: ['Seam', 'Loam', 'Water', 'Water'],
  syn: ['Crystal', 'Crystal'], wreck: ['Wreck', 'Wreck', 'Regolith'], kep: ['Ore', 'Water'], hearth: ['Water', 'Water'], umbra: ['Anomaly', 'Crystal', 'Gas'],
};

// Self-sufficient Early producer each clan always opens with.
export const STARTERS = {
  iron: 'pit_drill', helio: 'sunfoil_canopy', cryo: 'ice_harvester', verd: 'spore_seeder', syn: 'array_beacon',
  wreck: 'breaker_yard', kep: 'launch_rail', hearth: 'pressure_dome', umbra: 'void_prism',
};

// Influence checkpoint curve (cumulative): need(t) = diff × (0.7t² + 1.5t).
// Fitted to the greedy bot's 10th-percentile Influence in tools/sim.mjs
// (≈29 / 99 / 210 / 335 at turns 5/10/15/20), so a solid player clears an
// ordinary sector-1 colony ~90% of the time; later sectors raise `diff`.
export const checkpointNeed = (t, diff) => Math.round(diff * (0.7 * t * t + 1.5 * t));
export function checkpointsFor(turns, diff) {
  const out = [];
  for (let t = 5; t <= turns; t += 5) out.push({ turn: t, need: checkpointNeed(t, diff), met: null });
  return out;
}

function eventDeck(profile, opts) {
  const p = profile;
  return [
    ['meteor', 3 + p.metal * 0.4 + p.gold * 0.4],
    ['flare', 1.2],
    ['cryonight', 0.6 + p.ice * 0.5],
    ['derelict', 0.8 + (opts.type === 'derelict' ? 3 : 0)],
    ['tremor', 0.6 + (opts.type === 'fault' ? 3 : 0) + p.metal * 0.2],
    ['comet', 0.5 + p.bio * 0.4],
    ['radsurge', 0.3 + p.exotic * 0.5],
  ];
}

export function genColony(opts) {
  const R = opts.R || 4;
  const turns = opts.turns || 20;
  const profile = opts.profile;
  const rng = { seed: opts.seed >>> 0 || 1 };
  const shp = H.shape(R);
  const hexes = {};
  for (const k of shp.land) hexes[k] = { k, kind: 'surface', res: null, hid: false, b: null, st: {} };
  for (const k of shp.orbit) hexes[k] = { k, kind: 'orbit', res: null, hid: false, b: null, st: {} };
  const d0 = (k) => H.dist(k, '0,0');

  // Rock bodies: 2–4 blobs away from the landing zone.
  const rockTarget = Math.round(shp.land.length * (opts.type === 'relay' ? 0.12 : 0.17) + profile.metal * 0.6);
  let rock = 0;
  const blobs = 2 + rint(rng, 3);
  for (let i = 0; i < blobs && rock < rockTarget; i++) {
    let k = pick(rng, shp.land.filter((x) => d0(x) >= 2 && hexes[x].kind === 'surface'));
    const size = Math.ceil(rockTarget / blobs) + rint(rng, 2);
    for (let j = 0; j < size && rock < rockTarget; j++) {
      if (hexes[k].kind === 'surface' && d0(k) >= 2) { hexes[k].kind = 'rock'; rock++; }
      const nb = H.near(R, k, 1).filter((x) => hexes[x] && hexes[x].kind !== 'orbit' && d0(x) >= 2);
      k = pick(rng, nb);
    }
  }
  // Pre-existing caverns at rock edges.
  const rocks = shp.land.filter((k) => hexes[k].kind === 'rock');
  for (const k of shuffle(rng, rocks).slice(0, 2)) hexes[k].kind = 'cavern';

  // Deposits.
  const p = profile;
  const counts = {
    Gold: Math.round(p.gold * 1.1),
    Ore: 1 + Math.round(p.metal * 1.3),
    Ice: Math.round(p.ice * 1.5),
    Gas: Math.round(p.ice * 0.3 + p.exotic * 0.3) + 1,
    Crystal: Math.round(p.exotic * 1.1),
    Anomaly: Math.floor(p.exotic / 2),
    Loam: Math.round(p.bio * 1.0),
    Seam: Math.round(p.bio * 0.8),
    Wreck: 1 + (opts.type === 'derelict' ? 4 : 0),
    Regolith: 2 + Math.round(p.metal * 0.4),
  };
  const surf = () => shp.land.filter((k) => hexes[k].kind !== 'rock' && !hexes[k].res && d0(k) >= 2);
  const placed = {};
  for (const [t, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      let cands = surf();
      // Clustering: half of deposits prefer a hex next to the same type.
      if (placed[t] && rnd(rng) < 0.5) {
        const near = [...new Set(placed[t].flatMap((k) => H.near(R, k, 1)))].filter((k) => cands.includes(k));
        if (near.length) cands = near;
      }
      if (!cands.length) break;
      const k = pick(rng, cands);
      hexes[k].res = t;
      hexes[k].hid = rnd(rng) < 0.22;
      (placed[t] = placed[t] || []).push(k);
    }
  }
  // Buried deposits inside rock (revealed on excavation).
  const buried = [['Ore', 2 + p.metal], ['Gold', 1 + p.gold], ['Ice', 1 + p.ice * 0.6], ['Crystal', 0.5 + p.exotic * 0.6], ['Anomaly', p.exotic * 0.3]];
  for (const k of shp.land) {
    if (hexes[k].kind === 'rock' && rnd(rng) < 0.45) { hexes[k].res = weighted(rng, buried); hexes[k].hid = true; }
  }

  // Minimum viability: each active clan finds its seed resources near the landing zone.
  for (const cl of opts.clans) {
    for (const t of CLAN_SEEDS[cl] || []) {
      const have = shp.land.filter((k) => hexes[k].res === t && !hexes[k].hid && d0(k) <= 3).length;
      const need = CLAN_SEEDS[cl].filter((x) => x === t).length;
      if (have >= need) continue;
      const cands = shp.land.filter((k) => hexes[k].kind === 'surface' && !hexes[k].res && d0(k) >= 2 && d0(k) <= 3);
      if (cands.length) hexes[pick(rng, cands)].res = t;
    }
  }

  // Terrain statuses.
  const nearRock = shp.land.filter((k) => hexes[k].kind === 'surface' && H.near(R, k, 1).some((n) => hexes[n].kind === 'rock'));
  for (const k of shuffle(rng, nearRock).slice(0, 4 + (opts.type === 'fault' ? 5 : 0))) hexes[k].st.Unstable = 99;
  for (const k of shuffle(rng, shp.land.filter((x) => hexes[x].kind === 'surface' && !hexes[x].st.Unstable)).slice(0, Math.round(shp.land.length * 0.12))) hexes[k].st.Stable = 99;
  for (const k of shp.land) {
    if (hexes[k].res === 'Anomaly' && !hexes[k].hid) {
      const n = pick(rng, H.near(R, k, 1).filter((x) => hexes[x].kind !== 'rock' && hexes[x].kind !== 'orbit'));
      if (n) hexes[n].st.Radiation = 99;
    }
  }

  for (const k of shp.land) if (hexes[k].res) hexes[k].amt = DEPOSIT_UNITS[hexes[k].res] || 1;

  // Landing zone + Charter Beacon.
  const c0 = hexes['0,0'];
  c0.res = null; c0.hid = false; c0.kind = 'surface';
  c0.st = { Stable: 99, Shielded: 99 };
  c0.b = 1;
  for (const k of H.near(R, '0,0', 1)) { if (hexes[k].kind === 'rock') hexes[k].kind = 'surface'; delete hexes[k].st.Unstable; }

  const S = {
    v: 1, R, turns, turn: 1, phase: 0, seed: rng.seed, influence: 0,
    integrity: 10, maxIntegrity: 10, insurance: 0,
    hexes, blds: { 1: { id: 1, c: 'beacon', k: '0,0', clan: 'neutral', acts: 0, age: 0, sun: 0, mem: {}, placed: 0, inf: 0, dis: 0 } },
    nextId: 2, bver: 1, seq: 0,
    clans: opts.clans.slice(),
    pool: {}, draw: { presence: {}, fav: {}, ban: [], research: 0 },
    hand: [], bonusDraw: 0,
    events: [], checkpoints: checkpointsFor(turns, opts.diff || 1),
    stats: { precious: 0, alloy: 0, icewater: 0, biomass: 0, exotic: 0, habitat: 0, launched: 0, placed: 0, acts: 0, repeats: 0, destroyed: 0, excavated: 0, impacts: 0, cooled: 0, triTurns: 0 },
    feed: [], tstat: null, status: 'play', result: null, boss: null,
    name: opts.name || 'Colony', profile, type: opts.type || 'prospect', prestamp: false,
  };
  Object.defineProperty(S, '_q', { value: [], enumerable: false, writable: true, configurable: true });

  // Card pools and Directorate settings.
  const dc = opts.draw || {};
  for (const cl of S.clans) S.pool[cl] = (dc.extra && dc.extra[cl] ? dc.extra[cl] : []).concat(clanCards(cl).map((c) => c.id));
  S.draw.presence = Object.assign({}, dc.presence || {});
  S.draw.fav = Object.assign({}, dc.fav || {});
  S.draw.ban = (dc.ban || []).slice();
  S.draw.research = dc.research || 0;

  // Event schedule (forecast from the start).
  const deck = eventDeck(profile, opts);
  for (let t = 3; t < turns; t += 4) {
    const type = weighted(rng, deck);
    const target = pick(rng, shp.land.filter((k) => d0(k) >= 1 && hexes[k].kind !== 'rock'));
    S.events.push({ turn: t, type, k: type === 'meteor' || type === 'comet' ? target : null, done: false });
  }
  if (opts.extraEvents) {
    for (let t = 5; t < turns; t += 8) S.events.push({ turn: t, type: weighted(rng, deck), k: pick(rng, shp.land.filter((k) => d0(k) >= 1)), done: false });
    S.events.sort((a, b) => a.turn - b.turn);
  }

  // Boss setup.
  if (opts.boss) {
    S.boss = { type: opts.boss, meter: 0, clock: 0, tamed: 0, wave: 0, roars: 0 };
    if (opts.boss === 'nyxea') {
      for (const k of shuffle(rng, shp.land.filter((x) => hexes[x].kind === 'surface' && d0(x) >= 2)).slice(0, 9)) hexes[k].st.Crack = 99;
    }
    if (opts.boss === 'aurelia') {
      for (const k of shuffle(rng, shp.land.filter((x) => hexes[x].kind === 'surface' && d0(x) >= 2)).slice(0, 6)) hexes[k].st.Unstable = 99;
    }
  }

  // Preparations bought on the star chart.
  applyPreps(S, opts.preps || [], rng);
  S.seed = rng.seed;

  resetTurnState(S);
  // Opening hand: each clan's starter producer plus one random draw.
  for (const cl of S.clans) S.hand.push(STARTERS[cl]);
  const extra = drawOne(S, { tier: 'E' });
  if (extra) S.hand.push(extra);
  if (opts.loaner && !S.hand.includes(opts.loaner)) S.hand.push(opts.loaner);
  return S;
}

function placeNear(S, t, rng, maxD = 2) {
  const c = H.near(S.R, '0,0', maxD).filter((k) => isFree(S, k));
  if (!c.length) return null;
  const k = pick(rng, c);
  S.hexes[k].res = t;
  S.hexes[k].hid = false;
  S.hexes[k].amt = DEPOSIT_UNITS[t] || 1;
  return k;
}

export const PREPS = {
  scan: { n: 'Deep Prospect Scan', cost: { DA: 2 }, d: 'Reveal every buried deposit within range 3 of the landing zone.' },
  gold: { n: 'Gold Survey Lease', cost: { CR: 2, DA: 1 }, d: 'A Gold Vein next to the landing zone.' },
  bulkhead: { n: 'Bulkhead Drop', cost: { AL: 3 }, d: '+2 starting Integrity and the landing ring starts Stable.' },
  cryo: { n: 'Cryo Emergency Pod', cost: { CY: 2 }, d: 'Two Ice deposits near the landing zone.' },
  gene: { n: 'Gene Seed Vault', cost: { GE: 2 }, d: 'Bio-Loam and an Organic Seam near the landing zone.' },
  insurance: { n: 'Hazard Insurance', cost: { CR: 2, AL: 2 }, d: 'Negate the first Integrity loss.' },
  charter: { n: 'Consolidated Charter', cost: { CR: 3, AL: 2 }, d: 'The Specialize charter stamp starts complete.' },
};

function applyPreps(S, preps, rng) {
  for (const p of preps) {
    if (p === 'scan') for (const k of H.near(S.R, '0,0', 3)) { if (S.hexes[k].kind !== 'rock') S.hexes[k].hid = false; }
    if (p === 'gold') placeNear(S, 'Gold', rng, 1) || placeNear(S, 'Gold', rng, 2);
    if (p === 'bulkhead') { S.integrity += 2; S.maxIntegrity += 2; for (const k of H.near(S.R, '0,0', 1)) { delete S.hexes[k].st.Unstable; S.hexes[k].st.Stable = 99; } }
    if (p === 'cryo') { placeNear(S, 'Ice', rng); placeNear(S, 'Ice', rng); }
    if (p === 'gene') { placeNear(S, 'Loam', rng); placeNear(S, 'Seam', rng); }
    if (p === 'insurance') S.insurance++;
    if (p === 'charter') S.prestamp = true;
  }
}
