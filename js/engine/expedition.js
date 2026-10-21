// Overworld: star chart, world resources, routes, Directorate, Freeports and
// the Mythic Crown finale. Pure state functions like the colony engine.
import { rnd, rint, pick, shuffle, weighted, hashStr } from './rng.js';
import { CARDS, CLANS, CLAN_IDS, clanCards } from './cards.js';
import { genColony, PREPS, STARTERS } from './mapgen.js';
import { FAMILIES, FAMILY_INFO } from './resources.js';
import { specializeDone, SPECIALIZE } from './colony.js';

export const SECTORS = [
  { n: 'Arkship Meridian' },
  { n: 'Ark Reach' }, { n: 'Shatter Belt' }, { n: 'Vesper Drift' }, { n: 'Veilward Expanse' }, { n: 'The Mythic Crown' },
];
export const sectorOf = (layer) => (layer === 0 ? 0 : layer >= 9 ? 5 : Math.ceil(layer / 2));

export const NODE_TYPES = {
  ark: { n: 'Arkship Meridian', ic: '🚀', d: 'Your indestructible mobile logistics hub. Always connected.' },
  prospect: { n: 'Prospect Colony', ic: '🪐', d: 'A standard colony with ordinary abundance and hazards.' },
  bonanza: { n: 'Bonanza Colony', ic: '💰', d: 'One resource in extreme abundance – bigger shipments, nastier events.' },
  enclave: { n: 'Clan Enclave', ic: '🏛️', d: 'A resident clan replaces one of yours on this map. Secure it to license the clan.' },
  relay: { n: 'Relay Rock', ic: '📶', d: 'A short 15-turn colony. Weaker shipments but long-lasting route yields.' },
  derelict: { n: 'Derelict Station', ic: '🛸', d: 'Wreckage everywhere. Bonus Credits and Alloys.' },
  observatory: { n: 'Research Observatory', ic: '🔭', d: 'Crystal-rich world. Bonus Star Data.' },
  fault: { n: 'Fault World', ic: '🌋', d: 'Tremors and faults. Higher checkpoints, +3 shipment.' },
  shrine: { n: 'Gate Shrine', ic: '🔺', d: 'Secure it to earn a Gate Shard toward the Mythic Crown.' },
  freeport: { n: 'Freeport', ic: '⚓', d: 'No colony. Trade resources, swap clans, connect lanes. Counts as a network hub.' },
  boss: { n: 'Mythic Superplanet', ic: '🌟', d: 'The finale: a huge environmental boss colony.' },
};

export const BOSSES = {
  aurelia: {
    n: 'Aurelia Prime', s: 'The Golden Maw', profile: { gold: 5, metal: 5, ice: 1, bio: 0, exotic: 3 },
    d: 'Every Gold Vein processed raises Fault Stress. At 6 the Mantle Roar destroys buildings that are not Stable or next to an Anchor, costs 2 Integrity and exposes new gold. Objective: work 6 Gold Veins and hold 5 buildings on Stable/Shielded ground.',
  },
  nyxea: {
    n: 'Nyxea', s: 'The Ocean Under Night', profile: { gold: 0, metal: 2, ice: 5, bio: 3, exotic: 2 },
    d: 'Melting Ice raises Tidal Pressure. Every 5 turns (or at 8 pressure) the Fracture Tide destroys unpressurized buildings next to cracks and floods them with Water. Objective: cycle Ice/Water 8 times and keep 3 Ice deposits.',
  },
  viridion: {
    n: 'Viridion Sovereign', s: 'The Sleeping Garden', profile: { gold: 1, metal: 1, ice: 3, bio: 5, exotic: 4 },
    d: 'Every 3 turns Wild Growth spreads over empty ground next to living matter, blocking construction. Growth touched by two buildings (or one Bio/Habitat) is tamed into Biomass for +3. Objective: tame 6 Growth.',
  },
};

export const CHARTERS = {
  gold: { n: 'Mint', pri: 'CR', sec: 'AL' },
  metal: { n: 'Foundry Works', pri: 'AL', sec: 'CR' },
  ice: { n: 'Cryogenic Export Depot', pri: 'CY', sec: 'AL' },
  bio: { n: 'Gene Ark', pri: 'GE', sec: 'CR' },
  exotic: { n: 'Star Observatory', pri: 'DA', sec: 'CY' },
  trade: { n: 'Free Trade Enclave', pri: 'CR', sec: 'DA' },
};
// Families each clan's enclave world favours.
const CLAN_FAMILY = { iron: 'metal', helio: 'exotic', cryo: 'ice', verd: 'bio', syn: 'exotic', wreck: 'metal', kep: 'ice', hearth: 'bio', umbra: 'exotic' };

