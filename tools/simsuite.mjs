// Game simulation suites with full data output. Plays colonies with the greedy
// bot (in parallel worker threads) and writes, per run:
//
//   <out>/games.jsonl   one JSON record per game: setup, result, checkpoints,
//                       engine stats, a per-turn log and every building
//   <out>/summary.json  cumulative stats: overall, by treaty size, by clan, by
//                       treaty, per card, per tech
//   <out>/meta.json     the suite, options and code fingerprint of the run
//
//   node tools/simsuite.mjs <suite> [options]
//
// Suites
//   trios    every three-clan treaty (84) × --games
//   duos     every two-clan treaty (36) × --games
//   solo     every clan alone (9) × --games
//   treaty   --games random treaties of each size 1, 2 and 3
//   boss     the three planet bosses on 26-turn finale maps × --games random trios
//   tech     --games random trios, replayed once per local technology (+ none)
//   custom   --clans a,b[,c] × --games
//
// Options
//   --games N        games per treaty / group (default 4; treaty 60; boss 30; tech 60)
//   --diff D         checkpoint difficulty multiplier (default 1; boss 1.15)
//   --turns T        map length (default 21; boss 26)
//   --extra-events   add the deep-space event schedule (on for boss)
//   --seed S         first seed (default 1000)
//   --look L         bot lookahead turns (default 2)
//   --hexes H        hexes sampled per card by the bot (default 22)
//   --techs P        local-tech policy outside the tech suite: none | first | random (default none)
//   --workers W      worker threads (default min(cores, 10))
//   --no-turns       omit the per-turn log (smaller files)
//   --out DIR        output directory (default sim-out/<suite>-<timestamp>)
//   --quiet          no stdout summary
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { execSync } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CLAN_IDS, CLANS, CARDS } from '../js/engine/cards.js';
import { genColony } from '../js/engine/mapgen.js';
import { playCard, passTurn, bldList, chooseTech, TECHS, kept } from '../js/engine/colony.js';
import { bestMove, tryAbilities, idleTurn } from '../js/engine/ai.js';
import { rubric } from '../js/engine/rubric.js';

export const PROFILES = [
  { gold: 3, metal: 3, ice: 2, bio: 2, exotic: 1 },
  { gold: 1, metal: 2, ice: 4, bio: 2, exotic: 2 },
  { gold: 1, metal: 1, ice: 2, bio: 4, exotic: 2 },
  { gold: 2, metal: 2, ice: 1, bio: 1, exotic: 4 },
  { gold: 2, metal: 2, ice: 2, bio: 2, exotic: 2 },
];
const BOSSES = ['aurelia', 'nyxea', 'viridion'];

// ---------------------------------------------------------------- one game
function pickTech(S, job, policy, rnd) {
  if (!S.techOffer) return null;
  let t = null;
  if (job.tech !== undefined) t = job.tech && !S.techs.length ? job.tech : null;
  else if (policy === 'first') t = S.techOffer[0];
  else if (policy === 'random') t = S.techOffer[Math.floor(rnd() * S.techOffer.length)];
  if (t) { S.techOffer = [t]; chooseTech(S, t); } else S.techOffer = null;
  return t;
}

