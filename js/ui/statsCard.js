// Shareable stats card: the lifetime record drawn over rank art on a canvas,
// offered as a PNG to save or share. Higher ranks get richer frames and effects.
import { h, sheet, toast } from './dom.js';
import { CLANS, CLAN_IDS } from '../engine/cards.js';
import { DIFFICULTY } from '../engine/expedition.js';
import { RANKS, rankOf, DIFF_ORDER, ENDINGS, favoriteClan } from './progress.js';

export const W = 1080, H = 1620;
const HEAD = '"Chakra Petch", "Segoe UI", sans-serif';
const BODY = 'Inter, system-ui, sans-serif';
const DIFF_COL = { explorer: '#7ff0c8', standard: '#6ee7ff', veteran: '#ffb347', nightmare: '#ff4fd8' };
const PRISM = ['#ff6bd5', '#8b5cff', '#6ee7ff', '#ffe08a', '#ff6bd5'];
const SITE = 'expanse.lockboxx.org';

const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function grad(g, x0, y0, x1, y1, cols) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c));
  return gr;
}
function text(g, str, x, y, { font, fill = '#e7ecf6', align = 'center', spacing = 0, alpha = 1, glow = null, blur = 0, maxW = 0 }) {
  g.save();
  g.font = font;
  g.textAlign = align;
  g.globalAlpha = alpha;
  if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
  if (maxW) {
    const w = g.measureText(str).width;
    if (w > maxW) g.font = font.replace(/(\d+)px/, (_, n) => Math.floor((n * maxW) / w) + 'px');
  }
  if (glow) { g.shadowColor = glow; g.shadowBlur = blur; }
  g.fillStyle = fill;
  g.fillText(str, x, y);
  g.restore();
}
function sparkle(g, x, y, r, col) {
  g.save();
  g.fillStyle = col;
  g.shadowColor = col;
  g.shadowBlur = r * 3;
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
  g.restore();
}

function frame(g, tier, R) {
  const i = 26;
  g.save();
  if (tier === 0) {
    g.strokeStyle = 'rgba(169,184,204,.35)';
    g.lineWidth = 2;
    g.beginPath(); g.roundRect(i, i, W - 2 * i, H - 2 * i, 30); g.stroke();
    return g.restore();
  }
  const cols = tier === 4 ? PRISM : [R.a, R.b, R.a, R.b];
  g.strokeStyle = grad(g, 0, 0, W, H, cols);
  g.shadowColor = R.b;
  g.shadowBlur = tier >= 3 ? 32 : 14;
  g.lineWidth = tier >= 3 ? 6 : 4;
  g.beginPath(); g.roundRect(i, i, W - 2 * i, H - 2 * i, 34); g.stroke();
  g.shadowBlur = 0;
  if (tier >= 3) {
    g.globalAlpha = 0.55;
    g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(i + 14, i + 14, W - 2 * i - 28, H - 2 * i - 28, 24); g.stroke();
    g.globalAlpha = 1;
  }
  if (tier >= 2) {
    // Corner brackets.
    const L = 80, o = i + 8;
    g.lineWidth = 8;
    g.lineCap = 'round';
    for (const [x, y, dx, dy] of [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + dy * L); g.lineTo(x, y); g.lineTo(x + dx * L, y); g.stroke();
    }
  }
  g.restore();
}

