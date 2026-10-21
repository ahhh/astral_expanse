// Star chart and between-colony screens.
import { h, s, sheet, toast, closeSheets } from './dom.js';
import { cardEl, cardText, trigLabel } from './cardview.js';
import { CARDS, CLANS, RARITY, TIER, clanCards } from '../engine/cards.js';
import { WORLD, FAMILIES, FAMILY_INFO } from '../engine/resources.js';
import { rubric } from '../engine/rubric.js';
import * as X from '../engine/expedition.js';

const RES_ORDER = ['CR', 'AL', 'CY', 'GE', 'DA', 'GS'];
const TABS = [['chart', '🗺️', 'Chart'], ['net', '🛰️', 'Network'], ['dir', '🏛️', 'Clans'], ['foundry', '🔧', 'Foundry'], ['fleet', '🚀', 'Fleet'], ['goals', '🎯', 'Goals']];

export function resBar(E) {
  return h('div', { class: 'res' }, RES_ORDER.map((r) => h('span', { class: 'chip', title: WORLD[r].n }, WORLD[r].ic, ' ', E.res[r], ' ', h('span', { class: 'faint' }, r))));
}
function pips(n) {
  return h('span', { class: 'pips' }, [0, 1, 2, 3, 4].map((i) => h('i', { class: i < n ? 'on' : '' })));
}
export function profileEl(p) {
  return h('div', { class: 'prof' }, FAMILIES.map((f) => [h('span', null, FAMILY_INFO[f].ic, ' ', FAMILY_INFO[f].n), pips(p[f])]));
}
const clanChip = (c, extra = '') => h('span', { class: 'chip', style: { color: CLANS[c].col, borderColor: CLANS[c].col } }, CLANS[c].ic, ' ', CLANS[c].n.split(' ')[0], extra);
const costBtn = (E, label, cost, on, extra = {}) => h('button', { class: 'btn small', disabled: !X.canAfford(E, cost) || extra.disabled, onclick: on }, label, Object.keys(cost).length ? ` (${X.costText(cost)})` : ' (free)');

export function overworldScreen(root, E, hooks, tab = 'chart') {
  root.innerHTML = '';
  const press = E.pressure / E.maxPressure;
  const sec = X.sectorOf(X.node(E, E.at).layer);
  const top = h('div', { class: 'topbar' },
    h('div', { class: 'row', style: { marginBottom: '6px' } },
      h('h2', { class: 'grow' }, X.SECTORS[sec].n),
      h('span', { class: 'chip', title: 'Difficulty' }, X.diffOf(E).ic),
      h('span', { class: 'chip', title: 'Active clans' }, E.clans.map((c) => CLANS[c].ic).join(''), ` ${E.clans.length}/${X.maxClans(E)}`),
      h('button', { class: 'chip', onclick: () => hooks.menu() }, '☰')),
    resBar(E),
    h('div', { class: 'row', style: { marginTop: '6px', fontSize: '12px' } },
      h('span', { class: 'dim' }, 'Frontier Pressure'),
      h('div', { class: 'meter grow' + (press > 0.7 ? ' danger' : '') }, h('i', { style: { width: Math.min(100, press * 100) + '%' } })),
      h('b', null, `${E.pressure}/${E.maxPressure}`)));
  const body = h('div', { class: tab === 'chart' ? 'chartwrap' : 'page' });
  const badge = { net: X.openCrises(E).length || E.pendingCompact ? '•' : '', goals: !E.contract && E.contractOffers.length ? '•' : '' };
  const tabs = h('div', { class: 'tabs' }, TABS.map(([id, ic, n]) =>
    h('button', { class: tab === id ? 'on' : '', onclick: () => hooks.tab(id) }, h('span', null, ic), n + (badge[id] ? ' •' : ''))));
  root.append(top, body, tabs);
  ({ chart, net: network, dir: directorate, foundry, fleet, goals })[tab](body, E, hooks);
  if (E.pendingCompact) setTimeout(() => compactSheet(E, hooks), 50);
}

