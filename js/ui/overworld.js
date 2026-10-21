// Star chart and between-colony screens.
import { h, s, sheet, toast, confirmSheet, closeSheets } from './dom.js';
import { cardEl, clanColor, trigLabel } from './cardview.js';
import { CARDS, CLANS, RARITY, TIER, clanCards } from '../engine/cards.js';
import { WORLD, FAMILIES, FAMILY_INFO } from '../engine/resources.js';
import { rubric } from '../engine/rubric.js';
import { STARTERS } from '../engine/mapgen.js';
import * as X from '../engine/expedition.js';

const RES_ORDER = ['CR', 'AL', 'CY', 'GE', 'DA', 'GS'];

export function resBar(E) {
  return h('div', { class: 'res' }, RES_ORDER.map((r) => h('span', { class: 'chip', title: WORLD[r].n }, WORLD[r].ic, ' ', E.res[r], ' ', h('span', { class: 'faint' }, r))));
}
function pips(n) {
  return h('span', { class: 'pips' }, [0, 1, 2, 3, 4].map((i) => h('i', { class: i < n ? 'on' : '' })));
}
export function profileEl(p) {
  return h('div', { class: 'prof' }, FAMILIES.map((f) => [h('span', null, FAMILY_INFO[f].ic, ' ', FAMILY_INFO[f].n), pips(p[f])]));
}

export function overworldScreen(root, E, hooks, tab = 'chart') {
  root.innerHTML = '';
  const press = E.pressure / E.maxPressure;
  const top = h('div', { class: 'topbar' },
    h('div', { class: 'row', style: { marginBottom: '6px' } },
      h('h2', { class: 'grow' }, X.SECTORS[X.sectorOf(X.node(E, E.at).layer)].n),
      h('span', { class: 'chip' }, '🏴 ', E.claimed, ' claimed'),
      h('button', { class: 'chip', onclick: () => hooks.menu() }, '☰')),
    resBar(E),
    h('div', { class: 'row', style: { marginTop: '6px', fontSize: '12px' } },
      h('span', { class: 'dim' }, 'Frontier Pressure'),
      h('div', { class: 'meter grow' + (press > 0.7 ? ' danger' : '') }, h('i', { style: { width: Math.min(100, press * 100) + '%' } })),
      h('b', null, `${E.pressure}/${E.maxPressure}`)));
  const body = h('div', { class: tab === 'chart' ? 'chartwrap' : 'page' });
  const tabs = h('div', { class: 'tabs' }, [['chart', '🗺️', 'Chart'], ['dir', '🏛️', 'Directorate'], ['fleet', '🚀', 'Fleet'], ['log', '📜', 'Log']].map(([id, ic, n]) =>
    h('button', { class: tab === id ? 'on' : '', onclick: () => hooks.tab(id) }, h('span', null, ic), n)));
  root.append(top, body, tabs);
  if (tab === 'chart') chart(body, E, hooks);
  if (tab === 'dir') directorate(body, E, hooks);
  if (tab === 'fleet') fleet(body, E, hooks);
  if (tab === 'log') body.append(h('div', { class: 'list' }, E.log.slice().reverse().map((l) => h('div', { class: 'logline' }, h('span', { class: 'faint' }, `J${l.t}`), l.m))));
}

