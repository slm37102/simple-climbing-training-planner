# Climbing Macrocycle — Training Plan Summary

A periodised plan for intermediate–advanced climbers (bouldering or sport focus). Cycle length is configurable (8–40 weeks; the phase split is derived — see `adr/0002-configurable-cycle-length.md`); the tables below show the **default 12-week** layout.  
Load targets are calculated automatically from your benchmarks (max 20mm hang, 1RM pull-up, bodyweight).

---

## Weekly Schedule

| Day | Slot | Type |
|-----|------|------|
| Mon | `mon-main` | Hangboard + S&C (primary strength session) |
| Tue | `tue-light` | Mobility / skill drills (light) |
| Wed | `rest` | Full rest |
| Thu | `thu-main` | Climbing session (boulder or sport) |
| Fri | `rest` | Full rest |
| Sat | `sat-main` | Climbing session (boulder or sport) |
| Sun | `sun-optional` | Optional open climbing |

> **Flavor alternation:** odd weeks lean boulder, even weeks lean sport.  
> Sessions adapt accordingly (e.g. campus work on boulder weeks, route intervals on sport weeks).

---

## Phase Overview (12 Weeks)

Deloads land every **4th** week (3 hard : 1 deload — `adr/0004-deload-cadence-3-to-1.md`), plus the forced retest-deload that ends each Base block. Taper length follows the plan's **peak type** (comp 1 wk · trip/project 2 wk — `adr/0007-taper-hold-intensity-peaktype.md`); the day before the goal is always a full rest day.

| Wk | Phase | Deload | Notes |
|----|-------|--------|-------|
| 1 | **Base** | — | |
| 2 | **Base** | — | |
| 3 | **Base** | — | |
| 4 | **Base** | ✓ Deload | |
| 5 | **Base** | — | |
| 6 | **Base** | ✓ Deload + **Retest** | Re-test benchmarks → loads recalculate |
| 7 | **Build** | — | |
| 8 | **Build** | — | |
| 9 | **Build** | — | |
| 10 | **Peak** | — | |
| 11 | **Peak** | — | |
| 12 | **Taper** | — | Volume cut, intensity held; full rest the day before the goal |

---

## Monday — Hangboard + S&C

The primary strength session. Protocol intensifies each phase.

### Hangboard Protocol by Phase

Base is a two-exercise pair (`adr/0005-base-build-hangboard-protocols.md`): capacity repeaters plus an introductory low-end max-hang block. The old min-edge-to-failure protocol is deleted.

| Phase | Protocol | Duration | Sets × Reps | Edge | Load |
|-------|----------|----------|-------------|------|------|
| **Base** (pair, 1 of 2) | 7/3 Repeaters | 7s on / 3s off × 6 reps | 2 sets per grip (half-crimp + open-crimp) | 20mm | Bodyweight |
| **Base** (pair, 2 of 2) | Max hangs (intro) | 10s weighted | 2 sets × 3 hangs | 20mm | 55–70% max-hang added load |
| **Build** | Max-Weight 10s | 10s weighted | 2 sets × 4 hangs (RPE 8–9, leave 1–2s in reserve) | 20mm | 80–90% max-hang added load |
| **Peak** | 7-53 Protocol | 7s on / 53s off | 3–4 sets × 3 hangs | 20mm | 85–95% max-hang added load |
| **Taper** | Near-max hangs (touch) | 10s weighted | 1 set × 2–3 hangs — short & crisp, stop fresh | 20mm | 80–85% max-hang added load |

### Weighted Pull-up Protocol by Phase

| Phase | Sets × Reps | Load | RPE |
|-------|-------------|------|-----|
| **Base** | 5 × 5 | 55–70% 1RM | 7–8.5 |
| **Build** | 5 × 3 | 80–90% 1RM | 8.5–9.5 |
| **Peak** | 5 × 2 | 85–90% 1RM (capped — `adr/0001`) | 9–9.5 |
| **Taper** | 2 × 2 | 80–90% 1RM | 9–9.5 |

### S&C Antagonist Block *(skipped on deload weeks)*

| Exercise | Prescription |
|----------|-------------|
| Push-ups | 3 × 15–25 |
| Inverted rows / band cactus | 3 × 10–15 |
| Wrist extensor curls | 3 × 20 |
| Farmer's carry | 3 × 20–30 steps |
| Core (plank / HKR / L-sit) | Choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit |

