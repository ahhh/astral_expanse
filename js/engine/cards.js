// The 135 base buildings (15 per clan), the 18 Card Foundry blueprints and
// the neutral Charter Beacon.
//
// Card fields
//   id, n (name), cl (clan), t (tier E/M/A), r (rarity C/U/R), tags, text
//   trig   main trigger: build | turn | every (+every:N) | sunlit | sunlit2 | shadow | event | passive
//   build  On Build effect            run   periodic effect (also used by repeats)
//   L      event listeners [{on, r, run}]; r = number | 'self' | 'map' | 'net' | 'orbit'
//   aura   passive bonus added when another building scores
//   guard  protects against meteor impacts within guard.r
//   ability once-per-era player-activated power
//   cap    activation cap per turn (default 2)
//   late   periodic effect resolves after all other periodic effects
//   rb     rubric inputs, see rubric.js
//
// Effects receive `a`, the engine API (see colony.js mkApi).

export const CLANS = {
  iron: { n: 'Ironwake Union', s: 'Excavators', col: '#d98b45', ic: '⛏️', d: 'Ore, Caverns, Alloy and Anchors. Take a deposit\'s value now or keep it for later. Mine tunnels: Ironwake buildings on or beside a Cavern connect to every other building on or beside a Cavern.' },
  helio: { n: 'Heliarch Array', s: 'Sunforged', col: '#f4c84a', ic: '☀️', d: 'Sunlight, Heat and Power. Build for the next light phase, not only this turn.' },
  cryo: { n: 'Cryostead Enclave', s: 'Frostkeepers', col: '#79d0f2', ic: '❄️', d: 'Ice and Water cycles, Shadow and Cold. Consume Ice now or keep it as a recurring source. Ice bridges: Cryostead buildings connect to any building touching the same Ice or Water.' },
  verd: { n: 'Verdant Exodus', s: 'Terraformers', col: '#6fcf73', ic: '🌱', d: 'Bio-Loam, Biomass, Pressure and growth chains.' },
  syn: { n: 'Synapse Circuit', s: 'Machine Minds', col: '#a68cff', ic: '🧠', d: 'Signals, networks and repeat activations that make other buildings stronger.' },
  wreck: { n: 'Wreckborn Fleet', s: 'Reclaimers', col: '#e5765b', ic: '♻️', d: 'Scrap, salvage and demolition. Sometimes tearing down pays more than keeping.' },
  kep: { n: 'Kepler Cartographers', s: 'Orbitwrights', col: '#8ea6ff', ic: '🛰️', d: 'Orbit slots, Cargo launches and arrivals, long-range links.' },
  hearth: { n: 'Hearthline Compact', s: 'Colonists', col: '#f59fc0', ic: '🏠', d: 'Habitats, Pressure, culture and cross-clan cooperation.' },
  umbra: { n: 'Umbra Institute', s: 'Anomaly Researchers', col: '#d36bd6', ic: '🔮', d: 'Radiation, anomalies, time and rule-bending repeats.' },
};
export const CLAN_IDS = Object.keys(CLANS);

export const RARITY = {
  C: { n: 'Common', w: 1.0, col: '#9aa4b2' },
  U: { n: 'Uncommon', w: 0.6, col: '#3fd1a0' },
  R: { n: 'Rare', w: 0.3, col: '#ffbf3c' },
};
export const TIER = { E: 'Early', M: 'Mid', A: 'Advanced' };
export const TRIG = {
  build: 'On Build', turn: 'Every Turn', every: 'Every N Turns', sunlit: 'Every Sunlit Turn',
  sunlit2: 'Every 2 Sunlit Turns', shadow: 'Every Shadow Turn', event: 'Reactive', passive: 'Passive',
};

// ---- shared effect helpers -------------------------------------------------
const metalLoose = ['Metal', 'Scrap', 'Alloy'];
const looseAny = ['Metal', 'Scrap', 'Alloy', 'Water', 'Biomass', 'Fuel', 'Dust', 'Gas'];
function firstRes(a, sel, r = 1, k = a.k) {
  return a.resNear(k, sel, r)[0] || null;
}
// Convert the first matching token within range r; returns the product hex or null.
function convert(a, sel, to, r = 1) {
  const k = firstRes(a, sel, r);
  if (!k) return null;
  return a.transform(k, to);
}
function repeatOne(a, sel, r, exclude = []) {
  for (const b of a.bldNear(a.k, sel, r)) {
    if (exclude.includes(b.id) || !a.canRepeat(b)) continue;
    if (a.repeat(b)) return b;
  }
  return null;
}
const pressurized = (a, b) => a.st(b.k, 'Pressure');
const pHabitat = (a, b) => a.has(b, 'Habitat') && a.st(b.k, 'Pressure');
function pressurize(a, ks, t = 99) {
  for (const k of ks) if (a.kind(k) !== 'rock') a.addSt(k, 'Pressure', t);
}
function distinctTagsActivated(a, filter) {
  const s = new Set();
  for (const e of a.tstat.acts) if (filter(e)) e.tags.forEach((t) => s.add(t));
  return s.size;
}
const countNear = (a, sel, r, max) => Math.min(max, a.bldNear(a.k, sel, r).length);
const resCount = (a, sel, r, max) => Math.min(max, a.resNear(a.k, sel, r).length);
const radiated = (a, r) => a.near(a.k, r).concat([a.k]).filter((k) => a.st(k, 'Radiation')).length;