export function playGame(job, opt) {
  const S = genColony({
    seed: job.seed, clans: job.clans, profile: job.profile, diff: job.diff,
    turns: job.turns, R: job.R, boss: job.boss, type: job.boss ? 'boss' : undefined, extraEvents: job.extraEvents,
  });
  let r = job.seed >>> 0;
  const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const turns = [];
  const techsAt = [];
  let guard = 0;
  while (S.status === 'play' && guard++ < 60) {
    const t = pickTech(S, job, opt.techs, rnd);
    if (t) techsAt.push({ tech: t, turn: S.turn });
    const turn = S.turn, before = S.influence, hand = S.hand.slice(), keptN = kept(S).length, integ = S.integrity;
    tryAbilities(S);
    const ability = S.influence - before;
    const m = bestMove(S, { maxHexes: opt.hexes, look: opt.look });
    let action = 'pass', card = null, k = null;
    if (m) { action = 'build'; card = m.cid; k = m.k; playCard(S, m.i, m.k); }
    else { const n = S.stats.excavated; idleTurn(S); action = S.stats.excavated > n ? 'dig' : 'pass'; }
    if (!opt.noTurns) {
      turns.push({
        turn, action, card, k, gain: S.influence - before, abilityGain: ability, influence: S.influence,
        integrity: S.integrity, integrityLost: Math.max(0, integ - S.integrity),
        hand: hand.length, kept: keptN, handCards: hand, draws: S.lastDraw ?? null, clansActivated: S.lastClans ?? null,
      });
    }
  }
  const total = S.turn;
  return {
    suite: job.suite, group: job.group, seed: job.seed, clans: job.clans, nClans: job.clans.length, profile: job.profile,
    diff: job.diff, turns: S.turns, boss: job.boss || null, extraEvents: !!job.extraEvents, tech: job.tech ?? null,
    status: S.status, won: S.status === 'won', reason: S.result ? S.result.reason : null,
    masterwork: !!(S.result && S.result.masterwork), integrate: !!(S.result && S.result.integrate),
    influence: S.influence, integrity: S.integrity,
    checkpoints: S.checkpoints.map((c) => ({ turn: c.turn, need: c.need, at: c.at ?? null, met: c.met })),
    stats: S.stats, techs: S.techs || [], techsAt, mega: S.mega || {},
    compacts: Object.values(S.pool).flat().filter((id) => CARDS[id] && CARDS[id].compact),
    bossObjective: S.boss ? { type: S.boss.type, meter: S.boss.meter, tamed: S.boss.tamed, roars: S.boss.roars } : null,
    buildings: bldList(S).filter((b) => b.c !== 'beacon').map((b) => {
      const c = CARDS[b.c];
      return {
        card: b.c, name: c.n, base: c.base || b.c, clan: b.clan, compact: !!c.compact, partner: c.partner || null,
        tier: c.t, rarity: c.r, hex: b.k, placed: b.placed, turnsOnBoard: total - b.placed + 1,
        influence: b.inf, buildInfluence: b.ib || 0, activations: b.na || 0, imports: b.imps || 0,
      };
    }),
    turnLog: opt.noTurns ? undefined : turns,
  };
}

