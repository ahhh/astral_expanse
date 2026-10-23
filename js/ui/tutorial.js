// Guided first expedition (Standard difficulty or gentler): coach marks over the
// star chart tabs, the Exchange and the first colony map. Progress lives in
// E.tut so it survives saves; it is null once the tour is finished or skipped.
//
// A step either blocks the screen and waits for Next (`next`), or lets the
// player act and advances once `done` holds. `tab` pins a star-chart step to a
// tab; elsewhere a redirect bubble points back to it.
import { h, toast } from './dom.js';
import { trigLabel } from './cardview.js';
import * as X from '../engine/expedition.js';
import { CARDS, CLANS, clanCards } from '../engine/cards.js';
import { WORLD } from '../engine/resources.js';
import { STARTERS } from '../engine/mapgen.js';
import { rubric } from '../engine/rubric.js';
import { forecast } from '../engine/colony.js';
import { bestMove } from '../engine/ai.js';

const TAB_NAMES = { chart: '🗺️ Chart', net: '🛰️ Network', dir: '🏛️ Clans', foundry: '🔧 Foundry', fleet: '🚀 Fleet', goals: '🎯 Goals' };
export const tutorialFor = (difficulty) => difficulty === 'explorer' || difficulty === 'standard';

const $ = (key) => document.querySelector(`[data-tut="${key}"]`);
// The action button inside a highlighted row (Buy, the price, Accept).
const btnIn = (key) => { const el = $(key); return el && el.querySelector('button'); };
const $$ = (key) => [...document.querySelectorAll(`[data-tut="${key}"]`)];
const sheetOpen = () => document.querySelector('#sheet-root .overlay');

// ---------------------------------------------------------------- recommendations
const founder = (E) => E.licensed[0];
// Favor: the founding clan's strongest Early building; Ban: its weakest bannable Common.
function favPick(E) {
  const cards = clanCards(founder(E)).filter((c) => c.t === 'E' && c.id !== STARTERS[founder(E)]);
  return cards.sort((a, b) => rubric(b).pp - rubric(a).pp)[0];
}
function banPick(E) {
  const fav = favPick(E);
  const cards = clanCards(founder(E)).filter((c) => c.r === 'C' && c.id !== fav.id && X.canBan(E, c.id));
  return cards.sort((a, b) => rubric(a).pp - rubric(b).pp)[0];
}
// Blueprint: the cheapest Foundry offer for the founding clan.
function bpPick(E) {
  const total = (id) => Object.values(CARDS[id].cost).reduce((s, v) => s + v, 0);
  const offers = E.foundry.offers.slice().sort((a, b) => total(a) - total(b));
  return offers.find((id) => CARDS[id].cl === founder(E)) || offers[0] || null;
}

// The colony moves the tour walks through: the same search as the Hint button.
let rec = null;
function recMove(S) {
  const key = `${S.seed}:${S.turn}:${S.hand.join()}`;
  if (rec && rec.key === key) return rec;
  const m = bestMove(S, { look: 2, maxHexes: 30 });
  rec = { key, m };
  if (m) {
    const f = forecast(S, m.i, m.k, 2);
    const names = [...new Set(f.feed.filter((e) => e.c && e.pts > 0 && e.c !== m.cid).map((e) => CARDS[e.c].n))];
    rec.chain = names;
    rec.gain = f.gain;
    rec.soon = f.soon;
  }
  return rec;
}
function moveTarget(S, ctx) {
  const r = recMove(S);
  if (!r.m) return null;
  if (ctx.sel !== r.m.i) return $('card-' + r.m.i);
  if (sheetOpen()) return document.querySelector('#sheet-root .sh-actions .btn.primary');
  return document.querySelector(`.mapwrap g[data-k="${r.m.k}"]`);
}
function moveText(S, ctx, intro) {
  const r = recMove(S);
  if (!r.m) return 'No building fits right now: tap ⏭ Pass to end the turn.';
  const c = CARDS[r.m.cid];
  const what = r.chain.length
    ? `It sets off ${r.chain.join(', ')}: a combo worth about +${r.gain} this turn and +${r.soon} over three turns.`
    : r.gain > 0 ? `It scores about +${r.gain} now and +${r.soon} over three turns. Its trigger (${trigLabel(c)}) sets up later combos.`
      : `It scores little today, but its trigger (${trigLabel(c)}) primes the buildings you add next (about +${r.soon} over three turns).`;
  const how = ctx.sel !== r.m.i ? `Tap ${c.n} in your hand.` : 'Legal hexes are outlined; badges are 3-turn Influence forecasts and gold marks the best three. Tap the highlighted hex, check the expected chain, then press Build here.';
  return [intro, h('p', null, h('b', null, how), ' ', what), h('p', { class: 'faint' }, 'Prefer your own move? Go ahead: the tour continues after you build.')];
}

