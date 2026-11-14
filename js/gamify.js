// Game feel: precision tiers, sounds, vibration and shareable milestone cards.
import { store } from './store.js';

// Precision = how closely the held handshape matched the letter (0..1).
// Green 90%+ → 1.5× XP "Perfect Snap"; yellow 75–89% → 1×; below → accepted at 0.5×
// with a nudge to clean it up (we never block the learner: no hearts, no lockouts).
export function tier(precision) {
  if (precision >= 0.9) return { id: 'green', mult: 1.5, color: '#1fb59a' };
  if (precision >= 0.75) return { id: 'yellow', mult: 1, color: '#ffc94a' };
  return { id: 'red', mult: 0.5, color: '#ff6b4a' };
}

let audio;
function tone(freq, start, dur, type = 'sine', gain = 0.12) {
  const ctx = audio, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur + 0.05);
}
export function chime(kind = 'yellow') {
  if (!store.get().sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (kind === 'green') { tone(784, 0, 0.18); tone(988, 0.08, 0.18); tone(1319, 0.16, 0.35); }
    else if (kind === 'goal') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle')); }
    else if (kind === 'red') tone(440, 0, 0.2, 'triangle', 0.08);
    else { tone(660, 0, 0.15); tone(880, 0.07, 0.25); }
  } catch { /* audio unavailable */ }
  try { navigator.vibrate?.(kind === 'green' || kind === 'goal' ? [20, 40, 30] : 25); } catch { /* ignore */ }
}

// A 1080×1080 card for Instagram Stories / LinkedIn / WhatsApp.
export async function shareCard({ emoji, title, line, foot, fileName = 'signify.png' }) {
  const c = document.createElement('canvas');
  c.width = c.height = 1080;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, '#f3f0fb'); bg.addColorStop(1, '#fff1d1');
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080);
  g.fillStyle = '#ffffff';
  roundRect(g, 90, 160, 900, 760, 60); g.fill();
  g.textAlign = 'center';
  g.font = '220px serif'; g.fillText(emoji, 540, 470);
  g.fillStyle = '#24195e';
  g.font = '800 72px "Bricolage Grotesque", sans-serif'; wrap(g, title, 540, 600, 820, 80);
  g.fillStyle = '#5a5285'; g.font = '400 40px "Atkinson Hyperlegible", sans-serif'; wrap(g, line, 540, 760, 820, 50);
  g.fillStyle = '#e4007c'; g.font = '800 44px "Bricolage Grotesque", sans-serif'; g.fillText('🤟 Signify', 540, 1010);
  if (foot) { g.fillStyle = '#5a5285'; g.font = '400 30px "Atkinson Hyperlegible", sans-serif'; g.fillText(foot, 540, 120); }
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], fileName, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title }); return 'shared'; }
  } catch { /* fall back to download */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
  return 'downloaded';
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrap(g, text, x, y, max, lh) {
  const words = String(text).split(' ');
  let line = '', yy = y;
  for (const w of words) {
    if (g.measureText(line + w).width > max && line) { g.fillText(line.trim(), x, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  g.fillText(line.trim(), x, yy);
}
