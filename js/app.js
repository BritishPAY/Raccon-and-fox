import { UNITS_BY_LANG, QUESTS_BY_LANG, ACHIEVEMENTS, ALPHABET_BY_LANG, SIGN_LANGS, CULTURE, signIds, stepSigns } from './content.js';
import { store, DAILY_GOAL, LEAGUES, FREEZE_COST } from './store.js';
import { chime, shareCard } from './gamify.js';
import { createFaceDrill } from './face.js';
import { personal } from './personal.js';
import { camera } from './camera.js';
import { classify } from './classifier.js';
import { isMotion } from './motion.js';
import { t, L, ui, sl } from './i18n.js';
import { $, esc, S, handDiagram, lcard, createTrainer, confetti, toast, flushAchievements } from './ui.js';

const app = $('#app');
let cleanup = null;
const units = () => UNITS_BY_LANG[sl()];
const quests = () => QUESTS_BY_LANG[sl()];
const slName = () => SIGN_LANGS[sl()].short;

// ---------------- Router ----------------
function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, params: new URLSearchParams(query) };
}

function route() {
  cleanup?.(); cleanup = null;
  const { parts, params } = parseHash();
  const [page, id] = parts;
  // a duel link carries its sign language
  const linkSl = params.get('sl');
  if (linkSl && SIGN_LANGS[linkSl] && linkSl !== sl()) store.setSl(linkSl);
  const views = { learn: viewLearn, lesson: viewLesson, quest: viewQuest, sprint: viewSprint, lab: viewLab, badges: viewBadges, daily: viewDaily, culture: viewCulture };
  const usesCamera = ['lesson', 'quest', 'sprint', 'lab', 'daily', 'culture'].includes(page);
  if (!usesCamera) camera.stop();
  renderChrome();
  (views[page] || viewHome)(id, params);
  const navPage = { lesson: 'learn', lab: 'learn', daily: 'learn' }[page] || page || 'home';
  if (page !== 'culture') camera.enableFace(false);
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === navPage));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// Header, footer and the two language switches
function renderChrome() {
  document.documentElement.lang = ui();
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.innerHTML = t(el.dataset.i18n)));
  $('#settings').innerHTML = `
    <div class="seg" role="group" aria-label="${t('set.sl')}" title="${t('set.sl')}">${Object.entries(SIGN_LANGS).map(([k, v]) => `<button data-sl="${k}" class="${k === sl() ? 'on' : ''}" title="${esc(L(v.name))}">${v.flag} ${v.short}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="${t('set.ui')}" title="${t('set.ui')}">${['en', 'es'].map((k) => `<button data-ui="${k}" class="${k === ui() ? 'on' : ''}">${k.toUpperCase()}</button>`).join('')}</div>
    <div class="seg"><button data-sound="1" title="${t('set.sound')}" aria-label="${t('set.sound')}">${store.get().sound ? '🔊' : '🔇'}</button></div>`;
  renderStats();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('#settings button');
  if (!b) return;
  if (b.dataset.sound) { store.setSound(!store.get().sound); b.textContent = store.get().sound ? '🔊' : '🔇'; return; }
  if (b.dataset.ui && b.dataset.ui !== ui()) store.setUi(b.dataset.ui);
  else if (b.dataset.sl && b.dataset.sl !== sl()) {
    store.setSl(b.dataset.sl);
    // lesson / quest ids differ per language: go back to the path
    if (/^#\/(lesson|quest)/.test(location.hash)) { location.hash = '#/learn'; return; }
  } else return;
  route();
});

function renderStats() {
  const s = store.get(), today = store.todayXp(), pct = Math.min(1, today / DAILY_GOAL);
  $('#stats').innerHTML = `<a href="#/daily" class="goal" title="${t('daily.goal', { xp: today, goal: DAILY_GOAL })}" style="--p:${pct}"><span>${pct >= 1 ? '✓' : Math.round(pct * 100) + '%'}</span></a><span title="${t('stats.streak')}">🔥 ${store.currentStreak()}${s.freezes ? ` <small title="${t('daily.freezes')}">🧊${s.freezes}</small>` : ''}</span><span title="${t('stats.xp')}">⭐ ${s.xp}</span>`;
}
store.subscribe(renderStats);

// ---------------- Home ----------------
function viewHome() {
  const s = store.get();
  const next = units().find((u) => !store.unitIsDone(u.id)) || units()[0];
  const heroSign = sl() === 'asl' ? 'ILY' : 'A';
  app.innerHTML = `
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">${t('home.eyebrow')}</p>
      <h1>${t('home.h1a')} ${t('home.h1b')}</h1>
      <p class="lead">${t('home.lead', { sl: esc(L(SIGN_LANGS[sl()].name)) + ` (${slName()})` })}</p>
      <div class="cta">
        <a class="btn primary" href="#/lesson/${next.id}">${s.xp ? t('home.continue') : t('home.start')}</a>
        <a class="btn ghost" href="#/daily">${t('home.try')}</a>
      </div>
      <p class="fine">${t('home.private')}</p>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="hero-deck">${lcard('B', 150, 'deck-l')}${lcard('Y', 150, 'deck-r')}${lcard(heroSign, 220, 'deck-c')}</div>
    </div>
  </section>

  ${todayCard()}

  <section class="how">
    <div><b>1</b><h3>${t('how.1h')}</h3><p>${t('how.1p')}</p></div>
    <div><b>2</b><h3>${t('how.2h')}</h3><p>${t('how.2p')}</p></div>
    <div><b>3</b><h3>${t('how.3h')}</h3><p>${t('how.3p')}</p></div>
  </section>

  <section class="modes">
    <a class="mode" href="#/learn"><span class="mode-emoji">🗺️</span><h3>${t('mode.path.h')}</h3><p>${t('mode.path.p', { n: units().length, sl: slName() })}</p></a>
    <a class="mode" href="#/quest/q1"><span class="mode-emoji">📖</span><h3>${t('mode.story.h')}</h3><p>${t('mode.story.p')}</p></a>
    <a class="mode" href="#/sprint"><span class="mode-emoji">⚡</span><h3>${t('mode.sprint.h')}</h3><p>${t('mode.sprint.p')}</p></a>
    <a class="mode" href="#/culture"><span class="mode-emoji">🧠</span><h3>${t('mode.culture.h')}</h3><p>${t('mode.culture.p')}</p></a>
  </section>

  <section class="why">
    <h2>${t('why.h')}</h2>
    <div class="why-grid"><p>${t('why.1')}</p><p>${t('why.2')}</p><p>${t('why.3')}</p></div>
  </section>

  <section class="plans">
    <h2>${t('plans.h')}</h2>
    <div class="plan-grid">
      <div class="plan"><h3>${t('plans.free')}</h3><p class="price">$0</p><ul><li>${t('plans.free.1')}</li><li>${t('plans.free.2')}</li><li>${t('plans.free.3')}</li></ul><a class="btn ghost" href="#/learn">${t('plans.start')}</a></div>
      <div class="plan featured"><span class="tag">${t('plans.trial')}</span><h3>Premium</h3><p class="price">$11.99<span>${t('plans.month')}</span></p><p class="muted">${t('plans.orYear')}</p><ul><li>${t('plans.pre.1')}</li><li>${t('plans.pre.2')}</li><li>${t('plans.pre.3')}</li></ul><button class="btn soon" disabled>${t('plans.soon')}</button></div>
      <div class="plan"><h3>${t('plans.family')}</h3><p class="price">$129<span>${t('plans.year')}</span></p><ul><li>${t('plans.fam.1')}</li><li>${t('plans.fam.2')}</li><li>${t('plans.fam.3')}</li></ul><button class="btn soon" disabled>${t('plans.soon')}</button></div>
    </div>
  </section>`;
}


// ---------------- Today card: daily goal, streak, league ----------------
function todayCard() {
  const s = store.get(), today = store.todayXp(), lg = store.league();
  const pct = Math.min(1, today / DAILY_GOAL);
  const next = units().find((u) => !store.unitIsDone(u.id));
  return `<section class="today">
    <div class="today-goal"><div class="ring" style="--p:${pct}"><b>${today}</b><span>/ ${DAILY_GOAL} XP</span></div>
      <div><h3>${pct >= 1 ? t('daily.doneToday') : t('daily.title')}</h3><p class="muted">${t('daily.sub')}</p>
      <a class="btn primary small" href="#/daily">${pct >= 1 ? t('daily.again') : t('daily.start')}</a></div></div>
    <div class="today-stat"><b>🔥 ${store.currentStreak()}</b><span>${t('stats.streak')}${s.freezes ? ` · 🧊 ${s.freezes}` : ''}</span></div>
    <a class="today-stat" href="#/badges"><b>${lg.emoji} ${t('league.' + lg.id)}</b><span>${lg.next ? t('league.toNext', { n: lg.next.min - lg.xp, name: t('league.' + lg.next.id) }) : t('league.top')}</span></a>
    ${next && s.xp ? `<a class="today-stat" href="#/lesson/${next.id}"><b>${next.emoji} ${esc(L(next.title))}</b><span>${t('daily.continue')}</span></a>` : ''}
  </section>`;
}

// ---------------- Daily 5-minute warm-up ----------------
function viewDaily() {
  const ids = ALPHABET_BY_LANG[sl()];
  const learned = ids.filter((id) => store.hasSign(id) && !isMotion(id, sl()));
  const poolBase = learned.length >= 4 ? learned : units()[0].steps.map((x) => x.sign);
  // pick 6 letters + 1 family word, different each day
  const seedDay = Math.floor(Date.now() / 864e5) + (sl() === 'lsm' ? 7 : 0);
  let a = seedDay;
  const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  const picks = [];
  while (picks.length < Math.min(6, poolBase.length)) { const p = poolBase[Math.floor(rnd() * poolBase.length)]; if (!picks.includes(p) || poolBase.length < 3) picks.push(p); }
  const words = units()[units().length - 1].steps.filter((x) => x.word);
  const steps = [...picks.map((sign) => ({ sign })), words[Math.floor(rnd() * words.length)]];
  const tips = [...CULTURE.culture, ...CULTURE.face.filter((c) => !c.only || c.only === sl())];
  const tip = tips[seedDay % tips.length];
  let stepIdx = 0, letterIdx = 0, perfect = 0, gained = 0;
  app.innerHTML = `
    <div class="lesson-head"><a href="#/" class="back">✕</a><div class="progress"><div class="progress-bar"></div></div><span class="step-count"></span></div>
    <div class="lesson"><div class="lesson-card"></div><div class="trainer"></div></div>`;
  const card = $('.lesson-card'), bar = $('.progress-bar'), count = $('.step-count');
  const trainer = createTrainer($('.trainer'));
  let timer;
  cleanup = () => { trainer.destroy(); clearTimeout(timer); };
  const show = () => {
    const step = steps[stepIdx];
    card.innerHTML = `<p class="eyebrow">☀️ ${t('daily.title')} · ${slName()}</p>${signCard(step, letterIdx)}`;
    bar.style.width = `${(stepIdx / steps.length) * 100}%`;
    count.textContent = `${stepIdx + 1}/${steps.length}`;
    trainer.setTarget(stepSigns(step, sl())[letterIdx], (r) => {
      if (!r.skipped) { gained += r.xp; if (r.tier === 'green') perfect++; }
      if (letterIdx + 1 < stepSigns(step, sl()).length) { letterIdx++; timer = setTimeout(show, 450); return; }
      letterIdx = 0; stepIdx++;
      timer = setTimeout(stepIdx < steps.length ? show : finish, 650);
    });
  };
  const finish = () => {
    trainer.clear();
    store.dailyDone();
    flushAchievements();
    confetti(); chime('goal');
    bar.style.width = '100%';
    const today = store.todayXp();
    card.innerHTML = `<div class="done-card"><div class="big-emoji">☀️</div><h2>${t('daily.finished')}</h2>
      <p>+${gained} XP · ✨ ${perfect} Perfect Snap · 🔥 ${store.currentStreak()}</p>
      <p class="muted">${today >= DAILY_GOAL ? t('daily.goalMet') : t('daily.goalLeft', { n: DAILY_GOAL - today })}</p>
      <div class="tip-card"><span>${tip.icon}</span><div><b>${t('daily.tip')}: ${esc(L(tip.title))}</b><p>${esc(L(tip.text))}</p></div></div>
      <div class="cta"><a class="btn primary" href="#/culture">${t('culture.more')}</a><a class="btn ghost" href="#/sprint">${t('lesson.sprint')}</a></div></div>`;
  };
  show();
}

// ---------------- Beyond the hands: facial grammar, grammar basics, Deaf culture ----------------
function viewCulture() {
  const byLang = (list) => list.filter((c) => !c.only || c.only === sl());
  const cards = (list) => byLang(list).map((c) => `<div class="cul-card">${c.icon ? `<span class="cul-icon">${c.icon}</span>` : ''}<h3>${esc(L(c.title))}</h3><p>${esc(L(c.text))}</p>${c.drill ? `<button class="btn ghost small" data-drill="${c.drill}">${t('culture.try')}</button>` : ''}</div>`).join('');
  app.innerHTML = `
    <p class="eyebrow">${slName()}</p>
    <h1 class="page-title">${t('culture.title')}</h1>
    <p class="lead">${t('culture.lead')}</p>
    <h2 class="section-title">${t('culture.face')}</h2>
    <div class="cul-face">
      <div class="cul-grid">${cards(CULTURE.face)}</div>
      <div class="cul-drill">
        <div class="stage"><div class="cam-box face-cam"><div class="cam-msg"></div><svg class="hold-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="track"/><circle cx="60" cy="60" r="52" class="bar" stroke-dasharray="326.7" stroke-dashoffset="326.7"/></svg><div class="mascot" hidden></div></div>
        <div class="feedback" id="drill-fb">${t('culture.pick')}</div></div>
        <div class="drill-btns">${['raise', 'furrow', 'shake'].map((d) => `<button class="btn ghost small" data-drill="${d}">${t('drill.' + d)}</button>`).join('')}</div>
      </div>
    </div>
    <h2 class="section-title">${t('culture.grammar')}</h2>
    <div class="cul-grid wide">${cards(CULTURE.grammar)}</div>
    <h2 class="section-title">${t('culture.deaf')}</h2>
    <div class="cul-grid wide">${cards(CULTURE.culture)}</div>
    <h2 class="section-title">${t('culture.res')}</h2>
    ${sl() === 'lsm' ? `<p>${esc(L(CULTURE.lsmNote))}</p>` : ''}
    <ul class="res">${CULTURE.resources[sl()].map((r) => `<li><a href="${r.url}" target="_blank" rel="noopener">${esc(L(r.name))}</a></li>`).join('')}</ul>`;

  const box = $('.face-cam'), msg = $('.cam-msg', box), fb = $('#drill-fb'), bar = $('.face-cam .bar'), mascot = $('.face-cam .mascot');
  let drill = null, kind = null, started = false;
  const RING = 326.7;
  const setP = (p) => (bar.style.strokeDashoffset = RING * (1 - Math.min(1, p)));
  const unsub = camera.subscribe((ev) => {
    if (ev.type === 'status') { msg.hidden = ev.status === 'ready'; msg.textContent = { loading: t('cam.loading'), error: t('cam.' + (ev.error || 'load')) }[ev.status] || ''; return; }
    if (ev.type === 'faceError') { fb.textContent = t('cam.load'); return; }
    if (ev.type !== 'face' || !drill) return;
    const r = drill.update(ev, performance.now());
    if (r.phase === 'noface') { fb.textContent = t('drill.noface'); fb.className = 'feedback'; return; }
    if (r.phase === 'calibrating') { fb.textContent = t('drill.neutral'); fb.className = 'feedback'; setP(0); return; }
    setP(r.progress);
    fb.textContent = t('drill.do.' + kind); fb.className = r.progress > 0.2 ? 'feedback good' : 'feedback';
    if (r.done) {
      drill = null; setP(1);
      store.signCorrect('face:' + kind, 10, false); flushAchievements(); chime('green');
      mascot.textContent = '🦊 ' + t('drill.done.' + kind); mascot.className = 'mascot green'; mascot.hidden = false;
      setTimeout(() => (mascot.hidden = true), 1800);
      fb.textContent = t('drill.done.' + kind) + ' +10 XP'; fb.className = 'feedback good';
    }
  });
  const onClick = (e) => {
    const b = e.target.closest('[data-drill]');
    if (!b) return;
    kind = b.dataset.drill; drill = createFaceDrill(kind); setP(0);
    if (!started) { started = true; camera.mount(box); camera.start().then(() => camera.enableFace(true)); }
    fb.textContent = t('drill.neutral');
    document.querySelector('.cul-drill').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  app.addEventListener('click', onClick);
  cleanup = () => { unsub(); camera.enableFace(false); app.removeEventListener('click', onClick); };
}

// ---------------- Learning path ----------------
function viewLearn() {
  const list = units();
  const alpha = ALPHABET_BY_LANG[sl()];
  const got = alpha.filter((id) => store.hasSign(id)).length;
  app.innerHTML = `
  <h1 class="page-title">${t('learn.title', { sl: slName() })}</h1>
  <section class="tabla-wrap">
    <div><h2>${t('tabla.title')}</h2><p class="muted">${t('tabla.sub', { n: got, total: alpha.length })}</p></div>
    <div class="tabla">${alpha.map((id, i) => `<div class="tile ${store.hasSign(id) ? 'got' : ''}" title="${esc(S(id).short)}"><span class="lnum">${i + 1}</span><b>${esc(id)}</b>${store.hasSign(id) ? '<i class="bean" aria-label="learned"></i>' : ''}</div>`).join('')}</div>
  </section>
  <div class="path">
    ${list.map((u, i) => {
      const done = store.unitIsDone(u.id);
      const isNext = !done && list.slice(0, i).every((p) => store.unitIsDone(p.id));
      return `<a class="unit ${done ? 'done' : ''} ${isNext ? 'next' : ''}" href="#/lesson/${u.id}">
        <span class="unit-emoji">${done ? '✅' : u.emoji}</span>
        <div><h3>${i + 1}. ${esc(L(u.title))}</h3><p>${esc(L(u.blurb))}</p>
        <div class="chips">${u.steps.map((st) => `<span class="chip">${esc(st.word || S(st.sign).short)}${!st.word && isMotion(st.sign, sl()) ? ' ✍️' : ''}</span>`).join('')}</div></div>
        <span class="unit-go">${done ? t('learn.replay') : isNext ? t('learn.start') : t('learn.open')}</span></a>`;
    }).join('')}
  </div>
  <h2 class="section-title">${t('learn.stories')}</h2>
  <div class="quests">
    ${quests().map((q) => `<a class="quest-card ${store.questIsDone(q.id) ? 'done' : ''}" href="#/quest/${q.id}">
      <span class="unit-emoji">${store.questIsDone(q.id) ? '✅' : q.emoji}</span><div><h3>${esc(L(q.title))}</h3><p>${esc(L(q.blurb))}</p></div></a>`).join('')}
  </div>
  <p class="fine center"><a href="#/badges">${t('learn.badges')}</a></p>`;
}

// ---------------- Lesson ----------------
function signCard(step, letterIdx = 0) {
  const seq = stepSigns(step, sl());
  const cur = seq[letterIdx];
  const info = S(cur);
  return `
    ${step.word ? `<div class="word">${seq.map((l, i) => `<span class="${i < letterIdx ? 'done' : i === letterIdx ? 'cur' : ''}">${l}</span>`).join('')}</div><p class="muted">${t('lesson.spell', { word: esc(step.word) })}</p>` : ''}
    <div class="sign-card">
      <figure class="hand-fig">${lcard(cur, step.word ? 150 : 180)}<figcaption>${t('lesson.caption')}</figcaption></figure>
      <div><div class="sign-label">${esc(info.label)}</div><p>${esc(info.how)}</p></div>
    </div>`;
}

function viewLesson(id) {
  const list = units();
  const unit = list.find((u) => u.id === id) || list[0];
  let stepIdx = 0, letterIdx = 0, correct = 0;
  app.innerHTML = `
    <div class="lesson-head"><a href="#/learn" class="back">✕</a><div class="progress"><div class="progress-bar"></div></div><span class="step-count"></span></div>
    <div class="lesson">
      <div class="lesson-card"></div>
      <div class="trainer"></div>
    </div>`;
  const card = $('.lesson-card'), bar = $('.progress-bar'), count = $('.step-count');
  const trainer = createTrainer($('.trainer'));
  let timer;
  cleanup = () => { trainer.destroy(); clearTimeout(timer); };

  function show() {
    const step = unit.steps[stepIdx];
    card.innerHTML = `<p class="eyebrow">${esc(L(unit.title))} · ${slName()}</p>${signCard(step, letterIdx)}`;
    bar.style.width = `${(stepIdx / unit.steps.length) * 100}%`;
    count.textContent = `${stepIdx + 1}/${unit.steps.length}`;
    trainer.setTarget(stepSigns(step, sl())[letterIdx], ({ skipped }) => {
      if (!skipped) correct++;
      const seq = stepSigns(step, sl());
      if (letterIdx + 1 < seq.length) { letterIdx++; timer = setTimeout(show, 450); return; }
      letterIdx = 0; stepIdx++;
      timer = setTimeout(stepIdx < unit.steps.length ? show : finish, 650);
    });
  }

  function finish() {
    trainer.clear();
    store.unitDone(unit.id);
    flushAchievements();
    confetti();
    bar.style.width = '100%';
    const next = list[list.indexOf(unit) + 1];
    const quest = quests().find((q) => q.needs === unit.id);
    card.innerHTML = `
      <div class="done-card"><div class="big-emoji">🎉</div><h2>${t('lesson.done')}</h2>
      <p>${t('lesson.stats', { n: correct, xp: correct * 10 + 50 })}</p>
      <div class="cta">
        ${quest ? `<a class="btn primary" href="#/quest/${quest.id}">${t('lesson.story', { title: esc(L(quest.title)) })}</a>` : ''}
        ${next ? `<a class="btn ${quest ? 'ghost' : 'primary'}" href="#/lesson/${next.id}">${t('lesson.next')}</a>` : `<a class="btn primary" href="#/sprint">${t('lesson.sprint')}</a>`}
      </div></div>`;
  }
  show();
}

// ---------------- Story quest ----------------
function viewQuest(id) {
  const list = quests();
  const quest = list.find((q) => q.id === id) || list[0];
  let i = 0, letterIdx = 0;
  app.innerHTML = `
    <div class="lesson-head"><a href="#/learn" class="back">✕</a><h2 class="quest-title">${quest.emoji} ${esc(L(quest.title))} · ${slName()}</h2></div>
    <div class="lesson">
      <div class="chat-col"><div class="chat"></div><div class="prompt"></div></div>
      <div class="trainer"></div>
    </div>`;
  const chat = $('.chat'), promptEl = $('.prompt');
  const trainer = createTrainer($('.trainer'));
  let timer;
  cleanup = () => { trainer.destroy(); clearTimeout(timer); };

  const say = (who, html) => {
    const avatar = { mia: '<span class="avatar mia">M</span>', you: `<span class="avatar you">${t('quest.you')}</span>`, narrator: '' }[who];
    chat.insertAdjacentHTML('beforeend', `<div class="msg ${who}">${avatar}<div class="text">${html}</div></div>`);
    chat.scrollTop = chat.scrollHeight;
  };
  const fmt = (s) => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');

  function next() {
    if (i >= quest.script.length) return finish();
    const line = quest.script[i];
    if (line.who !== 'you') {
      say(line.who, fmt(L(line.text)));
      i++;
      timer = setTimeout(next, line.who === 'narrator' ? 1600 : 1300);
      return;
    }
    askYou(line);
  }

  function askYou(line) {
    promptEl.innerHTML = `<p class="prompt-q">👉 ${esc(L(line.prompt))}</p>${signCard(line, letterIdx)}${line.note ? `<p class="fine">${esc(L(line.note))}</p>` : ''}`;
    trainer.setTarget(stepSigns(line, sl())[letterIdx], () => {
      const seq = stepSigns(line, sl());
      if (letterIdx + 1 < seq.length) { letterIdx++; timer = setTimeout(() => askYou(line), 450); return; }
      letterIdx = 0;
      promptEl.innerHTML = '';
      say('you', `<b>${esc(line.word ? seq.join('-') : S(line.sign).label)}</b>`);
      i++;
      timer = setTimeout(next, 700);
    });
  }

  function finish() {
    trainer.clear();
    store.questDone(quest.id);
    flushAchievements();
    confetti();
    const nextQ = list[list.indexOf(quest) + 1];
    promptEl.innerHTML = `<div class="done-card"><div class="big-emoji">📖</div><h2>${t('quest.done')}</h2><p>+100 XP</p>
      <div class="cta">${nextQ ? `<a class="btn primary" href="#/quest/${nextQ.id}">${t('quest.next')}</a>` : ''}<a class="btn ${nextQ ? 'ghost' : 'primary'}" href="#/sprint">${t('lesson.sprint')}</a></div></div>`;
  }
  next();
}

// ---------------- Sign Sprint + duel ----------------
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

const SPRINT_SECONDS = 60;
function viewSprint(_, params) {
  const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
  const vs = Number(params.get('vs')) || 0;
  const from = (params.get('from') || '').slice(0, 20);
  const s = store.get();
  app.innerHTML = `
    <div class="sprint">
      <div class="sprint-side">
        <div class="sprint-intro">
          <p class="eyebrow">Sign Sprint · ${slName()}</p>
          ${vs ? `<h1>${t('sprint.duel', { from: esc(from || t('sprint.friend')), vs })}</h1><p>${t('sprint.duelSub')}</p>` : `<h1>${t('sprint.h')}</h1><p>${t('sprint.sub')}</p>`}
          <p class="muted">${t('sprint.best', { n: s.best })}</p>
          <button class="btn primary big" id="go">${t('sprint.start')}</button>
        </div>
        <div class="sprint-play" hidden>
          <div class="sprint-top"><span class="clock">60</span><span class="score">0</span><span class="combo">x1</span></div>
          <div class="beat"><i></i></div>
          <div class="target"></div>
          <div class="timebar"><div></div></div>
        </div>
        <div class="sprint-end" hidden></div>
      </div>
      <div class="trainer"></div>
    </div>`;
  const trainer = createTrainer($('.trainer'));
  let tick, deadline, perSign, score = 0, combo = 0, done = 0, current, endAt;
  const rnd = mulberry32(seed);
  const pool = signIds(sl());
  cleanup = () => { trainer.destroy(); clearInterval(tick); };

  $('#go').onclick = () => {
    $('.sprint-intro').hidden = true;
    $('.sprint-play').hidden = false;
    endAt = performance.now() + SPRINT_SECONDS * 1000;
    nextSign();
    tick = setInterval(update, 100);
  };

  function nextSign() {
    let pick;
    do { pick = pool[Math.floor(rnd() * pool.length)]; } while (pick === current);
    current = pick;
    // moving letters get a little more time
    perSign = Math.max(2500, 6000 - done * 150) + (isMotion(current, sl()) ? 2000 : 0);
    deadline = performance.now() + perSign;
    $('.target').innerHTML = lcard(current, 170);
    trainer.setTarget(current, ({ skipped }) => {
      if (skipped) { combo = 0; return nextSign(); }
      const left = Math.max(0, deadline - performance.now()) / perSign;
      combo++; done++;
      const mult = Math.min(2, 1 + (combo - 1) * 0.1);
      const pts = Math.round((100 + left * 100) * mult);
      score += pts;
      floatPts(`+${pts}`);
      nextSign();
    });
  }

  function floatPts(text) {
    const el = document.createElement('div');
    el.className = 'float-pts'; el.textContent = text;
    $('.sprint-play').append(el);
    setTimeout(() => el.remove(), 900);
  }

  function update() {
    const now = performance.now();
    $('.clock').textContent = Math.max(0, Math.ceil((endAt - now) / 1000));
    $('.score').textContent = score;
    $('.combo').textContent = `x${Math.min(2, 1 + Math.max(0, combo - 1) * 0.1).toFixed(1)}`;
    $('.timebar div').style.width = `${Math.max(0, (deadline - now) / perSign) * 100}%`;
    if (now > deadline) { combo = 0; nextSign(); }
    if (now >= endAt) end();
  }

  function end() {
    clearInterval(tick);
    trainer.clear();
    store.sprintScore(score);
    flushAchievements();
    if (score > 0) confetti();
    const won = vs && score > vs;
    $('.sprint-play').hidden = true;
    const endEl = $('.sprint-end');
    endEl.hidden = false;
    endEl.innerHTML = `
      <p class="eyebrow">${t('sprint.time')}</p>
      <h1>${t('sprint.points', { n: score })}</h1>
      <p>${t('sprint.signs', { n: done })}${vs ? ` · ${won ? t('sprint.won', { from: esc(from || t('sprint.friend')) }) : t('sprint.lost', { from: esc(from || t('sprint.Friend')), vs })}` : ''}</p>
      <div class="share">
        <label>${t('sprint.challenge')}</label>
        <input id="name" placeholder="${t('sprint.name')}" value="${esc(store.get().name)}" maxlength="20">
        <button class="btn primary" id="share">${t('sprint.copy')}</button>
      </div>
      <div class="cta"><a class="btn ghost" href="#/sprint?r=${Date.now()}">${t('sprint.again')}</a><a class="btn ghost" href="#/learn">${t('sprint.practice')}</a></div>`;
    $('#share').onclick = async () => {
      const name = $('#name').value.trim();
      store.setName(name);
      const url = `${location.origin}${location.pathname}#/sprint?seed=${seed}&vs=${score}&sl=${sl()}${name ? `&from=${encodeURIComponent(name)}` : ''}`;
      try {
        if (navigator.share) await navigator.share({ title: 'Signify duel', text: t('sprint.shareText', { n: score, sl: slName() }), url });
        else { await navigator.clipboard.writeText(url); toast(t('sprint.copied')); }
      } catch { window.prompt(t('sprint.copyPrompt'), url); }
    };
  }
}

