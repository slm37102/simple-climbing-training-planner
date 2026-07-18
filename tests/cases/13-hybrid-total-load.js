// Split from the old monolithic tests/index.html — sections preserved
// verbatim and in original order. Cases register via test() from the harness;
// tests/index.html imports every file in tests/cases/ (import order = display
// order) and runs the suite. Unused app imports are harmless — every case
// file carries the same block so moving tests between files stays trivial.
import { test, assert, assertEq, resetStorage, localIso, addIsoDays } from '../harness.js';
import { Storage, newer } from '../../js/storage.js';
import { Program, buildPhasePattern, hardPhasePos, DEFAULT_CYCLE_WEEKS, MIN_CYCLE_WEEKS, MAX_CYCLE_WEEKS } from '../../js/program.js';
import { Loads } from '../../js/loads.js';
import { Warmup } from '../../js/warmup.js';
import { SKILL_DRILLS, DRILL_CATEGORIES, WARMUP_DRILLS } from '../../js/drills.js';
import { Replan, MAJOR_GAP_DAYS } from '../../js/replan.js';
import { limiterReadout } from '../../js/limiter.js';
import { Monitoring } from '../../js/monitoring.js';
import { inputVisibility, repsLabel, actualHasResult, howto, unitLabel } from '../../js/exercise-inputs.js';
import { today as datesToday, addDays as datesAddDays, daysBetween, snapToMonday as datesSnapToMonday } from '../../js/dates.js';
import { renderToday } from '../../js/views/today.js';
import { renderLog }   from '../../js/views/log.js';
import { renderCalendar } from '../../js/views/calendar.js';
import { renderProfile } from '../../js/views/profile.js';

// ─── ADR-0010: within-week mixing (hybrid Build restructure, closes KG-B4) ─
// Fixed anchor 2026-05-04 (Mon), 12-wk comp cycle: base wks1–6, build wks7–9
// (odd/boulder-parity: 7, 9; even/sport-parity: 8), peak wks10–11, taper
// wk12 — same fixture geometry as the ADR-0009/KG-A10 blocks above.

test('[ADR-0010] hybrid Build, odd week: Thu → thu-limit, Sat → sat-boulder-triples (unchanged)', () => {
  const thu = Program.prescribeForContext(Program.resolveDate('2026-06-18', '2026-05-04', 12), 'hybrid'); // wk7 Thu
  assertEq(thu.sessionId, 'thu-limit');
  const sat = Program.prescribeForContext(Program.resolveDate('2026-06-20', '2026-05-04', 12), 'hybrid'); // wk7 Sat
  assertEq(sat.sessionId, 'sat-boulder-triples');
});

test('[ADR-0010] hybrid Build, even week: Thu → thu-limit (was thu-6060-threshold), Sat → sat-6060-threshold', () => {
  const thuCtx = Program.resolveDate('2026-06-25', '2026-05-04', 12); // wk8 Thu
  assertEq(thuCtx.flavor, 'sport', 'sanity: wk8 is the sport-parity week');
  const thu = Program.prescribeForContext(thuCtx, 'hybrid');
  assertEq(thu.sessionId, 'thu-limit', 'the load-bearing assertion — every hybrid Build Thursday is now limit bouldering');
  assertEq(thu.energySystem, 'Strength');

  const satCtx = Program.resolveDate('2026-06-27', '2026-05-04', 12); // wk8 Sat
  const sat = Program.prescribeForContext(satCtx, 'hybrid');
  assertEq(sat.sessionId, 'sat-6060-threshold');
  assertEq(sat.energySystem, 'Aerobic power');
  const iv = sat.exercises.find(e => e.kind === 'circuit');
  assert(iv, 'sat-6060-threshold must carry the 60/60 circuit exercise');
  assertEq(iv.prescribedTarget, { value: 20, unit: 'min' });
  assert(iv.rpeRange[1] <= 8.5, `band-1 ceiling is RPE 8.5, got ${iv.rpeRange[1]}`);

  // Shared-template guarantee: sat-6060-threshold's exercise content matches
  // thu-6060-threshold's (sport-focus Build Thursday) exactly — extracted
  // from one constant, so they can never drift apart.
  const thuSport = Program.prescribeForContext(thuCtx, 'sport');
  assertEq(thuSport.sessionId, 'thu-6060-threshold');
  assertEq(iv, thuSport.exercises.find(e => e.kind === 'circuit'), 'sat-6060-threshold and thu-6060-threshold must share identical exercise content');
});

