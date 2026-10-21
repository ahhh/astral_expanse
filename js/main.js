// App shell: routes between screens and persists the game after every action.
import { h, sheet, toast, confirmSheet, closeSheets } from './ui/dom.js';
import { titleScreen, clanSelect, codexScreen, helpScreen, setupScreen } from './ui/screens.js';
import { colonyScreen } from './ui/colonyView.js';
import { overworldScreen, missionEndScreen, resBar } from './ui/overworld.js';
import { loadSave, writeSave, clearSave, loadMeta, writeMeta } from './ui/store.js';
import { genColony } from './engine/mapgen.js';
import { resetTurnState } from './engine/colony.js';
import * as X from './engine/expedition.js';
import { CLANS } from './engine/cards.js';

const root = document.getElementById('app');
const app = { E: null, practice: null, tab: 'chart', back: null };
let meta = loadMeta();

function revive(S) {
  if (S) S._q = [];
  return S;
}
function save() {
  if (app.E) writeSave({ kind: 'exp', E: app.E });
  else if (app.practice) writeSave({ kind: 'practice', S: app.practice });
}
function bumpMeta(S) {
  if (S && S.influence > (meta.bestColony || 0)) { meta.bestColony = S.influence; writeMeta(meta); }
}

// ------------------------------------------------------------- screens
function title() {
  closeSheets();
  const s = loadSave();
  let info = '';
  if (s && s.kind === 'exp') info = `${s.E.clans.map((c) => CLANS[c].ic).join('')} expedition, ${s.E.claimed} claimed`;
  if (s && s.kind === 'practice') info = `quick colony, turn ${s.S.turn}`;
  titleScreen(root, {
    hasSave: !!s, saveInfo: info, meta,
    onContinue: () => {
      if (s.kind === 'exp') { app.E = X.migrate(s.E); if (app.E.colony) revive(app.E.colony); app.practice = null; route(); }
      else { app.practice = revive(s.S); app.E = null; route(); }
    },
    onNew: () => {
      const go = () => setupScreen(root, { onBack: title, onNext: (opts) => clanSelect(root, {
        title: 'Founding clan', onBack: go, min: 1, max: 1, startLabel: 'Sign the founding treaty',
        hint: 'Choose one clan to found your expedition. Secure Clan Enclaves on the star chart to recruit up to two more.',
        onStart: (clans) => {
          app.E = X.newExpedition(opts.seed, clans, opts);
          app.E.seedLabel = opts.seedLabel;
          app.practice = null;
          app.tab = 'chart';
          meta.runs = (meta.runs || 0) + 1;
          writeMeta(meta);
          save();
          route();
          setTimeout(() => toast('Tap a glowing world to plan your first jump – a 🏛️ Enclave recruits a new clan'), 400);
        },
      }) });
      if (s) confirmSheet('Start over?', 'This replaces your saved game.', 'Start new', go);
      else go();
    },
    onPractice: () => {
      const go = () => clanSelect(root, {
        title: 'Quick colony', startLabel: 'Land', onBack: title, min: 1, max: 3,
        onStart: (clans) => {
          const seed = (Math.random() * 1e9) | 0;
          const fams = ['gold', 'metal', 'ice', 'bio', 'exotic'];
          const profile = Object.fromEntries(fams.map((f) => [f, 1 + ((seed >> fams.indexOf(f) * 3) % 3)]));
          profile[fams[seed % 5]] = 4;
          app.practice = genColony({ seed, clans, profile, name: 'Training Rock ' + (seed % 1000) });
          app.E = null;
          save();
          route();
        },
      });
      if (s) confirmSheet('Start over?', 'This replaces your saved game.', 'Start new', go);
      else go();
    },
    onCodex: () => { app.back = title; codex(); },
    onHelp: () => { app.back = title; help(); },
  });
}
function codex() { closeSheets(); codexScreen(root, { onBack: () => (app.back || route)() }); }
function help() { closeSheets(); helpScreen(root, { onBack: () => (app.back || route)() }); }

function route() {
  closeSheets();
  app.back = null;
  if (app.practice) return practiceColony();
  if (!app.E) return title();
  const E = app.E;
  if (E.status !== 'active') return expeditionEnd();
  if (E.colony) {
    if (E.colony.status !== 'play') return missionEndScreen(root, E, { done: afterMission, refresh: () => { save(); route(); } });
    return colonyScreen(root, E.colony, colonyHooks(X.undoAllowance(E), () => missionEndScreen(root, E, { done: afterMission, refresh: () => { save(); route(); } }), () => { X.abandonMission(E); save(); route(); }));
  }
  overworldScreen(root, E, {
    tab: (t) => { app.tab = t; route(); },
    refresh: () => { save(); route(); },
    travel: (id, bench, extra = {}) => {
      if (!X.travel(E, id, { bench, ...extra })) return toast(E.pendingCompact ? 'Choose a Trade Compact first' : 'Cannot travel there');
      save();
      route();
      if (E.lastYield && Object.keys(E.lastYield).length) toast('Routes: ' + Object.entries(E.lastYield).map(([r, v]) => `+${v} ${r}`).join(' '));
    },
    menu: overworldMenu,
  }, app.tab);
}

