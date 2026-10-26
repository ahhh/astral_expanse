// Clan Compacts: when two clans share a treaty, each upgrades one of its
// buildings into a compact version that feeds on the other clan. Every pair
// of clans makes two unique upgrades (one per clan), so a trio carries six.
// A compact replaces its base card in the clan's draw pool for that colony.
//
// Each entry adds one partner hook to its base card:
//   hook  reactive bonus: { on, r, res?, from?, pts, fx? } – fires once per
//         turn when the event happens within range r (`from`: only when a
//         partner building caused it); `fx(a, ev)` may do extra work
//   adj   periodic bonus: { what, r, per, max } – after the base effect,
//         +per for each partner building / Habitat / Anomaly nearby
import { RES } from './resources.js';

// The weaker clans' compacts (Ironwake, Cryostead, Verdant, Wreckborn) hit a little harder.
const WEAK = new Set(['iron', 'cryo', 'verd', 'wreck']);
const WEAK_BONUS = 1;

export const COMPACT_DEFS = [
  // ---- Ironwake
  { cl: 'iron', p: 'helio', base: 'thermite_bore', n: 'Sunforge Bore', hook: { on: 'heat', r: 3, from: true, pts: 3 } },
  { cl: 'iron', p: 'cryo', base: 'mantle_cutter', n: 'Frostcrack Cutter', adj: { what: 'partner', r: 2, per: 1, max: 2 } },
  { cl: 'iron', p: 'verd', base: 'gravity_anchor', n: 'Rootbound Anchor', hook: { on: 'create', res: 'Biomass', r: 3, pts: 3, fx: 'stabilize' } },
  { cl: 'iron', p: 'syn', base: 'seismic_geophone', n: 'Resonant Geophone', hook: { on: 'repeat', r: 2, pts: 1 } },
  { cl: 'iron', p: 'wreck', base: 'scrapline_crusher', n: 'Salvage Crusher', hook: { on: 'create', res: 'Scrap', r: 2, from: true, pts: 0 } },
  { cl: 'iron', p: 'kep', base: 'ore_shuttle', n: 'Orbital Ore Shuttle', hook: { on: 'launch', r: 2, pts: 1 } },
  { cl: 'iron', p: 'hearth', base: 'core_lattice', n: 'Habitat Lattice', adj: { what: 'pHabitat', r: 2, per: 2, max: 2 } },
  { cl: 'iron', p: 'umbra', base: 'crustbreaker', n: 'Rift Breaker', adj: { what: 'Anomaly', r: 2, per: 4, max: 2 } },
  // ---- Heliarch
  { cl: 'helio', p: 'iron', base: 'solar_furnace', n: 'Forge Furnace', adj: { what: 'partner', r: 1, per: 2, max: 2 } },
  { cl: 'helio', p: 'cryo', base: 'glacier_mirror', n: 'Glacier Lens Array', hook: { on: 'melt', r: 2, from: true, pts: 3 } },
  { cl: 'helio', p: 'verd', base: 'helium_skimmer', n: 'Bloom Skimmer', hook: { on: 'create', res: 'Biomass', r: 3, pts: 3 } },
  { cl: 'helio', p: 'syn', base: 'heliograph_array', n: 'Heliograph Relay', adj: { what: 'partner', r: 2, per: 1, max: 1 } },
  { cl: 'helio', p: 'wreck', base: 'photon_kiln', n: 'Slag Kiln', hook: { on: 'create', res: '#Scrap', r: 3, pts: 4 } },
  { cl: 'helio', p: 'kep', base: 'capacitor_bloom', n: 'Orbital Capacitor', hook: { on: 'arrival', r: 'map', pts: 2 } },
  { cl: 'helio', p: 'hearth', base: 'thermal_mirror', n: 'Hearth Mirror', adj: { what: 'Habitat', r: 1, per: 2, max: 2 } },
  { cl: 'helio', p: 'umbra', base: 'prism_farm', n: 'Rift Prism Farm', adj: { what: 'Anomaly', r: 2, per: 3, max: 2 } },
  // ---- Cryostead
  { cl: 'cryo', p: 'iron', base: 'sublimator', n: 'Fracture Sublimator', hook: { on: 'excavate', r: 2, pts: 3, fx: 'iceSeam' } },
  { cl: 'cryo', p: 'helio', base: 'thermal_valve', n: 'Heat Exchange Valve', hook: { on: 'heat', r: 2, from: true, pts: 1, fx: 'condense' } },
  { cl: 'cryo', p: 'verd', base: 'dew_cistern', n: 'Dew Garden', hook: { on: 'create', res: 'Biomass', r: 3, pts: 3 } },
  { cl: 'cryo', p: 'syn', base: 'frost_lens', n: 'Signal Frost Lens', hook: { on: 'repeat', r: 2, pts: 2 } },
  { cl: 'cryo', p: 'wreck', base: 'brine_tank', n: 'Ballast Brine Tank', adj: { what: 'partner', r: 2, per: 1, max: 2 } },
  { cl: 'cryo', p: 'kep', base: 'comet_hook', n: 'Comet Shepherd Hook', hook: { on: 'arrival', r: 'map', pts: 1 } },
  { cl: 'cryo', p: 'hearth', base: 'habitat_cold_store', n: 'Cold Commons Store', adj: { what: 'Habitat', r: 1, per: 1, max: 1 } },
  { cl: 'cryo', p: 'umbra', base: 'shade_screen', n: 'Void Shade Screen', hook: { on: 'radiation', r: 1, pts: 3, fx: 'freezeRad' } },
  // ---- Verdant
  { cl: 'verd', p: 'iron', base: 'deepcave_mycelium', n: 'Deep Root Mycelium', hook: { on: 'excavate', r: 2, from: true, pts: 3 } },
  { cl: 'verd', p: 'helio', base: 'algae_tank', n: 'Grow-Light Algae Tank', adj: { what: 'partner', r: 1, per: 1, max: 1 } },
  { cl: 'verd', p: 'cryo', base: 'oxygen_orchard', n: 'Frost Orchard', hook: { on: 'melt', r: 2, from: true, pts: 3, fx: 'pressurize' } },
  { cl: 'verd', p: 'syn', base: 'root_tunnel', n: 'Neural Root Tunnel', adj: { what: 'netPartner', per: 1, max: 1 } },
  { cl: 'verd', p: 'wreck', base: 'myco_bloom', n: 'Rot Bloom', hook: { on: 'consume', res: ['#Scrap', 'Wreck'], r: 2, from: true, pts: 3 } },
  { cl: 'verd', p: 'kep', base: 'living_shipyard', n: 'Seedship Yard', adj: { what: 'netPartner', per: 1, max: 2 } },
  { cl: 'verd', p: 'hearth', base: 'symbiotic_cradle', n: 'Commons Cradle', adj: { what: 'Habitat', r: 1, per: 1, max: 2 } },
  { cl: 'verd', p: 'umbra', base: 'mutagen_bed', n: 'Rift Mutagen Bed', hook: { on: 'radiation', r: 2, pts: 3, fx: 'bloom' } },
  // ---- Synapse
  { cl: 'syn', p: 'iron', base: 'survey_drone_port', n: 'Prospecting Drone Port', hook: { on: 'extract', r: 2, pts: 3 } },
  { cl: 'syn', p: 'helio', base: 'sensor_weave', n: 'Photon Sensor Weave', adj: { what: 'partner', r: 2, per: 1, max: 1 } },
  { cl: 'syn', p: 'cryo', base: 'path_optimizer', n: 'Ice-Bridge Optimizer', adj: { what: 'netPartner', per: 1, max: 3 } },
  { cl: 'syn', p: 'verd', base: 'cargo_bot', n: 'Seed Drone', hook: { on: 'create', res: 'Biomass', r: 3, pts: 3 } },
  { cl: 'syn', p: 'wreck', base: 'scrapper_swarm', n: 'Salvage Swarm', hook: { on: 'destroy', r: 2, pts: 4 } },
  { cl: 'syn', p: 'kep', base: 'trigger_coil', n: 'Launch Coil', hook: { on: 'launch', r: 2, pts: 3 } },
  { cl: 'syn', p: 'hearth', base: 'census_relay', n: 'Census Bureau', adj: { what: 'Habitat', r: 2, per: 1, max: 1 } },
  { cl: 'syn', p: 'umbra', base: 'replicator_bay', n: 'Rift Replicator', hook: { on: 'create', res: 'Anomaly', r: 3, pts: 4 } },
  // ---- Wreckborn
  { cl: 'wreck', p: 'iron', base: 'fuse_charger', n: 'Thermite Charger', adj: { what: 'partner', r: 1, per: 1, max: 1 } },
  { cl: 'wreck', p: 'helio', base: 'patchwork_hull', n: 'Solar Patch Hull', adj: { what: 'partner', r: 2, per: 1, max: 1 } },
  { cl: 'wreck', p: 'cryo', base: 'ramjet_scow', n: 'Steam Ramjet Scow', hook: { on: 'melt', r: 2, from: true, pts: 3 } },
  { cl: 'wreck', p: 'verd', base: 'derelict_tug', n: 'Overgrown Tug', hook: { on: 'create', res: 'Biomass', r: 3, pts: 3 } },
  { cl: 'wreck', p: 'syn', base: 'black_box_booth', n: 'Neural Black Box', hook: { on: 'repeat', r: 2, pts: 3 } },
  { cl: 'wreck', p: 'kep', base: 'jetsam_collector', n: 'Orbital Jetsam Net', hook: { on: 'arrival', r: 'map', pts: 1 } },
  { cl: 'wreck', p: 'hearth', base: 'blast_fence', n: 'Civic Blast Fence', adj: { what: 'Habitat', r: 1, per: 2, max: 2 } },
  { cl: 'wreck', p: 'umbra', base: 'rift_scavenger', n: 'Void Scavenger', hook: { on: 'create', res: 'Anomaly', r: 2, pts: 4 } },
  // ---- Kepler
  { cl: 'kep', p: 'iron', base: 'ore_catapult', n: 'Mass Ore Catapult', hook: { on: 'create', res: ['Metal', 'Alloy'], r: 2, from: true, pts: 1 } },
  { cl: 'kep', p: 'helio', base: 'satellite_orchard', n: 'Solar Satellite Orchard', adj: { what: 'partner', r: 1, per: 1, max: 1 } },
  { cl: 'kep', p: 'cryo', base: 'comet_tender', n: 'Comet Courier', hook: { on: 'create', res: 'Ice', r: 2, from: true, pts: 2 } },
  { cl: 'kep', p: 'verd', base: 'cycler_shuttle', n: 'Garden Cycler', hook: { on: 'create', res: 'Biomass', r: 3, pts: 2 } },
  { cl: 'kep', p: 'syn', base: 'radar_dish', n: 'Signal Radar', adj: { what: 'partner', r: 2, per: 1, max: 1 } },
  { cl: 'kep', p: 'wreck', base: 'mass_driver', n: 'Scrap Driver', hook: { on: 'create', res: 'Scrap', r: 2, from: true, pts: 1 } },
  { cl: 'kep', p: 'hearth', base: 'docking_hoop', n: 'Welcome Hoop', hook: { on: 'arrival', r: 'orbit', pts: 1, fx: 'habitat1' } },
  { cl: 'kep', p: 'umbra', base: 'perigee_loom', n: 'Tidal Loom', adj: { what: 'Anomaly', r: 2, per: 1, max: 2 } },
  // ---- Hearthline
  { cl: 'hearth', p: 'iron', base: 'transit_causeway', n: 'Mine Causeway', adj: { what: 'netPartner', per: 1, max: 1 } },
  { cl: 'hearth', p: 'helio', base: 'thermal_commons', n: 'Solar Commons', hook: { on: 'heat', r: 2, from: true, pts: 2 } },
  { cl: 'hearth', p: 'cryo', base: 'life_support_array', n: 'Cryo Life Support', hook: { on: 'create', res: 'Water', r: 2, from: true, pts: 2 } },
  { cl: 'hearth', p: 'verd', base: 'greenhouse_refectory', n: 'Garden Refectory', hook: { on: 'create', res: 'Biomass', r: 3, pts: 2 } },
  { cl: 'hearth', p: 'syn', base: 'education_spire', n: 'Signal Spire', hook: { on: 'repeat', r: 2, pts: 2 } },
  { cl: 'hearth', p: 'wreck', base: 'shielded_nursery', n: 'Salvage Nursery', adj: { what: 'partner', r: 1, per: 3, max: 2 } },
  { cl: 'hearth', p: 'kep', base: 'welcome_hall', n: 'Grand Welcome Hall', hook: { on: 'arrival', r: 'map', pts: 1 } },
  { cl: 'hearth', p: 'umbra', base: 'stargazer_memorial', n: 'Rift Memorial', adj: { what: 'Anomaly', r: 3, per: 1, max: 2 } },
  // ---- Umbra
  { cl: 'umbra', p: 'iron', base: 'entropy_probe', n: 'Core Entropy Probe', hook: { on: 'excavate', r: 2, from: true, pts: 3 } },
  { cl: 'umbra', p: 'helio', base: 'heatwell_rift', n: 'Solar Heatwell', hook: { on: 'heat', r: 2, from: true, pts: 1 } },
  { cl: 'umbra', p: 'cryo', base: 'darklight_condenser', n: 'Cryo Condenser', hook: { on: 'create', res: ['Ice', 'Water'], r: 3, pts: 3 } },
  { cl: 'umbra', p: 'verd', base: 'radiation_siphon', n: 'Bloom Siphon', hook: { on: 'create', res: 'Biomass', r: 3, pts: 3 } },
  { cl: 'umbra', p: 'syn', base: 'resonance_well', n: 'Choir Well', hook: { on: 'repeat', r: 2, pts: 2 } },
  { cl: 'umbra', p: 'wreck', base: 'decay_observatory', n: 'Salvage Observatory', adj: { what: 'partner', r: 2, per: 1, max: 2 } },
  { cl: 'umbra', p: 'kep', base: 'uncertainty_gate', n: 'Orbital Uncertainty Gate', hook: { on: 'arrival', r: 'map', pts: 2 } },
  { cl: 'umbra', p: 'hearth', base: 'rift_ward', n: 'Civic Rift Ward', adj: { what: 'Habitat', r: 1, per: 2, max: 2 } },
];

