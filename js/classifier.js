// Signify handshape classifier — ASL and LSM fingerspelling.
// Input: 21 MediaPipe hand landmarks rescaled to an isotropic space
// (x*width, y*height, z*width; y points DOWN like the image).
// Shape rules use joint angles and normalised distances, so they work for left
// and right hands and a mirrored camera. A few letters (G H P Q, and K/U/V…)
// also use which way the index finger points on screen.
// J and Z are drawn in the air — see motion.js.

import { featureVector, personalScores } from './personal.js';

const WRIST = 0;
const FINGERS = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (v) => Math.hypot(v.x, v.y, v.z);
const dist = (a, b) => len(sub(a, b));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function angle(u, v) {
  return Math.acos(clamp(dot(u, v) / (len(u) * len(v) || 1), -1, 1));
}

// Fuzzy helpers: 0..1 ramps.
export const hi = (v, a, b) => (v <= a ? 0 : v >= b ? 1 : (v - a) / (b - a));
export const lo = (v, a, b) => 1 - hi(v, a, b);
const band = (v, a0, a1, b0, b1) => Math.min(hi(v, a0, a1), lo(v, b0, b1));

// 1 = straight finger, 0 = fully curled (sum of bends at MCP, PIP, DIP).
function fingerExtension(p, [mcp, pip, dip, tip]) {
  const a0 = angle(sub(p[mcp], p[WRIST]), sub(p[pip], p[mcp]));
  const a1 = angle(sub(p[pip], p[mcp]), sub(p[dip], p[pip]));
  const a2 = angle(sub(p[dip], p[pip]), sub(p[tip], p[dip]));
  return clamp(1 - (a0 + a1 + a2) / 3.6, 0, 1);
}

function thumbExtension(p) {
  const t = angle(sub(p[2], p[1]), sub(p[3], p[2])) + angle(sub(p[3], p[2]), sub(p[4], p[3]));
  return clamp(1 - t / 1.6, 0, 1);
}

export function extractFeatures(p) {
  const size = dist(p[WRIST], p[9]) || 1; // wrist → middle knuckle
  const n = (i, j) => dist(p[i], p[j]) / size;
  // Position along the knuckle line (index knuckle = 0, pinky knuckle = 1)
  const across = sub(p[17], p[5]);
  const t = (i) => dot(sub(p[i], p[5]), across) / (dot(across, across) || 1);
  // Position along the palm (wrist = 0, middle knuckle = 1)
  const along = sub(p[9], p[WRIST]);
  const s = (i) => dot(sub(p[i], p[WRIST]), along) / (dot(along, along) || 1);
  // Screen direction of the index finger (y down → negative = pointing up)
  const d = sub(p[8], p[5]);
  const d2 = Math.hypot(d.x, d.y) || 1;
  return {
    ext: {
      index: fingerExtension(p, FINGERS.index),
      middle: fingerExtension(p, FINGERS.middle),
      ring: fingerExtension(p, FINGERS.ring),
      pinky: fingerExtension(p, FINGERS.pinky),
      thumb: thumbExtension(p),
    },
    indexMcpBend: angle(sub(p[5], p[WRIST]), sub(p[6], p[5])),
    indexTipBend: angle(sub(p[6], p[5]), sub(p[7], p[6])) + angle(sub(p[7], p[6]), sub(p[8], p[7])),
    thumbOut: n(4, 5),
    thumbIndexTip: n(4, 8),
    thumbMiddleTip: n(4, 12),
    thumbMiddlePip: n(4, 10),
    indexMiddleTips: n(8, 12),
    indexTipToWrist: n(8, 0),
    middleTipToWrist: n(12, 0),
    thumbIndexAngle: angle(sub(p[8], p[5]), sub(p[4], p[2])),
    cOpposition: angle(sub(p[8], p[4]), sub(p[9], p[WRIST])),
    thumbAcross: t(4), // <0 beside the index, ~0.2 T, ~0.5 N, ~0.85 M
    thumbAlong: s(4), // how high the thumb tip sits on the hand
    // thumb tip height relative to the bent knuckles right next to it:
    // clearly below them = thumb wraps the front of the fist (S);
    // level with them = thumb tucked between fingers (T N M)
    thumbVsKnuckles: (() => {
      const tt = Math.max(0, Math.min(1, t(4)));
      const pips = [6, 10, 14, 18].map((i) => ({ t: t(i), s: s(i) }));
      let a = pips[0], b = pips[pips.length - 1];
      for (let i = 0; i < pips.length - 1; i++) if (tt >= pips[i].t && tt <= pips[i + 1].t) { a = pips[i]; b = pips[i + 1]; }
      const k = b.t === a.t ? 0 : Math.max(0, Math.min(1, (tt - a.t) / (b.t - a.t)));
      return s(4) - (a.s + (b.s - a.s) * k);
    })(),
    middleTipAlong: s(12),
    crossing: t(12) - t(8), // <0 when middle finger crosses over the index (R)
    pointUp: -d.y / d2, // 1 up, -1 down
    pointSide: Math.abs(d.x) / d2, // 1 = horizontal
  };
}

