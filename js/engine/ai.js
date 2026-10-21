// Greedy bot with a short lookahead. Used by the balance simulator and the
// in-game "Suggest" button. It tries every card in hand on (a sample of)
// legal hexes, simulates this turn plus `look` quiet turns, and keeps the
// placement with the best Influence gain (Integrity losses are penalized).
import { legalHexes, forecast, abilityState, abilityTargets, useAbility, clone, bldList, passTurn } from './colony.js';

export function bestMove(S, opt = {}) {
  const look = opt.look ?? 2;
  let best = null;
  for (let i = 0; i < S.hand.length; i++) {
    const cid = S.hand[i];
    if (S.hand.indexOf(cid) !== i) continue; // duplicate card in hand
    const keys = legalHexes(S, cid);
    const sample = opt.maxHexes && keys.length > opt.maxHexes ? keys.filter((_, j) => j % Math.ceil(keys.length / opt.maxHexes) === 0) : keys;
    for (const k of sample) {
      const f = forecast(S, i, k);
      let v = f.gain + f.integrity * 8;
      if (look) {
        const c = f.state;
        const base = c.influence;
        const integ = c.integrity;
        for (let t = 0; t < look && c.status === 'play'; t++) passTurn(c);
        v += 0.8 * (c.influence - base) + (c.integrity - integ) * 6;
      }
      if (!best || v > best.v) best = { v, i, k, cid, gain: f.gain };
    }
  }
  return best;
}

export function tryAbilities(S) {
  for (const b of bldList(S)) {
    const st = abilityState(S, b);
    if (!st || !st.ok) continue;
    const targets = st.ab.target ? abilityTargets(S, b) : [null];
    let best = null;
    for (const k of targets) {
      const c = clone(S);
      const before = c.influence;
      useAbility(c, b.id, k);
      const g = c.influence - before + (c.integrity - S.integrity) * 6;
      if (!best || g > best.g) best = { g, k };
    }
    if (best && best.g >= 10) useAbility(S, b.id, best.k);
  }
}