// Draws the card for `m` (normalized meta) onto `canvas` and returns it.
export async function renderStatsCard(m, canvas = document.createElement('canvas')) {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const tier = rankOf(m), R = RANKS[tier];
  await Promise.all([`700 40px "Chakra Petch"`, '600 20px Inter', '700 20px Inter'].map((f) => document.fonts.load(f))).catch(() => {});
  const fav = favoriteClan(m);
  const art = (id) => loadImg(new URL(`../../art/victory/${id}.webp`, import.meta.url).href);
  const img = (fav && (await art('clan/' + fav))) || (await art(R.id));

  g.fillStyle = '#05070e';
  g.fillRect(0, 0, W, H);
  if (img) {
    const s = Math.max(W / img.width, H / img.height);
    g.drawImage(img, (W - img.width * s) / 2, 0, img.width * s, img.height * s);
  }
  g.fillStyle = grad(g, 0, 0, 0, H, ['rgba(5,7,14,.6)', 'rgba(5,7,14,0)', 'rgba(5,7,14,0)', 'rgba(5,7,14,.85)', 'rgba(5,7,14,.96)']);
  g.fillRect(0, 0, W, H);
  if (tier >= 2) {
    const rg = g.createRadialGradient(W / 2, 940, 40, W / 2, 940, 620);
    rg.addColorStop(0, rgba(R.b, 0.1 + 0.06 * tier));
    rg.addColorStop(1, rgba(R.b, 0));
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
  }
  if (tier >= 3) {
    // Deterministic scatter of glints; the Sovereign card gets a prismatic storm.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < (tier === 4 ? 46 : 18); n++) {
      const col = tier === 4 ? PRISM[n % 4] : R.a;
      sparkle(g, 50 + rnd() * (W - 100), 170 + rnd() * 600, 3 + rnd() * (tier === 4 ? 10 : 6), col);
    }
  }
  frame(g, tier, R);

  // Header.
  text(g, 'ASTRAL EXPANSE', W / 2, 104, { font: `700 46px ${HEAD}`, spacing: 10, glow: '#000', blur: 18 });
  text(g, "THE FAR TRADE · CAPTAIN'S RECORD", W / 2, 140, { font: `600 18px ${BODY}`, spacing: 6, fill: R.a, glow: '#000', blur: 12 });

  // Rank.
  if (m.name) text(g, m.name.toUpperCase(), W / 2, 846, { font: `700 30px ${BODY}`, spacing: 6, fill: R.a, glow: '#000', blur: 14, maxW: 900 });
  const rankFill = tier === 4 ? grad(g, 140, 0, W - 140, 0, PRISM) : grad(g, 0, 880, 0, 960, [R.a, R.b]);
  text(g, R.n.toUpperCase(), W / 2, 958, { font: `700 112px ${HEAD}`, spacing: 4, fill: rankFill, glow: tier ? R.b : '#000', blur: 10 + tier * 9, maxW: 940 });
  text(g, fav ? `${R.sub} · ${CLANS[fav].ic} ${CLANS[fav].n}` : R.sub, W / 2, 1004, { font: `500 26px ${BODY}`, fill: '#c9d2e3', maxW: 940 });

  // Difficulty medallions.
  DIFF_ORDER.forEach((d, i) => {
    const x = W / 2 + (i - 1.5) * 200, y = 1080, won = m.cleared[d] || 0, col = DIFF_COL[d];
    g.save();
    g.beginPath(); g.arc(x, y, 40, 0, Math.PI * 2);
    g.fillStyle = won ? rgba(col, 0.18) : 'rgba(255,255,255,.04)';
    g.fill();
    g.lineWidth = won ? 4 : 2;
    g.strokeStyle = won ? col : 'rgba(255,255,255,.16)';
    if (won) { g.shadowColor = col; g.shadowBlur = 18; }
    g.stroke();
    g.restore();
    text(g, DIFFICULTY[d].ic, x, y + 14, { font: `38px ${BODY}`, alpha: won ? 1 : 0.22 });
    text(g, DIFFICULTY[d].n.toUpperCase() + (won > 1 ? ` ×${won}` : ''), x, y + 70, { font: `700 17px ${BODY}`, spacing: 2, fill: won ? col : '#5d6984' });
  });

  // Stats panel.
  const px = 70, py = 1180, pw = W - 140, ph = 210;
  g.save();
  g.fillStyle = 'rgba(10,14,26,.62)';
  g.strokeStyle = rgba(R.a, 0.28);
  g.lineWidth = 2;
  g.beginPath(); g.roundRect(px, py, pw, ph, 22); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.08)';
  g.beginPath();
  g.moveTo(px + 24, py + ph / 2); g.lineTo(px + pw - 24, py + ph / 2);
  for (const c of [1, 2]) { g.moveTo(px + (pw / 3) * c, py + 18); g.lineTo(px + (pw / 3) * c, py + ph - 18); }
  g.stroke();
  g.restore();
  const stats = [
    [m.wins, 'Victories'], [m.runs, 'Expeditions'], [m.best.claimed, 'Most worlds claimed'],
    [m.bestColony, 'Best colony'], [m.best.total, 'Best total Influence'], [m.best.throughput, 'Peak throughput'],
  ];
  stats.forEach(([v, label], i) => {
    const x = px + (pw / 3) * (i % 3 + 0.5), y = py + (i < 3 ? 0 : ph / 2);
    text(g, String(v || 0), x, y + 64, { font: `700 54px ${HEAD}`, fill: v ? '#ffffff' : '#5d6984' });
    text(g, label.toUpperCase(), x, y + 92, { font: `600 15px ${BODY}`, spacing: 2, fill: '#94a0b8', maxW: pw / 3 - 24 });
  });

  // Clans with a victory.
  CLAN_IDS.forEach((c, i) => {
    const x = W / 2 + (i - (CLAN_IDS.length - 1) / 2) * 96, won = m.clanWins[c];
    text(g, CLANS[c].ic, x, 1458, { font: `38px ${BODY}`, alpha: won ? 1 : 0.2, glow: won ? CLANS[c].col : null, blur: won ? 16 : 0 });
  });

  // Endings discovered.
  g.save();
  g.font = `700 17px ${BODY}`;
  if ('letterSpacing' in g) g.letterSpacing = '2px';
  const labels = ENDINGS.map((e) => (m.endings[e] ? e.toUpperCase() : '? ? ?'));
  const widths = labels.map((l) => g.measureText(l).width + 40);
  let x = (W - widths.reduce((a, b) => a + b, 0) - 16 * (labels.length - 1)) / 2;
  g.restore();
  labels.forEach((l, i) => {
    const on = m.endings[ENDINGS[i]];
    g.save();
    g.beginPath(); g.roundRect(x, 1484, widths[i], 40, 20);
    g.fillStyle = on ? rgba(R.b, 0.22) : 'rgba(255,255,255,.04)';
    g.strokeStyle = on ? R.a : 'rgba(255,255,255,.14)';
    g.lineWidth = 2;
    g.fill(); g.stroke();
    g.restore();
    text(g, l, x + widths[i] / 2, 1510, { font: `700 17px ${BODY}`, spacing: 2, fill: on ? '#ffffff' : '#5d6984' });
    x += widths[i] + 16;
  });

  // Footer.
  const lw = m.lastWin;
  const foot = lw ? `Latest victory · ${DIFFICULTY[lw.difficulty].ic} ${DIFFICULTY[lw.difficulty].n} · ${lw.clans.map((c) => CLANS[c].ic).join('')} · ${lw.total} Influence · seed ${lw.seed}` : 'No victories yet. The frontier waits.';
  text(g, foot, W / 2, 1560, { font: `500 19px ${BODY}`, fill: '#c9d2e3', maxW: 900 });
  text(g, SITE, W / 2, 1586, { font: `600 15px ${BODY}`, spacing: 4, fill: R.a, alpha: 0.75 });
  return canvas;
}

