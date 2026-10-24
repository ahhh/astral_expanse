// Colony map screen: HUD, SVG hex map, hand tray and info sheets.
import { h, s, sheet, toast, confirmSheet, closeSheets, withTip } from './dom.js';
import { cardEl, cardText, clanColor, abbr, trigLabel } from './cardview.js';
import { CARDS, CLANS, RARITY, TIER } from '../engine/cards.js';
import { RES, STATUS, FAMILIES, FAMILY_INFO } from '../engine/resources.js';
import * as HX from '../engine/hex.js';
import {
  isLit, legalHexes, forecast, playCard, passTurn, digTurn, demolishTurn, digHexes, scrapCard, bldAt, bldList, network, links, beaconLinked, BEACON_BONUS,
  abilityState, abilityTargets, useAbility, EVENT_INFO, bossObjective, BOSS_INFO, integrateDone,
  SPECIALIZE, specializeDone, tierOpen, CAP, TECHS, chooseTech, MEGA, megaProgress, clone, cpGain, masterworkNeed,
  hintsLeft, useHint, buyHints, HINT_PACK,
} from '../engine/colony.js';
import { bestMove } from '../engine/ai.js';
import { buildingTile, resourceTile, mapBackdrop, MAP_FALLBACK, isMissing, markMissing } from './art.js';

const SZ = 10;
const PHASES = [['🌅', 'Dawn'], ['☀️', 'High Sun'], ['🌇', 'Dusk'], ['🌑', 'Deep Night']];
const KIND = { surface: 'Surface', cavern: 'Cavern', rock: 'Solid rock', orbit: 'Orbital slot' };
const KIND_FILL = { surface: '#2b3652', cavern: '#3a2519', rock: '#121722', orbit: '#151f38' };
const NET_KEY = 'astral-expanse.showNet';

