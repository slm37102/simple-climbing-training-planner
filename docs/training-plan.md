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
3. **Auto-adjust** ±5% based on previous session's avg RPE vs target RPE
4. **Readiness multiplier** — from daily readiness check-in: ×0.85 / ×1.0 / ×1.05 (or a rest suggestion instead of a load)

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
