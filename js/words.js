// Everyday word signs (not fingerspelling). A word sign = handshape + where
// the hand is (relative to the face, from the face tracker) + a movement.
// Only one-handed signs: the tracker follows one hand.
//
// Sources for LSM: SEP "Manos con voz" dictionary and LSM teaching courses
// (HOLA = raised hand greeting, GRACIAS = from the mouth outward,
// POR FAVOR = hand circling on the chest). ASL: standard dictionary forms.
import { extractFeatures, hi, lo } from './classifier.js';
import { strokes } from './motion.js';

const T = (en, es) => ({ en, es });
const min = Math.min;
const up = (e) => hi(e, 0.55, 0.75);
const down = (e) => lo(e, 0.3, 0.5);
const avgExt = (f) => (f.ext.index + f.ext.middle + f.ext.ring + f.ext.pinky) / 4;

// Handshapes, scored 0..1 from classifier features
export const SHAPES = {
  flat: (f) => min(up(f.ext.index), up(f.ext.middle), up(f.ext.ring), up(f.ext.pinky)),
  five: (f) => min(up(f.ext.index), up(f.ext.middle), up(f.ext.ring), up(f.ext.pinky), hi(f.thumbOut, 0.45, 0.6), hi(f.indexMiddleTips, 0.2, 0.3)),
  fist: (f) => min(down(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky)),
  W: (f) => min(up(f.ext.index), up(f.ext.middle), up(f.ext.ring), down(f.ext.pinky)),
  point: (f) => min(up(f.ext.index), down(f.ext.middle), down(f.ext.ring), down(f.ext.pinky)),
  flatO: (f) => min(lo(f.thumbIndexTip, 0.3, 0.45), lo(f.thumbMiddleTip, 0.35, 0.5), hi(f.ext.index, 0.12, 0.25)),
  // NO: index + middle open, then snapped shut onto the thumb
  noOpen: (f) => min(up(f.ext.index), up(f.ext.middle), hi(f.thumbIndexTip, 0.45, 0.6)),
  noShut: (f) => min(lo(f.thumbIndexTip, 0.3, 0.42), lo(f.thumbMiddleTip, 0.35, 0.48), lo(f.ext.ring, 0.5, 0.7)),
  // MILK: an open (C-like) hand squeezing into a fist
  milkOpen: (f) => hi(avgExt(f), 0.35, 0.5),
  milkShut: (f) => lo(avgExt(f), 0.2, 0.32),
};
const shapeOf = (w) => (w.move === 'snap' ? (f) => Math.max(SHAPES.noOpen(f), SHAPES.noShut(f)) : w.move === 'squeeze' ? () => 1 : SHAPES[w.shape]);

// Which point of the hand goes to the place
const mid = (ps) => ps.reduce((a, p) => ({ x: a.x + p.x / ps.length, y: a.y + p.y / ps.length }), { x: 0, y: 0 });
const REF = {
  tips: (p) => mid([p[8], p[12]]),
  thumb: (p) => p[4],
  index: (p) => p[8],
  palm: (p) => mid([p[0], p[5], p[9], p[17]]),
  knuckles: (p) => mid([p[5], p[9], p[13], p[17]]),
};

// Places on the body, from face landmarks (10 = top of forehead, 13 = mouth, 152 = chin)
const RADIUS = { forehead: 0.5, mouth: 0.42, chin: 0.45, chest: 0.8 };
export function anchors(face) {
  const top = face[10], chin = face[152];
  const H = Math.hypot(chin.x - top.x, chin.y - top.y) || 1;
  const dx = (chin.x - top.x) / H, dy = (chin.y - top.y) / H; // "down" along the face
  return {
    H,
    forehead: { x: top.x + dx * 0.18 * H, y: top.y + dy * 0.18 * H },
    mouth: { x: face[13].x, y: face[13].y },
    chin: { x: chin.x, y: chin.y },
    chest: { x: chin.x + dx * 0.95 * H, y: chin.y + dy * 0.95 * H },
  };
}