const NAMES_A = ['Aurum', 'Nacre', 'Morrow', 'Glass', 'Cinder', 'Vesper', 'Halcyon', 'Thule', 'Orrery', 'Kestrel', 'Lumen', 'Basalt', 'Corvid', 'Saffron', 'Tamsin', 'Ember', 'Rime', 'Quill', 'Juniper', 'Oriel', 'Sable', 'Wren', 'Ilex', 'Marrow'];
const NAMES_B = ['Wake', 'Husk', 'Meridian', 'Reach', 'Spindle', 'Hollow', 'Crest', 'Anvil', 'Drift', 'Gate', 'Bloom', 'Shoal', 'Verge', 'Keel', 'Lantern', 'Cradle'];

function randProfile(o, main, mainVal) {
  const p = {};
  for (const f of FAMILIES) p[f] = rint(o, 3);
  if (main) p[main] = mainVal;
  return p;
}

export function newChart(seed, startClans) {
  const o = { seed: hashStr('chart' + seed) };
  const nodes = [];
  const edges = [];
  const usedNames = new Set();
  const name = () => {
    for (let i = 0; i < 20; i++) {
      const n = pick(o, NAMES_A) + (rnd(o) < 0.5 ? ' ' + pick(o, NAMES_B) : '-' + (2 + rint(o, 40)));
      if (!usedNames.has(n)) { usedNames.add(n); return n; }
    }
    return 'Rock-' + nodes.length;
  };
  const enclaveClans = shuffle(o, CLAN_IDS.filter((c) => !startClans.includes(c)));
  nodes.push({ id: 0, layer: 0, idx: 0, x: 0.5, type: 'ark', name: 'Arkship Meridian', state: 'visited', connected: true });
  const layers = [[0]];
  for (let L = 1; L <= 8; L++) {
    const n = L === 1 ? 3 : 3 + (rnd(o) < 0.35 ? 1 : 0);
    const ids = [];
    for (let i = 0; i < n; i++) {
      const id = nodes.length;
      nodes.push({ id, layer: L, idx: i, x: (i + 0.5) / n + (rnd(o) - 0.5) * 0.08, type: 'prospect', name: name(), seed: rint(o, 1e9), state: 'unvisited', connected: false });
      ids.push(id);
    }
    layers.push(ids);
  }
  const bossIds = [];
  Object.keys(BOSSES).forEach((b, i) => {
    const id = nodes.length;
    nodes.push({ id, layer: 9, idx: i, x: (i + 0.5) / 3, type: 'boss', boss: b, name: BOSSES[b].n, seed: rint(o, 1e9), state: 'unvisited', profile: BOSSES[b].profile });
    bossIds.push(id);
  });
  layers.push(bossIds);

  // Forward lanes: each node links to the 1–2 nearest nodes in the next layer.
  for (let L = 0; L < 8; L++) {
    const cur = layers[L], nxt = layers[L + 1];
    const has = new Set();
    for (const a of cur) {
      const sorted = nxt.slice().sort((x, y) => Math.abs(nodes[x].x - nodes[a].x) - Math.abs(nodes[y].x - nodes[a].x));
      const k = L === 0 ? nxt.length : 1 + (rnd(o) < 0.6 ? 1 : 0);
      for (const b of sorted.slice(0, k)) { edges.push({ a, b, len: L >= 4 && rnd(o) < 0.4 ? 2 : 1 }); has.add(b); }
    }
    for (const b of nxt) {
      if (has.has(b)) continue;
      const a = cur.slice().sort((x, y) => Math.abs(nodes[x].x - nodes[b].x) - Math.abs(nodes[y].x - nodes[b].x))[0];
      edges.push({ a, b, len: 1 });
    }
    // Lateral detours.
    if (L >= 1) {
      for (let i = 0; i + 1 < cur.length; i++) if (rnd(o) < 0.45) edges.push({ a: cur[i], b: cur[i + 1], len: 1, lateral: true });
    }
  }
  for (const a of layers[8]) for (const b of bossIds) edges.push({ a, b, len: 3, final: true });
  for (let i = 0; i + 1 < layers[8].length; i++) if (rnd(o) < 0.45) edges.push({ a: layers[8][i], b: layers[8][i + 1], len: 1, lateral: true });

  // Node types.
  for (let L = 1; L <= 8; L++) {
    const sec = sectorOf(L);
    const ids = shuffle(o, layers[L]);
    const special = [];
    if (L % 2 === 0 && sec >= 1) special.push('freeport');
    if (L % 2 === 1 && enclaveClans.length) special.push('enclave');
    if (L >= 3 && (rnd(o) < 0.75 || L >= 7)) special.push('shrine');
    ids.forEach((id, i) => {
      const n = nodes[id];
      n.type = special[i] || weighted(o, [['prospect', 4], ['bonanza', 1.5], ['relay', 1], ['derelict', 1], ['observatory', 1], ['fault', sec >= 2 ? 1.2 : 0.3]]);
      if (n.type === 'enclave') n.clan = enclaveClans.pop();
      const fam = pick(o, FAMILIES);
      if (n.type === 'bonanza') { n.profile = { gold: 0, metal: rint(o, 2), ice: rint(o, 2), bio: rint(o, 2), exotic: rint(o, 2) }; n.profile[fam] = 5; }
      else if (n.type === 'observatory') n.profile = randProfile(o, 'exotic', 4);
      else if (n.type === 'derelict') n.profile = randProfile(o, 'metal', 3);
      else if (n.type === 'fault') { n.profile = randProfile(o, 'metal', 4); n.profile.gold = Math.max(n.profile.gold, 3); }
      else if (n.type === 'enclave') n.profile = randProfile(o, CLAN_FAMILY[n.clan], 4);
      else if (n.type === 'relay') n.profile = randProfile(o, fam, 2);
      else if (n.type !== 'freeport') n.profile = randProfile(o, fam, 3 + rint(o, 2));
    });
  }
  // Guarantee at least 5 shrines on the chart.
  let shrines = nodes.filter((n) => n.type === 'shrine').length;
  for (let L = 8; L >= 3 && shrines < 5; L--) {
    const c = layers[L].map((i) => nodes[i]).find((n) => n.type === 'prospect' || n.type === 'bonanza');
    if (c) { c.type = 'shrine'; shrines++; }
  }
  return { nodes, edges };
}