// ---------------------------------------------------------------- chart
function chart(body, E, hooks) {
  const W = 360, LH = 92, PAD = 46;
  const nodes = E.chart.nodes;
  const maxL = Math.max(...nodes.map((n) => n.layer));
  const Hgt = PAD * 2 + maxL * LH;
  const pos = (n) => [24 + n.x * (W - 48), PAD + n.layer * LH];
  const reach = new Map(X.reachable(E).map((e) => [e.to, e]));
  const svg = s('svg', { viewBox: `0 0 ${W} ${Hgt}` });
  // Sector bands
  for (let L = 1; L <= maxL; L++) {
    const sct = X.sectorOf(L);
    if (sct === X.sectorOf(L - 1) && L !== 1) continue;
    const y0 = PAD + (L - 0.5) * LH;
    let span = 1;
    while (L + span <= maxL && X.sectorOf(L + span) === sct) span++;
    svg.append(s('rect', { x: 0, y: y0, width: W, height: span * LH, fill: sct % 2 ? '#ffffff05' : 'transparent' }));
    svg.append(s('text', { x: 6, y: y0 + 13, class: 'sector-label' }, X.SECTORS[sct].n));
  }
  for (const e of E.chart.edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const [x1, y1] = pos(a), [x2, y2] = pos(b);
    const trail = (b.parent === a.id && b.state !== 'unvisited') || (a.parent === b.id && a.state !== 'unvisited');
    const isReach = (e.a === E.at && reach.has(e.b)) || (e.b === E.at && reach.has(e.a));
    let d = `M${x1},${y1} L${x2},${y2}`;
    if (e.lateral) d = `M${x1},${y1} Q${(x1 + x2) / 2},${y1 - 26} ${x2},${y2}`;
    svg.append(s('path', { d, fill: 'none', class: 'lane' + (e.lateral ? ' lat' : '') + (trail ? ' trail' : '') + (isReach ? ' reach' : '') }));
  }
  // Built trade lanes on top of the chart routes.
  for (const l of E.lanes) {
    const [x1, y1] = pos(nodes[l.a]), [x2, y2] = pos(nodes[l.b]);
    const bad = X.laneOff(E, l);
    svg.append(s('path', { d: `M${x1},${y1} L${x2},${y2}`, fill: 'none', class: 'lane built' + (bad ? ' off' : l.dmg ? ' dmg' : ''), 'stroke-width': 2 + l.cls * 1.3 }));
  }
  for (const n of nodes) {
    const [x, y] = pos(n);
    const t = X.NODE_TYPES[n.type];
    const known = X.isSurveyed(E, n);
    const cls = 'node-ring' + (reach.has(n.id) ? ' reach' : '') + (n.state === 'claimed' ? ' claimed' : '') + (n.state === 'stranded' ? ' stranded' : '') + (n.id === E.at ? ' here' : '') + (known ? '' : ' unknown');
    const ic = !known ? '❔' : n.type === 'enclave' ? CLANS[n.clan].ic : t.ic;
    const nm = known ? n.name : 'Unsurveyed';
    const g = s('g', { class: 'node-c', onclick: () => nodeSheet(E, n, reach.get(n.id), hooks) },
      s('circle', { cx: x, cy: y, r: n.type === 'boss' ? 21 : 17, class: cls }),
      s('text', { x, y: y + 6, 'text-anchor': 'middle', 'font-size': n.type === 'boss' ? 19 : 16 }, ic),
      s('text', { x, y: y + 31, 'text-anchor': 'middle', class: 'node-name' }, nm.length > 12 ? nm.slice(0, 11) + '…' : nm));
    if (n.connected && n.type !== 'ark') g.append(s('circle', { cx: x + 13, cy: y - 13, r: 4.5, fill: '#49d17d' }));
    if (n.state === 'claimed' && n.charges) g.append(s('text', { x: x + 20, y: y + 4, 'font-size': 9, 'font-weight': 700, fill: '#49d17d' }, `×${n.charges}`));
    svg.append(g);
  }
  body.append(svg);
  requestAnimationFrame(() => {
    const [, y] = pos(X.node(E, E.at));
    body.scrollTop = (y / Hgt) * body.scrollHeight - body.clientHeight / 3;
  });
  const here = X.node(E, E.at);
  if (X.atHub(E)) {
    body.append(h('div', { style: { position: 'sticky', bottom: '8px', padding: '0 12px' } }, h('button', { class: 'btn block primary', onclick: () => freeportSheet(E, hooks) }, here.type === 'ark' ? '🚀 Arkship services: exchange & treaty' : '⚓ Freeport services: exchange, treaty & Foundry')));
  }
  if (!reach.size && E.status === 'active' && !E.colony) {
    body.append(h('p', { class: 'warn', style: { padding: '0 12px' } }, 'No onward lanes from here. Use the menu to end the expedition.'));
  }
}

function nodeSheet(E, n, edge, hooks) {
  const t = X.NODE_TYPES[n.type];
  const known = X.isSurveyed(E, n);
  const b = h('div', null);
  if (!known) {
    b.append(h('p', { class: 'dim', style: { marginTop: 0 } }, `Beyond your survey horizon (${X.surveyRange(E)} layers ahead). Its type, resources and hazards are unknown. A Survey Mast or a claimed Research Observatory extends the horizon.`));
  } else {
    b.append(h('p', { class: 'dim', style: { marginTop: 0 } }, t.d));
    if (n.type === 'enclave') {
      const join = !E.clans.includes(n.clan) && E.clans.length < X.maxClans(E);
      b.append(h('p', null, 'Resident clan: ', h('b', { style: { color: CLANS[n.clan].col } }, `${CLANS[n.clan].ic} ${CLANS[n.clan].n}`), ` – ${CLANS[n.clan].d}`),
        h('p', { class: join ? 'good' : 'dim' }, join ? `You have a free treaty slot: ${CLANS[n.clan].n} joins you on this map and stays in your treaty if you secure it.` : E.clans.includes(n.clan) ? 'Already in your treaty.' : `All ${X.maxClans(E)} treaty slots are full: you bench one clan for this map, and securing it licenses ${CLANS[n.clan].n} for later swaps.`));
    }
    if (n.type === 'boss') {
      const B = X.BOSSES[n.boss];
      b.append(h('h4', null, B.s), h('p', null, B.d), h('p', { class: 'dim' }, `25 turns, a large map, and a required stabilization objective. See the Goals tab for the Veil checklist.`));
    }
    if (n.profile) b.append(h('div', { class: 'sect' }, 'Resource profile'), profileEl(n.profile));
  }
  const actions = [];
  if (n.state !== 'unvisited') {
    b.append(h('div', { class: 'sect' }, 'Status'), h('p', null, n.state === 'claimed' ? `Claimed – ${n.charter || 'colony'}` : n.state === 'stranded' ? 'Stranded site' : 'Visited'));
    if (n.state === 'claimed' && n.type !== 'boss') {
      b.append(h('p', { class: 'dim' }, `Route yield: ${n.yieldN} ${n.yieldRes} per jump · ${n.charges} charges left · ${n.connected ? 'supplied ✅' : 'not supplied – build a lane to a supplied node'}`));
    }
    if (n.state === 'stranded' && n.type !== 'boss') {
      const c = X.rescueCost(E);
      actions.push({ label: `Rescue (${X.costText(c)}, +1 Pressure)`, disabled: !X.canAfford(E, c) || !!E.colony, on: () => { X.rescue(E, n.id); hooks.refresh(); } });
    }
    if (X.isNetNode(n)) {
      const lanes = E.lanes.filter((l) => l.a === n.id || l.b === n.id);
      if (lanes.length) b.append(h('div', { class: 'sect' }, 'Lanes'), ...lanes.map((l) => h('div', { class: 'faint', style: { fontSize: '12px' } }, `${X.LANE_CLASS[l.cls].n} to ${X.node(E, l.a === n.id ? l.b : l.a).name} · cap ${X.laneCap(E, l)}`)));
      const opts = X.laneOptions(E, n.id).slice(0, 4);
      for (const o of opts) actions.push({ label: `Lane → ${X.node(E, o.to).name} (${X.costText(o.cost)})`, disabled: !X.canAfford(E, o.cost), on: () => { X.buildLane(E, n.id, o.to); hooks.refresh(); } });
    }
  }
  if (edge) {
    const c = X.travelCost(E, edge);
    const pv = X.missionPreview(E, n);
    if (n.type !== 'freeport' && known) b.append(h('div', { class: 'sect' }, 'Mission'), h('p', { class: 'dim' }, `${pv.turns} turns · map radius ${pv.R} · checkpoint difficulty ×${pv.diff.toFixed(2)}${E.preps.length ? ` · preparations: ${E.preps.map((p) => X.PREPS[p].n).join(', ')}` : ''}`));
    b.append(h('div', { class: 'sect' }, 'Jump'), h('p', null, c.tow ? h('span', { class: 'warn' }, `Not enough CY (${c.CY} needed): emergency tow costs +2 extra Pressure.`) : `Costs ${c.CY} CY`, c.notes.length ? h('span', { class: 'good' }, ` (${c.notes.join(', ')})`) : null, ` · +${c.pressure} Frontier Pressure${edge.lateral ? ' (lateral detour)' : ''}`));
    actions.unshift({
      label: n.type === 'freeport' ? 'Jump & dock' : n.type === 'boss' ? 'Approach the Veil' : 'Jump & land', cls: 'primary', on: () => {
        if (n.type === 'boss') return veilSheet(E, n, hooks);
        if (n.type === 'enclave' && !E.clans.includes(n.clan) && E.clans.length >= X.maxClans(E)) benchSheet(E, n, hooks);
        else hooks.travel(n.id);
      },
    });
  }
  sheet({ title: `${!known ? '❔' : n.type === 'enclave' ? CLANS[n.clan].ic : t.ic} ${known ? n.name : 'Unsurveyed world'}`, body: b, actions });
}

