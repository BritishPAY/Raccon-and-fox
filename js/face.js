// Facial grammar drills: raised eyebrows (yes/no questions), furrowed brows
// (WH-questions) and a head shake (negation), from MediaPipe Face Landmarker.
// Each learner's neutral face is measured first, so the drills react to a
// change from *their* resting face, not to absolute values.

const avg = (...v) => v.reduce((a, b) => a + (b || 0), 0) / v.length;
export const raiseOf = (b) => avg(b.browInnerUp, b.browOuterUpLeft, b.browOuterUpRight);
export const furrowOf = (b) => avg(b.browDownLeft, b.browDownRight);
// Where the nose sits between the two sides of the face: ~0.5 facing forward.
export const yawOf = (lm) => (lm ? (lm[1].x - lm[234].x) / ((lm[454].x - lm[234].x) || 1) : null);

export function createFaceDrill(kind) {
  const base = [];
  let held = 0, lastT = 0;
  const yaws = [];
  return {
    // returns { phase: 'calibrating'|'go', progress 0..1, done }
    update({ blend, landmarks }, t) {
      if (!landmarks) return { phase: 'noface', progress: 0, done: false };
      const dt = lastT ? Math.min(100, t - lastT) : 0;
      lastT = t;
      if (base.length < 15) {
        base.push({ raise: raiseOf(blend), furrow: furrowOf(blend) });
        return { phase: 'calibrating', progress: base.length / 15, done: false };
      }
      const b0 = { raise: avg(...base.map((b) => b.raise)), furrow: avg(...base.map((b) => b.furrow)) };
      if (kind === 'shake') {
        yaws.push({ t, y: yawOf(landmarks) });
        while (yaws.length && t - yaws[0].t > 2000) yaws.shift();
        const n = swings(yaws.map((p) => p.y), 0.05, 0.07);
        return { phase: 'go', progress: Math.min(1, n / 3), done: n >= 3 };
      }
      const delta = kind === 'raise' ? raiseOf(blend) - b0.raise : furrowOf(blend) - b0.furrow;
      const on = delta > 0.22;
      held = on ? held + dt : Math.max(0, held - dt * 2);
      return { phase: 'go', progress: Math.min(1, held / 600), done: held >= 600, level: Math.max(0, Math.min(1, delta / 0.4)) };
    },
  };
}

// Count left/right swings larger than `min` (with hysteresis).
export function swings(xs, hyst, min) {
  if (xs.length < 3) return 0;
  let dir = 0, ext = xs[0], start = xs[0], n = 0;
  for (const x of xs.slice(1)) {
    if (dir >= 0 && x > ext) ext = x;
    if (dir <= 0 && x < ext) ext = x;
    if (dir === 0 && Math.abs(x - start) > hyst) { dir = Math.sign(x - start); ext = x; }
    else if (dir !== 0 && (ext - x) * dir > hyst) { if (Math.abs(ext - start) >= min) n++; start = ext; ext = x; dir = -dir; }
  }
  if (dir !== 0 && Math.abs(ext - start) >= min) n++;
  return n;
}
