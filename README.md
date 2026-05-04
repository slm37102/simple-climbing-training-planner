# Simple Climbing Training Planner

A personal, single-user **PWA** that prescribes training every day for a 12-week periodized macrocycle (Base → Build → Peak → Taper) for an intermediate climber doing **both bouldering and sport**.

- **Static**: plain HTML / CSS / vanilla JS ES modules. **No build step.**
- **Offline-first**: PWA (service worker + manifest). Installable to phone home screen.
- **Sync (optional)**: Firebase Auth (Google sign-in) + Firestore mirror so phone & laptop stay in sync. JSON import/export as a separate manual backup.

## Quick start (local-only)

1. Serve the folder on `http://localhost`. Any static server works:
   ```powershell
   npx http-server . -c-1
   # or:  python -m http.server 8080
   ```
2. Open the URL in a browser.
3. On the auth gate, click **"Use locally only"**.
4. Fill in **Benchmarks** (bodyweight, max 10s hang on 20mm, 1RM weighted pull-up, grades, dominant style/angle) and a **cycle start date** (a Monday is recommended).
5. The **Today** tab is your default view. Each main day (Mon/Thu/Sat) gets a session with calculated load ranges and an explicit suggested kg.

## Enable Firebase sync

1. Create a Firebase project at <https://console.firebase.google.com>. Enable:
   - **Authentication** → Sign-in method → Google.
   - **Firestore Database** → Production mode.
2. Copy the web app config into `firebase-config.js` (replacing the `REPLACE_ME` placeholders).
3. Deploy `firestore.rules` (in this repo) — they restrict each user to their own document:
   ```
   match /users/{uid}/{document=**} { allow read,write: if request.auth.uid == uid; }
   ```
4. Reload the app. Click **"Sign in with Google"**. Your data will sync to `users/{uid}/state/main`.

## Deploy

Any static host works:

- **Firebase Hosting** (recommended — same project as Firestore):
  ```powershell
  npm i -g firebase-tools
  firebase login
  firebase init hosting   # public dir = .   single-page app = no
  firebase deploy
  ```
- GitHub Pages: push to a repo and enable Pages on the branch.
- Netlify / Vercel: drag-and-drop the folder.

The service worker requires the app to be served over **https** (or localhost) to work.

## How the program is built

- **Macrocycle** (12 weeks): Base wk 1–6 (`B B D B B D`), Build wk 7–9 (`B B D`), Peak wk 10–11 (`P P`), Taper wk 12 (`T`). Deload weeks (3, 6, 9) drop volume −50% and intensity −15%, and skip the accessory block. Weeks 3 and 6 run a **retest** session.
- **Weekly schedule**: Mon/Thu/Sat main, Wed/Fri rest, Tue/Sun light/optional. 3 finger-loading days/week (within Hörst's ≤4 cap, with 48–72h tendon recovery between hard days).
- **Hangboard protocols by phase**: Min-Edge (Base) → Max-Weight 10s (Build) → 7-53 (Peak) → 7/3 Repeaters (Taper). All from Hörst.
- **Load resolution**: prev-actual → auto-adjust ±5% by RPE → readiness multiplier (×0.85/1.0/1.05) → deload ×0.85.
- **Antagonist block** (push-ups / rows / wrist extensors / farmer's carry / core) on Mon main days; auto-dropped during deloads.
- **Campus board** is gated to Peak boulder weeks only.
- **ARC** sessions appear on sport-emphasis Saturdays during Base.

## Sync model

- LocalStorage is the **primary local cache** (instant first paint, full offline). Firestore is mirrored at `users/{uid}/state/main`.
- On open: render from LocalStorage, then `onSnapshot` merges remote in (per-day Last-Write-Wins by `updatedAt`).
- On edit: write LocalStorage immediately, debounce 800ms then write to Firestore.
- Trade-off: simultaneous edits to the same day from two devices in the same minute resolve as last-write-wins. Acceptable for a single user.
- The Firebase web config is **public** by design; security is enforced by Firestore rules tied to your Google UID.

## Files

```
index.html               App shell, tabs, auth gate
manifest.webmanifest     PWA manifest
sw.js                    Service worker (cache-first shell, bypass Firestore)
firebase-config.js       Public Firebase web config (edit me)
firestore.rules          Per-user access rules
icons/                   192/512/apple-touch (placeholders — replace with your own)
css/styles.css           Mobile-first styles
js/app.js                Entry, router, SW registration, auth gate
js/program.js            12-week macrocycle, phase patterns, session library
js/loads.js              Load ranges → kg, auto-adjust, readiness, deload
js/storage.js            LocalStorage + JSON import/export + LWW remote merge
js/sync.js               Firebase Google sign-in + Firestore mirror
js/warmup.js             Warm-up & cooldown checklists
js/views/                Today, Week, Calendar, Benchmarks, Log, Settings
```

## Disclaimer

Not medical advice. Listen to your body — pain ≠ progress. Stop and consult a professional if anything hurts.