// ---------------------------------------------------------------- chart
function chart(body, E, hooks) {
  const W = 360, LH = 92, PAD = 46;
  const nodes = E.chart.nodes;
  const Hgt = PAD * 2 + 9 * LH;
  const pos = (n) => [24 + n.x * (W - 48), PAD + n.layer * LH];
  const reach = new Map(X.reachable(E).map((e) => [e.to, e]));
  const svg = s('svg', { viewBox: `0 0 ${W} ${Hgt}` });
  // Sector bands
  for (let sct = 1; sct <= 5; sct++) {
    const y0 = sct === 5 ? PAD + 8.5 * LH : PAD + (sct * 2 - 1.5) * LH;
    const y1 = sct === 5 ? Hgt : y0 + 2 * LH;
    svg.append(s('rect', { x: 0, y: y0, width: W, height: y1 - y0, fill: sct % 2 ? '#ffffff05' : 'transparent' }));
    svg.append(s('text', { x: 6, y: y0 + 13, class: 'sector-label' }, X.SECTORS[sct].n));
  }
  for (const e of E.chart.edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const [x1, y1] = pos(a), [x2, y2] = pos(b);
    const built = (b.connected && b.parent === a.id && b.type !== 'freeport') || (a.connected && a.parent === b.id && a.type !== 'freeport');
    const trail = (b.parent === a.id && b.state !== 'unvisited') || (a.parent === b.id && a.state !== 'unvisited');
    const isReach = (e.a === E.at && reach.has(e.b)) || (e.b === E.at && reach.has(e.a));
    let d = `M${x1},${y1} L${x2},${y2}`;
    if (e.lateral) d = `M${x1},${y1} Q${(x1 + x2) / 2},${y1 - 26} ${x2},${y2}`;
    svg.append(s('path', { d, fill: 'none', class: 'lane' + (e.lateral ? ' lat' : '') + (trail ? ' trail' : '') + (built ? ' built' : '') + (isReach ? ' reach' : '') }));
  }
  for (const n of nodes) {
    const [x, y] = pos(n);
    const t = X.NODE_TYPES[n.type];
    const cls = 'node-ring' + (reach.has(n.id) ? ' reach' : '') + (n.state === 'claimed' ? ' claimed' : '') + (n.state === 'stranded' ? ' stranded' : '') + (n.id === E.at ? ' here' : '');
    const g = s('g', { class: 'node-c', onclick: () => nodeSheet(E, n, reach.get(n.id), hooks) },
      s('circle', { cx: x, cy: y, r: n.type === 'boss' ? 21 : 17, class: cls }),
      s('text', { x, y: y + 6, 'text-anchor': 'middle', 'font-size': n.type === 'boss' ? 19 : 16 }, n.type === 'enclave' ? CLANS[n.clan].ic : t.ic),
      s('text', { x, y: y + 31, 'text-anchor': 'middle', class: 'node-name' }, n.name.length > 12 ? n.name.slice(0, 11) + '…' : n.name));
    if (n.connected && n.type !== 'ark') g.append(s('circle', { cx: x + 13, cy: y - 13, r: 4.5, fill: '#49d17d' }));
    if (n.state === 'claimed' && n.charges) g.append(s('text', { x: x + 20, y: y + 4, 'font-size': 9, 'font-weight': 700, fill: '#49d17d' }, `×${n.charges}`));
    svg.append(g);
  }
  body.append(svg);
  // Scroll the current node into view.
  requestAnimationFrame(() => {
    const [, y] = pos(X.node(E, E.at));
    body.scrollTop = (y / Hgt) * body.scrollHeight - body.clientHeight / 3;
  });
  const here = X.node(E, E.at);
  if (here.type === 'freeport' || here.type === 'ark') {
    body.append(h('div', { style: { position: 'sticky', bottom: '8px', padding: '0 12px' } }, h('button', { class: 'btn block primary', onclick: () => freeportSheet(E, hooks) }, here.type === 'ark' ? '🚀 Arkship services: exchange & treaty' : '⚓ Freeport services: exchange & treaty')));
  }
  if (!reach.size && E.status === 'active' && !E.colony) {
    body.append(h('p', { class: 'warn', style: { padding: '0 12px' } }, 'No onward lanes from here. Use the menu to end the expedition.'));
  }
}

