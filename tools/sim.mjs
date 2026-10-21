// Headless balance simulator. Plays ordinary 20-turn colonies with the greedy
// bot across every three-clan trio (in parallel worker threads) and reports
// checkpoint pass rates, clan strength and observed per-card Influence,
// which is compared against the rubric.
//
//   node tools/sim.mjs [games-per-trio=2] [--trios N] [--look 2] [--json out.json]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CLAN_IDS, CLANS, CARD_LIST, RARITY } from '../js/engine/cards.js';
import { genColony } from '../js/engine/mapgen.js';
import { playCard, bldList } from '../js/engine/colony.js';
import { bestMove, tryAbilities, idleTurn } from '../js/engine/ai.js';
import { rubric } from '../js/engine/rubric.js';

export const PROFILES = [
  { gold: 3, metal: 3, ice: 2, bio: 2, exotic: 1 },
  { gold: 1, metal: 2, ice: 4, bio: 2, exotic: 2 },
  { gold: 1, metal: 1, ice: 2, bio: 4, exotic: 2 },
  { gold: 2, metal: 2, ice: 1, bio: 1, exotic: 4 },
  { gold: 2, metal: 2, ice: 2, bio: 2, exotic: 2 },
];

function playGame(clans, seed, profile, look) {
  const S = genColony({ seed, clans, profile, diff: 1 });
  let guard = 0;
  while (S.status === 'play' && guard++ < 40) {
    tryAbilities(S);
    const m = bestMove(S, { maxHexes: 22, look });
    if (m) playCard(S, m.i, m.k);
    else idleTurn(S);
  }
  const blds = bldList(S).filter((b) => b.c !== 'beacon').map((b) => ({ c: b.c, inf: b.inf, ib: b.ib || 0, na: b.na || 0, turns: S.turn - b.placed + 1, placed: b.placed }));
  return { clans, status: S.status, influence: S.influence, cps: S.checkpoints.map((c) => [c.need, c.met, c.at ?? S.influence]), cpInf: S.cpInf || [], blds, destroyed: S.stats.destroyed, integrity: S.integrity };
}

if (!isMainThread) {
  const out = workerData.jobs.map((j) => playGame(j.clans, j.seed, j.profile, workerData.look));
  parentPort.postMessage(out);
} else {
  const args = process.argv.slice(2);
  const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const G = Number(args[0] && !args[0].startsWith('--') ? args[0] : 2);
  const look = Number(opt('--look', 2));
  const jsonOut = opt('--json', null);
  const trios = [];
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) for (let c = b + 1; c < 9; c++) trios.push([CLAN_IDS[a], CLAN_IDS[b], CLAN_IDS[c]]);
  const T = Number(opt('--trios', trios.length));
  const step = trios.length / T;
  const chosen = Array.from({ length: T }, (_, i) => trios[Math.floor(i * step)]);
  const jobs = [];
  let seed = Number(opt('--seed', 1000));
  for (const t of chosen) for (let g = 0; g < G; g++) { jobs.push({ clans: t, seed: seed, profile: PROFILES[seed % PROFILES.length] }); seed++; }
  const W = Math.min(cpus().length, 10, jobs.length);
  const t0 = Date.now();
  const parts = await Promise.all(Array.from({ length: W }, (_, w) => new Promise((res, rej) => {
    const wk = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % W === w), look } });
    wk.on('message', res);
    wk.on('error', rej);
  })));
  const results = parts.flat();
  report(results, (Date.now() - t0) / 1000, jsonOut);
}

function report(results, secs, jsonOut) {
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))] || 0; };
  const games = results.length;
  const wins = results.filter((r) => r.status === 'won').length;
  const finals = results.map((r) => r.influence);
  const cpPass = results[0].cps.map((_, i) => results.filter((r) => r.cps[i][1]).length / games);
  console.log(`${games} games in ${secs.toFixed(1)}s · win ${(100 * wins / games).toFixed(0)}% · final Influence p10 ${pct(finals, 0.1)} · median ${pct(finals, 0.5)} · p90 ${pct(finals, 0.9)}`);
  console.log('Influence at checkpoints p5/p10/p50:', results[0].cps.map((_, i) => { const v = results.map((r) => r.cps[i][2]); return `${pct(v, 0.05)}/${pct(v, 0.1)}/${pct(v, 0.5)}`; }).join('  '));
  console.log('Checkpoint pass rates:', cpPass.map((n) => (100 * n).toFixed(0) + '%').join(' / '), ' needs:', results[0].cps.map((c) => c[0]).join('/'));
  const clan = {};
  for (const c of CLAN_IDS) clan[c] = avg(results.filter((r) => r.clans.includes(c)).map((r) => r.influence));
  const mean = avg(Object.values(clan));
  console.log('\nClan average final Influence (trios containing the clan):');
  for (const [c, v] of Object.entries(clan).sort((a, b) => b[1] - a[1])) console.log(`  ${CLANS[c].n.padEnd(22)} ${v.toFixed(0).padStart(4)}  ${(((v / mean) - 1) * 100).toFixed(0).padStart(4)}%`);
  const obs = {};
  for (const r of results) for (const b of r.blds) {
    const o = (obs[b.c] = obs[b.c] || { n: 0, inf: 0, turns: 0, na: 0 });
    o.n++; o.inf += b.inf; o.turns += b.turns; o.na += b.na; o.ib = (o.ib || 0) + b.ib;
  }
  const rows = CARD_LIST.map((c) => {
    const o = obs[c.id] || { n: 0, inf: 0, turns: 0, na: 0 };
    const rb = rubric(c);
    return { id: c.id, n: c.n, cl: c.cl, t: c.t, r: c.r, pp: rb.pp, placed: o.n, ipp: o.n ? o.inf / o.n : 0, ipt: o.turns ? o.inf / o.turns : 0, life: o.n ? o.turns / o.n : 0, apt: o.turns ? o.na / o.turns : 0, obs: o.n ? (o.ib || 0) / o.n + ((o.inf - (o.ib || 0)) / o.turns) * rb.H : 0 };
  });
  const ok = rows.filter((x) => x.placed >= 4);
  const byR = {};
  for (const r of ok) (byR[r.r] = byR[r.r] || []).push(r.obs);
  console.log('\nObserved PP (Influence per turn on board × horizon) by rarity:', Object.entries(byR).map(([k, v]) => `${RARITY[k].n} ${avg(v).toFixed(1)} (n=${v.length})`).join(' · '));
  const byClan = {};
  for (const r of ok) (byClan[r.cl] = byClan[r.cl] || []).push(r.obs);
  console.log('Observed PP by clan:', Object.entries(byClan).map(([k, v]) => `${k} ${avg(v).toFixed(1)}`).join(' · '));
  const ranked = ok.sort((a, b) => a.obs - b.obs);
  const line = (r) => `  ${r.r} ${r.t} ${r.n.padEnd(24)} obs ${r.obs.toFixed(1).padStart(5)}  rubric ${String(r.pp).padStart(5)}  act/turn ${r.apt.toFixed(2)}  n=${r.placed}`;
  console.log('\nLowest observed:');
  ranked.slice(0, 18).forEach((r) => console.log(line(r)));
  console.log('Highest observed:');
  ranked.slice(-18).reverse().forEach((r) => console.log(line(r)));
  const never = rows.filter((r) => r.placed < 4).map((r) => r.n);
  if (never.length) console.log(`\nRarely placed (<4): ${never.join(', ')}`);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ games, wins, cpPass, finals, clan, rows }, null, 1));
}