function benchSheet(E, n, hooks) {
  const guest = n.clan;
  sheet({
    title: 'Guest Treaty',
    body: h('div', null,
      h('p', null, `${CLANS[guest].n} will join you for this colony. Your treaty is full, so choose one active clan to bench – it returns after the map. Securing the colony licenses ${CLANS[guest].n} for future swaps.`),
      h('div', { class: 'list' }, E.clans.map((c) => h('button', { class: 'btn block', style: { borderColor: CLANS[c].col }, onclick: () => { closeSheets(); hooks.travel(n.id, c); } }, `Bench ${CLANS[c].ic} ${CLANS[c].n}`)))),
  });
}

// The Veil Relay: final checklist, Supply Tokens and one free clan swap.
function veilSheet(E, n, hooks) {
  const v = X.veilStatus(E);
  const chosen = [];
  let swap = null;
  const b = h('div', null);
  const draw = () => {
    b.innerHTML = '';
    const chk = (ok, txt) => h('div', { class: 'stamp' }, h('span', { class: 'ok' + (ok ? ' y' : '') }, ok ? '✓' : '✗'), txt);
    b.append(h('p', { class: 'dim', style: { marginTop: 0 } }, `${X.BOSSES[n.boss].n}: ${X.BOSSES[n.boss].s}. Missing requirements don't lock the finale – they make it harder.`),
      chk(v.shardsOk, `Gate Shards ${v.shards}/3 (each missing shard: checkpoints +20%)`),
      chk(v.throughputOk, `Peak supplied throughput ${v.throughput}/8 (below 8: checkpoints +10%)`),
      chk(v.cyOk, `Cryo Isotopes for the final jump ${v.cy}/3`),
      h('div', { class: 'sect' }, `Supply Tokens (${chosen.length}/${v.tokens})`),
      h('p', { class: 'faint', style: { fontSize: '12px', margin: 0 } }, 'Your network earns one token per 3 units of peak throughput (max 3). Each token converts a sealed cargo bundle into a finale advantage.'));
    for (const [id, sp] of Object.entries(X.SUPPLY)) {
      const on = chosen.includes(id);
      const spent = {};
      for (const c of chosen) for (const [r, k] of Object.entries(X.SUPPLY[c].cost)) spent[r] = (spent[r] || 0) + k;
      const left = Object.fromEntries(Object.entries(E.res).map(([r, k]) => [r, k - (spent[r] || 0)]));
      const can = on || (chosen.length < v.tokens && Object.entries(sp.cost).every(([r, k]) => left[r] >= k));
      b.append(h('button', { class: 'charter' + (on ? ' on' : ''), disabled: !can, style: { marginBottom: '6px', opacity: can ? 1 : 0.45 }, onclick: () => { if (on) chosen.splice(chosen.indexOf(id), 1); else chosen.push(id); draw(); } },
        h('div', { class: 'row' }, h('b', { class: 'grow' }, sp.n), h('span', { class: 'dim' }, X.costText(sp.cost))), h('div', { class: 'dim', style: { fontSize: '12px' } }, sp.d)));
    }
    const bench = E.licensed.filter((c) => !E.clans.includes(c));
    if (bench.length && E.clans.length) {
      b.append(h('div', { class: 'sect' }, 'Complimentary clan swap (optional)'));
      for (const inn of bench) b.append(h('div', { class: 'row wrap', style: { marginBottom: '4px' } }, clanChip(inn), ...E.clans.map((out) => h('button', { class: 'btn small' + (swap && swap.inn === inn && swap.out === out ? ' primary' : ''), onclick: () => { swap = swap && swap.inn === inn && swap.out === out ? null : { inn, out }; draw(); } }, `replace ${CLANS[out].ic}`))));
    }
  };
  draw();
  sheet({ title: '🌌 The Veil Relay', body: b, actions: [{ label: 'Cancel' }, { label: 'Jump to the Crown', cls: 'primary', on: () => hooks.travel(n.id, null, { supply: chosen, veilSwap: swap }) }] });
}