// Finger-state shorthands
const up = (e) => hi(e, 0.55, 0.75);
const down = (e) => lo(e, 0.25, 0.45);
const tight = (e) => lo(e, 0.12, 0.25); // sharply bent (E)
const curved = (e) => Math.min(hi(e, 0.15, 0.3), lo(e, 0.75, 0.88));
const thumbOut = (f) => hi(f.thumbOut, 0.65, 0.85);
const thumbIn = (f) => lo(f.thumbOut, 0.65, 0.85);
const pointsUp = (f) => hi(f.pointUp, 0.3, 0.55);
const pointsSide = (f) => Math.min(hi(f.pointSide, 0.65, 0.85), lo(f.pointUp, 0.45, 0.65), hi(f.pointUp, -0.65, -0.45));
const pointsDown = (f) => hi(-f.pointUp, 0.3, 0.55);
const fist = (f) => Math.min(down(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), lo(f.indexTipToWrist, 0.95, 1.05));
const fistThumbUnder = (f) => hi(f.thumbVsKnuckles, -0.07, -0.02); // thumb tip pokes up between knuckles (M N T)

const RULES = {
  A: (f) => Math.min(fist(f), lo(f.thumbAcross, 0.05, 0.18), hi(f.ext.thumb, 0.25, 0.5)), // thumb straight-ish, beside the index
  B: (f) => Math.min(up(f.ext.index), up(f.ext.middle), up(f.ext.ring), up(f.ext.pinky), thumbIn(f), lo(f.indexMiddleTips, 0.3, 0.45), pointsUp(f)),
  C: (f) => Math.min(
    curved(f.ext.index), curved(f.ext.middle), curved(f.ext.ring), curved(f.ext.pinky),
    band(f.thumbIndexTip, 0.28, 0.42, 0.95, 1.15), hi(f.indexTipToWrist, 0.85, 1.0), lo(f.cOpposition, 0.35, 0.5),
  ),
  D: (f) => Math.min(up(f.ext.index), lo(f.ext.middle, 0.45, 0.6), lo(f.ext.ring, 0.45, 0.6), lo(f.ext.pinky, 0.45, 0.6), lo(f.thumbMiddleTip, 0.25, 0.4), pointsUp(f)),
  E: (f) => Math.min(
    tight(f.ext.index), tight(f.ext.middle), tight(f.ext.ring), tight(f.ext.pinky),
    hi(f.indexTipToWrist, 0.88, 1.0), // fingertips stay high, not buried in the palm
    lo(f.thumbMiddleTip, 0.3, 0.45), lo(f.thumbAlong, 0.95, 1.05),
  ),
  F: (f) => Math.min(up(f.ext.middle), up(f.ext.ring), up(f.ext.pinky), lo(f.ext.index, 0.5, 0.65), lo(f.thumbIndexTip, 0.22, 0.35)),
  G: (f) => Math.min(up(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), hi(f.ext.thumb, 0.45, 0.65), lo(f.thumbIndexAngle, 0.55, 0.8), pointsSide(f)),
  H: (f) => Math.min(hi(f.ext.index, 0.4, 0.6), hi(f.ext.middle, 0.4, 0.6), lo(f.ext.ring, 0.35, 0.55), lo(f.ext.pinky, 0.35, 0.55), lo(f.indexMiddleTips, 0.35, 0.5), Math.min(hi(f.pointSide, 0.55, 0.75), lo(f.pointUp, 0.55, 0.75), hi(f.pointUp, -0.75, -0.55))),
  I: (f) => Math.min(up(f.ext.pinky), down(f.ext.index), down(f.ext.middle), down(f.ext.ring), thumbIn(f)),
  K: (f) => Math.min(up(f.ext.index), hi(f.ext.middle, 0.45, 0.65), down(f.ext.ring), down(f.ext.pinky), lo(f.thumbMiddlePip, 0.28, 0.4), pointsUp(f)),
  L: (f) => Math.min(up(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), thumbOut(f), hi(f.ext.thumb, 0.45, 0.65), band(f.thumbIndexAngle, 0.75, 1.0, 2.2, 2.6), pointsUp(f)),
  M: (f) => Math.min(fist(f), fistThumbUnder(f), hi(f.thumbAcross, 0.62, 0.72)),
  N: (f) => Math.min(fist(f), fistThumbUnder(f), band(f.thumbAcross, 0.3, 0.4, 0.62, 0.72)),
  O: (f) => Math.min(
    lo(f.ext.index, 0.55, 0.7), lo(f.ext.middle, 0.55, 0.7), lo(f.ext.ring, 0.6, 0.75), lo(f.ext.pinky, 0.6, 0.75),
    hi(f.ext.index, 0.12, 0.22), // round, not the sharp E bend
    lo(f.thumbIndexTip, 0.22, 0.36), lo(f.thumbMiddleTip, 0.3, 0.45), hi(f.indexTipToWrist, 0.85, 1.0),
  ),
  P: (f) => Math.min(hi(f.ext.index, 0.5, 0.7), hi(f.ext.middle, 0.35, 0.55), down(f.ext.ring), down(f.ext.pinky), lo(f.thumbMiddlePip, 0.3, 0.45), pointsDown(f)),
  Q: (f) => Math.min(up(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), hi(f.ext.thumb, 0.45, 0.65), lo(f.thumbIndexAngle, 0.55, 0.8), hi(-f.pointUp, 0.55, 0.75)), // steeper than G
  R: (f) => Math.min(up(f.ext.index), up(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), lo(f.crossing, -0.02, 0.08), pointsUp(f)),
  S: (f) => Math.min(fist(f), lo(f.thumbVsKnuckles, -0.09, -0.04), band(f.thumbAcross, 0.05, 0.15, 0.8, 0.9)), // thumb across the front, below the knuckles
  T: (f) => Math.min(fist(f), fistThumbUnder(f), band(f.thumbAcross, -0.05, 0.05, 0.3, 0.4)),
  U: (f) => Math.min(up(f.ext.index), up(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), lo(f.indexMiddleTips, 0.3, 0.42), hi(f.crossing, 0.08, 0.16), hi(f.thumbMiddlePip, 0.3, 0.42), thumbIn(f), pointsUp(f)),
  V: (f) => Math.min(up(f.ext.index), up(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), hi(f.indexMiddleTips, 0.42, 0.55), hi(f.thumbMiddlePip, 0.3, 0.42), thumbIn(f), pointsUp(f)),
  W: (f) => Math.min(up(f.ext.index), up(f.ext.middle), up(f.ext.ring), down(f.ext.pinky), pointsUp(f)),
  X: (f) => Math.min(
    lo(f.indexMcpBend, 0.55, 0.8), hi(f.indexTipBend, 1.4, 1.8), // knuckle straight, finger hooked
    down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), lo(f.middleTipAlong, 0.75, 0.85),
    hi(f.thumbIndexTip, 0.3, 0.4),
  ),
  Y: (f) => Math.min(up(f.ext.pinky), down(f.ext.index), down(f.ext.middle), down(f.ext.ring), thumbOut(f), hi(f.ext.thumb, 0.45, 0.65)),
  ILY: (f) => Math.min(up(f.ext.index), up(f.ext.pinky), down(f.ext.middle), down(f.ext.ring), thumbOut(f)),
};