export function newExpedition(seed, clans) {
  return {
    v: 1, seed, clans: clans.slice(), licensed: clans.slice(),
    dir: { presence: {}, fav: {}, ban: [], research: 0 },
    res: { CR: 6, AL: 4, CY: 5, GE: 1, DA: 2, GS: 0 },
    pressure: 0, maxPressure: 16,
    chart: newChart(seed, clans), at: 0,
    preps: [], prepSlots: 2,
    colony: null, mission: null, pending: null,
    log: [{ t: 0, m: `Treaty signed with ${clans.map((c) => CLANS[c].n).join(', ')}.` }],
    status: 'active', claimed: 0, jumps: 0, totalInfluence: 0,
  };
}

// ---------------------------------------------------------------- helpers
export const node = (E, id) => E.chart.nodes[id];
export function canAfford(E, cost) {
  return Object.entries(cost).every(([r, n]) => (E.res[r] || 0) >= n);
}
export function pay(E, cost) {
  if (!canAfford(E, cost)) return false;
  for (const [r, n] of Object.entries(cost)) E.res[r] -= n;
  return true;
}
export const costText = (cost) => Object.entries(cost).map(([r, n]) => `${n} ${r}`).join(' + ');
function log(E, m) {
  E.log.push({ t: E.jumps, m });
  if (E.log.length > 120) E.log.shift();
}

export function edgesFrom(E, id) {
  return E.chart.edges.filter((e) => e.a === id || e.b === id).map((e) => ({ ...e, to: e.a === id ? e.b : e.a }));
}
// Destinations reachable from the current node: forward or lateral, never back.
export function reachable(E) {
  const cur = node(E, E.at);
  return edgesFrom(E, E.at).filter((e) => {
    const t = node(E, e.to);
    if (t.state !== 'unvisited') return false;
    if (e.lateral) return t.layer === cur.layer;
    return t.layer === cur.layer + 1;
  });
}
export function travelCost(E, e) {
  const n = node(E, e.to);
  let cy = e.final ? 3 : e.lateral ? 2 : e.len;
  const cur = node(E, E.at);
  // A supplied lane at the departure node discounts travel by 1 CY.
  if (cur.connected && cur.type !== 'ark' && !e.final) cy = Math.max(0, cy - 1);
  return { CY: cy, pressure: 1 + (e.lateral ? 1 : 0), tow: E.res.CY < cy, node: n };
}

