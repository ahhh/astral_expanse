// Overworld: star chart, world resources, the lane network, Directorate,
// Foundry, Fleet Yard, contracts, Freeports, the Veil and the Mythic Crown
// finale. Pure state functions like the colony engine.
import { rnd, rint, pick, shuffle, weighted, hashStr } from './rng.js';
import { CARDS, CLANS, CLAN_IDS, FOUNDRY_LIST } from './cards.js';
import { genColony, PREPS, STARTERS, ENHANCE, SUPPLY } from './mapgen.js';
import { FAMILIES, FAMILY_INFO } from './resources.js';
import { specializeDone, SPECIALIZE } from './colony.js';

export const MAX_CLANS = 3;

export const SECTORS = [
  { n: 'Arkship Meridian' },
  { n: 'Ark Reach' }, { n: 'Shatter Belt' }, { n: 'Vesper Drift' }, { n: 'Veilward Expanse' }, { n: 'The Mythic Crown' },
  { n: 'The Endless Frontier' },
];
// Layers 1–8 are the four regular sectors, 9 is the Crown. Endless Frontier
// rounds add four more layers and another Crown layer each (14, 19, …).
export const sectorOf = (layer) => (layer === 0 ? 0 : layer <= 8 ? Math.ceil(layer / 2) : (layer - 9) % 5 === 0 ? 5 : 6);

// ---------------------------------------------------------------- difficulty
export const DIFFICULTY = {
  explorer: { n: 'Explorer', ic: '🌱', d: 'Gentler checkpoints, a richer purse, a longer Frontier clock, fewer route crises and unlimited undo.', mult: 0.85, purse: 3, pressure: 20, crisis: 0.5, undo: 99 },
  standard: { n: 'Standard', ic: '🚀', d: 'The intended balance. One undo per turn.', mult: 1, purse: 0, pressure: 16, crisis: 1, undo: 1 },
  veteran: { n: 'Veteran', ic: '🔥', d: 'Checkpoints +12%, a leaner purse, a shorter clock, more frequent route crises. No undo.', mult: 1.12, purse: -1, pressure: 15, crisis: 1.4, undo: 0 },
  nightmare: { n: 'Nightmare', ic: '💀', d: 'Checkpoints +25%, extra local events on every map, harsh crises and a 14-jump clock. No undo.', mult: 1.25, purse: -2, pressure: 14, crisis: 1.8, undo: 0, events: true },
};
export const MODIFIERS = {
  volatile: { n: 'Volatile Space', ic: '☄️', d: 'Every colony gets the extra deep-space event schedule.' },
  scarcity: { n: 'Scarce Markets', ic: '📉', d: 'Claim shipments are 1 smaller and Freeport prices are worse.' },
  tight: { n: 'Closing Veil', ic: '⏳', d: '−2 maximum Frontier Pressure.' },
  ironman: { n: 'Ironman', ic: '🪨', d: 'No undo, whatever the difficulty.' },
  lone: { n: 'Lone Clan', ic: '🧭', d: 'Only one other clan may ever join your treaty (max 2 active).' },
};
export const hasMod = (E, m) => !!(E.mods && E.mods.includes(m));
export const diffOf = (E) => DIFFICULTY[E.difficulty] || DIFFICULTY.standard;
export const maxClans = (E) => (hasMod(E, 'lone') ? 2 : MAX_CLANS);
export const undoAllowance = (E) => (hasMod(E, 'ironman') ? 0 : diffOf(E).undo);

