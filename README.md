# Simple Climbing Training Planner

A personal, single-user **PWA** that prescribes training every day for a periodized macrocycle (Base → Build → Peak → Taper, configurable 8–40 weeks, default 12) for an intermediate climber doing **both bouldering and sport**.

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
5. The **Today** tab is your default view. Each main day (Mon/Thu/Sat) gets a session with calculated load ranges and an explicit suggested kg. Use the ◀ / ▶ arrows above the session card to log a day you missed; tap **Jump to today** to return.
6. The **Cycle** tab shows the whole macrocycle as a month-grouped week grid with phase colors, deload hatching, and a comp-day marker. Tap any day for its session detail, then open it in Today. Benchmarks, plans, and app settings live in the **Profile** tab; new plans start with a guided 5-step wizard.

## Smoke tests

Open `http://<your-host>/tests/` (e.g. `http://127.0.0.1:8765/tests/` locally, or `https://simple-climbing-planner.web.app/tests/` on the deployed site) to run the in-browser smoke suite. It exercises storage round-trips, Today input persistence, Log edit Save, optional-exercise Done checkbox, and `Program.resolveDate`. The page mutates `localStorage` — click **Clear** before returning to the live app to avoid surprises.

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

- **Macrocycle** (default 12 weeks; length configurable 8–40, phase split derived — see `docs/adr/0002`): Base wk 1–6 (`B B D B B D`), Build wk 7–9 (`B B D`), Peak wk 10–11 (`P P`), Taper wk 12 (`T`). Deload weeks (3, 6, 9) cut **volume ~40% (sets ×0.6) while holding intensity** — kg is never scaled down on a deload (see `docs/adr/0003`) — and skip the accessory block. The **last Base week** (wk 6 here) is also the **retest** session.
- **Weekly schedule**: Mon/Thu/Sat main, Wed/Fri rest, Tue/Sun light/optional. 3 finger-loading days/week (within Hörst's ≤4 cap, with 48–72h tendon recovery between hard days).
- **Hangboard protocols by phase**: Min-Edge (Base) → Max-Weight 10s (Build) → 7-53 (Peak) → 7/3 Repeaters (Taper). Drawn from the Hörst / López protocol families — see `docs/training-philosophy.md` (and `docs/knowledge-gaps.md` KG-B2 for an open sequencing question).
- **Load resolution**: prev-actual → auto-adjust ±5% by RPE → readiness multiplier (×0.85/1.0/1.05, or rest suggestion). No deload step here — deload is a volume cut, not an intensity cut.
- **Antagonist block** (push-ups / rows / wrist extensors / farmer's carry / core) on Mon main days; auto-dropped during deloads.
- **Campus board** is gated to Peak boulder weeks only.
- **ARC** sessions appear on sport-emphasis Saturdays during Base.
- **Optional exercises** (e.g. optional skill drills, easy open climbing, optional forearm repeater test) render as a single "Done ✓" checkbox instead of numeric inputs — no need to log sets/reps/kg for things that aren't prescribed loads.

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
js/program.js            Macrocycle (configurable length), phase patterns, session library
js/loads.js              Load ranges → kg, auto-adjust, readiness
js/storage.js            LocalStorage + JSON import/export + LWW remote merge
js/sync.js               Firebase Google sign-in + Firestore mirror
js/warmup.js             Warm-up & cooldown checklists
js/exercise-inputs.js    Shared per-kind input-visibility helper (Today + Log)
js/dates.js              Shared local-time date helpers
js/ui.js                 Shared UI helpers (toast, HTML escape)
js/views/                Today, Calendar (Cycle), Log, Profile, Onboarding wizard
tests/index.html         In-browser smoke-test runner
```

## Documentation

Start at [`docs/project-goals.md`](docs/project-goals.md) — why this exists, the three goals, and how the other docs relate.

```
docs/project-goals.md         Goals & design principles (entry point)
docs/knowledge-gaps.md        What we don't know yet — gaps, divergences, open decisions
docs/training-philosophy.md   What we believe and why (protocols, sources, evidence tiers)
docs/training-plan.md         Human-readable prescription tables
docs/adr/                     Decisions and trade-offs
docs/research/                Evidence corpus (verified claims + raw gathered claims)
docs/improvement-audit.md     Engineering audit (implemented; status note inside)
CONTEXT.md                    Domain glossary (repo root by convention)
```

## Disclaimer

Not medical advice. Listen to your body — pain ≠ progress. Stop and consult a professional if anything hurts.