function nodeSheet(E, n, edge, hooks) {
  const t = X.NODE_TYPES[n.type];
  const b = h('div', null);
  b.append(h('p', { class: 'dim', style: { marginTop: 0 } }, t.d));
  if (n.type === 'enclave') b.append(h('p', null, 'Resident clan: ', h('b', { style: { color: CLANS[n.clan].col } }, `${CLANS[n.clan].ic} ${CLANS[n.clan].n}`), ` – ${CLANS[n.clan].d}`));
  if (n.type === 'boss') {
    const B = X.BOSSES[n.boss];
    b.append(h('h4', null, B.s), h('p', null, B.d), h('p', { class: 'dim' }, `25 turns, a large map, and a required stabilization objective. You hold ${E.res.GS}/3 Gate Shards${E.res.GS < 3 ? ` – each missing shard raises every checkpoint by 20%` : ''}.`));
  }
  if (n.profile) b.append(h('div', { class: 'sect' }, 'Resource profile'), profileEl(n.profile));
  if (n.state !== 'unvisited') {
    b.append(h('div', { class: 'sect' }, 'Status'), h('p', null, n.state === 'claimed' ? `Claimed – ${n.charter || 'colony'}` : n.state === 'stranded' ? 'Stranded site' : 'Visited'));
    if (n.state === 'claimed' && n.type !== 'boss') {
      b.append(h('p', { class: 'dim' }, `Route yield: ${n.yieldN} ${n.yieldRes} per jump · ${n.charges} charges left · ${n.connected ? 'connected ✅' : 'not connected'}`));
    }
  }
  const actions = [];
  if (edge) {
    const c = X.travelCost(E, edge);
    const pv = X.missionPreview(E, n);
    if (n.type !== 'freeport') b.append(h('div', { class: 'sect' }, 'Mission'), h('p', { class: 'dim' }, `${pv.turns} turns · map radius ${pv.R} · checkpoint difficulty ×${pv.diff.toFixed(2)}${E.preps.length ? ` · preparations: ${E.preps.map((p) => X.PREPS[p].n).join(', ')}` : ''}`));
    b.append(h('div', { class: 'sect' }, 'Jump'), h('p', null, c.tow ? h('span', { class: 'warn' }, `Not enough CY (${c.CY} needed): emergency tow costs +2 extra Pressure.`) : `Costs ${c.CY} CY`, ` · +${c.pressure} Frontier Pressure${edge.lateral ? ' (lateral detour)' : ''}`));
    actions.push({
      label: n.type === 'freeport' ? 'Jump & dock' : 'Jump & land', cls: 'primary', on: () => {
        if (n.type === 'enclave' && !E.clans.includes(n.clan)) benchSheet(E, n, hooks);
        else hooks.travel(n.id);
      },
    });
  }
  if (X.canConnect(E, n)) {
    const cost = X.laneCost(E, n);
    actions.push({ label: `Build lane (${X.costText(cost)})`, disabled: !X.canAfford(E, cost), on: () => { X.connect(E, n.id); hooks.refresh(); } });
  }
  sheet({ title: `${n.type === 'enclave' ? CLANS[n.clan].ic : t.ic} ${n.name}`, body: b, actions });
}

function benchSheet(E, n, hooks) {
  const guest = n.clan;
  sheet({
    title: 'Guest Treaty',
    body: h('div', null,
      h('p', null, `${CLANS[guest].n} will join you for this colony. Choose one active clan to bench – it returns after the map. Securing the colony licenses ${CLANS[guest].n} for future swaps.`),
      h('div', { class: 'list' }, E.clans.map((c) => h('button', { class: 'btn block', style: { borderColor: CLANS[c].col }, onclick: () => { closeSheets(); hooks.travel(n.id, c); } }, `Bench ${CLANS[c].ic} ${CLANS[c].n}`)))),
  });
}

