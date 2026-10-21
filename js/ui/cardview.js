import { h } from './dom.js';
import { CARDS, CLANS, RARITY, TIER, TRIG } from '../engine/cards.js';
import { rubric } from '../engine/rubric.js';
import { MEASURED } from '../engine/measured.js';

export function trigLabel(c) {
  if (c.trig === 'every') return `Every ${c.every} turns`;
  return TRIG[c.trig] || c.trig;
}
export function clanColor(cl) {
  return cl === 'neutral' ? '#cfd8e3' : CLANS[cl].col;
}
export function abbr(c) {
  const w = c.n.replace(/[^A-Za-z\- ]/g, '').split(/[\s-]+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
}

export function cardEl(cid, opts = {}) {
  const c = CARDS[cid];
  const cl = CLANS[c.cl] || { n: 'Neutral', ic: '★' };
  return h('button', {
    class: 'card' + (opts.sel ? ' sel' : '') + (opts.big ? ' big' : ''),
    '--cc': clanColor(c.cl),
    onclick: opts.onclick,
    'aria-label': c.n,
  },
  h('div', { class: 'band' }, cl.ic, ' ', cl.s || cl.n, h('span', { class: 'gem', style: { background: RARITY[c.r].col }, title: RARITY[c.r].n })),
  h('div', { class: 'nm' }, c.n),
  h('div', { class: 'meta' }, `${TIER[c.t]} · `, h('span', { class: 'pill-' + c.r }, RARITY[c.r].n), ` · ${trigLabel(c)}`),
  h('div', { style: { padding: '2px 6px 0' } }, c.tags.map((t) => h('span', { class: 'tag' }, t))),
  h('div', { class: 'tx' }, c.text),
  opts.big && c.cl !== 'neutral' ? h('div', { class: 'meta', style: { padding: '6px 6px 8px' } }, `Rubric power `, h('b', { class: 'pp pill-' + c.r }, rubric(c).pp), ` PP · measured ${MEASURED[c.id] ?? '–'} PP`) : null,
  h('div', { class: 'rar', style: { background: RARITY[c.r].col } }));
}