test('[ADR-0010] hybrid Build, third odd week (wk9): confirms alternation, not a one-time flip', () => {
  const thu = Program.prescribeForContext(Program.resolveDate('2026-07-02', '2026-05-04', 12), 'hybrid'); // wk9 Thu
  assertEq(thu.sessionId, 'thu-limit');
  const sat = Program.prescribeForContext(Program.resolveDate('2026-07-04', '2026-05-04', 12), 'hybrid'); // wk9 Sat
  assertEq(sat.sessionId, 'sat-boulder-triples');
});

test('[ADR-0010] hybrid Base regression: odd + even weeks stay byte-identical to pre-ADR-0010 sessionIds', () => {
  const thuOdd = Program.prescribeForContext(Program.resolveDate('2026-05-21', '2026-05-04', 12), 'hybrid'); // wk3 Thu, boulder
  assertEq(thuOdd.sessionId, 'thu-projecting-base');
  const satOdd = Program.prescribeForContext(Program.resolveDate('2026-05-09', '2026-05-04', 12), 'hybrid'); // wk1 Sat, boulder
  assertEq(satOdd.sessionId, 'sat-flash-pyramid');
  const thuEven = Program.prescribeForContext(Program.resolveDate('2026-05-14', '2026-05-04', 12), 'hybrid'); // wk2 Thu, sport
  assertEq(thuEven.sessionId, 'thu-route-pyramid');
  const satEven = Program.prescribeForContext(Program.resolveDate('2026-05-16', '2026-05-04', 12), 'hybrid'); // wk2 Sat, sport
  assertEq(satEven.sessionId, 'sat-arc');
});

test('[ADR-0010] non-hybrid invariance: sport-focus and boulder-focus Build plans stay byte-identical', () => {
  const thuBoulder = Program.prescribeForContext(Program.resolveDate('2026-06-25', '2026-05-04', 12), 'boulder');
  assertEq(thuBoulder.sessionId, 'thu-limit', 'boulder-focus Build Thursday was already always thu-limit');
  const thuSport = Program.prescribeForContext(Program.resolveDate('2026-06-25', '2026-05-04', 12), 'sport');
  assertEq(thuSport.sessionId, 'thu-6060-threshold', 'sport-focus Build Thursday was already always thu-6060-threshold');
  const satBoulder = Program.prescribeForContext(Program.resolveDate('2026-06-27', '2026-05-04', 12), 'boulder');
  assertEq(satBoulder.sessionId, 'sat-boulder-triples', 'boulder-focus Build Saturday was already always the triples');
  const satSport = Program.prescribeForContext(Program.resolveDate('2026-06-27', '2026-05-04', 12), 'sport');
  assertEq(satSport.sessionId, 'sat-4x4-build', 'sat-4x4-build stays reachable in sport-focus mode, unaffected by the hybrid mixing override');
});

test('[ADR-0010] Peak/Taper hybrid: unchanged sessionIds, both peakTypes (mixing is Base/Build-only)', () => {
  for (const peakType of ['comp', 'trip']) {
    const pattern = buildPhasePattern(12, peakType);
    const peakIdx = pattern.findIndex(w => w.phase === 'peak');
    const taperIdx = pattern.findIndex(w => w.phase === 'taper');
    const peakThuIso = addIsoDays('2026-05-04', peakIdx * 7 + 3);
    const peakSatIso = addIsoDays('2026-05-04', peakIdx * 7 + 5);
    const taperThuIso = addIsoDays('2026-05-04', taperIdx * 7 + 3);

    for (const [iso, slotLabel] of [[peakThuIso, 'Peak Thu'], [peakSatIso, 'Peak Sat'], [taperThuIso, 'Taper Thu']]) {
      const ctx = Program.resolveDate(iso, '2026-05-04', 12, peakType);
      const hybridResult = Program.prescribeForContext(ctx, 'hybrid').sessionId;
      const naturalResult = Program.prescribeForContext(ctx, ctx.flavor).sessionId;
      assertEq(hybridResult, naturalResult,
        `${peakType} ${slotLabel}: hybrid must exactly match the week's natural (unmixed) flavor result — mixing is Base/Build-only`);
    }
  }
});

