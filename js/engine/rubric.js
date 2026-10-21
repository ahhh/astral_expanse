// Power-Point (PP) rubric. Every card is scored on one scale:
//
//   PP = once + acts × (p × rel + u) + reactive + passive + ability − cost
//
//   horizon H     expected turns on the board when drawn: Early 12, Mid 9, Advanced 6
//   acts          expected periodic activations over H, from the trigger:
//                 turn H · every N → H/N · sunlit/shadow H/2 · sunlit2 H/4
//                 (capped by `max` for finite-resource cards)
//   p             Influence per activation (defaults to the card's `pts`)
//   rel           reliability 0–1: share of activations that find a valid target
//   u             utility per activation in Influence-equivalents (table below)
//   once          one-time value of On Build effects (points + utility)
//   react         reactive listener: p × rate × H (rate = expected triggers/turn)
//   passive       auras/passives: (p + u) × rate × H
//   ability       once-per-era abilities: ≈ ceil(H/5) uses × (p + u)
//   cost          drawbacks: Integrity −1 ≈ 3 PP, self-Radiation ≈ 1 PP
//
// Utility table (Influence-equivalent):
//   create a loose resource token 2 · enabling transform 1 · reveal 1.5
//   new Cavern space 2 · stabilize/shield a hex 1 · repeat another building ≈ 5
//   extra card draw 3 · one Integrity 3
export const HORIZON = { E: 12, M: 9, A: 6 };
export const BANDS = {
  C: { min: 15, max: 26, target: 20 },
  U: { min: 24, max: 34, target: 29 },
  R: { min: 33, max: 46, target: 39 },
};

export function actsFor(c, H) {
  switch (c.trig) {
    case 'turn': return H;
    case 'every': return H / c.every;
    case 'sunlit': case 'shadow': return H / 2;
    case 'sunlit2': return H / 4;
    default: return c.run ? H / (c.every || 1) : 0;
  }
}

export function rubric(c) {
  const rb = c.rb || {};
  const H = HORIZON[c.t];
  const parts = {};
  parts.once = rb.once || 0;
  let acts = c.run ? actsFor(c, H) : 0;
  if (rb.max != null) acts = Math.min(acts, rb.max);
  const p = rb.p != null ? rb.p : c.run ? c.pts || 0 : 0;
  const rel = rb.rel != null ? rb.rel : 1;
  parts.periodic = c.run ? acts * (p * rel + (rb.u || 0)) : 0;
  parts.react = rb.react ? rb.react.p * rb.react.rate * H + (c.run ? 0 : (rb.u || 0) * rb.react.rate * H) : 0;
  if (rb.react && rb.u2) parts.react += rb.u2 * rb.react.rate * H;
  parts.passive = rb.passive ? (rb.passive.p + (rb.passive.u || 0)) * rb.passive.rate * H : 0;
  parts.ability = rb.ability ? Math.ceil(H / 5) * (rb.ability.p + (rb.ability.u || 0)) : 0;
  parts.cost = -(rb.cost || 0);
  const pp = Object.values(parts).reduce((s, v) => s + v, 0);
  const band = BANDS[c.r];
  return { pp: Math.round(pp * 10) / 10, parts, H, acts, band, ok: pp >= band.min && pp <= band.max };
}
