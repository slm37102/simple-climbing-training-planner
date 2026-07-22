# Simple Climbing Training Planner

A personal, single-user **PWA** that prescribes training every day for a periodized macrocycle (Base → Build → Peak → Taper, configurable 8–40 weeks, default 12) for one intermediate climber (V5–V6 boulder / ~7a lead) doing **both bouldering and sport**.

- **Static**: plain HTML / CSS / vanilla JS ES modules. **No build step, no bundler, no npm runtime deps.**
- **Offline-first**: PWA (service worker + manifest). Installable to phone home screen.
- **Sync (optional)**: Firebase Auth (Google sign-in) + Firestore mirror so phone & laptop stay in sync. JSON import/export as a separate manual backup.
- **Autoregulated**: loads adjust from logged RPE, layoffs, and a daily readiness check-in; the app also watches its own history for drift (readiness trend, stalled retest trajectory, high pain-gate frequency, missed-session gaps) and surfaces one-tap advisories rather than silently changing the plan.

## Quick start (local-only)

1. Serve the folder on `http://localhost`. Any static server works:
   ```powershell
   npx http-server . -c-1
   # or:  python -m http.server 8080
   ```
2. Open the URL in a browser.
3. On the auth gate, click **"Use locally only"**.
4. A 5-step onboarding wizard walks a new plan through goal (discipline + target grade), current maxes, and schedule (anchor mode, calendar, cycle length). Or fill in **Benchmarks** (bodyweight, max 10s hang on 20mm, 1RM weighted pull-up, grades, dominant style/angle) directly on the **Profile** tab.
5. The **Today** tab is your default view. Each main day (Mon/Thu/Sat) gets a session with calculated load ranges and an explicit suggested kg. Use the ◀ / ▶ arrows above the session card to log a day you missed; tap **Jump to today** to return. Today is read/write; **Log** is a read-only feed of past days — to correct a past entry, navigate Today to that date instead.
6. The **Cycle** tab shows the whole macrocycle as a month-grouped week grid with phase colors, deload hatching, and a comp-day marker. Tap any day for its session detail, then open it in Today. Benchmarks, plans, and app settings live in the **Profile** tab, which also shows the limiter readout (how your strength benchmarks compare to norms for your target grade) when enough data is present.

## Smoke tests

