// Run: node tests/personal.test.mjs
// Personal calibration: a learner whose hand differs from the reference model
// records a few frames; afterwards their version is recognised, and other
// letters are still not confused with it.
import { classify, matches, extractFeatures, STATIC_BY_LANG } from '../js/classifier.js';
import { featureVector, roughlyRight } from '../js/personal.js';
import { POSES, hand, rad } from '../js/handmodel.js';
import { sign } from '../js/content.js';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function camera(pts) {
  const ax = rad((rnd() - 0.5) * 30), ay = rad((rnd() - 0.5) * 30), az = rad((rnd() - 0.5) * 40), sc = 80 + rnd() * 140, m = rnd() < 0.5 ? -1 : 1;
  return pts.map(({ x, y, z }) => {
    [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
    [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
    [x, y] = [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az)];
    const j = () => (rnd() - 0.5) * 0.03;
    return { x: (x * m + j()) * sc, y: (-y + j()) * sc, z: (z + j()) * sc };
  });
}
const record = (pose, n = 12) => Array.from({ length: n }, () => featureVector(extractFeatures(camera(pose))));

let failures = 0;
const check = (ok, msg) => { if (!ok) failures++; console.log(`${ok ? '✓' : '✗'} ${msg}`); };

// A learner who keeps the thumb loose in V (rules expect it tucked) and whose L thumb barely opens.
const FIST = [90, 100, 60], STRAIGHT = [3, 3, 3];
const myV = hand({ index: STRAIGHT, middle: STRAIGHT, ring: FIST, pinky: FIST, spread: { index: -16, middle: 14 }, thumbTip: { x: -0.8, y: 0.75, z: -0.1 } });
const myL = hand({ index: STRAIGHT, middle: FIST, ring: FIST, pinky: FIST, thumbTip: { x: -0.72, y: 0.62, z: -0.05 } });

const rate = (pose, target, templates) => {
  let ok = 0;
  for (let i = 0; i < 200; i++) if (matches(target, classify(camera(pose), 'asl', templates).scores)) ok++;
  return ok / 200;
};

const before = { V: rate(myV, 'V'), L: rate(myL, 'L') };
check(before.L < 0.5, `without calibration the learner's half-open L fails (${(before.L * 100) | 0}%)`);

const mine = { V: record(myV), L: record(myL) };
check(roughlyRight(extractFeatures(camera(myV)), sign('V')), 'their V passes the coarse "roughly right" check');
check(rate(myV, 'V', mine) >= 0.9, `after calibration their V is recognised (${(rate(myV, 'V', mine) * 100) | 0}%)`);
check(rate(myL, 'L', mine) >= 0.9, `after calibration their L is recognised (${(rate(myL, 'L', mine) * 100) | 0}%)`);
check(rate(POSES.U, 'U', mine) >= 0.9, `U is still recognised as U (${(rate(POSES.U, 'U', mine) * 100) | 0}%)`);
check(rate(POSES.U, 'V', mine) <= 0.05, `U is not mistaken for their V (${(rate(POSES.U, 'V', mine) * 100) | 0}%)`);
check(rate(POSES.D, 'L', mine) <= 0.05 && rate(POSES.G, 'L', mine) <= 0.05, 'D and G are not mistaken for their L');

// Calibrating every letter must not create confusion between letters.
const all = Object.fromEntries(STATIC_BY_LANG.asl.map((s) => [s, record(POSES[s])]));
let worst = 0, worstPair = '';
for (const s of STATIC_BY_LANG.asl) for (const o of STATIC_BY_LANG.asl) if (o !== s) {
  const r = rate(POSES[s], o, all);
  if (r > worst) { worst = r; worstPair = `${s}→${o}`; }
}
check(worst <= 0.05, `with every letter calibrated, worst confusion ${(worst * 100).toFixed(1)}% (${worstPair})`);

// A shape that is clearly wrong is refused (cannot teach "B" for "A").
check(!roughlyRight(extractFeatures(camera(POSES.B)), sign('A')), 'a B is refused as a recording for A');

console.log(failures ? `\n${failures} check(s) failing` : '\nAll checks pass');
process.exit(failures ? 1 : 0);