// ---------------------------------------------------------------- steps
const P = (...t) => h('p', null, ...t);
const STEPS = [
  {
    where: 'map', next: true, title: 'Welcome, Director',
    text: () => [P('Your expedition has one goal: climb this star chart and claim a ', h('b', null, 'Mythic Superplanet'), ' at the top before the frontier closes.'),
      P('Along the way you build colonies, recruit clans and grow a trade network that powers the final push. This tour shows where everything lives and how each piece moves you toward the Crown.')],
  },
  {
    where: 'map', tab: 'chart', next: true, title: 'The star chart',
    target: () => [$('here'), ...$$('reach')],
    text: () => [P('You start at the Arkship (white ring). ', h('b', null, 'Glowing worlds'), ' are your possible next jumps, and the chart only moves forward.'),
      P('Each world is a colony map. Meet its Influence targets and you claim it: resources ship home, clans join you and you get closer to the Veil.')],
  },
  {
    where: 'map', next: true, title: 'Frontier Pressure', target: () => $('pressure'),
    text: (E) => [P(`Every jump adds 1 Pressure (sideways detours 2, failed colonies +1). If it reaches ${E.maxPressure} before you reach the Crown, the expedition ends.`), P('That clock is why every colony should count.')],
  },
  {
    where: 'map', next: true, title: 'World resources', target: () => $('res'),
    text: () => [h('div', { class: 'coach-res' },
      [['MK', 'the common currency: trade it for anything on the Exchange'], ['CR', 'clan politics, the Foundry and lanes'], ['AL', 'supply lanes and fleet upgrades'], ['CY', 'jump fuel. Run dry and you get towed (+2 Pressure)'], ['GE', 'bio preparations and blueprints'], ['DA', 'research, diplomacy and surveys'], ['GS', 'bring 3 to the Veil to soften the finale']]
        .map(([r, d]) => h('div', null, h('b', null, `${WORLD[r].ic} ${WORLD[r].n}`), ` – ${d}.`))),
    h('p', { class: 'faint' }, 'Tap any chip later for a reminder.')],
  },
  {
    where: 'map', tab: 'net', next: true, title: 'The Exchange', target: () => $('ticker-CY'),
    text: () => [P('💠 Marks buy or sell any resource here. Prices move on every jump like a stock market; the line shows recent jumps.'),
      P('Each row grades today\'s price. ', h('b', { class: 'good' }, 'Sell: Great'), ' means sell now; ', h('b', { class: 'bad' }, 'Buy: Bad'), ' means you would overpay. Fair value shifts as you go deeper: fuel and data get dearer near the Veil.')],
  },
  {
    where: 'map', tab: 'net', next: true, title: 'Trade Strength', target: () => $('trade-strength'),
    text: () => [P('You always buy a little above and sell a little below the market. ', h('b', null, 'Trade Strength'), ' narrows that gap and pays a Marks dividend on every jump.'),
      P('Grow it by supplying worlds (Freeports and Relay Rocks count double), Free Trade Enclave charters, Trade Posts and Fleet Yard uplinks. Climb from Peddler to Market Sovereign.')],
  },
  {
    where: 'map', tab: 'net', next: true, title: 'Earning Marks', target: () => $('wire'),
    text: () => [P(`After every colony you earn ${X.MARKS_PER_INTEGRITY} 💠 per point of Integrity your base has left, so protecting a colony pays twice.`),
      P('The market wire announces news a jump before it moves prices: buy before a rise, sell before a fall.')],
  },
  {
    where: 'map', tab: 'net', next: true, title: 'Trade routes', target: () => $('forecast'),
    text: () => [P('Claimed colonies export resources on every jump once a lane links them to the Arkship or a Freeport. This forecast shows what arrives next jump.'),
      P('Lanes, lane upgrades and route crises are listed below. A strong network also feeds the Veil: it needs 8 throughput in one jump.')],
  },
  {
    where: 'map', tab: 'dir', next: true, title: 'Your clans', target: () => $('picks'),
    text: () => [P('Every building card comes from a clan in your treaty. You start with one and recruit up to two more at 🏛️ Clan Enclaves.'),
      P(h('b', null, 'Favor'), ' makes a card more likely to be drawn; ', h('b', null, 'Ban'), ' removes it from your draws. You get one free Favor and one free Ban now and after every planet.')],
  },
  {
    where: 'map', tab: 'dir', title: 'Favor a card',
    done: (E) => Object.keys(E.dir.fav).length > 0,
    prep: (E) => { const d = $('pool-' + founder(E)); if (d) d.open = true; },
    target: (E) => $('fav-' + favPick(E).id),
    text: (E) => { const c = favPick(E); return [P(`Favor `, h('b', null, c.n), `: it is one of ${CLANS[founder(E)].n}'s strongest early buildings (${rubric(c).pp} PP on the balance rubric), so you will see it twice as often.`), P(h('b', null, 'Tap Favor ×2 (free).'))]; },
  },
  {
    where: 'map', tab: 'dir', title: 'Ban a card',
    done: (E) => E.dir.ban.length > 0,
    prep: (E) => { const d = $('pool-' + founder(E)); if (d) d.open = true; },
    target: (E) => { const c = banPick(E); return c ? $('ban-' + c.id) : null; },
    text: (E) => { const c = banPick(E); return [P('Now ban ', h('b', null, c ? c.n : 'a weak card'), ': it is the weakest Common in the pool. Fewer weak draws means your good cards come up more often.'), P(h('b', null, 'Tap Ban (free).'))]; },
  },
  {
    where: 'map', tab: 'foundry', title: 'Craft a blueprint',
    // bp is undefined until the step is entered, null when there is nothing to craft.
    done: (E) => E.tut.bp === null || (!!E.tut.bp && Object.values(E.dir.extra).flat().includes(E.tut.bp)),
    enter: (E) => {
      E.tut.bp = bpPick(E);
      if (E.tut.bp) X.grant(E, X.blueprintCost(E, E.tut.bp), 'Tutorial gift');
      return true;
    },
    target: (E) => btnIn('bp-' + E.tut.bp),
    text: (E) => { const c = CARDS[E.tut.bp]; return [P('The Foundry crafts shop-only blueprints. Each one adds a new building to a clan\'s draws for the rest of the expedition.'), P(`Here is a gift of ${X.costText(c.cost)} to craft `, h('b', null, c.n), ` for ${CLANS[c.cl].n}. `, h('b', null, 'Tap Buy.'))]; },
  },
  {
    where: 'map', tab: 'fleet', title: 'Prepare for the next colony',
    done: (E) => E.preps.length > 0,
    enter: (E) => {
      const short = Object.fromEntries(Object.entries(X.PREPS.bulkhead.cost).filter(([r, n]) => E.res[r] < n).map(([r, n]) => [r, n - E.res[r]]));
      if (!Object.keys(short).length) return false;
      X.grant(E, short, 'Tutorial gift');
      return true;
    },
    target: () => btnIn('prep-bulkhead'),
    text: () => [P('Preparations are one-shot boosts for your next colony map.'),
      P('Buy the ', h('b', null, 'Bulkhead Drop'), `: +2 Integrity makes your first colony safer and pays ${2 * X.MARKS_PER_INTEGRITY} more 💠 if you keep it. `, h('b', null, 'Tap its price.'))],
  },
  {
    where: 'map', tab: 'fleet', next: true, title: 'The Fleet Yard', target: () => $('yard'),
    text: () => [P('Permanent upgrades for the whole expedition: a wider survey, bigger lanes, cheaper jumps, and the Market Uplink and Brokers\' Guild that raise Trade Strength.'), P('Come back when your purse is fuller.')],
  },
  {
    where: 'map', tab: 'goals', title: 'Accept a contract',
    done: (E) => !!E.contract || !E.contractOffers.length,
    target: (E) => btnIn('contract-' + E.contractOffers[0]),
    text: (E) => [P('Sector contracts are optional quests with big rewards. You carry one at a time, and new offers arrive in each sector.'),
      P('Accept ', h('b', null, X.CONTRACTS[E.contractOffers[0]].n), ' (or any other). ', h('b', null, 'Tap Accept.'))],
  },
  {
    where: 'map', tab: 'goals', next: true, title: 'Opening the Veil', target: () => $('veil'),
    text: () => [P('Your long-term checklist for the finale: 3 Gate Shards, 8 throughput in one jump and 3 CY for the final jump.'), P('Missing items make the last world harder, not impossible.')],
  },
  {
    where: 'map', tab: 'chart', title: 'Choose your first world',
    done: (E) => !!E.colony,
    target: () => (sheetOpen() ? null : $$('reach')),
    text: () => [P('Tap any glowing world to see its resources, mission length and trade rating, then press ', h('b', null, 'Jump & land'), '.'),
      P('🏛️ Enclaves recruit a second clan; Relay Rocks and Freeports build Trade Strength. Any choice is fine.')],
  },
  // ------------------------------------------------------------ first colony
  {
    where: 'colony', next: true, title: 'Your first colony',
    text: () => [P('This hex asteroid is your colony. Each turn you build one card from your hand. Buildings earn ', h('b', null, 'Influence'), ', the points you need to secure the world.'),
      P('Secure it and you claim it: pick a charter, ship resources home and move a step closer to the Crown.')],
  },
  {
    where: 'colony', next: true, title: 'Influence checkpoints', target: () => [$('influence'), $('checkpoint')],
    text: (E) => [P('The big number is your Influence. Every 5 turns you must reach the checkpoint target on this bar, counting only what you earned since the last one.'),
      P(`Missing one costs 3 Integrity. Missing the final one, on turn ${E.colony.turns}, fails the colony.`)],
  },
  {
    where: 'colony', next: true, title: 'Integrity', target: () => $('integrity'),
    text: () => [P('Your base\'s health. Meteors, tremors and missed checkpoints chip it away; at 0 the colony is lost.'),
      P(`Whatever is left when the map ends pays ${X.MARKS_PER_INTEGRITY} 💠 Marks per point on the Exchange.`)],
  },
  {
    where: 'colony', next: true, title: 'Turns and sunlight', target: () => [$('phase'), $('turns'), $('compass')],
    text: () => [P('The asteroid turns a quarter each turn: the compass shows where the sun is. Solar buildings fire on Sunlit hexes, Cryo buildings in Shadow.'),
      P('T1/21 counts the turns you have. Mid buildings unlock on turn 6, Advanced on turn 11.')],
  },
  {
    where: 'colony', next: true, title: 'Your hand', target: () => [$('hand'), $('clans')],
    text: () => [P('Each card is a building from one of your clans (the chips above). The blue label is its trigger: ', h('b', null, 'On Build'), ' fires once, ', h('b', null, 'Every N turns'), ' repeats, ', h('b', null, 'Reactive'), ' fires when something happens nearby.'),
      P('You draw 1 card per turn, +1 when your clans activate.')],
  },
  {
    where: 'colony', title: 'Move 1: build',
    enter: (E) => { E.tut.t0 = E.colony.turn; return false; },
    done: (E) => E.colony.turn > E.tut.t0,
    target: (E, ctx) => moveTarget(E.colony, ctx),
    text: (E, ctx) => moveText(E.colony, ctx, P('Time to build. The tour suggests the strongest move, just like the 💡 Hint button.')),
  },
  {
    where: 'colony', next: true, title: 'Scoring',
    target: () => document.querySelector('.turnsum:not([hidden])') || $('influence'),
    text: () => [P('Every activation adds Influence. The turn tally lists what scored and how far you are from the next checkpoint. Tap the tally to close it whenever you like.'), P('The 📜 Log keeps the full history.')],
  },
  {
    where: 'colony', next: true, title: 'Combos are the point',
    text: () => [P('Buildings react to each other. One makes Ore, a neighbour reacts to Ore being created, a third reacts to that, and a single placement sets off a whole chain.'),
      P('Place buildings so their triggers feed each other. Adjacent buildings form networks (🔗); tie them to the ★ Beacon for +1 on each one\'s first score per turn.')],
  },
  {
    where: 'colony', title: 'Move 2: combo',
    done: (E) => E.colony.turn > E.tut.t0 + 1,
    target: (E, ctx) => moveTarget(E.colony, ctx),
    text: (E, ctx) => moveText(E.colony, ctx, P('Look for a move whose trigger feeds what you already built.')),
  },
  {
    where: 'colony', title: 'Move 3: build the chain',
    done: (E) => E.colony.turn > E.tut.t0 + 2,
    target: (E, ctx) => moveTarget(E.colony, ctx),
    text: (E, ctx) => moveText(E.colony, ctx, P('Each building can fire twice per turn, so a dense cluster keeps paying.')),
  },
  {
    where: 'colony', next: true, title: 'Goals', target: () => $('goals'),
    text: () => [P('Checkpoints, charter stamps (bigger shipments when you claim this world), mega-projects (+12 and a lasting perk) and the event forecast all live here.')],
  },
  {
    where: 'colony', next: true, last: true, title: 'Stuck? Ask for a hint', target: () => $('hint'),
    text: () => [P('💡 Hint highlights a strong move at any time, like the ones you just made. You can also tap a Rock hex to excavate it, or a building to demolish it, instead of building.'),
      P('That\'s the tour. Secure this world!')],
  },
];