const list = [
  // ======================= IRONWAKE UNION =======================
  {
    id: 'prospector_nail', n: 'Prospector Nail', cl: 'iron', t: 'E', r: 'C', tags: ['Mining', 'Signal'], trig: 'every', every: 3, pts: 4,
    text: 'On Build: Reveal up to 3 buried deposits within range 2, +4 each (+2 more for Ore). Every 3 turns: reveal one more within range 3 (+4), or +2 if none remain.',
    build(a) {
      let n = 0;
      for (const k of a.near(a.k, a.R(2))) {
        if (n >= 3) break;
        if (!a.hidden(k) || a.kind(k) === 'rock') continue;
        const t = a.reveal(k);
        a.score(4 + (a.is(t, '#Ore') ? 2 : 0));
        n++;
      }
    },
    run(a) {
      const k = a.near(a.k, 3).find((x) => a.hidden(x) && a.kind(x) !== 'rock');
      if (k) { a.reveal(k); a.score(4); } else a.score(2);
    },
    rb: { once: 13, p: 3, rel: 0.17, u: 0.8, why: 'Tempo + information: reveals new targets for converters.' },
  },
  {
    id: 'pit_drill', n: 'Pit Drill', cl: 'iron', t: 'E', r: 'C', tags: ['Mining', 'Metal'], trig: 'every', every: 2, pts: 6,
    text: 'Every 2 turns: Extract one unit of an Ore deposit within range 2 into Metal. +6 (+3 more for Gold). With no Ore in reach, it bores deeper once: its range grows by 1 for good, and Ore only the bore reaches scores +3.',
    run(a) {
      const m = a.mem();
      const r = a.R(2);
      const far = (k) => a.dist(k, a.k) > r;
      const ks = a.resNear(a.k, '#Ore', r + (m.deep || 0)).sort((x, y) => far(x) - far(y) || (a.res(y) === 'Gold') - (a.res(x) === 'Gold'));
      if (!ks.length) {
        if (!m.deep) { m.deep = 1; a.note('bores deeper'); }
        return;
      }
      const g = a.res(ks[0]) === 'Gold';
      const deep = far(ks[0]);
      a.transform(ks[0], 'Metal');
      a.score(deep ? 3 : 6 + (g ? 3 : 0));
    },
    rb: { p: 6.5, u: 1, rel: 0.4, why: 'Starter. Each Ore deposit holds 3 units; bores deeper once when its reach runs dry.' },
  },
  {
    id: 'gravity_anchor', n: 'Gravity Anchor', cl: 'iron', t: 'E', r: 'C', tags: ['Anchor', 'Structure'], trig: 'every', every: 3, pts: 2,
    text: 'On Build: Make this and adjacent hexes Stable (+3 per Unstable hex fixed, min +2). Every 3 turns: +2 per adjacent building on a Stable hex (max 2). Adjacent Mining buildings score +2 when they activate.',
    build(a) {
      let s = 0;
      for (const k of a.near(a.k, 1).concat([a.k])) {
        if (a.kind(k) === 'orbit' || a.kind(k) === 'rock') continue;
        if (a.st(k, 'Unstable')) { a.rmSt(k, 'Unstable'); s += 3; }
        a.addSt(k, 'Stable');
      }
      a.score(Math.max(2, s));
    },
    run(a) { const n = countNear(a, (b) => a.st(b.k, 'Stable'), 1, 2); if (n) a.score(2 * n); },
    aura(a, self, actor) { return a.has(actor, 'Mining') && a.dist(self.k, actor.k) === 1 ? 2 : 0; },
    rb: { once: 3, p: 3, rel: 0.99, passive: { p: 2, rate: 0.35 }, why: 'District anchor: rewards building around it; insurance vs tremors.' },
  },
  {
    id: 'regolith_rake', n: 'Regolith Rake', cl: 'iron', t: 'E', r: 'C', tags: ['Mining', 'Dust'], trig: 'every', every: 2, pts: 4,
    text: 'On Build: Clear up to 2 adjacent Regolith/Dust, +4 each. Every 2 turns: excavate a Rock hex within range 2 into a Cavern (+6); if none, clear a Regolith/Dust within range 2 (+5).',
    build(a) {
      let n = 0;
      for (const k of a.resNear(a.k, '#Dust', 1)) { if (n++ >= 2) break; a.consume(k, true); a.score(4); }
    },
    run(a) {
      const k = a.near(a.k, a.R(2)).find((x) => a.kind(x) === 'rock');
      if (k) { a.excavate(k); return a.score(6); }
      const d = firstRes(a, '#Dust', 2);
      if (d) { a.consume(d, true); a.score(5); }
    },
    rb: { once: 4, p: 4.5, rel: 0.16, u: 1.5, why: 'Opens building space and feeds excavation triggers.' },
  },
  {
    id: 'ore_shuttle', n: 'Ore Shuttle', cl: 'iron', t: 'E', r: 'U', tags: ['Cargo', 'Link'], trig: 'every', every: 2, pts: 3, cap: 3,
    text: 'Link. Reactive: Whenever a Metal-tagged resource (Ore, Gold, Metal, Scrap, Alloy) is consumed or extracted within range 2, +6. Every 2 turns: pack a Metal/Scrap/Alloy within range 2 into Cargo, +3.',
    L: [{ on: 'consume', r: 2, run(a, b, ev) { if (a.is(ev.res, '#Metal')) a.score(6); } }],
    run(a) { if (convert(a, metalLoose, 'Cargo', 2)) a.score(3); },
    rb: { p: 3, rel: 0.23, react: { p: 6, rate: 0.23 }, u: 1, why: 'Payoff for every Drill/Smelter nearby; Cargo bridge to Kepler.' },
  },
  {
    id: 'mantle_cutter', n: 'Mantle Cutter', cl: 'iron', t: 'M', r: 'C', tags: ['Mining', 'Heat'], trig: 'every', every: 2, pts: 6,
    text: 'On Build: Excavate up to 2 adjacent Rock hexes into Hot Caverns, +7 each. Every 2 turns: excavate one more adjacent Rock (Hot), +7. With no Rock left, it taps the heat instead: +1 per adjacent Hot hex (max 2).',
    build(a) {
      let n = 0;
      for (const k of a.near(a.k, a.R(1))) {
        if (n >= 2) break;
        if (a.kind(k) !== 'rock') continue;
        a.excavate(k); a.addSt(k, 'Hot'); a.score(7); n++;
      }
    },
    run(a) {
      const k = a.near(a.k, a.R(1)).find((x) => a.kind(x) === 'rock');
      if (k) { a.excavate(k); a.addSt(k, 'Hot'); a.score(7); return; }
      const hot = Math.min(2, a.near(a.k, 1).filter((x) => a.st(x, 'Hot')).length);
      if (hot) a.score(hot);
    },
    rb: { once: 9, p: 5, rel: 0.2, u: 2, why: 'Caverns + Heat + buried deposits; finite rock supply.' },
  },
  {
    id: 'magnetic_separator', n: 'Magnetic Separator', cl: 'iron', t: 'M', r: 'U', tags: ['Metal', 'Industry'], trig: 'every', every: 2, pts: 5,
    text: 'Reactive: When an Ore-tagged deposit is extracted within range 2, create a bonus Metal nearby, +5. Every 2 turns: +2 per Metal-tagged token within range 2 (max 3).',
    L: [{ on: 'extract', r: 2, run(a, b, ev) { if (a.create('Metal', ev.k, 2)) a.score(5); } }],
    run(a) { const n = resCount(a, '#Metal', 2, 3); if (n) a.score(2 * n); },
    rb: { p: 4, rel: 0.57, react: { p: 5, rate: 0.25 }, u: 2, why: 'Duplicates Metal in Drill districts.' },
  },
  {
    id: 'smelting_stack', n: 'Smelting Stack', cl: 'iron', t: 'M', r: 'C', tags: ['Metal', 'Heat'], trig: 'every', every: 2, pts: 7,
    text: 'Every 2 turns: Turn a Metal or Scrap within range 2 into Alloy, +7, and heat this hex. Otherwise heat an adjacent empty hex, +2.',
    run(a) {
      if (convert(a, ['Metal', 'Scrap'], 'Alloy', 2)) { a.score(7); return a.addSt(a.k, 'Hot'); }
      const k = a.near(a.k, 1).find((x) => a.free(x) && !a.st(x, 'Hot'));
      if (k) { a.addSt(k, 'Hot'); a.score(2); }
    },
    rb: { p: 4.5, u: 1.5, rel: 0.47, why: 'Needs a Metal/Scrap feed; Alloy and Hot both trigger other cards.' },
  },
  {
    id: 'seismic_geophone', n: 'Seismic Geophone', cl: 'iron', t: 'M', r: 'U', tags: ['Signal', 'Mining'], trig: 'event', pts: 10, cap: 2,
    text: 'Reactive (up to twice per turn): When a Cavern is excavated, a deposit is revealed or Ore is extracted within range 2, repeat a Mining building within range 2, +10.',
    L: [
      { on: 'excavate', r: 2, run(a) { repeatOne(a, '#Mining', 2); a.score(10); } },
      { on: 'extract', r: 2, run(a) { repeatOne(a, '#Mining', 2); a.score(10); } },
      { on: 'reveal', r: 2, run(a) { repeatOne(a, '#Mining', 2); a.score(10); } },
    ],
    rb: { react: { p: 8, rate: 0.27 }, u: 3, why: 'Repeat engine for Mining districts.' },
  },
  {
    id: 'slag_dump', n: 'Slag Dump', cl: 'iron', t: 'M', r: 'C', tags: ['Waste', 'Dust'], trig: 'every', every: 2, pts: 2,
    text: 'Reactive: When Alloy appears within range 2, drop Dust beside this, +2; when Metal appears, +1. Every 2 turns: +1 per Metal-tagged token within range 2 (max 4).',
    L: [{ on: 'create', r: 2, run(a, b, ev) { if (ev.res === 'Alloy') { a.create('Dust', a.k, 1); a.score(2); } else if (ev.res === 'Metal') a.score(1); } }],
    run(a) { const n = resCount(a, '#Metal', 2, 4); if (n) a.score(n); },
    rb: { p: 2.5, rel: 0.63, react: { p: 1.3, rate: 0.74 }, u: 0.3, why: 'Low-ceiling filler for Metal shells; feeds Dust consumers.' },
  },
  {
    id: 'tunnel_spine', n: 'Tunnel Spine', cl: 'iron', t: 'A', r: 'U', tags: ['Link', 'Structure'], trig: 'turn', pts: 1,
    text: 'Link. Mining buildings in its network score +2 whenever they activate. Every turn: +2 per Mining building in its network (max 2).',
    aura(a, self, actor) { return a.has(actor, 'Mining') && a.inNet(self, actor) ? 2 : 0; },
    run(a) { const n = Math.min(2, a.net().filter((x) => a.has(x, 'Mining')).length); if (n) a.score(2 * n); },
    rb: { p: 2.8, rel: 1.11, passive: { p: 2, rate: 1.11 }, why: 'Network amplifier for Mining districts.' },
  },
  {
    id: 'strip_drill', n: 'Strip-Drill Array', cl: 'iron', t: 'A', r: 'R', tags: ['Mining', 'Impact'], trig: 'every', every: 2, pts: 8,
    text: 'On Build: Extract up to 3 Ore units within range 2 into Metal, +10 each; one hex becomes Unstable. Every 2 turns: extract one more within range 2, +9.',
    build(a) {
      let n = 0, last = null;
      for (const k of a.resNear(a.k, '#Ore', a.R(2))) { if (n >= 3) break; a.transform(k, 'Metal'); a.score(10); n++; last = k; }
      if (last) a.addSt(last, 'Unstable');
    },
    run(a) { const k = firstRes(a, '#Ore', a.R(2)); if (k) { a.transform(k, 'Metal'); a.score(9); } },
    rb: { once: 27, p: 7, u: 1.5, rel: 0.15, why: 'Burst of extractions (each fires Extract triggers) plus a steady trickle.' },
  },
  {
    id: 'forge_cathedral', n: 'Forge Cathedral', cl: 'iron', t: 'A', r: 'R', tags: ['Industry', 'Metal'], trig: 'every', every: 2, pts: 14, cap: 3,
    text: 'Reactive: Whenever Alloy appears within range 2, +14; whenever Metal appears, +6. Every 2 turns: +4 per Metal-tagged token within range 2 (max 4).',
    L: [{ on: 'create', r: 2, run(a, b, ev) { if (ev.res === 'Alloy') a.score(14); else if (ev.res === 'Metal') a.score(6); } }],
    run(a) { const n = resCount(a, '#Metal', 2, 4); if (n) a.score(4 * n); },
    rb: { p: 10, rel: 0.56, react: { p: 8, rate: 0.49 }, why: 'Top Metal/Alloy payoff.' },
  },
  {
    id: 'core_lattice', n: 'Core Lattice', cl: 'iron', t: 'A', r: 'U', tags: ['Anchor', 'Link'], trig: 'every', every: 2, pts: 2,
    text: 'On Build: Stabilize hexes within range 2; +2 per Unstable hex or Cavern stabilized (max +14). Mining buildings in its network get +1 range. Every 2 turns: +3 per Mining building in its network (max 3).',
    build(a) {
      let s = 0;
      for (const k of a.near(a.k, 2).concat([a.k])) {
        const kd = a.kind(k);
        if (kd === 'orbit' || kd === 'rock') continue;
        if (a.st(k, 'Unstable') || (kd === 'cavern' && !a.st(k, 'Stable'))) s += 2;
        a.rmSt(k, 'Unstable'); a.addSt(k, 'Stable');
      }
      a.score(Math.min(14, Math.max(2, s)));
    },
    run(a) { const n = Math.min(3, a.net().filter((x) => a.has(x, 'Mining')).length); if (n) a.score(3 * n); },
    rangeBoost: (a, self, b) => a.has(b, 'Mining') && a.inNet(self, b),
    rb: { once: 7, p: 5, rel: 0.87, u: 1.5, why: 'Stabilization + range lets Drills reach new deposits.' },
  },
  {
    id: 'crustbreaker', n: 'Crustbreaker', cl: 'iron', t: 'A', r: 'R', tags: ['Mining', 'Impact'], trig: 'every', every: 2, pts: 9,
    text: 'On Build: Excavate up to 3 Rock hexes within range 2 (revealing what is buried), +9 each; lose 2 Integrity (1 if beside an Anchor). Every 2 turns: excavate one more within range 2, +12.',
    build(a) {
      let n = 0;
      for (const k of a.near(a.k, a.R(2))) {
        if (n >= 3) break;
        if (a.kind(k) !== 'rock') continue;
        a.excavate(k); a.score(9); n++;
      }
      if (n) a.integrity(a.bldNear(a.k, '#Anchor', 1).length ? -1 : -2);
    },
    run(a) { const k = a.near(a.k, a.R(2)).find((x) => a.kind(x) === 'rock'); if (k) { a.excavate(k); a.score(12); } },
    rb: { once: 26, p: 9.5, rel: 0.23, u: 2, cost: 5, why: 'Huge burst paid for with Integrity.' },
  },

  // ======================= HELIARCH ARRAY =======================
  {
    id: 'sunfoil_canopy', n: 'Sunfoil Canopy', cl: 'helio', t: 'E', r: 'C', tags: ['Solar', 'Power'], trig: 'sunlit', pts: 2,
    text: 'Every Sunlit turn: +2, or +3 if next to another Solar building.',
    run(a) { a.score(2 + countNear(a, '#Solar', 1, 1)); },
    rb: { p: 2.5, rel: 1.5, why: 'Starter: no setup, rewards Solar clusters.' },
  },
  {
    id: 'thermal_mirror', n: 'Thermal Mirror', cl: 'helio', t: 'E', r: 'C', tags: ['Light', 'Structure'], trig: 'sunlit', pts: 2, mirror: true,
    text: 'While Sunlit, adjacent hexes also count as Sunlit. Every Sunlit turn: +2 per adjacent Solar building (max 3).',
    run(a) { const n = countNear(a, '#Solar', 1, 3); if (n) a.score(2 * n); },
    rb: { p: 3, rel: 0.63, u: 1, why: 'Extends Sunlit uptime for neighbours and scores per Solar neighbour.' },
  },
  {
    id: 'radiator_fin', n: 'Radiator Fin', cl: 'helio', t: 'E', r: 'C', tags: ['Cold', 'Power'], trig: 'shadow', pts: 3,
    text: 'Reactive: When a hex within range 2 becomes Hot, cool it, bank the heat (max 3) and score +3 (triggers On Cooling). Each Shadow turn: radiate the bank, +2 per heat stored.',
    L: [{ on: 'heat', r: 2, run(a, b, ev) { const m = a.mem(); m.heat = Math.min(3, (m.heat || 0) + 1); a.rmSt(ev.k, 'Hot'); a.score(3); } }],
    run(a) { const m = a.mem(); if (m.heat) { a.score(2 * m.heat); m.heat = 0; } },
    rb: { p: 2, rel: 0.68, react: { p: 3, rate: 0.34 }, u2: 1, why: 'Heat sink; banks Hot and pays it out after sunset; rel ≈ heat banked per Shadow turn.' },
  },
  {
    id: 'photon_kiln', n: 'Photon Kiln', cl: 'helio', t: 'E', r: 'C', tags: ['Heat', 'Industry'], trig: 'event', pts: 3,
    text: 'Reactive: When this hex becomes Sunlit, heat an adjacent empty hex and score +2 per adjacent Mineral deposit (min +4, max +8).',
    L: [{
      on: 'enterLit', r: 'self', run(a) {
        const k = a.near(a.k, 1).find((x) => a.free(x) && !a.st(x, 'Hot'));
        if (k) a.addSt(k, 'Hot');
        a.score(Math.min(8, Math.max(4, 2 * a.resNear(a.k, '#Mineral', 1).length)));
      },
    }],
    rb: { react: { p: 5, rate: 0.23 }, u: 1, why: 'Fires on roughly every other rotation; Heat output feeds Fins/Valves.' },
  },
  {
    id: 'sunclock_relay', n: 'Sunclock Relay', cl: 'helio', t: 'E', r: 'U', tags: ['Signal', 'Solar'], trig: 'event', pts: 4,
    text: 'Reactive: When this hex changes between Sunlit and Shadow, +4 and repeat an adjacent Solar building.',
    L: [
      { on: 'enterLit', r: 'self', run(a) { a.score(4); repeatOne(a, '#Solar', 1); } },
      { on: 'enterShadow', r: 'self', run(a) { a.score(4); repeatOne(a, '#Solar', 1); } },
    ],
    rb: { react: { p: 4, rate: 0.38 }, u: 1.5, why: 'Two-way rotation trigger with a Solar repeat.' },
  },
  {
    id: 'solar_furnace', n: 'Solar Furnace', cl: 'helio', t: 'M', r: 'C', tags: ['Heat', 'Power'], trig: 'sunlit', pts: 7,
    text: 'Every Sunlit turn: Melt an Ice within range 2 into Water, +7. Without Ice, heat an adjacent empty hex, +3.',
    run(a) {
      if (convert(a, 'Ice', 'Water', 2)) return a.score(7);
      const k = a.near(a.k, 1).find((x) => a.free(x) && !a.st(x, 'Hot'));
      if (k) { a.addSt(k, 'Hot'); a.score(3); }
    },
    rb: { p: 4.5, rel: 0.77, u: 1, why: 'Melt engine; falls back to Heat once Ice runs out.' },
  },
  {
    id: 'capacitor_bloom', n: 'Capacitor Bloom', cl: 'helio', t: 'M', r: 'U', tags: ['Power', 'Storage'], trig: 'sunlit', pts: 3,
    text: 'Every Sunlit turn: store a Charge (max 3), +3. Reactive: When this hex enters Shadow, spend a Charge to repeat an adjacent building, +5.',
    run(a) { const m = a.mem(); if ((m.ch || 0) < 3) m.ch = (m.ch || 0) + 1; a.score(3); },
    L: [{ on: 'enterShadow', r: 'self', run(a) { const m = a.mem(); if (m.ch > 0 && repeatOne(a, null, 1)) { m.ch--; a.score(5); } } }],
    rb: { p: 3, react: { p: 5, rate: 0.2 }, u: 2, rel: 0.67, why: 'Turns night into a repeat window.' },
  },
  {
    id: 'helium_skimmer', n: 'Helium Skimmer', cl: 'helio', t: 'M', r: 'C', tags: ['Fuel', 'Solar'], trig: 'sunlit', pts: 5,
    text: 'Every Sunlit turn: Turn a Gas within range 2 into Fuel, +5; otherwise +3.',
    run(a) { if (convert(a, 'Gas', 'Fuel', 2)) a.score(5); else a.score(3); },
    rb: { p: 3.6, u: 0.8, rel: 1.12, why: 'Reliable; Fuel feeds Ramjet/Antimatter/Nectar lines.' },
  },
  {
    id: 'prism_farm', n: 'Prism Farm', cl: 'helio', t: 'M', r: 'U', tags: ['Crystal', 'Light'], trig: 'sunlit', pts: 3,
    text: 'Every Sunlit turn: +3 per Crystal within range 2 (max 4).',
    run(a) { const n = resCount(a, '#Crystal', 2, 4); if (n) a.score(3 * n); },
    rb: { p: 6, rel: 0.96, why: 'High payoff on Crystal-rich maps; never consumes them.' },
  },
  {
    id: 'dawn_siren', n: 'Dawn Siren', cl: 'helio', t: 'M', r: 'U', tags: ['Signal', 'Light'], trig: 'event', pts: 4,
    text: 'Reactive: When a Power building in its network enters Sunlight, repeat a different Power building in the network. +4.',
    L: [{
      on: 'enterLit', r: 'net', run(a, b, ev) {
        const src = a.bldAt(ev.k);
        if (!src || !a.has(src, 'Power')) return;
        const t = a.net().find((x) => x.id !== src.id && a.has(x, 'Power') && a.canRepeat(x));
        if (t && a.repeat(t)) a.score(4);
      },
    }],
    rb: { react: { p: 3, rate: 0.75 }, u: 1.5, why: 'Network repeat engine for Solar districts.' },
  },
  {
    id: 'heat_pipeline', n: 'Heat Pipeline', cl: 'helio', t: 'A', r: 'U', tags: ['Link', 'Heat'], trig: 'turn', pts: 2,
    text: 'Link. Every turn: Heat the hex of one connected building that is not Hot (triggers On Heat), then +2 per connected building on a Hot hex (max 3).',
    run(a) {
      const net = a.net();
      const t = net.find((x) => !a.st(x.k, 'Hot') && a.kind(x.k) !== 'orbit');
      if (t) a.addSt(t.k, 'Hot');
      const n = Math.min(3, net.filter((x) => a.st(x.k, 'Hot')).length);
      if (n) a.score(2 * n);
    },
    rb: { p: 4.5, u: 1, rel: 0.97, why: 'Steady scoring plus a Heat trigger every turn.' },
  },
  {
    id: 'flare_harvester', n: 'Flare Harvester', cl: 'helio', t: 'A', r: 'C', tags: ['Power', 'Shield'], trig: 'sunlit', pts: 4, flareProof: true,
    text: 'Every Sunlit turn: +4. Protects itself and adjacent buildings from Solar Flares. Reactive: On a Solar Flare, +12.',
    run(a) { a.score(4); },
    L: [{ on: 'storm', r: 'map', run(a) { a.score(12); } }],
    rb: { p: 4, react: { p: 12, rate: 0.06 }, u: 0.5, rel: 0.97, why: 'Steady scorer with storm insurance.' },
  },
  {
    id: 'stellar_smelter', n: 'Stellar Smelter', cl: 'helio', t: 'A', r: 'R', tags: ['Metal', 'Heat'], trig: 'sunlit', pts: 16,
    text: 'Every Sunlit turn: Turn a Metal or Scrap within range 2 into Alloy, +16, and heat this hex. Without one, +8.',
    run(a) { if (convert(a, ['Metal', 'Scrap'], 'Alloy', 2)) { a.score(16); a.addSt(a.k, 'Hot'); } else a.score(8); },
    rb: { p: 10, u: 2.5, rel: 0.96, why: 'Fast Alloy engine.' },
  },
  {
    id: 'daystar_engine', n: 'Daystar Engine', cl: 'helio', t: 'A', r: 'R', tags: ['Solar', 'Motion'], trig: 'sunlit', pts: 5,
    text: 'Every Sunlit turn: store a Charge (max 3), +5. Ability (once per era): spend 3 Charges to advance the light one phase now; +4 per building that changes light (max +24).',
    run(a) { const m = a.mem(); if ((m.ch || 0) < 3) m.ch = (m.ch || 0) + 1; a.score(5); },
    ability: {
      label: 'Advance the sun', can: (a) => (a.mem().ch || 0) >= 3,
      run(a) { a.mem().ch -= 3; const n = a.rotateLight(); a.score(Math.min(24, 4 * n)); },
    },
    rb: { p: 5, ability: { p: 8.13, u: 6 }, rel: 0.51, why: 'Extra rotation re-triggers every rotation card on the map.' },
  },
  {
    id: 'corona_crown', n: 'Corona Crown', cl: 'helio', t: 'A', r: 'R', tags: ['Solar', 'Power'], trig: 'event', pts: 7,
    text: 'Reactive: Up to twice per turn, when a different Solar building within range 2 activates, repeat it and score +7.',
    L: [{
      on: 'act', r: 2, run(a, b, ev) {
        const s = a.byId(ev.src);
        if (!s || !a.has(s, 'Solar') || !a.canRepeat(s) || ev.rep) return;
        if (a.repeat(s)) a.score(7);
      },
    }],
    rb: { react: { p: 7, rate: 0.77 }, u: 2, why: 'Doubles the best Solar cards nearby.' },
  },

  // ======================= CRYOSTEAD ENCLAVE =======================
  {
    id: 'ice_harvester', n: 'Ice Harvester', cl: 'cryo', t: 'E', r: 'C', tags: ['Ice', 'Extraction'], trig: 'every', every: 2, pts: 6,
    text: 'Every 2 turns: Melt one unit of an Ice within range 2 into Water. +6. With no Ice in range, on a Shadow turn it refreezes a Water within range 2 into Ice instead, +2.',
    run(a) {
      if (convert(a, 'Ice', 'Water', 2)) return a.score(6);
      if (!a.lit(a.k) && convert(a, 'Water', 'Ice', 2)) a.score(2);
    },
    rb: { p: 6, u: 1.5, rel: 0.36, why: 'Starter. Ice deposits hold 3 units; it refreezes its own Water in Shadow, so the cycle renews.' },
  },
  {
    id: 'shade_screen', n: 'Shade Screen', cl: 'cryo', t: 'E', r: 'C', tags: ['Cold', 'Structure'], trig: 'every', every: 2, pts: 2,
    text: 'On Build: This hex and adjacent hexes become permanently Shadowed, +2. Every 2 turns: +1 per adjacent Cold building or Ice (max 4). Adjacent Cold buildings score +1 when they activate.',
    build(a) { for (const k of a.near(a.k, 1).concat([a.k])) if (a.kind(k) !== 'orbit') a.addSt(k, 'Shade'); a.score(2); },
    run(a) { const n = Math.min(4, a.bldNear(a.k, '#Cold', 1).length + a.resNear(a.k, 'Ice', 1).length); if (n) a.score(n); },
    aura(a, self, actor) { return a.has(actor, 'Cold') && a.dist(self.k, actor.k) === 1 ? 1 : 0; },
    rb: { once: 2, p: 2.5, rel: 0.67, passive: { p: 1, rate: 0.25 }, u: 0.5, why: 'Enabler: guarantees Shadow for Frost Trap/Absolute Engine.' },
  },
  {
    id: 'frost_trap', n: 'Frost Trap', cl: 'cryo', t: 'E', r: 'C', tags: ['Cold', 'Volatile'], trig: 'event', pts: 4,
    text: 'Reactive: When Water appears on a Shadow hex within range 2, freeze it back into Ice. +4.',
    L: [{ on: 'create', r: 2, run(a, b, ev) { if (ev.res === 'Water' && !a.lit(ev.k)) { a.transform(ev.k, 'Ice'); a.score(4); } } }],
    rb: { react: { p: 3, rate: 0.4 }, u: 1.5, why: 'Makes Ice renewable; core of the freeze–melt loop.' },
  },
  {
    id: 'vapor_collector', n: 'Vapor Collector', cl: 'cryo', t: 'E', r: 'U', tags: ['Water', 'Pressure'], trig: 'every', every: 2, pts: 3,
    text: 'Reactive: When Ice melts within range 2, create an extra Water nearby, +3. Every 2 turns: condense a Water onto an adjacent empty hex and score +2 per Water or Ice within range 2 (max 2).',
    L: [{ on: 'melt', r: 2, run(a, b, ev) { if (a.create('Water', ev.k, 1)) a.score(3); } }],
    run(a) { a.create('Water', a.k, 1); const n = resCount(a, ['Water', 'Ice'], 2, 2); if (n) a.score(2 * n); },
    rb: { p: 3.6, u: 1.5, react: { p: 3, rate: 0.12 }, u2: 2, rel: 0.48, why: 'Water engine for Algae, Galleys and Stills.' },
  },
  {
    id: 'brine_tank', n: 'Brine Tank', cl: 'cryo', t: 'E', r: 'C', tags: ['Water', 'Storage'], trig: 'every', every: 2, pts: 4,
    text: 'Every 2 turns: Release a Water onto an adjacent empty hex, +4. Reactive: When Water within range 2 is consumed, +2.',
    run(a) { if (a.create('Water', a.k, 1)) a.score(4); },
    L: [{ on: 'consume', r: 2, run(a, b, ev) { if (ev.res === 'Water') a.score(2); } }],
    rb: { p: 4, u: 1.5, rel: 0.22, react: { p: 2, rate: 0.08 }, why: 'Water from nothing; slow.' },
  },
  {
    id: 'thermal_valve', n: 'Thermal Valve', cl: 'cryo', t: 'M', r: 'C', tags: ['Cold', 'Heat'], trig: 'event', pts: 5,
    text: 'Reactive: When a hex within range 2 becomes Hot, cool it. +5, +3 more if Ice is within range 2.',
    L: [{ on: 'heat', r: 2, run(a, b, ev) { a.rmSt(ev.k, 'Hot'); a.score(5 + (a.resNear(a.k, 'Ice', 2).length ? 3 : 0)); } }],
    rb: { react: { p: 8, rate: 0.25 }, u: 1, why: 'Bigger Radiator Fin for heat-exchange shells.' },
  },
  {
    id: 'cryo_vault', n: 'Cryo Vault', cl: 'cryo', t: 'M', r: 'U', tags: ['Storage', 'Cold'], trig: 'turn', pts: 1,
    text: 'Every turn: +1 per adjacent resource token (max 4).',
    run(a) { const n = Math.min(4, a.near(a.k, 1).filter((k) => a.res(k)).length); if (n) a.score(n); },
    rb: { p: 3, rel: 1.25, why: 'Reliable value but competes with converters for space.' },
  },
  {
    id: 'sublimator', n: 'Sublimator', cl: 'cryo', t: 'M', r: 'C', tags: ['Ice', 'Gas'], trig: 'every', every: 2, pts: 9,
    text: 'Every 2 turns: Turn an Ice within range 2 into Gas, +9 (+4 more if that hex or this one is Hot).',
    run(a) {
      const k = firstRes(a, 'Ice', 2);
      if (!k) return;
      const hot = a.st(k, 'Hot') || a.st(a.k, 'Hot');
      a.transform(k, 'Gas'); a.score(9 + (hot ? 4 : 0));
    },
    rb: { p: 9.5, u: 1.5, rel: 0.33, why: 'Bridges Ice into the Gas/Fuel economy.' },
  },
  {
    id: 'frost_lens', n: 'Frost Lens', cl: 'cryo', t: 'M', r: 'U', tags: ['Crystal', 'Cold'], trig: 'event', pts: 5, cap: 4,
    text: 'Reactive: Each time a Crystal or Ice within range 2 enters Shadow, +5 (up to 4 times per turn).',
    L: [{ on: 'enterShadow', r: 2, run(a, b, ev) { if (a.res(ev.k) === 'Crystal' || a.res(ev.k) === 'Ice') a.score(5); } }],
    rb: { react: { p: 4, rate: 0.78 }, why: 'Scales with Crystals/Ice around it.' },
  },
  {
    id: 'pressure_still', n: 'Pressure Still', cl: 'cryo', t: 'M', r: 'C', tags: ['Water', 'Pressure'], trig: 'every', every: 2, pts: 7,
    text: 'Every 2 turns: Consume a Water within range 2 to Pressurize this and adjacent hexes for 3 turns. +7.',
    run(a) { const k = firstRes(a, 'Water', 2); if (!k) return; a.consume(k); pressurize(a, a.near(a.k, 1).concat([a.k]), 3); a.score(7); },
    rb: { p: 7, u: 1.5, rel: 0.37, why: "Cryostead's route into Pressure/Habitat scoring." },
  },
  {
    id: 'comet_hook', n: 'Comet Hook', cl: 'cryo', t: 'A', r: 'R', tags: ['Orbital', 'Ice'], trig: 'every', every: 2, pts: 5,
    text: 'Every 2 turns: Pull an Ice chunk (2 units) onto an adjacent empty hex (+6), then +5 per Ice within range 2 (max 3). Reactive: On any meteor impact, create Ice near it, +6.',
    run(a) {
      const k = a.create('Ice', a.k, 1);
      if (k) { a.S.hexes[k].amt = 2; a.score(6); }
      const n = resCount(a, 'Ice', 2, 3);
      if (n) a.score(5 * n);
    },
    L: [{ on: 'impact', r: 'map', run(a, b, ev) { if (a.create('Ice', ev.k, 2)) a.score(6); } }],
    rb: { p: 10, u: 2, rel: 0.82, react: { p: 6, rate: 0.2 }, why: 'Renewable Ice source for an otherwise finite engine.' },
  },
  {
    id: 'glacier_loom', n: 'Glacier Loom', cl: 'cryo', t: 'A', r: 'U', tags: ['Ice', 'Structure'], trig: 'turn', pts: 8,
    text: 'Every turn in Shadow: Turn an adjacent Dust/Regolith into Ice (+9); if none, create an Ice on an adjacent empty hex (+7). In Sunlight: +5.',
    run(a) {
      if (a.lit(a.k)) return a.score(5);
      if (convert(a, '#Dust', 'Ice')) return a.score(9);
      if (a.create('Ice', a.k, 1)) a.score(7);
    },
    rb: { p: 6.5, u: 1, rel: 0.48, why: 'Ice generation; in a Cavern it fires every turn.' },
  },
  {
    id: 'absolute_engine', n: 'Absolute Engine', cl: 'cryo', t: 'A', r: 'R', tags: ['Cold', 'Power'], trig: 'shadow', pts: 12,
    text: 'Every Shadow turn: If its network has 3+ Cold buildings (including itself), +12 and repeat a Cold building within range 2. Otherwise +4.',
    run(a) {
      const n = 1 + a.net().filter((x) => a.has(x, 'Cold')).length;
      if (n >= 3) { a.score(12); repeatOne(a, '#Cold', 2); } else a.score(4);
    },
    rb: { p: 9.5, u: 2, rel: 1.32, why: 'Cold-network capstone; caverns are always Shadow.' },
  },
  {
    id: 'permafrost_cathedral', n: 'Permafrost Cathedral', cl: 'cryo', t: 'A', r: 'U', tags: ['Cold', 'Shield'], trig: 'turn', pts: 2,
    text: 'Every turn: +2 per Cold-tagged token or building within range 2 (max 3). Shields buildings within range 2 from impacts and tremors.',
    run(a) {
      const n = Math.min(3, a.resNear(a.k, '#Cold', 2).length + a.bldNear(a.k, '#Cold', 2).length);
      if (n) a.score(2 * n);
    },
    shields: (a, self, k) => a.dist(self.k, k) <= 2,
    rb: { p: 4.2, u: 1, rel: 1.01, why: 'Area protection + steady Cold scoring.' },
  },
  {
    id: 'cryo_tide', n: 'Cryo-Tide Reactor', cl: 'cryo', t: 'A', r: 'R', tags: ['Ice', 'Power'], trig: 'every', every: 2, pts: 9, cap: 3,
    text: 'Reactive: Whenever Ice becomes Water or Water becomes Ice within range 2, +9. Once per turn, repeat the building that caused it. Every 2 turns: +3 per Ice or Water within range 2 (max 3).',
    L: [{
      on: 'transform', r: 2, run(a, b, ev) {
        if (!((ev.from === 'Ice' && ev.to === 'Water') || (ev.from === 'Water' && ev.to === 'Ice'))) return;
        a.score(9);
        const s = a.byId(ev.src);
        if (s && a.canRepeat(s) && a.once('tide')) a.repeat(s);
      },
    }],
    run(a) { const n = resCount(a, ['Ice', 'Water'], 2, 3); if (n) a.score(3 * n); },
    rb: { react: { p: 7, rate: 0.41 }, u: 1.5, rel: 0.56, why: 'Freeze–melt capstone; cap 3 keeps loops bounded.' },
  },

  // ======================= VERDANT EXODUS =======================
  {
    id: 'spore_seeder', n: 'Spore Seeder', cl: 'verd', t: 'E', r: 'C', tags: ['Bio', 'Growth'], trig: 'every', every: 2, pts: 6,
    text: 'On Build: Turn up to 2 adjacent Organic Seam/Bio-Loam units into Biomass, +3 each. Every 2 turns: convert one within range 2 (+6); if none, the spores drift and seed an Organic Seam on an empty hex within range 2 (+3).',
    build(a) { let n = 0; for (const k of a.resNear(a.k, ['Seam', 'Loam'], 1)) { if (n++ >= 2) break; a.transform(k, 'Biomass'); a.score(3); } },
    run(a) {
      if (convert(a, ['Seam', 'Loam'], 'Biomass', 2)) return a.score(6);
      if (a.create('Seam', a.k, 2)) a.score(3);
    },
    rb: { once: 4, p: 3.4, u: 1.5, rel: 0.26, why: 'Starter: self-sustaining seed → Biomass loop.' },
  },
  {
    id: 'algae_tank', n: 'Algae Tank', cl: 'verd', t: 'E', r: 'C', tags: ['Bio', 'Water'], trig: 'every', every: 2, pts: 6,
    text: 'Every 2 turns: Turn a Water within range 2 into Biomass, +6. Without Water, +2 per Bio token within range 2 (max 2).',
    run(a) {
      if (convert(a, 'Water', 'Biomass', 2)) return a.score(6);
      const n = resCount(a, '#Bio', 2, 2);
      if (n) a.score(2 * n);
    },
    rb: { p: 4.4, u: 1.2, rel: 0.61, why: 'Needs a Water feed (Cryostead, Brine, Vapor, Life Support).' },
  },
  {
    id: 'carbon_net', n: 'Carbon Net', cl: 'verd', t: 'E', r: 'C', tags: ['Bio', 'Gas'], trig: 'every', every: 3, pts: 3,
    text: 'Reactive: When Gas or Biomass appears within range 2, +2 (+2 more if Water is within range 2). Every 3 turns: +1 per Bio token within range 2 (max 3).',
    L: [{ on: 'create', r: 2, run(a, b, ev) { if (ev.res === 'Gas' || ev.res === 'Biomass') a.score(2 + (a.resNear(a.k, 'Water', 2).length ? 2 : 0)); } }],
    run(a) { const n = resCount(a, '#Bio', 2, 3); if (n) a.score(n); },
    rb: { p: 2, rel: 0.52, react: { p: 2.7, rate: 0.37 }, why: 'Cheap payoff for growth districts.' },
  },
  {
    id: 'root_tunnel', n: 'Root Tunnel', cl: 'verd', t: 'E', r: 'U', tags: ['Bio', 'Link'], trig: 'every', every: 2, pts: 1,
    text: 'Link. Bio buildings in its network score +1 whenever they activate. Every 2 turns: +1 per Bio building in its network (max 2).',
    aura(a, self, actor) { return a.has(actor, 'Bio') && a.inNet(self, actor) ? 1 : 0; },
    run(a) { const n = Math.min(2, a.net().filter((x) => a.has(x, 'Bio')).length); if (n) a.score(n); },
    rb: { p: 1.5, rel: 1.11, passive: { p: 1, rate: 1.8 }, why: 'Network amplifier for gardens.' },
  },
  {
    id: 'oxygen_orchard', n: 'Oxygen Orchard', cl: 'verd', t: 'E', r: 'C', tags: ['Bio', 'Pressure'], trig: 'every', every: 2, pts: 6,
    text: 'Reactive: When Biomass appears within range 2, Pressurize this and adjacent hexes for 3 turns, +6. Every 2 turns: +1 per adjacent Bio building, +2 more if its own hex is Pressurized.',
    L: [{ on: 'create', r: 2, run(a, b, ev) { if (ev.res === 'Biomass') { pressurize(a, a.near(a.k, 1).concat([a.k]), 3); a.score(6); } } }],
    run(a) { const s = countNear(a, '#Bio', 1, 3) + (a.st(a.k, 'Pressure') ? 2 : 0); if (s) a.score(s); },
    rb: { p: 2, rel: 0.52, react: { p: 6, rate: 0.18 }, u: 0.8, why: 'Bio→Pressure bridge to Hearthline.' },
  },
  {
    id: 'myco_bloom', n: 'Myco Bloom', cl: 'verd', t: 'M', r: 'C', tags: ['Growth', 'Bio'], trig: 'every', every: 2, pts: 5,
    text: 'Every 2 turns: Turn an Organic Seam, Bio-Loam or Dust within range 2 into Biomass, +9; if none, seed an Organic Seam beside this, +3. Reactive: When an adjacent building is destroyed, grow Biomass on its hex, +5.',
    run(a) {
      if (convert(a, ['Seam', 'Loam', '#Dust'], 'Biomass', 2)) return a.score(9);
      if (a.create('Seam', a.k, 1)) a.score(3);
    },
    L: [{ on: 'destroy', r: 1, run(a, b, ev) { if (a.createAt('Biomass', ev.k)) a.score(5); } }],
    rb: { p: 4.6, u: 1.5, rel: 0.54, react: { p: 5, rate: 0.04 }, why: 'Salvage-friendly grower.' },
  },
  {
    id: 'symbiotic_cradle', n: 'Symbiotic Cradle', cl: 'verd', t: 'M', r: 'U', tags: ['Bio', 'Habitat'], trig: 'every', every: 2, pts: 4,
    text: 'Every 2 turns: +4 per adjacent building on a Pressurized hex (max 3), +3 if its own hex is Pressurized, +1 per adjacent Bio building.',
    run(a) {
      const n = countNear(a, (b) => pressurized(a, b), 1, 3);
      const s = 4 * n + (a.st(a.k, 'Pressure') ? 3 : 0) + countNear(a, '#Bio', 1, 6);
      if (s) a.score(s);
    },
    rb: { p: 7.8, rel: 0.74, why: 'Pressure-district payoff.' },
  },
  {
    id: 'lichen_harvester', n: 'Lichen Harvester', cl: 'verd', t: 'M', r: 'C', tags: ['Bio', 'Dust'], trig: 'every', every: 2, pts: 8,
    text: 'Every 2 turns: Turn a Regolith/Dust within range 2 into Organic Seam, +8. Otherwise +2 per adjacent Bio building (max 3).',
    run(a) {
      if (convert(a, '#Dust', 'Seam', 2)) return a.score(8);
      const n = countNear(a, '#Bio', 1, 3);
      if (n) a.score(2 * n);
    },
    rb: { p: 5, u: 1, rel: 0.52, why: 'Turns Dust into future Biomass.' },
  },
  {
    id: 'radiotrophic_garden', n: 'Radiotrophic Garden', cl: 'verd', t: 'M', r: 'U', tags: ['Bio', 'Radiation'], trig: 'every', every: 2, pts: 7, radOk: true,
    text: 'Reactive: When Radiation appears within range 2, +7 and turn an Organic Seam within range 2 into Biomass. Every 2 turns: +3 per Radiated hex within range 2 (max 4).',
    L: [{ on: 'radiation', r: 2, run(a) { a.score(7); convert(a, 'Seam', 'Biomass', 2); } }],
    run(a) { const n = Math.min(4, radiated(a, 2)); if (n) a.score(3 * n); },
    rb: { p: 6, rel: 0.56, react: { p: 7, rate: 0.23 }, u: 0.5, why: 'Turns Umbra side-effects into value.' },
  },
  {
    id: 'nectar_reactor', n: 'Nectar Reactor', cl: 'verd', t: 'M', r: 'C', tags: ['Bio', 'Fuel'], trig: 'every', every: 2, pts: 9,
    text: 'Every 2 turns: Turn a Biomass within range 2 into Fuel. +9.',
    run(a) { if (convert(a, 'Biomass', 'Fuel', 2)) a.score(9); },
    rb: { p: 9, u: 0.8, rel: 0.35, why: 'Biomass sink; Fuel feeds Ramjet/Antimatter.' },
  },
  {
    id: 'tendril_bridge', n: 'Tendril Bridge', cl: 'verd', t: 'A', r: 'U', tags: ['Bio', 'Link'], trig: 'turn', pts: 1, link: 3,
    text: 'Link (reach 3): connects buildings up to 3 hexes away. Every turn: +1 per connected building (max 2) and +1 more per connected Bio building (max 3).',
    run(a) { const net = a.net();
      const n = Math.min(2, net.length) + Math.min(3, net.filter((x) => a.has(x, 'Bio')).length);
      if (n) a.score(n); },
    rb: { p: 3.6, u: 1.5, rel: 1.05, why: 'Long link for scattered gardens.' },
  },
  {
    id: 'bloomstorm_lab', n: 'Bloomstorm Laboratory', cl: 'verd', t: 'A', r: 'R', tags: ['Bio', 'Growth'], trig: 'every', every: 2, pts: 5, cap: 3,
    text: 'Reactive: Each Biomass appearing within range 2 scores +3; every third one also grows 2 extra Biomass nearby, +8. Every 2 turns: +4 per Biomass within range 2 (max 4).',
    L: [{
      on: 'create', r: 2, run(a, b, ev) {
        if (ev.res !== 'Biomass') return;
        const m = a.mem(); m.n = (m.n || 0) + 1;
        if (m.n % 3 === 0) { a.create('Biomass', ev.k, 2); a.create('Biomass', ev.k, 2); a.score(8); } else a.score(3);
      },
    }],
    run(a) { const n = resCount(a, 'Biomass', 2, 4); if (n) a.score(4 * n); },
    rb: { p: 10, rel: 0.6, react: { p: 4.6, rate: 0.51 }, u: 1.5, why: 'Exponential Biomass; capped at 3 activations/turn.' },
  },
  {
    id: 'worldroot', n: 'Worldroot', cl: 'verd', t: 'A', r: 'U', tags: ['Bio', 'Anchor'], trig: 'every', every: 2, pts: 5,
    text: 'On Build: Stabilize adjacent hexes (+2 per Cavern or Unstable hex). Reactive: When Biomass appears within range 2, make that hex Stable, +5. Every 2 turns: the roots creep – with fewer than 3 adjacent Bio buildings or Biomass, plant Biomass beside it; then +4 per adjacent Bio building or Biomass (max 3).',
    build(a) {
      let s = 0;
      for (const k of a.near(a.k, 1)) {
        const kd = a.kind(k);
        if (kd === 'orbit' || kd === 'rock') continue;
        if (kd === 'cavern' || a.st(k, 'Unstable')) s += 2;
        a.rmSt(k, 'Unstable'); a.addSt(k, 'Stable');
      }
      a.score(Math.max(2, s));
    },
    L: [{ on: 'create', r: 2, run(a, b, ev) { if (ev.res === 'Biomass') { a.addSt(ev.k, 'Stable'); a.score(5); } } }],
    run(a) {
      const count = () => Math.min(3, a.bldNear(a.k, '#Bio', 1).length + a.resNear(a.k, 'Biomass', 1).length);
      if (count() < 3) a.create('Biomass', a.k, 1);
      const n = count();
      if (n) a.score(4 * n);
    },
    rb: { once: 3, p: 8, rel: 0.6, react: { p: 5, rate: 0.3 }, u: 0.5, why: 'Bio Anchor; counts for Aurelia stabilization.' },
  },
  {
    id: 'living_shipyard', n: 'Living Shipyard', cl: 'verd', t: 'A', r: 'R', tags: ['Bio', 'Orbital'], trig: 'every', every: 2, pts: 16,
    text: 'Every 2 turns: Launch a Biomass within range 2 of this, or adjacent to a connected building, into orbit as Bio Cargo (triggers Arrival). +16.',
    run(a) {
      for (const b of [a.b].concat(a.net())) {
        const k = firstRes(a, 'Biomass', b.id === a.b.id ? 2 : 1, b.k);
        if (k) { a.launch(k); a.score(16); return; }
      }
    },
    rb: { p: 13, u: 2, rel: 0.9, why: 'Bio-to-orbit export; Arrival triggers Kepler/Hearthline payoffs.' },
  },
  {
    id: 'genesis_choir', n: 'Genesis Choir', cl: 'verd', t: 'A', r: 'R', tags: ['Bio', 'Growth'], trig: 'every', every: 2, pts: 3,
    text: 'Reactive (up to twice per turn): When Biomass appears within range 2, +3 per Bio building within range 2 (max +12). The first time each turn, also repeat an adjacent Bio building. Every 2 turns: +3 per Bio building or Biomass within range 2 (max 4).',
    L: [{
      on: 'create', r: 2, run(a, b, ev) {
        if (ev.res !== 'Biomass') return;
        if (a.once('choir')) repeatOne(a, '#Bio', 1);
        a.score(Math.min(12, 3 * Math.max(1, a.bldNear(a.k, '#Bio', 2).length)));
      },
    }],
    run(a) { const n = Math.min(4, a.bldNear(a.k, '#Bio', 2).length + a.resNear(a.k, 'Biomass', 2).length); if (n) a.score(3 * n); },
    rb: { react: { p: 8, rate: 0.47 }, u: 2, rel: 0.8, why: 'Bio repeat capstone.' },
  },

  // ======================= SYNAPSE CIRCUIT =======================
  {
    id: 'relay_pylon', n: 'Relay Pylon', cl: 'syn', t: 'E', r: 'C', tags: ['Signal', 'Link'], trig: 'every', every: 2, pts: 2,
    text: 'Link. Reactive: When a Signal or Link building is placed within range 2, +2. Every 2 turns: +1 per Signal building in its network (max 2).',
    L: [{ on: 'placed', r: 2, run(a, b, ev) { const n = a.byId(ev.src); if (n && (a.has(n, 'Signal') || a.has(n, 'Link'))) a.score(2); } }],
    run(a) { const n = Math.min(2, a.net().filter((x) => a.has(x, 'Signal')).length); if (n) a.score(n); },
    rb: { p: 1.6, rel: 1.11, react: { p: 2, rate: 0.42 }, u: 0.5, why: 'Network glue; small scoring.' },
  },
  {
    id: 'survey_drone_port', n: 'Survey Drone Port', cl: 'syn', t: 'E', r: 'C', tags: ['Drone', 'Signal'], trig: 'every', every: 2, pts: 3,
    text: 'On Build and every 2 turns: Reveal a buried deposit within range 3 (+5); if none remain, +2.',
    build(a) { this.run(a); },
    run(a) {
      const k = a.near(a.k, 3).find((x) => a.hidden(x) && a.kind(x) !== 'rock');
      if (k) { a.reveal(k); a.score(5); } else a.score(2);
    },
    rb: { once: 4, p: 3, u: 1, rel: 0.8, why: 'Information + new targets for converters.' },
  },
  {
    id: 'trigger_coil', n: 'Trigger Coil', cl: 'syn', t: 'E', r: 'U', tags: ['Automation', 'Power'], trig: 'event', pts: 4,
    text: 'Reactive: Once per turn, when an adjacent building activates from its timer, repeat it. +4.',
    L: [{
      on: 'periodic', r: 1, run(a, b, ev) {
        const s = a.byId(ev.src);
        if (s && a.canRepeat(s) && a.once('coil') && a.repeat(s)) a.score(4);
      },
    }],
    rb: { react: { p: 4, rate: 0.46 }, u: 2, why: 'Repeats the best adjacent periodic each turn.' },
  },
  {
    id: 'cargo_bot', n: 'Cargo Bot', cl: 'syn', t: 'E', r: 'C', tags: ['Drone', 'Cargo'], trig: 'every', every: 2, pts: 6,
    text: 'Every 2 turns: Pack a loose resource within range 2 into Cargo. +6.',
    run(a) { if (convert(a, looseAny, 'Cargo', 2)) a.score(6); },
    rb: { p: 6, u: 1, rel: 0.25, why: 'Feeds launches; competes with other consumers.' },
  },
  {
    id: 'array_beacon', n: 'Array Beacon', cl: 'syn', t: 'E', r: 'C', tags: ['Signal', 'Power'], trig: 'every', every: 2, pts: 3,
    text: 'Every 2 turns: Repeat a different Signal building within range 2, +3. If none, +3 anyway.',
    run(a) { repeatOne(a, (b) => a.has(b, 'Signal') && b.c !== 'array_beacon', 2); a.score(3); },
    rb: { p: 3, u: 1.5, rel: 0.69, why: 'Starter; repeat engine for Signal shells.' },
  },
  {
    id: 'sensor_weave', n: 'Sensor Weave', cl: 'syn', t: 'M', r: 'U', tags: ['Signal', 'Crystal'], trig: 'every', every: 2, pts: 2,
    text: 'Every 2 turns: +2 per Crystal within range 2 (max 3). With 3 Crystals, also repeat a Signal building within range 2.',
    run(a) {
      const n = resCount(a, '#Crystal', 2, 3);
      if (!n) return;
      a.score(2 * n);
      if (n >= 3) repeatOne(a, '#Signal', 2);
    },
    rb: { p: 4, u: 1, rel: 1.5, why: 'Crystal payoff that also cycles Signals.' },
  },
  {
    id: 'data_scriptorium', n: 'Data Scriptorium', cl: 'syn', t: 'M', r: 'U', tags: ['Data', 'Signal'], trig: 'turn', pts: 1, late: true,
    text: 'End of each turn: +1 per distinct tag among buildings in its network that activated this turn (max 3).',
    run(a) {
      const ids = new Set(a.net().map((x) => x.id));
      const n = Math.min(3, distinctTagsActivated(a, (e) => ids.has(e.id)));
      if (n) a.score(n);
    },
    rb: { p: 2.8, rel: 1.25, why: 'Rewards dense, diverse networks.' },
  },
  {
    id: 'replicator_bay', n: 'Replicator Bay', cl: 'syn', t: 'M', r: 'C', tags: ['Drone', 'Metal'], trig: 'event', pts: 6, cap: 3,
    text: 'Reactive: When a Metal-tagged resource is consumed within range 2, +6 (up to 3 times per turn).',
    L: [{ on: 'consume', r: 2, run(a, b, ev) { if (a.is(ev.res, '#Metal')) a.score(6); } }],
    rb: { react: { p: 5, rate: 0.43 }, why: 'Pure payoff for Metal shells.' },
  },
  {
    id: 'path_optimizer', n: 'Path Optimizer', cl: 'syn', t: 'M', r: 'C', tags: ['Automation', 'Link'], trig: 'every', every: 2, pts: 1,
    text: 'Link. Reactive: When a building joins its network, +1. Every 2 turns: +1 per Automation, Drone or Signal building in its network (max 3).',
    L: [{ on: 'placed', r: 'net', run(a) { a.score(1); } }],
    run(a) { const n = Math.min(3, a.net().filter((x) => ['Automation', 'Drone', 'Signal'].some((t) => a.has(x, t))).length); if (n) a.score(n); },
    rb: { p: 2, rel: 1.18, react: { p: 1, rate: 0.84 }, why: 'Network growth reward.' },
  },
  {
    id: 'echo_switch', n: 'Echo Switch', cl: 'syn', t: 'M', r: 'R', tags: ['Signal', 'Automation'], trig: 'turn', pts: 4,
    text: 'Every turn: Repeat the most recently activated building within range 2. +4.',
    run(a) { const t = a.lastActive(2); if (t && a.repeat(t)) a.score(4); },
    rb: { p: 4, u: 2, rel: 0.69, why: 'Generic repeat of your latest effect.' },
  },
  {
    id: 'swarm_dock', n: 'Swarm Dock', cl: 'syn', t: 'A', r: 'U', tags: ['Drone', 'Storage'], trig: 'every', every: 2, pts: 9,
    text: 'Every 2 turns: Repeat up to 2 different Automation, Drone or Power buildings within range 2. +9.',
    run(a) {
      const sel = (b) => ['Automation', 'Drone', 'Power'].some((t) => a.has(b, t));
      const r1 = repeatOne(a, sel, 2);
      if (r1) { repeatOne(a, sel, 2, [r1.id]); a.score(9); }
    },
    rb: { p: 9, u: 3, rel: 0.88, why: 'Two repeats every other turn.' },
  },
  {
    id: 'quantum_repeater', n: 'Quantum Repeater', cl: 'syn', t: 'A', r: 'R', tags: ['Signal', 'Exotic'], trig: 'every', every: 3, pts: 8,
    text: 'Reactive: Once per turn, when a building within range 2 is repeated, repeat a different building within range 2, +8. Every 3 turns: repeat a building within range 2, +4.',
    L: [{
      on: 'repeat', r: 2, run(a, b, ev) {
        if (!a.once('qr')) return;
        if (repeatOne(a, null, 2, [ev.src])) a.score(8);
      },
    }],
    run(a) { if (repeatOne(a, null, 2)) a.score(4); },
    rb: { p: 4, u: 3, rel: 0.8, react: { p: 8, rate: 0.45 }, u2: 2, why: 'Repeat chains; once/turn.' },
  },
  {
    id: 'ghost_protocol', n: 'Ghost Protocol', cl: 'syn', t: 'A', r: 'C', tags: ['Signal', 'Salvage'], trig: 'every', every: 2, pts: 2,
    text: 'Reactive: When a building within range 2 is destroyed, +5 and leave Scrap on its hex. Every 2 turns: +2 per Signal building in its network (max 2).',
    L: [{ on: 'destroy', r: 2, run(a, b, ev) { a.createAt('Scrap', ev.k); a.score(5); } }],
    run(a) { const n = Math.min(2, a.net().filter((x) => a.has(x, 'Signal')).length); if (n) a.score(2 * n); },
    rb: { p: 3.2, rel: 1.22, react: { p: 5, rate: 0.21 }, u: 0.3, why: 'Wreckborn crossover; modest standalone.' },
  },
  {
    id: 'network_brain', n: 'Network Brain', cl: 'syn', t: 'A', r: 'R', tags: ['Automation', 'Data'], trig: 'turn', pts: 1, late: true,
    text: 'End of each turn: +1 per distinct tag among network buildings that activated this turn (max +7).',
    run(a) {
      const ids = new Set(a.net().map((x) => x.id).concat([a.b.id]));
      const n = Math.min(7, distinctTagsActivated(a, (e) => ids.has(e.id)));
      if (n) a.score(n);
    },
    rb: { p: 6, rel: 1.03, why: 'Network capstone.' },
  },
  {
    id: 'cascade_singularity', n: 'Cascade Singularity', cl: 'syn', t: 'A', r: 'U', tags: ['Automation', 'Signal'], trig: 'event', pts: 7,
    text: 'Reactive: Once per turn, when a building in its network is repeated, repeat a different network building. +7.',
    L: [{
      on: 'repeat', r: 'net', run(a, b, ev) {
        if (!a.once('cs')) return;
        const t = a.net().find((x) => x.id !== ev.src && a.canRepeat(x) && x.acts < 2);
        if (t && a.repeat(t)) a.score(7);
      },
    }],
    rb: { react: { p: 7, rate: 0.59 }, u: 2, why: 'Payoff for already-repeating networks.' },
  },

  // ======================= WRECKBORN FLEET =======================
  {
    id: 'scrap_picker', n: 'Scrap Picker', cl: 'wreck', t: 'E', r: 'C', tags: ['Salvage', 'Scrap'], trig: 'event', pts: 4,
    text: 'On Build: Drop 2 Scrap on adjacent empty hexes. Reactive: When Scrap or Wreckage within range 2 is consumed, +4.',
    build(a) { if (a.create('Scrap', a.k, 1)) a.score(1); a.create('Scrap', a.k, 1); },
    L: [{ on: 'consume', r: 2, run(a, b, ev) { if (a.is(ev.res, '#Scrap')) a.score(4); } }],
    rb: { once: 5, react: { p: 4, rate: 0.3 }, why: 'Salvage payoff with a starting stock.' },
  },
  {
    id: 'derelict_tug', n: 'Derelict Tug', cl: 'wreck', t: 'E', r: 'C', tags: ['Salvage', 'Cargo'], trig: 'every', every: 2, pts: 4,
    text: 'On Build: Tow up to 2 Wreckage within range 3 next to this, +3 each. Every 2 turns: haul in a new Wreckage beside this (+5); if there is no room, +2.',
    build(a) {
      let n = 0;
      for (const k of a.resNear(a.k, 'Wreck', 3)) {
        if (n >= 2) break;
        if (a.dist(k, a.k) === 1) continue;
        const t = a.near(a.k, 1).find((x) => a.free(x));
        if (!t) break;
        a.move(k, t); a.score(3); n++;
      }
    },
    run(a) { if (a.create('Wreck', a.k, 1)) a.score(5); else a.score(2); },
    rb: { once: 4, p: 3.5, u: 1, rel: 0.54, why: 'Gathers and generates salvage.' },
  },
  {
    id: 'fuse_charger', n: 'Fuse Charger', cl: 'wreck', t: 'E', r: 'C', tags: ['Explosive', 'Heat'], trig: 'every', every: 2, pts: 6,
    text: 'Every 2 turns: Consume a Scrap within range 2 and heat its hex. +6.',
    run(a) { const k = firstRes(a, 'Scrap', 2); if (!k) return; a.consume(k); a.addSt(k, 'Hot'); a.score(6); },
    rb: { p: 6, u: 1, rel: 0.47, why: 'Scrap sink + Heat source.' },
  },
  {
    id: 'patchwork_hull', n: 'Patchwork Hull', cl: 'wreck', t: 'E', r: 'C', tags: ['Structure', 'Scrap'], trig: 'every', every: 2, pts: 3,
    text: 'Every 2 turns: Shed a Scrap onto an adjacent empty hex, +2, and +1 per Scrap within range 2 (max 2). Reactive: When an adjacent building is destroyed, become Shielded, +4.',
    run(a) { a.create('Scrap', a.k, 1); a.score(2 + resCount(a, 'Scrap', 2, 2)); },
    L: [{ on: 'destroy', r: 1, run(a) { a.addSt(a.k, 'Shielded'); a.score(4); } }],
    rb: { p: 3.5, u: 0.5, rel: 0.8, react: { p: 4, rate: 0.05 }, why: 'Scrap generator.' },
  },
  {
    id: 'breaker_yard', n: 'Breaker Yard', cl: 'wreck', t: 'E', r: 'C', tags: ['Salvage', 'Metal'], trig: 'every', every: 2, pts: 8,
    text: 'Every 2 turns: Break one unit of a Wreckage within range 2 into Scrap. +8. If there is none, pick through the yard instead, +2.',
    run(a) { a.score(convert(a, 'Wreck', 'Scrap', 2) ? 8 : 2); },
    rb: { p: 8, u: 1, rel: 0.4, why: 'Starter. Wreckage holds 3 units; the +2 fallback is folded into rel.' },
  },
  {
    id: 'debris_mill', n: 'Debris Mill', cl: 'wreck', t: 'M', r: 'C', tags: ['Salvage', 'Dust'], trig: 'every', every: 2, pts: 8,
    text: 'Every 2 turns: Turn a Dust/Regolith within range 2 into Scrap, +8; otherwise +1 per Scrap within range 2 (max 3). Reactive: When a building within range 2 is destroyed, drop Scrap nearby, +3.',
    run(a) {
      if (convert(a, '#Dust', 'Scrap', 2)) return a.score(8);
      const n = resCount(a, 'Scrap', 2, 3);
      if (n) a.score(n);
    },
    L: [{ on: 'destroy', r: 2, run(a, b, ev) { if (a.create('Scrap', ev.k, 1)) a.score(3); } }],
    rb: { p: 6, u: 1, rel: 0.45, react: { p: 3, rate: 0.07 }, why: 'Dust→Scrap converter.' },
  },
  {
    id: 'black_box_booth', n: 'Black Box Booth', cl: 'wreck', t: 'M', r: 'U', tags: ['Data', 'Salvage'], trig: 'event', pts: 8,
    text: 'Reactive: When Scrap or Wreckage within range 2 is consumed, or a building within range 2 is destroyed, +8; the first time each turn, also draw an extra card next turn.',
    L: [
      { on: 'consume', r: 2, run(a, b, ev) { if (a.is(ev.res, '#Scrap')) { a.score(8); if (a.once('bb')) a.draw(1); } } },
      { on: 'destroy', r: 2, run(a) { a.score(8); if (a.once('bb')) a.draw(1); } },
    ],
    rb: { react: { p: 8, rate: 0.34 }, u: 1.5, why: 'Card advantage from salvage.' },
  },
  {
    id: 'ramjet_scow', n: 'Ramjet Scow', cl: 'wreck', t: 'M', r: 'U', tags: ['Fuel', 'Motion'], trig: 'every', every: 2, pts: 13,
    text: 'Every 2 turns: Burn a Fuel within range 2 to repeat an adjacent building. +13.',
    run(a) { const k = firstRes(a, '#Fuel', 2); if (!k) return; a.consume(k); repeatOne(a, null, 1); a.score(13); },
    rb: { p: 10, u: 2, rel: 0.37, why: 'Fuel sink with repeat.' },
  },
  {
    id: 'blast_fence', n: 'Blast Fence', cl: 'wreck', t: 'M', r: 'U', tags: ['Shield', 'Structure'], trig: 'every', every: 2, pts: 2,
    text: 'Every 2 turns: +1, plus +2 per adjacent building (max 4). Guard: A meteor within range 2 hits the Fence instead – it is destroyed, leaves 2 Scrap, and scores +6.',
    run(a) { a.score(1 + 2 * countNear(a, null, 1, 4)); },
    guard: { r: 2, run(a) { const k = a.k; a.destroy(a.b); a.createAt('Scrap', k); a.create('Scrap', k, 1); a.score(6); } },
    rb: { p: 5.6, rel: 0.96, once: 5, why: 'Insurance that turns into salvage.' },
  },
  {
    id: 'reclaimer_loop', n: 'Reclaimer Loop', cl: 'wreck', t: 'M', r: 'U', tags: ['Scrap', 'Automation'], trig: 'every', every: 3, pts: 6,
    text: 'Reactive: Once per turn, when Scrap is consumed within range 2, create a fresh Scrap beside this, +6. Every 3 turns: +2 per Scrap within range 2 (max 3).',
    L: [{ on: 'consume', r: 2, run(a, b, ev) { if (ev.res === 'Scrap' && a.once('rl') && a.create('Scrap', a.k, 1)) a.score(6); } }],
    run(a) { const n = resCount(a, 'Scrap', 2, 3); if (n) a.score(2 * n); },
    rb: { p: 4, rel: 0.48, react: { p: 6, rate: 0.28 }, u: 1.5, why: 'Renewable Scrap – makes Fuse/Forge engines persistent.' },
  },
  {
    id: 'jettison_bay', n: 'Jettison Bay', cl: 'wreck', t: 'A', r: 'C', tags: ['Cargo', 'Orbital'], trig: 'every', every: 2, pts: 11,
    text: 'Every 2 turns: Launch a loose resource within range 2 into orbit (triggers Launch and Arrival). +11.',
    run(a) { const k = firstRes(a, looseAny.concat(['Cargo']), 2); if (k) { a.launch(k); a.score(11); } },
    rb: { p: 11, rel: 0.75, why: 'Simple big sink.' },
  },
  {
    id: 'scavenger_market', n: 'Scavenger Market', cl: 'wreck', t: 'A', r: 'R', tags: ['Trade', 'Scrap'], trig: 'turn', pts: 6, late: true,
    text: 'End of each turn: +6 per resource consumed within range 3 this turn (max 6), min +5.',
    run(a) {
      const n = Math.min(6, a.tstat.consumed.filter((c) => a.dist(c.k, a.k) <= 3).length);
      a.score(Math.max(5, 6 * n));
    },
    rb: { p: 7, rel: 0.88, why: 'Rewards dense consumption districts.' },
  },
  {
    id: 'shipgrave_forge', n: 'Shipgrave Forge', cl: 'wreck', t: 'A', r: 'R', tags: ['Scrap', 'Metal'], trig: 'every', every: 2, pts: 28,
    text: 'Every 2 turns: Fuse 2 Scrap or Wreckage units within range 2 into one Alloy, +28. With only one, turn it into Alloy for +16.',
    run(a) {
      const ks = a.resNear(a.k, ['Scrap', 'Wreck'], 2);
      if (!ks.length) return;
      if (ks.length < 2) { a.transform(ks[0], 'Alloy'); return a.score(16); }
      a.consume(ks[1]); a.transform(ks[0], 'Alloy'); a.score(28);
    },
    rb: { p: 15, u: 2, rel: 0.72, why: 'Big Alloy payoff gated by Scrap supply.' },
  },
  {
    id: 'catastrophe_engine', n: 'Catastrophe Engine', cl: 'wreck', t: 'A', r: 'U', tags: ['Explosive', 'Salvage'], trig: 'every', every: 2, pts: 2,
    text: 'Every 2 turns: +2 per Wreckage or Scrap within range 2 (max 3). Ability (once per era): Demolish a friendly building within range 2: +5 per building adjacent to it; leaves Wreckage (triggers On Destroy).',
    run(a) { const n = resCount(a, '#Scrap', 2, 3); if (n) a.score(2 * n); },
    ability: {
      label: 'Demolish', target: 'bld', range: 2,
      valid: (a, b) => b.id !== a.b.id && b.c !== 'beacon',
      run(a, k) {
        const t = a.bldAt(k);
        const n = a.near(k, 1).filter((x) => a.bldAt(x)).length;
        a.destroy(t); a.createAt('Wreck', k); a.score(5 * n);
      },
    },
    rb: { p: 4, rel: 0.46, ability: { p: 11.43, u: 3 }, cost: 4, why: 'Salvage scorer; demolition trades a building for a burst.' },
  },
  {
    id: 'phoenix_ark', n: 'Phoenix Ark', cl: 'wreck', t: 'A', r: 'R', tags: ['Salvage', 'Habitat'], trig: 'every', every: 2, pts: 8,
    text: 'Reactive: Once per turn, when a friendly building within range 2 is destroyed, return its card to your hand, +10. Every 2 turns: +6 per adjacent building (max 3).',
    L: [{ on: 'destroy', r: 2, run(a, b, ev) { if (ev.card !== 'beacon' && a.once('px')) { a.toHand(ev.card); a.score(10); } } }],
    run(a) { const n = countNear(a, null, 1, 3); if (n) a.score(6 * n); },
    rb: { p: 12, rel: 0.52, react: { p: 10, rate: 0.09 }, u: 6, why: 'Card recursion.' },
  },

  // ======================= KEPLER CARTOGRAPHERS =======================
  {
    id: 'tether_node', n: 'Tether Node', cl: 'kep', t: 'E', r: 'C', tags: ['Orbit', 'Link'], trig: 'every', every: 2, pts: 2, orbitLink: true,
    text: 'Link. Connects its network to every building in an Orbital slot. On Build: +2. Every 2 turns: +2 per building in Orbital slots (max 3), min +2.',
    build(a) { a.score(2); },
    run(a) { a.score(Math.max(2, 2 * Math.min(3, a.orbitBlds().length))); },
    rb: { once: 2, p: 3, u: 1, rel: 0.67, why: 'Orbital connectivity enabler.' },
  },
  {
    id: 'launch_rail', n: 'Launch Rail', cl: 'kep', t: 'E', r: 'C', tags: ['Orbital', 'Cargo'], trig: 'every', every: 2, pts: 6,
    text: 'Every 2 turns: Launch a Cargo within range 2 (+6). If there is none, pack a loose resource within range 2 into Cargo (+3).',
    run(a) {
      const k = firstRes(a, 'Cargo', 2);
      if (k) { a.launch(k); return a.score(6); }
      if (convert(a, looseAny, 'Cargo', 2)) a.score(3);
    },
    rb: { p: 4.5, u: 1.5, rel: 0.37, why: 'Starter; self-sufficient Cargo cycle.' },
  },
  {
    id: 'microthruster', n: 'Microthruster', cl: 'kep', t: 'E', r: 'C', tags: ['Motion', 'Power'], trig: 'every', every: 4, pts: 2,
    text: 'Every 4 turns: Nudge the asteroid – the light advances one extra phase (rotation triggers fire). +7.',
    run(a) { a.rotateLight(); a.score(7); },
    rb: { p: 3.5, u: 3, rel: 1.5, why: 'Extra rotation is a global trigger for Heliarch/Cryostead/Umbra.' },
  },
  {
    id: 'radar_dish', n: 'Radar Dish', cl: 'kep', t: 'E', r: 'C', tags: ['Signal', 'Orbital'], trig: 'every', every: 3, pts: 3, radar: true,
    text: 'Forecasts the next 3 local events. Every 3 turns: +3. Reactive: On any impact, +3.',
    run(a) { a.score(3); },
    L: [{ on: 'impact', r: 'map', run(a) { a.score(3); } }],
    rb: { p: 3, react: { p: 3, rate: 0.18 }, u: 1, rel: 0.92, why: 'Information and mild scoring.' },
  },
  {
    id: 'gravity_sling', n: 'Gravity Sling', cl: 'kep', t: 'E', r: 'U', tags: ['Orbit', 'Cargo'], trig: 'every', every: 3, pts: 6,
    text: 'Reactive (orbit-linked): Once per turn, when Cargo arrives in orbit, swing it around for a second Arrival, +5. Every 3 turns: +1 per building in Orbital slots (max 3).',
    L: [{ on: 'arrival', r: 'orbit', run(a, b, ev) { if (!ev.sling && a.once('sl')) { a.emit({ type: 'arrival', k: ev.k, res: ev.res, sling: true }); a.score(5); } } }],
    run(a) { const n = Math.min(3, a.orbitBlds().length); if (n) a.score(n); },
    rb: { p: 1.5, react: { p: 5, rate: 0.26 }, u: 2, rel: 0.75, why: 'Doubles Arrival payoffs.' },
  },
  {
    id: 'docking_hoop', n: 'Docking Hoop', cl: 'kep', t: 'M', r: 'C', tags: ['Orbital', 'Trade'], trig: 'event', pts: 3,
    text: 'Reactive (orbit-linked): When Cargo arrives in orbit, +3.',
    L: [{ on: 'arrival', r: 'orbit', run(a) { a.score(3); } }],
    rb: { react: { p: 3, rate: 0.57 }, why: 'Core Arrival payoff.' },
  },
  {
    id: 'skyhook', n: 'Skyhook', cl: 'kep', t: 'M', r: 'U', tags: ['Orbit', 'Link'], trig: 'turn', pts: 1, orbitLink: true,
    text: 'Link. Connects its network to Orbital slots. Every turn: +1 per building in its network that sits in an Orbital slot or has an Orbit/Orbital tag (max 4).',
    run(a) {
      const n = Math.min(4, a.net().filter((x) => a.kind(x.k) === 'orbit' || a.has(x, 'Orbit') || a.has(x, 'Orbital')).length);
      if (n) a.score(n);
    },
    rb: { p: 3, u: 0.5, rel: 1.06, why: 'Orbital network hub.' },
  },
  {
    id: 'mass_driver', n: 'Mass Driver', cl: 'kep', t: 'M', r: 'C', tags: ['Motion', 'Metal'], trig: 'every', every: 2, pts: 8,
    text: 'Every 2 turns: Launch a Metal-tagged token within range 2 into orbit as Metal Cargo. +8.',
    run(a) { const k = firstRes(a, metalLoose, 2); if (k) { a.launch(k); a.score(8); } },
    rb: { p: 8, u: 1, rel: 0.44, why: 'Metal sink; Orbital Foundry turns it into Alloy.' },
  },
  {
    id: 'satellite_orchard', n: 'Satellite Orchard', cl: 'kep', t: 'M', r: 'U', tags: ['Orbit', 'Solar'], trig: 'turn', pts: 2,
    text: 'Every turn: +2 per Sunlit Solar or Power building within range 2 or in its network (max 3).',
    run(a) {
      const set = new Map();
      const sp = (x) => a.has(x, 'Solar') || a.has(x, 'Power');
      for (const b of a.bldNear(a.k, sp, 2).concat(a.net().filter(sp))) if (a.lit(b.k)) set.set(b.id, b);
      const n = Math.min(3, set.size);
      if (n) a.score(2 * n);
    },
    rb: { p: 3.5, rel: 0.79, why: 'Heliarch crossover.' },
  },
  {
    id: 'comet_net', n: 'Comet Net', cl: 'kep', t: 'M', r: 'C', tags: ['Orbit', 'Ice'], trig: 'every', every: 3, pts: 4,
    text: 'Guard: Catches meteors within range 3 – no damage – and drops their Ice or Ore nearby, +6. Every 3 turns: +4.',
    run(a) { a.score(4); },
    guard: { r: 3, run(a, ev) { a.create(a.rand() < 0.5 ? 'Ice' : 'Ore', ev.k, 2); a.score(6); } },
    rb: { p: 4, once: 6, u: 1, rel: 0.56, why: 'Protection + resources.' },
  },
  {
    id: 'cycler_shuttle', n: 'Cycler Shuttle', cl: 'kep', t: 'A', r: 'U', tags: ['Orbit', 'Habitat'], trig: 'every', every: 2, pts: 12,
    text: 'Every 2 turns: Launch a Water or Biomass within range 2 of this or a connected building. +12, +5 if a connected Habitat is Pressurized. If there is nothing to launch, +2.',
    run(a) {
      for (const b of [a.b].concat(a.net())) {
        const k = firstRes(a, ['Water', 'Biomass'], b.id === a.b.id ? 2 : 1, b.k);
        if (!k) continue;
        a.launch(k);
        a.score(12 + (a.net().some((x) => pHabitat(a, x)) ? 5 : 0));
        return;
      }
      a.score(2);
    },
    rb: { p: 8.5, u: 1, rel: 0.9, why: 'Export line for gardens and ice works.' },
  },
  {
    id: 'perigee_loom', n: 'Perigee Loom', cl: 'kep', t: 'A', r: 'U', tags: ['Gravity', 'Orbit'], trig: 'turn', pts: 1,
    text: 'Every turn: +1 per distinct tag among adjacent buildings (max 6).',
    run(a) {
      const s = new Set();
      a.bldNear(a.k, null, 1).forEach((b) => a.cardOf(b).tags.forEach((t) => s.add(t)));
      const n = Math.min(6, s.size);
      if (n) a.score(n);
    },
    rb: { p: 4.5, rel: 1.07, why: 'Diversity payoff.' },
  },
  {
    id: 'orbital_foundry', n: 'Orbital Foundry', cl: 'kep', t: 'A', r: 'R', tags: ['Orbit', 'Alloy'], trig: 'event', pts: 12,
    text: 'Reactive (orbit-linked): When Metal-tagged Cargo arrives in orbit, land Alloy beside this, +16. Other arrivals: +8.',
    L: [{
      on: 'arrival', r: 'orbit', run(a, b, ev) {
        if (a.is(ev.res, '#Metal')) { a.create('Alloy', a.k, 2); a.score(16); } else a.score(8);
      },
    }],
    rb: { react: { p: 8, rate: 0.69 }, u: 1, why: 'Mass Driver capstone.' },
  },
  {
    id: 'ring_habitat', n: 'Ring Habitat', cl: 'kep', t: 'A', r: 'R', tags: ['Orbit', 'Habitat'], trig: 'turn', pts: 3,
    text: 'Every turn: +4 per Pressurized Habitat within range 2 or in its network (max 3), min +3. Not affected by Radiation in an Orbital slot.',
    run(a) {
      const set = new Set();
      for (const b of a.bldNear(a.k, '#Habitat', 2).concat(a.net())) if (pHabitat(a, b)) set.add(b.id);
      a.score(Math.max(3, 4 * Math.min(3, set.size)));
    },
    rb: { p: 6.5, rel: 1.01, why: 'Hearthline crossover capstone.' },
  },
  {
    id: 'shepherd_engine', n: 'Shepherd Engine', cl: 'kep', t: 'A', r: 'R', tags: ['Orbit', 'Motion'], trig: 'turn', pts: 6,
    text: 'Every turn: +6. Ability (once per era): Redirect the next meteor to any land hex; when it lands there, +10 and it drops extra deposits.',
    run(a) { a.score(6); },
    ability: {
      label: 'Redirect meteor', target: 'hex',
      can: (a) => !!a.nextMeteor(),
      valid: (a, k) => a.kind(k) !== 'orbit',
      run(a, k) { a.redirectMeteor(k); a.score(2); },
    },
    rb: { p: 6, ability: { p: 4.94, u: 6 }, rel: 0.41, why: 'Turns meteors into targeted resource drops.' },
  },

  // ======================= HEARTHLINE COMPACT =======================
  {
    id: 'pressure_dome', n: 'Pressure Dome', cl: 'hearth', t: 'E', r: 'C', tags: ['Habitat', 'Pressure'], trig: 'turn', pts: 1,
    text: 'On Build: Pressurize this and adjacent hexes. Every turn: +1 per adjacent building on a Pressurized hex (max 2).',
    build(a) { pressurize(a, a.near(a.k, 1).concat([a.k])); a.score(1); },
    run(a) { const n = countNear(a, (b) => pressurized(a, b), 1, 2); if (n) a.score(n); },
    rb: { once: 4, p: 1.4, rel: 1.12, why: 'Starter: Pressure source for every Habitat card.' },
  },
  {
    id: 'airlock_junction', n: 'Airlock Junction', cl: 'hearth', t: 'E', r: 'C', tags: ['Habitat', 'Link'], trig: 'every', every: 2, pts: 2,
    text: 'Link. On Build: Pressurize this hex. Reactive: When a Habitat joins its network, +2. Every 2 turns: +1 per Habitat in its network (max 2).',
    build(a) { pressurize(a, [a.k]); a.score(1); },
    L: [{ on: 'placed', r: 'net', run(a, b, ev) { const n = a.byId(ev.src); if (n && a.has(n, 'Habitat')) a.score(2); } }],
    run(a) { const n = Math.min(2, a.net().filter((x) => a.has(x, 'Habitat')).length); if (n) a.score(n); },
    rb: { once: 1, p: 1.6, rel: 0.9, react: { p: 2, rate: 0.26 }, u: 0.3, why: 'Habitat network glue.' },
  },
  {
    id: 'pioneer_quarters', n: 'Pioneer Quarters', cl: 'hearth', t: 'E', r: 'C', tags: ['Habitat', 'Citizen'], trig: 'every', every: 2, pts: 2,
    text: 'Every 2 turns: +2 per adjacent building on a Pressurized hex (max 3).',
    run(a) { const n = countNear(a, (b) => pressurized(a, b), 1, 3); if (n) a.score(2 * n); },
    rb: { p: 4, rel: 0.85, why: 'Pressure density payoff.' },
  },
  {
    id: 'community_galley', n: 'Community Galley', cl: 'hearth', t: 'E', r: 'C', tags: ['Habitat', 'Bio'], trig: 'every', every: 3, pts: 3, cap: 3,
    text: 'Reactive: When Water, Biomass, Fuel or Cargo is consumed within range 2, +4. Every 3 turns: +2 per adjacent Habitat (max 3).',
    L: [{ on: 'consume', r: 2, run(a, b, ev) { if (['Water', 'Biomass', 'Fuel', 'Cargo'].includes(ev.res)) a.score(4); } }],
    run(a) { const n = countNear(a, '#Habitat', 1, 3); if (n) a.score(2 * n); },
    rb: { p: 3, rel: 0.55, react: { p: 3, rate: 0.33 }, why: 'Payoff for Verdant/Cryostead/Kepler consumption.' },
  },
  {
    id: 'beacon_plaza', n: 'Beacon Plaza', cl: 'hearth', t: 'E', r: 'U', tags: ['Culture', 'Signal'], trig: 'turn', pts: 1, late: true,
    text: 'Spotlight: each turn the Plaza celebrates the next active clan in rotation. End of each turn: +1 per spotlit-clan building that activated within range 2 (max 3); +2 more if every active clan activated nearby.',
    run(a) {
      const star = a.clans[a.turn % a.clans.length];
      const near = a.tstat.acts.filter((e) => e.clan !== 'neutral' && a.dist(e.k, a.k) <= 2);
      const n = Math.min(3, new Set(near.filter((e) => e.clan === star).map((e) => e.id)).size);
      const all = a.clans.every((c) => near.some((e) => e.clan === c));
      if (n) a.note(`spotlight ${star}`);
      a.score(n + (all ? 2 : 0));
    },
    rb: { p: 2.6, rel: 0.8, why: 'Cross-clan reward; one clan in the spotlight per turn.' },
  },
  {
    id: 'life_support_array', n: 'Life Support Array', cl: 'hearth', t: 'M', r: 'C', tags: ['Pressure', 'Water'], trig: 'every', every: 2, pts: 5,
    text: 'On Build: Pressurize this hex. Reactive: When Water within range 2 is consumed, Pressurize adjacent hexes for 3 turns, +5. Every 2 turns: +3 per adjacent Habitat (max 3).',
    build(a) { pressurize(a, [a.k]); a.score(1); },
    L: [{ on: 'consume', r: 2, run(a, b, ev) { if (ev.res === 'Water') { pressurize(a, a.near(a.k, 1), 3); a.score(5); } } }],
    run(a) { const n = countNear(a, '#Habitat', 1, 3); if (n) a.score(3 * n); },
    rb: { once: 1, p: 5, rel: 0.55, react: { p: 5, rate: 0.16 }, u: 0.5, why: 'Water→Pressure bridge.' },
  },
  {
    id: 'shielded_nursery', n: 'Shielded Nursery', cl: 'hearth', t: 'M', r: 'U', tags: ['Habitat', 'Shield'], trig: 'every', every: 2, pts: 4,
    text: 'Shields adjacent Habitats from impacts and tremors. Every 2 turns: +4 per adjacent Habitat (max 3).',
    run(a) { const n = countNear(a, '#Habitat', 1, 3); if (n) a.score(4 * n); },
    shields: (a, self, k) => { const b = a.bldAt(k); return a.dist(self.k, k) <= 1 && (!b || a.has(b, 'Habitat')); },
    rb: { p: 7, u: 0.5, rel: 0.83, why: 'Protects your Habitat core.' },
  },
  {
    id: 'transit_causeway', n: 'Transit Causeway', cl: 'hearth', t: 'M', r: 'C', tags: ['Link', 'Habitat'], trig: 'turn', pts: 1, link: 3,
    text: 'Link (reach 3). Every turn: +1 per Pressurized Habitat in its network (max 3).',
    run(a) { const n = Math.min(3, a.net().filter((x) => pHabitat(a, x)).length); if (n) a.score(n); },
    rb: { p: 1.8, u: 0.5, rel: 1.09, why: 'Long-reach connector.' },
  },
  {
    id: 'spaceport_canteen', n: 'Spaceport Canteen', cl: 'hearth', t: 'M', r: 'U', tags: ['Trade', 'Culture'], trig: 'every', every: 2, pts: 6,
    text: 'Reactive: Whenever Cargo arrives in orbit anywhere, the crew runs up a tab (max 3). Every 2 turns: settle up, +4 per tab, plus +2 per Cargo or adjacent Habitat (max 3).',
    L: [{ on: 'arrival', r: 'map', run(a) { const m = a.mem(); m.tab = Math.min(3, (m.tab || 0) + 1); } }],
    run(a) {
      const m = a.mem();
      const n = Math.min(3, a.allRes('Cargo').length + a.bldNear(a.k, '#Habitat', 1).length);
      if (m.tab) a.note(`tab ×${m.tab}`);
      a.score(4 * (m.tab || 0) + 2 * n);
      m.tab = 0;
    },
    rb: { p: 6, why: 'Global Arrival payoff, banked and paid out every other turn (≈0.8 tabs + 1.5 Cargo/Habitat).' },
  },
  {
    id: 'education_spire', n: 'Education Spire', cl: 'hearth', t: 'M', r: 'U', tags: ['Culture', 'Signal'], trig: 'turn', pts: 4, late: true,
    text: 'End of each turn: with 3+ distinct tags activated within range 2 this turn, +2 and draw an extra card next turn; with 6+, +5 instead.',
    run(a) {
      const n = distinctTagsActivated(a, (e) => a.dist(e.k, a.k) <= 2 && e.id !== a.b.id);
      if (n >= 6) { a.score(5); a.draw(1); } else if (n >= 3) { a.score(2); a.draw(1); }
    },
    rb: { p: 2.8, rel: 0.65, u: 1.5, why: 'Card draw + tag diversity.' },
  },
  {
    id: 'thermal_commons', n: 'Thermal Commons', cl: 'hearth', t: 'A', r: 'C', tags: ['Heat', 'Habitat'], trig: 'every', every: 2, pts: 5,
    text: 'On Build: Pressurize this hex. Every 2 turns: +5 per adjacent Habitat (max 3), +4 if an adjacent hex is Hot. Reactive: When a hex within range 2 is cooled, +5 and Pressurize adjacent hexes for 3 turns.',
    build(a) { pressurize(a, [a.k]); a.score(1); },
    run(a) {
      const s = 5 * countNear(a, '#Habitat', 1, 3) + (a.near(a.k, 1).some((k) => a.st(k, 'Hot')) ? 4 : 0);
      if (s) a.score(s);
    },
    L: [{ on: 'cool', r: 2, run(a) { pressurize(a, a.near(a.k, 1), 3); a.score(5); } }],
    rb: { once: 1, p: 7, rel: 0.66, react: { p: 5, rate: 0.22 }, u: 0.5, why: 'Heat-exchange payoff.' },
  },
  {
    id: 'embassy_cluster', n: 'Embassy Cluster', cl: 'hearth', t: 'A', r: 'R', tags: ['Habitat', 'Culture'], trig: 'every', every: 2, pts: 5,
    text: 'Every 2 turns: +5 per distinct active clan among buildings within range 2 (max 3).',
    run(a) {
      const s = new Set(a.bldNear(a.k, null, 2).map((b) => b.clan).filter((c) => a.clans.includes(c)));
      const n = Math.min(3, s.size);
      if (n) a.score(5 * n);
    },
    rb: { p: 12, rel: 1.16, why: 'Three-clan district capstone.' },
  },
  {
    id: 'arcology_stack', n: 'Arcology Stack', cl: 'hearth', t: 'A', r: 'R', tags: ['Habitat', 'Pressure'], trig: 'turn', pts: 4,
    text: 'On Build: Pressurize this and adjacent hexes. Every turn: +3 per adjacent Pressurized Habitat (max 2); +3 more if its network spans Surface and Cavern.',
    build(a) { pressurize(a, a.near(a.k, 1).concat([a.k])); a.score(2); },
    run(a) {
      const n = countNear(a, (b) => pHabitat(a, b), 1, 2);
      const kinds = new Set([a.b].concat(a.net()).map((b) => a.kind(b.k)));
      const s = 3 * n + (kinds.has('cavern') && kinds.has('surface') ? 3 : 0);
      if (s) a.score(s);
    },
    rb: { once: 2, p: 5, rel: 1.07, why: 'Habitat density capstone.' },
  },
  {
    id: 'stargazer_memorial', n: 'Stargazer Memorial', cl: 'hearth', t: 'A', r: 'U', tags: ['Culture', 'Orbit'], trig: 'turn', pts: 2,
    text: 'Every turn: +2 per Habitat within range 2 (max 3). Reactive: When a meteor lands within range 3 without destroying anything, +8.',
    run(a) { const n = countNear(a, '#Habitat', 2, 3); if (n) a.score(2 * n); },
    L: [{ on: 'impact', r: 3, run(a, b, ev) { if (!ev.dmg) a.score(8); } }],
    rb: { p: 6, react: { p: 8, rate: 0.07 }, rel: 0.68, why: 'Habitat scoring + impact bonus.' },
  },
  {
    id: 'eternal_city_core', n: 'Eternal City Core', cl: 'hearth', t: 'A', r: 'R', tags: ['Habitat', 'Culture'], trig: 'turn', pts: 10, late: true, preventLoss: true,
    text: 'End of each turn: if network buildings from all three active clans activated this turn, +10; otherwise +2 per clan that did. Prevents the first Integrity loss each era.',
    run(a) {
      const ids = new Set(a.net().map((x) => x.id));
      const s = new Set(a.tstat.acts.filter((e) => ids.has(e.id) && a.clans.includes(e.clan)).map((e) => e.clan));
      if (s.size >= 3) a.score(10); else if (s.size) a.score(2 * s.size);
    },
    rb: { p: 6, u: 1, rel: 0.99, why: 'Cooperation capstone with Integrity insurance.' },
  },

  // ======================= UMBRA INSTITUTE =======================
  {
    id: 'radiation_siphon', n: 'Radiation Siphon', cl: 'umbra', t: 'E', r: 'C', tags: ['Radiation', 'Power'], trig: 'every', every: 2, pts: 4,
    text: 'Reactive: When Radiation appears within range 2, remove it, +3. Every 2 turns: +1 per Anomaly or Radiated hex within range 2 (max 3).',
    L: [{ on: 'radiation', r: 2, run(a, b, ev) { a.rmSt(ev.k, 'Radiation'); a.score(3); } }],
    run(a) { const n = Math.min(3, a.resNear(a.k, 'Anomaly', 2).length + radiated(a, 2)); if (n) a.score(n); },
    rb: { p: 2, rel: 0.57, react: { p: 3, rate: 0.25 }, u: 0.5, why: 'Cleans up Umbra side-effects.' },
  },
  {
    id: 'void_prism', n: 'Void Prism', cl: 'umbra', t: 'E', r: 'C', tags: ['Crystal', 'Exotic'], trig: 'event', pts: 3,
    text: 'Reactive: When this hex enters Shadow, +3 plus +3 per adjacent Crystal or Anomaly (max +12).',
    L: [{ on: 'enterShadow', r: 'self', run(a) { a.score(Math.min(12, 3 + 3 * a.resNear(a.k, ['Crystal', 'Anomaly'], 1).length)); } }],
    rb: { react: { p: 6, rate: 0.3 }, why: 'Starter: rotation payoff on Exotic maps.' },
  },
  {
    id: 'paradox_marker', n: 'Paradox Marker', cl: 'umbra', t: 'E', r: 'C', tags: ['Exotic', 'Signal'], trig: 'event', pts: 4,
    text: 'Reactive: When a resource transforms within range 2, +4; +3 more if it is the same transformation as the previous one it saw.',
    L: [{
      on: 'transform', r: 2, run(a, b, ev) {
        const m = a.mem(); const sig = ev.from + '>' + ev.to;
        a.score(4 + (m.last === sig ? 3 : 0)); m.last = sig;
      },
    }],
    rb: { react: { p: 5, rate: 0.34 }, why: 'Generic transformation payoff.' },
  },
  {
    id: 'rift_ward', n: 'Rift Ward', cl: 'umbra', t: 'E', r: 'C', tags: ['Shield', 'Exotic'], trig: 'every', every: 3, pts: 2,
    text: 'Guard: Protects buildings within range 1 from meteors, irradiating the impact hex instead, +5. Every 3 turns: +2 per adjacent building (max 3).',
    run(a) { const n = countNear(a, null, 1, 3); if (n) a.score(2 * n); },
    guard: { r: 1, run(a, ev) { a.addSt(ev.k, 'Radiation'); a.score(5); } },
    rb: { p: 4.5, rel: 0.99, once: 3, why: 'Defensive with Radiation upside.' },
  },
  {
    id: 'entropy_probe', n: 'Entropy Probe', cl: 'umbra', t: 'E', r: 'U', tags: ['Exotic', 'Mining'], trig: 'every', every: 2, pts: 6,
    text: 'Reactive: When a Cavern is excavated within range 2, seed an Anomaly in it (+6) or +2 if occupied. Every 2 turns: +3 per Anomaly within range 2 (max 3). Entropy wins: with 2 or more in range, the nearest Anomaly then collapses into Wreckage.',
    L: [{ on: 'excavate', r: 2, run(a, b, ev) { if (a.createAt('Anomaly', ev.k)) a.score(6); else a.score(2); } }],
    run(a) {
      const ks = a.resNear(a.k, 'Anomaly', 2);
      const n = Math.min(3, ks.length);
      if (n) a.score(3 * n);
      if (ks.length >= 2) a.transform(ks.sort((x, y) => a.dist(x, a.k) - a.dist(y, a.k))[0], 'Wreck');
    },
    rb: { p: 4.5, rel: 0.54, react: { p: 6, rate: 0.13 }, u: 1, why: 'Ironwake crossover; makes Anomalies.' },
  },
  {
    id: 'temporal_loop', n: 'Temporal Loop', cl: 'umbra', t: 'M', r: 'U', tags: ['Time', 'Power'], trig: 'every', every: 2, pts: 6,
    text: 'Every 2 turns: Repeat the most recently activated building within range 2 and irradiate its hex. +6.',
    run(a) { const t = a.lastActive(2); if (t && a.repeat(t)) { a.addSt(t.k, 'Radiation'); a.score(6); } },
    rb: { p: 6, u: 3, rel: 0.6, cost: 2, why: 'Repeat with a Radiation tax.' },
  },
  {
    id: 'darklight_condenser', n: 'Darklight Condenser', cl: 'umbra', t: 'M', r: 'C', tags: ['Cold', 'Exotic'], trig: 'event', pts: 3,
    text: 'Reactive: Once per turn, when an adjacent hex enters Shadow, +3 and chill it (Cold).',
    L: [{ on: 'enterShadow', r: 1, run(a, b, ev) { if (a.kind(ev.k) !== 'rock' && a.once('dl')) { a.addSt(ev.k, 'Cold'); a.score(3); } } }],
    rb: { react: { p: 3, rate: 0.67 }, why: 'Rotation payoff for edge placement.' },
  },
  {
    id: 'antimatter_trap', n: 'Antimatter Trap', cl: 'umbra', t: 'M', r: 'U', tags: ['Exotic', 'Fuel'], trig: 'every', every: 2, pts: 12,
    text: 'Every 2 turns: Turn a Gas or Fuel within range 2 into an Anomaly, +12, and irradiate this hex. Otherwise +2 per Anomaly within range 2 (max 2).',
    run(a) {
      if (convert(a, ['Gas', 'Fuel'], 'Anomaly', 2)) { a.score(12); return a.addSt(a.k, 'Radiation'); }
      const n = resCount(a, 'Anomaly', 2, 2);
      if (n) a.score(2 * n);
    },
    rb: { p: 8, u: 1, rel: 0.71, cost: 1, why: 'Big hit gated by Gas/Fuel.' },
  },
  {
    id: 'probability_lens', n: 'Probability Lens', cl: 'umbra', t: 'M', r: 'C', tags: ['Crystal', 'Signal'], trig: 'every', every: 2, pts: 2,
    text: 'Every 2 turns: +2 (+2 more beside a Crystal) and draw an extra card next turn.',
    run(a) { a.score(2 + (a.resNear(a.k, 'Crystal', 1).length ? 2 : 0)); a.draw(1); },
    rb: { p: 2.8, u: 1.5, rel: 0.89, why: 'Card advantage engine.' },
  },
  {
    id: 'decay_observatory', n: 'Decay Observatory', cl: 'umbra', t: 'M', r: 'C', tags: ['Time', 'Signal'], trig: 'every', every: 2, pts: 5,
    text: 'Every 2 turns: +2 per Radiated hex within range 2 (max 3), min +1. Reactive: When a building within range 2 is destroyed, +5 and draw an extra card.',
    run(a) { a.score(Math.max(1, 2 * Math.min(3, radiated(a, 2)))); },
    L: [{ on: 'destroy', r: 2, run(a) { a.score(5); a.draw(1); } }],
    rb: { p: 3, react: { p: 5, rate: 0.12 }, u: 0.3, rel: 1.11, why: 'Radiation + salvage payoff.' },
  },
  {
    id: 'phase_inverter', n: 'Phase Inverter', cl: 'umbra', t: 'A', r: 'U', tags: ['Time', 'Heat'], trig: 'every', every: 2, pts: 4,
    text: 'Every 2 turns: Swap Hot↔Cold on up to 3 adjacent hexes (+5 each; triggers Heat and Cooling). If none changed, chill all adjacent hexes, +3.',
    run(a) {
      let n = 0;
      for (const k of a.near(a.k, 1)) {
        if (n >= 3) break;
        if (a.st(k, 'Hot')) { a.addSt(k, 'Cold'); n++; } else if (a.st(k, 'Cold')) { a.addSt(k, 'Hot'); n++; }
      }
      if (n) a.score(5 * n);
      else { for (const k of a.near(a.k, 1)) if (a.kind(k) !== 'rock') a.addSt(k, 'Cold'); a.score(3); }
    },
    rb: { p: 8.5, u: 2, rel: 0.91, why: 'Heat/Cool trigger factory.' },
  },
  {
    id: 'uncertainty_gate', n: 'Uncertainty Gate', cl: 'umbra', t: 'A', r: 'U', tags: ['Exotic', 'Orbit'], trig: 'turn', pts: 3, anomLink: true,
    text: 'Buildings next to an Anomaly join its network. Every turn: +3 per Anomaly within range 3 (max 3).',
    run(a) { const n = resCount(a, 'Anomaly', 3, 3); if (n) a.score(3 * n); },
    rb: { p: 4.5, u: 0.5, rel: 0.9, why: 'Anomaly network hub.' },
  },
  {
    id: 'event_horizon_lab', n: 'Event Horizon Lab', cl: 'umbra', t: 'A', r: 'R', tags: ['Exotic', 'Radiation'], trig: 'every', every: 2, pts: 8,
    text: 'Every 2 turns: +5 per Radiated hex within range 2 (max 5), min +3. With 4+, lose 1 Integrity.',
    run(a) {
      const n = Math.min(5, radiated(a, 2));
      a.score(Math.max(3, 5 * n));
      if (n >= 4) a.integrity(-1);
    },
    rb: { p: 12, rel: 1.11, cost: 2, why: 'Huge but needs a Radiation field.' },
  },
  {
    id: 'causality_engine', n: 'Causality Engine', cl: 'umbra', t: 'A', r: 'R', tags: ['Time', 'Automation'], trig: 'every', every: 2, pts: 8,
    text: 'Reactive: Once per turn, when a building within range 2 is repeated, consume an adjacent Anomaly to give it one extra activation beyond its cap, +14. Every 2 turns: +9 per Anomaly within range 2 (max 3).',
    L: [{
      on: 'repeat', r: 2, run(a, b, ev) {
        const k = firstRes(a, 'Anomaly');
        const t = a.byId(ev.src);
        if (!k || !t || !a.once('ce')) return;
        a.consume(k);
        a.repeat(t, true);
        a.score(14);
      },
    }],
    run(a) { const n = resCount(a, 'Anomaly', 2, 3); if (n) a.score(9 * n); },
    rb: { p: 11, rel: 0.41, react: { p: 12, rate: 0.19 }, u: 3, why: 'Breaks the cap for your best building.' },
  },
  {
    id: 'zero_point_beacon', n: 'Zero-Point Beacon', cl: 'umbra', t: 'A', r: 'R', tags: ['Exotic', 'Power'], trig: 'every', every: 2, pts: 4, cap: 3,
    text: 'Every 2 turns: Vacuum fluctuation – with fewer than 3 resource types within range 2, conjure an Anomaly (or Dust) nearby. Then repeat one different building within range 2 per distinct resource type within range 2 (max 4); +3 per repeat. Irradiates this hex.',
    run(a) {
      let types = new Set(a.near(a.k, 2).map((k) => a.res(k)).filter(Boolean));
      if (types.size < 3) {
        a.create(types.has('Anomaly') ? 'Dust' : 'Anomaly', a.k, 2);
        types = new Set(a.near(a.k, 2).map((k) => a.res(k)).filter(Boolean));
      }
      let n = 0; const done = [];
      for (let i = 0; i < Math.min(4, types.size); i++) {
        const r = repeatOne(a, null, 2, done);
        if (!r) break;
        done.push(r.id); n++;
      }
      if (n) { a.score(3 * n); a.addSt(a.k, 'Radiation'); }
    },
    rb: { p: 7, u: 4, rel: 1.6, cost: 1, why: 'Mass repeat that seeds its own variety; the most explosive Umbra card.' },
  },
];

