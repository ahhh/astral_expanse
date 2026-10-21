// Calibrates the rubric's reliability/trigger-rate assumptions from a
// simulator run, so each card's rubric PP tracks its measured power.
// Only reliability-type inputs are scaled (rel, react.rate, passive.rate,
// ability uses); points, utilities and costs stay as designed.
//
//   node tools/sim.mjs 6 --json sim.json && node tools/calibrate.mjs sim.json
import { readFileSync, writeFileSync } from 'node:fs';
import { CARDS } from '../js/engine/cards.js';
import { rubric } from '../js/engine/rubric.js';

const sim = JSON.parse(readFileSync(process.argv[2]));
const file = new URL('../js/engine/cards.js', import.meta.url);
let src = readFileSync(file, 'utf8');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2 = (v) => Math.round(v * 100) / 100;
let changed = 0;
for (const row of sim.rows) {
  if (row.placed < 8) continue;
  const c = CARDS[row.id];
  const rb = c.rb;
  const parts = rubric(c).parts;
  const scalable = (parts.periodic || 0) + (parts.react || 0) + (parts.passive || 0) + (parts.ability || 0);
  if (scalable <= 0) continue;
  const fixed = rubric(c).pp - scalable;
  // Solve fixed + f·scalable = observed for the reliability multiplier f.
  // Damped: move 60% of the way to the measured value to absorb sim noise.
  const f = 1 + 0.6 * (clamp((row.obs - fixed) / scalable, 0.6, 1.6) - 1);
  if (Math.abs(f - 1) < 0.04) continue;
  if (parts.periodic) rb.rel = r2(clamp((rb.rel ?? 1) * f, 0.15, 1.5));
  if (rb.react) rb.react.rate = r2(clamp(rb.react.rate * f, 0.03, 2));
  if (rb.passive) rb.passive.rate = r2(clamp(rb.passive.rate * f, 0.05, 2));
  if (rb.ability) rb.ability.p = r2(rb.ability.p * f);
  // Rewrite this card's rb literal.
  const i = src.indexOf(`id: '${c.id}'`);
  const s = src.indexOf('rb: {', i);
  let depth = 0, e = s + 4;
  for (; e < src.length; e++) { if (src[e] === '{') depth++; if (src[e] === '}' && --depth === 0) break; }
  const why = rb.why;
  const body = Object.entries(rb).filter(([k]) => k !== 'why').map(([k, v]) => `${k}: ${typeof v === 'object' ? '{ ' + Object.entries(v).map(([a, b]) => `${a}: ${b}`).join(', ') + ' }' : v}`).join(', ');
  src = src.slice(0, s) + `rb: { ${body}, why: ${why.includes("'") ? JSON.stringify(why) : `'${why}'`} }` + src.slice(e + 1);
  changed++;
}
writeFileSync(file, src);
console.log(`calibrated ${changed} cards`);