// ---------------------------------------------------------------- coach marks
let coach = null; // { root, raf, key }
export function clearCoach() {
  if (!coach) return;
  cancelAnimationFrame(coach.raf);
  coach.root.remove();
  coach = null;
}

function finish(E, ctx, skipped) {
  E.tut = null;
  ctx.save();
  clearCoach();
  toast(skipped ? 'Tutorial skipped – ❓ How to play has the rules' : 'Tutorial complete – ❓ How to play has the full rules');
}

export const tutorialMap = (E, ctx) => apply(E, ctx, 'map');
export const tutorialColony = (E, ctx) => apply(E, ctx, 'colony');

function apply(E, ctx, where) {
  if (!E.tut) return clearCoach();
  // Landing on a colony before the chart tour ended skips the rest of it.
  if (where === 'colony' && STEPS[E.tut.step].where === 'map') E.tut.step = STEPS.findIndex((st) => st.where === 'colony');
  let st = STEPS[E.tut.step];
  while (st && st.where === where && st.done && st.done(E, ctx)) {
    E.tut.step++;
    ctx.save();
    st = STEPS[E.tut.step];
  }
  if (!st) return finish(E, ctx, false);
  if (st.where !== where) return clearCoach();
  if (E.tut.entered !== E.tut.step) {
    E.tut.entered = E.tut.step;
    // A step that changes the purse re-renders; the new render applies it again.
    if (st.enter && st.enter(E, ctx)) return ctx.refresh();
    ctx.save();
  }
  if (st.tab && ctx.tab !== st.tab) {
    return show(E, ctx, where, {
      key: `go-${E.tut.step}`, title: `Next: the ${TAB_NAMES[st.tab]} tab`,
      text: () => [P(`Tap ${TAB_NAMES[st.tab]} below to continue the tour.`)], target: () => $('tab-' + st.tab),
    });
  }
  if (st.prep) st.prep(E, ctx);
  show(E, ctx, where, { ...st, key: String(E.tut.step) });
}