const blobOf = (canvas) => new Promise((res) => canvas.toBlob(res, 'image/png'));

// Preview sheet with save / share. `onName` persists the optional commander name.
export function statsCardSheet(m, onName) {
  const canvas = h('canvas', { class: 'stats-card', width: W, height: H });
  let timer = 0;
  const draw = () => renderStatsCard(m, canvas);
  const file = async () => new File([await blobOf(canvas)], `astral-expanse-${RANKS[rankOf(m)].id}.png`, { type: 'image/png' });
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
  sheet({
    title: '🖼 Stats card',
    body: h('div', null, canvas,
      h('input', { class: 'field', placeholder: 'Commander name (optional)', maxlength: 24, value: m.name || '', oninput: (e) => { m.name = e.target.value.trim(); onName(m.name); clearTimeout(timer); timer = setTimeout(draw, 250); } }),
      h('p', { class: 'faint', style: { fontSize: '12px' } }, 'Win on higher difficulties to upgrade your rank, frame and art.')),
    actions: [
      { label: '⬇ Save image', cls: canShare ? '' : 'primary', keep: true, on: async () => {
        const f = await file();
        const a = h('a', { href: URL.createObjectURL(f), download: f.name });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } },
      canShare ? { label: '📤 Share', cls: 'primary', keep: true, on: async () => {
        try { await navigator.share({ files: [await file()], title: 'Astral Expanse', text: `${RANKS[rankOf(m)].n} of the Astral Expanse – ${SITE}` }); } catch (e) { if (e.name !== 'AbortError') toast('Sharing failed – try Save image'); }
      } } : null,
    ].filter(Boolean),
  });
  draw();
}
