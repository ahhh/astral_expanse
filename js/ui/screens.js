import { h, sheet } from './dom.js';
import { cardEl, cardText, trigLabel } from './cardview.js';
import { CLANS, CLAN_IDS, CARD_LIST, RARITY, TIER } from '../engine/cards.js';
import { rubric, BANDS, HORIZON } from '../engine/rubric.js';
import { STARTERS } from '../engine/mapgen.js';
import { CARDS } from '../engine/cards.js';
import { MEASURED } from '../engine/measured.js';

export function titleScreen(root, { hasSave, saveInfo, meta, onContinue, onNew, onPractice, onCodex, onHelp }) {
  root.innerHTML = '';
  root.append(h('div', { class: 'title' },
    h('div', { class: 'planet' }),
    h('div', { class: 'logo' }, 'Astral Expanse', h('small', null, 'The Far Trade')),
    h('p', null, 'Sign a treaty with three of nine clans, build self-activating colonies on strange asteroids, weave them into a trade network, and reach a mythic superplanet before the frontier closes.'),
    hasSave ? h('button', { class: 'btn primary block', onclick: onContinue }, `Continue – ${saveInfo}`) : null,
    h('button', { class: 'btn block' + (hasSave ? '' : ' primary'), onclick: onNew }, '🚀 New expedition'),
    h('button', { class: 'btn block', onclick: onPractice }, '🪐 Quick colony (single map)'),
    h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: onCodex }, '📚 Codex'), h('button', { class: 'btn grow', onclick: onHelp }, '❓ How to play')),
    meta && meta.runs ? h('p', { class: 'faint', style: { textAlign: 'center', marginTop: '10px' } }, `Expeditions: ${meta.runs} · victories: ${meta.wins} · best colony: ${meta.bestColony || 0} Influence`) : null));
}

export function clanSelect(root, { title, onStart, onBack, startLabel = 'Sign treaty' }) {
  let picked = [];
  root.innerHTML = '';
  const grid = h('div', { class: 'clan-grid' });
  const startBtn = h('button', { class: 'btn primary grow', disabled: true, onclick: () => onStart(picked) }, startLabel);
  const draw = () => {
    grid.innerHTML = '';
    for (const id of CLAN_IDS) {
      const c = CLANS[id];
      const on = picked.includes(id);
      grid.append(h('button', {
        class: 'clan-card' + (on ? ' on' : ''), '--cc': c.col,
        onclick: () => { picked = on ? picked.filter((x) => x !== id) : picked.length < 3 ? picked.concat(id) : picked; draw(); },
      }, h('div', { class: 'row' }, h('span', { class: 'ic' }, c.ic), h('h3', { class: 'grow' }, c.n), on ? h('b', null, '✓') : null),
      h('div', { class: 'faint', style: { fontSize: '11px' } }, c.s, ' · starter: ', CARDS[STARTERS[id]].n),
      h('p', null, c.d)));
    }
    startBtn.disabled = picked.length !== 3;
    startBtn.textContent = picked.length === 3 ? startLabel : `Pick ${3 - picked.length} more`;
  };
  draw();
  root.append(h('div', { class: 'topbar' }, h('h2', null, title), h('div', { class: 'dim', style: { fontSize: '12px' } }, 'Choose exactly three clans. They speak a shared tag language – mix them for cross-clan cascades.')),
    h('div', { class: 'page' }, grid),
    h('div', { class: 'bottombar' }, h('button', { class: 'btn', onclick: onBack }, 'Back'), startBtn));
}