export function colonyScreen(root, S, hooks) {
  let sel = null;
  let fc = null;
  let abil = null;
  // Undo: a snapshot from before the last placement or pass. `hooks.undo` is
  // the per-turn allowance set by the expedition's difficulty.
  let snap = null;
  const undoUsed = {};
  const undoLeft = () => (snap ? (hooks.undo ?? 1) - (undoUsed[snap.turn] || 0) : 0);

  let showNet = true;
  try { showNet = localStorage.getItem(NET_KEY) !== '0'; } catch (e) { /* storage blocked */ }

  root.innerHTML = '';
  const hud = h('div', { class: 'hud' });
  const svgEl = s('svg', { role: 'img', 'aria-label': 'Colony map' });
  // Optional planet art for this planet type (art/maps/<type>.webp), drawn as a globe under the land hexes.
  const backdropSrc = mapBackdrop(S.boss ? S.boss.type : S.type);
  const mapwrap = h('div', { class: 'mapwrap' }, svgEl);
  const handEl = h('div', { class: 'hand', 'data-tut': 'hand' });
  const actEl = h('div', { class: 'actions' });
  const tray = h('div', { class: 'tray' }, handEl, actEl);
  const sumEl = h('div', { class: 'turnsum', hidden: true, onclick: () => closeSummary() });
  mapwrap.append(sumEl);
  let sumTimer = null;
  root.append(hud, mapwrap, tray);

  const keys = HX.shape(S.R).all;
  const pts = keys.map((k) => HX.pixel(k, SZ));
  const minX = Math.min(...pts.map((p) => p[0])) - SZ * 1.4, maxX = Math.max(...pts.map((p) => p[0])) + SZ * 1.4;
  const minY = Math.min(...pts.map((p) => p[1])) - SZ * 1.6, maxY = Math.max(...pts.map((p) => p[1])) + SZ * 1.6;
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Pan & zoom: drag to pan when zoomed, pinch or wheel to zoom, buttons for both.
  // A drag swallows the click that ends it, so panning never opens a hex.
  const base = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  const view = { z: 1, x: base.x + base.w / 2, y: base.y + base.h / 2 };
  const ZMAX = 3.5;
  function applyView() {
    view.z = Math.max(1, Math.min(ZMAX, view.z));
    const w = base.w / view.z, hh = base.h / view.z;
    view.x = Math.max(base.x + w / 2, Math.min(base.x + base.w - w / 2, view.x));
    view.y = Math.max(base.y + hh / 2, Math.min(base.y + base.h - hh / 2, view.y));
    svgEl.setAttribute('viewBox', `${view.x - w / 2} ${view.y - hh / 2} ${w} ${hh}`);
    zoomBtn.hidden = view.z <= 1.01;
  }
  const unitsPerPx = () => {
    const r = svgEl.getBoundingClientRect();
    return 1 / Math.min(r.width / (base.w / view.z), r.height / (base.h / view.z));
  };
  const ptrs = new Map();
  let drag = null, pinch = null, dragged = false;
  const spread = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  svgEl.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; dragged = false; }
    if (ptrs.size === 2) { pinch = { d: spread(), z: view.z }; dragged = true; }
  });
  svgEl.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { view.z = pinch.z * spread() / pinch.d; applyView(); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragged && Math.hypot(dx, dy) > 8 && view.z > 1.01) dragged = true;
    if (dragged) { const u = unitsPerPx(); view.x = drag.vx - dx * u; view.y = drag.vy - dy * u; applyView(); }
  });
  const ptrEnd = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) drag = null;
  };
  svgEl.addEventListener('pointerup', ptrEnd);
  svgEl.addEventListener('pointercancel', ptrEnd);
  svgEl.addEventListener('click', (e) => { if (dragged) { e.stopPropagation(); dragged = false; } }, true);
  svgEl.addEventListener('wheel', (e) => { e.preventDefault(); view.z *= e.deltaY < 0 ? 1.15 : 1 / 1.15; applyView(); }, { passive: false });
  const zoomBy = (f) => { view.z *= f; applyView(); };
  const zoomBtn = h('button', { class: 'mapbtn', title: 'Reset zoom', 'aria-label': 'Reset zoom', onclick: () => { view.z = 1; applyView(); } }, '⤢');
  const netBtn = h('button', { class: 'mapbtn' + (showNet ? ' on' : ''), title: 'Show networks', 'aria-label': 'Toggle network overlay', onclick: () => {
    showNet = !showNet;
    try { localStorage.setItem(NET_KEY, showNet ? '1' : '0'); } catch (e) { /* storage blocked */ }
    netBtn.classList.toggle('on', showNet);
    drawMap();
  } }, '🔗');
  mapwrap.append(h('div', { class: 'mapctl' },
    h('button', { class: 'mapbtn', title: 'Zoom in', 'aria-label': 'Zoom in', onclick: () => zoomBy(1.4) }, '+'),
    h('button', { class: 'mapbtn', title: 'Zoom out', 'aria-label': 'Zoom out', onclick: () => zoomBy(1 / 1.4) }, '−'),
    zoomBtn, netBtn,
    h('button', { class: 'mapbtn', title: 'Map key', 'aria-label': 'Map key', onclick: () => mapKey() }, '?')));
  applyView();

  const poly = (cx, cy, sz) => HX.corners(cx, cy, sz).map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ');
  const forecastCount = () => (S.fullForecast ? 99 : bldList(S).some((b) => CARDS[b.c].radar) ? 3 : 1);
  const upcoming = () => S.events.filter((e) => !e.done && e.turn >= S.turn).slice(0, forecastCount());

  function drawHUD() {
    const cp = S.checkpoints.find((c) => c.met == null) || S.checkpoints[S.checkpoints.length - 1];
    const got = cp.at ?? cpGain(S);
    const done = cp.met ?? got >= cp.need;
    const pct = Math.max(0, Math.min(100, (got / Math.max(1, cp.need)) * 100));
    const ev = upcoming()[0];
    const [pic, pname] = PHASES[S.phase];
    hud.innerHTML = '';
    hud.append(
      h('div', { class: 'l1' },
        h('div', { class: 'name' }, S.name),
        h('span', { class: 'chip', title: pname, 'data-tut': 'phase' }, pic, ' ', pname),
        h('span', { class: 'chip', 'data-tut': 'turns' }, `T${S.turn}/${S.turns}`)),
      h('div', { class: 'l1' },
        h('span', { class: 'inf', title: 'Total Influence', 'data-tut': 'influence' }, S.influence),
        h('div', { class: 'grow', 'data-tut': 'checkpoint' },
          h('div', { class: 'cp' }, `Checkpoint ${got}/${cp.need} by turn ${cp.turn}`, done ? ' ✅' : ''),
          h('div', { class: 'meter' + (S.turn >= cp.turn - 1 && !done ? ' danger' : '') }, h('i', { style: { width: pct + '%' } }))),
        h('span', { class: 'chip', title: 'Asteroid Integrity', 'data-tut': 'integrity' }, '❤️ ', S.integrity),
        ev ? h('button', { class: 'chip', onclick: goals }, EVENT_INFO[ev.type].ic, ` T${ev.turn}`) : null),
      h('div', { class: 'l1', style: { fontSize: '11px' }, 'data-tut': 'clans' },
        S.clans.map((c) => h('span', { class: 'chip', style: { borderColor: CLANS[c].col, color: CLANS[c].col } }, CLANS[c].ic, ' ', CLANS[c].n.split(' ')[0])),
        (S.techs || []).map((t) => h('span', { class: 'chip', title: TECHS[t].n }, TECHS[t].ic)),
        Object.keys(S.mega || {}).map((m) => h('span', { class: 'chip good', title: MEGA[m].n }, MEGA[m].ic)),
        S.techOffer && S.status === 'play' ? h('button', { class: 'chip warn', onclick: techSheet }, '🔬 Choose tech') : null,
        S.boss ? h('span', { class: 'chip warn' }, `${BOSS_INFO[S.boss.type].meterName} ${S.boss.type === 'viridion' ? S.boss.clock + '/3' : S.boss.meter + '/' + BOSS_INFO[S.boss.type].max}`) : null));
  }

  // Long-range link styles: [stroke (null = network colour), dash].
  const LINK_STYLE = { link: [null, '2.2 1.4'], gate: ['#d36bd6', '0.6 1.4'], ice: ['#79d0f2', '0.4 0.9'], tunnel: ['#d98b45', '3 1'] };
  // Network colours: the Beacon's network is white (the Integrate stamp), the
  // rest cycle through hues that read against every clan colour.
  const NET_COLS = ['#6ee7ff', '#ffd166', '#ff7ab6', '#7dffb0', '#c9a2ff', '#ff9f43', '#b8f35a', '#ff6b6b'];
  const ORBIT_R = (S.R + 1) * Math.sqrt(3) * SZ;

  // A square tile image clipped to a pointy-topped hex of radius r. When the image
  // is missing, `extra` (e.g. the initials badge) is dropped and `fallback()` drawn.
  function tileImg(g, src, cx, cy, r, fallback, extra = []) {
    if (isMissing(src)) { g.append(...fallback()); return; }
    const w = Math.sqrt(3) * r;
    const im = s('image', { href: src, x: cx - w / 2, y: cy - r, width: w, height: 2 * r, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#hexclip)', 'pointer-events': 'none' });
    im.addEventListener('error', () => { markMissing(src); im.remove(); extra.forEach((e) => e.remove()); g.append(...fallback()); });
    g.append(im, ...extra);
  }
  // Cave-mouth arch: marks a Cavern hex whatever sits on it.
  const caveMark = (cx, cy, r) => s('path', { d: `M${cx - r},${cy + r * 0.45} A${r} ${r} 0 0 1 ${cx + r},${cy + r * 0.45} Z`, fill: '#05070c', stroke: '#d29a62', 'stroke-width': 0.5, 'pointer-events': 'none' });

  function drawMap() {
    svgEl.innerHTML = '';
    const legal = sel != null ? new Set(legalHexes(S, S.hand[sel])) : null;
    const abilT = abil ? new Set(abil.targets) : null;
    const top = fc ? Object.entries(fc).sort((a, b) => b[1] - a[1]).slice(0, 3).filter((e) => e[1] > 0).map((e) => e[0]) : [];
    const targets = new Map(upcoming().filter((e) => e.k).map((e) => [e.k, e]));
    const defs = s('defs', null,
      s('clipPath', { id: 'hexclip', clipPathUnits: 'objectBoundingBox' }, s('polygon', { points: '0.5,0 1,0.25 1,0.75 0.5,1 0,0.75 0,0.25' })),
      s('pattern', { id: 'rockpat', width: 2.6, height: 2.6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(40)' },
        s('rect', { width: 2.6, height: 2.6, fill: '#10141e' }), s('line', { x1: 0, y1: 0, x2: 0, y2: 2.6, stroke: '#262f42', 'stroke-width': 1 })));
    const gBase = s('g'), gNet = s('g', { 'pointer-events': 'none' }), gTop = s('g');
    // The planet globe: sized to the land hexes so the orbital ring sits just outside it.
    const PR = ORBIT_R - SZ * 0.95;
    defs.append(
      s('clipPath', { id: 'planetclip' }, s('circle', { cx: 0, cy: 0, r: PR })),
      s('radialGradient', { id: 'planetshade', cx: '38%', cy: '34%', r: '70%' },
        s('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': 0.06 }),
        s('stop', { offset: '65%', 'stop-color': '#000', 'stop-opacity': 0.15 }),
        s('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': 0.6 })));
    const bgSrc = [backdropSrc, MAP_FALLBACK].find((src) => !isMissing(src));
    if (bgSrc) {
      const im = s('image', { href: bgSrc, x: -PR, y: -PR, width: 2 * PR, height: 2 * PR, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#planetclip)', class: 'planet-bg', 'pointer-events': 'none' });
      im.addEventListener('error', () => {
        markMissing(im.getAttribute('href'));
        if (isMissing(MAP_FALLBACK)) im.remove(); else im.setAttribute('href', MAP_FALLBACK);
      });
      gBase.append(im);
    }
    gBase.append(s('circle', { cx: 0, cy: 0, r: PR, fill: 'url(#planetshade)', stroke: '#8fb4ff', 'stroke-width': 0.4, 'stroke-opacity': 0.35, 'pointer-events': 'none' }));
    // The orbital ring: every orbital slot shares one network.
    gBase.append(s('circle', { cx: 0, cy: 0, r: ORBIT_R, fill: 'none', stroke: '#4a6aa8', 'stroke-width': 0.5, 'stroke-dasharray': '1.5 2', opacity: 0.6, 'pointer-events': 'none' }));
    for (const k of keys) {
      const hx = S.hexes[k];
      const [cx, cy] = HX.pixel(k, SZ);
      const g = s('g', { 'data-k': k });
      const empty = !hx.b && !(hx.res && !hx.hid);
      g.append(s('polygon', { points: poly(cx, cy, SZ * 0.98), class: empty ? 'hex-base hex-empty' : 'hex-base', fill: hx.kind === 'rock' ? 'url(#rockpat)' : KIND_FILL[hx.kind], 'stroke-dasharray': hx.kind === 'orbit' ? '2 1.5' : null, stroke: hx.kind === 'orbit' ? '#4a6aa8' : null }));
      if (hx.kind !== 'rock') {
        const lit = isLit(S, k);
        g.append(s('polygon', { points: poly(cx, cy, SZ * 0.98), fill: lit ? '#ffd27a' : '#000', 'fill-opacity': lit ? 0.09 : 0.38, 'pointer-events': 'none' }));
      } else {
        g.append(s('polygon', { points: poly(cx, cy, SZ * 0.7), fill: 'none', stroke: '#2a3346', 'stroke-width': 0.6, 'pointer-events': 'none' }));
      }
      if (hx.st.Pressure) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.9), fill: '#49d17d', 'fill-opacity': 0.14, 'pointer-events': 'none' }));
      const b = hx.b ? S.blds[hx.b] : null;
      if (b) {
        const c = CARDS[b.c];
        const beacon = b.c === 'beacon';
        const col = beacon ? '#e7ecf6' : clanColor(c.cl);
        g.append(s('polygon', { points: poly(cx, cy, SZ * 0.88), fill: col, stroke: beacon ? '#6ee7ff' : RARITY[c.r].col, 'stroke-width': beacon ? 1 : c.r === 'C' ? 0.5 : 1.1, 'pointer-events': 'none' }));
        const lbl = beacon ? '★' : abbr(c);
        const bw = 2.4 + lbl.length * 2.5;
        const badge = [
          s('rect', { x: cx - bw / 2, y: cy + 3.3, width: bw, height: 4, rx: 1.6, fill: '#08101ce6', stroke: col, 'stroke-width': 0.35, 'pointer-events': 'none' }),
          s('text', { x: cx, y: cy + 6.3, 'text-anchor': 'middle', 'font-size': 3.2, 'font-weight': 800, fill: '#fff', 'font-family': 'Chakra Petch, sans-serif', 'pointer-events': 'none' }, lbl),
        ];
        tileImg(g, buildingTile(b.c), cx, cy, SZ * 0.79, () => [s('text', { x: cx, y: cy + (beacon ? 2.6 : 1.9), 'text-anchor': 'middle', 'font-size': beacon ? 8 : 5.4, 'font-weight': 800, fill: '#08101c', 'font-family': 'Chakra Petch, sans-serif', 'pointer-events': 'none' }, lbl)], badge);
        if (b.dis) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.88), fill: '#000', 'fill-opacity': 0.55, 'pointer-events': 'none' }));
        if (b.acts) g.append(s('circle', { cx: cx + 5.2, cy: cy - 4.6, r: 1.3, fill: '#fff', stroke: '#08101c', 'stroke-width': 0.4, 'pointer-events': 'none' }));
        if (c.ability) {
          const st = abilityState(S, b);
          if (st && st.ok) g.append(s('text', { x: cx - 5.4, y: cy - 3.4, 'font-size': 3.6, 'pointer-events': 'none' }, '⚡'));
        }
      } else if (hx.res && !hx.hid) {
        const dep = !!RES[hx.res].dep;
        // Deposits fill the hex; loose tokens sit smaller inside a pale outline.
        const r = dep ? SZ * 0.9 : SZ * 0.72;
        if (!dep) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.8), fill: 'none', stroke: '#e7ecf6', 'stroke-opacity': 0.55, 'stroke-width': 0.5, 'stroke-dasharray': '1.2 0.8', 'pointer-events': 'none' }));
        tileImg(g, resourceTile(hx.res), cx, cy, r, () => [s('text', { x: cx, y: cy + 2.8, 'text-anchor': 'middle', 'font-size': 8, 'pointer-events': 'none' }, RES[hx.res].ic)]);
        if (hx.amt > 1) g.append(s('text', { x: cx + 5.6, y: cy + 5.4, 'text-anchor': 'middle', 'font-size': 3.6, 'font-weight': 700, fill: '#e7ecf6', stroke: '#0b0f1a', 'stroke-width': 0.6, 'paint-order': 'stroke', 'pointer-events': 'none' }, '×' + hx.amt));
      } else if (hx.kind === 'cavern') {
        g.append(caveMark(cx, cy + 0.5, 4.2));
      }
      if (hx.kind === 'cavern') {
        // Caverns keep an amber rim and a small cave mouth even when built on.
        g.append(s('polygon', { points: poly(cx, cy, SZ * 0.95), fill: 'none', stroke: '#d29a62', 'stroke-width': 0.9, 'stroke-dasharray': '2.2 0.9', 'pointer-events': 'none' }));
        if (b || (hx.res && !hx.hid)) g.append(caveMark(cx - 5.6, cy - 2.6, 1.5));
      }
      if (hx.st.Hot) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.93), fill: 'none', stroke: '#ff7a45', 'stroke-width': 0.9, 'pointer-events': 'none' }));
      if (hx.st.Cold) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.93), fill: 'none', stroke: '#7fd3ff', 'stroke-width': 0.9, 'pointer-events': 'none' }));
      if (hx.st.Pressure) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.84), fill: 'none', stroke: '#49d17d', 'stroke-width': 0.5, 'stroke-dasharray': '1 1', 'pointer-events': 'none' }));
      const icons = ['Radiation', 'Unstable', 'Stable', 'Shielded', 'Shade', 'Crack'].filter((n) => hx.st[n] && !(n === 'Shielded' && k === '0,0') && !(n === 'Stable' && k === '0,0'));
      icons.slice(0, 3).forEach((n, i, a) => g.append(s('text', { x: cx + (i - (a.length - 1) / 2) * 3.6, y: cy - 5.2, 'text-anchor': 'middle', 'font-size': 3, 'pointer-events': 'none' }, STATUS[n].ic)));
      g.append(s('polygon', { points: poly(cx, cy, SZ), class: 'hex-hit', onclick: () => tapHex(k) }));
      gBase.append(g);
      if (legal && legal.has(k)) {
        const isTop = top.includes(k);
        gTop.append(s('polygon', { points: poly(cx, cy, SZ * 0.94), class: 'legal' + (isTop ? ' top' : '') }));
        if (fc && fc[k] != null) {
          const label = (fc[k] >= 0 ? '+' : '') + fc[k];
          const w = 3 + label.length * 2.6;
          gTop.append(s('rect', { x: cx - w / 2, y: cy - 9, width: w, height: 5.4, rx: 2.4, class: 'badge-bg' + (isTop ? ' top' : '') }));
          gTop.append(s('text', { x: cx, y: cy - 4.9, 'text-anchor': 'middle', class: 'badge' }, label));
        }
      }
      if (abilT && abilT.has(k)) gTop.append(s('polygon', { points: poly(cx, cy, SZ * 0.94), class: 'legal top' }));
      if (targets.has(k)) gTop.append(s('polygon', { points: poly(cx, cy, SZ * 0.86), class: 'target-ring' }));
    }
    if (showNet) drawNetworks(gNet);
    svgEl.append(defs, gBase, gNet, gTop, s('g', { id: 'fx' }));
    drawCompass();
  }

  // Networks: each connected group gets a colour halo; adjacent members are
  // joined by a bridge across their shared edge, Link reach by a dashed line,
  // Uncertainty Gate links by a magenta dotted line, and the orbital ring lights up.
  function drawNetworks(gNet) {
    const groups = [];
    const seen = new Set();
    for (const b of bldList(S)) {
      if (seen.has(b.id)) continue;
      const comp = [b, ...network(S, b)];
      comp.forEach((x) => seen.add(x.id));
      if (comp.length > 1) groups.push(comp);
    }
    // Biggest first, so colours stay put as small networks come and go.
    groups.sort((a, b) => b.length - a.length || a[0].id - b[0].id);
    const colOf = new Map();
    let ci = 0;
    for (const comp of groups) {
      const col = comp.some((x) => x.c === 'beacon') ? '#ffffff' : NET_COLS[ci++ % NET_COLS.length];
      comp.forEach((x) => colOf.set(x.id, col));
    }
    const pt = (b) => HX.pixel(b.k, SZ);
    const orbitCol = links(S).find((l) => l.how === 'orbit');
    if (orbitCol) gNet.append(s('circle', { cx: 0, cy: 0, r: ORBIT_R, fill: 'none', stroke: colOf.get(orbitCol.a), 'stroke-width': 0.9, 'stroke-dasharray': '3 2', opacity: 0.8 }));
    for (const l of links(S)) {
      const a = S.blds[l.a], b = S.blds[l.b];
      const col = colOf.get(a.id);
      const [x1, y1] = pt(a), [x2, y2] = pt(b);
      if (l.how === 'adj') {
        const lerp = (t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
        const [p, q] = [lerp(0.36), lerp(0.64)];
        gNet.append(s('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: '#08101c', 'stroke-width': 2.8, 'stroke-linecap': 'round' }),
          s('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: col, 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
      } else if (LINK_STYLE[l.how]) {
        // Trimmed to start at each tile's edge, clear of the initials.
        const d = Math.hypot(x2 - x1, y2 - y1) || 1;
        const tx = ((x2 - x1) / d) * SZ * 0.62, ty = ((y2 - y1) / d) * SZ * 0.62;
        const [stroke, dash] = LINK_STYLE[l.how];
        gNet.append(s('line', { x1: x1 + tx, y1: y1 + ty, x2: x2 - tx, y2: y2 - ty, stroke: stroke || col, 'stroke-width': 0.8, 'stroke-dasharray': dash, 'stroke-linecap': 'round', opacity: 0.9 }));
      } else if (l.how === 'orbit') {
        // Ground buildings that reach the ring get a spoke out to it.
        for (const [x, y] of [[x1, y1], [x2, y2]]) {
          const d = Math.hypot(x, y);
          if (d < ORBIT_R - SZ) gNet.append(s('line', { x1: x, y1: y, x2: (x / (d || 1)) * ORBIT_R, y2: (y / (d || 1)) * ORBIT_R, stroke: col, 'stroke-width': 0.6, 'stroke-dasharray': '1 1.4', opacity: 0.7 }));
        }
      }
    }
    for (const [id, col] of colOf) {
      const [cx, cy] = pt(S.blds[id]);
      gNet.append(s('polygon', { points: poly(cx, cy, SZ * 0.93), fill: 'none', stroke: col, 'stroke-width': 0.8, 'stroke-opacity': 0.95 }));
    }
  }

  // Sun compass: shows which side of the asteroid faces the sun.
  const compass = h('div', { class: 'compass', title: 'Sun direction', 'data-tut': 'compass' });
  mapwrap.append(compass);
  function drawCompass() {
    const th = (S.phase * Math.PI) / 2;
    compass.innerHTML = '';
    compass.append(h('span', { class: 'sun', style: { left: `${50 + 38 * Math.cos(th)}%`, top: `${50 + 38 * Math.sin(th)}%` } }, '☀️'), h('span', { class: 'rock', style: { transform: `translate(-50%, -50%) rotate(${S.phase * 90 + 180}deg)` } }));
  }

  function drawHand() {
    handEl.innerHTML = '';
    if (!S.hand.length) handEl.append(h('div', { class: 'dim', style: { padding: '30px 10px' } }, 'No cards in hand – pass the turn to draw.'));
    S.hand.forEach((cid, i) => {
      const el = cardEl(cid, { sel: sel === i, onclick: () => selectCard(i) });
      el.dataset.tut = 'card-' + i;
      handEl.append(el);
    });
    actEl.innerHTML = '';
    const busy = S.status !== 'play';
    actEl.append(
      h('button', { class: 'btn', onclick: logSheet }, '📜 Log'),
      h('button', { class: 'btn', onclick: goals, 'data-tut': 'goals' }, '🎯 Goals'),
      h('button', { class: 'btn', disabled: busy, onclick: hint, 'data-tut': 'hint', title: hintsLeft(S) ? `${hintsLeft(S)} hint${hintsLeft(S) > 1 ? 's' : ''} left` : `1 Integrity buys ${HINT_PACK} hints` }, '💡 Hint', h('span', { class: 'faint' }, hintsLeft(S) ? ` ${hintsLeft(S)}` : ' ❤️')),
      hooks.undo ? h('button', { class: 'btn', disabled: busy || undoLeft() <= 0, onclick: undo, title: 'Rewind your last placement or pass' }, '↶ Undo') : null,
      h('button', { class: 'btn', disabled: busy || sel == null || S.scrapped, onclick: scrap, title: 'Scrap the selected card for +1 Influence (once per turn)' }, '🗑 Scrap'),
      h('button', { class: 'btn', disabled: busy, onclick: () => confirmSheet('Pass the turn?', 'End this turn without building. The environment still advances and you draw normally.', 'Pass', () => { const seq = S.seq, before = S.influence, turn = S.turn; snap = { state: clone(S), turn }; passTurn(S); after(seq, false, before, turn); }) }, '⏭ Pass'),
      h('button', { class: 'btn', onclick: menu }, '☰'));
  }

  function render() {
    drawHUD();
    drawMap();
    drawHand();
    if (hooks.onRender) hooks.onRender({ sel });
  }

  function selectCard(i) {
    if (S.status !== 'play') return;
    closeSummary();
    abil = null;
    if (sel === i) {
      cardSheet(S.hand[i]);
      return;
    }
    sel = i;
    fc = null;
    render();
    // Forecast every legal hex after the selection paints.
    setTimeout(() => {
      if (sel !== i) return;
      fc = {};
      for (const k of legalHexes(S, S.hand[i])) fc[k] = forecast(S, i, k, 2).soon;
      drawMap();
    }, 30);
  }

  function cardSheet(cid) {
    sheet({ title: CARDS[cid].n, body: cardEl(cid, { big: true }) });
  }

  function tapHex(k) {
    if (abil) {
      if (abil.targets.includes(k)) {
        const seq = S.seq;
        snap = null;
        useAbility(S, abil.b.id, k);
        abil = null;
        after(seq, true);
      } else { abil = null; render(); }
      return;
    }
    if (sel != null && legalHexes(S, S.hand[sel]).includes(k)) return placeSheet(k);
    hexSheet(k);
  }

  function placeSheet(k) {
    const cid = S.hand[sel];
    const f = forecast(S, sel, k, 2);
    const rows = f.feed.filter((e) => e.pts || e.sys).slice(0, 14);
    sheet({
      title: `Build ${CARDS[cid].n}?`,
      body: h('div', null,
        h('div', { class: 'tx dim', style: { marginTop: 0 } }, cardText(CARDS[cid].text)),
        h('div', { class: 'row', style: { margin: '8px 0' } }, h('span', { class: 'chip good' }, `This turn: +${f.gain}`), h('span', { class: 'chip' }, `Next 3 turns: ≈+${f.soon}`), f.integrity < 0 ? h('span', { class: 'chip bad' }, `${f.integrity} Integrity`) : null),
        h('div', { class: 'sect' }, 'Expected chain'),
        rows.length ? rows.map(feedLine) : h('div', { class: 'dim' }, 'Nothing triggers yet – this building pays off later.'),
        h('p', { class: 'faint', style: { fontSize: '11px' } }, 'Badges on the map show the 3-turn estimate (this turn plus two turns with no new buildings). The forecast includes light rotation, timers and scheduled events.')),
      actions: [{ label: 'Cancel' }, { label: 'Build here', cls: 'primary', on: () => place(k) }],
    });
  }

  function place(k) {
    const seq = S.seq;
    const before = S.influence;
    const turn = S.turn;
    const prior = { state: clone(S), turn };
    if (!playCard(S, sel, k)) return;
    snap = prior;
    sel = null; fc = null;
    after(seq, false, before, turn);
  }

  function after(seq, keepTurn, before = null, turn = null) {
    hooks.save();
    const entries = S.feed.filter((e) => e.seq >= seq);
    render();
    animate(entries);
    const alerts = entries.filter((e) => e.sys && /Checkpoint|Integrity|ROAR|TIDE|GROWTH|destroyed/.test(e.sys)).map((e) => e.sys);
    const dur = !keepTurn && before != null ? turnSummary(entries, before, turn) : 0;
    if (alerts.length) setTimeout(() => toast(alerts.slice(0, 2).join(' · ') + (alerts.length > 2 ? ` (+${alerts.length - 2} more in Log)` : '')), 900);
    if (S.status !== 'play') setTimeout(() => hooks.onDone(), Math.max(1400, dur + 2000));
    else if (S.techOffer && !keepTurn) setTimeout(() => { if (S.techOffer) techSheet(); }, Math.max(900, dur + 1200));
  }

  function undo() {
    if (!snap || undoLeft() <= 0) return;
    undoUsed[snap.turn] = (undoUsed[snap.turn] || 0) + 1;
    const st = snap.state;
    snap = null;
    for (const k of Object.keys(S)) delete S[k];
    delete S._nc;
    Object.assign(S, clone(st));
    S._q = [];
    sel = null; fc = null; abil = null;
    closeSummary();
    hooks.save();
    render();
    toast('Rewound to the start of the turn');
  }

  function techSheet() {
    if (!S.techOffer) return;
    sheet({
      title: '🔬 Local technology',
      body: h('div', null, h('p', { class: 'dim', style: { marginTop: 0 } }, 'Checkpoint met! Install one technology for the rest of this map.'),
        h('div', { class: 'list' }, S.techOffer.map((t) => h('button', { class: 'charter', onclick: () => { chooseTech(S, t); closeSheets(); hooks.save(); render(); toast(`${TECHS[t].n} installed`); } }, h('b', null, `${TECHS[t].ic} ${TECHS[t].n}`), h('div', { class: 'dim', style: { fontSize: '12px' } }, TECHS[t].d))))),
    });
  }

  function closeSummary() {
    clearInterval(sumTimer);
    sumEl.hidden = true;
  }

  // End-of-turn tally: each scoring activation is added to the turn total in order, then the
  // level total is shown against the checkpoint target and the turns left. Returns its duration.
  function turnSummary(entries, before, turn) {
    clearInterval(sumTimer);
    const acts = entries.filter((e) => e.pts > 0);
    const gain = S.influence - before;
    const other = gain - acts.reduce((x, e) => x + e.pts, 0);
    const steps = acts.map((e) => ({ el: feedLine(e), pts: e.pts }));
    if (other) steps.push({ el: h('div', { class: 'logline' }, h('span', null, 'Scrap & overflow'), h('span', { class: 'dim' }), h('span', { class: 'pts' }, '+' + other)), pts: other });
    const cpHit = S.checkpoints.find((c) => c.turn === turn);
    const next = S.checkpoints.find((c) => c.met == null);
    const lines = h('div', { class: 'ts-lines' }, steps.length ? null : h('div', { class: 'dim' }, 'No buildings scored this turn.'));
    const tot = h('b', { class: 'pts' }, '+0');
    const lvl = h('b', null, before);
    const row = (lbl, val, cls = '') => h('div', { class: 'ts-row ' + cls }, h('span', null, lbl), val);
    const tail = h('div', { class: 'ts-tail', hidden: steps.length > 0 },
      cpHit ? row(`Checkpoint · turn ${cpHit.turn}`, h('b', { class: cpHit.met ? 'good' : 'bad' }, `${cpHit.at}/${cpHit.need} ${cpHit.met ? '✅ met' : '❌ missed'}`)) : null,
      next ? [
        row(`Target · by turn ${next.turn}`, h('b', null, `${cpGain(S)}/${next.need}`), 'ts-target'),
        row('Still needed', h('b', { class: cpGain(S) >= next.need ? 'good' : '' }, cpGain(S) >= next.need ? 'On track ✅' : `+${next.need - cpGain(S)}`)),
        row('Turns left for this target', h('b', null, next.turn - turn)),
      ] : null,
      S.checkpoints.length > 1 && next ? row('Checkpoint', h('b', null, `${S.checkpoints.indexOf(next) + 1} of ${S.checkpoints.length}`)) : null,
      row('Turns left in level', h('b', null, `${S.turns - turn} of ${S.turns}`)));
    sumEl.innerHTML = '';
    sumEl.append(
      h('div', { class: 'ts-head' }, h('span', null, `Turn ${turn} scoring`), h('span', { class: 'faint' }, 'tap to close')),
      lines,
      row('Turn total', tot, 'ts-total'),
      row('Level total', lvl, 'ts-level'),
      tail);
    sumEl.hidden = false;
    let i = 0, run = 0;
    sumTimer = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(sumTimer);
        lvl.textContent = S.influence;
        tail.hidden = false;
        return;
      }
      const st = steps[i++];
      run += st.pts;
      lines.append(st.el);
      lines.scrollTop = lines.scrollHeight;
      tot.textContent = '+' + run;
      lvl.textContent = before + run;
    }, 140);
    return (steps.length + 1) * 140;
  }

  function animate(entries) {
    const fx = svgEl.querySelector('#fx');
    if (!fx) return;
    const list = entries.filter((e) => e.k && (e.pts > 0 || e.sys)).slice(0, 40);
    list.forEach((e, i) => {
      const [cx, cy] = HX.pixel(e.k, SZ);
      const delay = i * 140;
      const fl = s('polygon', { points: poly(cx, cy, SZ * 0.95), class: 'flash', fill: e.sys ? '#ff6b6b' : '#ffffff', style: `animation-delay:${delay}ms` });
      fx.append(fl);
      if (e.pts > 0) fx.append(s('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', class: 'float', style: `animation-delay:${delay}ms` }, `+${e.pts}`));
    });
    setTimeout(() => { if (fx.isConnected) fx.innerHTML = ''; }, list.length * 140 + 1200);
  }

  function hexSheet(k) {
    const hx = S.hexes[k];
    const b = hx.b ? S.blds[hx.b] : null;
    const body = h('div', null);
    const kv = h('div', { class: 'kv' },
      h('b', null, 'Terrain'), h('span', null, KIND[hx.kind]),
      hx.kind !== 'rock' ? [h('b', null, 'Light'), h('span', null, isLit(S, k) ? '☀️ Sunlit' : '🌑 Shadow')] : null,
      hx.res && !hx.hid ? [h('b', null, 'Resource'), h('span', null, h('img', { class: 'res-ic', src: resourceTile(hx.res), alt: '', onerror: (e) => e.target.remove() }), `${RES[hx.res].ic} ${RES[hx.res].n}${hx.amt > 1 ? ` (${hx.amt} units)` : ''} `, RES[hx.res].tags.map((t) => h('span', { class: 'tag' }, t)))] : null,
      hx.kind === 'rock' ? [h('b', null, 'Note'), h('span', null, 'Excavate to open a Cavern (always Shadowed). May hide a buried deposit.')] : null,
      hx.kind === 'orbit' ? [h('b', null, 'Note'), h('span', null, 'Only Orbit/Orbital buildings dock here. Orbital slots share one ring network and receive Cargo Arrivals.')] : null);
    body.append(kv);
    const sts = Object.keys(hx.st).filter((n) => STATUS[n]);
    if (sts.length) {
      body.append(h('div', { class: 'sect' }, 'Status'));
      for (const n of sts) body.append(h('div', { class: 'logline' }, STATUS[n].ic, ` ${n}${hx.st[n] < 99 ? ` (${hx.st[n]} turns)` : ''} – `, h('span', { class: 'dim' }, STATUS[n].d)));
    }
    const ev = upcoming().find((e) => e.k === k);
    if (ev) body.append(h('p', { class: 'bad' }, `${EVENT_INFO[ev.type].ic} ${EVENT_INFO[ev.type].n} forecast here on turn ${ev.turn}.`));
    const actions = [];
    if (b) {
      const c = CARDS[b.c];
      body.append(h('div', { class: 'sect' }, 'Building'), cardEl(b.c, { big: true }));
      if (b.c !== 'beacon') {
        const net = network(S, b).filter((x) => x.c !== 'beacon');
        body.append(h('div', { class: 'kv', style: { marginTop: '8px' } },
          h('b', null, 'Influence earned'), h('span', null, b.inf),
          h('b', null, 'Activations'), h('span', null, `${b.acts}/${c.cap || CAP} this turn`),
          h('b', null, 'Network'), h('span', null, net.length ? net.map((x) => CARDS[x.c].n).join(', ') : 'Not connected'),
          beaconLinked(S, b) ? [h('b', null, 'Beacon link'), h('span', null, `+${BEACON_BONUS} on its first score each turn`)] : null,
          b.dis ? [h('b', null, 'Status'), h('span', { class: 'bad' }, 'Shut down by a Solar Flare')] : null));
        const st = abilityState(S, b);
        if (st) {
          actions.push({
            label: `⚡ ${st.ab.label}${st.usedThisEra ? ' (used this era)' : ''}`, cls: 'primary', disabled: !st.ok,
            on: () => {
              if (st.ab.target) {
                const t = abilityTargets(S, b);
                if (!t.length) return toast('No valid targets.');
                abil = { b, targets: t };
                sel = null; fc = null;
                render();
                toast('Tap a highlighted hex');
              } else {
                const seq = S.seq;
                snap = null;
                useAbility(S, b.id);
                after(seq, true);
              }
            },
          });
        }
      } else {
        const cl = new Set(network(S, b).map((x) => x.clan));
        body.append(h('p', null, 'Clans connected to the Beacon: ', S.clans.map((c) => h('span', { class: 'chip', style: { color: cl.has(c) ? CLANS[c].col : 'var(--faint)' } }, CLANS[c].ic, cl.has(c) ? ' ✓' : ' ✗'))));
      }
    }
    const busy = S.status !== 'play';
    if (b && b.c !== 'beacon') actions.push({ label: '💥 Demolish (uses turn)', cls: 'danger', disabled: busy, on: () => confirmSheet(`Demolish ${CARDS[b.c].n}?`, 'Spend this turn tearing it down instead of building. The hex becomes free; the environment still advances and you draw normally.', 'Demolish', () => turnAction(() => demolishTurn(S, k))) });
    if (digHexes(S).includes(k)) actions.push({ label: '⛏ Excavate (uses turn)', cls: 'primary', disabled: busy, on: () => turnAction(() => digTurn(S, k)) });
    else if (hx.kind === 'rock') body.append(h('p', { class: 'faint' }, 'Dig from open ground: only Rock next to Surface or a Cavern can be excavated.'));
    sheet({ title: b ? CARDS[b.c].n : `${KIND[hx.kind]} ${k}`, body, actions });
  }

  // Spend the whole turn on a non-card action (excavate, demolish).
  function turnAction(fn) {
    const seq = S.seq, before = S.influence, turn = S.turn;
    const prior = { state: clone(S), turn };
    if (!fn()) return;
    snap = prior;
    sel = null; fc = null; abil = null;
    after(seq, false, before, turn);
  }

  function feedLine(e) {
    if (e.sys) return h('div', { class: 'logline sys' }, e.sys);
    const c = CARDS[e.c];
    return h('div', { class: 'logline' + (e.rep ? ' rep' : '') }, h('span', { style: { color: clanColor(c.cl) } }, (e.rep ? '↻ ' : '') + c.n), h('span', { class: 'dim' }, e.note), h('span', { class: 'pts' }, e.pts ? '+' + e.pts : ''));
  }

  // The map key: every mark the map draws, drawn the same way.
  function mapKey() {
    const sw = (draw) => {
      const v = s('svg', { viewBox: '-11 -11 22 22', width: 34, height: 34, class: 'key-sw' });
      draw(v);
      return v;
    };
    const hexP = (r) => poly(0, 0, r);
    const terrain = (kind) => (v) => v.append(...[
      s('defs', null, s('pattern', { id: 'kp' + kind, width: 2.6, height: 2.6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(40)' }, s('rect', { width: 2.6, height: 2.6, fill: '#10141e' }), s('line', { x1: 0, y1: 0, x2: 0, y2: 2.6, stroke: '#262f42', 'stroke-width': 1 }))),
      s('polygon', { points: hexP(9.8), fill: kind === 'rock' ? `url(#kp${kind})` : KIND_FILL[kind], stroke: kind === 'orbit' ? '#4a6aa8' : '#0b0f1a', 'stroke-width': 0.6, 'stroke-dasharray': kind === 'orbit' ? '2 1.5' : null }),
      kind === 'cavern' ? [caveMark(0, 0.5, 4.2), s('polygon', { points: hexP(9.5), fill: 'none', stroke: '#d29a62', 'stroke-width': 0.9, 'stroke-dasharray': '2.2 0.9' })] : null,
      kind === 'rock' ? s('polygon', { points: hexP(7), fill: 'none', stroke: '#2a3346', 'stroke-width': 0.6 }) : null].flat().filter(Boolean));
    const ring = (stroke, dash, fill) => (v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), fill ? s('polygon', { points: hexP(9), fill, 'fill-opacity': 0.14 }) : '', s('polygon', { points: hexP(9.3), fill: 'none', stroke, 'stroke-width': 0.9, 'stroke-dasharray': dash }));
    const row = (swatch, name, desc) => h('div', { class: 'key-row' }, sw(swatch), h('div', null, h('b', null, name), h('div', { class: 'dim' }, desc)));
    const body = h('div', null,
      h('div', { class: 'sect' }, 'Terrain'),
      row(terrain('surface'), 'Surface', 'Open ground. Most buildings go here.'),
      row(terrain('cavern'), 'Cavern', 'Amber dashed rim and a cave mouth, which stay visible after you build or a deposit appears there. Always in Shadow. Made by excavating rock.'),
      row(terrain('rock'), 'Solid rock', 'Hatched. Can’t be built on until excavated into a Cavern. May hide a buried deposit.'),
      row(terrain('orbit'), 'Orbital slot', 'Dashed hexes on the outer ring. Only Orbit/Orbital buildings dock here.'),
      h('div', { class: 'sect' }, 'Light & status'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('polygon', { points: hexP(9.8), fill: '#ffd27a', 'fill-opacity': 0.12 })), 'Sunlit', 'Slightly warm. Solar buildings fire here.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('polygon', { points: hexP(9.8), fill: '#000', 'fill-opacity': 0.38 })), 'Shadow', 'Darker. Cryo buildings fire here.'),
      row(ring('#ff7a45'), 'Hot', 'Orange rim.'),
      row(ring('#7fd3ff'), 'Cold', 'Blue rim.'),
      row(ring('#49d17d', '1 1', '#49d17d'), 'Pressurized', 'Green tint and dotted rim.'),
      h('p', { class: 'dim', style: { fontSize: '12px' } }, Object.entries(STATUS).filter(([n]) => !['Hot', 'Cold', 'Pressure'].includes(n)).map(([n, st]) => `${st.ic} ${n}`).join(' · ')),
      h('div', { class: 'sect' }, 'Buildings & resources'),
      row((v) => v.append(s('polygon', { points: hexP(8.8), fill: '#d98b45', stroke: '#ffbf3c', 'stroke-width': 1.1 }), s('rect', { x: -5, y: 3.3, width: 10, height: 4, rx: 1.6, fill: '#08101ce6', stroke: '#d98b45', 'stroke-width': 0.35 }), s('text', { x: 0, y: 6.3, 'text-anchor': 'middle', 'font-size': 3.2, 'font-weight': 800, fill: '#fff' }, 'PD')), 'Building', 'Clan-coloured frame, rarity-coloured edge, initials badge. White dot: activated this turn. ⚡: ability ready.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('text', { x: 0, y: 3, 'text-anchor': 'middle', 'font-size': 8 }, '🪨'), s('text', { x: 5.6, y: 6, 'font-size': 3.6, fill: '#e7ecf6', 'font-weight': 700 }, '×3')), 'Deposit', 'Fills its hex. ×N shows the units left.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('polygon', { points: hexP(8), fill: 'none', stroke: '#e7ecf6', 'stroke-opacity': 0.55, 'stroke-width': 0.5, 'stroke-dasharray': '1.2 0.8' }), s('text', { x: 0, y: 2.5, 'text-anchor': 'middle', 'font-size': 6 }, '🔩')), 'Loose token', 'Smaller, inside a pale dashed outline: made by buildings.'),
      h('div', { class: 'sect' }, 'Networks (🔗 toggles)'),
      row((v) => v.append(s('polygon', { points: hexP(9.3), fill: KIND_FILL.surface, stroke: '#ffd166', 'stroke-width': 0.9 }), s('line', { x1: -10, y1: 0, x2: 10, y2: 0, stroke: '#08101c', 'stroke-width': 2.8, 'stroke-linecap': 'round' }), s('line', { x1: -10, y1: 0, x2: 10, y2: 0, stroke: '#ffd166', 'stroke-width': 1.6, 'stroke-linecap': 'round' })), 'Connected', 'Each network has its own colour halo; bridges join adjacent members. The Beacon’s network is white.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('line', { x1: -9, y1: 5, x2: 9, y2: -5, stroke: '#6ee7ff', 'stroke-width': 0.8, 'stroke-dasharray': '2.2 1.4' })), 'Link reach', 'Dashed line: a Link building reaching 2+ hexes.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('line', { x1: -9, y1: 5, x2: 9, y2: -5, stroke: '#d36bd6', 'stroke-width': 0.8, 'stroke-dasharray': '0.6 1.4', 'stroke-linecap': 'round' })), 'Anomaly link', 'Dotted magenta: joined through an Uncertainty Gate.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('line', { x1: -9, y1: 5, x2: 9, y2: -5, stroke: '#79d0f2', 'stroke-width': 0.8, 'stroke-dasharray': '0.4 0.9', 'stroke-linecap': 'round' })), 'Ice bridge', 'Pale blue dots: a Cryostead building and another building touching the same Ice or Water.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('line', { x1: -9, y1: 5, x2: 9, y2: -5, stroke: '#d98b45', 'stroke-width': 0.8, 'stroke-dasharray': '3 1', 'stroke-linecap': 'round' })), 'Mine tunnel', 'Copper dashes: an Ironwake building and another building, each on or beside a Cavern.'),
      row((v) => v.append(s('circle', { r: 8, fill: 'none', stroke: '#c9a2ff', 'stroke-width': 0.9, 'stroke-dasharray': '3 2' })), 'Orbital ring', 'Lights up in a network’s colour when orbital buildings connect; dotted spokes show ground buildings tied into it.'),
      h('div', { class: 'sect' }, 'Placing'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('polygon', { points: hexP(9.2), class: 'legal top' })), 'Best hexes', 'Gold outline: top three forecasts. Cyan: any legal hex. Badge: 3-turn Influence estimate.'),
      row((v) => v.append(s('polygon', { points: hexP(9.8), fill: KIND_FILL.surface }), s('polygon', { points: hexP(8.4), fill: 'none', stroke: '#ff6b6b', 'stroke-width': 1.1, 'stroke-dasharray': '2 1.4' })), 'Event target', 'Red dashed ring: a forecast meteor or comet lands here.'),
      h('p', { class: 'faint', style: { fontSize: '12px' } }, 'Pinch, scroll or use + / − to zoom; drag to pan while zoomed.'));
    sheet({ title: 'Map key', body });
  }

  function logSheet() {
    const body = h('div', null);
    const turns = [...new Set(S.feed.map((e) => e.t))].sort((a, b) => b - a);
    for (const t of turns.slice(0, 12)) {
      const es = S.feed.filter((e) => e.t === t);
      const sum = es.reduce((x, e) => x + (e.pts || 0), 0);
      body.append(h('div', { class: 'sect' }, `Turn ${t} · +${sum}`), ...es.map(feedLine));
    }
    if (!turns.length) body.append(h('p', { class: 'dim' }, 'Nothing has happened yet. Build something!'));
    sheet({ title: 'Activation log', body });
  }

  function goals() {
    const body = h('div', null);
    body.append(h('div', { class: 'sect' }, 'Influence checkpoints'));
    body.append(h('p', { class: 'faint', style: { fontSize: '12px', margin: '0 0 6px' } }, S.cpBase == null ? 'Total Influence needed by each turn.' : 'Each checkpoint counts only the Influence earned since the previous one.'));
    S.checkpoints.forEach((c, i) => {
      const from = S.cpBase == null ? 1 : (S.checkpoints[i - 1]?.turn ?? 0) + 1;
      body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (c.met ? ' y' : '') }, c.met ? '✓' : c.met === false ? '✗' : c.turn), `Turns ${from}–${c.turn}: ${c.at != null ? c.at + '/' : ''}${c.need} Influence`, c.turn === S.turns ? h('span', { class: 'faint' }, ' (final – must meet)') : h('span', { class: 'faint' }, ' (miss: −3 Integrity)')));
    });
    if (S.boss) {
      const o = bossObjective(S);
      body.append(h('div', { class: 'sect' }, 'Stabilization objective (required)'), h('div', { class: 'stamp' }, h('span', { class: 'ok' + (o.done ? ' y' : '') }, o.done ? '✓' : '…'), o.text));
    } else {
      body.append(h('div', { class: 'sect' }, 'Charter stamps (bigger shipments)'));
      body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (integrateDone(S) ? ' y' : '') }, integrateDone(S) ? '✓' : '…'), S.clans.length > 1 ? 'Integrate: connect buildings from every active clan to the Charter Beacon ★' : 'Integrate: connect 2+ buildings to the Charter Beacon ★'));
      for (const f of FAMILIES.concat(['trade'])) {
        const done = specializeDone(S, f);
        const sp = SPECIALIZE[f];
        const prog = f === 'trade' ? `${S.stats.launched}/3 launches · ${S.stats.habitat}/10 habitat acts` : `${S.stats[sp.stat]}/${sp.need}`;
        body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (done ? ' y' : '') }, done ? '✓' : (FAMILY_INFO[f] || { ic: '💳' }).ic), `Specialize (${f === 'trade' ? 'Trade' : FAMILY_INFO[f].n}): ${sp.text}`, h('span', { class: 'faint' }, ` ${prog}`)));
      }
      const mw = masterworkNeed(S);
      body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (S.influence >= mw ? ' y' : '') }, '★'), `Masterwork: finish with ${mw} total Influence (+1 route charge)`));
    }
    const mp = megaProgress(S);
    body.append(h('div', { class: 'sect' }, 'Mega-projects (+12, then a lasting perk)'));
    for (const [id, m] of Object.entries(MEGA)) {
      const done = S.mega && S.mega[id];
      const p = mp[id];
      if (p.need > 50) continue;
      body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (done ? ' y' : '') }, done ? '✓' : m.ic), h('div', null, h('b', null, m.n), h('span', { class: 'faint' }, done ? ' – active' : ` ${Math.min(p.have, p.need)}/${p.need}`), h('div', { class: 'dim', style: { fontSize: '12px' } }, `${m.req}. ${m.d}`))));
    }
    if ((S.techs || []).length) body.append(h('div', { class: 'sect' }, 'Local technologies'), ...S.techs.map((t) => h('div', { class: 'logline' }, `${TECHS[t].ic} ${TECHS[t].n} – `, h('span', { class: 'dim' }, TECHS[t].d))));
    body.append(h('div', { class: 'sect' }, 'Forecast'));
    const up = upcoming();
    if (!up.length) body.append(h('div', { class: 'dim' }, 'No further events forecast.'));
    for (const e of up) body.append(h('div', { class: 'item' }, h('h4', null, `${EVENT_INFO[e.type].ic} Turn ${e.turn}: ${EVENT_INFO[e.type].n}`), h('div', { class: 'dim' }, EVENT_INFO[e.type].d)));
    if (forecastCount() === 1 && !S.fullForecast) body.append(h('p', { class: 'faint' }, 'Build a Radar Dish to see the next 3 events.'));
    body.append(h('div', { class: 'sect' }, 'Card pool'),
      h('p', { class: 'dim' }, `Mid buildings ${tierOpen(S, 'M') ? 'are unlocked' : `unlock on turn ${6 - 2 * (S.draw.research || 0)}`}; Advanced ${tierOpen(S, 'A') ? 'are unlocked' : `on turn ${11 - 2 * (S.draw.research || 0)}`}. Each turn you draw 1 card, +1 if ${S.clans.length > 1 ? 'two clans' : 'your clan'} activated last turn${S.clans.length >= 3 ? ', +1 more if all three did' : ''}.`));
    sheet({ title: 'Goals & forecast', body });
  }

  function hint() {
    closeSummary();
    if (hintsLeft(S) > 0) return showHint();
    const integrity = withTip(h('b', { class: 'term' }, 'Integrity'), [h('b', null, '❤️ Integrity'),
      'The structural health of this asteroid. Missed checkpoints, meteors and collapses chip it away; at 0 the asteroid fractures and the colony is lost. Every point left when the map ends pays out 💠 Exchange Marks.']);
    const can = S.integrity > 1;
    sheet({
      title: '💡 Buy more hints?',
      body: h('div', null,
        h('p', null, `Your free hint for this map is spent. Hints draw on the colony's survey crews: spend 1 `, integrity, ` to unlock ${HINT_PACK} more.`),
        h('p', { class: can ? 'dim' : 'bad' }, can ? `❤️ ${S.integrity} → ${S.integrity - 1}` : 'Your asteroid cannot spare any more Integrity.')),
      actions: [{ label: 'Cancel' }, { label: `Spend ❤️1 for ${HINT_PACK} hints`, cls: 'primary', disabled: !can, on: () => { if (buyHints(S)) { hooks.save(); showHint(); } } }],
    });
  }

  function showHint() {
    const m = bestMove(S, { look: 2, maxHexes: 30 });
    if (!m) return toast('No legal placements – pass the turn.');
    useHint(S);
    if (hooks.onHint) hooks.onHint();
    hooks.save();
    sel = m.i;
    fc = null;
    render();
    toast(`Try ${CARDS[m.cid].n} on the gold hex`);
    fc = { [m.k]: Math.round(forecast(S, m.i, m.k, 2).soon) };
    drawMap();
  }

  function scrap() {
    if (sel == null) return;
    const name = CARDS[S.hand[sel]].n;
    if (scrapCard(S, sel)) { sel = null; fc = null; hooks.save(); render(); toast(`Scrapped ${name} (+1)`); }
  }

  function menu() {
    sheet({
      title: 'Menu',
      body: h('div', { class: 'list' },
        h('button', { class: 'btn block', onclick: () => { closeSheets(); hooks.codex(); } }, '📚 Codex & balance rubric'),
        h('button', { class: 'btn block', onclick: () => { closeSheets(); hooks.help(); } }, '❓ How to play'),
        h('button', { class: 'btn block', onclick: () => { closeSheets(); hooks.quit(); } }, '💾 Save & return to title'),
        h('button', { class: 'btn block danger', onclick: () => { closeSheets(); confirmSheet('Abandon colony?', 'The colony will count as failed.', 'Abandon', () => hooks.abandon()); } }, '🏳 Abandon colony')),
    });
  }

  render();
  return { render };
}
