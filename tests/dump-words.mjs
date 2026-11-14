// Prints one correct synthetic sequence per word sign as MediaPipe-style
// normalised landmarks (640x480): { WORD: { hand: [frames], face } }. Used by e2e.py.
// Usage: node tests/dump-words.mjs [asl|lsm]
import { WORDS } from '../js/words.js';
import { correct } from './word-seq.mjs';
const lang = process.argv[2] || 'asl';
const norm = (pts) => pts.map((p) => ({ x: +(p.x / 640).toFixed(4), y: +(p.y / 480).toFixed(4), z: +((p.z || 0) / 640).toFixed(4) }));
const out = {};
for (const w of Object.values(WORDS[lang])) { const seq = correct(w, lang); out[w.id] = { hand: seq.map((f) => norm(f.points)), face: norm(seq[0].face) }; }
console.log(JSON.stringify(out));