test('[ADR-0010] deload week in hybrid Build: the odd-week (boulder-triples) arrangement carries the volume cut', () => {
  // 24-wk comp double-block cycle: Build's second sub-block carries a real
  // deload week (same fixture as the [Gym-ready] Build-triples-deload test).
  const pattern = buildPhasePattern(24, 'comp');
  const buildDeloadIdx = pattern.findIndex(w => w.phase === 'build' && w.deload);
  assert(buildDeloadIdx >= 0, 'fixture: 24-wk cycle must have a Build deload week');
  const thuIso = addIsoDays('2026-05-04', buildDeloadIdx * 7 + 3);
  const satIso = addIsoDays('2026-05-04', buildDeloadIdx * 7 + 5);
  const thuCtx = Program.resolveDate(thuIso, '2026-05-04', 24);
  const satCtx = Program.resolveDate(satIso, '2026-05-04', 24);
  assert(thuCtx.deload && thuCtx.phase === 'build', 'fixture: Thu of the Build deload week');
  assert(satCtx.deload && satCtx.phase === 'build', 'fixture: Sat of the Build deload week');

  const thu = Program.prescribeForContext(thuCtx, 'hybrid');
  assertEq(thu.sessionId, 'thu-limit', 'hybrid Build Thu is always thu-limit, deload or not');
  assert(thu.deloadNote, 'deload-week Thu must carry the deload note');
  const limitEx = thu.exercises.find(e => e.kind === 'limit-boulder');
  assertEq(limitEx.originalTarget, { value: 4, unit: 'problems' });
  assertEq(limitEx.prescribedTarget, { value: 2, unit: 'problems' }, 'floor(4 × 0.6) = 2');

  const sat = Program.prescribeForContext(satCtx, 'hybrid');
  assert(sat.deloadNote, 'deload-week Sat must carry the deload note');
  assertEq(sat.sessionId, satCtx.flavor === 'boulder' ? 'sat-boulder-triples' : 'sat-6060-threshold');
  if (satCtx.flavor === 'boulder') {
    const triples = sat.exercises.find(e => e.kind === 'circuit');
    assertEq(triples.originalTarget, { value: 4, unit: 'sets' });
    assertEq(triples.prescribedTarget, { value: 2, unit: 'sets' }, 'floor(4 × 0.6) = 2 sets');
  }
});

test('[ADR-0010] deload week in hybrid Build: the even-week (sat-6060-threshold) arrangement carries the volume cut', () => {
  // No real calendar fixture lands a Build deload on an even (sport-parity)
  // week within the supported cycle lengths' phase math (deload always
  // falls on the 4th hard week of a Build run, and that week's absolute
  // parity works out odd for every currently-supported cycle length) — so
  // this exercises prescribeForContext directly against a hand-built ctx of
  // the same shape Program.resolveDate returns, rather than searching for
  // one. The date-resolution path itself is already covered by the odd-week
  // case above and by the non-deload even-week test.
  const ctx = { cycleWeeks: 12, peakType: 'comp', phase: 'build', flavor: 'sport', slot: 'sat-main', deload: true, retest: false, weekIdx: 8, diffDays: 40, totalDays: 84 };
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assertEq(sess.sessionId, 'sat-6060-threshold');
  assert(sess.deloadNote, 'deload-week sat-6060-threshold must carry the deload note');
  const iv = sess.exercises.find(e => e.kind === 'circuit');
  assertEq(iv.originalTarget, { value: 20, unit: 'min' });
  assertEq(iv.prescribedTarget, { value: 10, unit: 'min' }, 'round(20 × 0.6 / 5) × 5 = 10 min');
});

