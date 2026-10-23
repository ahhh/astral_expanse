// Plays whole expeditions with the bot to check the overworld loop end to end:
// a single starting clan, enclaves, lanes, crises, compacts, contracts, the
// Foundry, the Fleet Yard, the Exchange, the Veil's supply tokens and one Endless round.
//
//   node tools/expedition-smoke.mjs [runs=3] [difficulty=standard]
import * as X from '../js/engine/expedition.js';
import { playCard, chooseTech } from '../js/engine/colony.js';
import { bestMove, tryAbilities, idleTurn } from '../js/engine/ai.js';
import { CLAN_IDS } from '../js/engine/cards.js';

const runs = Number(process.argv[2] || 3);
const difficulty = process.argv[3] || 'standard';
let wins = 0;

function playColony(S) {
  let g = 0;
  while (S.status === 'play' && g++ < 40) {
    if (S.techOffer) chooseTech(S, S.techOffer[0]);
    tryAbilities(S);
    const m = bestMove(S, { maxHexes: 18, look: 1 });
    if (m) playCard(S, m.i, m.k); else idleTurn(S);
  }
}

function spend(E) {
  if (E.pendingCompact) X.chooseCompact(E, 'industrial');
  if (!E.contract && E.contractOffers.length) X.acceptContract(E, E.contractOffers[0]);
  for (const c of X.openCrises(E)) X.resolveCrisis(E, c.id);
  // Lanes: connect every network node to the cheapest supplied neighbour, then one extra for rings.
  for (const n of E.chart.nodes) if (X.canConnect(E, n) && X.canAfford(E, X.laneCost(E, n))) X.connect(E, n.id);
  for (const n of E.chart.nodes) {
    if (!n.connected || n.type === 'ark') continue;
    const o = X.laneOptions(E, n.id).find((x) => x.cls <= 2 && X.canAfford(E, x.cost));
    if (o && E.res.AL > 8) X.buildLane(E, n.id, o.to);
  }
  const bp = E.foundry.offers.find((id) => E.clans.includes(id.cl) || true);
  if (bp && X.canAfford(E, X.blueprintCost(E, bp)) && E.res.CR > 8) X.buyBlueprint(E, bp);
  for (const f of ['keel', 'mast', 'tug']) if (!E.fleet[f] && X.canAfford(E, X.FLEET[f].cost) && E.res.AL > 9) X.buyFleet(E, f);
  for (const cl of E.clans) { const c = X.enhCost(E, cl); if (c && X.canAfford(E, c) && E.res.CR > 7) X.enhance(E, cl); }
  for (const n of E.chart.nodes) if (n.state === 'stranded' && n.type !== 'boss' && X.canAfford(E, X.rescueCost(E)) && E.res.AL > 6) X.rescue(E, n.id);
  // Exchange: sell surplus into good prices, keep jump fuel topped up, invest in Trade Strength.
  for (const r of X.COMMODITIES) if (E.res[r] > 10 && ['good', 'great'].includes(X.priceAdvice(E, r).sell)) X.sell(E, r, E.res[r] - 10);
  if (E.res.CY < 4) X.buy(E, 'CY', 4 - E.res.CY);
  for (const f of ['uplink', 'guild']) if (!E.fleet[f] && X.canAfford(E, X.FLEET[f].cost) && E.res.MK > X.FLEET[f].cost.MK + 15) X.buyFleet(E, f);
  for (const n of E.chart.nodes) { const c = n.connected && X.isNetNode(n) && X.postCost(E, n); if (c && E.res.MK > c.MK + 20 && X.canAfford(E, c)) X.buildPost(E, n.id); }
}

for (let r = 0; r < runs; r++) {
  const E = X.newExpedition(4242 + r, [CLAN_IDS[r % 9]], { difficulty });
  let guard = 0, endless = false;
  while (E.status !== 'lost' && guard++ < 70) {
    if (E.status === 'won') {
      if (endless) break;
      endless = true;
      X.enterEndless(E);
      console.log('  → Endless Frontier');
    }
    spend(E);
    const opts = X.reachable(E);
    if (!opts.length) { console.log('stuck at', X.node(E, E.at).name); break; }
    const score = (e) => { const t = X.node(E, e.to).type; return (t === 'enclave' && E.clans.length < 3 ? 3 : 0) + (t === 'shrine' ? 2 : 0) - (e.lateral ? 1 : 0); };
    const pickE = opts.sort((a, b) => score(b) - score(a))[0];
    const tgt = X.node(E, pickE.to);
    const supply = tgt.type === 'boss' ? Object.keys(X.SUPPLY).filter((s) => X.canAfford(E, X.SUPPLY[s].cost)).slice(0, X.supplyTokens(E)) : [];
    X.travel(E, pickE.to, { bench: E.clans[E.clans.length - 1], supply });
    if (!E.colony) continue;
    const S = E.colony;
    playColony(S);
    const n = X.node(E, E.mission.node);
    const ch = S.status === 'won' && n.type !== 'boss' ? X.charterOptions(E).sort((a, b) => b.claim - a.claim)[0] : null;
    console.log(`  ${n.type.padEnd(11)} ${n.name.padEnd(20)} [${S.clans.join(',')}] ${S.status.padEnd(6)} inf ${String(S.influence).padStart(4)}/${S.checkpoints.at(-1).need} mega ${Object.keys(S.mega).length} tech ${S.techs.length} ${ch ? ch.n + ' +' + ch.claim + ch.pri : ''}`);
    X.resolveMission(E, ch && ch.fam);
  }
  if (E.wonOnce) wins++;
  console.log(`Run ${r} → ${E.status} ${E.ending || ''} (${E.endReason}) clans ${E.clans} pressure ${E.pressure}/${E.maxPressure} claimed ${E.claimed} lanes ${E.lanes.length} compacts ${E.compacts.length} contracts ${E.contractsDone.length} trade ${X.tradeStrength(E).total} (${X.tradeStrength(E).tier}) peak ${E.peakThroughput} res ${JSON.stringify(E.res)}`);
}
console.log(`${wins}/${runs} expeditions won`);
