// Webcam + MediaPipe HandLandmarker, running fully in the browser.
// One shared camera for the whole app; views subscribe to frames.
import { toIsotropic } from './classifier.js';

const MP_VERSION = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11],
  [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

class Camera {
  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.className = 'cam-video';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cam-overlay';
    this.listeners = new Set();
    this.status = 'idle'; // idle | loading | ready | error
    this.error = null;
    this.running = false;
    this.lastTs = -1;
    this.color = '#1fb59a';
  }

  async loadModel() {
    if (this.landmarker) return;
    const vision = await import(`${CDN}/vision_bundle.mjs`);
    const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
    this.vision = vision; this.fileset = fileset;
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    try {
      this.landmarker = await vision.HandLandmarker.createFromOptions(fileset, opts('GPU'));
    } catch {
      this.landmarker = await vision.HandLandmarker.createFromOptions(fileset, opts('CPU'));
    }
  }

  async start() {
    if (this.running) return;
    this.setStatus('loading');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocamera');
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false }),
        this.loadModel(),
      ]);
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      this.running = true;
      this.setStatus('ready');
      this.loop();
    } catch (e) {
      const name = e?.name || e?.message;
      this.error =
        name === 'NotAllowedError' ? 'denied'
          : name === 'NotFoundError' || name === 'nocamera' ? 'nocamera'
            : 'load';
      console.error('[camera]', e);
      this.setStatus('error');
    }
  }

  // Face tracking (eyebrows, head shake) for the grammar section. Loaded on demand.
  async enableFace(on = true) {
    this.faceOn = on;
    if (!on || this.faceLandmarker || this.faceLoading) return;
    this.faceLoading = true;
    try {
      await this.loadModel();
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: FACE_MODEL, delegate },
        runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
      });
      try { this.faceLandmarker = await this.vision.FaceLandmarker.createFromOptions(this.fileset, opts('GPU')); }
      catch { this.faceLandmarker = await this.vision.FaceLandmarker.createFromOptions(this.fileset, opts('CPU')); }
    } catch (e) {
      console.error('[face]', e);
      this.listeners.forEach((fn) => fn({ type: 'faceError' }));
    } finally { this.faceLoading = false; }
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.status !== 'error') this.setStatus('idle');
  }

  setStatus(s) {
    this.status = s;
    this.listeners.forEach((fn) => fn({ type: 'status', status: s, error: this.error }));
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn({ type: 'status', status: this.status, error: this.error });
    return () => this.listeners.delete(fn);
  }

  loop = () => {
    if (!this.running) return;
    const v = this.video;
    // a failing listener or detector must never stop the camera loop
    const emit = (ev) => this.listeners.forEach((fn) => { try { fn(ev); } catch (e) { console.error('[camera listener]', e); } });
    try {
      if (v.readyState >= 2 && v.currentTime !== this.lastTs) {
        this.lastTs = v.currentTime;
        const res = this.landmarker.detectForVideo(v, performance.now());
        const raw = res.landmarks?.[0] || null;
        this.draw(raw);
        const points = raw ? toIsotropic(raw, v.videoWidth, v.videoHeight) : null;
        emit({ type: 'frame', points });
        if (this.faceOn && this.faceLandmarker) {
          const fr = this.faceLandmarker.detectForVideo(v, performance.now());
          const cats = fr.faceBlendshapes?.[0]?.categories || [];
          const blend = Object.fromEntries(cats.map((c) => [c.categoryName, c.score]));
          emit({ type: 'face', blend, landmarks: fr.faceLandmarks?.[0] || null });
        }
      }
    } catch (e) { console.error('[camera loop]', e); }
    requestAnimationFrame(this.loop);
  };

  draw(lm) {
    const c = this.canvas, v = this.video;
    if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (!lm) return;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.color;
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * c.width, lm[a].y * c.height);
      ctx.lineTo(lm[b].x * c.width, lm[b].y * c.height);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Put the live video into a container on the current page.
  mount(container) {
    container.append(this.video, this.canvas);
    // moving a <video> between pages pauses it; resume the live stream
    if (this.running && this.video.paused) this.video.play().catch(() => {});
  }
}

export const camera = new Camera();