function compactSheet(E, hooks) {
  if (!E.pendingCompact) return;
  const members = E.pendingCompact.split(',').map((id) => X.node(E, +id).name);
  sheet({
    title: '💫 Trade Compact',
    dismissable: false,
    body: h('div', null, h('p', null, `Your lanes now form a trade ring through ${members.join(', ')} with three charter types. Exports can detour around crises, and the ring earns a compact:`),
      h('div', { class: 'list' }, Object.entries(X.COMPACTS).map(([id, c]) => h('button', { class: 'charter', onclick: () => { X.chooseCompact(E, id); closeSheets(); hooks.refresh(); } }, h('b', null, `${c.ic} ${c.n}`), h('div', { class: 'dim', style: { fontSize: '12px' } }, c.d))))),
  });
}

function freeportSheet(E, hooks) {
  const b = h('div', null);
  const again = () => { closeSheets(); hooks.refresh(); freeportSheet(E, hooks); };
  b.append(h('div', { class: 'sect' }, 'Exchange'));
  b.append(h('div', { class: 'list' }, X.exchangeRates(E).map((x) => h('button', { class: 'btn block', disabled: !X.canAfford(E, x.give), onclick: () => { X.exchange(E, x.id); again(); } }, x.d))));
  b.append(treatyEl(E, again));
  b.append(h('div', { class: 'sect' }, 'Card Foundry'), h('button', { class: 'btn block', disabled: !X.canAfford(E, { CR: 2 }), onclick: () => { X.refreshFoundry(E); again(); toast('Foundry offers refreshed'); } }, 'Refresh the Foundry offers (2 CR)'));
  sheet({ title: 'Services', body: b });
}

function treatyEl(E, again) {
  const b = h('div', null, h('div', { class: 'sect' }, `Treaty amendment (${X.costText(X.DIR_COST.swap)})`));
  const bench = E.licensed.filter((c) => !E.clans.includes(c));
  if (!bench.length) b.append(h('p', { class: 'dim' }, 'No licensed clans on the bench. Secure a Clan Enclave to license one.'));
  for (const inn of bench) {
    b.append(h('div', { class: 'item' }, h('h4', { style: { color: CLANS[inn].col } }, `${CLANS[inn].ic} Bring in ${CLANS[inn].n}`),
      h('div', { class: 'row wrap' },
        E.clans.length < X.maxClans(E) ? h('button', { class: 'btn small primary', disabled: !X.canAfford(E, X.DIR_COST.swap), onclick: () => { X.swapClan(E, null, inn); again(); } }, 'add to an empty slot') : null,
        E.clans.map((out) => h('button', { class: 'btn small', disabled: !X.canAfford(E, X.DIR_COST.swap), onclick: () => { X.swapClan(E, out, inn); again(); } }, `replace ${CLANS[out].ic}`)))));
  }
  if (E.contacts.length && X.atHub(E)) {
    b.append(h('div', { class: 'sect' }, `Complete a license (${X.costText(X.DIR_COST.license)})`));
    for (const cl of E.contacts) b.append(h('button', { class: 'btn block', disabled: !X.canAfford(E, X.DIR_COST.license), onclick: () => { X.completeLicense(E, cl); again(); } }, `${CLANS[cl].ic} License ${CLANS[cl].n}`));
  }
  return b;
}

