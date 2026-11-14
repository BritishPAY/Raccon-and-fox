// Word signs: synthetic 2-second sequences of hand + face landmarks.
// Each word must be recognised when done right, and rejected when the place,
// the movement or the handshape is wrong.
// Run: node tests/words.test.mjs
import { WORDS } from '../js/words.js';
import { spec, correct, detect, still } from './word-seq.mjs';

let fails = 0;
const check = (name, ok) => { if (!ok) { fails++; console.log('✗', name); } };
const rate = (n, fn) => { let k = 0; for (let i = 0; i < n; i++) if (fn()) k++; return k / n; };

for (const lang of ['asl', 'lsm']) {
  for (const w of Object.values(WORDS[lang])) {
    const r = rate(40, () => detect(w.id, lang, correct(w, lang)).done);
    check(`${lang} ${w.id} recognised (${(r * 100).toFixed(0)}%)`, r >= 0.9);
    console.log(`${lang} ${w.id.padEnd(10)} correct → ${(r * 100).toFixed(0)}%`);

    // no movement at all (for moving words)
    if (!['tap', 'hold'].includes(w.move)) {
      const rs = rate(20, () => detect(w.id, lang, correct(w, lang, { path: still, shapeAt: () => spec(lang, w.anim.hand, w.anim.roll) })).done);
      check(`${lang} ${w.id} without movement rejected (${rs})`, rs <= 0.1);
    }
    // fixed place: same shape and movement far from the place
    if (w.at) {
      const far = { forehead: 'chest', mouth: 'chest', chin: 'chest', chest: 'forehead' }[w.at];
      const rf = rate(20, () => detect(w.id, lang, correct(w, lang, { at: far })).done);
      check(`${lang} ${w.id} at the ${far} rejected (${rf})`, rf <= 0.1);
    }
    // wrong handshape: a closed fist (or a flat hand for fist words)
    const wrong = ['fist'].includes(w.shape) ? 'B' : 'S';
    const rw = rate(20, () => detect(w.id, lang, correct(w, lang, { shapeAt: () => spec(lang, wrong) })).done);
    check(`${lang} ${w.id} with handshape ${wrong} rejected (${rw})`, rw <= 0.1);
  }
}

// MOM vs DAD: same hand, chin vs forehead
const mom = WORDS.asl.MOM, dad = WORDS.asl.DAD;
check('DAD done at the chin is not DAD', rate(20, () => detect('DAD', 'asl', correct(mom, 'asl')).done) <= 0.1);
check('MOM done at the forehead is not MOM', rate(20, () => detect('MOM', 'asl', correct(dad, 'asl')).done) <= 0.1);
// Face hidden: holding the right shape a bit longer still counts
check('MOM without a face (held) still accepted', rate(20, () => detect('MOM', 'asl', correct(mom, 'asl', { withFace: false })).done) >= 0.9);
// Lookalike movements: a circle is not a nod, a line is not a circle
const sorry = WORDS.asl.SORRY, thanks = WORDS.asl.THANK_YOU, yes = WORDS.asl.YES;
check('SORRY (fist circling) is not YES', rate(20, () => detect('YES', 'asl', correct(sorry, 'asl')).done) <= 0.1);
check('YES (fist nodding) at the chest is not SORRY', rate(20, () => detect('SORRY', 'asl', correct(yes, 'asl', { at: 'chest', ref: 'knuckles' })).done) <= 0.1);
check('THANK YOU done twice is not PLEASE', rate(20, () => detect('PLEASE', 'asl', correct(thanks, 'asl', { ms: 2000, path: (u) => ({ x: 0.3 * ((u * 2) % 1), y: 1.0 * ((u * 2) % 1) }) })).done) <= 0.1);
// Coaching stages
const st = detect('MOM', 'asl', correct(mom, 'asl', { at: 'chest' }));
check(`MOM at the chest asks for the place (got ${st.stage})`, st.stage === 'place');

console.log(fails ? `\n${fails} checks failed` : '\nAll word checks pass');
process.exit(fails ? 1 : 0);
