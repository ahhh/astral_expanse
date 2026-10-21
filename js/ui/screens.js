import { h, sheet } from './dom.js';
import { cardEl, cardText, trigLabel } from './cardview.js';
import { CLANS, CLAN_IDS, CARD_LIST, RARITY, TIER } from '../engine/cards.js';
import { rubric, BANDS, HORIZON } from '../engine/rubric.js';
import { STARTERS } from '../engine/mapgen.js';
import { CARDS, FOUNDRY_LIST } from '../engine/cards.js';
import { DIFFICULTY, MODIFIERS } from '../engine/expedition.js';
import { TECHS, MEGA } from '../engine/colony.js';
import { hashStr } from '../engine/rng.js';
import { MEASURED } from '../engine/measured.js';

export function titleScreen(root, { hasSave, saveInfo, meta, onContinue, onNew, onPractice, onCodex, onHelp }) {
  root.innerHTML = '';
  root.append(h('div', { class: 'title' },
    h('div', { class: 'planet' }),
    h('div', { class: 'logo' }, 'Astral Expanse', h('small', null, 'The Far Trade')),
    h('p', null, 'Set out with a single clan, build self-activating colonies on strange asteroids, win new clans at their Enclaves, weave a trade network and reach a mythic superplanet before the frontier closes.'),
    hasSave ? h('button', { class: 'btn primary block', onclick: onContinue }, `Continue – ${saveInfo}`) : null,
    h('button', { class: 'btn block' + (hasSave ? '' : ' primary'), onclick: onNew }, '🚀 New expedition'),
    h('button', { class: 'btn block', onclick: onPractice }, '🪐 Quick colony (single map)'),
    h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: onCodex }, '📚 Codex'), h('button', { class: 'btn grow', onclick: onHelp }, '❓ How to play')),
    meta && meta.runs ? h('p', { class: 'faint', style: { textAlign: 'center', marginTop: '10px' } }, `Expeditions: ${meta.runs} · victories: ${meta.wins} · best colony: ${meta.bestColony || 0} Influence`) : null));
}

// Expedition setup: difficulty, optional modifiers and the chart seed.
export function setupScreen(root, { onBack, onNext }) {
  let diff = 'standard';
  const mods = new Set();
  let seedMode = 'random';
  let custom = '';
  root.innerHTML = '';
  const body = h('div', { class: 'page' });
  const today = new Date().toISOString().slice(0, 10);
  const draw = () => {
    body.innerHTML = '';
    body.append(h('div', { class: 'sect', style: { marginTop: 0 } }, 'Difficulty'),
      h('div', { class: 'opt-grid' }, Object.entries(DIFFICULTY).map(([id, d]) => h('button', { class: 'opt' + (diff === id ? ' on' : ''), onclick: () => { diff = id; draw(); } }, h('h4', null, `${d.ic} ${d.n}`), h('p', null, d.d)))),
      h('div', { class: 'sect' }, 'Modifiers (optional)'),
      h('div', { class: 'opt-grid' }, Object.entries(MODIFIERS).map(([id, m]) => h('button', { class: 'opt' + (mods.has(id) ? ' on' : ''), onclick: () => { if (mods.has(id)) mods.delete(id); else mods.add(id); draw(); } }, h('h4', null, `${m.ic} ${m.n}`), h('p', null, m.d)))),
      h('div', { class: 'sect' }, 'Star chart seed'),
      h('div', { class: 'seg' }, [['random', '🎲 Random'], ['daily', `📅 Daily (${today})`], ['custom', '✏️ Custom']].map(([id, n]) => h('button', { class: 'btn small' + (seedMode === id ? ' on' : ''), onclick: () => { seedMode = id; draw(); } }, n))),
      seedMode === 'custom' ? h('input', { class: 'field', placeholder: 'Any word or number – same seed, same chart', value: custom, oninput: (e) => { custom = e.target.value; } }) : '',
      h('p', { class: 'faint', style: { fontSize: '12px' } }, 'The seed fixes the star chart, enclave locations and every world map, so friends can race the same expedition.'));
  };
  draw();
  const go = () => {
    const seed = seedMode === 'daily' ? hashStr('daily' + today) % 1e9 : seedMode === 'custom' && custom.trim() ? (/^\d+$/.test(custom.trim()) ? +custom.trim() % 1e9 : hashStr(custom.trim()) % 1e9) : (Math.random() * 1e9) | 0;
    onNext({ difficulty: diff, mods: [...mods], seed, seedLabel: seedMode === 'daily' ? `Daily ${today}` : seedMode === 'custom' && custom.trim() ? custom.trim() : String(seed) });
  };
  root.append(h('div', { class: 'topbar' }, h('h2', null, 'New expedition'), h('div', { class: 'dim', style: { fontSize: '12px' } }, 'Tune the challenge, then pick your founding clan.')),
    body,
    h('div', { class: 'bottombar' }, h('button', { class: 'btn', onclick: onBack }, 'Back'), h('button', { class: 'btn primary grow', onclick: go }, 'Choose founding clan →')));
}

