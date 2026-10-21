// Colony map screen: HUD, SVG hex map, hand tray and info sheets.
import { h, s, sheet, toast, confirmSheet, closeSheets } from './dom.js';
import { cardEl, cardText, clanColor, abbr, trigLabel } from './cardview.js';
import { CARDS, CLANS, RARITY, TIER } from '../engine/cards.js';
import { RES, STATUS, FAMILIES, FAMILY_INFO } from '../engine/resources.js';
import * as HX from '../engine/hex.js';
import {
  isLit, legalHexes, forecast, playCard, passTurn, scrapCard, bldAt, bldList, network,
  abilityState, abilityTargets, useAbility, EVENT_INFO, bossObjective, BOSS_INFO, integrateDone,
  SPECIALIZE, specializeDone, tierOpen, CAP,
} from '../engine/colony.js';
import { bestMove } from '../engine/ai.js';

const SZ = 10;
const PHASES = [['🌅', 'Dawn'], ['☀️', 'High Sun'], ['🌇', 'Dusk'], ['🌑', 'Deep Night']];
const KIND = { surface: 'Surface', cavern: 'Cavern', rock: 'Solid rock', orbit: 'Orbital slot' };
const KIND_FILL = { surface: '#2b3652', cavern: '#45332b', rock: '#121722', orbit: '#151f38' };

