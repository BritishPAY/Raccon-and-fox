// <sign-hand sign="A" size="180"> — an animated, shaded 3D hand.
// Every loop starts from an open hand and folds into the letter; fingers that
// have to move are outlined in coral. Then the hand sways so its 3D shape reads.
// J and Z also draw their path in the air.
import { SPECS, SPECS_BY_LANG, resolveSpec, lerpSpec, poseFromSpec } from './handmodel.js';

const SKIN = { base: '#f5c2a0', light: '#ffe2cf', dark: '#d58f6c', line: '#b9785a' };
const ACTIVE = '#e4007c';
const RADII = { thumb: [0.115, 0.1, 0.09], index: [0.092, 0.084, 0.076], middle: [0.096, 0.088, 0.079], ring: [0.09, 0.082, 0.074], pinky: [0.078, 0.071, 0.064] };
const CHAINS = { thumb: [1, 2, 3, 4], index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
const OPEN = resolveSpec(SPECS.OPEN);
const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

// Which fingers change between the open hand and the letter
function activeParts(target) {
  const out = new Set();
  for (const n of ['index', 'middle', 'ring', 'pinky']) {
    const bend = target.flex[n].reduce((a, b) => a + b, 0) - OPEN.flex[n].reduce((a, b) => a + b, 0);
    if (Math.abs(bend) > 35 || Math.abs(target.spread[n] - OPEN.spread[n]) > 12) out.add(n);
  }
  const t = target.thumb, o = OPEN.thumb;
  if (Math.hypot(t.x - o.x, t.y - o.y, t.z - o.z) > 0.3) out.add('thumb');
  return out;
}

// Pose (and air-drawing offset) at time t (seconds) in the loop
function frameAt(spec0, target, t) {
  const motion = spec0.motion;
  const period = motion ? 4.6 : 3.6;
  const lt = t % period;
  const form = ease((lt - 0.5) / 0.9);
  let spec = lerpSpec(OPEN, target, form);
  let offset = { x: 0, y: 0, z: 0 }, trail = null, trailFrom = 0;
  if (motion && lt > 1.7) {
    const k = ease((lt - 1.7) / 1.6);
    if (motion === 'J') {
      spec = { ...spec, roll: spec.roll - 100 * k };
      offset = { x: 0, y: -0.55 * k, z: 0 };
    } else if (motion === 'up') {
      offset = { x: 0, y: 0.5 * k, z: 0 };
    } else if (motion === 'side') {
      offset = { x: 0.65 * k, y: 0, z: 0 };
    } else if (motion === 'wiggle') {
      offset = { x: 0.2 * Math.sin(k * Math.PI * 4), y: 0, z: 0 };
    } else if (motion === 'forward') {
      offset = { x: 0, y: 0, z: -1.3 * Math.sin(k * Math.PI) };
    } else {
      const path = [[0, 0], [0.8, 0], [0, 0.55], [0.8, 0.55]];
      const seg = Math.min(2, Math.floor(k * 3)), f = k * 3 - seg;
      const [x0, y0] = path[seg], [x1, y1] = path[Math.min(3, seg + 1)];
      offset = { x: -(x0 + (x1 - x0) * f) + 0.4, y: -(y0 + (y1 - y0) * f), z: 0 };
    }
    trail = motion === 'J' ? 20 : motion === 'forward' ? null : 8;
    trailFrom = 1.7;
  }
  const sway = Math.sin((lt / period) * Math.PI * 2) * 0.28 * form;
  return { spec, offset, sway, trail, trailFrom, lt, form };
}

function project(p, sway, view) {
  // turn around the vertical axis (base turn + sway), then tilt, then perspective
  const ay = view.turn + sway, ax = view.tilt;
  let x = p.x * Math.cos(ay) + p.z * Math.sin(ay), z = -p.x * Math.sin(ay) + p.z * Math.cos(ay);
  let y = p.y * Math.cos(ax) - z * Math.sin(ax);
  z = p.y * Math.sin(ax) + z * Math.cos(ax);
  const s = 4 / (4 + z);
  return { x: x * s, y: -y * s, z, s };
}

function pointsFor(fr) {
  const pts = poseFromSpec(fr.spec, { drawing: true }).map((p) => add(p, fr.offset));
  // wrist corners + forearm, rolled with the hand
  const r = Math.atan2(pts[9].x - pts[0].x, pts[9].y - pts[0].y);
  const rot = ({ x, y }) => ({ x: x * Math.cos(r) + y * Math.sin(r) + pts[0].x, y: -x * Math.sin(r) + y * Math.cos(r) + pts[0].y, z: 0.03 });
  return [...pts, rot({ x: -0.36, y: 0.04 }), rot({ x: 0.46, y: 0.08 }), rot({ x: -0.3, y: -0.7 }), rot({ x: 0.38, y: -0.7 })];
}

function tube(ctx, a, b, ra, rb, color, outline) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L, ny = dx / L;
  const g = ctx.createLinearGradient(a.x - nx * ra, a.y - ny * ra, a.x + nx * ra, a.y + ny * ra);
  g.addColorStop(0, SKIN.dark); g.addColorStop(0.35, color); g.addColorStop(0.62, SKIN.light); g.addColorStop(1, SKIN.dark);
  ctx.beginPath();
  ctx.moveTo(a.x + nx * ra, a.y + ny * ra);
  ctx.lineTo(b.x + nx * rb, b.y + ny * rb);
  ctx.arc(b.x, b.y, rb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), dx * ny - dy * nx > 0);
  ctx.lineTo(a.x - nx * ra, a.y - ny * ra);
  ctx.arc(a.x, a.y, ra, Math.atan2(-ny, -nx), Math.atan2(ny, nx), dx * ny - dy * nx > 0);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = outline ? 2.2 : 1;
  ctx.strokeStyle = outline || SKIN.line;
  ctx.stroke();
}