export function clanSelect(root, { title, onStart, onBack, startLabel = 'Sign treaty', min = 3, max = 3, hint }) {
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
        onclick: () => { picked = on ? picked.filter((x) => x !== id) : max === 1 ? [id] : picked.length < max ? picked.concat(id) : picked; draw(); },
      }, h('div', { class: 'row' }, h('span', { class: 'ic' }, c.ic), h('h3', { class: 'grow' }, c.n), on ? h('b', null, '✓') : null),
      h('div', { class: 'faint', style: { fontSize: '11px' } }, c.s, ' · starter: ', CARDS[STARTERS[id]].n),
      h('p', null, c.d)));
    }
    startBtn.disabled = picked.length < min;
    startBtn.textContent = picked.length >= min ? startLabel : `Pick ${min - picked.length} more`;
  };
  draw();
  root.append(h('div', { class: 'topbar' }, h('h2', null, title), h('div', { class: 'dim', style: { fontSize: '12px' } }, hint || 'Choose up to three clans. They speak a shared tag language – mix them for cross-clan cascades.')),
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
    seg.append(h('button', { class: 'btn small' + (view === 'foundry' ? ' on' : ''), onclick: () => { view = 'foundry'; draw(); } }, '🔧 Foundry'));
    seg.append(h('button', { class: 'btn small' + (view === 'systems' ? ' on' : ''), onclick: () => { view = 'systems'; draw(); } }, '🏗 Projects & tech'));
    for (const id of CLAN_IDS) seg.append(h('button', { class: 'btn small' + (view === 'cards' && clan === id ? ' on' : ''), style: { color: CLANS[id].col }, onclick: () => { view = 'cards'; clan = id; draw(); } }, CLANS[id].ic, ' ', CLANS[id].n.split(' ')[0]));
    body.innerHTML = '';
    if (view === 'rubric') return rubricView(body);
    if (view === 'systems') {
      body.append(h('h3', null, 'Mega-projects'), h('p', { class: 'dim' }, 'Recognized arrangements of buildings on a colony map. Completing one scores +12 and grants a lasting perk for that map.'));
      body.append(h('div', { class: 'list' }, Object.values(MEGA).map((m) => h('div', { class: 'item' }, h('h4', null, `${m.ic} ${m.n}`), h('div', { class: 'faint', style: { fontSize: '12px' } }, 'Requires: ' + m.req), h('div', { class: 'dim', style: { fontSize: '12px' } }, m.d)))));
      body.append(h('h3', { style: { marginTop: '16px' } }, 'Local technologies'), h('p', { class: 'dim' }, 'Each Influence checkpoint you meet (except the last) offers three; pick one. They vanish when the map ends.'));
      body.append(h('div', { class: 'list' }, Object.values(TECHS).map((t) => h('div', { class: 'item' }, h('h4', null, `${t.ic} ${t.n}`), h('div', { class: 'dim', style: { fontSize: '12px' } }, t.d)))));
      return;
    }
    if (view === 'foundry') {
      body.append(h('p', { class: 'dim', style: { marginTop: 0 } }, '18 shop-only blueprints (two per clan), bought in the Foundry tab of the star chart. They are Mid-tier Uncommons that open new interactions rather than out-classing base cards.'));
      body.append(h('div', { class: 'list' }, FOUNDRY_LIST.map((c) => {
        const r = rubric(c);
        return h('div', { class: 'item codex-card', onclick: () => sheet({ title: c.n, body: h('div', null, cardEl(c.id, { big: true }), c.rb && c.rb.why ? h('p', { class: 'dim' }, 'Design note: ', c.rb.why) : null) }) },
          h('div', null, h('b', { style: { color: CLANS[c.cl].col } }, CLANS[c.cl].ic, ' ', c.n), h('div', { class: 'faint', style: { fontSize: '11px' } }, `${trigLabel(c)} · ${c.tags.join(' · ')} · ${Object.entries(c.cost).map(([k, v]) => v + ' ' + k).join(' + ')}`), h('div', { class: 'tx dim', style: { fontSize: '12px' } }, cardText(c.text))),
          h('div', { style: { textAlign: 'right' } }, h('div', { class: 'pp pill-' + c.r }, r.pp)));
      })));
      return;
    }
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
      P('Each turn you build one card from your hand on an empty hex. Tap a card to see every legal hex with a forecast of the Influence it would earn (the best three glow gold). Tap a hex to confirm. Tap a card again for its full text. Misplaced something? Undo (if your difficulty allows it) rewinds the last placement.'),
      P('Buildings fire on triggers: On Build, every turn, every N turns, while Sunlit, or reactively when something happens nearby – a resource is created, consumed or transformed, a hex heats or cools, a meteor lands, and so on. One placement can set off a long cascade. Each building can activate at most twice per turn.'),
      P('The asteroid rotates one quarter-turn each turn: the compass shows where the sun is. Lit hexes are brighter, Shadow hexes darker. Caverns (excavated rock) are always in Shadow.'),
      P('Natural deposits hold several units (shown as ×3, ×2). Converting one places the product on a free neighbouring hex, so keep space around your deposits.'),
      P('Meet each Influence checkpoint. Missing one costs 3 Integrity; missing the final one fails the colony. Meeting one offers a local technology for the rest of the map. Arranging buildings into a mega-project (see Goals) scores a bonus and a lasting perk.'),
      P('You draw 1 card per turn, +1 if two of your clans activated (or your only clan did), +1 more if all three did. Mid buildings unlock on turn 6 and Advanced on turn 11.'),
      h('h3', null, 'Growing your treaty'),
      P('You set out with one clan. Clan Enclaves on the star chart invite their resident clan onto that map; secure the colony and the clan joins your treaty, up to three active clans. With a full treaty an enclave clan replaces one of yours for that map and is licensed for later swaps at Freeports.'),
      h('h3', null, 'Charters and the trade network'),
      P('A secured colony becomes a trade node. Choose a charter: its shipment grows with the world\'s abundance and two stamps – Specialize (a resource milestone) and Integrate (every active clan connected to the ★ Charter Beacon).'),
      P('Build lanes between claimed colonies, the Arkship and visited Freeports. Supplied colonies ship their route yield on every jump, limited by each lane\'s capacity. Three colonies of different charters joined in a loop form a trade ring and earn a Trade Compact. After Frontier Pressure 4, route crises are forecast a jump ahead: avert them, or fit lane upgrades that deflect them.'),
      h('h3', null, 'Spending world resources'),
      P('Clans tab: Presence, Favor and Bans bias your draws; Enhancements give each clan a visible head start. Foundry: shop-only blueprints. Fleet: one-shot Preparations for the next colony and permanent Fleet Yard upgrades. Goals: carry one sector contract at a time.'),
      h('h3', null, 'The finale'),
      P('Every jump raises Frontier Pressure. Collect three Gate Shards and reach 8 supplied throughput, then cross the Veil to one of three Mythic Superplanets. Your network converts into up to three Supply Tokens for the boss map. Win, and you can push on into the Endless Frontier.'),
      h('h3', null, 'Saving'),
      P('Progress saves automatically to this browser after every action. Clearing site data erases it.')));
}