// ─── ADR-0013: total-load intensity bands (closes KG-B11's convention half) ──
// Canonical athlete (docs/specs/total-load-bands-spec.md worked examples):
// bodyweight 70kg, maxHang20mm +20kg (10s-max total 90kg), pullup1RM +30kg
// (1RM total 100kg). Fixed anchor 2026-05-04 (Mon), 12-wk comp cycle: base
// Mon wk1 = 2026-05-04, build Mon wk7 = 2026-06-15, peak Mon wk10 =
// 2026-07-06, taper Mon wk12 = 2026-07-20 (same Mondays as the [Gym-ready]
// rest-field fixture above).

test('[ADR-0013] canonical-athlete exact hangboard ranges per phase (added = pct × (bw+benchmark) − bw)', () => {
  const benchmarks = { maxHang20mm: 20, bodyweight: 70 };
  const mondays = { base: '2026-05-04', build: '2026-06-15', peak: '2026-07-06', taper: '2026-07-20' };
  const expected = {
    base:  [2, 6.5],    // 80–85% of 90 = 72–76.5 total → +2…+6.5
    build: [8.5, 13],   // 87–92% of 90 = 78.3–82.8 total → +8.3…+12.8 → round(±0.5) → +8.5…+13
    peak:  [13, 16.5],  // 92–96% of 90 = 82.8–86.4 total → +12.8…+16.4 → +13…+16.5
    taper: [11, 14.5],  // 90–94% of 90 = 81–84.6 total → +11…+14.6 → +11…+14.5
  };
  for (const [phase, iso] of Object.entries(mondays)) {
    const ctx = Program.resolveDate(iso, '2026-05-04', 12);
    assertEq(ctx.phase, phase, `fixture date ${iso} should be ${phase}`);
    const sess = Program.prescribeForContext(ctx, 'boulder');
    const hang = phase === 'base' ? sess.exercises.find(e => /intro/i.test(e.name)) : sess.exercises.find(e => e.kind === 'hangboard');
    assert(hang, `${phase}: hangboard exercise missing`);
    const range = Loads.prescribeLoadKg(hang, benchmarks);
    assertEq(range.addedKgRange, expected[phase], `${phase}: expected ${JSON.stringify(expected[phase])}, got ${JSON.stringify(range.addedKgRange)}`);
  }
});

test('[ADR-0013] canonical-athlete exact pull-up ranges per phase', () => {
  const benchmarks = { pullup1RM: 30, bodyweight: 70 };
  const mondays = { base: '2026-05-04', build: '2026-06-15', peak: '2026-07-06', taper: '2026-07-20' };
  const expected = { base: [5, 12], build: [14, 19], peak: [18, 20], taper: [17, 20] };
  for (const [phase, iso] of Object.entries(mondays)) {
    const ctx = Program.resolveDate(iso, '2026-05-04', 12);
    const sess = Program.prescribeForContext(ctx, 'boulder');
    const pull = sess.exercises.find(e => e.kind === 'pullup');
    assert(pull, `${phase}: pullup exercise missing`);
    const range = Loads.prescribeLoadKg(pull, benchmarks);
    assertEq(range.addedKgRange, expected[phase], `${phase}: expected ${JSON.stringify(expected[phase])}, got ${JSON.stringify(range.addedKgRange)}`);
  }
});

test('[ADR-0013] bodyweight unset → no range, no throw (never a silent added-only fallback)', () => {
  const exercise = { kind: 'hangboard', loadPctRange: [0.80, 0.85] };
  const noBw = Loads.prescribeLoadKg(exercise, { maxHang20mm: 20 });
  assertEq(noBw, null, 'missing bodyweight must return null, not a silently-computed added-only range');
  const resolved = Loads.resolveEffective({ exercise, previousActualKg: null, benchmarks: { maxHang20mm: 20 } });
  assertEq(resolved, null, 'resolveEffective must also return null when bodyweight is unset');
});