**Boulder-focus plans, Build Mondays only:** light campus warm-up ladders added after hangboard (2–3 ladders, RPE 7–8). No campus on Peak Mondays (`adr/0001`) — Peak campus work lives in Thursday's session.

---

## Thursday — Climbing Session

Varies by phase and week flavor (boulder / sport).

### Boulder-flavor Thursdays

| Phase | Session | Prescription |
|-------|---------|-------------|
| Base | Projecting / technique boulders | 60–90 min projecting on submaximal problems |
| Build | Limit bouldering | 3–5 problems · 3–5 attempts · 3–5 min rest · 2–3 sets |
| Peak | Limit bouldering + Campus | 1–3 limit sequences, stop when power drops + basic campus ladders only, readiness-gated (`adr/0001`) |
| Taper | Flash-grade boulders | 6–10 problems below max · long rests |

### Sport-flavor Thursdays

| Phase | Session | Prescription |
|-------|---------|-------------|
| Base | Route pyramid | 4-3-2-1 routes back-to-back · 1 grade below redpoint |
| Build | 60/60 threshold intervals | 60s moderate-hard / 60s rest · 10–30 min · RPE ≤8.5 (band 1 — `adr/0006`) |
| Peak | 30/30 lactic sharpening | 30s all-out / 30s rest × 6 · 2–3 sets · RPE 9.5–10, rest between sets tightens 5s/week (band 2 — `adr/0006`) |
| Taper | Project / redpoint attempts | 2–3 quality goes on a project |

---

## Saturday — Climbing Session

### Boulder-flavor Saturdays

| Phase | Session | Prescription |
|-------|---------|-------------|
| Base / Build | Boulder triples + open climb | 4×4 triples (4 boulders, 4 min rest — tightens 5s/wk in the final 4 weeks, 3–4 sets) + *optional* 30–45 min mileage |
| Peak | Project boulder session | 1–3 hard problems · max 5 quality attempts each · 5+ min rest + flash/onsight attempts |
| Taper | Low-volume bouldering | 45–60 min at 2–3 grades below max · no projecting |

### Sport-flavor Saturdays

| Phase | Session | Prescription |
|-------|---------|-------------|
| Base | ARC — aerobic base | 2 × 30 min continuous easy climbing @ 60–70% effort |
| Build | 4×4 power-endurance | 4 routes/links · 4 min rest · 3 sets · 50–60% redpoint |
| Peak | Redpoint session | 2–4 quality redpoint attempts · 20+ min rest between goes |
| Taper | Sport route mileage | 6–10 routes at 1–2 grades below redpoint |

---

## Tuesday — Light Day

| Exercise | Notes |
|----------|-------|
| 15–20 min mobility | Shoulders, hips, wrists |
| Skill drills (optional) | Footwork / silent feet / flagging — no finger load |

---

## Retest Session (last Base week — Deload Monday; wk 6 in the default 12-week layout)

Replaces the normal Mon hangboard session. Record results → tap **"Save as Benchmark"** to auto-recalculate all future loads.

| Test | Protocol |
|------|----------|
| Max 10s hang on 20mm edge | Find heaviest 10s hold (RPE 9.5 cap) |
| 1RM weighted pull-up | Work up to 1 hard rep |
| Max boulder grade | Flash/send hardest in 60 min |
| Forearm repeater test *(optional)* | 7/3 to failure on 20mm @ bodyweight |

---

## Deload Rules

- Cadence: every 4th week within Base and Build — 3 hard : 1 deload (see `adr/0004-deload-cadence-3-to-1.md`)
- Volume cut ~40% (numeric sets ×0.6, min 1) with **intensity held** — kg stays at working level (see `adr/0003-deload-as-volume-cut.md`)
- Taper weeks apply the same volume cut with intensity held (see `adr/0007-taper-hold-intensity-peaktype.md`)
- Hangboard days: no S&C antagonist block
- Climbing sessions: same ~40% volume cut; focus on quality, not quantity
- No new PRs — keep efforts crisp, stop well short of failure
- Sleep, nutrition, and recovery are the priority

---

## Load Calculation Logic

