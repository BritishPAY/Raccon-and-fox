// Run: node tests/face.test.mjs — facial grammar drills on simulated face data.
import { createFaceDrill } from '../js/face.js';
const lm = (yaw) => { const a = []; a[1] = { x: yaw }; a[234] = { x: 0 }; a[454] = { x: 1 }; return a; };
const neutral = { browInnerUp: 0.05, browOuterUpLeft: 0.04, browOuterUpRight: 0.05, browDownLeft: 0.1, browDownRight: 0.1 };
function run(kind, frameFn, n = 90) {
  const d = createFaceDrill(kind);
  let r;
  for (let i = 0; i < n; i++) { r = d.update(frameFn(i), i * 33); if (r.done) return { done: true, at: i }; }
  return { done: false, r };
}
let fail = 0;
const check = (name, ok) => { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) fail++; };
const raised = { ...neutral, browInnerUp: 0.7, browOuterUpLeft: 0.6, browOuterUpRight: 0.65 };
const furrowed = { ...neutral, browDownLeft: 0.6, browDownRight: 0.55 };
check('raise: detected after neutral start', run('raise', (i) => ({ blend: i < 20 ? neutral : raised, landmarks: lm(0.5) })).done);
check('raise: neutral face not accepted', !run('raise', () => ({ blend: neutral, landmarks: lm(0.5) })).done);
check('raise: furrow not accepted as raise', !run('raise', (i) => ({ blend: i < 20 ? neutral : furrowed, landmarks: lm(0.5) })).done);
check('furrow: detected', run('furrow', (i) => ({ blend: i < 20 ? neutral : furrowed, landmarks: lm(0.5) })).done);
check('furrow: raised brows not accepted', !run('furrow', (i) => ({ blend: i < 20 ? neutral : raised, landmarks: lm(0.5) })).done);
check('shake: detected', run('shake', (i) => ({ blend: neutral, landmarks: lm(0.5 + 0.12 * Math.sin(i / 3)) })).done);
check('shake: still head not accepted', !run('shake', () => ({ blend: neutral, landmarks: lm(0.5) })).done);
check('shake: a single turn is not a shake', !run('shake', (i) => ({ blend: neutral, landmarks: lm(i < 40 ? 0.5 : 0.35) })).done);
console.log(fail ? `${fail} failing` : 'All face checks pass');
process.exit(fail ? 1 : 0);