// ---- Mexican Sign Language (LSM) ----
// The LSM manual alphabet is close to ASL. Static letters that differ:
// G points up (index and thumb parallel), H has the thumb extended upward.
// J K Ñ Q X Z LL RR involve movement (see motion.js).
const claw = (f) => Math.min( // index + thumb bent like a claw, other fingers closed
  band(f.ext.index, 0.15, 0.25, 0.65, 0.78), band(f.thumbIndexTip, 0.22, 0.32, 0.75, 0.9),
  down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), hi(f.ext.thumb, 0.25, 0.45),
);
const LSM_RULES = {
  ...Object.fromEntries('ABCDEFILMNOPRSTUVWY'.split('').map((k) => [k, RULES[k]])),
  G: (f) => Math.min(up(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), hi(f.ext.thumb, 0.45, 0.65), lo(f.thumbIndexAngle, 0.55, 0.8), hi(f.thumbMiddleTip, 0.3, 0.45), pointsUp(f)), // thumb free, not closing a D
  H: (f) => Math.min(hi(f.ext.index, 0.4, 0.6), hi(f.ext.middle, 0.4, 0.6), lo(f.ext.ring, 0.35, 0.55), lo(f.ext.pinky, 0.35, 0.55), lo(f.indexMiddleTips, 0.35, 0.5), hi(f.thumbOut, 0.45, 0.65), lo(f.thumbAcross, 0.15, 0.3), lo(f.pointUp, 0.6, 0.8)),
};