export const NODE_TYPES = {
  ark: { n: 'Arkship Meridian', ic: '🚀', d: 'Your indestructible mobile logistics hub. Always supplied.' },
  prospect: { n: 'Prospect Colony', ic: '🪐', d: 'A standard colony with ordinary abundance and hazards.' },
  bonanza: { n: 'Bonanza Colony', ic: '💰', d: 'One resource in extreme abundance – bigger shipments, nastier events.' },
  enclave: { n: 'Clan Enclave', ic: '🏛️', d: 'A resident clan joins you on this map. Secure it and the clan joins your treaty (or is licensed if all slots are full).' },
  relay: { n: 'Relay Rock', ic: '📶', d: 'A short 15-turn colony. Weaker shipments, long-lasting route yields and +2 capacity on its lanes.' },
  derelict: { n: 'Derelict Station', ic: '🛸', d: 'Wreckage everywhere. Bonus Credits and Alloys, and a Foundry discount.' },
  observatory: { n: 'Research Observatory', ic: '🔭', d: 'Crystal-rich world. Bonus Star Data and +2 survey range.' },
  fault: { n: 'Fault World', ic: '🌋', d: 'Tremors and faults. Higher checkpoints, +3 shipment.' },
  shrine: { n: 'Gate Shrine', ic: '🔺', d: 'Secure it to earn a Gate Shard toward the Mythic Crown.' },
  freeport: { n: 'Freeport', ic: '⚓', d: 'No colony. Trade resources, swap clans, refresh the Foundry. A supplied network hub.' },
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

// Adds `count` ordinary layers after `prev` (ids of the previous layer), then
// a Crown layer of superplanets. Returns nothing; mutates the chart.
function growChart(o, chart, prev, first, count, enclaveClans, bossList) {
  const { nodes, edges } = chart;
  const used = new Set(nodes.map((n) => n.name));
  const name = () => {
    for (let i = 0; i < 20; i++) {
      const n = pick(o, NAMES_A) + (rnd(o) < 0.5 ? ' ' + pick(o, NAMES_B) : '-' + (2 + rint(o, 40)));
      if (!used.has(n)) { used.add(n); return n; }
    }
    return 'Rock-' + nodes.length;
  };
  const layers = [prev];
  for (let L = first; L < first + count; L++) {
    // The layer before the Crown has one node per boss, each its sole approach.
    const n = L === first + count - 1 ? bossList.length : L === 1 ? 3 : 3 + (rnd(o) < 0.35 ? 1 : 0);
    const ids = [];
    for (let i = 0; i < n; i++) {
      const id = nodes.length;
      nodes.push({ id, layer: L, idx: i, x: (i + 0.5) / n + (rnd(o) - 0.5) * 0.08, type: 'prospect', name: name(), seed: rint(o, 1e9), state: 'unvisited', connected: false });
      ids.push(id);
    }
    layers.push(ids);
  }
  const bossL = first + count;
  const bossIds = [];
  bossList.forEach((b, i) => {
    const id = nodes.length;
    nodes.push({ id, layer: bossL, idx: i, x: (i + 0.5) / bossList.length, type: 'boss', boss: b, name: BOSSES[b].n + (bossL > 9 ? ' ' + 'II III IV V VI'.split(' ')[Math.min(4, (bossL - 14) / 5)] : ''), seed: rint(o, 1e9), state: 'unvisited', profile: BOSSES[b].profile });
    bossIds.push(id);
  });

  // Forward lanes: each node links to the 1–2 nearest nodes in the next layer.
  for (let i = 0; i < layers.length - 1; i++) {
    const cur = layers[i], nxt = layers[i + 1];
    const L = first - 1 + i;
    const has = new Set();
    for (const a of cur) {
      const sorted = nxt.slice().sort((x, y) => Math.abs(nodes[x].x - nodes[a].x) - Math.abs(nodes[y].x - nodes[a].x));
      const k = i === 0 ? nxt.length : 1 + (rnd(o) < 0.6 ? 1 : 0);
      for (const b of sorted.slice(0, k)) { edges.push({ a, b, len: L >= 4 && rnd(o) < 0.4 ? 2 : 1 }); has.add(b); }
    }
    for (const b of nxt) {
      if (has.has(b)) continue;
      const a = cur.slice().sort((x, y) => Math.abs(nodes[x].x - nodes[b].x) - Math.abs(nodes[y].x - nodes[b].x))[0];
      edges.push({ a, b, len: 1 });
    }
    if (i >= 1) for (let j = 0; j + 1 < cur.length; j++) if (rnd(o) < 0.45) edges.push({ a: cur[j], b: cur[j + 1], len: 1, lateral: true });
  }
  const last = layers[layers.length - 1];
  last.forEach((a, i) => edges.push({ a, b: bossIds[i], len: 3, final: true }));
  for (let i = 0; i + 1 < last.length; i++) if (rnd(o) < 0.45) edges.push({ a: last[i], b: last[i + 1], len: 1, lateral: true });

  // Node types. Enclaves come early and often so a lone clan can grow its treaty.
  for (let i = 1; i < layers.length; i++) {
    const L = first - 1 + i;
    const rel = L > 9 ? ((L - 9) % 5) * 2 : L; // endless layers behave like late sectors
    const sec = Math.min(4, Math.ceil(rel / 2));
    const ids = shuffle(o, layers[i]);
    const special = [];
    if (rel % 2 === 0 && sec >= 1) special.push('freeport');
    if ((rel % 2 === 1 || rel === 2) && enclaveClans.length) special.push('enclave');
    if (rel >= 3 && (rnd(o) < 0.75 || rel >= 7)) special.push('shrine');
    ids.forEach((id, j) => {
      const n = nodes[id];
      n.type = special[j] || weighted(o, [['prospect', 4], ['bonanza', 1.5], ['relay', 1], ['derelict', 1], ['observatory', 1], ['fault', sec >= 2 ? 1.2 : 0.3]]);
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
  // Guarantee at least 5 shrines among the new layers.
  let shrines = layers.slice(1).flat().filter((id) => nodes[id].type === 'shrine').length;
  for (let i = layers.length - 1; i >= 3 && shrines < 5; i--) {
    const c = layers[i].map((id) => nodes[id]).find((n) => n.type === 'prospect' || n.type === 'bonanza');
    if (c) { c.type = 'shrine'; shrines++; }
  }
}

export function newChart(seed, startClans) {
  const o = { seed: hashStr('chart' + seed) };
  const chart = { nodes: [], edges: [] };
  const enclaveClans = shuffle(o, CLAN_IDS.filter((c) => !startClans.includes(c)));
  chart.nodes.push({ id: 0, layer: 0, idx: 0, x: 0.5, type: 'ark', name: 'Arkship Meridian', state: 'visited', connected: true, surveyed: true });
  growChart(o, chart, [0], 1, 8, enclaveClans, Object.keys(BOSSES));
  chart.seed = o.seed;
  chart.enclavePool = enclaveClans;
  return chart;
}

export function newExpedition(seed, clans, opts = {}) {
  const difficulty = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'standard';
  const mods = (opts.mods || []).filter((m) => MODIFIERS[m]);
  const D = DIFFICULTY[difficulty];
  const purse = { CR: 6, AL: 4, CY: 5, GE: 1, DA: 2 };
  for (const r in purse) purse[r] = Math.max(0, purse[r] + D.purse);
  const E = {
    v: 2, seed, clans: clans.slice(), licensed: clans.slice(), contacts: [],
    difficulty, mods,
    dir: { presence: {}, fav: {}, ban: [], research: 0, extra: {} },
    enh: {},
    res: Object.assign(purse, { GS: 0 }),
    pressure: 0, maxPressure: D.pressure - (mods.includes('tight') ? 2 : 0),
    chart: newChart(seed, clans), at: 0,
    lanes: [], nextLane: 1, policy: 'balanced', crises: [], compacts: [], pendingCompact: null,
    contract: null, contractOffers: [], contractsDone: [],
    fleet: {}, freeHops: 0, capBonus: 0, survey: 2,
    foundry: { offers: [], sector: 0 }, freeBlueprint: 0,
    preps: [], prepSlots: 2,
    colony: null, mission: null, pending: null,
    log: [{ t: 0, m: `Treaty signed with ${clans.map((c) => CLANS[c].n).join(', ')}. Find Clan Enclaves to grow your treaty (up to ${mods.includes('lone') ? 2 : MAX_CLANS} active clans).` }],
    status: 'active', claimed: 0, jumps: 0, totalInfluence: 0, peakThroughput: 0, lastThroughput: 0,
  };
  refreshFoundry(E, true);
  offerContracts(E);
  recompute(E);
  return E;
}

// Older saves (v1) tracked connections as node.parent + node.connected.
export function migrate(E) {
  if (!E || E.v >= 2) return E;
  E.v = 2;
  E.lanes = [];
  E.nextLane = 1;
  for (const n of E.chart.nodes) {
    if (n.connected && n.parent != null && n.type !== 'freeport' && n.type !== 'ark') E.lanes.push(mkLane(E, n.parent, n.id));
  }
  Object.assign(E, { contacts: [], difficulty: 'standard', mods: [], enh: {}, policy: 'balanced', crises: [], compacts: [], pendingCompact: null, contract: null, contractOffers: [], contractsDone: [], fleet: {}, freeHops: 0, capBonus: 0, survey: 2, foundry: { offers: [], sector: 0 }, freeBlueprint: 0, peakThroughput: 0, lastThroughput: 0 });
  E.dir.extra = E.dir.extra || {};
  refreshFoundry(E, true);
  recompute(E);
  return E;
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
function gain(E, got, out) {
  for (const [r, n] of Object.entries(got)) {
    E.res[r] = (E.res[r] || 0) + n;
    if (out) out[r] = (out[r] || 0) + n;
  }
}
export const costText = (cost) => Object.entries(cost).map(([r, n]) => `${n} ${r}`).join(' + ');
const gainText = (got) => Object.entries(got).map(([r, v]) => `+${v} ${r}`).join(', ');
function log(E, m) {
  E.log.push({ t: E.jumps, m });
  if (E.log.length > 150) E.log.shift();
}
const here = (E) => node(E, E.at);
export const atHub = (E) => !E.colony && (here(E).type === 'freeport' || here(E).type === 'ark');

export function edgesFrom(E, id) {
  return E.chart.edges.filter((e) => e.a === id || e.b === id).map((e) => ({ ...e, to: e.a === id ? e.b : e.a }));
}
// Destinations reachable from the current node: forward or lateral, never back.
export function reachable(E) {
  const cur = here(E);
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
  const notes = [];
  // A supplied lane at the departure node discounts travel by 1 CY.
  if (here(E).connected && here(E).type !== 'ark' && !e.final && cy > 0) { cy--; notes.push('supplied lane −1'); }
  if (cy >= 2 && compactActive(E, 'cryo')) { cy--; notes.push('Cryo Logistics −1'); }
  if (cy >= 2 && E.fleet.coldchain && E.ccSector !== sectorOf(here(E).layer)) { cy--; notes.push('Cold-Chain Engine −1'); }
  if (cy >= 2 && E.freeHops > 0) { cy = 0; notes.push('Cryogenic Corridor: free'); }
  return { CY: cy, pressure: 1 + (e.lateral ? 1 : 0), tow: E.res.CY < cy, node: n, notes, base: e.final ? 3 : e.lateral ? 2 : e.len };
}

export function missionPreview(E, n) {
  const sec = sectorOf(n.layer);
  const D = diffOf(E);
  const rounds = n.layer > 9 ? Math.ceil((n.layer - 9) / 5) : 0;
  let diff;
  if (n.type === 'boss') {
    const v = veilStatus(E);
    diff = 1.15 + 0.2 * Math.max(0, 3 - E.res.GS) + (v.throughputOk ? 0 : 0.1) + 0.1 * rounds;
  } else {
    diff = 1 + 0.08 * (Math.min(4, sec) - 1) + (n.type === 'fault' ? 0.12 : 0) + (n.type === 'bonanza' ? 0.06 : 0) + 0.12 * rounds;
  }
  diff *= D.mult;
  const R = n.type === 'boss' ? 5 : n.type === 'relay' ? 3 : 4;
  const turns = n.type === 'boss' ? 25 : n.type === 'relay' ? 15 : 20;
  return { diff, R, turns, sec };
}

// Survey: nodes beyond the survey horizon hide their identity and profile.
export const surveyRange = (E) => (E.survey || 2) + (E.fleet.mast ? 2 : 0);
export const isSurveyed = (E, n) => n.type === 'boss' || n.surveyed || n.state !== 'unvisited';

// ---------------------------------------------------------------- lanes
export const LANE_CLASS = {
  1: { n: 'Short Relay', cost: { AL: 2, CR: 1 }, cap: 3 },
  2: { n: 'Midrange Convoy', cost: { AL: 4, CR: 2 }, cap: 5 },
  3: { n: 'Deep-Space Thread', cost: { AL: 6, DA: 2, CY: 2 }, cap: 6 },
};
export const LANE_UPGRADES = {
  armor: { n: 'Armor', ic: '🛡️', cost: { AL: 2 }, d: 'Deflects Micrometeor Swarms.' },
  cold: { n: 'Cold Chain', ic: '🧊', cost: { CY: 2 }, d: 'Deflects Biological Quarantine and Gravity Shear.' },
  signal: { n: 'Signal Beacons', ic: '📡', cost: { DA: 2 }, d: 'Deflects Ion Blackouts.' },
  diplo: { n: 'Diplomatic Clearance', ic: '🤝', cost: { CR: 2 }, d: 'Deflects Customs Disputes.' },
};
export const isHub = (n) => n.type === 'ark' || (n.type === 'freeport' && n.state === 'visited');
export const isNetNode = (n) => isHub(n) || (n.state === 'claimed' && n.type !== 'boss');
function laneDist(E, a, b) {
  const A = node(E, a), B = node(E, b);
  const ed = E.chart.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  if (ed) return ed.final ? 3 : ed.len;
  const d = Math.max(1, Math.abs(A.layer - B.layer)) + (Math.abs(A.x - B.x) > 0.35 ? 1 : 0);
  return d <= 3 ? d : null;
}
function mkLane(E, a, b) {
  const d = laneDist(E, a, b) || 1;
  return { id: E.nextLane++, a, b, cls: d, dmg: 0, off: -1, up: {} };
}
export const laneBetween = (E, a, b) => E.lanes.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
export function laneCap(E, l) {
  let c = LANE_CLASS[l.cls].cap + (E.capBonus || 0);
  const ends = [node(E, l.a), node(E, l.b)];
  if (ends.some((n) => n.type === 'relay')) c += 2;
  if (E.fleet.keel && ends.some(isHub)) c += 2;
  return Math.max(0, c - (l.dmg || 0));
}
// A lane is closed through jump number `off` (inclusive).
export const laneOff = (E, l) => l.off >= E.jumps;
// Lanes the player could build from node `id` to other network nodes.
export function laneOptions(E, id) {
  const n = node(E, id);
  if (!isNetNode(n)) return [];
  const out = [];
  for (const m of E.chart.nodes) {
    if (m.id === id || !isNetNode(m) || laneBetween(E, id, m.id)) continue;
    const d = laneDist(E, id, m.id);
    if (d) out.push({ to: m.id, cls: d, ...LANE_CLASS[d] });
  }
  return out.sort((x, y) => x.cls - y.cls);
}
export function buildLane(E, a, b) {
  const opt = laneOptions(E, a).find((o) => o.to === b);
  if (!opt || !pay(E, opt.cost)) return false;
  E.lanes.push(mkLane(E, a, b));
  log(E, `Built a ${opt.n} ${node(E, a).name} ⇄ ${node(E, b).name} (capacity ${opt.cap}).`);
  recompute(E);
  return true;
}
export function upgradeLane(E, lid, up) {
  const l = E.lanes.find((x) => x.id === lid);
  if (!l || l.up[up] || !pay(E, LANE_UPGRADES[up].cost)) return false;
  l.up[up] = true;
  log(E, `${LANE_UPGRADES[up].n} fitted to ${laneName(E, l)}.`);
  return true;
}
export const laneName = (E, l) => `${node(E, l.a).name} ⇄ ${node(E, l.b).name}`;
// Compatibility with the single-lane "connect" flow: cheapest lane to any network node.
export function cheapestLane(E, id) {
  return laneOptions(E, id).filter((o) => node(E, o.to).connected)[0] || null;
}
export const canConnect = (E, n) => isNetNode(n) && !n.connected && !!cheapestLane(E, n.id);
export function laneCost(E, n) {
  const o = cheapestLane(E, n.id);
  return o ? o.cost : LANE_CLASS[1].cost;
}
export function connect(E, id) {
  const o = cheapestLane(E, id);
  return !!o && buildLane(E, id, o.to);
}

// Supplied = reachable from a hub over lanes that are not blacked out.
export function recompute(E) {
  const nodes = E.chart.nodes;
  const adj = new Map();
  for (const l of E.lanes) {
    if (laneOff(E, l)) continue;
    (adj.get(l.a) || adj.set(l.a, []).get(l.a)).push(l.b);
    (adj.get(l.b) || adj.set(l.b, []).get(l.b)).push(l.a);
  }
  const q = nodes.filter(isHub).map((n) => n.id);
  const seen = new Set(q);
  for (let i = 0; i < q.length; i++) for (const m of adj.get(q[i]) || []) if (!seen.has(m)) { seen.add(m); q.push(m); }
  for (const n of nodes) n.connected = seen.has(n.id) && isNetNode(n);
  // Survey horizon.
  const lim = here(E).layer + surveyRange(E);
  for (const n of nodes) if (n.layer <= lim) n.surveyed = true;
  checkRings(E);
  checkContract(E);
}

// Effective per-jump yield of a colony before lane capacity.
function yieldOf(E, n) {
  if (n.state !== 'claimed' || !n.charges || !n.yieldN) return 0;
  let y = n.yieldN;
  if (n.yieldRes === 'CR' && E.customs >= E.jumps) y = Math.max(0, y - 1);
  if (n.yieldRes === 'GE' && E.quarantine >= E.jumps) y = 0;
  return y;
}
// Max-flow from producing colonies to hubs through lane capacities.
// Priority policies route the chosen resource first.
export function routeFlow(E) {
  const nodes = E.chart.nodes;
  const SRC = 'S', SNK = 'T';
  const cap = new Map();
  const nb = new Map();
  const key = (u, v) => u + '>' + v;
  const addE = (u, v, c) => {
    cap.set(key(u, v), (cap.get(key(u, v)) || 0) + c);
    if (!cap.has(key(v, u))) cap.set(key(v, u), 0);
    (nb.get(u) || nb.set(u, new Set()).get(u)).add(v);
    (nb.get(v) || nb.set(v, new Set()).get(v)).add(u);
  };
  for (const l of E.lanes) {
    if (laneOff(E, l)) continue;
    const c = laneCap(E, l);
    addE(l.a, l.b, c);
    addE(l.b, l.a, c);
  }
  for (const n of nodes) if (isHub(n)) addE(n.id, SNK, 999);
  const producers = nodes.filter((n) => n.connected && yieldOf(E, n) > 0);
  const pri = E.policy && E.policy !== 'balanced' ? E.policy : null;
  const phases = pri ? [producers.filter((n) => n.yieldRes === pri), producers.filter((n) => n.yieldRes !== pri)] : [producers];
  const augment = () => {
    const prev = new Map([[SRC, null]]);
    const q = [SRC];
    for (let i = 0; i < q.length && !prev.has(SNK); i++) {
      for (const v of nb.get(q[i]) || []) if (!prev.has(v) && cap.get(key(q[i], v)) > 0) { prev.set(v, q[i]); q.push(v); }
    }
    if (!prev.has(SNK)) return 0;
    let f = Infinity;
    for (let v = SNK; prev.get(v) != null; v = prev.get(v)) f = Math.min(f, cap.get(key(prev.get(v), v)));
    for (let v = SNK; prev.get(v) != null; v = prev.get(v)) { const u = prev.get(v); cap.set(key(u, v), cap.get(key(u, v)) - f); cap.set(key(v, u), cap.get(key(v, u)) + f); }
    return f;
  };
  const want = {};
  for (const ph of phases) {
    for (const n of ph) { want[n.id] = yieldOf(E, n); addE(SRC, n.id, want[n.id]); }
    for (let g = 0; g < 200 && augment(); g++);
  }
  const deliver = {};
  let total = 0;
  for (const n of producers) {
    const left = cap.get(key(SRC, n.id)) || 0;
    deliver[n.id] = want[n.id] - left;
    total += deliver[n.id];
  }
  const use = {};
  for (const l of E.lanes) {
    if (laneOff(E, l)) { use[l.id] = 0; continue; }
    const c = laneCap(E, l);
    // Residual a→b = c − f(a→b) + f(b→a); net flow magnitude per direction.
    const ab = c - cap.get(key(l.a, l.b));
    const ba = c - cap.get(key(l.b, l.a));
    use[l.id] = Math.abs(ab - ba) / 2;
  }
  return { deliver, use, total, want };
}

function collectRoutes(E) {
  const got = {};
  const fl = routeFlow(E);
  for (const [id, v] of Object.entries(fl.deliver)) {
    const n = node(E, +id);
    if (v > 0) { gain(E, { [n.yieldRes]: v }, got); n.charges--; }
  }
  if (compactActive(E, 'industrial')) gain(E, { AL: 1 }, got);
  E.lastThroughput = fl.total;
  E.peakThroughput = Math.max(E.peakThroughput || 0, fl.total);
  const lost = Object.values(fl.want).reduce((s, v) => s + v, 0) - fl.total;
  if (Object.keys(got).length) log(E, `Trade routes delivered ${gainText(got)}${lost > 0 ? ` (${lost} lost to lane capacity)` : ''}.`);
  E.lastYield = got;
}

// ---------------------------------------------------------------- route crises
export const CRISES = {
  swarm: { n: 'Micrometeor Swarm', ic: '☄️', counter: 'armor', fix: { AL: 2 }, d: 'The lane loses 2 capacity until repaired.' },
  blackout: { n: 'Ion Blackout', ic: '⚡', counter: 'signal', fix: { DA: 2 }, d: 'The lane carries nothing on the next jump.' },
  customs: { n: 'Customs Dispute', ic: '📜', counter: 'diplo', fix: { CR: 2 }, d: 'Every CR-yielding colony ships 1 less for two jumps.' },
  quarantine: { n: 'Biological Quarantine', ic: '☣️', counter: 'cold', fix: { CY: 2 }, d: 'Gene Archive shipments pause for two jumps.' },
  shear: { n: 'Gravity Shear', ic: '🌀', counter: 'cold', fix: { CY: 1 }, d: 'The lane is closed for two jumps unless you pay CY upkeep.' },
};
function spawnCrisis(E) {
  if (!E.lanes.length || E.pressure < 4) return;
  const chance = Math.min(0.75, (0.2 + 0.025 * E.pressure) * diffOf(E).crisis);
  if (rnd(E.chart) >= chance) return;
  const l = pick(E.chart, E.lanes);
  const types = Object.keys(CRISES).filter((t) => t !== 'shear' || l.cls >= 2);
  const type = pick(E.chart, types);
  E.crises.push({ id: (E.crisisId = (E.crisisId || 0) + 1), type, lane: l.id, hits: E.jumps + 1, state: 'forecast' });
  log(E, `Forecast: ${CRISES[type].ic} ${CRISES[type].n} will hit ${laneName(E, l)} on the next jump.`);
}
function applyCrises(E) {
  for (const c of E.crises) {
    if (c.state !== 'forecast' || c.hits !== E.jumps) continue;
    const l = E.lanes.find((x) => x.id === c.lane);
    const C = CRISES[c.type];
    if (!l) { c.state = 'done'; continue; }
    if (l.up[C.counter]) { c.state = 'done'; log(E, `${LANE_UPGRADES[C.counter].n} on ${laneName(E, l)} deflected the ${C.n}.`); continue; }
    c.state = 'active';
    if (c.type === 'swarm') { l.dmg = (l.dmg || 0) + 2; }
    if (c.type === 'blackout') { l.off = E.jumps; c.until = E.jumps; }
    if (c.type === 'customs') { E.customs = E.jumps + 1; c.until = E.jumps + 1; }
    if (c.type === 'quarantine') { E.quarantine = E.jumps + 1; c.until = E.jumps + 1; }
    if (c.type === 'shear') { l.off = E.jumps + 1; c.until = E.jumps + 1; }
    log(E, `${C.ic} ${C.n} hit ${laneName(E, l)}: ${C.d}`);
  }
  for (const c of E.crises) if (c.state === 'active' && c.until != null && c.until < E.jumps) c.state = 'done';
  E.crises = E.crises.filter((c) => c.state !== 'done' || c.hits >= E.jumps - 3);
}
export function resolveCrisis(E, cid) {
  const c = E.crises.find((x) => x.id === cid && x.state !== 'done');
  if (!c || !pay(E, CRISES[c.type].fix)) return false;
  const l = E.lanes.find((x) => x.id === c.lane);
  if (c.state === 'active') {
    if (c.type === 'swarm' && l) l.dmg = Math.max(0, l.dmg - 2);
    if ((c.type === 'blackout' || c.type === 'shear') && l) l.off = -1;
    if (c.type === 'customs') E.customs = -1;
    if (c.type === 'quarantine') E.quarantine = -1;
  }
  c.state = 'done';
  log(E, `${CRISES[c.type].n} ${c.hits > E.jumps ? 'averted' : 'resolved'}.`);
  recompute(E);
  return true;
}
export const openCrises = (E) => E.crises.filter((c) => c.state !== 'done');

// ---------------------------------------------------------------- rings & trade compacts
export const COMPACTS = {
  industrial: { n: 'Industrial Cycle', ic: '🏭', d: '+1 AL on every jump while the ring stays supplied.' },
  living: { n: 'Living Circuit', ic: '🧬', d: 'Restore +1 production charge to every colony in the ring (once), +2 GE.' },
  cryo: { n: 'Cryo Logistics', ic: '🧪', d: 'Jumps costing 2+ CY cost 1 less while the ring stays supplied.' },
};
// Nodes on a cycle = 2-edge-connected components (non-bridge lanes).
export function rings(E) {
  const adj = new Map();
  for (const l of E.lanes) {
    (adj.get(l.a) || adj.set(l.a, []).get(l.a)).push([l.b, l.id]);
    (adj.get(l.b) || adj.set(l.b, []).get(l.b)).push([l.a, l.id]);
  }
  const disc = new Map(), low = new Map(), bridges = new Set();
  let t = 0;
  const dfs = (u, pe) => {
    disc.set(u, t); low.set(u, t); t++;
    for (const [v, id] of adj.get(u) || []) {
      if (id === pe) continue;
      if (!disc.has(v)) { dfs(v, id); low.set(u, Math.min(low.get(u), low.get(v))); if (low.get(v) > disc.get(u)) bridges.add(id); }
      else low.set(u, Math.min(low.get(u), disc.get(v)));
    }
  };
  for (const u of adj.keys()) if (!disc.has(u)) dfs(u, -1);
  const seen = new Set(), out = [];
  for (const u of adj.keys()) {
    if (seen.has(u)) continue;
    const comp = [u];
    seen.add(u);
    for (let i = 0; i < comp.length; i++) for (const [v, id] of adj.get(comp[i])) if (!bridges.has(id) && !seen.has(v)) { seen.add(v); comp.push(v); }
    if (comp.length >= 3) out.push(comp.sort((a, b) => a - b));
  }
  return out;
}
function ringQualifies(E, comp) {
  const cols = comp.map((id) => node(E, id)).filter((n) => n.state === 'claimed' && n.type !== 'boss');
  return cols.length >= 3 && new Set(cols.map((n) => n.charter)).size >= 3;
}
function checkRings(E) {
  for (const comp of rings(E)) {
    if (!ringQualifies(E, comp)) continue;
    const key = comp.join(',');
    if (E.compacts.some((c) => c.key === key) || E.pendingCompact === key) continue;
    // A ring that merely grew from an existing compact ring keeps that compact.
    if (E.compacts.some((c) => c.members.every((m) => comp.includes(m)))) continue;
    E.pendingCompact = key;
    log(E, '💫 A trade ring of three charter types formed – choose a Trade Compact!');
  }
}
export function chooseCompact(E, id) {
  if (!E.pendingCompact || !COMPACTS[id]) return false;
  const members = E.pendingCompact.split(',').map(Number);
  E.compacts.push({ key: E.pendingCompact, members, id, at: E.jumps });
  E.pendingCompact = null;
  if (id === 'living') {
    for (const m of members) { const n = node(E, m); if (n.state === 'claimed') n.charges = (n.charges || 0) + 1; }
    gain(E, { GE: 2 });
  }
  log(E, `Trade Compact signed: ${COMPACTS[id].n}.`);
  checkContract(E);
  return true;
}
export function compactActive(E, id) {
  return (E.compacts || []).some((c) => c.id === id && c.members.every((m) => node(E, m).connected));
}

// ---------------------------------------------------------------- sector contracts
export const CONTRACTS = {
  auric: { n: 'The Auric Census', d: 'Claim a Gold-4+ world as a Mint.', reward: '+6 CR and a free Foundry blueprint' },
  corridor: { n: 'Cryogenic Corridor', d: 'Have two supplied colonies exporting CY.', reward: 'Your next jump costing 2+ CY is free' },
  archive: { n: 'The Living Archive', d: 'Complete the Bio-Loam Specialize stamp (5 Biomass) on two worlds.', reward: '+4 GE, +2 DA and a free Verdant enhancement level' },
  accord: { n: 'Mercantile Accord', d: 'Form a trade ring of three charter types and sign a Trade Compact.', reward: '+1 capacity on every lane' },
  salvage: { n: 'The Salvage Mandate', d: 'Rescue a Stranded Site.', reward: 'A free Foundry blueprint and +3 AL' },
  cartography: { n: 'Veil Cartography', d: 'Claim two Exotic-4+ worlds and keep both supplied.', reward: '+4 DA and a Gate Shard' },
};
function contractProgress(E, id) {
  const since = E.contract ? E.contract.at : 0;
  const cols = E.chart.nodes.filter((n) => n.state === 'claimed' && n.type !== 'boss');
  const fresh = cols.filter((n) => (n.claimedAt ?? 0) >= since);
  switch (id) {
    case 'auric': return [fresh.filter((n) => n.profile.gold >= 4 && n.charter === 'Mint').length, 1];
    case 'corridor': return [cols.filter((n) => n.yieldRes === 'CY' && n.connected).length, 2];
    case 'archive': return [cols.filter((n) => n.bioStamp).length, 2];
    case 'accord': return [E.compacts.filter((c) => c.at >= since).length ? 1 : 0, 1];
    case 'salvage': return [(E.rescued || 0) - (E.contract.rescuedAt || 0), 1];
    case 'cartography': return [fresh.filter((n) => n.profile.exotic >= 4 && n.connected).length, 2];
    default: return [0, 1];
  }
}
export function contractStatus(E) {
  if (!E.contract) return null;
  const [have, need] = contractProgress(E, E.contract.id);
  return { ...CONTRACTS[E.contract.id], id: E.contract.id, have: Math.min(have, need), need };
}
function offerContracts(E) {
  const pool = Object.keys(CONTRACTS).filter((c) => !E.contractsDone.includes(c));
  E.contractOffers = shuffle(E.chart, pool).slice(0, 3);
}
export function acceptContract(E, id) {
  if (E.contract || !E.contractOffers.includes(id)) return false;
  E.contract = { id, at: E.jumps, rescuedAt: E.rescued || 0 };
  E.contractOffers = [];
  log(E, `Contract accepted: ${CONTRACTS[id].n}.`);
  return true;
}
export function abandonContract(E) {
  if (!E.contract) return false;
  log(E, `Contract abandoned: ${CONTRACTS[E.contract.id].n}.`);
  E.contract = null;
  return true;
}
function checkContract(E) {
  const st = contractStatus(E);
  if (!st || st.have < st.need) return;
  const id = st.id;
  if (id === 'auric') { gain(E, { CR: 6 }); E.freeBlueprint++; }
  if (id === 'corridor') E.freeHops++;
  if (id === 'archive') { gain(E, { GE: 4, DA: 2 }); E.freeEnh = (E.freeEnh || 0) + 1; }
  if (id === 'accord') E.capBonus++;
  if (id === 'salvage') { E.freeBlueprint++; gain(E, { AL: 3 }); }
  if (id === 'cartography') gain(E, { DA: 4, GS: 1 });
  E.contractsDone.push(id);
  E.contract = null;
  log(E, `✅ Contract complete: ${CONTRACTS[id].n} – ${CONTRACTS[id].reward}.`);
}

// ---------------------------------------------------------------- fleet yard
export const FLEET = {
  mast: { n: 'Survey Mast', cost: { DA: 4, AL: 3 }, d: 'Survey 2 layers further ahead on the star chart.' },
  keel: { n: 'Cargo Keel', cost: { AL: 5, CR: 3 }, d: '+2 capacity on every lane that touches the Arkship or a Freeport.' },
  coldchain: { n: 'Cold-Chain Engine', cost: { CY: 4, AL: 4 }, d: 'The first jump costing 2+ CY in each sector costs 1 less.' },
  embassy: { n: 'Mobile Embassy', cost: { CR: 5, DA: 4 }, d: 'One treaty amendment per sector anywhere on the chart, without a Freeport.' },
  slot3: { n: 'Third Preparation Slot', cost: { AL: 6, CR: 4 }, d: 'Carry three Preparations into each colony instead of two.' },
  tug: { n: 'Rescue Tug', cost: { AL: 4, CY: 3 }, d: 'Stranded Site rescues cost 1 AL + 1 CY instead of 3 AL + 2 CY.' },
};
export function buyFleet(E, id) {
  if (E.fleet[id] || E.colony || !pay(E, FLEET[id].cost)) return false;
  E.fleet[id] = true;
  if (id === 'slot3') E.prepSlots = 3;
  log(E, `Fleet Yard: ${FLEET[id].n} installed.`);
  recompute(E);
  return true;
}

// ---------------------------------------------------------------- stranded sites
export const rescueCost = (E) => (E.fleet.tug ? { AL: 1, CY: 1 } : { AL: 3, CY: 2 });
export function rescue(E, id) {
  const n = node(E, id);
  if (E.colony || n.state !== 'stranded' || n.type === 'boss' || !pay(E, rescueCost(E))) return false;
  const fam = FAMILIES.slice().sort((a, b) => n.profile[b] - n.profile[a])[0];
  n.state = 'claimed';
  n.charter = 'Salvage Outpost';
  n.yieldRes = CHARTERS[fam].pri;
  n.yieldN = 1;
  n.charges = 3;
  n.claimedAt = E.jumps;
  E.pressure += 1;
  E.rescued = (E.rescued || 0) + 1;
  E.claimed++;
  log(E, `Rescued ${n.name}: now a Salvage Outpost (1 ${n.yieldRes}/jump, 3 charges). +1 Pressure.`);
  recompute(E);
  return true;
}

// ---------------------------------------------------------------- travel
export function travel(E, toId, opts = {}) {
  const e = reachable(E).find((x) => x.to === toId);
  if (!e || E.colony || E.pendingCompact) return false;
  const c = travelCost(E, e);
  if (c.tow) {
    E.pressure += 2;
    log(E, `Emergency tow (not enough CY): +2 Frontier Pressure.`);
  } else {
    E.res.CY -= c.CY;
    if (c.notes.some((x) => x.startsWith('Cryogenic Corridor'))) E.freeHops--;
    if (c.notes.some((x) => x.startsWith('Cold-Chain'))) E.ccSector = sectorOf(here(E).layer);
  }
  const fromSec = sectorOf(here(E).layer);
  E.pressure += c.pressure;
  E.jumps++;
  const from = E.at;
  E.at = toId;
  const n = node(E, toId);
  n.parent = from;
  log(E, `Jumped to ${n.name} (−${c.tow ? 0 : c.CY} CY, +${c.pressure} Pressure).`);
  applyCrises(E);
  recompute(E);
  collectRoutes(E);
  spawnCrisis(E);
  if (sectorOf(n.layer) !== fromSec) {
    refreshFoundry(E, true);
    if (!E.contract) offerContracts(E);
  }
  if (E.pressure >= E.maxPressure && n.type !== 'boss') {
    E.status = 'lost';
    E.endReason = 'Frontier Pressure reached its limit before the Veil was opened.';
    return true;
  }
  if (n.type === 'freeport') {
    n.state = 'visited';
    log(E, `Docked at Freeport ${n.name}. It is now a supplied hub for your lanes.`);
    recompute(E);
    return true;
  }
  if (n.type === 'boss') {
    E.supply = (opts.supply || []).filter((s) => SUPPLY[s]).slice(0, supplyTokens(E));
    for (const s of E.supply.slice()) if (!pay(E, SUPPLY[s].cost)) E.supply.splice(E.supply.indexOf(s), 1);
    if (opts.veilSwap) veilSwap(E, opts.veilSwap.out, opts.veilSwap.inn);
  }
  startMission(E, n, opts.bench);
  return true;
}

export function startMission(E, n, bench) {
  const pv = missionPreview(E, n);
  let clans = E.clans.slice();
  let guest = null;
  if (n.type === 'enclave' && n.clan && !clans.includes(n.clan)) {
    guest = n.clan;
    if (clans.length < maxClans(E)) clans.push(n.clan);
    else {
      const b = bench && clans.includes(bench) ? bench : clans[clans.length - 1];
      clans = clans.map((c) => (c === b ? n.clan : c));
    }
  }
  const S = genColony({
    seed: n.seed, R: pv.R, turns: pv.turns, profile: n.profile, clans, diff: pv.diff,
    type: n.type, name: n.name, preps: E.preps.slice(), boss: n.boss || null,
    draw: E.dir, loaner: guest ? STARTERS[guest] : null,
    extraEvents: pv.sec >= 3 || n.type === 'boss' || !!diffOf(E).events || hasMod(E, 'volatile'),
    enh: E.enh, supply: n.type === 'boss' ? E.supply || [] : [],
    dispatch: E.preps.includes('dispatch') ? dispatchCard(E, clans) : null,
  });
  E.mission = { node: n.id, guest, preps: E.preps.slice() };
  E.preps = [];
  E.colony = S;
}

function dispatchCard(E, clans) {
  const extra = clans.flatMap((cl) => E.dir.extra[cl] || []);
  if (extra.length) return extra[extra.length - 1];
  const fav = Object.entries(E.dir.fav).filter(([id]) => clans.includes(CARDS[id].cl)).sort((a, b) => b[1] - a[1])[0];
  return fav ? fav[0] : null;
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
    const sec = 1 + (mw ? 1 : 0) + (integ ? 1 : 0);
    if (n.type === 'fault') claim += 3;
    if (n.type === 'relay') claim = Math.max(2, claim - 2);
    if (hasMod(E, 'scarcity')) claim = Math.max(1, claim - 1);
    return {
      fam: f, n: ch.n, pri: ch.pri, sec: ch.sec, claim, secN: sec, spec, integ, mw,
      specText: SPECIALIZE[f].text,
      yieldN: Math.min(3, 1 + Math.floor(ab / 2)) + (n.type === 'relay' ? 1 : 0),
      charges: 4 + (mw ? 1 : 0) + (n.type === 'relay' ? 2 : 0),
    };
  });
}

// Called once the colony state reports won/failed.
export function resolveMission(E, charterFam) {
  const S = E.colony;
  const n = node(E, E.mission.node);
  E.totalInfluence += S.influence;
  const out = { gained: {}, licensed: null, joined: null, shard: false, contact: null };
  if (n.type === 'boss') {
    n.state = S.status === 'won' ? 'claimed' : 'stranded';
    if (S.status === 'won') {
      const all3 = S.stats.triTurns >= 5;
      const ending = S.result.masterwork && all3 && E.lastThroughput >= 8 ? 'Transcendent Civilization' : S.result.masterwork ? 'Resonant Capital' : 'Survival Claim';
      E.ending = E.ending && E.wonOnce ? E.ending : ending;
      E.victories = (E.victories || 0) + 1;
      E.wonOnce = true;
      E.status = 'won';
      E.endReason = `${n.name} is claimed. The expedition succeeds!`;
    } else {
      E.status = E.wonOnce ? 'won' : 'lost';
      E.endReason = E.wonOnce ? `${n.name} broke the colony, but your earlier victory stands.` : `${n.name} broke the colony. The expedition ends at the Veil.`;
    }
    E.colony = null;
    E.mission = null;
    return out;
  }
  const guest = E.mission.guest;
  if (S.status === 'won') {
    const opts = charterOptions(E);
    const ch = opts.find((c) => c.fam === charterFam) || opts[0];
    n.state = 'claimed';
    n.charter = ch.n;
    n.yieldRes = ch.pri;
    n.yieldN = ch.yieldN;
    n.charges = ch.charges;
    n.claimedAt = E.jumps;
    n.bioStamp = specializeDone(S, 'bio') && !S.prestamp;
    gain(E, { [ch.pri]: ch.claim }, out.gained);
    gain(E, { [ch.sec]: ch.secN }, out.gained);
    if (n.type === 'derelict') { gain(E, { CR: 2, AL: 1 }, out.gained); E.foundryDiscount = 1; }
    if (n.type === 'observatory') { gain(E, { DA: 2 }, out.gained); E.survey = (E.survey || 2) + 2; }
    if (n.type === 'shrine') { E.res.GS += 1; out.shard = true; }
    if (guest) {
      if (!E.licensed.includes(guest)) { E.licensed.push(guest); out.licensed = guest; }
      if (!E.clans.includes(guest) && E.clans.length < maxClans(E)) { E.clans.push(guest); out.joined = guest; }
      E.contacts = E.contacts.filter((c) => c !== guest);
    }
    E.claimed++;
    log(E, `${n.name} claimed as a ${ch.n}: ${gainText(out.gained)}${out.shard ? ', +1 Gate Shard' : ''}.`);
    if (out.joined) log(E, `${CLANS[guest].n} joined your treaty (${E.clans.length}/${maxClans(E)} active clans).`);
    else if (out.licensed) log(E, `${CLANS[guest].n} licensed for treaty swaps.`);
  } else if (S.shuttle) {
    n.state = 'visited';
    gain(E, { CR: 3 }, out.gained);
    log(E, `${n.name} failed – the Emergency Shuttle evacuated the crew (+3 CR, no Pressure).`);
  } else {
    n.state = 'stranded';
    E.pressure += 1;
    gain(E, { CR: 1 }, out.gained);
    log(E, `${n.name} failed and is now a Stranded Site (+1 Pressure, salvage +1 CR). It can be rescued later.`);
  }
  if (S.status !== 'won' && guest && !E.licensed.includes(guest) && !E.contacts.includes(guest)) {
    E.contacts.push(guest);
    out.contact = guest;
    log(E, `Contact made with ${CLANS[guest].n}: complete their license at a Freeport.`);
  }
  E.colony = null;
  E.mission = null;
  recompute(E);
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
  license: { CR: 4, DA: 2 },
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

// Clan Enhancements: two levels per clan, applied while the clan is active.
const THEME = { iron: 'AL', helio: 'CR', cryo: 'CY', verd: 'GE', syn: 'DA', wreck: 'AL', kep: 'AL', hearth: 'GE', umbra: 'DA' };
export function enhCost(E, cl) {
  const lv = E.enh[cl] || 0;
  if (lv >= 2) return null;
  if (E.freeEnh && cl === 'verd') return {};
  const t = THEME[cl];
  const c = lv === 0 ? { [t]: 3 } : { [t]: 5 };
  if (lv === 0) c.CR = (c.CR || 0) + 2; else c.DA = (c.DA || 0) + 3;
  return c;
}
export function enhance(E, cl) {
  const cost = enhCost(E, cl);
  if (!cost || !E.licensed.includes(cl) || !pay(E, cost)) return false;
  if (!Object.keys(cost).length) E.freeEnh--;
  E.enh[cl] = (E.enh[cl] || 0) + 1;
  log(E, `${CLANS[cl].n} enhanced: ${ENHANCE[cl][E.enh[cl] - 1].n}.`);
  return true;
}

// Treaty changes: Freeports, the Arkship, a Mobile Embassy, or the Veil.
export function canSwapHere(E) {
  if (E.colony) return false;
  return atHub(E) || (E.fleet.embassy && E.embassySector !== sectorOf(here(E).layer));
}
export function swapClan(E, out, inn) {
  if (!canSwapHere(E) || !E.licensed.includes(inn) || E.clans.includes(inn)) return false;
  if (out && !E.clans.includes(out)) return false;
  if (!out && E.clans.length >= maxClans(E)) return false;
  if (!pay(E, DIR_COST.swap)) return false;
  if (!atHub(E)) E.embassySector = sectorOf(here(E).layer);
  E.clans = out ? E.clans.map((c) => (c === out ? inn : c)) : E.clans.concat(inn);
  log(E, out ? `Treaty amended: ${CLANS[inn].n} replaces ${CLANS[out].n}.` : `Treaty amended: ${CLANS[inn].n} joins the active clans.`);
  return true;
}
export function completeLicense(E, cl) {
  if (!atHub(E) || !E.contacts.includes(cl) || !pay(E, DIR_COST.license)) return false;
  E.contacts = E.contacts.filter((c) => c !== cl);
  E.licensed.push(cl);
  log(E, `License completed: ${CLANS[cl].n} may now join your treaty.`);
  return true;
}

// ---------------------------------------------------------------- Card Foundry
export function refreshFoundry(E, free = false) {
  if (!free && (!atHub(E) || !pay(E, { CR: 2 }))) return false;
  const owned = new Set(Object.values(E.dir.extra || {}).flat());
  const avail = FOUNDRY_LIST.filter((c) => !owned.has(c.id));
  const seen = new Set(E.chart.nodes.filter((n) => n.type === 'enclave' && isSurveyed(E, n)).map((n) => n.clan).concat(E.licensed));
  const take = (arr, k, picked) => shuffle(E.chart, arr.filter((c) => !picked.includes(c.id))).slice(0, k).map((c) => c.id);
  const picked = [];
  picked.push(...take(avail.filter((c) => E.clans.includes(c.cl)), 2, picked));
  picked.push(...take(avail.filter((c) => seen.has(c.cl) && !E.clans.includes(c.cl)), 2, picked));
  picked.push(...take(avail, 6 - picked.length, picked));
  E.foundry = { offers: picked, sector: sectorOf(here(E).layer) };
  return true;
}
export function blueprintCost(E, cid) {
  if (E.freeBlueprint > 0) return {};
  const c = Object.assign({}, CARDS[cid].cost);
  if (E.foundryDiscount) for (const r of Object.keys(c)) { c[r] = Math.max(0, c[r] - 1); break; }
  return c;
}
export function buyBlueprint(E, cid) {
  if (!E.foundry.offers.includes(cid) || E.colony) return false;
  const cost = blueprintCost(E, cid);
  if (!pay(E, cost)) return false;
  if (!Object.keys(cost).length) E.freeBlueprint--;
  else if (E.foundryDiscount) E.foundryDiscount = 0;
  const cl = CARDS[cid].cl;
  (E.dir.extra[cl] = E.dir.extra[cl] || []).push(cid);
  E.foundry.offers = E.foundry.offers.filter((x) => x !== cid);
  log(E, `Foundry: ${CARDS[cid].n} blueprint added to the ${CLANS[cl].n} pool.`);
  return true;
}

// ---------------------------------------------------------------- Freeport exchange
const BASE_EXCHANGE = [
  { id: 'sellAL', d: 'Sell 2 AL → 3 CR', give: { AL: 2 }, get: { CR: 3 } },
  { id: 'sellCY', d: 'Sell 2 CY → 3 CR', give: { CY: 2 }, get: { CR: 3 } },
  { id: 'sellGE', d: 'Sell 2 GE → 3 CR', give: { GE: 2 }, get: { CR: 3 } },
  { id: 'buyAL', d: 'Buy 1 AL for 3 CR', give: { CR: 3 }, get: { AL: 1 } },
  { id: 'buyCY', d: 'Buy 1 CY for 3 CR', give: { CR: 3 }, get: { CY: 1 } },
  { id: 'buyGE', d: 'Buy 1 GE for 4 CR', give: { CR: 4 }, get: { GE: 1 } },
  { id: 'buyDA', d: 'Buy 1 DA for 5 CR', give: { CR: 5 }, get: { DA: 1 } },
  { id: 'dataAL', d: 'Trade 2 DA → 1 AL', give: { DA: 2 }, get: { AL: 1 } },
];
export const EXCHANGE = BASE_EXCHANGE;
export function exchangeRates(E) {
  if (!hasMod(E, 'scarcity')) return BASE_EXCHANGE;
  return BASE_EXCHANGE.map((x) => {
    const give = Object.fromEntries(Object.entries(x.give).map(([r, v]) => [r, x.id.startsWith('buy') ? v + 1 : v]));
    return { ...x, give, d: `${x.d.split(' for ')[0]}${x.id.startsWith('buy') ? ` for ${give.CR} CR` : ''}` };
  });
}
export function exchange(E, id) {
  const x = exchangeRates(E).find((e) => e.id === id);
  if (!x || !atHub(E)) return false;
  if (!pay(E, x.give)) return false;
  gain(E, x.get);
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
  gain(E, PREPS[id].cost);
  return true;
}

// ---------------------------------------------------------------- the Veil
export function veilStatus(E) {
  return {
    shards: E.res.GS, shardsOk: E.res.GS >= 3,
    throughput: E.peakThroughput || 0, throughputOk: (E.peakThroughput || 0) >= 8,
    cy: E.res.CY, cyOk: E.res.CY >= 3,
    tokens: supplyTokens(E),
  };
}
// The supplied network earns up to three Supply Tokens for the finale.
export const supplyTokens = (E) => Math.min(3, Math.ceil((E.peakThroughput || 0) / 3));
export function veilSwap(E, out, inn) {
  if (!E.licensed.includes(inn) || E.clans.includes(inn) || !E.clans.includes(out)) return false;
  E.clans = E.clans.map((c) => (c === out ? inn : c));
  log(E, `Veil Relay: ${CLANS[inn].n} replaces ${CLANS[out].n} for the finale.`);
  return true;
}

// ---------------------------------------------------------------- Endless Frontier
export function enterEndless(E) {
  if (E.status !== 'won') return false;
  const o = { seed: E.chart.seed || hashStr('endless' + E.seed + E.jumps) };
  const start = here(E).layer;
  const pool = E.chart.enclavePool && E.chart.enclavePool.length ? E.chart.enclavePool : shuffle(o, CLAN_IDS.filter((c) => !E.licensed.includes(c)));
  growChart(o, E.chart, [E.at], start + 1, 4, pool, Object.keys(BOSSES));
  E.chart.seed = o.seed;
  E.chart.enclavePool = pool;
  E.status = 'active';
  E.endless = (E.endless || 0) + 1;
  E.maxPressure = E.pressure + 10;
  E.res.GS = 0;
  E.peakThroughput = E.lastThroughput || 0;
  log(E, `Into the Endless Frontier (round ${E.endless}). The Frontier clock resets to ${E.maxPressure}; three new superplanets wait beyond.`);
  refreshFoundry(E, true);
  if (!E.contract) offerContracts(E);
  recompute(E);
  return true;
}

export { FAMILY_INFO, PREPS, ENHANCE, SUPPLY };
