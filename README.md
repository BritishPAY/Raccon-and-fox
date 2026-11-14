# Signify: learn sign language by playing

**Live:** https://britishpay.github.io/Raccon-and-fox-test/ (no sign-up; allow the camera)

**For hearing parents of deaf kids, in English or Spanish, for American Sign Language (ASL) or Mexican Sign Language (LSM).** 9 in 10 deaf children are born to hearing parents, and most of them start learning sign language from zero, after the diagnosis, while working full time. Video lessons can't tell you whether your hand is right. Signify can: your webcam checks every handshape in about half a second and tells you exactly what to fix ("Fold your ring finger", "Tuck your thumb in").

Built in 24 hours for Business Cup 2.0. Track: Skills.

## What works

| | |
|---|---|
| **Two sign languages, two interface languages** | ASL (26 letters) and LSM (29 signs: the Spanish alphabet plus LL and RR). The whole interface, coaching and stories switch between English and Spanish. About 1 in 5 deaf students in the US is Hispanic, and leading apps teach in English only |
| **Real-time recognition** | MediaPipe Hand Landmarker (21 3D points) + our own handshape classifier and motion detector, all in the browser |
| **Coaching** | When the sign is wrong, the app says what it sees ("That looks like B") and what to change |
| **Teach it my hand** | Hands and webcams differ. If a sign is roughly right but still not accepted after 8 s, the learner records ~1 s of their own version; from then on it counts (nearest-neighbour on the same features, stored only in their browser). Shapes that are clearly wrong are refused |
| **Animated hand** | Each letter is a Lotería-style card with a shaded 3D hand that folds from an open palm into the shape. The fingers that move are outlined; moving letters draw their path in the air |
| **Learning path** | 7 ASL / 8 LSM lessons: the full alphabet, letters drawn in the air, first family words. Learned letters get a bean on your *tabla* |
| **Story quests** | "Good morning, Mia" and "Park day": the dialogue only moves on when you sign the answer |
| **Sign Sprint + duel** | 60-second arcade with combos. Share a link: your friend plays the *same* sequence (seeded) and sees your score to beat |
| **Gamification** | Precision XP: the live skeleton turns green/yellow/red; 90%+ is a "Perfect Snap" (1.5× XP), sloppy shapes still pass at 0.5× (no hearts, no lockouts). Daily 5-minute warm-up with a 50 XP goal that keeps the streak, streak freezes, weekly leagues (Bronze → Diamond), sounds and vibration, share cards for Stories/LinkedIn |
| **Beyond the hands** | Facial grammar (raised brows for yes/no questions, furrowed brows for WH-questions, head shake for "no") practiced live with MediaPipe Face Landmarker; grammar basics; Deaf culture for hearing families; where to get support |
| **Recognition lab** | `#/lab`: live scores for every sign, plus a 2-second measurement you can copy (numbers only) to tune recognition |

No sign-up, no backend, no video upload: hand and face tracking run on the user's device. Progress is stored in the browser.

## Code map

| File | What it does |
|---|---|
| `js/camera.js` | Webcam → MediaPipe HandLandmarker (VIDEO mode, GPU with CPU fallback); face tracking on demand |
| `js/classifier.js` | Scale-invariant features (finger extension from joint angles, thumb position relative to the knuckles, fingertip distances, pointing direction) and one fuzzy rule per sign, for ASL and LSM. Works for left and right hands and a mirrored camera |
| `js/motion.js` | Letters that move, from a 1.8 s frame history: J (pinky hook), Z (index draws Z); LSM adds K (rises), Ñ / Q / RR (wiggle), X (forward and back), LL (slides sideways) |
| `js/personal.js` | "Teach it my hand" calibration |
| `js/face.js` | Facial grammar drills, measured against the learner's own neutral face |
| `js/handmodel.js` | Kinematic reference hand: draws every sign and generates test data |
| `js/handanim.js` | `<sign-hand>`: the animated, shaded hand |
| `js/ui.js` | Trainer: smoothing, hold-to-confirm (0.55 s), precision tiers, coaching |
| `js/app.js` | Pages: home, path, lessons, stories, sprint, daily warm-up, culture, progress, lab |
| `js/content.js`, `js/i18n.js` | Course content and interface text in English and Spanish |
| `js/store.js`, `js/gamify.js` | Progress, streak, leagues; sounds and share cards |

## Tests

```bash
node tests/classifier.test.mjs   # every ASL and LSM handshape × 200 randomly rotated/scaled/mirrored/noisy synthetic hands, non-letter shapes, moving letters
node tests/personal.test.mjs     # "teach it my hand": a learner's own version is accepted, other letters are not confused with it
node tests/face.test.mjs         # facial grammar drills on simulated face data
python3 -m http.server 8765 &
python3 tests/e2e.py             # full browser run with a simulated tracker: lessons, story, 60 s sprint, calibration, Spanish + LSM, daily warm-up, face drills, progress
```

## Run locally

Any static server works. The camera needs `localhost` or HTTPS:

```bash
python3 -m http.server 8765   # open http://localhost:8765
```

## Deploy

Static files only. GitHub Pages: Settings → Pages → Deploy from branch → `main` / root. Or import the repo into Vercel or Netlify with no build step.

## Business model

Freemium with a 7-day free trial. Free: the fingerspelling path, daily Sprint and duels. **Premium: $11.99/month or $59.99/year** (all stories and duels, unlimited practice, ASL and LSM). **Family: $129/year for up to 5 learners.** Inference runs on the user's device, so serving costs stay near zero as we grow, and duel links bring in new learners at no acquisition cost.

## Roadmap

Accounts unlock ranked leagues with other learners, shared family streaks, reminders by push/email and checkout for the trial. Next in the product: word signs with motion (a sequence model over landmark tracks), more stories, a parent–child co-play mode, and more sign languages.
