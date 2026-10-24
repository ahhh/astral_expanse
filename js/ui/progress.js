// Meta-game progress kept in this browser: lifetime stats, which difficulties
// are unlocked and the rank shown on the shareable stats card.
import { DIFFICULTY } from '../engine/expedition.js';

export const DIFF_ORDER = ['explorer', 'standard', 'veteran', 'nightmare'];
const UNLOCK_BY = { veteran: 'standard', nightmare: 'veteran' };
export const ENDINGS = ['Survival Claim', 'Resonant Capital', 'Transcendent Civilization'];

// Fills in fields older saves lack, so callers can read everything unguarded.
export function normalizeMeta(m) {
  m = m || {};
  return Object.assign(m, {
    runs: m.runs || 0, wins: m.wins || 0, bestColony: m.bestColony || 0, hints: m.hints || 0, unassisted: m.unassisted || 0,
    cleared: m.cleared || {}, endings: m.endings || {}, clanWins: m.clanWins || {}, startClans: m.startClans || {},
    best: Object.assign({ total: 0, claimed: 0, throughput: 0, victories: 0, endless: 0 }, m.best),
  });
}

// The founding clan the player picks most often (ties go to the most recent pick).
export function favoriteClan(m) {
  let best = null;
  for (const [c, n] of Object.entries(m.startClans)) if (!best || n >= m.startClans[best]) best = c;
  return best;
}
export function recordStart(m, clan) {
  const n = (m.startClans[clan] || 0) + 1;
  delete m.startClans[clan];
  m.startClans[clan] = n;
}

export const beaten = (m, d) => (m.cleared[d] || 0) > 0;
export const isUnlocked = (m, d) => !UNLOCK_BY[d] || beaten(m, UNLOCK_BY[d]) || beaten(m, d);
export const unlockText = (d) => `🔒 Beat ${DIFFICULTY[UNLOCK_BY[d]].n} to unlock`;

// Folds a finished (or re-finished, after the Endless Frontier) expedition into
// the lifetime record. Idempotent per outcome. Returns newly unlocked difficulties.
export function recordExpedition(m, E) {
  const key = `${E.status}:${E.victories || 0}:${E.endless || 0}`;
  if (E.metaKey === key) return [];
  E.metaKey = key;
  const before = DIFF_ORDER.filter((d) => isUnlocked(m, d));
  const b = m.best;
  b.total = Math.max(b.total, E.totalInfluence || 0);
  b.claimed = Math.max(b.claimed, E.claimed || 0);
  b.throughput = Math.max(b.throughput, E.peakThroughput || 0);
  b.endless = Math.max(b.endless, E.endless || 0);
  b.victories = Math.max(b.victories, E.victories || 0);
  if (E.status === 'won') {
    if (!E.metaWon) {
      E.metaWon = true;
      m.wins++;
      m.cleared[E.difficulty] = (m.cleared[E.difficulty] || 0) + 1;
      for (const c of E.clans) m.clanWins[c] = (m.clanWins[c] || 0) + 1;
      if (E.ending) m.endings[E.ending] = (m.endings[E.ending] || 0) + 1;
      if (!E.hintsUsed) m.unassisted++;
    }
    m.lastWin = { difficulty: E.difficulty, clans: E.clans.slice(), ending: E.ending, total: E.totalInfluence, claimed: E.claimed, seed: E.seedLabel || String(E.seed), at: Date.now() };
  }
  return DIFF_ORDER.filter((d) => isUnlocked(m, d) && !before.includes(d));
}

export const RANKS = [
  { id: 'drifter', n: 'Drifter', sub: 'Still charting the dark', a: '#a9b8cc', b: '#5f7088' },
  { id: 'pathfinder', n: 'Pathfinder', sub: 'Explorer expedition won', a: '#7ff0c8', b: '#2f9e83' },
  { id: 'navigator', n: 'Navigator', sub: 'Standard expedition won', a: '#bff4ff', b: '#3fa9ff' },
  { id: 'vanguard', n: 'Vanguard', sub: 'Veteran expedition won', a: '#ffe08a', b: '#ff7a1a' },
  { id: 'sovereign', n: 'Void Sovereign', sub: 'Nightmare conquered', a: '#ff6bd5', b: '#8b5cff' },
];
export function rankOf(m) {
  for (let i = DIFF_ORDER.length - 1; i >= 0; i--) if (beaten(m, DIFF_ORDER[i])) return i + 1;
  return 0;
}