// ---------------------------------------------------------------- network
function network(body, E, hooks) {
  const fl = X.routeFlow(E);
  const want = Object.values(fl.want).reduce((x, v) => x + v, 0);
  const act = (fn) => () => { if (fn()) hooks.refresh(); else toast('Cannot afford that'); };
  body.append(h('div', { class: 'item' },
    h('div', { class: 'row' }, h('h4', { class: 'grow' }, 'Shipment forecast (next jump)'), h('b', null, `${fl.total}${want > fl.total ? ` / ${want}` : ''} units`)),
    h('div', { class: 'dim', style: { fontSize: '12px' } }, want > fl.total ? `${want - fl.total} units are lost to lane capacity – build parallel lanes or bigger ones.` : 'Every supplied colony ships its full yield.'),
    h('div', { class: 'faint', style: { fontSize: '12px', marginTop: '4px' } }, `Last jump ${E.lastThroughput || 0} · peak ${E.peakThroughput || 0} (the Veil wants 8) · ${X.supplyTokens(E)} Supply Token(s) earned`)));
  body.append(h('div', { class: 'sect' }, 'Trade policy'), h('div', { class: 'seg' }, ['balanced', 'CY', 'CR', 'AL', 'GE', 'DA'].map((p) => h('button', { class: 'btn small' + (E.policy === p ? ' on' : ''), onclick: () => { E.policy = p; hooks.refresh(); } }, p === 'balanced' ? 'Balanced' : `Priority ${p}`))));

  const cr = X.openCrises(E);
  body.append(h('div', { class: 'sect' }, 'Route crises'));
  if (!cr.length) body.append(h('p', { class: 'dim' }, E.pressure < 4 ? 'The Survey Window is calm. Crises start once Frontier Pressure reaches 4, and are forecast a jump ahead.' : 'No crises forecast. Lane upgrades deflect future ones.'));
  for (const c of cr) {
    const C = X.CRISES[c.type];
    const l = E.lanes.find((x) => x.id === c.lane);
    b(c, C, l);
  }
  function b(c, C, l) {
    body.append(h('div', { class: 'item' }, h('div', { class: 'row' }, h('h4', { class: 'grow' }, `${C.ic} ${C.n}`), h('span', { class: 'chip ' + (c.state === 'forecast' ? 'warn' : 'bad') }, c.state === 'forecast' ? 'next jump' : 'active')),
      h('div', { class: 'dim', style: { fontSize: '12px' } }, `${l ? X.laneName(E, l) : ''}: ${C.d}${c.state === 'forecast' ? ` ${X.LANE_UPGRADES[C.counter].n} on this lane would deflect it.` : ''}`),
      h('div', { class: 'row', style: { marginTop: '6px' } }, costBtn(E, c.state === 'forecast' ? 'Avert' : 'Resolve', C.fix, act(() => X.resolveCrisis(E, c.id))),
        c.state === 'forecast' && l && !l.up[C.counter] ? costBtn(E, `Fit ${X.LANE_UPGRADES[C.counter].n}`, X.LANE_UPGRADES[C.counter].cost, act(() => X.upgradeLane(E, l.id, C.counter))) : null)));
  }

  body.append(h('div', { class: 'sect' }, 'Lanes'));
  if (!E.lanes.length) body.append(h('p', { class: 'dim' }, 'No lanes yet. Claimed colonies only export once a lane links them to the Arkship or a visited Freeport. Short Relays carry 3 units/jump, Midrange Convoys 5, Deep-Space Threads 6.'));
  for (const l of E.lanes) {
    const off = X.laneOff(E, l);
    body.append(h('div', { class: 'item' },
      h('div', { class: 'row' }, h('h4', { class: 'grow' }, X.laneName(E, l)), off ? h('span', { class: 'chip bad' }, 'closed') : l.dmg ? h('span', { class: 'chip warn' }, `−${l.dmg} cap`) : null),
      h('div', { class: 'dim', style: { fontSize: '12px' } }, `${X.LANE_CLASS[l.cls].n} · carrying ${fl.use[l.id] || 0}/${X.laneCap(E, l)}`),
      h('div', { class: 'row wrap', style: { marginTop: '6px' } }, Object.entries(X.LANE_UPGRADES).map(([id, u]) => l.up[id] ? h('span', { class: 'chip good', title: u.d }, u.ic, ' ', u.n) : h('button', { class: 'btn small', title: u.d, disabled: !X.canAfford(E, u.cost), onclick: act(() => X.upgradeLane(E, l.id, id)) }, `${u.ic} ${X.costText(u.cost)}`)))));
  }

  if (E.compacts.length) {
    body.append(h('div', { class: 'sect' }, 'Trade compacts'));
    for (const c of E.compacts) body.append(h('div', { class: 'item' }, h('h4', null, `${X.COMPACTS[c.id].ic} ${X.COMPACTS[c.id].n} ${X.compactActive(E, c.id) || c.id === 'living' ? '' : '(ring not supplied)'}`), h('div', { class: 'dim', style: { fontSize: '12px' } }, X.COMPACTS[c.id].d)));
  }

  body.append(h('div', { class: 'sect' }, 'Colonies'));
  const claimed = E.chart.nodes.filter((n) => n.state === 'claimed' && n.type !== 'boss');
  if (!claimed.length) body.append(h('p', { class: 'dim' }, 'Secure a colony to start your trade network. Three colonies of different charters joined in a loop form a ring and earn a Trade Compact.'));
  for (const n of claimed) {
    const opts = X.laneOptions(E, n.id).slice(0, 3);
    body.append(h('div', { class: 'item' }, h('div', { class: 'row' }, h('h4', { class: 'grow' }, n.name), n.connected ? h('span', { class: 'chip good' }, 'Supplied') : h('span', { class: 'chip' }, 'Dormant')),
      h('div', { class: 'dim', style: { fontSize: '12px' } }, `${n.charter}: ${n.yieldN} ${n.yieldRes}/jump, ${n.charges} charges left${fl.deliver[n.id] != null && fl.deliver[n.id] < (fl.want[n.id] || 0) ? ` · only ${fl.deliver[n.id]} gets through` : ''}`),
      h('div', { class: 'row wrap', style: { marginTop: '6px' } }, opts.map((o) => h('button', { class: 'btn small', disabled: !X.canAfford(E, o.cost), onclick: act(() => X.buildLane(E, n.id, o.to)) }, `→ ${X.node(E, o.to).name} (${X.costText(o.cost)})`)))));
  }
  const stranded = E.chart.nodes.filter((n) => n.state === 'stranded' && n.type !== 'boss');
  if (stranded.length) {
    body.append(h('div', { class: 'sect' }, 'Stranded sites'));
    for (const n of stranded) body.append(h('div', { class: 'item row' }, h('span', { class: 'grow' }, n.name), costBtn(E, 'Rescue', X.rescueCost(E), act(() => X.rescue(E, n.id)), { disabled: !!E.colony })));
  }
}