export function colonyScreen(root, S, hooks) {
  let sel = null;
  let fc = null;
  let abil = null;

  root.innerHTML = '';
  const hud = h('div', { class: 'hud' });
  const svgEl = s('svg', { role: 'img', 'aria-label': 'Colony map' });
  const mapwrap = h('div', { class: 'mapwrap' }, svgEl);
  const handEl = h('div', { class: 'hand' });
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
  svgEl.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const poly = (cx, cy, sz) => HX.corners(cx, cy, sz).map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ');
  const forecastCount = () => (bldList(S).some((b) => CARDS[b.c].radar) ? 3 : 1);
  const upcoming = () => S.events.filter((e) => !e.done && e.turn >= S.turn).slice(0, forecastCount());

  function drawHUD() {
    const cp = S.checkpoints.find((c) => c.met == null) || S.checkpoints[S.checkpoints.length - 1];
    const prev = S.checkpoints.filter((c) => c.turn < cp.turn).slice(-1)[0];
    const lo = prev ? prev.need : 0;
    const pct = Math.max(0, Math.min(100, ((S.influence - lo) / Math.max(1, cp.need - lo)) * 100));
    const ev = upcoming()[0];
    const [pic, pname] = PHASES[S.phase];
    hud.innerHTML = '';
    hud.append(
      h('div', { class: 'l1' },
        h('div', { class: 'name' }, S.name),
        h('span', { class: 'chip', title: pname }, pic, ' ', pname),
        h('span', { class: 'chip' }, `T${S.turn}/${S.turns}`)),
      h('div', { class: 'l1' },
        h('span', { class: 'inf' }, S.influence),
        h('div', { class: 'grow' },
          h('div', { class: 'cp' }, `Checkpoint ${cp.need} by turn ${cp.turn}`, S.influence >= cp.need ? ' ✅' : ''),
          h('div', { class: 'meter' + (S.turn >= cp.turn - 1 && S.influence < cp.need ? ' danger' : '') }, h('i', { style: { width: pct + '%' } }))),
        h('span', { class: 'chip', title: 'Asteroid Integrity' }, '❤️ ', S.integrity),
        ev ? h('button', { class: 'chip', onclick: goals }, EVENT_INFO[ev.type].ic, ` T${ev.turn}`) : null),
      h('div', { class: 'l1', style: { fontSize: '11px' } },
        S.clans.map((c) => h('span', { class: 'chip', style: { borderColor: CLANS[c].col, color: CLANS[c].col } }, CLANS[c].ic, ' ', CLANS[c].n.split(' ')[0])),
        S.boss ? h('span', { class: 'chip warn' }, `${BOSS_INFO[S.boss.type].meterName} ${S.boss.type === 'viridion' ? S.boss.clock + '/3' : S.boss.meter + '/' + BOSS_INFO[S.boss.type].max}`) : null));
  }

  function drawMap() {
    svgEl.innerHTML = '';
    const legal = sel != null ? new Set(legalHexes(S, S.hand[sel])) : null;
    const abilT = abil ? new Set(abil.targets) : null;
    const top = fc ? Object.entries(fc).sort((a, b) => b[1] - a[1]).slice(0, 3).filter((e) => e[1] > 0).map((e) => e[0]) : [];
    const targets = new Map(upcoming().filter((e) => e.k).map((e) => [e.k, e]));
    const gBase = s('g'), gTop = s('g');
    for (const k of keys) {
      const hx = S.hexes[k];
      const [cx, cy] = HX.pixel(k, SZ);
      const g = s('g', { 'data-k': k });
      g.append(s('polygon', { points: poly(cx, cy, SZ * 0.98), class: 'hex-base', fill: KIND_FILL[hx.kind], 'stroke-dasharray': hx.kind === 'orbit' ? '2 1.5' : null, stroke: hx.kind === 'orbit' ? '#4a6aa8' : null }));
      if (hx.kind !== 'rock') {
        const lit = isLit(S, k);
        g.append(s('polygon', { points: poly(cx, cy, SZ * 0.98), fill: lit ? '#ffd27a' : '#000', 'fill-opacity': lit ? 0.09 : 0.38, 'pointer-events': 'none' }));
      } else {
        g.append(s('text', { x: cx, y: cy + 2, 'text-anchor': 'middle', 'font-size': 5, fill: '#2c3546', 'pointer-events': 'none' }, '▲'));
      }
      if (hx.st.Hot) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.9), fill: 'none', stroke: '#ff7a45', 'stroke-width': 0.9, 'pointer-events': 'none' }));
      if (hx.st.Cold) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.9), fill: 'none', stroke: '#7fd3ff', 'stroke-width': 0.9, 'pointer-events': 'none' }));
      if (hx.st.Pressure) g.append(s('polygon', { points: poly(cx, cy, SZ * 0.8), fill: '#49d17d', 'fill-opacity': 0.12, stroke: '#49d17d', 'stroke-width': 0.5, 'stroke-dasharray': '1 1', 'pointer-events': 'none' }));
      const b = hx.b ? S.blds[hx.b] : null;
      if (b) {
        const c = CARDS[b.c];
        if (b.c === 'beacon') {
          g.append(s('polygon', { points: poly(cx, cy, SZ * 0.78), fill: '#e7ecf6', stroke: '#6ee7ff', 'stroke-width': 1, 'pointer-events': 'none' }));
          g.append(s('text', { x: cx, y: cy + 2.6, 'text-anchor': 'middle', 'font-size': 8, 'pointer-events': 'none' }, '★'));
        } else {
          g.append(s('polygon', { points: poly(cx, cy, SZ * 0.8), fill: clanColor(c.cl), stroke: RARITY[c.r].col, 'stroke-width': c.r === 'C' ? 0.6 : 1.3, 'pointer-events': 'none', opacity: b.dis ? 0.45 : 1 }));
          g.append(s('text', { x: cx, y: cy + 1.9, 'text-anchor': 'middle', 'font-size': 5.4, 'font-weight': 800, fill: '#08101c', 'font-family': 'Chakra Petch, sans-serif', 'pointer-events': 'none' }, abbr(c)));
          if (b.acts) g.append(s('circle', { cx: cx + 5.2, cy: cy - 4.6, r: 1.3, fill: '#fff', 'pointer-events': 'none' }));
          if (c.ability) {
            const st = abilityState(S, b);
            if (st && st.ok) g.append(s('text', { x: cx - 5.4, y: cy - 3.4, 'font-size': 3.6, 'pointer-events': 'none' }, '⚡'));
          }
        }
      } else if (hx.res && !hx.hid) {
        g.append(s('text', { x: cx, y: cy + 2.8, 'text-anchor': 'middle', 'font-size': 8, 'pointer-events': 'none' }, RES[hx.res].ic));
        if (hx.amt > 1) g.append(s('text', { x: cx + 5.6, y: cy + 5.4, 'text-anchor': 'middle', 'font-size': 3.6, 'font-weight': 700, fill: '#e7ecf6', stroke: '#0b0f1a', 'stroke-width': 0.5, 'paint-order': 'stroke', 'pointer-events': 'none' }, '×' + hx.amt));
      }
      const icons = ['Radiation', 'Unstable', 'Stable', 'Shielded', 'Shade', 'Crack'].filter((n) => hx.st[n] && !(n === 'Shielded' && k === '0,0') && !(n === 'Stable' && k === '0,0'));
      icons.slice(0, 3).forEach((n, i) => g.append(s('text', { x: cx - 4 + i * 4, y: cy + 7.2, 'text-anchor': 'middle', 'font-size': 3.2, 'pointer-events': 'none' }, STATUS[n].ic)));
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
    svgEl.append(gBase, gTop, s('g', { id: 'fx' }));
    drawCompass();
  }

  // Sun compass: shows which side of the asteroid faces the sun.
  const compass = h('div', { class: 'compass', title: 'Sun direction' });
  mapwrap.append(compass);
  function drawCompass() {
    const th = (S.phase * Math.PI) / 2;
    compass.innerHTML = '';
    compass.append(h('span', { class: 'sun', style: { left: `${50 + 38 * Math.cos(th)}%`, top: `${50 + 38 * Math.sin(th)}%` } }, '☀️'), h('span', { class: 'rock', style: { transform: `translate(-50%, -50%) rotate(${S.phase * 90 + 180}deg)` } }));
  }

  function drawHand() {
    handEl.innerHTML = '';
    if (!S.hand.length) handEl.append(h('div', { class: 'dim', style: { padding: '30px 10px' } }, 'No cards in hand – pass the turn to draw.'));
    S.hand.forEach((cid, i) => handEl.append(cardEl(cid, { sel: sel === i, onclick: () => selectCard(i) })));
    actEl.innerHTML = '';
    const busy = S.status !== 'play';
    actEl.append(
      h('button', { class: 'btn', onclick: logSheet }, '📜 Log'),
      h('button', { class: 'btn', onclick: goals }, '🎯 Goals'),
      h('button', { class: 'btn', disabled: busy, onclick: hint }, '💡 Hint'),
      h('button', { class: 'btn', disabled: busy || sel == null || S.scrapped, onclick: scrap, title: 'Scrap the selected card for +1 Influence (once per turn)' }, '🗑 Scrap'),
      h('button', { class: 'btn', disabled: busy, onclick: () => confirmSheet('Pass the turn?', 'End this turn without building. The environment still advances and you draw normally.', 'Pass', () => { const seq = S.seq, before = S.influence, turn = S.turn; passTurn(S); after(seq, false, before, turn); }) }, '⏭ Pass'),
      h('button', { class: 'btn', onclick: menu }, '☰'));
  }

  function render() {
    drawHUD();
    drawMap();
    drawHand();
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
    if (!playCard(S, sel, k)) return;
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
      cpHit ? row(`Checkpoint · turn ${cpHit.turn}`, h('b', { class: cpHit.met ? 'good' : 'bad' }, `${cpHit.need} ${cpHit.met ? '✅ met' : '❌ missed'}`)) : null,
      next ? [
        row(`Target · by turn ${next.turn}`, h('b', null, next.need), 'ts-target'),
        row('Still needed', h('b', { class: S.influence >= next.need ? 'good' : '' }, S.influence >= next.need ? 'On track ✅' : `+${next.need - S.influence}`)),
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
      hx.res && !hx.hid ? [h('b', null, 'Resource'), h('span', null, `${RES[hx.res].ic} ${RES[hx.res].n}${hx.amt > 1 ? ` (${hx.amt} units)` : ''} `, RES[hx.res].tags.map((t) => h('span', { class: 'tag' }, t)))] : null,
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
    sheet({ title: b ? CARDS[b.c].n : `${KIND[hx.kind]} ${k}`, body, actions });
  }

  function feedLine(e) {
    if (e.sys) return h('div', { class: 'logline sys' }, e.sys);
    const c = CARDS[e.c];
    return h('div', { class: 'logline' + (e.rep ? ' rep' : '') }, h('span', { style: { color: clanColor(c.cl) } }, (e.rep ? '↻ ' : '') + c.n), h('span', { class: 'dim' }, e.note), h('span', { class: 'pts' }, e.pts ? '+' + e.pts : ''));
  }

  function logSheet() {
    const body = h('div', null);
    const turns = [...new Set(S.feed.map((e) => e.t))].sort((a, b) => b - a);
    for (const t of turns.slice(0, 12)) {
      const es = S.feed.filter((e) => e.t === t);
      const sum = es.reduce((x, e) => x + (e.pts || 0), 0);
      body.append(h('div', { class: 'sect' }, `Turn ${t} · +${sum}`), es.map(feedLine));
    }
    if (!turns.length) body.append(h('p', { class: 'dim' }, 'Nothing has happened yet. Build something!'));
    sheet({ title: 'Activation log', body });
  }

  function goals() {
    const body = h('div', null);
    body.append(h('div', { class: 'sect' }, 'Influence checkpoints'));
    for (const c of S.checkpoints) {
      body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (c.met ? ' y' : '') }, c.met ? '✓' : c.met === false ? '✗' : c.turn), `Turn ${c.turn}: ${c.need} Influence`, c.turn === S.turns ? h('span', { class: 'faint' }, ' (final – must meet)') : h('span', { class: 'faint' }, ' (miss: −3 Integrity)')));
    }
    if (S.boss) {
      const o = bossObjective(S);
      body.append(h('div', { class: 'sect' }, 'Stabilization objective (required)'), h('div', { class: 'stamp' }, h('span', { class: 'ok' + (o.done ? ' y' : '') }, o.done ? '✓' : '…'), o.text));
    } else {
      body.append(h('div', { class: 'sect' }, 'Charter stamps (bigger shipments)'));
      body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (integrateDone(S) ? ' y' : '') }, integrateDone(S) ? '✓' : '…'), 'Integrate: connect buildings from all three active clans to the Charter Beacon ★'));
      for (const f of FAMILIES.concat(['trade'])) {
        const done = specializeDone(S, f);
        const sp = SPECIALIZE[f];
        const prog = f === 'trade' ? `${S.stats.launched}/3 launches · ${S.stats.habitat}/10 habitat acts` : `${S.stats[sp.stat]}/${sp.need}`;
        body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (done ? ' y' : '') }, done ? '✓' : (FAMILY_INFO[f] || { ic: '💳' }).ic), `Specialize (${f === 'trade' ? 'Trade' : FAMILY_INFO[f].n}): ${sp.text}`, h('span', { class: 'faint' }, ` ${prog}`)));
      }
      const fin = S.checkpoints[S.checkpoints.length - 1].need;
      body.append(h('div', { class: 'stamp' }, h('span', { class: 'ok' + (S.influence >= fin * 1.25 ? ' y' : '') }, '★'), `Masterwork: finish with ${Math.round(fin * 1.25)} Influence (+1 route charge)`));
    }
    body.append(h('div', { class: 'sect' }, 'Forecast'));
    const up = upcoming();
    if (!up.length) body.append(h('div', { class: 'dim' }, 'No further events forecast.'));
    for (const e of up) body.append(h('div', { class: 'item' }, h('h4', null, `${EVENT_INFO[e.type].ic} Turn ${e.turn}: ${EVENT_INFO[e.type].n}`), h('div', { class: 'dim' }, EVENT_INFO[e.type].d)));
    if (forecastCount() === 1) body.append(h('p', { class: 'faint' }, 'Build a Radar Dish to see the next 3 events.'));
    body.append(h('div', { class: 'sect' }, 'Card pool'),
      h('p', { class: 'dim' }, `Mid buildings ${tierOpen(S, 'M') ? 'are unlocked' : `unlock on turn ${6 - 2 * (S.draw.research || 0)}`}; Advanced ${tierOpen(S, 'A') ? 'are unlocked' : `on turn ${11 - 2 * (S.draw.research || 0)}`}. Each turn you draw 1 card, +1 if two clans activated last turn, +1 more if all three did.`));
    sheet({ title: 'Goals & forecast', body });
  }

  function hint() {
    closeSummary();
    const m = bestMove(S, { look: 2, maxHexes: 30 });
    if (!m) return toast('No legal placements – pass the turn.');
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