function colonyHooks(undo, onDone, abandon) {
  return {
    save, undo,
    onDone: () => { bumpMeta(app.E ? app.E.colony : app.practice); save(); onDone(); },
    codex: () => { app.back = route; codex(); },
    help: () => { app.back = route; help(); },
    quit: () => { save(); title(); },
    abandon,
  };
}

function afterMission() {
  const E = app.E;
  if (E.status !== 'active') {
    if (E.status === 'won') { meta.wins = (meta.wins || 0) + 1; writeMeta(meta); }
  }
  app.tab = 'chart';
  save();
  route();
}

function practiceColony() {
  const S = app.practice;
  const end = () => {
    root.innerHTML = '';
    const won = S.status === 'won';
    root.append(h('div', { class: 'page' }, h('div', { class: 'big-result' }, h('div', { class: 'em' }, won ? '🏴' : '💥'), h('h2', null, won ? 'Colony secured' : 'Colony lost'), h('p', { class: 'dim' }, S.result.reason), h('h1', null, `${S.influence} Influence`)),
      h('div', { class: 'list' },
        h('button', { class: 'btn primary block', onclick: () => { app.practice = null; clearSave(); title(); } }, 'Back to title'))));
  };
  if (S.status !== 'play') return end();
  colonyScreen(root, S, colonyHooks(99, end, () => { S.status = 'failed'; S.result = { success: false, reason: 'Colony abandoned.' }; save(); end(); }));
}

function overworldMenu() {
  sheet({
    title: 'Expedition',
    body: h('div', { class: 'list' },
      h('div', { class: 'item' }, h('h4', null, `Treaty (${app.E.clans.length}/${X.maxClans(app.E)})`), app.E.clans.map((c) => h('span', { class: 'chip', style: { color: CLANS[c].col, marginRight: '4px' } }, CLANS[c].ic, ' ', CLANS[c].n)),
        h('div', { class: 'faint', style: { fontSize: '12px', marginTop: '4px' } }, `Licensed: ${app.E.licensed.map((c) => CLANS[c].ic).join(' ')}`),
        h('div', { class: 'faint', style: { fontSize: '12px', marginTop: '4px' } }, `${X.diffOf(app.E).ic} ${X.diffOf(app.E).n}${(app.E.mods || []).length ? ' · ' + app.E.mods.map((m) => X.MODIFIERS[m].n).join(', ') : ''} · seed ${app.E.seedLabel || app.E.seed}`)),
      h('button', { class: 'btn block', onclick: () => { app.back = route; codex(); } }, '📚 Codex & rubric'),
      h('button', { class: 'btn block', onclick: () => { app.back = route; help(); } }, '❓ How to play'),
      h('button', { class: 'btn block', onclick: () => { save(); title(); } }, '💾 Save & return to title'),
      h('button', { class: 'btn block danger', onclick: () => confirmSheet('End expedition?', 'Your saved expedition will be deleted.', 'End it', () => { app.E.status = 'lost'; app.E.endReason = 'You recalled the fleet.'; save(); route(); }) }, '🏳 End expedition')),
  });
}

function expeditionEnd() {
  const E = app.E;
  root.innerHTML = '';
  const won = E.status === 'won';
  root.append(h('div', { class: 'page' },
    h('div', { class: 'big-result' }, h('div', { class: 'em' }, won ? '🌟' : '🌌'), h('h2', null, won ? E.ending || 'Victory' : 'Expedition over'), h('p', { class: 'dim' }, E.endReason || '')),
    h('div', { class: 'kv' }, h('b', null, 'Difficulty'), h('span', null, `${X.diffOf(E).ic} ${X.diffOf(E).n}`), h('b', null, 'Clans'), h('span', null, E.clans.map((c) => CLANS[c].ic).join(' ')), h('b', null, 'Colonies claimed'), h('span', null, E.claimed), h('b', null, 'Jumps'), h('span', null, E.jumps), h('b', null, 'Total Influence'), h('span', null, E.totalInfluence), h('b', null, 'Peak throughput'), h('span', null, E.peakThroughput || 0), h('b', null, 'Superplanets claimed'), h('span', null, E.victories || 0), h('b', null, 'Seed'), h('span', null, E.seedLabel || E.seed)),
    h('div', { class: 'sect' }, 'Final purse'), resBar(E),
    won ? h('button', { class: 'btn primary block', style: { marginTop: '20px' }, onclick: () => { X.enterEndless(E); app.tab = 'chart'; save(); route(); toast('The Endless Frontier opens beyond the Crown'); } }, '♾️ Continue into the Endless Frontier') : null,
    h('button', { class: 'btn block' + (won ? '' : ' primary'), style: { marginTop: '10px' }, onclick: () => { app.E = null; clearSave(); title(); } }, 'Back to title')));
}

// Boot
try {
  title();
} catch (e) {
  root.innerHTML = '';
  root.append(h('div', { class: 'title' }, h('h2', null, 'Something went wrong'), h('pre', { style: { whiteSpace: 'pre-wrap' } }, String(e && e.stack || e))));
}