export const compactId = (base, partner) => `${base}__${partner}`;

const EV = {
  heat: 'a hex becomes Hot', cool: 'a hex is cooled', melt: 'Ice melts', excavate: 'a Cavern is excavated',
  extract: 'Ore is extracted', repeat: 'a building is repeated', launch: 'a resource is launched into orbit',
  arrival: 'Cargo arrives in orbit', destroy: 'a building is destroyed', radiation: 'Radiation appears',
};
const resName = (sel) => [].concat(sel).map((s) => (s[0] === '#' ? s.slice(1) : RES[s].n)).join(' or ');
const where = (r) => (r === 'map' ? ' anywhere' : r === 'orbit' ? ' (orbit-linked)' : ` within range ${r}`);
const byPartner = (a, ev, p) => { const s = ev && ev.src != null && a.byId(ev.src); return !!s && s.clan === p; };

// Extra work some hooks do besides scoring. Each returns a short text clause.
const FX = {
  crack: { t: 'the thermal shock cracks an adjacent Rock into a Cavern', run(a) { const k = a.near(a.k, 1).find((x) => a.kind(x) === 'rock'); if (k) a.excavate(k); } },
  stabilize: { t: 'that hex becomes Stable', run(a, ev) { a.addSt(ev.k, 'Stable'); } },
  iceSeam: { t: 'an Ice seam is exposed in it', run(a, ev) { a.createAt('Ice', ev.k); } },
  condense: { t: 'condense a Water beside this', run(a) { a.create('Water', a.k, 1); } },
  freezeRad: { t: 'the Radiation freezes out and the hex turns Cold', run(a, ev) { a.rmSt(ev.k, 'Radiation'); a.addSt(ev.k, 'Cold', 3); } },
  pressurize: { t: 'Pressurize this hex for 3 turns', run(a) { a.addSt(a.k, 'Pressure', 3); } },
  bloom: { t: 'grow a Biomass beside this', run(a) { a.create('Biomass', a.k, 1); } },
  habitat1: { t: 'plus +1 per Habitat within range 2 (max 2)', run(a) { a.score(Math.min(2, a.bldNear(a.k, '#Habitat', 2).length)); } },
};

