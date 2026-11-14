// Reference hand model: a simple kinematic hand (palm toward the viewer, y up,
// wrist→middle knuckle = 1). Used to draw each sign and to test the classifier.
export const rad = (d) => (d * Math.PI) / 180;
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const lerp = (a, b, t) => add(a, mul({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, t));

// Palm faces the camera (-z). y up. Size: wrist→middle knuckle = 1.
const MCP = {
  index: { x: -0.29, y: 0.95, z: 0 },
  middle: { x: 0, y: 1, z: 0 },
  ring: { x: 0.26, y: 0.93, z: 0 },
  pinky: { x: 0.49, y: 0.83, z: 0 },
};
const SEG = { index: [0.45, 0.27, 0.22], middle: [0.5, 0.3, 0.24], ring: [0.47, 0.28, 0.23], pinky: [0.37, 0.22, 0.2] };
const SPREAD = { index: -6, middle: 0, ring: 6, pinky: 12 };

export const STRAIGHT = [3, 3, 3];
const FIST = [90, 100, 60];
const C_CURVE = [25, 35, 25];
const O_CURVE = [40, 60, 40];
const TOUCH = [50, 70, 40];

function finger(name, flex, spread = SPREAD[name]) {
  const pts = [MCP[name]];
  let a = 0;
  const phi = rad(spread);
  for (let i = 0; i < 3; i++) {
    a += rad(flex[i]);
    const dir = { x: Math.sin(phi) * Math.cos(a), y: Math.cos(phi) * Math.cos(a), z: -Math.sin(a) };
    pts.push(add(pts[i], mul(dir, SEG[name][i])));
  }
  return pts;
}

export function hand({ index, middle, ring, pinky, spread = {}, thumbTip }) {
  const f = {
    index: finger('index', index, spread.index),
    middle: finger('middle', middle, spread.middle),
    ring: finger('ring', ring, spread.ring),
    pinky: finger('pinky', pinky, spread.pinky),
  };
  const cmc = { x: -0.25, y: 0.25, z: 0 };
  const tip = typeof thumbTip === 'function' ? thumbTip(f) : thumbTip;
  // slight outward bulge so the thumb is not perfectly straight
  const bulge = { x: -0.04, y: 0, z: 0.02 };
  const thumb = [cmc, add(lerp(cmc, tip, 0.4), bulge), add(lerp(cmc, tip, 0.72), bulge), tip];
  return [{ x: 0, y: 0, z: 0 }, ...thumb, ...f.index, ...f.middle, ...f.ring, ...f.pinky];
}

export const THUMB_OUT = { x: -1.1, y: 0.6, z: 0 };
const THUMB_SIDE = { x: -0.47, y: 1.0, z: -0.38 };
const THUMB_ACROSS_FIST = { x: -0.03, y: 0.78, z: -0.62 }; // S: across the middle segments
const THUMB_PALM = { x: 0.1, y: 0.6, z: -0.1 };
const THUMB_HOLD = { x: 0.15, y: 0.7, z: -0.45 }; // holds ring/pinky down
const E_CURL = [15, 100, 80];
const HOOK = [0, 95, 75];

// Rotate a finished hand around the wrist: roll = in the image plane
// (+90 → fingers point to the thumb side), yaw = turn around the vertical axis.
export function orient(points, rollDeg = 0, yawDeg = 0) {
  const r = rad(rollDeg), y = rad(yawDeg);
  return points.map(({ x, y: py, z }) => {
    let X = x * Math.cos(y) + z * Math.sin(y), Z = -x * Math.sin(y) + z * Math.cos(y);
    return { x: X * Math.cos(r) - py * Math.sin(r), y: X * Math.sin(r) + py * Math.cos(r), z: Z };
  });
}

// Each sign as parameters (finger bends in degrees, spread, thumb-tip target,
// rotation). Parameters can be interpolated, which is how the animation
// folds an open hand into a letter.
const F = (index, middle, ring, pinky, thumbTip, extra = {}) => ({ index, middle, ring, pinky, thumbTip, ...extra });
const G_SPEC = F(STRAIGHT, FIST, FIST, FIST, { x: -0.44, y: 1.25, z: -0.12 });
const K_SPEC = F(STRAIGHT, [10, 5, 3], FIST, FIST, { x: -0.0, y: 1.38, z: -0.14 }, { spread: { index: -12, middle: 14 } });
const touchIndex = (dx, dy, dz) => (f) => add(f.index[3], { x: dx, y: dy, z: dz });

export const SPECS = {
  OPEN: F(STRAIGHT, STRAIGHT, STRAIGHT, STRAIGHT, { x: -0.85, y: 0.62, z: -0.12 }, { spread: { index: -9, middle: -1, ring: 8, pinky: 17 } }),
  A: F(FIST, FIST, FIST, FIST, THUMB_SIDE),
  B: F(STRAIGHT, STRAIGHT, STRAIGHT, STRAIGHT, THUMB_PALM, { spread: { index: 0, middle: 0, ring: 0, pinky: 0 } }),
  C: F(C_CURVE, C_CURVE, C_CURVE, C_CURVE, touchIndex(-0.05, -0.6, 0.05)),
  D: F(STRAIGHT, TOUCH, TOUCH, TOUCH, (f) => add(f.middle[3], { x: -0.04, y: -0.05, z: 0 })),
  E: F(E_CURL, E_CURL, E_CURL, E_CURL, { x: 0.12, y: 0.85, z: -0.36 }),
  F: F(O_CURVE, STRAIGHT, STRAIGHT, STRAIGHT, touchIndex(0, -0.06, 0.02)),
  G: { ...G_SPEC, roll: 90, yaw: 55 },
  H: F(STRAIGHT, STRAIGHT, FIST, FIST, THUMB_HOLD, { spread: { index: 0, middle: 0 }, roll: 90, yaw: 55 }),
  I: F(FIST, FIST, FIST, STRAIGHT, THUMB_ACROSS_FIST),
  J: F(FIST, FIST, FIST, STRAIGHT, THUMB_ACROSS_FIST, { motion: 'J' }),
  K: K_SPEC,
  L: F(STRAIGHT, FIST, FIST, FIST, THUMB_OUT),
  M: F(FIST, FIST, FIST, FIST, { x: 0.37, y: 0.92, z: -0.52 }),
  N: F(FIST, FIST, FIST, FIST, { x: 0.13, y: 0.97, z: -0.55 }),
  O: F(O_CURVE, O_CURVE, O_CURVE, O_CURVE, touchIndex(0.05, -0.08, 0.02)),
  P: { ...K_SPEC, roll: 150, yaw: 20 },
  Q: { ...G_SPEC, roll: 170, yaw: 20 },
  R: F(STRAIGHT, STRAIGHT, FIST, FIST, THUMB_HOLD, { spread: { index: 9, middle: -12 } }),
  S: F(FIST, FIST, FIST, FIST, THUMB_ACROSS_FIST),
  T: F(FIST, FIST, FIST, FIST, { x: -0.15, y: 0.98, z: -0.55 }),
  U: F(STRAIGHT, STRAIGHT, FIST, FIST, THUMB_HOLD, { spread: { index: 0, middle: 0 } }),
  V: F(STRAIGHT, STRAIGHT, FIST, FIST, THUMB_HOLD, { spread: { index: -16, middle: 14 } }),
  W: F(STRAIGHT, STRAIGHT, STRAIGHT, FIST, { x: 0.3, y: 0.6, z: -0.4 }, { spread: { index: -12, middle: 0, ring: 12 } }),
  X: F(HOOK, FIST, FIST, FIST, THUMB_ACROSS_FIST),
  Y: F(FIST, FIST, FIST, STRAIGHT, THUMB_OUT),
  Z: F(STRAIGHT, FIST, FIST, FIST, THUMB_ACROSS_FIST, { motion: 'Z' }),
  ILY: F(STRAIGHT, FIST, FIST, STRAIGHT, THUMB_OUT),
};

// Mexican Sign Language: same as ASL except these letters.
const CLAW = [15, 45, 35];
const CLAW_SPEC = F(CLAW, FIST, FIST, FIST, touchIndex(-0.02, -0.45, 0.06));
export const SPECS_LSM = {
  ...Object.fromEntries('ABCDEFIJLMNOPRSTUVWYZ'.split('').map((k) => [k, SPECS[k]])),
  OPEN: SPECS.OPEN,
  G: F(STRAIGHT, FIST, FIST, FIST, { x: -0.42, y: 1.28, z: -0.1 }), // points up
  H: F(STRAIGHT, STRAIGHT, FIST, FIST, { x: -1.0, y: 0.75, z: -0.1 }, { spread: { index: 0, middle: 0 }, roll: -90, yaw: 40 }), // thumb up
  K: { ...K_SPEC, motion: 'up' },
  'Ñ': { ...SPECS.N, motion: 'wiggle' },
  Q: { ...CLAW_SPEC, roll: 170, yaw: 10, motion: 'wiggle' },
  X: { ...CLAW_SPEC, yaw: 65, motion: 'forward' },
  LL: { ...SPECS.L, motion: 'side' },
  RR: { ...SPECS.R, motion: 'wiggle' },
};
export const SPECS_BY_LANG = { asl: SPECS, lsm: SPECS_LSM };

// Extra handshapes used only by word signs (NO = two fingers snapping onto the thumb)
export const WORD_SPECS = {
  NO_OPEN: F(STRAIGHT, STRAIGHT, FIST, FIST, { x: -0.95, y: 0.75, z: -0.1 }, { spread: { index: -4, middle: 2 }, roll: 60 }),
  NO_SHUT: F(TOUCH, TOUCH, FIST, FIST, (f) => add(f.index[3], { x: 0.06, y: -0.06, z: 0 }), { roll: 60 }),
};

const NAMES = ['index', 'middle', 'ring', 'pinky'];
// Turn a spec into plain numbers (thumb target resolved, every spread filled in).
export function resolveSpec(spec) {
  const spread = { ...SPREAD, ...(spec.spread || {}) };
  let thumb = spec.thumbTip;
  if (typeof thumb === 'function') {
    const f = Object.fromEntries(NAMES.map((n) => [n, finger(n, spec[n], spread[n])]));
    thumb = thumb(f);
  }
  return { flex: Object.fromEntries(NAMES.map((n) => [n, [...spec[n]]])), spread, thumb: { ...thumb }, roll: spec.roll || 0, yaw: spec.yaw || 0 };
}

export function lerpSpec(a, b, k) {
  const L = (x, y) => x + (y - x) * k;
  return {
    flex: Object.fromEntries(NAMES.map((n) => [n, a.flex[n].map((v, i) => L(v, b.flex[n][i]))])),
    spread: Object.fromEntries(NAMES.map((n) => [n, L(a.spread[n], b.spread[n])])),
    thumb: { x: L(a.thumb.x, b.thumb.x), y: L(a.thumb.y, b.thumb.y), z: L(a.thumb.z, b.thumb.z) },
    roll: L(a.roll, b.roll), yaw: L(a.yaw, b.yaw),
  };
}

// Thumb with fixed bone lengths (for drawing): bends at the base when the
// target is close, so the thumb never stretches during the animation.
const TL = [0.37, 0.31, 0.27];
function thumbIK(tip) {
  const cmc = { x: -0.25, y: 0.25, z: 0 };
  const v = { x: tip.x - cmc.x, y: tip.y - cmc.y, z: tip.z - cmc.z };
  let d = Math.hypot(v.x, v.y, v.z) || 1;
  const u = mul(v, 1 / d), L23 = TL[1] + TL[2];
  const B = { x: -0.7, y: -0.1, z: 0.5 }; // knuckle bulges out and back
  const bu = B.x * u.x + B.y * u.y + B.z * u.z;
  let w = { x: B.x - u.x * bu, y: B.y - u.y * bu, z: B.z - u.z * bu };
  const wl = Math.hypot(w.x, w.y, w.z) || 1;
  w = mul(w, 1 / wl);
  let mcp, end;
  if (d >= TL[0] + L23) {
    d = TL[0] + L23;
    end = add(cmc, mul(u, d));
    mcp = add(cmc, mul(u, TL[0]));
  } else {
    const cosA = Math.max(-1, Math.min(1, (TL[0] ** 2 + d * d - L23 ** 2) / (2 * TL[0] * d)));
    const A = Math.acos(cosA);
    mcp = add(cmc, add(mul(u, TL[0] * Math.cos(A)), mul(w, TL[0] * Math.sin(A))));
    end = tip;
  }
  const ip = add(lerp(mcp, end, TL[1] / L23), mul(w, 0.03));
  return [cmc, mcp, ip, end];
}

// Build 21 points from resolved parameters. `drawing` uses the fixed-length thumb.
export function poseFromSpec(r, { drawing = false } = {}) {
  const f = NAMES.flatMap((n) => finger(n, r.flex[n], r.spread[n]));
  let thumb;
  if (drawing) thumb = thumbIK(r.thumb);
  else {
    const cmc = { x: -0.25, y: 0.25, z: 0 }, bulge = { x: -0.04, y: 0, z: 0.02 };
    thumb = [cmc, add(lerp(cmc, r.thumb, 0.4), bulge), add(lerp(cmc, r.thumb, 0.72), bulge), r.thumb];
  }
  return orient([{ x: 0, y: 0, z: 0 }, ...thumb, ...f], r.roll, r.yaw);
}

const posesOf = (specs) => Object.fromEntries(Object.entries(specs).filter(([k]) => k !== 'OPEN').map(([k, s]) => [k, poseFromSpec(resolveSpec(s))]));
export const POSES = posesOf(SPECS);
export const POSES_LSM = posesOf(SPECS_LSM);