// ---------------------------------------------------------------- job lists
function combos(n) {
  const out = [];
  const rec = (start, acc) => {
    if (acc.length === n) return out.push(acc.slice());
    for (let i = start; i < CLAN_IDS.length; i++) { acc.push(CLAN_IDS[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}
function randomClans(n, seed) {
  const ids = CLAN_IDS.slice();
  const out = [];
  let x = (seed * 7919) >>> 0;
  while (out.length < n) { x = (x * 1103515245 + 12345) % 2147483648; out.push(ids.splice(x % ids.length, 1)[0]); }
  return out;
}
export function buildJobs(suite, o) {
  const jobs = [];
  let seed = o.seed;
  const add = (clans, extra = {}) => {
    jobs.push(Object.assign({ suite, seed, clans, profile: PROFILES[seed % PROFILES.length], diff: o.diff, turns: o.turns, extraEvents: o.extraEvents, group: clans.join('+') }, extra));
    seed++;
  };
  if (suite === 'trios' || suite === 'duos' || suite === 'solo') {
    const n = { trios: 3, duos: 2, solo: 1 }[suite];
    for (const c of combos(n)) for (let g = 0; g < o.games; g++) add(c);
  } else if (suite === 'treaty') {
    for (const n of [1, 2, 3]) for (let g = 0; g < o.games; g++) add(randomClans(n, seed), { group: `${n} clan${n > 1 ? 's' : ''}` });
  } else if (suite === 'custom') {
    if (!o.clans) throw new Error('custom suite needs --clans a,b[,c]');
    for (let g = 0; g < o.games; g++) add(o.clans);
  } else if (suite === 'boss') {
    for (const boss of BOSSES) for (let g = 0; g < o.games; g++) add(randomClans(3, seed), { boss, R: 5, profile: PROFILES[4], group: boss });
  } else if (suite === 'tech') {
    for (let g = 0; g < o.games; g++) {
      const clans = randomClans(3, seed);
      for (const tech of [''].concat(Object.keys(TECHS))) jobs.push({ suite, seed, clans, profile: PROFILES[seed % PROFILES.length], diff: o.diff, turns: o.turns, extraEvents: o.extraEvents, tech, group: tech || 'none' });
      seed++;
    }
  } else throw new Error(`unknown suite "${suite}"`);
  return jobs;
}

// ---------------------------------------------------------------- summaries
const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const r2 = (v) => Math.round(v * 100) / 100;

function groupStats(games) {
  const inf = games.map((g) => g.influence);
  const ncp = Math.max(0, ...games.map((g) => g.checkpoints.length));
  const reasons = {};
  for (const g of games) if (!g.won) reasons[g.reason] = (reasons[g.reason] || 0) + 1;
  const st = (k) => r2(mean(games.map((g) => g.stats[k] || 0)));
  return {
    games: games.length,
    winRate: r2(mean(games.map((g) => (g.won ? 1 : 0)))),
    masterworkRate: r2(mean(games.map((g) => (g.masterwork ? 1 : 0)))),
    integrateRate: r2(mean(games.map((g) => (g.integrate ? 1 : 0)))),
    influence: { mean: r2(mean(inf)), p5: pct(inf, 0.05), p10: pct(inf, 0.1), p50: pct(inf, 0.5), p90: pct(inf, 0.9), min: Math.min(...inf), max: Math.max(...inf) },
    integrityEnd: r2(mean(games.map((g) => g.integrity))),
    checkpoints: Array.from({ length: ncp }, (_, i) => {
      const cs = games.map((g) => g.checkpoints[i]).filter(Boolean);
      const at = cs.map((c) => c.at ?? 0);
      return { turn: cs[0] && cs[0].turn, need: r2(mean(cs.map((c) => c.need))), passRate: r2(mean(cs.map((c) => (c.met ? 1 : 0)))), earned: { p10: pct(at, 0.1), p50: pct(at, 0.5), p90: pct(at, 0.9) } };
    }),
    failReasons: reasons,
    perGame: {
      buildingsPlaced: st('placed'), activations: st('acts'), repeats: st('repeats'), salvaged: st('salvaged'), trades: st('imports'),
      upkeepFed: st('fed'), upkeepHungry: st('hungry'), overheats: st('overheats'), destroyed: st('destroyed'), excavated: st('excavated'),
      compactsInPool: r2(mean(games.map((g) => g.compacts.length))),
      compactsBuilt: r2(mean(games.map((g) => g.buildings.filter((b) => b.compact).length))),
    },
  };
}

function cardStats(games) {
  const acc = {};
  for (const g of games) for (const b of g.buildings) {
    const a = (acc[b.card] = acc[b.card] || { n: 0, inf: 0, ib: 0, turns: 0, acts: 0, imps: 0, games: new Set() });
    a.n++; a.inf += b.influence; a.ib += b.buildInfluence; a.turns += b.turnsOnBoard; a.acts += b.activations; a.imps += b.imports; a.games.add(g.seed + ':' + g.group);
  }
  const out = {};
  for (const [id, a] of Object.entries(acc)) {
    const c = CARDS[id];
    const rb = rubric(c);
    out[id] = {
      name: c.n, clan: c.cl, tier: c.t, rarity: c.r, compact: !!c.compact, base: c.base || id, partner: c.partner || null,
      placed: a.n, gamesWithIt: a.games.size, avgInfluence: r2(a.inf / a.n), influencePerTurn: r2(a.inf / a.turns),
      activationsPerTurn: r2(a.acts / a.turns), importsPerActivation: r2(a.acts ? a.imps / a.acts : 0),
      rubricPP: rb.pp, measuredPP: r2(a.ib / a.n + ((a.inf - a.ib) / a.turns) * rb.H), band: rb.band,
    };
  }
  return out;
}

export function summarize(games, suite) {
  const by = (f) => { const m = {}; for (const g of games) for (const k of [].concat(f(g))) (m[k] = m[k] || []).push(g); return m; };
  const map = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, groupStats(v)]));
  const byClan = map(by((g) => g.clans));
  const meanInf = mean(Object.values(byClan).map((s) => s.influence.mean));
  for (const s of Object.values(byClan)) s.vsMean = Math.round((meanInf ? s.influence.mean / meanInf - 1 : 0) * 1000) / 1000;
  const out = {
    suite, games: games.length,
    overall: groupStats(games),
    byTreatySize: map(by((g) => String(g.nClans))),
    byClan,
    byGroup: map(by((g) => g.group)),
    cards: cardStats(games),
  };
  if (suite === 'tech') {
    const base = Object.fromEntries(games.filter((g) => !g.tech).map((g) => [g.seed, g.influence]));
    out.techs = {};
    for (const [t, gs] of Object.entries(by((g) => g.tech || 'none'))) {
      const d = gs.map((g) => g.influence - (base[g.seed] ?? g.influence));
      out.techs[t] = { name: TECHS[t] ? TECHS[t].n : 'No technology', games: gs.length, winRate: groupStats(gs).winRate, deltaInfluence: r2(mean(d)), deltaPct: r2(mean(gs.map((g) => base[g.seed] ? g.influence / base[g.seed] - 1 : 0))), takenTurn: r2(mean(gs.map((g) => (g.techsAt[0] ? g.techsAt[0].turn : 0)))) };
    }
  }
  return out;
}

function printSummary(sm, secs) {
  const o = sm.overall;
  const line = (k, s) => `  ${k.padEnd(22)} n=${String(s.games).padStart(4)}  win ${(100 * s.winRate).toFixed(0).padStart(3)}%  masterwork ${(100 * s.masterworkRate).toFixed(0).padStart(3)}%  influence p10/p50/p90 ${s.influence.p10}/${s.influence.p50}/${s.influence.p90}  cp ${s.checkpoints.map((c) => (100 * c.passRate).toFixed(0)).join('/')}`;
  console.log(`${sm.suite}: ${sm.games} games in ${secs.toFixed(1)}s`);
  console.log(line('overall', o));
  console.log('By treaty size:'); for (const [k, s] of Object.entries(sm.byTreatySize)) console.log(line(`${k} clan(s)`, s));
  console.log('By clan (games containing it):');
  for (const [k, s] of Object.entries(sm.byClan).sort((a, b) => b[1].influence.mean - a[1].influence.mean)) console.log(line(`${CLANS[k].n} (${s.vsMean >= 0 ? '+' : ''}${(100 * s.vsMean).toFixed(1)}%)`, s));
  if (sm.suite === 'boss' || sm.suite === 'treaty') { console.log('By group:'); for (const [k, s] of Object.entries(sm.byGroup)) console.log(line(k, s)); }
  if (sm.techs) { console.log('Techs (vs. the same seed with no tech):'); for (const [k, t] of Object.entries(sm.techs)) console.log(`  ${t.name.padEnd(20)} Δ ${String(t.deltaInfluence).padStart(6)} (${(100 * t.deltaPct).toFixed(1)}%)  win ${(100 * t.winRate).toFixed(0)}%`); }
  console.log(`Per game: ${Object.entries(o.perGame).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}

// ---------------------------------------------------------------- entry
if (!isMainThread) {
  parentPort.postMessage(workerData.jobs.map((j) => playGame(j, workerData.opt)));
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const suite = args[0];
  if (!suite || suite.startsWith('--')) { console.error('usage: node tools/simsuite.mjs <trios|duos|solo|treaty|boss|tech|custom> [options] (see header)'); process.exit(2); }
  const has = (k) => args.includes(k);
  const val = (k, d) => (has(k) ? args[args.indexOf(k) + 1] : d);
  const defGames = { treaty: 60, boss: 30, tech: 60, custom: 40 }[suite] || 4;
  const o = {
    games: Number(val('--games', defGames)), diff: Number(val('--diff', suite === 'boss' ? 1.15 : 1)),
    turns: Number(val('--turns', suite === 'boss' ? 26 : 21)), extraEvents: has('--extra-events') || suite === 'boss',
    seed: Number(val('--seed', 1000)), clans: has('--clans') ? val('--clans').split(',') : null,
  };
  const opt = { look: Number(val('--look', 2)), hexes: Number(val('--hexes', 22)), techs: val('--techs', 'none'), noTurns: has('--no-turns') };
  const out = val('--out', `sim-out/${suite}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  const jobs = buildJobs(suite, o);
  const W = Math.min(Number(val('--workers', Math.min(cpus().length, 10))), jobs.length);
  const t0 = Date.now();
  const parts = await Promise.all(Array.from({ length: W }, (_, w) => new Promise((res, rej) => {
    const wk = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % W === w), opt } });
    wk.on('message', res); wk.on('error', rej);
  })));
  const games = parts.flat().sort((a, b) => a.seed - b.seed || String(a.group).localeCompare(String(b.group)));
  mkdirSync(out, { recursive: true });
  const ws = createWriteStream(`${out}/games.jsonl`);
  for (const g of games) ws.write(JSON.stringify(g) + '\n');
  await new Promise((res) => ws.end(res));
  const sm = summarize(games, suite);
  writeFileSync(`${out}/summary.json`, JSON.stringify(sm, null, 1));
  let commit = null, dirty = null;
  try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); dirty = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().length > 0; } catch { /* not a git checkout */ }
  const secs = (Date.now() - t0) / 1000;
  writeFileSync(`${out}/meta.json`, JSON.stringify({ suite, options: o, bot: opt, games: games.length, seconds: secs, commit, dirty, createdAt: new Date().toISOString() }, null, 1));
  if (!has('--quiet')) printSummary(sm, secs);
  console.log(`wrote ${out}/games.jsonl, summary.json, meta.json`);
}