function freeportSheet(E, hooks) {
  const b = h('div', null);
  b.append(h('div', { class: 'sect' }, 'Exchange'));
  b.append(h('div', { class: 'list' }, X.EXCHANGE.map((x) => h('button', { class: 'btn block', disabled: !X.canAfford(E, x.give), onclick: () => { X.exchange(E, x.id); closeSheets(); hooks.refresh(); freeportSheet(E, hooks); } }, x.d))));
  b.append(h('div', { class: 'sect' }, `Treaty amendment (${X.costText(X.DIR_COST.swap)})`));
  const bench = E.licensed.filter((c) => !E.clans.includes(c));
  if (!bench.length) b.append(h('p', { class: 'dim' }, 'No licensed clans on the bench. Secure a Clan Enclave to license one.'));
  for (const inn of bench) {
    b.append(h('div', { class: 'item' }, h('h4', { style: { color: CLANS[inn].col } }, `${CLANS[inn].ic} Bring in ${CLANS[inn].n}`),
      h('div', { class: 'row wrap' }, E.clans.map((out) => h('button', { class: 'btn small', disabled: !X.canAfford(E, X.DIR_COST.swap), onclick: () => { X.swapClan(E, out, inn); closeSheets(); hooks.refresh(); } }, `replace ${CLANS[out].ic}`)))));
  }
  sheet({ title: 'Services', body: b });
}