// ---------------- Progress: league, streak freezes, achievements, share cards ----------------
function viewBadges() {
  const s = store.get();
  const alphabet = ALPHABET_BY_LANG[sl()];
  const learned = alphabet.filter((k) => store.hasSign(k)).length;
  const lg = store.league();
  app.innerHTML = `
    <h1 class="page-title">${t('badges.title', { sl: slName() })}</h1>
    <div class="stat-row"><div><b>${s.xp}</b><span>${t('badges.xp')}</span></div><div><b>${store.currentStreak()}</b><span>${t('badges.streak')}</span></div><div><b>${learned}/${alphabet.length}</b><span>${t('badges.letters')}</span></div><div><b>✨ ${s.perfect}</b><span>Perfect Snap</span></div></div>
    <div class="league-row">
      <div class="league-card">
        <h3>${t('league.title')}</h3>
        <div class="league-steps">${LEAGUES.map((l, i) => `<div class="${i <= lg.index ? 'on' : ''}"><span>${l.emoji}</span><b>${t('league.' + l.id)}</b><small>${l.min}+ XP</small></div>`).join('')}</div>
        <p class="muted">${t('league.week', { xp: lg.xp })} ${lg.next ? t('league.toNext', { n: lg.next.min - lg.xp, name: t('league.' + lg.next.id) }) : t('league.top')}</p>
        <p class="fine">${t('league.note')}</p>
      </div>
      <div class="league-card">
        <h3>🧊 ${t('freeze.title')}</h3>
        <p>${t('freeze.text', { cost: FREEZE_COST })}</p>
        <p><b>${t('freeze.have', { n: s.freezes })}</b></p>
        <button class="btn ghost small" id="buy-freeze" ${s.xp < FREEZE_COST || s.freezes >= 2 ? 'disabled' : ''}>${t('freeze.buy', { cost: FREEZE_COST })}</button>
      </div>
    </div>
    <div class="cta"><button class="btn primary" id="share-progress">📤 ${t('share.progress')}</button></div>
    <div class="badges">${Object.entries(ACHIEVEMENTS).map(([id, a]) => `<div class="badge ${s.achievements[id] ? 'got' : ''}"><span>${a.emoji}</span><h3>${esc(L(a.title))}${id === 'family' ? ` · ${slName()}` : ''}</h3><p>${esc(L(a.desc))}</p>${s.achievements[id] ? `<button class="linkish" data-share="${id}">📤 ${t('share.badge')}</button>` : ''}</div>`).join('')}</div>
    <p class="fine center">${personal.count(sl()) ? `<button class="linkish" id="forget-hand">${t('teach.forget', { n: personal.count(sl()) })}</button> · ` : ''}<button class="linkish" id="reset">${t('badges.reset')}</button></p>`;
  $('#forget-hand')?.addEventListener('click', () => { personal.clear(sl()); viewBadges(); });
  $('#reset').onclick = () => { if (confirm(t('badges.confirm'))) { store.reset(); viewBadges(); } };
  $('#buy-freeze').onclick = () => { if (store.buyFreeze()) { chime('yellow'); toast(t('freeze.bought')); viewBadges(); } };
  $('#share-progress').onclick = () => shareCard({
    emoji: '🤟', title: t('share.cardTitle', { n: learned, sl: slName() }),
    line: t('share.cardLine', { streak: store.currentStreak(), xp: s.xp, league: t('league.' + lg.id) }), fileName: 'signify-progress.png',
  });
  app.querySelectorAll('[data-share]').forEach((b) => (b.onclick = () => {
    const a = ACHIEVEMENTS[b.dataset.share];
    shareCard({ emoji: a.emoji, title: L(a.title) + (b.dataset.share === 'family' ? ` · ${slName()}` : ''), line: L(a.desc), foot: t('share.foot'), fileName: `signify-${b.dataset.share}.png` });
  }));
}