test('[ADR-0013] assisted athlete: Base intro range lands at -22…-19kg added (more assistance than a -10kg tested max) — naturally safe', () => {
  const benchmarks = { maxHang20mm: -10, bodyweight: 70 };
  const ctx = Program.resolveDate('2026-05-04', '2026-05-04', 12);
  const sess = Program.prescribeForContext(ctx, 'boulder');
  const intro = sess.exercises.find(e => /intro/i.test(e.name));
  const range = Loads.prescribeLoadKg(intro, benchmarks);
  assertEq(range.addedKgRange, [-22, -19], 'Base intro (80–85% of a 60kg total) = 48–51kg total = -22…-19kg added');
  assert(range.addedKgRange[0] <= -10 + 1e-9 && range.addedKgRange[1] <= -10 + 1e-9,
    'must never be harder (less assistance) than the -10kg tested max — the B11a clamp is a no-op here by construction');
});

test('[ADR-0013] previous-actual seeding is not clamped to the (now lower) range; migration note appears in the trail', () => {
  const benchmarks = { maxHang20mm: 20, bodyweight: 70 };
  const ctx = Program.resolveDate('2026-06-15', '2026-05-04', 12); // wk7 Mon, build
  const sess = Program.prescribeForContext(ctx, 'boulder');
  const hang = sess.exercises.find(e => e.kind === 'hangboard');
  // previousActualKg (16) sits above the new Build range top (13, per the
  // canonical-athlete table above) — simulating a stale benchmark relative
  // to what the athlete is actually lifting.
  const res = Loads.resolveEffective({ exercise: hang, previousActualKg: 16, previousAvgRpe: 8.5, daysSincePrevious: 5, benchmarks });
  assertEq(res.suggestedKg, 16, 'suggestion must seed from the previous actual, not get clamped down to the displayed range');
  assert(res.reason.some(r => /ADR-0013/.test(r)), 'migration note must appear while the previous actual sits above the new range top');
  assert(res.reason.some(r => /total max/.test(r)), 'convention statement must appear in the reason trail');

  // Spec §3 scopes the migration line to "the first sessions after the
  // switch" — once the working load sits inside the new range, the note
  // must stop appearing (it is bounded, not permanent).
  const inRange = Loads.resolveEffective({ exercise: hang, previousActualKg: 10, previousAvgRpe: 8.5, daysSincePrevious: 5, benchmarks });
  assert(!inRange.reason.some(r => /ADR-0013/.test(r)), 'migration note must NOT appear once the previous actual is inside the new range');
  assert(inRange.reason.some(r => /total max/.test(r)), 'the convention statement itself stays permanent');
});

test('[ADR-0013] the Base→Peak ramp is monotone in TOTAL-load terms (mid-band %)', () => {
  const baseSess  = Program.prescribeForContext(Program.resolveDate('2026-05-04', '2026-05-04', 12), 'boulder');
  const buildSess = Program.prescribeForContext(Program.resolveDate('2026-06-15', '2026-05-04', 12), 'boulder');
  const peakSess  = Program.prescribeForContext(Program.resolveDate('2026-07-06', '2026-05-04', 12), 'boulder');
  const baseIntro = baseSess.exercises.find(e => /intro/i.test(e.name));
  const buildHang = buildSess.exercises.find(e => e.kind === 'hangboard');
  const peakHang  = peakSess.exercises.find(e => e.kind === 'hangboard');
  const mid = r => (r[0] + r[1]) / 2;
  const baseMid = mid(baseIntro.loadPctRange), buildMid = mid(buildHang.loadPctRange), peakMid = mid(peakHang.loadPctRange);
  assert(baseMid < buildMid && buildMid < peakMid, `ramp must be monotone in total-load terms: ${baseMid} < ${buildMid} < ${peakMid}`);
});

test('[ADR-0013] REGRESSION: Today tab shows a "set bodyweight" hint when bodyweight is unset', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  Storage.setGlobalBenchmarks({ bodyweight: null, maxHang20mm: 20, pullup1RM: 30 });
  sessionStorage.setItem('todaySelectedDate', '2026-05-04'); // Mon wk1, base — hangboard exercises present
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/set your bodyweight/i.test(root.textContent), 'expected a "set bodyweight" hint somewhere in the rendered Today tab');
  } finally { root.remove(); }
});