// Handshape each moving letter starts from, per sign language.
export const MOTION_BASE = {
  asl: {
    J: (f) => Math.min(up(f.ext.pinky), down(f.ext.index), down(f.ext.middle), down(f.ext.ring)),
    Z: (f) => Math.min(up(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky)),
  },
};
MOTION_BASE.lsm = {
  ...MOTION_BASE.asl,
  K: (f) => Math.min(up(f.ext.index), hi(f.ext.middle, 0.45, 0.65), down(f.ext.ring), down(f.ext.pinky), lo(f.thumbMiddlePip, 0.3, 0.45)),
  'Ñ': (f) => Math.min(fist(f), fistThumbUnder(f), band(f.thumbAcross, 0.25, 0.35, 0.65, 0.75)),
  Q: claw,
  X: claw,
  LL: (f) => Math.min(up(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), thumbOut(f), band(f.thumbIndexAngle, 0.7, 0.95, 2.2, 2.6)),
  RR: (f) => Math.min(up(f.ext.index), up(f.ext.middle), down(f.ext.ring), down(f.ext.pinky), lo(f.crossing, -0.02, 0.08)),
};

const RULESETS = { asl: RULES, lsm: LSM_RULES };
export const STATIC_BY_LANG = { asl: Object.keys(RULES), lsm: Object.keys(LSM_RULES) };

// templates: optional personal recordings { sign: [featureVector, ...] }.
// A close match to the learner's own recording also counts (see personal.js).
export function classify(points, lang = 'asl', templates = null) {
  const features = extractFeatures(points);
  const scores = {};
  for (const [k, rule] of Object.entries(RULESETS[lang] || RULES)) scores[k] = rule(features);
  if (templates && Object.keys(templates).length) {
    const mine = personalScores(featureVector(features), templates);
    for (const [k, v] of Object.entries(mine)) if (k in scores) scores[k] = Math.max(scores[k], 0.95 * v);
  }
  let best = null;
  for (const k in scores) if (!best || scores[k] > scores[best]) best = k;
  return { scores, best, bestScore: scores[best], features };
}

// Is the user showing `target`? It must clear an absolute bar and be close to
// the strongest competing sign.
export const MATCH_THRESHOLD = 0.5;
export function matches(target, scores) {
  const s = scores[target] ?? 0;
  let other = 0;
  for (const [k, v] of Object.entries(scores)) if (k !== target && v > other) other = v;
  return s >= MATCH_THRESHOLD && s >= other * 0.9;
}

export function toIsotropic(landmarks, width, height) {
  return landmarks.map((l) => ({ x: l.x * width, y: l.y * height, z: (l.z || 0) * width }));
}