export function missionPreview(E, n) {
  const sec = sectorOf(n.layer);
  const diff = n.type === 'boss' ? 1.15 + 0.2 * Math.max(0, 3 - E.res.GS) : 1 + 0.08 * (sec - 1) + (n.type === 'fault' ? 0.12 : 0) + (n.type === 'bonanza' ? 0.06 : 0);
  const R = n.type === 'boss' ? 5 : n.type === 'relay' ? 3 : 4;
  const turns = n.type === 'boss' ? 25 : n.type === 'relay' ? 15 : 20;
  return { diff, R, turns, sec };
}

// ---------------------------------------------------------------- travel
export function travel(E, toId, opts = {}) {
  const e = reachable(E).find((x) => x.to === toId);
  if (!e || E.colony) return false;
  const c = travelCost(E, e);
  if (c.tow) {
    E.pressure += 2;
    log(E, `Emergency tow (not enough CY): +2 Frontier Pressure.`);
  } else E.res.CY -= c.CY;
  E.pressure += c.pressure;
  E.jumps++;
  const from = E.at;
  E.at = toId;
  const n = node(E, toId);
  n.parent = from;
  log(E, `Jumped to ${n.name} (−${c.tow ? 0 : c.CY} CY, +${c.pressure} Pressure).`);
  collectRoutes(E);
  if (E.pressure >= E.maxPressure && n.type !== 'boss') {
    E.status = 'lost';
    E.endReason = 'Frontier Pressure reached its limit before the Veil was opened.';
    return true;
  }
  if (n.type === 'freeport') {
    n.state = 'visited';
    n.connected = true;
    log(E, `Docked at Freeport ${n.name}. It now anchors your trade network.`);
    return true;
  }
  startMission(E, n, opts.bench);
  return true;
}

function collectRoutes(E) {
  const got = {};
  for (const n of E.chart.nodes) {
    if (n.state !== 'claimed' || !n.connected || !n.charges) continue;
    E.res[n.yieldRes] += n.yieldN;
    got[n.yieldRes] = (got[n.yieldRes] || 0) + n.yieldN;
    n.charges--;
  }
  const s = Object.entries(got).map(([r, v]) => `+${v} ${r}`).join(', ');
  if (s) log(E, `Trade routes delivered ${s}.`);
  E.lastYield = got;
}

export function startMission(E, n, bench) {
  const pv = missionPreview(E, n);
  let clans = E.clans.slice();
  let guest = null;
  if (n.type === 'enclave' && n.clan && !clans.includes(n.clan)) {
    const b = bench && clans.includes(bench) ? bench : clans[2];
    clans = clans.map((c) => (c === b ? n.clan : c));
    guest = n.clan;
  }
  const S = genColony({
    seed: n.seed, R: pv.R, turns: pv.turns, profile: n.profile, clans, diff: pv.diff,
    type: n.type, name: n.name, preps: E.preps.slice(), boss: n.boss || null,
    draw: E.dir, loaner: guest ? STARTERS[guest] : null, extraEvents: pv.sec >= 3 || n.type === 'boss',
  });
  E.mission = { node: n.id, guest, preps: E.preps.slice() };
  E.preps = [];
  E.colony = S;
}

// ---------------------------------------------------------------- mission end
export function charterOptions(E) {
  const S = E.colony;
  const n = node(E, E.mission.node);
  const fams = FAMILIES.slice().sort((a, b) => n.profile[b] - n.profile[a]).slice(0, 2);
  fams.push('trade');
  const avg = Math.round(FAMILIES.reduce((s, f) => s + n.profile[f], 0) / FAMILIES.length);
  return fams.map((f) => {
    const ch = CHARTERS[f];
    const ab = f === 'trade' ? Math.min(5, avg + 1) : n.profile[f];
    const spec = specializeDone(S, f);
    const integ = S.result.integrate;
    const mw = S.result.masterwork;
    let claim = Math.min(11, 2 + ab + (spec ? 2 : 0) + (integ ? 2 : 0));
    let sec = 1 + (mw ? 1 : 0) + (integ ? 1 : 0);
    if (n.type === 'fault') claim += 3;
    if (n.type === 'relay') claim = Math.max(2, claim - 2);
    return {
      fam: f, n: ch.n, pri: ch.pri, sec: ch.sec, claim, secN: sec, spec, integ, mw,
      specText: SPECIALIZE[f].text,
      yieldN: Math.min(3, 1 + Math.floor(ab / 2)) + (n.type === 'relay' ? 1 : 0),
      charges: 4 + (mw ? 1 : 0) + (n.type === 'relay' ? 2 : 0),
    };
  });
}