Open `http://<your-host>/tests/` (e.g. `http://127.0.0.1:8765/tests/` locally, or the deployed site's `/tests/` path) to run the in-browser smoke suite (`tests/index.html`, cases under `tests/cases/*.js`, one file per domain area — no CLI runner, no test framework). It covers storage round-trips, Today input persistence, the optional-exercise Done checkbox, `Program.resolveDate`/phase math, replan/gap detection, the technique-drill library, progression templates, the Calendar view, total-load kg math, style cues, hybrid-mode mixing, the limiter readout, benchmark-refresh slots, monitoring signals, and readiness gating. The page mutates `localStorage` — click **Clear** before returning to the live app to avoid surprises.

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

Set `SYNC_ENABLED = false` in `firebase-config.js` for a local-only build.

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

The service worker requires the app to be served over **https** (or localhost) to work. `sw.js` is generated, not hand-edited — see `tools/generate-sw.mjs` and the `deploy` skill.

## How the program is built

- **Macrocycle**: length is configurable (8–40 weeks, default 12), and the phase split is *derived* from length, not hardcoded (`docs/adr/0002`). Deloads land every **4th** week (3 hard : 1 deload — `docs/adr/0004`) and cut **volume ~40% (sets ×0.6) while holding intensity** — kg is never scaled down on a deload (`docs/adr/0003`). The **last Base week** of each block is also the **retest** session. Taper length follows the plan's **peak type** (comp 1 wk, trip/project 2 wk — `docs/adr/0007`), keeps near-peak loads with cut volume, and the day before the goal is a forced rest day.
- **Cycles above 20 weeks run a double block** (two Base→Build cycles before Peak/Taper) instead of one long block.
- **Two anchor modes**: `startDate` (plan begins on a chosen Monday; a missed-session gap can offer to shift the schedule forward, `docs/adr/0008`) or `compDate` (the plan is built backwards from a fixed goal date, so a gap is shown as information only — the goal date never moves).
- **Weekly schedule**: Mon/Thu/Sat main, Wed/Fri rest, Tue/Sun light/optional. 3 finger-loading days/week (within Hörst's ≤4 cap, with 48–72h tendon recovery between hard days).
- **Hangboard protocols by phase**: 7/3 Repeaters + intro max-hangs (Base) → Max-Weight 10s, 2×4 @ RPE 8–9 (Build) → 7-53 (Peak) → near-max taper touch. Drawn from the Hörst / López / Lattice protocol families — see `docs/training-philosophy.md` and `docs/adr/0005`.
- **Power-endurance** runs a two-band model (`docs/adr/0006`): 60/60 threshold intervals in Build (sport weeks), 30/30 lactic sharpening only in the final ≤4 weeks, with interval rest tightening 5s/week toward the goal.
- **Hybrid focus mixes within the week, not across it**, in Base/Build (`docs/adr/0010`) — e.g. Saturday alternates a boulder format with a sport format week to week rather than the whole week flipping identity.
- **Loads are % of total system load** (bodyweight + benchmark), not added weight alone (`docs/adr/0013`) — a set bodyweight benchmark is required before hangboard/pull-up kg can be computed.
- **Load resolution**: prev-actual → layoff decay (guards against resuming at full load after a break) → auto-adjust ±5% (or +2.5% on a hit-target streak) by RPE → readiness multiplier (×0.85/1.0/1.05, or a rest suggestion), capped at +5% upward per session. No deload step here — deload is a volume cut, not an intensity cut.
- **Readiness gating** (`docs/adr/0015`) can scale down or swap a finger-loading session based on the day's readiness check-in, independent of the deload cadence — both can apply to the same day.
- **Antagonist block** (push-ups / rows / wrist extensors / farmer's carry) plus a standalone **Core** exercise on Monday main days; auto-dropped during deloads.
- **Campus board** is gated to Peak boulder weeks only. **ARC** sessions appear on sport-emphasis Saturdays during Base.
- **Technique drills** (19, across footwork/positioning/reading/pacing/mental) back both the Tuesday light-day picker and the Thu/Sat warm-up picker — see `js/drills.js`.
- **Benchmark retests** append to a dated history (`docs/adr/0014`) rather than overwriting, feeding a stalled-progress monitoring signal; the **limiter readout** (`docs/adr/0011`, Profile tab) is a separate, purely informational comparison of current benchmarks against grade-anchored norms — it never changes a prescription.
- **Optional exercises** (e.g. optional skill drills, easy open climbing, optional forearm repeater test) render as a single "Done ✓" checkbox instead of numeric inputs — no need to log sets/reps/kg for things that aren't prescribed loads.

## Sync model

- LocalStorage is the **primary local cache** (instant first paint, full offline). Firestore is mirrored at `users/{uid}/state/main`.
- On open: render from LocalStorage, then `onSnapshot` merges remote in (per-plan, per-day Last-Write-Wins by `updatedAt`).
- On edit: write LocalStorage immediately, debounce 800ms then write to Firestore.
- Trade-off: simultaneous edits to the same day from two devices in the same minute resolve as last-write-wins. Acceptable for a single user.
- The Firebase web config is **public** by design; security is enforced by Firestore rules tied to your Google UID.

## Files

```
index.html               App shell, tabs, auth gate
manifest.webmanifest     PWA manifest
sw.js                    Service worker (generated — see tools/generate-sw.mjs)
firebase-config.js       Public Firebase web config (edit me)
firestore.rules          Per-user access rules
icons/                   192/512/apple-touch (placeholders — replace with your own)
css/styles.css           Mobile-first styles
js/app.js                Entry, router, SW registration, auth gate
js/program.js            Macrocycle (configurable length), phase patterns, session library
js/loads.js              Load ranges → kg, auto-adjust, readiness, layoff decay
js/monitoring.js         Reactive drift signals (readiness trend, retest trajectory, pain-gate frequency, ...)
js/limiter.js            Informational benchmark-vs-norm readout for the Profile tab
js/replan.js             Missed-session gap detection (feeds the Today gap banner)
js/drills.js             Technique-drill catalog (Tuesday picker + Thu/Sat warm-up picker)
js/storage.js            LocalStorage + JSON import/export + LWW remote merge, schema migrations
js/sync.js               Firebase Google sign-in + Firestore mirror
js/warmup.js             Warm-up & cooldown checklists
js/exercise-inputs.js    Shared per-kind input-visibility helper (Today + Log)
js/dates.js              Shared local-time date helpers
js/ui.js                 Shared UI helpers (toast, HTML escape)
js/views/                Today, Calendar (Cycle), Log, Profile, Onboarding wizard
tests/index.html         In-browser smoke-test runner (shell only)
tests/cases/*.js         Smoke-test cases, one file per domain area
tools/generate-sw.mjs    Regenerates sw.js's cached SHELL list and bumps CACHE
tools/generate-schedule.mjs  Regenerates docs/training-plan.md's schedule tables from js/program.js
```

## Documentation

Start at [`docs/project-goals.md`](docs/project-goals.md) — why this exists, the three goals, and how the other docs relate.

```
docs/project-goals.md         Goals & design principles (entry point)
docs/knowledge-gaps.md        What we don't know yet — gaps, divergences, open decisions
docs/training-philosophy.md   What we believe and why (protocols, sources, evidence tiers)
docs/training-plan.md         Human-readable prescription tables (mirror of js/program.js)
docs/benchmark-norms.md       Grade-anchored finger/pulling-strength norms behind the limiter readout
docs/adr/                     Decisions and their trade-offs
docs/specs/                   Locked feature specs awaiting or guiding implementation
docs/research/                Evidence corpus (verified claims + raw gathered claims)
docs/coach-review.md          External coaching audit — adversarial review of the plan the code generates
docs/improvement-audit.md     Engineering audit (sync, correctness, UX, PWA) — not training content
docs/trip-conversion-note.md  Converting Peak/Taper for an outdoor trip instead of a comp/gym goal
docs/end-of-cycle-review.md   Manual walkthrough checklist after each macrocycle completes
docs/return-from-tweak.md     Return-from-finger-tweak guide — pain gate, de-escalation, reload ramp
CONTEXT.md                    Domain glossary (repo root by convention)
```

## Disclaimer

Not medical advice. Listen to your body — pain ≠ progress. Stop and consult a professional if anything hurts.