function show(E, ctx, where, st) {
  const fresh = !coach || coach.key !== st.key;
  clearCoach();
  const total = STEPS.length;
  const idx = E.tut.step + 1;
  const ring = h('div', { class: 'coach-ring' + (st.next ? ' block' : '') });
  const next = () => {
    if (st.last) return finish(E, ctx, false);
    E.tut.step++;
    ctx.save();
    apply(E, ctx, where);
  };
  const bubble = h('div', { class: 'coach-bubble' + (fresh ? ' enter' : ''), role: 'dialog', 'aria-label': st.title },
    h('div', { class: 'coach-meta' }, `Tutorial · ${idx} of ${total}`),
    h('h4', null, st.title),
    h('div', { class: 'coach-text' }, st.text(E, ctx)),
    h('div', { class: 'row', style: { marginTop: '10px' } },
      h('button', { class: 'coach-skip', onclick: () => finish(E, ctx, true) }, 'Skip tutorial'),
      h('span', { class: 'grow' }),
      st.next ? h('button', { class: 'btn small primary', onclick: next }, st.last ? 'Finish' : 'Next') : null));
  const root = h('div', { class: 'coach' }, st.next ? h('div', { class: 'coach-block' }) : null, ring, bubble);
  document.body.append(root);
  coach = { root, key: st.key, raf: 0, revealed: false };
  const frame = () => {
    if (!coach || coach.root !== root) return;
    place(st, E, ctx, ring, bubble);
    coach.raf = requestAnimationFrame(frame);
  };
  frame();
}