export function laneCost(E, n) {
  const sec = sectorOf(n.layer);
  return sec <= 2 ? { AL: 2, CR: 1 } : { AL: 3, CR: 1, CY: 1 };
}
export function canConnect(E, n) {
  if (n.state !== 'claimed' || n.connected || n.parent == null) return false;
  return !!node(E, n.parent).connected;
}
export function connect(E, id) {
  const n = node(E, id);
  if (!canConnect(E, n) || !pay(E, laneCost(E, n))) return false;
  n.connected = true;
  log(E, `Built a lane ${node(E, n.parent).name} → ${n.name}. Its exports now flow every jump.`);
  // Downstream claimed colonies whose parent is now connected stay as they are until paid for.
  return true;
}

// Called once the colony state reports won/failed.
export function resolveMission(E, charterFam) {
  const S = E.colony;
  const n = node(E, E.mission.node);
  E.totalInfluence += S.influence;
  const out = { gained: {}, licensed: null, shard: false };
  if (n.type === 'boss') {
    n.state = S.status === 'won' ? 'claimed' : 'stranded';
    E.status = S.status === 'won' ? 'won' : 'lost';
    E.endReason = S.status === 'won' ? `${n.name} is claimed. The expedition succeeds!` : `${n.name} broke the colony. The expedition ends at the Veil.`;
    if (S.status === 'won') {
      const all3 = S.stats.triTurns >= 5;
      E.ending = S.result.masterwork && all3 ? 'Transcendent Civilization' : S.result.masterwork ? 'Resonant Capital' : 'Survival Claim';
    }
    E.colony = null;
    E.mission = null;
    return out;
  }
  if (S.status === 'won') {
    const opts = charterOptions(E);
    const ch = opts.find((c) => c.fam === charterFam) || opts[0];
    n.state = 'claimed';
    n.charter = ch.n;
    n.yieldRes = ch.pri;
    n.yieldN = ch.yieldN;
    n.charges = ch.charges;
    E.res[ch.pri] += ch.claim;
    E.res[ch.sec] += ch.secN;
    out.gained[ch.pri] = ch.claim;
    out.gained[ch.sec] = (out.gained[ch.sec] || 0) + ch.secN;
    if (n.type === 'derelict') { E.res.CR += 2; E.res.AL += 1; out.gained.CR = (out.gained.CR || 0) + 2; out.gained.AL = (out.gained.AL || 0) + 1; }
    if (n.type === 'observatory') { E.res.DA += 2; out.gained.DA = (out.gained.DA || 0) + 2; }
    if (n.type === 'shrine') { E.res.GS += 1; out.shard = true; }
    if (E.mission.guest && !E.licensed.includes(E.mission.guest)) { E.licensed.push(E.mission.guest); out.licensed = E.mission.guest; }
    E.claimed++;
    log(E, `${n.name} claimed as a ${ch.n}: ${Object.entries(out.gained).map(([r, v]) => `+${v} ${r}`).join(', ')}${out.shard ? ', +1 Gate Shard' : ''}.`);
  } else {
    n.state = 'stranded';
    E.pressure += 1;
    E.res.CR += 1;
    out.gained.CR = 1;
    log(E, `${n.name} failed and is now a Stranded Site (+1 Pressure, salvage +1 CR).`);
  }
  E.colony = null;
  E.mission = null;
  return out;
}

export function abandonMission(E) {
  if (!E.colony) return;
  E.colony.status = 'failed';
  E.colony.result = { success: false, reason: 'Colony abandoned.' };
}