export function codexScreen(root, { onBack }) {
  let clan = 'iron';
  let view = 'cards';
  root.innerHTML = '';
  const body = h('div', { class: 'page' });
  const seg = h('div', { class: 'seg' });
  const draw = () => {
    seg.innerHTML = '';
    seg.append(h('button', { class: 'btn small' + (view === 'rubric' ? ' on' : ''), onclick: () => { view = 'rubric'; draw(); } }, '⚖️ Rubric'));
    for (const id of CLAN_IDS) seg.append(h('button', { class: 'btn small' + (view === 'cards' && clan === id ? ' on' : ''), style: { color: CLANS[id].col }, onclick: () => { view = 'cards'; clan = id; draw(); } }, CLANS[id].ic, ' ', CLANS[id].n.split(' ')[0]));
    body.innerHTML = '';
    if (view === 'rubric') return rubricView(body);
    const cards = CARD_LIST.filter((c) => c.cl === clan);
    const tot = cards.reduce((s, c) => s + rubric(c).pp, 0);
    body.append(h('p', { class: 'dim', style: { marginTop: 0 } }, CLANS[clan].d, ` Total rubric power ${tot.toFixed(0)} PP.`));
    for (const t of ['E', 'M', 'A']) {
      body.append(h('div', { class: 'sect' }, `${TIER[t]} tier`));
      body.append(h('div', { class: 'list' }, cards.filter((c) => c.t === t).map((c) => {
        const r = rubric(c);
        return h('div', { class: 'item codex-card', onclick: () => sheet({ title: c.n, body: h('div', null, cardEl(c.id, { big: true }), c.rb && c.rb.why ? h('p', { class: 'dim' }, 'Balance note: ', c.rb.why) : null, partsEl(r)) }) },
          h('div', null, h('b', null, c.n), ' ', h('span', { class: 'pill-' + c.r }, RARITY[c.r].n), h('div', { class: 'faint', style: { fontSize: '11px' } }, `${trigLabel(c)} · ${c.tags.join(' · ')}`), h('div', { class: 'tx dim', style: { fontSize: '12px' } }, cardText(c.text))),
          h('div', { style: { textAlign: 'right' } }, h('div', { class: 'pp pill-' + c.r }, r.pp), h('div', { class: 'faint', style: { fontSize: '10px' } }, `meas. ${MEASURED[c.id] ?? '–'}`)));
      })));
    }
  };
  draw();
  root.append(h('div', { class: 'topbar' }, h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: onBack }, '←'), h('h2', { class: 'grow' }, 'Codex')), h('div', { style: { marginTop: '6px' } }, seg)), body);
}

function partsEl(r) {
  const names = { once: 'On Build', periodic: 'Periodic', react: 'Reactive', passive: 'Passive/aura', ability: 'Ability', cost: 'Drawbacks' };
  return h('div', { class: 'kv' }, Object.entries(r.parts).filter(([, v]) => v).map(([k, v]) => [h('b', null, names[k]), h('span', null, v.toFixed(1))]), h('b', null, 'Total'), h('span', null, `${r.pp} PP (band ${r.band.min}–${r.band.max})`));
}

