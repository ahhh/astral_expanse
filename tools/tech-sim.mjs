// Local-technology balance check. Plays the same seeds once per technology:
// at the first met checkpoint the bot installs that technology (and nothing
// else), so each run isolates one tech's value against a no-tech baseline.
//
//   node tools/tech-sim.mjs [games=120] [--diff 1] [--look 1] [--only drone,survey]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CLAN_IDS } from '../js/engine/cards.js';
import { genColony } from '../js/engine/mapgen.js';
import { playCard, chooseTech, TECHS } from '../js/engine/colony.js';
import { bestMove, tryAbilities, idleTurn } from '../js/engine/ai.js';

const PROFILES = [
  { gold: 3, metal: 3, ice: 2, bio: 2, exotic: 1 },
  { gold: 1, metal: 2, ice: 4, bio: 2, exotic: 2 },
  { gold: 1, metal: 1, ice: 2, bio: 4, exotic: 2 },
  { gold: 2, metal: 2, ice: 1, bio: 1, exotic: 4 },
  { gold: 2, metal: 2, ice: 2, bio: 2, exotic: 2 },
];

function playGame(job, tech, diff, look) {
  const S = genColony({ seed: job.seed, clans: job.clans, profile: job.profile, diff });
  let guard = 0, at = null;
  while (S.status === 'play' && guard++ < 40) {
    if (S.techOffer) {
      if (tech && !S.techs.length) { S.techOffer = [tech]; chooseTech(S, tech); at = S.turn; }
      else S.techOffer = null;
    }
    tryAbilities(S);
    const m = bestMove(S, { maxHexes: 18, look });
    if (m) playCard(S, m.i, m.k);
    else idleTurn(S);
  }
  return { won: S.status === 'won', inf: S.influence, at, integ: S.integrity };
}

if (!isMainThread) {
  const { jobs, techs, diff, look } = workerData;
  parentPort.postMessage(jobs.map((j) => Object.fromEntries(techs.map((t) => [t || 'none', playGame(j, t, diff, look)]))));
} else {
  const args = process.argv.slice(2);
  const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const G = Number(args[0] && !args[0].startsWith('--') ? args[0] : 120);
  const diff = Number(opt('--diff', 1));
  const look = Number(opt('--look', 1));
  const only = opt('--only', null);
  const techs = [null, ...(only ? only.split(',') : Object.keys(TECHS))];
  const jobs = Array.from({ length: G }, (_, i) => {
    const s = 5000 + i;
    const pick = [...CLAN_IDS].sort((a, b) => ((a.charCodeAt(0) * 31 + s * 17) % 97) - ((b.charCodeAt(0) * 31 + s * 17) % 97)).slice(0, 3);
    return { seed: s, clans: pick, profile: PROFILES[s % PROFILES.length] };
  });
  const W = Math.min(cpus().length, 10, jobs.length);
  const parts = await Promise.all(Array.from({ length: W }, (_, w) => new Promise((res, rej) => {
    const wk = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % W === w), techs, diff, look } });
    wk.on('message', res);
    wk.on('error', rej);
  })));
  const rows = parts.flat();
  const avg = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const base = rows.map((r) => r.none.inf);
  console.log(`${rows.length} games · diff ${diff} · baseline win ${(100 * avg(rows.map((r) => +r.none.won))).toFixed(0)}% · mean Influence ${avg(base).toFixed(0)}`);
  for (const t of techs.slice(1)) {
    const got = rows.filter((r) => r[t].at != null);
    const d = got.map((r) => r[t].inf - r.none.inf);
    console.log(`  ${TECHS[t].ic} ${TECHS[t].n.padEnd(18)} ΔInfluence ${avg(d).toFixed(1).padStart(6)}  (${(100 * avg(d) / avg(got.map((r) => r.none.inf))).toFixed(1).padStart(5)}%)  win ${(100 * avg(rows.map((r) => +r[t].won))).toFixed(0)}%  integrity ${avg(rows.map((r) => r[t].integ)).toFixed(1)}  taken T${avg(got.map((r) => r[t].at)).toFixed(1)}`);
  }
}