// ---------------------------------------------------------------- directorate
function directorate(body, E, hooks) {
  const act = (fn) => () => { if (fn()) hooks.refresh(); else toast('Cannot afford that'); };
  body.append(h('p', { class: 'dim', style: { marginTop: 0 } }, `Your treaty holds up to ${X.maxClans(E)} active clans. You start with one; secure Clan Enclaves to bring more in. Each draw picks an active clan by Presence weight, then a card by rarity × Favor weight (Common 1, Uncommon 0.6, Rare 0.3).`));
  const slots = h('div', { class: 'row wrap', style: { marginBottom: '8px' } }, E.clans.map((c) => clanChip(c, ' ✓')));
  for (let i = E.clans.length; i < X.maxClans(E); i++) slots.append(h('span', { class: 'chip faint' }, '◌ empty slot'));
  body.append(slots);
  if (X.canSwapHere(E)) body.append(h('details', { class: 'item' }, h('summary', { style: { cursor: 'pointer' } }, X.atHub(E) ? 'Treaty amendments' : '🛰️ Mobile Embassy: amend the treaty here'), treatyEl(E, () => hooks.refresh())));
  if (E.contacts.length) body.append(h('p', { class: 'faint', style: { fontSize: '12px' } }, `Contacts (license at a Freeport): ${E.contacts.map((c) => CLANS[c].ic + ' ' + CLANS[c].n).join(', ')}`));
  const lv = E.dir.research || 0;
  body.append(h('div', { class: 'item' }, h('h4', null, `🔬 Research tiers (level ${lv}/2)`),
    h('div', { class: 'dim' }, `Mid buildings from turn ${6 - 2 * lv}, Advanced from turn ${11 - 2 * lv}.`),
    lv < 2 ? h('button', { class: 'btn small', style: { marginTop: '6px' }, disabled: !X.canAfford(E, X.DIR_COST.research[lv]), onclick: act(() => X.research(E)) }, `Research (${X.costText(X.DIR_COST.research[lv])})`) : null));
  for (const cl of E.licensed) {
    const active = E.clans.includes(cl);
    const pres = E.dir.presence[cl] || 1;
    const cards = clanCards(cl).concat((E.dir.extra[cl] || []).map((id) => CARDS[id]));
    const totW = cards.reduce((sum, c) => sum + (E.dir.ban.includes(c.id) ? 0 : RARITY[c.r].w * (E.dir.fav[c.id] || 1)), 0);
    const elv = E.enh[cl] || 0;
    const ec = X.enhCost(E, cl);
    const details = h('details', null, h('summary', { class: 'dim', style: { cursor: 'pointer', margin: '6px 0' } }, `Card pool & favors (${cards.length} cards)`),
      h('div', { class: 'list' }, cards.map((c) => {
        const banned = E.dir.ban.includes(c.id);
        const fv = E.dir.fav[c.id] || 1;
        const w = banned ? 0 : RARITY[c.r].w * fv;
        return h('div', { class: 'item codex-card' },
          h('div', null, h('b', null, c.n), ' ', h('span', { class: 'pill-' + c.r }, RARITY[c.r].n), c.shop ? h('span', { class: 'chip', style: { marginLeft: '4px' } }, '🔧 Foundry') : null, h('div', { class: 'faint', style: { fontSize: '11px' } }, `${TIER[c.t]} · ${trigLabel(c)} · ${((w / totW) * 100).toFixed(0)}% of ${CLANS[cl].n.split(' ')[0]} draws`), h('div', { class: 'tx dim', style: { fontSize: '12px' } }, cardText(c.text))),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
            h('span', { class: 'pp pill-' + c.r }, rubric(c).pp + ' PP'),
            banned ? h('button', { class: 'btn small', disabled: !X.canAfford(E, X.DIR_COST.restore), onclick: act(() => X.restore(E, c.id)) }, 'Restore')
              : [fv < 3 ? h('button', { class: 'btn small', disabled: !X.canAfford(E, X.DIR_COST.fav[fv - 1]), onclick: act(() => X.favorUp(E, c.id)) }, `Favor ×${fv + 1}`) : h('span', { class: 'chip' }, 'Favored ×3'),
                X.canBan(E, c.id) ? h('button', { class: 'btn small danger', disabled: !X.canAfford(E, X.DIR_COST.ban), onclick: act(() => X.ban(E, c.id)) }, 'Ban') : null]));
      })));
    body.append(h('div', { class: 'item', style: { borderColor: active ? CLANS[cl].col : 'var(--line)' } },
      h('div', { class: 'row' }, h('h4', { class: 'grow', style: { color: CLANS[cl].col } }, `${CLANS[cl].ic} ${CLANS[cl].n}`), h('span', { class: 'chip' }, active ? 'Active' : 'Bench')),
      h('div', { class: 'dim', style: { fontSize: '12px' } }, CLANS[cl].d),
      h('div', { class: 'row', style: { marginTop: '6px' } }, h('span', null, `Presence ${pres}/3`),
        pres < 3 ? h('button', { class: 'btn small', disabled: !X.canAfford(E, X.DIR_COST.presence[pres - 1]), onclick: act(() => X.presenceUp(E, cl)) }, `Raise (${X.costText(X.DIR_COST.presence[pres - 1])})`) : null),
      h('div', { style: { marginTop: '6px', fontSize: '12px' } },
        X.ENHANCE[cl].map((en, i) => h('div', { class: i < elv ? 'good' : 'dim' }, i < elv ? '✓ ' : '○ ', h('b', null, en.n), ` – ${en.d}`)),
        ec ? costBtn(E, `Enhance → ${X.ENHANCE[cl][elv].n}`, ec, act(() => X.enhance(E, cl))) : null),
      details));
  }
  body.append(h('p', { class: 'faint' }, `Bans: ${E.dir.ban.length}/4 (max 2 per clan, starters cannot be banned). Enhancements apply on every map while the clan is active.`));
}

