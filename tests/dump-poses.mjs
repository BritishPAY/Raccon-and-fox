// Prints the synthetic poses as MediaPipe-style normalised landmarks (640x480 frame).
// Usage: node tests/dump-poses.mjs [asl|lsm]
import { POSES, POSES_LSM } from '../js/handmodel.js';
const src = process.argv[2] === 'lsm' ? POSES_LSM : POSES;
const k = 100, out = {};
for (const [s, pts] of Object.entries(src)) out[s] = pts.map((p) => ({ x: 0.5 + (k * p.x) / 640, y: 0.62 - (k * p.y) / 480, z: (k * p.z) / 640 }));
console.log(JSON.stringify(out));