const W = (id, label, emoji, shape, ref, at, move, how, anim) => ({ id, label, emoji, shape, ref, at, move, how, anim });
const ASL = [
  W('HELLO', T('Hello', 'Hola'), '👋', 'flat', 'tips', 'forehead', 'out',
    T('Flat hand, fingertips at the side of your forehead. Move it out and away, like a small salute.', 'Mano plana, puntas de los dedos a un lado de la frente. Llévala hacia afuera, como un pequeño saludo militar.'),
    { hand: 'B', roll: 25 }),
  W('THANK_YOU', T('Thank you', 'Gracias'), '🙏', 'flat', 'tips', 'chin', 'outDown',
    T('Flat hand, fingertips touch your chin. Move it forward and down toward the person.', 'Mano plana, las puntas tocan la barbilla. Llévala hacia adelante y abajo, hacia la persona.'),
    { hand: 'B', roll: 10 }),
  W('PLEASE', T('Please', 'Por favor'), '🤲', 'flat', 'palm', 'chest', 'circle',
    T('Flat hand on your chest. Rub a circle.', 'Mano plana sobre el pecho. Haz un círculo.'),
    { hand: 'B', roll: 70 }),
  W('SORRY', T('Sorry', 'Perdón'), '😔', 'fist', 'knuckles', 'chest', 'circle',
    T('Make a fist (A) on your chest and rub a circle.', 'Haz un puño (A) sobre el pecho y dibuja un círculo.'),
    { hand: 'A', roll: 20 }),
  W('YES', T('Yes', 'Sí'), '👍', 'fist', 'knuckles', null, 'nod',
    T('Make a fist (S) and nod it up and down, like a head saying yes.', 'Haz un puño (S) y muévelo arriba y abajo, como una cabeza que dice que sí.'),
    { hand: 'S', at: 'front' }),
  W('NO', T('No', 'No'), '🙅', 'noOpen', 'palm', null, 'snap',
    T('Index and middle fingers out, then snap them shut onto your thumb. Twice.', 'Índice y medio estirados; ciérralos de golpe sobre el pulgar. Dos veces.'),
    { hand: 'NO_OPEN', alt: 'NO_SHUT', at: 'front' }),
  W('MOM', T('Mom', 'Mamá'), '👩', 'five', 'thumb', 'chin', 'tap',
    T('Open hand, fingers spread. Tap your thumb on your chin.', 'Mano abierta, dedos separados. Toca la barbilla con el pulgar.'),
    { hand: 'OPEN' }),
  W('DAD', T('Dad', 'Papá'), '👨', 'five', 'thumb', 'forehead', 'tap',
    T('Open hand, fingers spread. Tap your thumb on your forehead.', 'Mano abierta, dedos separados. Toca la frente con el pulgar.'),
    { hand: 'OPEN' }),
  W('EAT', T('Eat', 'Comer'), '🍎', 'flatO', 'tips', 'mouth', 'tap',
    T('Bunch your fingertips together (flat O) and tap them on your lips.', 'Junta las puntas de los dedos (O plana) y toca tus labios.'),
    { hand: 'O' }),
  W('MILK', T('Milk', 'Leche'), '🍼', 'milkOpen', 'palm', null, 'squeeze',
    T('Squeeze your hand open and shut, like milking a cow.', 'Abre y cierra la mano apretando, como al ordeñar una vaca.'),
    { hand: 'C', alt: 'S', at: 'front' }),
  W('WATER', T('Water', 'Agua'), '💧', 'W', 'index', 'chin', 'tap',
    T('Make a W (three fingers up) and tap your index finger on your chin.', 'Haz una W (tres dedos arriba) y toca la barbilla con el índice.'),
    { hand: 'W' }),
  W('ME', T('Me / I', 'Yo'), '🙋', 'point', 'index', 'chest', 'hold',
    T('Point your index finger at your own chest.', 'Señala tu propio pecho con el índice.'),
    { hand: 'D', roll: 100 }),
];
const LSM = [
  W('HOLA', T('Hello', 'Hola'), '👋', 'flat', 'palm', null, 'wave',
    T('Raise your open hand next to your head and wave it side to side.', 'Levanta la mano abierta junto a la cabeza y muévela de lado a lado.'),
    { hand: 'OPEN', at: 'side' }),
  W('GRACIAS', T('Thank you', 'Gracias'), '🙏', 'flat', 'tips', 'mouth', 'outDown',
    T('Flat hand, fingertips at your lips. Move it forward and down, as if blowing a kiss.', 'Mano plana, puntas en los labios. Llévala hacia adelante y abajo, como si enviaras un soplo.'),
    { hand: 'B', roll: 10 }),
  W('POR_FAVOR', T('Please', 'Por favor'), '🤲', 'flat', 'palm', 'chest', 'circle',
    T('Flat hand on your chest. Move it in a circle.', 'Mano plana sobre el pecho. Muévela en círculo.'),
    { hand: 'B', roll: 70 }),
];
export const WORDS = {
  asl: Object.fromEntries(ASL.map((w) => [w.id, w])),
  lsm: Object.fromEntries(LSM.map((w) => [w.id, w])),
};
export const isWord = (id, sl = 'asl') => !!WORDS[sl]?.[id];
export const wordIds = (sl) => Object.keys(WORDS[sl] || {});