function rubricView(body) {
  body.append(
    h('h3', null, 'Power Point rubric'),
    h('p', { class: 'dim' }, 'Every building is scored in Power Points (PP): the Influence it should produce over the turns it is likely to be on the board, plus the value of what it enables, minus its drawbacks.'),
    h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: '12px', background: 'var(--panel)', padding: '10px', borderRadius: '10px' } },
      'PP = On-Build value\n   + activations × (points × reliability + utility)\n   + reactive points × triggers/turn × horizon\n   + aura value × rate × horizon\n   + abilities − drawbacks'),
    h('div', { class: 'kv' },
      h('b', null, 'Horizon'), h('span', null, `Early ${HORIZON.E} turns · Mid ${HORIZON.M} · Advanced ${HORIZON.A}`),
      h('b', null, 'Activations'), h('span', null, 'Every turn = horizon; every N turns = horizon ÷ N; Sunlit/Shadow = ½; every 2 Sunlit = ¼'),
      h('b', null, 'Utility'), h('span', null, 'Token created 2 · enabling transform 1 · reveal 1.5 · cavern 2 · stabilize/shield 1 · repeat ≈5 · card draw 3 · Integrity 3')),
    h('div', { class: 'sect' }, 'Rarity bands'),
    h('div', { class: 'list' }, Object.entries(BANDS).map(([k, b]) => h('div', { class: 'item' }, h('b', { class: 'pill-' + k }, RARITY[k].n), ` ${b.min}–${b.max} PP (target ${b.target}) · draw weight ×${RARITY[k].w}`))),
    h('p', { class: 'dim' }, 'Each clan has 7 Common, 5 Uncommon and 3 Rare buildings. Rarer cards are stronger on the rubric but drawn less often, so every clan\'s expected power per draw stays even. The headless simulator (tools/sim.mjs) plays every three-clan trio with a greedy bot; each card shows its rubric PP and its measured PP from those games. Full tables: docs/BALANCE.md.'));
  const rows = CLAN_IDS.map((cl) => {
    const cs = CARD_LIST.filter((c) => c.cl === cl);
    const tot = cs.reduce((s, c) => s + rubric(c).pp, 0);
    const w = cs.reduce((s, c) => s + RARITY[c.r].w, 0);
    const exp = cs.reduce((s, c) => s + RARITY[c.r].w * rubric(c).pp, 0) / w;
    return [cl, tot, exp];
  });
  body.append(h('div', { class: 'sect' }, 'Clan totals'), h('div', { class: 'list' }, rows.map(([cl, tot, exp]) => h('div', { class: 'item row' }, h('span', { class: 'grow', style: { color: CLANS[cl].col } }, CLANS[cl].ic, ' ', CLANS[cl].n), h('span', { class: 'dim' }, `${tot.toFixed(0)} PP · ${exp.toFixed(1)} per draw`)))));
}

export function helpScreen(root, { onBack }) {
  root.innerHTML = '';
  const P = (t) => h('p', null, t);
  root.append(h('div', { class: 'topbar' }, h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: onBack }, '←'), h('h2', null, 'How to play'))),
    h('div', { class: 'page' },
      h('h3', null, 'The colony map'),
      P('Each turn you build one card from your hand on an empty hex. Tap a card to see every legal hex with a forecast of the Influence it would earn this turn (the best three glow gold). Tap a hex to confirm. Tap a card again for its full text.'),
      P('Buildings fire on triggers: On Build, every turn, every N turns, while Sunlit, or reactively when something happens nearby – a resource is created, consumed or transformed, a hex heats or cools, a meteor lands, and so on. One placement can set off a long cascade. Each building can activate at most twice per turn.'),
      P('The asteroid rotates one quarter-turn each turn: the compass in the corner of the map shows where the sun is. Lit hexes are brighter, Shadow hexes darker. Caverns (excavated rock) are always in Shadow.'),
      P('Natural deposits hold several units (shown as ×3, ×2). Converting one places the product on a free neighbouring hex and uses up one unit, so keep space around your deposits. Loose tokens such as Water or Metal are single units.'),
      P('Meet each Influence checkpoint (shown in the HUD). Missing one costs 3 Integrity; missing the final one fails the colony. Meteors and other events are forecast – a red dashed ring marks the next impact.'),
      P('You draw 1 card per turn, +1 if buildings from two of your clans activated, +1 more if all three did. Mid buildings unlock on turn 6 and Advanced on turn 11.'),
      h('h3', null, 'Charters and the star chart'),
      P('A secured colony becomes a trade node. Choose a charter: its shipment grows with the world\'s abundance and with two stamps – Specialize (a resource milestone) and Integrate (connect all three clans to the ★ Charter Beacon).'),
      P('Build lanes back to the Arkship or a Freeport so colonies deliver their route yield on every jump. Spend world resources in the Directorate (bias your draws), on Preparations (change the next map), and at Freeports (exchange, swap clans).'),
      P('Every jump raises Frontier Pressure. Collect Gate Shards at Gate Shrines, then choose one of three Mythic Superplanets for the finale before Pressure hits its limit.'),
      h('h3', null, 'Saving'),
      P('Progress saves automatically to this browser after every action. Clearing site data erases it.')));
}