// ---------------------------------------------------------------- foundry
function foundry(body, E, hooks) {
  body.append(h('p', { class: 'dim', style: { marginTop: 0 } }, 'Shop-only blueprints. Buying one adds the building to its clan\'s draw pool for the rest of the expedition (Mid tier, weight 1 – Favor it in the Clans tab). Offers refresh in every new sector, or for 2 CR at a Freeport.'));
  if (E.freeBlueprint) body.append(h('p', { class: 'good' }, `🎁 ${E.freeBlueprint} free blueprint(s) from contracts.`));
  if (E.foundryDiscount) body.append(h('p', { class: 'good' }, 'Derelict salvage: your next blueprint costs 1 less.'));
  if (!E.foundry.offers.length) body.append(h('p', { class: 'dim' }, 'Sold out for this sector.'));
  for (const cid of E.foundry.offers) {
    const c = CARDS[cid];
    const cost = X.blueprintCost(E, cid);
    const usable = E.clans.includes(c.cl) ? 'active clan' : E.licensed.includes(c.cl) ? 'licensed (bench)' : 'not yet in your treaty';
    body.append(h('div', { class: 'item' },
      h('div', { class: 'row' }, h('h4', { class: 'grow', style: { color: CLANS[c.cl].col } }, `${CLANS[c.cl].ic} ${c.n}`), costBtn(E, 'Buy', cost, () => { if (X.buyBlueprint(E, cid)) { toast(`${c.n} added to the ${CLANS[c.cl].n} pool`); hooks.refresh(); } }, { disabled: !!E.colony })),
      h('div', { class: 'faint', style: { fontSize: '11px' } }, `${c.tags.join(' · ')} · ${trigLabel(c)} · ${usable}`),
      h('div', { class: 'tx dim', style: { fontSize: '12px' } }, cardText(c.text)),
      h('button', { class: 'btn small', style: { marginTop: '6px' }, onclick: () => sheet({ title: c.n, body: cardEl(cid, { big: true }) }) }, 'View card')));
  }
  const owned = Object.values(E.dir.extra).flat();
  if (owned.length) body.append(h('div', { class: 'sect' }, 'Owned blueprints'), h('div', { class: 'row wrap' }, owned.map((id) => h('span', { class: 'chip', style: { color: CLANS[CARDS[id].cl].col } }, CLANS[CARDS[id].cl].ic, ' ', CARDS[id].n))));
}

// ---------------------------------------------------------------- fleet
function fleet(body, E, hooks) {
  body.append(h('div', { class: 'sect' }, `Preparations for the next colony (${E.preps.length}/${E.prepSlots})`));
  body.append(h('div', { class: 'list' }, Object.entries(X.PREPS).map(([id, p]) => {
    const have = E.preps.includes(id);
    return h('div', { class: 'item' }, h('div', { class: 'row' }, h('h4', { class: 'grow' }, p.n), have
      ? h('button', { class: 'btn small', onclick: () => { X.refundPrep(E, id); hooks.refresh(); } }, 'Refund')
      : h('button', { class: 'btn small', disabled: !X.canAfford(E, p.cost) || E.preps.length >= E.prepSlots, onclick: () => { X.buyPrep(E, id); hooks.refresh(); } }, X.costText(p.cost))),
    h('div', { class: 'dim', style: { fontSize: '12px' } }, p.d));
  })));
  body.append(h('div', { class: 'sect' }, 'Fleet Yard (permanent this expedition)'));
  body.append(h('div', { class: 'list' }, Object.entries(X.FLEET).map(([id, f]) => h('div', { class: 'item' },
    h('div', { class: 'row' }, h('h4', { class: 'grow' }, f.n), E.fleet[id] ? h('span', { class: 'chip good' }, 'Installed') : h('button', { class: 'btn small', disabled: !X.canAfford(E, f.cost) || !!E.colony, onclick: () => { X.buyFleet(E, id); hooks.refresh(); } }, X.costText(f.cost))),
    h('div', { class: 'dim', style: { fontSize: '12px' } }, f.d)))));
}

// ---------------------------------------------------------------- goals
function goals(body, E, hooks) {
  const v = X.veilStatus(E);
  const chk = (ok, txt) => h('div', { class: 'stamp' }, h('span', { class: 'ok' + (ok ? ' y' : '') }, ok ? '✓' : '…'), txt);
  body.append(h('div', { class: 'sect' }, 'Opening the Veil'),
    chk(v.shardsOk, `Gate Shards ${v.shards}/3 – Gate Shrines and the Veil Cartography contract`),
    chk(v.throughputOk, `Supplied throughput ${v.throughput}/8 in one jump – see the Network tab`),
    chk(v.cyOk, `${v.cy}/3 CY for the final jump`),
    h('p', { class: 'faint', style: { fontSize: '12px' } }, `The Mythic Crown lies beyond the last layer. Missing shards or throughput raise the finale's checkpoints rather than locking it. Your network currently earns ${v.tokens} Supply Token(s).`));

  body.append(h('div', { class: 'sect' }, 'Sector contract'));
  const st = X.contractStatus(E);
  if (st) {
    body.append(h('div', { class: 'item' }, h('div', { class: 'row' }, h('h4', { class: 'grow' }, st.n), h('b', null, `${st.have}/${st.need}`)), h('div', { class: 'dim', style: { fontSize: '12px' } }, st.d), h('div', { class: 'good', style: { fontSize: '12px' } }, 'Reward: ' + st.reward),
      h('button', { class: 'btn small danger', style: { marginTop: '6px' }, onclick: () => { X.abandonContract(E); hooks.refresh(); } }, 'Abandon')));
  } else if (E.contractOffers.length) {
    body.append(h('p', { class: 'dim', style: { marginTop: 0 } }, 'Carry one contract at a time. New offers arrive in each sector.'));
    for (const id of E.contractOffers) {
      const c = X.CONTRACTS[id];
      body.append(h('div', { class: 'item' }, h('div', { class: 'row' }, h('h4', { class: 'grow' }, c.n), h('button', { class: 'btn small primary', onclick: () => { X.acceptContract(E, id); hooks.refresh(); } }, 'Accept')), h('div', { class: 'dim', style: { fontSize: '12px' } }, c.d), h('div', { class: 'good', style: { fontSize: '12px' } }, 'Reward: ' + c.reward)));
    }
  } else body.append(h('p', { class: 'dim' }, 'No contract. New offers arrive when you enter the next sector.'));
  if (E.contractsDone.length) body.append(h('p', { class: 'faint', style: { fontSize: '12px' } }, 'Completed: ' + E.contractsDone.map((c) => X.CONTRACTS[c].n).join(', ')));

  const bands = [[0, 'Survey Window – calm lanes'], [4, 'Trade Friction – route crises begin'], [Math.round(E.maxPressure * 0.6), 'Frontier Weather – crises grow common'], [E.maxPressure - 2, 'Closing Window'], [E.maxPressure, 'Expedition ends (unless at the Crown)']];
  body.append(h('div', { class: 'sect' }, 'Frontier Pressure'), ...bands.map(([p, t]) => h('div', { class: E.pressure >= p ? 'warn' : 'dim', style: { fontSize: '12px' } }, `${p}+ · ${t}`)));
  body.append(h('div', { class: 'sect' }, 'Log'), h('div', { class: 'list' }, E.log.slice().reverse().map((l) => h('div', { class: 'logline' }, h('span', { class: 'faint' }, `J${l.t}`), l.m))));
}