// ---------------- Lab: see what the model sees ----------------
// Also records a 2-second measurement of one letter (numbers only, no images)
// that can be pasted to the team to tune recognition on real hands.
const LAB_KEYS = ['ext.index', 'ext.middle', 'ext.ring', 'ext.pinky', 'ext.thumb', 'thumbOut', 'thumbIndexTip', 'thumbMiddleTip', 'thumbMiddlePip',
  'indexMiddleTips', 'indexTipToWrist', 'thumbIndexAngle', 'thumbAcross', 'thumbAlong', 'thumbVsKnuckles', 'crossing', 'pointUp', 'pointSide', 'indexMcpBend', 'indexTipBend'];
const getF = (f, k) => k.split('.').reduce((o, x) => o?.[x], f);

function viewLab() {
  const ids = signIds(sl());
  app.innerHTML = `
    <h1 class="page-title">${t('lab.title', { sl: slName() })}</h1>
    <p class="muted">${t('lab.sub')}</p>
    <div class="lab-rec">
      <label>${t('lab.letter')} <select id="lab-letter">${ids.map((id) => `<option value="${id}">${esc(S(id).short)}</option>`).join('')}</select></label>
      <button class="btn primary small" id="lab-go">${t('lab.record')}</button>
      <span id="lab-status" class="muted"></span>
    </div>
    <textarea id="lab-out" class="lab-out" readonly hidden></textarea>
    <div class="lesson"><div class="lab-scores"></div><div class="trainer"></div></div>`;
  const trainer = createTrainer($('.trainer'));
  const out = $('.lab-scores');
  let rec = null;
  const unsub = camera.subscribe((ev) => {
    if (ev.type !== 'frame') return;
    if (!ev.points) { out.innerHTML = `<p class="muted">${t('lab.none')}</p>`; return; }
    const { scores, best, features: f } = classify(ev.points, sl(), personal.get(sl()));
    if (rec) rec.frames.push({ f, scores, best });
    out.innerHTML = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
      `<div class="score-row ${k === best && v > 0.55 ? 'top' : ''}"><span>${esc(S(k).short)}</span><div class="sbar"><i style="width:${(v * 100).toFixed(0)}%"></i></div><span>${v.toFixed(2)}</span></div>`).join('') +
      `<pre class="feat">${LAB_KEYS.map((k) => `${k} ${getF(f, k).toFixed(2)}`).join('  ')}</pre>`;
  });
  $('#lab-go').onclick = async () => {
    if (rec) return;
    const letter = $('#lab-letter').value, status = $('#lab-status');
    for (const n of [3, 2, 1]) { status.textContent = t('lab.ready', { n, s: S(letter).short }); await new Promise((r) => setTimeout(r, 700)); }
    status.textContent = t('lab.recording');
    rec = { frames: [] };
    await new Promise((r) => setTimeout(r, 2000));
    const frames = rec.frames; rec = null;
    if (frames.length < 5) { status.textContent = t('lab.none'); return; }
    const stat = {};
    for (const k of LAB_KEYS) {
      const v = frames.map((x) => getF(x.f, k)).sort((a, b) => a - b);
      stat[k] = [v[0], v[Math.floor(v.length / 2)], v[v.length - 1]].map((x) => +x.toFixed(2));
    }
    const bestCount = {};
    frames.forEach((x) => (bestCount[x.best] = (bestCount[x.best] || 0) + 1));
    const target = frames.map((x) => x.scores[letter] ?? 0).sort((a, b) => a - b);
    const summary = { sl: sl(), letter, frames: frames.length, targetScore: +target[Math.floor(target.length / 2)].toFixed(2), seenAs: bestCount, features_min_med_max: stat };
    const text = JSON.stringify(summary);
    const box = $('#lab-out');
    box.hidden = false;
    box.value = (box.value ? box.value + '\n' : '') + text;
    try { await navigator.clipboard.writeText(box.value); status.textContent = t('lab.copied'); } catch { status.textContent = t('lab.copyManual'); }
  };
  cleanup = () => { unsub(); trainer.destroy(); };
}

route();