function joint(ctx, c, r, outline) {
  const g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.35, r * 0.1, c.x, c.y, r);
  g.addColorStop(0, SKIN.light); g.addColorStop(0.7, SKIN.base); g.addColorStop(1, SKIN.dark);
  ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  if (outline) { ctx.lineWidth = 2.2; ctx.strokeStyle = outline; ctx.stroke(); }
}

class SignHand extends HTMLElement {
  connectedCallback() {
    this.sign = this.getAttribute('sign');
    this.size = +this.getAttribute('size') || 160;
    const spec = (SPECS_BY_LANG[this.getAttribute('lang') || 'asl'] || SPECS)[this.sign];
    this.spec0 = spec;
    if (!spec) return;
    this.target = resolveSpec(spec);
    this.active = activeParts(this.target);
    this.view = { turn: -0.32, tilt: 0.35 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = Math.round(this.size * dpr);
    this.canvas.style.width = this.canvas.style.height = this.size + 'px';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', `Animated hand forming the sign ${this.sign}`);
    this.replaceChildren(this.canvas);
    this.fit();
    this.t0 = performance.now();
    this.trail = [];
    if (reduceMotion) { this.renderAt(1.8); return; }
    const loop = (now) => {
      if (!this.isConnected) return;
      this.renderAt((now - this.t0) / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  disconnectedCallback() { cancelAnimationFrame(this.raf); }

  // Frame the whole animation once so the hand never jumps around.
  fit() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let t = 0; t < 4.6; t += 0.1) {
      const fr = frameAt(this.spec0, this.target, t);
      for (const p of pointsFor(fr).slice(0, 23)) {
        const q = project(p, fr.sway, this.view);
        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
      }
    }
    const pad = 0.1, w = maxX - minX + 2 * pad, h = maxY - minY + 2 * pad;
    const scale = this.canvas.width / Math.max(w, h);
    this.map = (q) => ({ x: (q.x - minX + pad + (Math.max(w, h) - w) / 2) * scale, y: (q.y - minY + pad + (Math.max(w, h) - h) / 2) * scale, z: q.z, s: q.s });
    this.unit = scale;
  }

  renderAt(t) {
    const ctx = this.canvas.getContext('2d');
    const fr = frameAt(this.spec0, this.target, t);
    const P = pointsFor(fr).map((p) => this.map(project(p, fr.sway, this.view)));
    const u = this.unit;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.lineJoin = 'round';

    // forearm
    const [wl, wr, fl, fr2] = [21, 22, 23, 24];
    const fg = ctx.createLinearGradient(P[fl].x, 0, P[fr2].x, 0);
    fg.addColorStop(0, SKIN.dark); fg.addColorStop(0.5, SKIN.base); fg.addColorStop(1, SKIN.dark);
    ctx.beginPath(); [wl, fl, fr2, wr].forEach((i, k) => (k ? ctx.lineTo(P[i].x, P[i].y) : ctx.moveTo(P[i].x, P[i].y)));
    ctx.closePath(); ctx.fillStyle = fg; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;

    const items = [];
    // palm
    const palmIdx = [wl, 1, 2, 5, 9, 13, 17, wr];
    const pz = palmIdx.reduce((a, i) => a + P[i].z, 0) / palmIdx.length;
    items.push({ z: pz + 0.06, draw: () => {
      const c = palmIdx.reduce((a, i) => ({ x: a.x + P[i].x / palmIdx.length, y: a.y + P[i].y / palmIdx.length }), { x: 0, y: 0 });
      const g = ctx.createRadialGradient(c.x - 0.15 * u, c.y - 0.2 * u, 0.05 * u, c.x, c.y, 0.75 * u);
      g.addColorStop(0, SKIN.light); g.addColorStop(0.6, SKIN.base); g.addColorStop(1, SKIN.dark);
      ctx.beginPath(); palmIdx.forEach((i, k) => (k ? ctx.lineTo(P[i].x, P[i].y) : ctx.moveTo(P[i].x, P[i].y))); ctx.closePath();
      ctx.lineWidth = 0.17 * u; ctx.strokeStyle = SKIN.base; ctx.stroke();
      ctx.fillStyle = g; ctx.fill();
    } });
    // finger segments + knuckles
    for (const [name, chain] of Object.entries(CHAINS)) {
      const outline = this.active.has(name) && fr.lt > 0.45 && fr.lt < 2.1 ? ACTIVE : null; // only while folding
      for (let k = 0; k < 3; k++) {
        const a = P[chain[k]], b = P[chain[k + 1]];
        const ra = RADII[name][k] * u * a.s, rb = RADII[name][Math.min(2, k + 1)] * u * b.s * (k === 2 ? 0.95 : 1);
        items.push({ z: (a.z + b.z) / 2, draw: () => {
          tube(ctx, a, b, ra, rb, SKIN.base, outline);
          if (k < 2) joint(ctx, b, rb * 0.98, null);
          if (k === 2) { // nail
            const nx = a.x + (b.x - a.x) * 0.75, ny = a.y + (b.y - a.y) * 0.75, L = Math.hypot(b.x - a.x, b.y - a.y);
            if (L > rb * 1.4) {
              ctx.save(); ctx.translate(nx, ny); ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
              ctx.beginPath(); ctx.ellipse(0, 0, Math.min(L * 0.28, rb * 0.9), rb * 0.55, 0, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255,240,232,.85)'; ctx.fill(); ctx.restore();
            }
          }
        } });
      }
    }
    items.sort((a, b) => b.z - a.z).forEach((i) => i.draw());

    // air-drawing trail for J / Z
    if (fr.trail != null) {
      if (fr.lt < 1.75) this.trail = [];
      this.trail.push({ x: P[fr.trail].x, y: P[fr.trail].y });
      ctx.beginPath();
      this.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.lineWidth = 0.05 * u; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(36,25,94,.8)'; ctx.setLineDash([0.08 * u, 0.07 * u]);
      ctx.stroke(); ctx.setLineDash([]);
    } else this.trail = [];
  }
}

if (!customElements.get('sign-hand')) customElements.define('sign-hand', SignHand);
