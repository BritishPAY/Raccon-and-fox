import { classify, matches } from './classifier.js';
import { isMotion, detectMotion } from './motion.js';
import { camera } from './camera.js';
import { sign, ACHIEVEMENTS } from './content.js';
import { store } from './store.js';
import { t, L, ui, sl } from './i18n.js';
import { tier, chime } from './gamify.js';
import { personal, featureVector, roughlyRight } from './personal.js';
import { isWord, detectWord } from './words.js';
import './handanim.js';

// Current-language info for a sign
export const S = (id) => sign(id, sl(), ui());

export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Animated 3D hand: folds from an open hand into the letter, moving fingers outlined.
export function handDiagram(signId, size = 140) {
  const s = S(signId);
  return `<span class="hand-pic" style="width:${size}px;height:${size}px"><sign-hand sign="${signId}" lang="${sl()}" size="${size}"></sign-hand>${s.word ? `<span class="motion-badge">${t('word.badge')}</span>` : s.motion ? `<span class="motion-badge">${t('motion.badge')}</span>` : ''}</span>`;
}

// A letter as a Lotería card: numbered frame, animated hand, name at the bottom.
const LOTERIA_ARTICLE = { es: 'La', en: '' };
export function lcard(signId, size = 160, extra = '') {
  const s = S(signId);
  const idx = ['A','B','C','D','E','F','G','H','I','J','K','L','LL','M','N','Ñ','O','P','Q','R','RR','S','T','U','V','W','X','Y','Z'];
  const list = sl() === 'lsm' ? idx : idx.filter((x) => !['LL', 'Ñ', 'RR'].includes(x));
  const n = s.word ? s.emoji : list.indexOf(signId) + 1 || '♥';
  const name = s.word || signId === 'ILY' ? s.label : `${LOTERIA_ARTICLE[ui()] ? LOTERIA_ARTICLE[ui()] + ' ' : ''}${s.short}`;
  return `<div class="lcard ${extra}" data-sign="${signId}" style="--w:${size}px"><span class="lnum">${n}</span><div class="lpic">${handDiagram(signId, Math.round(size * 0.82))}</div><span class="lname">${esc(name)}</span></div>`;
}

// ---------- Coaching: tell the learner what to fix ----------
const KEYS = ['index', 'middle', 'ring', 'pinky'];
function coachTip(target, f) {
  const s = S(target);
  for (let i = 0; i < 4; i++) {
    const e = f.ext[KEYS[i]], want = s.fingers[i];
    if (want === 'up' && e < 0.55) return t('tip.up', { f: t('f.' + KEYS[i]) });
    if (want === 'down' && e > 0.45) return t('tip.down', { f: t('f.' + KEYS[i]) });
  }
  if (s.point === 'side' && f.pointSide < 0.7) return t('tip.side');
  if (s.point === 'down' && f.pointUp > -0.4) return t('tip.pointDown');
  if (!s.point && s.fingers[0] === 'up' && f.pointUp < 0.3) return t('tip.pointUp');
  if (sl() === 'lsm' && target === 'G' && f.thumbIndexAngle > 0.6) return t('tip.thumbUp');
  if (s.thumb === 'out' && f.thumbOut < 0.65) return t('tip.thumbOut');
  if (['R', 'RR'].includes(target) && f.crossing > 0.05) return t('tip.cross');
  if (target === 'X' && sl() === 'asl' && f.indexTipBend < 1.4) return t('tip.hook');
  if (['M', 'N', 'T'].includes(target)) return t('tip.' + target);
  if (['across', 'tuck'].includes(s.thumb) && f.thumbOut > 0.85) return t('tip.tuck');
  if (s.spread && f.indexMiddleTips < 0.42) return t('tip.spread');
  if (target === 'U' && f.indexMiddleTips > 0.42) return t('tip.together');
  if (target === 'O' && f.thumbIndexTip > 0.3) return t('tip.touchAll');
  if (target === 'C' && f.thumbIndexTip < 0.3) return t('tip.gap');
  if ((target === 'F' && f.thumbIndexTip > 0.3) || (target === 'D' && f.thumbMiddleTip > 0.35)) return t('tip.touch');
  return t('tip.almost');
}

// ---------- Trainer: camera + live recognition + hold-to-confirm ----------
const HOLD_MS = 550;
const GRACE_MS = 160;
const RING = 2 * Math.PI * 52;