// ---------------------------------------------------------------- mission end
export function missionEndScreen(root, E, hooks) {
  const S = E.colony;
  const n = X.node(E, E.mission.node);
  const won = S.status === 'won';
  const guest = E.mission.guest;
  root.innerHTML = '';
  const page = h('div', { class: 'page' });
  root.append(page);
  page.append(h('div', { class: 'big-result' }, h('div', { class: 'em' }, won ? '🏴' : '💥'), h('h2', null, won ? `${n.name} secured` : `${n.name} lost`), h('p', { class: 'dim' }, S.result.reason), h('h1', null, `${S.influence} Influence`)));
  const megas = Object.keys(S.mega || {});
  if (megas.length || (S.techs || []).length) page.append(h('p', { class: 'dim', style: { textAlign: 'center' } }, megas.length ? `Mega-projects: ${megas.length}` : '', megas.length && S.techs.length ? ' · ' : '', S.techs.length ? `Local technologies: ${S.techs.length}` : ''));
  if (n.type === 'boss') {
    page.append(h('button', { class: 'btn block primary', onclick: () => { X.resolveMission(E); hooks.done(); } }, 'Continue'));
    return;
  }
  if (!won) {
    page.append(h('p', null, S.shuttle ? 'Your Emergency Shuttle evacuates the crew: +3 CR and no Pressure penalty.' : 'The site becomes a Stranded Site (rescue it later from the Network tab). You salvage 1 CR, and Frontier Pressure rises by 1.'));
    if (guest && !E.licensed.includes(guest)) page.append(h('p', { class: 'dim' }, `You still made contact with ${CLANS[guest].n}: complete their license at a Freeport.`));
    page.append(h('button', { class: 'btn block primary', onclick: () => { X.resolveMission(E); hooks.done(); } }, 'Return to the star chart'));
    return;
  }
  const opts = X.charterOptions(E);
  let pickF = opts.slice().sort((a, b) => b.claim - a.claim)[0].fam;
  page.append(h('div', { class: 'sect' }, 'Choose a colony charter'));
  const box = h('div', { class: 'list' });
  const draw = () => {
    box.innerHTML = '';
    for (const o of opts) {
      box.append(h('button', { class: 'charter' + (o.fam === pickF ? ' on' : ''), onclick: () => { pickF = o.fam; draw(); } },
        h('div', { class: 'row' }, h('h3', { class: 'grow' }, o.n), h('b', null, `+${o.claim} ${o.pri}`), h('span', { class: 'dim' }, ` +${o.secN} ${o.sec}`)),
        h('div', { class: 'stamp' }, h('span', { class: 'ok y' }, '✓'), 'Establish'),
        h('div', { class: 'stamp' }, h('span', { class: 'ok' + (o.spec ? ' y' : '') }, o.spec ? '✓' : '✗'), `Specialize: ${o.specText}`),
        h('div', { class: 'stamp' }, h('span', { class: 'ok' + (o.integ ? ' y' : '') }, o.integ ? '✓' : '✗'), 'Integrate: every active clan connected to the Beacon'),
        h('div', { class: 'dim', style: { fontSize: '12px' } }, `Route yield ${o.yieldN} ${o.pri}/jump × ${o.charges} charges once supplied${o.mw ? ' (Masterwork +1 charge)' : ''}.`)));
    }
  };
  draw();
  page.append(box);
  if (n.type === 'shrine') page.append(h('p', { class: 'good' }, '🔺 This Gate Shrine also grants a Gate Shard.'));
  if (guest) {
    const joins = !E.clans.includes(guest) && E.clans.length < X.maxClans(E);
    page.append(h('p', { class: 'good' }, joins ? `${CLANS[guest].ic} ${CLANS[guest].n} joins your treaty (${E.clans.length + 1}/${X.maxClans(E)} active clans).` : `${CLANS[guest].ic} ${CLANS[guest].n} will be licensed for future treaty swaps.`));
  }
  page.append(h('div', { class: 'bottombar' }, h('button', { class: 'btn block primary', onclick: () => {
    X.resolveMission(E, pickF);
    hooks.done();
    const opts2 = X.laneOptions(E, n.id).filter((o) => X.node(E, o.to).connected).slice(0, 3);
    if (!n.connected && opts2.length) {
      sheet({
        title: 'Connect the colony?',
        body: h('div', null, h('p', null, `${n.name} ships ${n.yieldN} ${n.yieldRes} per jump for ${n.charges} jumps once a lane links it to your supplied network.`)),
        actions: [{ label: 'Later' }].concat(opts2.map((o) => ({ label: `${X.LANE_CLASS[o.cls].n} → ${X.node(E, o.to).name} (${X.costText(o.cost)})`, cls: 'primary', disabled: !X.canAfford(E, o.cost), on: () => { X.buildLane(E, n.id, o.to); hooks.refresh(); } }))),
      });
    }
  } }, 'Claim charter')));
}
