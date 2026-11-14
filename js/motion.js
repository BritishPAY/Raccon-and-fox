// Letters drawn or moved in the air. We keep a short history of landmark
// frames and look at how the hand travelled while the right handshape was held.
//   ASL: J (pinky hook), Z (index draws Z)
//   LSM: J, Z, K (moves up), Ñ / Q / RR (wiggle side to side),
//        X (claw moves forward and back), LL (L slides sideways)
import { extractFeatures, MOTION_BASE } from './classifier.js';

const KIND = { J: 'J', Z: 'Z', K: 'up', 'Ñ': 'wiggle', Q: 'wiggle', RR: 'wiggle', X: 'forward', LL: 'side' };
export const MOTION_BY_LANG = { asl: ['J', 'Z'], lsm: ['J', 'K', 'Ñ', 'Q', 'X', 'Z', 'LL', 'RR'] };
export const isMotion = (letter, lang = 'asl') => MOTION_BY_LANG[lang]?.includes(letter);
export const motionKind = (letter) => KIND[letter];

const WINDOW_MS = 1800;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// history: [{ t, points }] (isotropic, y down). Returns { done, progress, shape }.
export function detectMotion(letter, history, now, lang = 'asl') {
  const recent = history.filter((h) => now - h.t <= WINDOW_MS && h.points);
  const base = MOTION_BASE[lang]?.[letter] || MOTION_BASE.asl[letter];
  const frames = recent.filter((h) => base(extractFeatures(h.points)) > 0.5);
  if (frames.length < 6) return { done: false, progress: frames.length / 30, shape: frames.length > 0 };
  const sizes = frames.map((h) => dist(h.points[0], h.points[9]));
  const size = sizes.reduce((a, b) => a + b, 0) / sizes.length || 1;
  switch (KIND[letter]) {
    case 'J': return detectJ(frames, size);
    case 'Z': return detectZ(frames, size);
    case 'up': return detectUp(frames, size);
    case 'side': return detectSide(frames, size);
    case 'wiggle': return detectWiggle(frames, size);
    case 'forward': return detectForward(frames, sizes);
    default: return { done: false, progress: 0, shape: true };
  }
}

// J: the pinky tip draws a hook — the hand moves and twists so the pinky,
// which starts pointing up, ends up pointing sideways or down.
function detectJ(frames, size) {
  const tips = frames.map((h) => h.points[20]);
  let path = 0;
  for (let i = 1; i < tips.length; i++) path += dist(tips[i], tips[i - 1]) / size;
  const dir = (p) => Math.atan2(p[20].y - p[17].y, p[20].x - p[17].x);
  const a0 = dir(frames[0].points), a1 = dir(frames[frames.length - 1].points);
  let turn = Math.abs(a1 - a0);
  if (turn > Math.PI) turn = 2 * Math.PI - turn;
  return { done: path >= 0.6 && turn >= 0.7, progress: Math.min(1, Math.min(path / 0.6, turn / 0.7)), shape: true };
}

// Count left/right strokes of a coordinate series (with hysteresis).
function strokes(xs, hyst) {
  let dirn = 0, ext = xs[0], start = xs[0];
  const out = [];
  for (let i = 1; i < xs.length; i++) {
    const x = xs[i];
    if (dirn >= 0 && x > ext) ext = x;
    if (dirn <= 0 && x < ext) ext = x;
    if (dirn === 0 && Math.abs(x - start) > hyst) { dirn = Math.sign(x - start); ext = x; }
    else if (dirn !== 0 && (ext - x) * dirn > hyst) { out.push(Math.abs(ext - start)); start = ext; ext = x; dirn = -dirn; }
  }
  out.push(Math.abs(ext - start));
  return out;
}

// Z: the index tip goes across, back diagonally, and across again —
// two left/right reversals while moving downward overall.
function detectZ(frames, size) {
  const xs = frames.map((h) => h.points[8].x / size);
  const ys = frames.map((h) => h.points[8].y / size);
  const big = strokes(xs, 0.18).filter((s) => s >= 0.3).length;
  const drop = ys[ys.length - 1] - ys[0];
  return { done: big >= 3 && drop >= 0.2, progress: Math.min(1, (big / 3) * 0.8 + (drop > 0.2 ? 0.2 : 0)), shape: true };
}

// K (LSM): the whole hand rises.
function detectUp(frames, size) {
  const ys = frames.map((h) => h.points[0].y / size);
  const rise = ys[0] - Math.min(...ys); // y grows downward
  return { done: rise >= 0.35, progress: Math.min(1, rise / 0.35), shape: true };
}

// LL (LSM): the L slides sideways.
function detectSide(frames, size) {
  const xs = frames.map((h) => h.points[0].x / size);
  const travel = Math.max(...xs) - Math.min(...xs);
  return { done: travel >= 0.45, progress: Math.min(1, travel / 0.45), shape: true };
}

// Ñ, Q, RR (LSM): wiggle side to side — at least two reversals.
function detectWiggle(frames, size) {
  const xs = frames.map((h) => h.points[0].x / size);
  const n = strokes(xs, 0.1).filter((s) => s >= 0.15).length;
  return { done: n >= 3, progress: Math.min(1, n / 3), shape: true };
}

// X (LSM): the claw moves toward the camera and back (the hand looks
// bigger, then smaller again), or bobs if the camera sees it from the side.
function detectForward(frames, sizes) {
  const max = Math.max(...sizes), min = Math.min(...sizes);
  const iMax = sizes.indexOf(max);
  const there = max / Math.min(sizes[0], sizes[sizes.length - 1]);
  const back = iMax > 0 && iMax < sizes.length - 1;
  const ys = frames.map((h) => h.points[0].y / (sizes.reduce((a, b) => a + b, 0) / sizes.length));
  const bob = strokes(ys, 0.08).filter((s) => s >= 0.12).length;
  const done = (there >= 1.15 && back && max / min >= 1.15) || bob >= 2;
  return { done, progress: Math.min(1, Math.max((there - 1) / 0.15, bob / 2)), shape: true };
}
