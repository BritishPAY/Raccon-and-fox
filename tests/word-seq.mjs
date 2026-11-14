// Synthetic word-sign sequences (hand + face landmarks), shared by the tests.
import { SPECS, SPECS_BY_LANG, WORD_SPECS, resolveSpec, lerpSpec, poseFromSpec } from '../js/handmodel.js';
import { detectWord, anchors } from '../js/words.js';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const spec = (lang, name, roll) => {
  const s = WORD_SPECS[name] || (SPECS_BY_LANG[lang] || SPECS)[name] || SPECS[name];
  return resolveSpec(roll == null ? s : { ...s, roll });
};

// Face: forehead top (10), mouth (13), chin (152), ~190 px tall
function face(cx, cy, H) {
  const f = Array.from({ length: 478 }, () => ({ x: cx, y: cy, z: 0 }));
  f[10] = { x: cx, y: cy - H / 2, z: 0 };
  f[152] = { x: cx, y: cy + H / 2, z: 0 };
  f[13] = { x: cx, y: cy + 0.3 * H, z: 0 };
  return f;
}
const mid = (ps) => ps.reduce((a, p) => ({ x: a.x + p.x / ps.length, y: a.y + p.y / ps.length }), { x: 0, y: 0 });
const REF = { tips: (p) => mid([p[8], p[12]]), thumb: (p) => p[4], index: (p) => p[8], palm: (p) => mid([p[0], p[5], p[9], p[17]]), knuckles: (p) => mid([p[5], p[9], p[13], p[17]]) };

// Image-space hand (y down) whose reference point sits at `where`
function placeHand(pose, refName, where, k, rot) {
  const img = pose.map((p) => {
    const x = p.x * Math.cos(rot) - p.y * Math.sin(rot), y = p.x * Math.sin(rot) + p.y * Math.cos(rot);
    return { x: x * k, y: -y * k, z: p.z * k };
  });
  const r = REF[refName](img);
  return img.map((p) => ({ x: p.x - r.x + where.x + (rnd() - 0.5) * 3, y: p.y - r.y + where.y + (rnd() - 0.5) * 3, z: p.z }));
}

// Build a sequence. path(t) → offset from the place in face-heights; shapeAt(t) → resolved spec
export function sequence({ lang, ref, at, path, shapeAt, withFace = true, ms = 2000 }) {
  const scale = 0.8 + 0.4 * rnd(), rot = (rnd() - 0.5) * 0.3;
  const F = face(320 + (rnd() - 0.5) * 60, 180 + (rnd() - 0.5) * 40, 190 * scale);
  const A = anchors(F);
  const base = at ? A[at] : { x: A.chin.x + 0.9 * A.H, y: A.chin.y + 0.6 * A.H };
  const k = 0.47 * A.H; // hand unit (wrist→knuckle) ≈ half a face height
  const out = [];
  for (let t = 0; t <= ms; t += 33) {
    const o = path(t / ms);
    const pose = poseFromSpec(shapeAt(t / ms));
    out.push({ t, points: placeHand(pose, ref, { x: base.x + o.x * A.H, y: base.y + o.y * A.H }, k, rot), face: withFace ? F : null });
  }
  return out;
}
export const detect = (id, lang, seq) => detectWord(id, lang, seq, seq[seq.length - 1].t);

export const still = () => ({ x: 0, y: 0 });
const PATHS = {
  tap: (u) => ({ x: 0.08 * Math.abs(Math.sin(u * Math.PI * 2)), y: 0 }),
  hold: still,
  out: (u) => ({ x: u < 0.35 ? 0 : 1.1 * (u - 0.35), y: u < 0.35 ? 0 : -0.2 * (u - 0.35) }),
  outDown: (u) => ({ x: u < 0.35 ? 0 : 0.3 * (u - 0.35), y: u < 0.35 ? 0 : 1.0 * (u - 0.35) }),
  circle: (u) => ({ x: 0.22 * Math.sin(u * Math.PI * 4), y: 0.22 * (1 - Math.cos(u * Math.PI * 4)) }),
  nod: (u) => ({ x: 0, y: 0.12 * Math.abs(Math.sin(u * Math.PI * 4)) }),
  wave: (u) => ({ x: 0.3 * Math.sin(u * Math.PI * 6), y: 0 }),
  snap: still, squeeze: still,
};
// Where a correct sign is done for words without a fixed place
const PLACE = { nod: null, snap: null, squeeze: null, wave: null };

export function correct(w, lang, opts = {}) {
  const a = w.anim;
  const s0 = spec(lang, a.hand, a.roll), s1 = a.alt ? spec(lang, a.alt, a.roll) : null;
  const shapeAt = s1 ? (u) => lerpSpec(s0, s1, (1 - Math.cos(u * Math.PI * 6)) / 2 > 0.5 ? 1 : 0) : () => s0;
  let at = w.at;
  if (w.move === 'wave') at = 'forehead'; // waved at head height
  return sequence({ lang, ref: s1 ? 'palm' : w.ref, at, path: PATHS[w.move], shapeAt, ...opts });
}