function adjCount(a, adj, p) {
  if (adj.what === 'partner') return a.bldNear(a.k, (b) => b.clan === p, adj.r).length;
  if (adj.what === 'netPartner') return a.net().filter((b) => b.clan === p).length;
  if (adj.what === 'Habitat') return a.bldNear(a.k, '#Habitat', adj.r).length;
  if (adj.what === 'pHabitat') return a.bldNear(a.k, (b) => a.has(b, 'Habitat') && a.st(b.k, 'Pressure'), adj.r).length;
  if (adj.what === 'Anomaly') return a.resNear(a.k, 'Anomaly', adj.r).length;
  return 0;
}
function adjText(adj, P) {
  const what = {
    partner: `${adj.r === 1 ? 'adjacent' : ''} ${P} building${adj.r > 1 ? ` within range ${adj.r}` : ''}`.trim(),
    netPartner: `${P} building in its network`,
    Habitat: adj.r === 1 ? 'adjacent Habitat' : `Habitat within range ${adj.r}`,
    pHabitat: `Pressurized Habitat within range ${adj.r}`,
    Anomaly: `Anomaly within range ${adj.r}`,
  }[adj.what];
  return `Compact: each time it activates on its timer, +${adj.per} more per ${what} (max ${adj.max}).`;
}

