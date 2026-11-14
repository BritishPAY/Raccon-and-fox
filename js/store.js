// Progress and settings live in this browser only — no account needed.
// Progress is kept per sign language (ASL / LSM); XP, streak and leagues are shared.
import { ACHIEVEMENTS, ALPHABET_BY_LANG, UNITS_BY_LANG } from './content.js';

const KEY = 'signify:v1';
const OLD_KEY = 'signquest:v1'; // name before the rename
export const DAILY_GOAL = 50; // XP per day — about 5 minutes
export const LEAGUES = [
  { id: 'bronze', min: 0, emoji: '🥉' },
  { id: 'silver', min: 150, emoji: '🥈' },
  { id: 'gold', min: 400, emoji: '🥇' },
  { id: 'diamond', min: 800, emoji: '💎' },
];
export const FREEZE_COST = 100;

const guessUi = () => (typeof navigator !== 'undefined' && /^es\b/i.test(navigator.language || '') ? 'es' : 'en');
const fresh = () => ({
  xp: 0, streak: 0, lastDay: null, units: {}, quests: {}, signs: {}, best: 0, achievements: {}, name: '',
  ui: guessUi(), sl: 'asl', sound: true, day: { date: null, xp: 0 }, week: { id: null, xp: 0 }, freezes: 0, perfect: 0, frozeOn: null,
});

let state = fresh();
try { state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || '{}') }; } catch { /* storage unavailable */ }

const listeners = new Set();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(state));
}

const dayStr = (offset = 0) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);
const weekId = () => Math.floor((Date.now() / 864e5 + 3) / 7); // weeks start on Monday

const newlyUnlocked = [];
function unlock(id) {
  if (state.achievements[id] || !ACHIEVEMENTS[id]) return;
  state.achievements[id] = dayStr();
  newlyUnlocked.push(id);
}

// XP feeds the daily goal and the weekly league. Hitting the daily goal keeps the streak.
function addXp(n) {
  const today = dayStr();
  if (state.day.date !== today) state.day = { date: today, xp: 0 };
  if (state.week.id !== weekId()) state.week = { id: weekId(), xp: 0 };
  const before = state.day.xp;
  state.xp += n; state.day.xp += n; state.week.xp += n;
  if (before < DAILY_GOAL && state.day.xp >= DAILY_GOAL) {
    if (state.lastDay === dayStr(1)) state.streak += 1;
    else if (state.lastDay === dayStr(2) && state.freezes > 0) { state.freezes -= 1; state.frozeOn = dayStr(1); state.streak += 1; }
    else if (state.lastDay !== today) state.streak = 1;
    state.lastDay = today;
    if (state.streak >= 3) unlock('streak3');
  }
  if (state.week.xp >= LEAGUES[2].min) unlock('gold');
}

// Keys are prefixed with the sign language, e.g. "lsm:Ñ". (Old ASL progress had no prefix.)
const k = (id) => `${state.sl}:${id}`;
const has = (map, id) => map[k(id)] || (state.sl === 'asl' && map[id]);

export const store = {
  get: () => state,
  subscribe: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
  takeUnlocked: () => newlyUnlocked.splice(0),
  hasSign: (id) => !!has(state.signs, id),
  unitIsDone: (id) => !!has(state.units, id),
  questIsDone: (id) => !!has(state.quests, id),
  // Streak as it stands today: alive if the goal was met today or yesterday
  // (or the day before, when a freeze can cover the gap).
  currentStreak() {
    if ([dayStr(), dayStr(1)].includes(state.lastDay)) return state.streak;
    if (state.lastDay === dayStr(2) && state.freezes > 0) return state.streak;
    return 0;
  },
  todayXp: () => (state.day.date === dayStr() ? state.day.xp : 0),
  weekXp: () => (state.week.id === weekId() ? state.week.xp : 0),
  league() {
    const xp = store.weekXp();
    let i = 0;
    LEAGUES.forEach((l, j) => { if (xp >= l.min) i = j; });
    return { ...LEAGUES[i], index: i, next: LEAGUES[i + 1] || null, xp };
  },
  setUi(ui) { state.ui = ui; save(); },
  setSl(sl) { state.sl = sl; save(); },
  setSound(on) { state.sound = on; save(); },
  buyFreeze() {
    if (state.xp < FREEZE_COST || state.freezes >= 2) return false;
    state.xp -= FREEZE_COST; state.freezes += 1; save(); return true;
  },
  signCorrect(sign, xp = 10, perfect = false) {
    state.signs[k(sign)] = (state.signs[k(sign)] || 0) + 1;
    if (perfect) { state.perfect += 1; if (state.perfect >= 10) unlock('perfect10'); }
    addXp(xp);
    unlock('first');
    const total = Object.values(state.signs).reduce((a, b) => a + b, 0);
    if (total >= 10) unlock('ten');
    if (ALPHABET_BY_LANG[state.sl].every((s) => has(state.signs, s))) unlock('alphabet');
    save();
  },
  unitDone(id) {
    state.units[k(id)] = true; addXp(50); unlock('unit');
    const list = UNITS_BY_LANG[state.sl];
    if (id === list[list.length - 1].id) unlock('family'); // the "words for family" unit
    save();
  },
  questDone(id) { state.quests[k(id)] = true; addXp(100); unlock('quest'); save(); },
  dailyDone() { unlock('daily'); save(); },
  sprintScore(score) {
    state.best = Math.max(state.best, score);
    addXp(Math.round(score / 20));
    if (score >= 1000) unlock('sprint');
    save();
  },
  setName(name) { state.name = name.slice(0, 20); save(); },
  reset() { const { ui, sl, sound } = state; state = { ...fresh(), ui, sl, sound }; save(); },
};