export function createTrainer(root, { compact = false } = {}) {
  root.innerHTML = `
    <div class="stage ${compact ? 'compact' : ''}">
      <div class="cam-box">
        <div class="cam-msg"></div>
        <svg class="hold-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="track"/><circle cx="60" cy="60" r="52" class="bar" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg>
        <div class="seen" hidden></div>
        <div class="mascot" hidden></div>
      </div>
      <div class="feedback" aria-live="polite">${t('tr.show')}</div>
      <div class="trainer-actions">
        <button class="btn ghost small teach" hidden>${t('teach.btn')}</button>
        <button class="btn ghost small skip" hidden>${t('tr.skip')}</button>
      </div>
    </div>`;
  const box = $('.cam-box', root), msg = $('.cam-msg', root), bar = $('.bar', root),
    fb = $('.feedback', root), seen = $('.seen', root), skipBtn = $('.skip', root), mascot = $('.mascot', root), teachBtn = $('.teach', root);
  camera.mount(box);
  camera.start();

  let target = null, onSuccess = null, holdStart = null, lastMatch = 0, cooldownUntil = 0, ema = null, skipTimer = null;
  let precSum = 0, precN = 0;
  // "Teach it my hand": after a while on the same letter, if the hand is
  // roughly right (fingers up/down as expected) but the rules still miss it,
  // the learner can record ~1 s of their own version of the sign.
  let targetSince = 0, roughFrames = 0, teaching = null;
  const COLORS = { idle: '#1fb59a', green: '#1fb59a', yellow: '#ffc94a', red: '#ff6b4a' };
  const history = [];
  let lastFace = null, faceByMe = false; // word signs need to know where the face is

  const setProgress = (p) => (bar.style.strokeDashoffset = RING * (1 - Math.min(1, p)));

  const unsub = camera.subscribe((ev) => {
    if (ev.type === 'status') {
      const text = { loading: t('cam.loading'), error: t('cam.' + (ev.error || 'load')), idle: t('cam.off') }[ev.status];
      msg.textContent = text || '';
      msg.hidden = ev.status === 'ready';
      if (ev.status === 'error') skipBtn.hidden = false;
      return;
    }
    if (ev.type === 'face') { if (ev.points) lastFace = { t: performance.now(), points: ev.points }; return; }
    if (ev.type !== 'frame' || !target) return;
    const now = performance.now();
    if (now < cooldownUntil) return;
    if (!ev.points) {
      ema = null; holdStart = null; setProgress(0); camera.color = COLORS.idle;
      fb.textContent = t('tr.show'); fb.className = 'feedback';
      seen.hidden = true;
      return;
    }
    // the hand often hides the face, so keep the last face seen in the past 3 s
    const face = lastFace && now - lastFace.t < 3000 ? lastFace.points : null;
    history.push({ t: now, points: ev.points, face });
    while (history.length && now - history[0].t > 2400) history.shift();
    if (isWord(target, sl())) {
      const m = detectWord(target, sl(), history, now);
      setProgress(m.progress);
      seen.hidden = true;
      if (m.done) return succeed();
      const s = S(target);
      fb.className = m.stage === 'shape' ? 'feedback' : 'feedback good';
      fb.textContent = m.stage === 'shape' ? t('w.shape', { how: s.how })
        : m.stage === 'place' ? t('w.place', { where: t('place.' + (s.at || 'up')) })
        : m.noFace ? t('w.face') : t('w.move', { how: t('move.' + s.move) });
      camera.color = m.stage === 'shape' ? COLORS.red : COLORS.yellow;
      return;
    }
    if (isMotion(target, sl())) {
      const m = detectMotion(target, history, now, sl());
      setProgress(m.progress);
      seen.hidden = true;
      if (m.done) return succeed();
      fb.className = m.shape ? 'feedback good' : 'feedback';
      fb.textContent = m.shape ? t('tr.move', { how: S(target).how }) : t('tr.shape', { s: target });
      return;
    }
    const { scores, features } = classify(ev.points, sl(), personal.get(sl()));
    const rough = roughlyRight(features, S(target));
    roughFrames = rough ? roughFrames + 1 : 0;
    if (teaching) {
      if (rough) teaching.push(featureVector(features));
      if (now - teaching.start > 1200) {
        const vectors = teaching.slice(1);
        teaching = null;
        if (vectors.length >= 8) { personal.add(sl(), target, vectors); toast(t('teach.saved', { s: S(target).short })); }
        else toast(t('teach.failed'));
      }
      fb.textContent = t('teach.recording'); fb.className = 'feedback good';
      return;
    }
    teachBtn.hidden = !(now - targetSince > 8000 && roughFrames > 10 && !isMotion(target, sl()));
    ema = ema ? Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, 0.5 * v + 0.5 * ema[k]])) : scores;
    let best = null;
    for (const k in ema) if (!best || ema[k] > ema[best]) best = k;
    seen.hidden = !(ema[best] > 0.55);
    seen.textContent = t('tr.see', { s: S(best).short });
    seen.classList.toggle('good', best === target);

    if (matches(target, ema)) {
      lastMatch = now;
      if (holdStart == null) { precSum = 0; precN = 0; }
      holdStart ??= now;
      precSum += ema[target]; precN++;
      camera.color = ema[target] >= 0.9 ? COLORS.green : COLORS.yellow; // live skeleton color
      const p = (now - holdStart) / HOLD_MS;
      setProgress(p);
      fb.textContent = t('tr.hold'); fb.className = 'feedback good';
      if (p >= 1) succeed();
    } else if (now - lastMatch > GRACE_MS) {
      holdStart = null; setProgress(0); camera.color = COLORS.red;
      fb.className = 'feedback';
      fb.textContent = best !== target && ema[best] > 0.6
        ? t('tr.looks', { s: S(best).short, tip: coachTip(target, features) })
        : coachTip(target, features);
    }
  });

  function succeed(skipped = false) {
    const cb = onSuccess;
    const moving = isMotion(target, sl()) || isWord(target, sl());
    const tr = tier(moving ? 0.8 : precN ? precSum / precN : 0);
    const xp = Math.round(10 * tr.mult);
    holdStart = null; ema = null; setProgress(0); history.length = 0;
    cooldownUntil = performance.now() + 650;
    clearTimeout(skipTimer); skipBtn.hidden = camera.status !== 'error'; teachBtn.hidden = true;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); // reading offsetWidth restarts the CSS animation
    camera.color = COLORS.idle;
    if (!skipped) {
      store.signCorrect(target, xp, tr.id === 'green');
      chime(tr.id);
      mascot.textContent = '🦊 ' + t({ green: 'tr.perfect', yellow: 'tr.good', red: 'tr.ok' }[tr.id], { xp });
      mascot.className = `mascot ${tr.id}`; mascot.hidden = false;
      clearTimeout(mascot._t); mascot._t = setTimeout(() => (mascot.hidden = true), 1400);
      flushAchievements();
    }
    fb.textContent = skipped ? t('tr.skipped') : t({ green: 'tr.perfect', yellow: 'tr.good', red: 'tr.ok' }[tr.id], { xp }); fb.className = 'feedback good';
    target = null; onSuccess = null;
    cb?.({ skipped, tier: tr.id, xp });
  }
  skipBtn.onclick = () => target && succeed(true);
  teachBtn.onclick = () => { if (target) { teaching = Object.assign([], { start: performance.now() }); teachBtn.hidden = true; } };

  return {
    setTarget(sign, cb) {
      target = sign; onSuccess = cb; holdStart = null; setProgress(0);
      clearTimeout(skipTimer);
      skipBtn.hidden = camera.status !== 'error';
      skipTimer = setTimeout(() => (skipBtn.hidden = false), 20000);
      targetSince = performance.now(); roughFrames = 0; teaching = null; teachBtn.hidden = true;
      history.length = 0;
      if (isWord(sign, sl())) { faceByMe = true; camera.enableFace(true); }
      else if (faceByMe) { faceByMe = false; camera.enableFace(false); }
    },
    clear() { target = null; onSuccess = null; setProgress(0); clearTimeout(skipTimer); skipBtn.hidden = true; teachBtn.hidden = true; },
    destroy() { unsub(); clearTimeout(skipTimer); if (faceByMe) camera.enableFace(false); },
  };
}

// ---------- Small effects ----------
export function confetti() {
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = ['#ff6b4a', '#1fb59a', '#ffc94a', '#6c5ce7', '#ff9ec7'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.3 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.append(p);
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 2200);
}

export function toast(html, ms = 2800) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html;
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

export function flushAchievements() {
  for (const id of store.takeUnlocked()) {
    const a = ACHIEVEMENTS[id];
    toast(`<span class="toast-emoji">${a.emoji}</span><div><b>${t('ach.unlocked')}</b><br>${esc(L(a.title))}</div>`);
  }
}