1. **Benchmark %** — load range set from `maxHang20mm` or `pullup1RM`
2. **Seed** — previous actual kg if logged; else range midpoint
3. **Auto-adjust** ±5% based on previous session's avg RPE vs target RPE; when RPE was **in range and all prescribed sets/reps were completed**, the load progresses **+2.5%** instead of holding (targets-hit rule, `adr/0009-intra-phase-progression.md`)
4. **Readiness multiplier** — from daily readiness check-in: ×0.85 / ×1.0 / ×1.05 (or a rest suggestion instead of a load)
5. **Upward cap** — the total upward move is capped at **+5% per session** (stacked multipliers can't exceed the evidence band; downward moves are never capped — `adr/0009`)

Base-phase aerobic climbing sessions (route pyramid, ARC) additionally **ramp their volume target ×1.1 per hard Base week (cap ×1.3)**, with deload weeks cutting the unramped template — the verified ramp-then-halve shape (`adr/0009`).

Deload weeks do **not** scale kg — they cut prescribed volume instead (handled in `js/program.js`, see the Deload Rules above).

Each step is shown in the "reason" tooltip next to the suggested load on the Today tab.

---

## Benchmarks to Track

| Metric | Used for |
|--------|----------|
| `maxHang20mm` (kg added) | Hangboard load targets |
| `pullup1RM` (kg added) | Pull-up load targets |
| `bodyweight` (kg) | Included in total hanging load display |

Update via the **Retest session** at the end of each Base block (week 6 in the default layout), or manually in Profile.

---

## Generated 12-Week Schedule (hybrid focus, comp peak)

> **Auto-generated from `js/program.js`** (`Program.build`, default 12-week cycle, `focus: hybrid`, `peakType: comp`).
> Regenerate with `node tools/generate-schedule.mjs` after changing `js/program.js` — do not hand-edit this section.
> Loads show the prescribed **% of total system load** (bodyweight + benchmark — ADR-0013); the app converts these to added kg from your benchmarks and applies targets-hit progression / auto-adjust / readiness / layoff-decay on the day (ADR-0009).
> Deload/taper volume cuts and the Base aerobic volume ramp are shown already applied. Every session gets the standard two-stage warm-up and cool-down from `js/warmup.js`.

### Week 1 — Base · boulder-flavor week

- **Mon** — Hangboard (base) + S&C *(Strength / alactic)*
  - **7/3 Repeaters** — 7s × 6 reps, 2 sets per grip (half-crimp + open-crimp) · rest 3s within / 3 min between sets · bodyweight · RPE 7.5–8.5
  - **Max hangs (intro)** — 10s weighted, 3 hangs × 2 sets — low-end load, crisp form · rest 3 min · 80–85% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 5 · 2 min between sets · 75–82% of 1RM total load · RPE 7–8.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Projecting / technique boulders *(Skill / Strength)*
  - **Projecting (mid-grade)** — 60–90 min of 4×4-style projecting on submaximal problems · RPE 7.5–9 · target: 75 min
- **Fri** — Rest day
- **Sat** — Flash pyramid (Base) *(Aerobic capacity)*
  - **Flash pyramid** — 15–20 problems well below max · pyramid up and down through 2–3 grades · brief rest between problems · RPE 6–7.5 · target: 18 problems
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 2 — Base · sport-flavor week

- **Mon** — Hangboard (base) + S&C *(Strength / alactic)*
  - **7/3 Repeaters** — 7s × 6 reps, 2 sets per grip (half-crimp + open-crimp) · rest 3s within / 3 min between sets · bodyweight · RPE 7.5–8.5
  - **Max hangs (intro)** — 10s weighted, 3 hangs × 2 sets — low-end load, crisp form · rest 3 min · 80–85% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 5 · 2 min between sets · 75–82% of 1RM total load · RPE 7–8.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Route pyramid (Base) *(Aerobic capacity)* — _Base hard week 2 — aerobic volume +10% (ADR-0009)_
  - **Route pyramid** — pyramid 4-3-2-1 routes · walking rest between routes; 1 grade below redpoint · RPE 7–8 · target today: 11 routes (ramped up from 10)
- **Fri** — Rest day
- **Sat** — ARC — aerobic base *(Aerobic base)* — _Base hard week 2 — aerobic volume +10% (ADR-0009)_
  - **ARC (continuous easy climbing)** — 2 × 30 min, just below pump · 10 min rest between sets · OR 90 min easy laps · RPE 4–6 · target today: 35 min (ramped up from 30)
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 3 — Base · boulder-flavor week

- **Mon** — Hangboard (base) + S&C *(Strength / alactic)*
  - **7/3 Repeaters** — 7s × 6 reps, 2 sets per grip (half-crimp + open-crimp) · rest 3s within / 3 min between sets · bodyweight · RPE 7.5–8.5
  - **Max hangs (intro)** — 10s weighted, 3 hangs × 2 sets — low-end load, crisp form · rest 3 min · 80–85% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 5 · 2 min between sets · 75–82% of 1RM total load · RPE 7–8.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Projecting / technique boulders *(Skill / Strength)*
  - **Projecting (mid-grade)** — 60–90 min of 4×4-style projecting on submaximal problems · RPE 7.5–9 · target: 75 min
- **Fri** — Rest day
- **Sat** — Flash pyramid (Base) *(Aerobic capacity)* — _Base hard week 3 — aerobic volume +20% (ADR-0009)_
  - **Flash pyramid** — 15–20 problems well below max · pyramid up and down through 2–3 grades · brief rest between problems · RPE 6–7.5 · target today: 22 problems (ramped up from 18)
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 4 — Base (deload) · sport-flavor week

- **Mon** — Hangboard (base) + S&C *(Strength / alactic)* — _deload: volume −40%, intensity held_
  - **7/3 Repeaters** — 7s × 6 reps, 2 sets per grip (half-crimp + open-crimp) · Deload: drop ~40% volume · rest 3s within / 3 min between sets · bodyweight · RPE 7.5–8.5
  - **Max hangs (intro)** — 10s weighted, 3 hangs × 2 sets — low-end load, crisp form · Deload: drop ~40% volume · rest 3 min · 80–85% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 5 · (sets today: 3 × 5) · 2 min between sets · 75–82% of 1RM total load · RPE 7–8.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets · Deload: drop ~40% volume; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets · Deload: drop ~40% volume; Wrist extensor curls: 3 × 20 · 60s rest between sets · Deload: drop ~40% volume; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets · Deload: drop ~40% volume; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets · Deload: drop ~40% volume
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Route pyramid (Base) *(Aerobic capacity)* — _deload: volume −40%, intensity held_
  - **Route pyramid** — pyramid 4-3-2-1 routes · walking rest between routes; 1 grade below redpoint · RPE 7–8 · target today: 6 routes (cut from 10)
- **Fri** — Rest day
- **Sat** — ARC — aerobic base *(Aerobic base)* — _deload: volume −40%, intensity held_
  - **ARC (continuous easy climbing)** — 2 × 30 min, just below pump · 10 min rest between sets · OR 90 min easy laps · RPE 4–6 · target today: 20 min (cut from 30)
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 5 — Base · boulder-flavor week

- **Mon** — Hangboard (base) + S&C *(Strength / alactic)*
  - **7/3 Repeaters** — 7s × 6 reps, 2 sets per grip (half-crimp + open-crimp) · rest 3s within / 3 min between sets · bodyweight · RPE 7.5–8.5
  - **Max hangs (intro)** — 10s weighted, 3 hangs × 2 sets — low-end load, crisp form · rest 3 min · 80–85% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 5 · 2 min between sets · 75–82% of 1RM total load · RPE 7–8.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Projecting / technique boulders *(Skill / Strength)*
  - **Projecting (mid-grade)** — 60–90 min of 4×4-style projecting on submaximal problems · RPE 7.5–9 · target: 75 min
- **Fri** — Rest day
- **Sat** — Flash pyramid (Base) *(Aerobic capacity)* — _Base hard week 4 — aerobic volume +30% (ADR-0009)_
  - **Flash pyramid** — 15–20 problems well below max · pyramid up and down through 2–3 grades · brief rest between problems · RPE 6–7.5 · target today: 23 problems (ramped up from 18)
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 6 — Base (deload + retest) · sport-flavor week

- **Mon** — Re-test benchmarks *(Test)* — _retest — benchmarks recalculate after this_
  - **Max 10s hang on 20mm edge** — find heaviest 10s hold (RPE 9.5 cap) · 3–5 min rest between attempts
  - **1RM weighted pull-up** — work up to 1 hard rep · 3–5 min rest between attempts
  - **Max boulder grade today** — flash/send the hardest you can in 60 min
  - **(optional) Forearm repeater test** — 7/3 to failure on 20mm @ BW · *(optional)*
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Route pyramid (Base) *(Aerobic capacity)* — _deload: volume −40%, intensity held_
  - **Route pyramid** — pyramid 4-3-2-1 routes · walking rest between routes; 1 grade below redpoint · RPE 7–8 · target today: 6 routes (cut from 10)
- **Fri** — Rest day
- **Sat** — ARC — aerobic base *(Aerobic base)* — _deload: volume −40%, intensity held_
  - **ARC (continuous easy climbing)** — 2 × 30 min, just below pump · 10 min rest between sets · OR 90 min easy laps · RPE 4–6 · target today: 20 min (cut from 30)
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 7 — Build · boulder-flavor week

- **Mon** — Hangboard (build) + S&C *(Strength / alactic)*
  - **Max-Weight 10s** — 10s weighted, 4 hangs × 2 sets — leave 1–2s in reserve; ±2–5 kg between sets by margin · rest 3 min · 87–92% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 3 · 3 min between sets · 84–89% of 1RM total load · RPE 8.5–9.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Limit Bouldering (Build) *(Strength)*
  - **Limit boulders** — 3–5 problems · 3–5 attempts · 3–5 min rest · 2–3 sets · RPE 8.5–9.5 · target: 4 problems
- **Fri** — Rest day
- **Sat** — Boulder triples + open climb *(Anaerobic capacity)*
  - **Boulder triples (4×4)** — 4 boulders · climbed back-to-back · 4 min rest · 3–4 sets · 2–3 grades below max · RPE 8.5–9.5 · target: 4 sets
  - **Open climbing (technique)** — 30–45 min mileage on submax problems · RPE 6–7.5 · target: 40 min · *(optional)*
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 8 — Build · sport-flavor week

- **Mon** — Hangboard (build) + S&C *(Strength / alactic)*
  - **Max-Weight 10s** — 10s weighted, 4 hangs × 2 sets — leave 1–2s in reserve; ±2–5 kg between sets by margin · rest 3 min · 87–92% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 3 · 3 min between sets · 84–89% of 1RM total load · RPE 8.5–9.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Limit Bouldering (Build) *(Strength)*
  - **Limit boulders** — 3–5 problems · 3–5 attempts · 3–5 min rest · 2–3 sets · RPE 8.5–9.5 · target: 4 problems
- **Fri** — Rest day
- **Sat** — 60/60 threshold intervals (Build, Sat) *(Aerobic power)*
  - **60/60 intervals** — 60s moderately hard climbing / 60s rest · 10–30 min total · stop before the deep pump (never above 8.5) · RPE 7–8.5 · target: 20 min
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 9 — Build · boulder-flavor week

- **Mon** — Hangboard (build) + S&C *(Strength / alactic)*
  - **Max-Weight 10s** — 10s weighted, 4 hangs × 2 sets — leave 1–2s in reserve; ±2–5 kg between sets by margin · rest 3 min · 87–92% of max-hang total load · RPE 8–9
  - **Weighted pull-ups** — 5 × 3 · 3 min between sets · 84–89% of 1RM total load · RPE 8.5–9.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Limit Bouldering (Build) *(Strength)*
  - **Limit boulders** — 3–5 problems · 3–5 attempts · 3–5 min rest · 2–3 sets · RPE 8.5–9.5 · target: 4 problems
- **Fri** — Rest day
- **Sat** — Boulder triples + open climb *(Anaerobic capacity)*
  - **Boulder triples (4×4)** — 4 boulders · climbed back-to-back · 3:55 rest · 3–4 sets · 2–3 grades below max · RPE 8.5–9.5 · target: 4 sets
  - **Open climbing (technique)** — 30–45 min mileage on submax problems · RPE 6–7.5 · target: 40 min · *(optional)*
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 10 — Peak · sport-flavor week

- **Mon** — Hangboard (peak) + S&C *(Strength / alactic)*
  - **7-53 protocol** — 7s weighted, 3 hangs × 3–4 sets · rest 53s within set, 3 min between sets · 92–96% of max-hang total load · RPE 9–9.5
  - **Weighted pull-ups** — 5 × 2 · 3 min between sets · 88–90% of 1RM total load · RPE 9–9.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — 30/30 lactic sharpening (Peak) *(Anaerobic lactic)*
  - **30/30 intervals** — 30s all-out / 30s rest × 6 = 1 set · 3:50 between sets · 2–3 sets · deep pump expected, stop when movement degrades · RPE 9.5–10 · target: 2 sets
- **Fri** — Rest day
- **Sat** — Lead comp simulation (Peak) *(Sport-specific)*
  - **Unseen routes — single-attempt simulation** — 2–3 unseen (or long-unseen) routes · brief preview only, no beta rehearsal · one redpoint-style attempt each · full rest between routes · RPE 9–9.5 · target: 2 routes
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 11 — Peak · boulder-flavor week

- **Mon** — Hangboard (peak) + S&C *(Strength / alactic)*
  - **7-53 protocol** — 7s weighted, 3 hangs × 3–4 sets · rest 53s within set, 3 min between sets · 92–96% of max-hang total load · RPE 9–9.5
  - **Weighted pull-ups** — 5 × 2 · 3 min between sets · 88–90% of 1RM total load · RPE 9–9.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Limit Bouldering + Campus (Peak) *(Strength → Power)*
  - **Limit boulders** — 1–3 limit move-sequences (3–5 moves) · 4–8 attempts each · 3–5 min rest · stop when power drops (~20–30 min) · RPE 9–9.5 · target: 2 sequences
  - **Campus board: basic ladders (1-3-5, matched feet)** — 2–3 attempts × 2 sets · 3–5 min rest · gate: 15–20 strict pull-ups + 1-2-3-4-5 ladder without matching · skip on any finger tweak · RPE 8.5–9 · target: 2 sets
- **Fri** — Rest day
- **Sat** — Boulder comp simulation (Peak) *(Strength / Power)*
  - **Unseen problems — comp rounds** — 4–5 unseen (or long-unseen) problems · one round each, ~4 min limit · max 4–5 attempts per problem, no beta rehearsal · full rest between rounds · RPE 8.5–9.5 · target: 4 problems
- **Sun** — Optional: easy open climb or rest *(Aerobic base / —)*
  - **Easy open climbing (optional)** — 45–90 min mileage well below max · RPE 4–6 · target: 60 min · *(optional)*

### Week 12 — Taper · sport-flavor week

- **Mon** — Hangboard (taper) + S&C *(Strength / alactic)* — _taper: volume cut, intensity held_
  - **Near-max hangs (taper touch)** — 10s weighted, 2–3 hangs × 1 set — short & crisp, stop fresh · rest 3 min · 90–94% of max-hang total load · RPE 8.5–9
  - **Weighted pull-ups** — 2 × 2 · 3 min between sets · 87–90% of 1RM total load · RPE 9–9.5
  - **S&C antagonist block** — Push-ups: 3 × 15–25 · 60–90s rest between sets; Inverted rows / band cactus: 3 × 10–15 · 60–90s rest between sets; Wrist extensor curls: 3 × 20 · 60s rest between sets; Farmer's carry: 3 × 20–30 steps · 60–90s rest between sets; Core (plank or hanging knee raise or L-sit): choose 1: 3 × 60–90s plank · 3 × 10 HKR · 3 × 10s L-sit · 60s rest between sets
- **Tue** — Light: mobility or skill drills
  - **15–20 min mobility** — shoulders, hips, wrists
  - **Skill drill (optional, no fingers)** — pick one drill to focus on today · *(optional)*
  - **Tuesday antagonist/shoulder block** — Wrist extensor curls: 3 × 20 · 60s rest between sets; Band cactus (external rotation): 2 × 12–15 · 45–60s rest between sets
- **Wed** — Rest day
- **Thu** — Comp-format touch — sport (Taper) *(Sport-specific)* — _taper: volume cut, intensity held_
  - **Unseen-route touches — comp touch** — 2–3 routes, ideally unfamiliar · brief preview only (no beta rehearsal), one attempt each · full rest between · RPE 8–9 · target today: 2 routes (cut from 4)
- **Fri** — Rest day
- **Sat** — **Full rest — goal day tomorrow**
- **Sun** — 🏁 **Goal / comp day** *(app renders this day as “Optional: easy open climb or rest”)*

_Final cycle day (Week 12 Sunday) is the goal/comp day; the day before is always full rest (ADR-0007)._