// ---------- Detection ----------
// history: [{ t, points, face }] — points = 21 isotropic hand landmarks,
// face = isotropic face landmarks (or null). Faces are often hidden by the
// hand, so the caller passes the last face seen in the past few seconds.
const WINDOW_MS = 2200;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function detectWord(id, sl, history, now) {
  const w = WORDS[sl]?.[id];
  if (!w) return { done: false, progress: 0, stage: 'shape' };
  const recent = history.filter((h) => now - h.t <= WINDOW_MS && h.points);
  const shape = shapeOf(w);
  const frames = recent.map((h) => {
    const f = extractFeatures(h.points);
    const size = dist(h.points[0], h.points[9]) || 1;
    const ref = REF[w.ref](h.points);
    let d = null, A = null;
    if (h.face) { A = anchors(h.face); if (w.at) d = dist(ref, A[w.at]) / A.H; }
    return { t: h.t, f, size, ref, d, A, ok: shape(f) > 0.5 };
  });
  const good = frames.filter((x) => x.ok);
  const out = (o) => ({ noFace: w.at ? !frames.some((x) => x.A) : false, ...o });
  if (good.length < 5) return out({ done: false, progress: good.length / 40, stage: 'shape' });

  const haveFace = good.some((x) => x.d != null);
  const r = w.at ? RADIUS[w.at] : 0;
  const near = (x) => x.d == null || x.d <= r;
  const sizeAvg = good.reduce((a, x) => a + x.size, 0) / good.length;

  if (w.at && haveFace && !good.some((x) => x.d != null && x.d <= r)) {
    const best = Math.min(...good.filter((x) => x.d != null).map((x) => x.d));
    return out({ done: false, progress: Math.max(0.05, 0.3 * (1 - (best - r) / 1.5)), stage: 'place' });
  }

  switch (w.move) {
    case 'tap': case 'hold': {
      // touch the place and stay (or tap) for ~0.45 s with the right shape
      let dwell = 0, best = 0;
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1], b = frames[i];
        dwell = a.ok && b.ok && near(a) && near(b) ? dwell + (b.t - a.t) : 0;
        best = Math.max(best, dwell);
      }
      const need = haveFace ? 450 : 800;
      return out({ done: best >= need, progress: Math.min(1, 0.3 + (0.7 * best) / need), stage: 'move' });
    }
    case 'out': case 'outDown': {
      const i0 = good.findIndex(near);
      const after = good.slice(i0 + 1);
      const s0 = good[i0];
      let moved = 0, drop = 0, grow = 1;
      for (const x of after) {
        moved = Math.max(moved, haveFace ? (x.d ?? 0) - (s0.d ?? 0) : dist(x.ref, s0.ref) / (s0.A?.H || 2.2 * sizeAvg));
        drop = Math.max(drop, (x.ref.y - s0.ref.y) / (s0.A?.H || 2.2 * sizeAvg));
        grow = Math.max(grow, x.size / s0.size);
      }
      const away = moved >= 0.45 || (moved >= 0.25 && grow >= 1.2); // moving toward the camera shows up as a bigger hand
      const down = w.move === 'out' || drop >= 0.18 || grow >= 1.15;
      return out({ done: away && down, progress: Math.min(1, 0.3 + 0.7 * Math.min(1, moved / 0.45)), stage: 'move' });
    }
    case 'circle': {
      // a circle turns the same way all the time: count how far the hand
      // travels around its own centre (a back-and-forth line goes nowhere)
      const xs = good.map((x) => x.ref.x / sizeAvg), ys = good.map((x) => x.ref.y / sizeAvg);
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      let turn = 0;
      for (let i = 1; i < xs.length; i++) {
        if (Math.hypot(xs[i] - cx, ys[i] - cy) < 0.06) continue;
        let d = Math.atan2(ys[i] - cy, xs[i] - cx) - Math.atan2(ys[i - 1] - cy, xs[i - 1] - cx);
        if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
        if (Math.abs(d) < 1.2) turn += d; // big jumps are tracking glitches
      }
      const amp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const n = amp >= 0.2 ? Math.abs(turn) / Math.PI : 0; // half-turns
      return out({ done: n >= 2.5, progress: Math.min(1, 0.3 + 0.28 * n), stage: 'move' });
    }
    case 'nod': {
      // up and down only: a fist rubbing a circle (SORRY) also moves sideways
      const ys = good.map((x) => x.ref.y / sizeAvg), xs = good.map((x) => x.ref.x / sizeAvg);
      const n = strokes(ys, 0.08).filter((s) => s >= 0.12).length;
      const side = strokes(xs, 0.08).filter((s) => s >= 0.12).length;
      return out({ done: n >= 3 && side <= 1, progress: Math.min(1, 0.3 + (0.7 * Math.min(n, 3)) / 3 - (side > 1 ? 0.3 : 0)), stage: 'move' });
    }
    case 'wave': {
      const xs = good.map((x) => x.ref.x / sizeAvg);
      const n = strokes(xs, 0.1).filter((s) => s >= 0.15).length;
      const raised = !haveFace || good.some((x) => x.A && x.ref.y < x.A.chin.y);
      return out({ done: n >= 3 && raised, progress: Math.min(1, 0.3 + (0.7 * n) / 3), stage: raised ? 'move' : 'place' });
    }
    case 'snap': case 'squeeze': {
      const [A, B] = w.move === 'snap' ? [SHAPES.noOpen, SHAPES.noShut] : [SHAPES.milkOpen, SHAPES.milkShut];
      let state = null, flips = 0;
      for (const x of frames) {
        const s = A(x.f) > 0.5 ? 'a' : B(x.f) > 0.5 ? 'b' : null;
        if (s && state && s !== state) flips++;
        if (s) state = s;
      }
      const need = w.move === 'snap' ? 2 : 3; // open→shut→open (→shut)
      return out({ done: flips >= need, progress: Math.min(1, 0.3 + (0.7 * flips) / need), stage: 'move' });
    }
    default:
      return out({ done: false, progress: 0, stage: 'move' });
  }
}
