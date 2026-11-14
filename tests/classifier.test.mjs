// Run: node tests/classifier.test.mjs
// Synthetic 3D hands (js/handmodel.js) are randomly rotated, scaled, mirrored
// and jittered — what a real camera does — and each must be recognised as
// itself and not as any other letter. J and Z are tested as motion sequences.
import { classify, matches, STATIC_BY_LANG } from '../js/classifier.js';
import { detectMotion } from '../js/motion.js';
import { POSES, POSES_LSM, hand, orient, STRAIGHT, THUMB_OUT, rad } from '../js/handmodel.js';

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function rotate(p, ax, ay, az) {
  let { x, y, z } = p;
  [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
  [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
  [x, y] = [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az)];
  return { x, y, z };
}
// Camera view: y flipped (image y points down), random pose/scale/mirror/noise.
function camera(pts, { jitter = 0.03, view } = {}) {
  const v = view || { ax: rad((rnd() - 0.5) * 40), ay: rad((rnd() - 0.5) * 40), az: rad((rnd() - 0.5) * 50), scale: 80 + rnd() * 140, mirror: rnd() < 0.5 ? -1 : 1, dx: 0, dy: 0 };
  return pts.map((p) => {
    const r = rotate(p, v.ax, v.ay, v.az);
    return {
      x: (r.x * v.mirror + (rnd() - 0.5) * jitter) * v.scale + v.dx,
      y: (-r.y + (rnd() - 0.5) * jitter) * v.scale + v.dy,
      z: (r.z + (rnd() - 0.5) * jitter) * v.scale,
    };
  });
}

let failures = 0;
const TRIALS = 200;
for (const sign of STATIC_BY_LANG.asl) {
  const clean = classify(camera(POSES[sign], { jitter: 0, view: { ax: 0, ay: 0, az: 0, scale: 100, mirror: 1, dx: 0, dy: 0 } }));
  let ok = 0;
  const confused = {};
  for (let i = 0; i < TRIALS; i++) {
    const { scores } = classify(camera(POSES[sign]));
    if (matches(sign, scores)) ok++;
    for (const other of STATIC_BY_LANG.asl) if (other !== sign && matches(other, scores)) confused[other] = (confused[other] || 0) + 1;
  }
  const rate = ok / TRIALS;
  const fa = Object.entries(confused).map(([k, v]) => `${k}:${v}`).join(' ');
  const pass = clean.best === sign && rate >= 0.9 && Object.values(confused).every((v) => v / TRIALS < 0.05);
  if (!pass) failures++;
  console.log(`${pass ? '✓' : '✗'} ${sign.padEnd(3)} clean=${clean.best}(${clean.bestScore.toFixed(2)}) hit=${(rate * 100).toFixed(0)}%${fa ? '  confused→ ' + fa : ''}`);
}

// Shapes that are not letters must not be accepted as anything.
const NEGATIVE = {
  'open 5': hand({ index: STRAIGHT, middle: STRAIGHT, ring: STRAIGHT, pinky: STRAIGHT, spread: { index: -18, middle: -4, ring: 10, pinky: 24 }, thumbTip: THUMB_OUT }),
  'relaxed half-curl': hand({ index: [45, 45, 20], middle: [50, 50, 20], ring: [55, 55, 25], pinky: [60, 60, 25], thumbTip: { x: -0.6, y: 0.7, z: -0.3 } }),
};
for (const [name, pose] of Object.entries(NEGATIVE)) {
  const hits = {};
  for (let i = 0; i < TRIALS; i++) {
    const { scores } = classify(camera(pose));
    for (const s of STATIC_BY_LANG.asl) if (matches(s, scores)) hits[s] = (hits[s] || 0) + 1;
  }
  const bad = Object.entries(hits).filter(([, v]) => v / TRIALS >= 0.05);
  if (bad.length) failures++;
  console.log(`${bad.length ? '✗' : '✓'} negative "${name}"${bad.length ? ' accepted as ' + bad.map(([k, v]) => `${k}:${v}`).join(' ') : ''}`);
}

// ---- Motion letters ----
function sequence(frames) {
  return frames.map((points, i) => ({ t: i * 33, points }));
}
function jMotion(view) {
  // pinky up → hand drops and rolls ~100° so the pinky hooks sideways
  return sequence(Array.from({ length: 30 }, (_, i) => {
    const k = i / 29;
    return camera(orient(POSES.J, -100 * k).map((p) => ({ ...p, y: p.y - 0.6 * k })), { view });
  }));
}
function zMotion(view) {
  // index tip: → then ↙ then →, moving down overall
  const path = [[0, 0], [0.8, 0], [0, 0.5], [0.8, 0.5]];
  const pts = [];
  for (let s = 0; s < 3; s++) for (let i = 0; i < 12; i++) {
    const k = i / 12, [x0, y0] = path[s], [x1, y1] = path[s + 1];
    pts.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
  }
  return sequence(pts.map(([x, y]) => camera(POSES.Z.map((p) => ({ x: p.x + x, y: p.y - y, z: p.z })), { view })));
}
const still = (pose, view) => sequence(Array.from({ length: 30 }, () => camera(pose, { view })));
const randomView = () => ({ ax: rad((rnd() - 0.5) * 30), ay: rad((rnd() - 0.5) * 30), az: rad((rnd() - 0.5) * 30), scale: 80 + rnd() * 140, mirror: rnd() < 0.5 ? -1 : 1, dx: 0, dy: 0 });

for (const [letter, make] of [['J', jMotion], ['Z', zMotion]]) {
  let hit = 0, falseStill = 0, wrongLetter = 0;
  for (let i = 0; i < 100; i++) {
    const view = randomView();
    const seq = make(view);
    const now = seq[seq.length - 1].t;
    if (detectMotion(letter, seq, now).done) hit++;
    if (detectMotion(letter, still(POSES[letter], view), now).done) falseStill++;
    if (detectMotion(letter === 'J' ? 'Z' : 'J', seq, now).done) wrongLetter++;
  }
  const pass = hit >= 90 && falseStill === 0 && wrongLetter <= 5;
  if (!pass) failures++;
  console.log(`${pass ? '✓' : '✗'} ${letter} motion hit=${hit}%  holding still→${falseStill}  read as other→${wrongLetter}`);
}

// ---- Mexican Sign Language (LSM) ----
console.log('\nLSM');
for (const sign of STATIC_BY_LANG.lsm) {
  let ok = 0;
  const confused = {};
  for (let i = 0; i < TRIALS; i++) {
    const { scores } = classify(camera(POSES_LSM[sign]), 'lsm');
    if (matches(sign, scores)) ok++;
    for (const other of STATIC_BY_LANG.lsm) if (other !== sign && matches(other, scores)) confused[other] = (confused[other] || 0) + 1;
  }
  const fa = Object.entries(confused).map(([k, v]) => `${k}:${v}`).join(' ');
  const pass = ok / TRIALS >= 0.9 && Object.values(confused).every((v) => v / TRIALS < 0.05);
  if (!pass) failures++;
  if (!pass || ['G', 'H'].includes(sign)) console.log(`${pass ? '✓' : '✗'} ${sign.padEnd(3)} hit=${(ok / TRIALS * 100).toFixed(0)}%${fa ? '  confused→ ' + fa : ''}`);
}
// moving LSM letters: shape + movement, and the same shape held still must NOT count
const move = (pose, fn, view) => sequence(Array.from({ length: 36 }, (_, i) => {
  const k = i / 35, o = fn(k);
  return camera(pose.map((p) => ({ x: p.x + o.x, y: p.y + o.y, z: p.z + (o.z || 0) })), { view: o.scale ? { ...view, scale: view.scale * o.scale } : view });
}));
const LSM_MOVES = {
  K: (k) => ({ x: 0, y: 0.6 * k }),
  'Ñ': (k) => ({ x: 0.25 * Math.sin(k * Math.PI * 4), y: 0 }),
  Q: (k) => ({ x: 0.25 * Math.sin(k * Math.PI * 4), y: 0 }),
  RR: (k) => ({ x: 0.25 * Math.sin(k * Math.PI * 4), y: 0 }),
  LL: (k) => ({ x: 0.7 * k, y: 0 }),
  X: (k) => ({ x: 0, y: 0, scale: 1 + 0.35 * Math.sin(k * Math.PI) }),
};
for (const [letter, fn] of Object.entries(LSM_MOVES)) {
  let hit = 0, still = 0;
  for (let i = 0; i < 100; i++) {
    const view = randomView();
    const seq = move(POSES_LSM[letter], fn, view);
    const now = seq[seq.length - 1].t;
    if (detectMotion(letter, seq, now, 'lsm').done) hit++;
    if (detectMotion(letter, move(POSES_LSM[letter], () => ({ x: 0, y: 0 }), view), now, 'lsm').done) still++;
  }
  const pass = hit >= 90 && still === 0;
  if (!pass) failures++;
  console.log(`${pass ? '✓' : '✗'} LSM ${letter.padEnd(2)} motion hit=${hit}%  holding still→${still}`);
}

console.log(failures ? `\n${failures} check(s) failing` : '\nAll checks pass');
process.exit(failures ? 1 : 0);