// ---------------------------------------------------------------- Directorate
export const DIR_COST = {
  presence: [{ CR: 3, DA: 2 }, { CR: 6, DA: 4 }],
  fav: [{ CR: 2, DA: 2 }, { CR: 5, DA: 4 }],
  ban: { CR: 3, DA: 2 },
  restore: { CR: 1 },
  research: [{ DA: 3, AL: 2 }, { DA: 5, AL: 3 }],
  swap: { CR: 2, DA: 1 },
};
export function presenceUp(E, cl) {
  const lv = E.dir.presence[cl] || 1;
  if (lv >= 3 || !pay(E, DIR_COST.presence[lv - 1])) return false;
  E.dir.presence[cl] = lv + 1;
  log(E, `${CLANS[cl].n} presence raised to ${lv + 1}.`);
  return true;
}
export function favorUp(E, cid) {
  const lv = E.dir.fav[cid] || 1;
  if (lv >= 3 || !pay(E, DIR_COST.fav[lv - 1])) return false;
  E.dir.fav[cid] = lv + 1;
  log(E, `Favored ${CARDS[cid].n} (weight ${lv + 1}).`);
  return true;
}
export function canBan(E, cid) {
  const c = CARDS[cid];
  if (E.dir.ban.includes(cid) || Object.values(STARTERS).includes(cid)) return false;
  if (E.dir.ban.length >= 4) return false;
  if (E.dir.ban.filter((x) => CARDS[x].cl === c.cl).length >= 2) return false;
  return true;
}
export function ban(E, cid) {
  if (!canBan(E, cid) || !pay(E, DIR_COST.ban)) return false;
  E.dir.ban.push(cid);
  delete E.dir.fav[cid];
  log(E, `Blacklisted ${CARDS[cid].n}.`);
  return true;
}
export function restore(E, cid) {
  if (!E.dir.ban.includes(cid) || !pay(E, DIR_COST.restore)) return false;
  E.dir.ban = E.dir.ban.filter((x) => x !== cid);
  return true;
}
export function research(E) {
  const lv = E.dir.research || 0;
  if (lv >= 2 || !pay(E, DIR_COST.research[lv])) return false;
  E.dir.research = lv + 1;
  log(E, `Research: Mid and Advanced buildings unlock ${2 * (lv + 1)} turns earlier.`);
  return true;
}
export function canSwapHere(E) {
  const n = node(E, E.at);
  return !E.colony && (n.type === 'freeport' || n.type === 'ark');
}
export function swapClan(E, out, inn) {
  if (!canSwapHere(E) || !E.clans.includes(out) || E.clans.includes(inn) || !E.licensed.includes(inn)) return false;
  if (!pay(E, DIR_COST.swap)) return false;
  E.clans = E.clans.map((c) => (c === out ? inn : c));
  log(E, `Treaty amended: ${CLANS[inn].n} replaces ${CLANS[out].n}.`);
  return true;
}

// ---------------------------------------------------------------- Freeport exchange
export const EXCHANGE = [
  { id: 'sellAL', d: 'Sell 2 AL → 3 CR', give: { AL: 2 }, get: { CR: 3 } },
  { id: 'sellCY', d: 'Sell 2 CY → 3 CR', give: { CY: 2 }, get: { CR: 3 } },
  { id: 'sellGE', d: 'Sell 2 GE → 3 CR', give: { GE: 2 }, get: { CR: 3 } },
  { id: 'buyAL', d: 'Buy 1 AL for 3 CR', give: { CR: 3 }, get: { AL: 1 } },
  { id: 'buyCY', d: 'Buy 1 CY for 3 CR', give: { CR: 3 }, get: { CY: 1 } },
  { id: 'buyGE', d: 'Buy 1 GE for 4 CR', give: { CR: 4 }, get: { GE: 1 } },
  { id: 'buyDA', d: 'Buy 1 DA for 5 CR', give: { CR: 5 }, get: { DA: 1 } },
  { id: 'dataAL', d: 'Trade 2 DA → 1 AL', give: { DA: 2 }, get: { AL: 1 } },
];
export function exchange(E, id) {
  const x = EXCHANGE.find((e) => e.id === id);
  const n = node(E, E.at);
  if (!x || (n.type !== 'freeport' && n.type !== 'ark') || E.colony) return false;
  if (!pay(E, x.give)) return false;
  for (const [r, v] of Object.entries(x.get)) E.res[r] += v;
  return true;
}

// ---------------------------------------------------------------- preparations
export function buyPrep(E, id) {
  if (E.colony || E.preps.includes(id) || E.preps.length >= E.prepSlots) return false;
  if (!pay(E, PREPS[id].cost)) return false;
  E.preps.push(id);
  return true;
}
export function refundPrep(E, id) {
  const i = E.preps.indexOf(id);
  if (i < 0) return false;
  E.preps.splice(i, 1);
  for (const [r, v] of Object.entries(PREPS[id].cost)) E.res[r] += v;
  return true;
}

export { FAMILY_INFO, PREPS };