// ---- Card Foundry: 18 shop-only blueprints (2 per clan) --------------------
// Bought on the star chart; a purchase adds the card to its clan's draw pool
// for the rest of the expedition. Never part of the baseline 135.
const foundry = [
  {
    id: 'auric_assayer', n: 'Auric Assayer', cl: 'iron', t: 'M', r: 'U', tags: ['Mining', 'Precious'], trig: 'event', cost: { AL: 4, CR: 3 },
    text: 'On Build: +3 per Gold Vein within range 2 (max 3). Reactive: Whenever Gold is extracted within range 2, +6 and it counts twice toward the Mint charter stamp.',
    build(a) { a.score(3 * Math.max(1, resCount(a, 'Gold', 2, 3))); },
    L: [{ on: 'extract', r: 2, run(a, b, ev) { if (ev.res === 'Gold') { a.S.stats.precious++; a.score(6); } } }],
    rb: { once: 6, react: { p: 6, rate: 0.3 }, u2: 2, why: 'Gold payoff that also fast-tracks the Mint charter.' },
  },
  {
    id: 'microfault_weaver', n: 'Microfault Weaver', cl: 'iron', t: 'M', r: 'U', tags: ['Anchor', 'Mining'], trig: 'event', cost: { AL: 5, DA: 3 },
    text: 'On Build: Excavate an adjacent Rock hex into a Stable Cavern, +6. Reactive: When a Cavern opens within range 2, reveal a buried deposit next to it, +5.',
    build(a) {
      const k = a.near(a.k, 1).find((x) => a.kind(x) === 'rock');
      if (k) { a.excavate(k); a.addSt(k, 'Stable'); a.score(6); } else a.score(2);
    },
    L: [{ on: 'excavate', r: 2, run(a, b, ev) { const k = a.near(ev.k, 1).find((x) => a.hidden(x)); if (k) { a.reveal(k); a.score(5); } } }],
    rb: { once: 10, react: { p: 5, rate: 0.35 }, u2: 1.5, why: 'Stabilized excavation and buried-deposit discovery.' },
  },
  {
    id: 'eclipse_capacitor', n: 'Eclipse Capacitor', cl: 'helio', t: 'M', r: 'U', tags: ['Solar', 'Storage'], trig: 'sunlit', pts: 2, cost: { CY: 4, DA: 3 },
    text: 'Every Sunlit Turn: Store one Charge (max 3), +2. Reactive: On entering Shadow, spend a Charge to repeat an adjacent Cold or Power building, +4.',
    run(a) { const m = a.mem(); if ((m.ch || 0) < 3) m.ch = (m.ch || 0) + 1; a.score(2); },
    L: [{ on: 'enterShadow', r: 'self', run(a) {
      const m = a.mem();
      if (!m.ch) return;
      const t = a.bldNear(a.k, (b, c) => c.tags.includes('Cold') || c.tags.includes('Power'), 1).find((b) => a.canRepeat(b));
      if (t && a.repeat(t)) { m.ch--; a.score(4); }
    } }],
    rb: { p: 2, rel: 1, react: { p: 4, rate: 0.25 }, u2: 5, why: 'Bridges the day/night seam for Cold and Power districts.' },
  },
  {
    id: 'spectral_splitter', n: 'Spectral Splitter', cl: 'helio', t: 'M', r: 'U', tags: ['Light', 'Crystal'], trig: 'sunlit', pts: 3, mirror: true, cost: { AL: 4, DA: 4 },
    text: 'While Sunlit, lights its Shadowed neighbours. Every Sunlit Turn: +3 per Crystal within range 2 (max 3); +2 if there are none.',
    run(a) { const n = resCount(a, 'Crystal', 2, 3); a.score(n ? 3 * n : 2); },
    rb: { p: 5, rel: 1, passive: { p: 2, rate: 0.5 }, why: 'Light relay that turns Crystal seams into a solar district.' },
  },
  {
    id: 'perihelion_catcher', n: 'Perihelion Catcher', cl: 'cryo', t: 'M', r: 'U', tags: ['Cold', 'Orbital'], trig: 'every', every: 3, pts: 2, cost: { CY: 4, CR: 3 },
    text: 'Can dock in Orbit. Reactive: When a Hot hex cools within range 2, condense Water next to it, +5. Every 3 turns: chill a Hot hex within range 2 (+2).',
    L: [{ on: 'cool', r: 2, run(a, b, ev) { if (a.create('Water', ev.k, 1)) a.score(5); } }],
    run(a) { const k = a.near(a.k, 2).find((x) => a.st(x, 'Hot')); if (k) { a.rmSt(k, 'Hot'); a.score(2); } },
    rb: { p: 2, rel: 0.5, react: { p: 5, rate: 0.35 }, u2: 2, why: 'Turns waste heat into Water.' },
  },
  {
    id: 'isotope_distillery', n: 'Isotope Distillery', cl: 'cryo', t: 'M', r: 'U', tags: ['Ice', 'Fuel'], trig: 'every', every: 2, pts: 6, cost: { CY: 5, DA: 3 },
    text: 'Every 2 turns: Distil an adjacent Water or Gas into Fuel, +6 (+3 more on Ice-rich worlds, Ice 4+).',
    run(a) {
      const k = firstRes(a, ['Water', 'Gas'], 1);
      if (!k) return;
      a.transform(k, 'Fuel');
      a.score(6 + ((a.S.profile && a.S.profile.ice >= 4) ? 3 : 0));
    },
    rb: { p: 7, rel: 0.75, u: 2, why: 'Fuel converter that loves cryo worlds.' },
  },
  {
    id: 'loam_choir', n: 'Loam Choir', cl: 'verd', t: 'M', r: 'U', tags: ['Bio', 'Soil'], trig: 'event', cost: { GE: 5, DA: 2 },
    text: 'Reactive: When Biomass appears within range 2 of Bio-Loam, +4; once per turn also repeat an adjacent Bio building.',
    L: [{ on: 'create', r: 2, run(a, b, ev) {
      if (ev.res !== 'Biomass' || !a.resNear(ev.k, 'Loam', 2).length) return;
      a.score(4);
      if (a.once('lc')) repeatOne(a, 'Bio', 1);
    } }],
    rb: { react: { p: 4, rate: 0.45 }, u2: 3, why: 'Doubles growth events on Bio-Loam worlds.' },
  },
  {
    id: 'pollen_aerostat', n: 'Pollen Aerostat', cl: 'verd', t: 'M', r: 'U', tags: ['Bio', 'Orbital'], trig: 'every', every: 2, pts: 5, cost: { GE: 4, CR: 3 },
    text: 'Can dock in Orbit. Every 2 turns: Pack a Biomass within range 2 into Cargo, +5 (+3 more if it sat on a Pressurized hex).',
    run(a) {
      const k = firstRes(a, 'Biomass', 2);
      if (!k) return;
      const p = a.st(k, 'Pressure');
      a.transform(k, 'Cargo');
      a.score(5 + (p ? 3 : 0));
    },
    rb: { p: 6, rel: 0.7, u: 2, why: 'Bridges Verdant growth into orbital trade.' },
  },
  {
    id: 'priority_router', n: 'Priority Router', cl: 'syn', t: 'M', r: 'U', tags: ['Signal', 'Automation'], trig: 'turn', pts: 2, late: true, cost: { DA: 5, CR: 2 },
    text: 'Every turn (after other timers): Repeat a building within range 2 that activated this turn, +2.',
    run(a) { const t = a.lastActive(2); if (t && a.repeat(t)) a.score(2); },
    rb: { p: 2, rel: 0.6, u: 2, why: 'A steady, targeted repeater with a small payout.' },
  },
  {
    id: 'simulacrum_port', n: 'Simulacrum Port', cl: 'syn', t: 'M', r: 'U', tags: ['Drone', 'Echo'], trig: 'every', every: 2, pts: 2, cost: { AL: 4, DA: 4 },
    text: 'Every 2 turns: +2 per distinct tag among adjacent buildings (max 6).',
    run(a) {
      const tags = new Set(a.bldNear(a.k, null, 1).flatMap((b) => a.cardOf(b).tags));
      const n = Math.min(6, tags.size);
      if (n) a.score(2 * n);
    },
    rb: { p: 9, rel: 0.7, why: 'Rewards dense, diverse districts.' },
  },
  {
    id: 'goldleaf_recycler', n: 'Goldleaf Recycler', cl: 'wreck', t: 'M', r: 'U', tags: ['Salvage', 'Precious'], trig: 'event', cost: { AL: 4, CR: 4 },
    text: 'Reactive: Once per turn, when Gold or Scrap is consumed within range 2, +7; Scrap counts as a Gold Vein for the Mint charter stamp.',
    L: [{ on: 'consume', r: 2, run(a, b, ev) {
      if ((ev.res === 'Gold' || ev.res === 'Scrap') && a.once('gl')) {
        if (ev.res === 'Scrap') a.S.stats.precious++;
        a.score(7);
      }
    } }],
    rb: { react: { p: 7, rate: 0.45 }, u2: 1, why: 'Lets salvage chains feed a gold charter.' },
  },
  {
    id: 'scuttle_permit', n: 'Scuttle Permit', cl: 'wreck', t: 'M', r: 'U', tags: ['Salvage', 'Culture'], trig: 'every', every: 3, pts: 3, cost: { CR: 5, AL: 3 },
    text: 'Every 3 turns: +3 per adjacent Habitat (min +3). Ability (once per era): Dismantle a building within range 2 and return its card to your hand, +4.',
    run(a) { a.score(3 * Math.max(1, countNear(a, 'Habitat', 1, 3))); },
    ability: {
      label: 'Dismantle', target: 'bld', range: 2,
      valid: (a, b) => b.id !== a.b.id && b.c !== 'beacon',
      run(a, k) { const t = a.bldAt(k); const cid = t.c; a.destroy(t); a.toHand(cid); a.score(4); },
    },
    rb: { p: 4, rel: 1, ability: { p: 4, u: 6 }, why: 'Rebuild a misplaced building somewhere better.' },
  },
  {
    id: 'trade_sling', n: 'Trade-Sling Array', cl: 'kep', t: 'M', r: 'U', tags: ['Orbit', 'Cargo'], trig: 'every', every: 2, pts: 2, cost: { AL: 5, CY: 4 },
    text: 'Reactive: The first Cargo launched anywhere each turn scores +6. Every 2 turns: pack a loose resource within range 2 into Cargo, +2.',
    L: [{ on: 'launch', r: 'map', run(a) { if (a.once('ts')) a.score(6); } }],
    run(a) { if (convert(a, looseAny, 'Cargo', 2)) a.score(2); },
    rb: { p: 2, rel: 0.6, u: 1.5, react: { p: 6, rate: 0.35 }, why: 'Map-wide launch payoff.' },
  },
  {
    id: 'lane_survey_probe', n: 'Lane Survey Probe', cl: 'kep', t: 'M', r: 'U', tags: ['Signal', 'Orbit'], trig: 'event', cost: { DA: 4, CR: 4 },
    text: 'On Build: +3 per meteor still forecast this map (max 4). Reactive: Each meteor impact anywhere scores +6 and counts as a Cargo launch for the Trade charter stamp.',
    build(a) { a.score(3 * Math.min(4, Math.max(1, a.S.events.filter((e) => !e.done && e.type === 'meteor').length))); },
    L: [{ on: 'impact', r: 'map', run(a) { a.S.stats.launched++; a.score(6); } }],
    rb: { once: 9, react: { p: 6, rate: 0.2 }, u2: 3, why: 'Turns meteor showers into trade progress.' },
  },
  {
    id: 'mint_atrium', n: 'Mint Atrium', cl: 'hearth', t: 'M', r: 'U', tags: ['Habitat', 'Precious'], trig: 'every', every: 2, pts: 3, cost: { CR: 5, AL: 3 },
    text: 'Reactive: When Gold is extracted within range 2, +5 (+3 more if this is Pressurized). Every 2 turns: +3 per adjacent Pressurized Habitat (max 2).',
    L: [{ on: 'extract', r: 2, run(a, b, ev) { if (ev.res === 'Gold') a.score(5 + (a.st(a.k, 'Pressure') ? 3 : 0)); } }],
    run(a) { const n = countNear(a, (b) => pHabitat(a, b), 1, 2); if (n) a.score(3 * n); },
    rb: { p: 3, rel: 0.6, react: { p: 6.5, rate: 0.3 }, why: 'Gold commerce for habitat districts.' },
  },
  {
    id: 'quarantine_market', n: 'Quarantine Market', cl: 'hearth', t: 'M', r: 'U', tags: ['Trade', 'Shield'], trig: 'every', every: 3, pts: 3, cost: { GE: 4, CR: 3 },
    text: 'Shields adjacent Bio buildings. Reactive: Each Cargo arrival in orbit scores +5. Every 3 turns: +3 per adjacent Bio building (max 2).',
    shields: (a, self, k) => { const b = a.bldAt(k); return a.dist(self.k, k) === 1 && !!b && a.has(b, 'Bio'); },
    L: [{ on: 'arrival', r: 'map', run(a) { a.score(5); } }],
    run(a) { const n = countNear(a, 'Bio', 1, 2); if (n) a.score(3 * n); },
    rb: { p: 3, rel: 0.6, react: { p: 5, rate: 0.35 }, passive: { p: 0, u: 1, rate: 0.5 }, why: 'Trade income plus protection for gardens.' },
  },
  {
    id: 'veil_interferometer', n: 'Veil Interferometer', cl: 'umbra', t: 'M', r: 'U', tags: ['Exotic', 'Signal'], trig: 'event', cost: { DA: 6, CY: 2 },
    text: 'Reactive: Once per turn, when Radiation appears within range 2, repeat a building within range 2, +5, and irradiate this hex.',
    L: [{ on: 'radiation', r: 2, run(a) { if (a.once('vi') && repeatOne(a, null, 2)) { a.score(5); a.addSt(a.k, 'Radiation'); } } }],
    rb: { react: { p: 5, rate: 0.3 }, u2: 5, cost: 1, why: 'Radiation becomes a repeat trigger.' },
  },
  {
    id: 'history_splicer', n: 'History Splicer', cl: 'umbra', t: 'M', r: 'U', tags: ['Time', 'Salvage'], trig: 'every', every: 3, pts: 2, cost: { DA: 5, CR: 5 },
    text: 'Reactive: When a building within range 2 is destroyed, +8 and draw a card. Every 3 turns: repeat the building within range 2 that last activated, +2.',
    L: [{ on: 'destroy', r: 2, run(a, b, ev) { if (ev.card !== 'beacon') { a.draw(1); a.score(8); } } }],
    run(a) { const t = a.lastActive(2); if (t && a.repeat(t)) a.score(2); },
    rb: { p: 2, rel: 0.6, u: 4, react: { p: 8, rate: 0.12 }, u2: 3, why: 'Loss becomes momentum.' },
  },
];

export const BEACON = {
  id: 'beacon', n: 'Charter Beacon', cl: 'neutral', t: 'E', r: 'C', tags: ['Beacon'], trig: 'passive',
  text: 'The landing zone. Buildings in the Beacon\'s network score +1 on their first scoring activation each turn. Integrate charter stamp: connect buildings from all three active clans into the Beacon\'s network.',
};

export const CARDS = {};
for (const c of list.concat(foundry)) {
  c.L = c.L || [];
  CARDS[c.id] = c;
}
for (const c of foundry) c.shop = true;
CARDS.beacon = Object.assign(BEACON, { L: [] });

export const CARD_LIST = list;
export const clanCards = (cl) => list.filter((c) => c.cl === cl);
export const FOUNDRY_LIST = foundry;
export function canRepeatCard(c) { return !!(c.run || c.build); }