// Ring the target (several elements ring their union) and park the bubble beside it.
function place(st, E, ctx, ring, bubble) {
  let els = st.target ? st.target(E, ctx) : null;
  els = (Array.isArray(els) ? els : [els]).filter((el) => el && el.isConnected);
  // A target hidden under an open sheet is not ringed.
  const sh = sheetOpen();
  if (sh) els = els.filter((el) => sh.contains(el));
  const rects = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width || r.height);
  const pad = 6, M = 10;
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  if (!rects.length) {
    ring.style.display = st.next ? 'block' : 'none';
    Object.assign(ring.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
    bubble.style.left = Math.max(M, (innerWidth - bw) / 2) + 'px';
    bubble.style.top = (sh ? M : Math.max(M, (innerHeight - bh) / 2)) + 'px';
    return;
  }
  if (!coach.revealed) { coach.revealed = true; reveal(els[0]); }
  const r = {
    left: Math.min(...rects.map((x) => x.left)) - pad, top: Math.min(...rects.map((x) => x.top)) - pad,
    right: Math.max(...rects.map((x) => x.right)) + pad, bottom: Math.max(...rects.map((x) => x.bottom)) + pad,
  };
  ring.style.display = 'block';
  Object.assign(ring.style, { left: r.left + 'px', top: r.top + 'px', width: r.right - r.left + 'px', height: r.bottom - r.top + 'px' });
  let y;
  if (r.bottom + M + bh < innerHeight) y = r.bottom + M;
  else if (r.top - M - bh > 0) y = r.top - M - bh;
  else y = (r.top + r.bottom) / 2 > innerHeight / 2 ? M : innerHeight - bh - M;
  const cx = (r.left + r.right) / 2;
  bubble.style.left = Math.max(M, Math.min(innerWidth - bw - M, cx - bw / 2)) + 'px';
  bubble.style.top = Math.max(M, y) + 'px';
}

// Scroll a target into view inside its own scroller (the page never scrolls).
function reveal(el) {
  const box = el.closest('.page, .chartwrap, .sh-body');
  if (box) {
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.top < b.top + 40 || r.bottom > b.bottom - 120) box.scrollTop += r.top - b.top - b.height / 3;
  }
  const hand = el.closest('.hand');
  if (hand) {
    const r = el.getBoundingClientRect(), b = hand.getBoundingClientRect();
    if (r.left < b.left || r.right > b.right) hand.scrollLeft += r.left - b.left - 10;
  }
}