// ---------------------------------------------------------------- directorate
function directorate(body, E, hooks) {
  const act = (fn) => () => { if (fn()) hooks.refresh(); else toast('Cannot afford that'); };
  body.append(h('p', { class: 'dim', style: { marginTop: 0 } }, 'Spend world resources to shape future card draws. Each draw picks a clan by Presence weight, then a card by rarity × Favor weight (Common 1, Uncommon 0.6, Rare 0.3).'));
  const lv = E.dir.research || 0;
  body.append(h('div', { class: 'item' }, h('h4', null, `🔬 Research tiers (level ${lv}/2)`),
    h('div', { class: 'dim' }, `Mid buildings from turn ${6 - 2 * lv}, Advanced from turn ${11 - 2 * lv}.`),
    lv < 2 ? h('button', { class: 'btn small', style: { marginTop: '6px' }, disabled: !X.canAfford(E, X.DIR_COST.research[lv]), onclick: act(() => X.research(E)) }, `Research (${X.costText(X.DIR_COST.research[lv])})`) : null));
  for (const cl of E.licensed) {
    const active = E.clans.includes(cl);
    const pres = E.dir.presence[cl] || 1;
    const cards = clanCards(cl);
    const totW = cards.reduce((sum, c) => sum + (E.dir.ban.includes(c.id) ? 0 : RARITY[c.r].w * (E.dir.fav[c.id] || 1)), 0);
    const details = h('details', null, h('summary', { class: 'dim', style: { cursor: 'pointer', margin: '6px 0' } }, 'Card pool & favors'),
      h('div', { class: 'list' }, cards.map((c) => {
        const banned = E.dir.ban.includes(c.id);
        const fv = E.dir.fav[c.id] || 1;
        const w = banned ? 0 : RARITY[c.r].w * fv;
        return h('div', { class: 'item codex-card' },
          h('div', null, h('b', null, c.n), ' ', h('span', { class: 'pill-' + c.r }, RARITY[c.r].n), h('div', { class: 'faint', style: { fontSize: '11px' } }, `${TIER[c.t]} · ${trigLabel(c)} · ${((w / totW) * 100).toFixed(0)}% of ${CLANS[cl].n.split(' ')[0]} draws`), h('div', { class: 'dim', style: { fontSize: '12px' } }, c.text)),
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
      details));
  }
  body.append(h('p', { class: 'faint' }, `Bans: ${E.dir.ban.length}/4 (max 2 per clan, starters cannot be banned). Favor costs ${X.costText(X.DIR_COST.fav[0])}, then ${X.costText(X.DIR_COST.fav[1])}.`));
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
  body.append(h('div', { class: 'sect' }, 'Trade network'));
  const claimed = E.chart.nodes.filter((n) => n.state === 'claimed' && n.type !== 'boss');
  if (!claimed.length) body.append(h('p', { class: 'dim' }, 'Claim colonies, then build lanes back toward the Arkship or a Freeport. Connected colonies deliver their route yield every jump until their charges run out.'));
  for (const n of claimed) {
    const cost = X.laneCost(E, n);
    body.append(h('div', { class: 'item' }, h('div', { class: 'row' }, h('h4', { class: 'grow' }, n.name), n.connected ? h('span', { class: 'chip good' }, 'Connected') : null),
      h('div', { class: 'dim', style: { fontSize: '12px' } }, `${n.charter}: ${n.yieldN} ${n.yieldRes}/jump, ${n.charges} charges left`),
      !n.connected ? (X.canConnect(E, n)
        ? h('button', { class: 'btn small', style: { marginTop: '6px' }, disabled: !X.canAfford(E, cost), onclick: () => { X.connect(E, n.id); hooks.refresh(); } }, `Build lane (${X.costText(cost)})`)
        : h('div', { class: 'faint', style: { fontSize: '12px' } }, `Connect ${X.node(E, n.parent).name} first.`)) : null));
  }
  body.append(h('div', { class: 'sect' }, 'Gate'), h('p', { class: 'dim' }, `Gate Shards ${E.res.GS}/3. The Mythic Crown lies beyond layer 8; the final jump costs 3 CY. Missing shards make the finale harder rather than locking it.`));
}

// ---------------------------------------------------------------- mission end
export function missionEndScreen(root, E, hooks) {
  const S = E.colony;
  const n = X.node(E, E.mission.node);
  const won = S.status === 'won';
  root.innerHTML = '';
  const page = h('div', { class: 'page' });
  root.append(page);
  page.append(h('div', { class: 'big-result' }, h('div', { class: 'em' }, won ? '🏴' : '💥'), h('h2', null, won ? `${n.name} secured` : `${n.name} lost`), h('p', { class: 'dim' }, S.result.reason), h('h1', null, `${S.influence} Influence`)));
  if (n.type === 'boss') {
    page.append(h('button', { class: 'btn block primary', onclick: () => { X.resolveMission(E); hooks.done(); } }, 'Continue'));
    return;
  }
  if (!won) {
    page.append(h('p', null, 'The site becomes a Stranded Site. You salvage 1 CR, and Frontier Pressure rises by 1.'));
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
        h('div', { class: 'stamp' }, h('span', { class: 'ok' + (o.integ ? ' y' : '') }, o.integ ? '✓' : '✗'), 'Integrate: all three clans connected to the Beacon'),
        h('div', { class: 'dim', style: { fontSize: '12px' } }, `Route yield ${o.yieldN} ${o.pri}/jump × ${o.charges} charges once connected${o.mw ? ' (Masterwork +1 charge)' : ''}.`)));
    }
  };
  draw();
  page.append(box);
  if (n.type === 'shrine') page.append(h('p', { class: 'good' }, '🔺 This Gate Shrine also grants a Gate Shard.'));
  if (E.mission.guest) page.append(h('p', { class: 'good' }, `${CLANS[E.mission.guest].ic} ${CLANS[E.mission.guest].n} will be licensed for future treaty swaps.`));
  page.append(h('div', { class: 'bottombar' }, h('button', { class: 'btn block primary', onclick: () => {
    const out = X.resolveMission(E, pickF);
    hooks.done();
    if (X.canConnect(E, n)) {
      const cost = X.laneCost(E, n);
      sheet({
        title: 'Connect the colony?',
        body: h('p', null, `Build a lane from ${X.node(E, n.parent).name} to ${n.name} for ${X.costText(cost)}. Its route yield (${n.yieldN} ${n.yieldRes}) then arrives on every jump for ${n.charges} jumps.`),
        actions: [{ label: 'Later' }, { label: 'Build lane', cls: 'primary', disabled: !X.canAfford(E, cost), on: () => { X.connect(E, n.id); hooks.refresh(); } }],
      });
    }
  } }, 'Claim charter')));
}
