// Plays whole expeditions with the bot to check the overworld loop end to end.
import * as X from '../js/engine/expedition.js';
import { playCard, passTurn } from '../js/engine/colony.js';
import { bestMove, tryAbilities } from '../js/engine/ai.js';
import { CLAN_IDS } from '../js/engine/cards.js';

const runs = Number(process.argv[2] || 3);
let wins = 0;
for (let r = 0; r < runs; r++) {
  const clans = [CLAN_IDS[r % 9], CLAN_IDS[(r + 3) % 9], CLAN_IDS[(r + 5) % 9]];
  const E = X.newExpedition(4242 + r, clans);
  let guard = 0;
  while (E.status === 'active' && guard++ < 40) {
    const opts = X.reachable(E);
    if (!opts.length) { console.log('stuck at', X.node(E, E.at).name); break; }
    // Prefer shrines, then claimed-yield-friendly nodes; avoid laterals late.
    const pickE = opts.sort((a, b) => (X.node(E, b.to).type === 'shrine') - (X.node(E, a.to).type === 'shrine') || (a.lateral ? 1 : 0) - (b.lateral ? 1 : 0))[0];
    X.travel(E, pickE.to, { bench: E.clans[2] });
    if (!E.colony) continue;
    const S = E.colony;
    let g2 = 0;
    while (S.status === 'play' && g2++ < 40) { tryAbilities(S); const m = bestMove(S, { maxHexes: 18, look: 1 }); if (m) playCard(S, m.i, m.k); else passTurn(S); }
    const n = X.node(E, E.mission.node);
    const ch = S.status === 'won' && n.type !== 'boss' ? X.charterOptions(E).sort((a, b) => b.claim - a.claim)[0] : null;
    console.log(`  ${n.type.padEnd(11)} ${n.name.padEnd(18)} ${S.status.padEnd(6)} inf ${String(S.influence).padStart(4)}/${S.checkpoints.at(-1).need} ${ch ? ch.n + ' +' + ch.claim + ch.pri : ''}`);
    X.resolveMission(E, ch && ch.fam);
    if (n.state === 'claimed' && X.canConnect(E, n)) X.connect(E, n.id);
  }
  if (E.status === 'won') wins++;
  console.log(`Run ${r} [${clans}] → ${E.status} ${E.ending || ''} (${E.endReason}) pressure ${E.pressure} claimed ${E.claimed} res ${JSON.stringify(E.res)}`);
}
console.log(`${wins}/${runs} expeditions won`);
