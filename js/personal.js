// Personal calibration: "teach it my hand".
// Every hand (and every webcam) is a little different. When a learner's sign
// is roughly right but the general rules miss it, they can record ~1 s of the
// sign. We store compact feature vectors in this browser and, from then on,
// a close match to their own recording also counts — nearest-neighbour on
// the same features the rules use.

const KEY = 'signify:personal:v1';
const MAX_PER_SIGN = 24;

// Feature vector: everything roughly on a 0..1 scale.
export function featureVector(f) {
  const P = Math.PI;
  return [
    f.ext.index, f.ext.middle, f.ext.ring, f.ext.pinky, f.ext.thumb,
    f.thumbOut / 1.5, f.thumbIndexTip / 1.5, f.thumbMiddleTip / 1.5, f.thumbMiddlePip / 1.5,
    f.indexMiddleTips, f.indexTipToWrist / 2, f.middleTipToWrist / 2,
    f.thumbIndexAngle / P, f.cOpposition / P, f.indexMcpBend / P, f.indexTipBend / P,
    f.thumbAcross, f.thumbAlong / 1.5, f.middleTipAlong / 1.5, f.crossing,
    (f.pointUp + 1) / 2, f.pointSide,
  ];
}

let data = {};
try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } };

export const personal = {
  get: (lang) => data[lang] || {},
  count: (lang) => Object.keys(data[lang] || {}).length,
  has: (lang, sign) => !!data[lang]?.[sign]?.length,
  add(lang, sign, vectors) {
    data[lang] ??= {};
    data[lang][sign] = [...(data[lang][sign] || []), ...vectors].slice(-MAX_PER_SIGN);
    save();
  },
  clear(lang, sign) {
    if (sign) delete data[lang]?.[sign]; else delete data[lang];
    save();
  },
  // test hook
  _set(d) { data = d; },
};

// Similarity 0..1 of a vector to a sign's stored samples (best match).
const SIGMA = 0.075;
export function personalScores(vec, templates) {
  const out = {};
  for (const [sign, list] of Object.entries(templates || {})) {
    let best = Infinity;
    for (const t of list) {
      let d = 0;
      for (let i = 0; i < vec.length; i++) d += (vec[i] - t[i]) ** 2;
      d = Math.sqrt(d / vec.length);
      if (d < best) best = d;
    }
    out[sign] = Math.exp(-((best / SIGMA) ** 2) / 2);
  }
  return out;
}

// Is the shape close enough to the letter to be worth learning?
// Only the coarse finger pattern is checked (up/down), because the thumb and
// the exact angles are what differ most between people and cameras.
export function roughlyRight(f, info) {
  const keys = ['index', 'middle', 'ring', 'pinky'];
  return info.fingers.every((want, i) => {
    const e = f.ext[keys[i]];
    if (want === 'up') return e > 0.45;
    if (want === 'down') return e < 0.55;
    return true; // curve / touch / hook: allow
  });
}