// Builds the compact cards from their base cards. Called once by cards.js.
export function buildCompacts(CARDS, CLANS) {
  const out = [];
  for (const d of COMPACT_DEFS) {
    const b = CARDS[d.base];
    if (!b || b.cl !== d.cl) throw new Error(`compact base ${d.base} is not a ${d.cl} card`);
    const P = CLANS[d.p].n.split(' ')[0];
    const c = Object.assign({}, b, {
      id: compactId(d.base, d.p), n: d.n, base: d.base, partner: d.p, compact: true,
      L: b.L.slice(), rb: Object.assign({}, b.rb), ally: undefined,
    });
    if (d.adj && !b.run) throw new Error(`compact base ${d.base} has no timer for an adjacency bonus`);
    const boost = WEAK.has(d.cl) ? WEAK_BONUS : 0;
    if (d.hook) {
      const hk = d.hook;
      const pts = hk.pts + boost;
      const fx = hk.fx && FX[hk.fx];
      c.L.push({
        on: hk.on, r: hk.r, run(a, self, ev) {
          if (hk.res && !a.is(ev.res, hk.res)) return;
          if (hk.from && !byPartner(a, ev, d.p)) return;
          if (!a.once('cx')) return;
          if (fx) fx.run(a, ev);
          a.score(pts);
        },
      });
      const what = hk.on === 'create' ? `${resName(hk.res)} appears` : hk.on === 'consume' ? `${resName(hk.res)} is consumed` : EV[hk.on];
      c.text = `${b.text} Compact: once per turn, when ${what}${where(hk.r)}${hk.from ? ` from a ${P} building` : ''}, +${pts}${fx ? ` and ${fx.t}` : ''}.`;
      c.cx = { kind: 'hook', p: pts + (hk.fx === 'habitat1' ? 1.5 : 0), rate: hk.r === 'map' ? 0.45 : 0.3 };
    } else {
      const adj = Object.assign({}, d.adj, { per: d.adj.per + boost });
      const run = b.run;
      c.run = function (a, self, ev) {
        run.call(this, a, self, ev);
        const n = Math.min(adj.max, adjCount(a, adj, d.p));
        if (n) a.score(adj.per * n);
      };
      c.text = `${b.text} ${adjText(adj, P)}`;
      c.cx = { kind: 'adj', p: adj.per * Math.min(adj.max, 1.2), rate: 0.5 };
    }
    out.push(c);
  }
  return out;
}
