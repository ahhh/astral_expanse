// Prints every card's rubric Power Points and flags cards outside their rarity band.
import { CARD_LIST, CLANS } from '../js/engine/cards.js';
import { rubric, BANDS } from '../js/engine/rubric.js';

let bad = 0;
const byClan = {};
for (const c of CARD_LIST) {
  const r = rubric(c);
  (byClan[c.cl] = byClan[c.cl] || []).push([c, r]);
  if (!r.ok) bad++;
}
for (const [cl, rows] of Object.entries(byClan)) {
  const tot = rows.reduce((s, [, r]) => s + r.pp, 0);
  const cnt = { C: 0, U: 0, R: 0 };
  rows.forEach(([c]) => cnt[c.r]++);
  console.log(`\n${CLANS[cl].n}  total PP ${tot.toFixed(1)}  (${cnt.C}C/${cnt.U}U/${cnt.R}R)`);
  for (const [c, r] of rows) {
    const flag = r.ok ? '' : `  <-- outside ${BANDS[c.r].min}-${BANDS[c.r].max}`;
    console.log(`  ${c.t} ${c.r} ${c.n.padEnd(24)} ${String(r.pp).padStart(5)}${flag}`);
  }
}
console.log(`\n${bad} card(s) outside band`);
