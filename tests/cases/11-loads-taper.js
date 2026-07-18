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

// ─── KG-B11a: clamp negative-benchmark load prescriptions (closes #36) ────
// Negative benchmarks (assisted hangs/pull-ups) are inverted: more-negative =
// more assisted = easier; less-negative (closer to zero) = less assisted =
// harder. %-of-benchmark math shrinks magnitude toward zero, which for a
// negative baseMax computes a HARDER value than the athlete's own tested max.
// No computed bound (initial range or final suggestedKg) may ever exceed the
// benchmark in the harder direction. Positive benchmarks must see zero change.

test('[KG-B11a] prescribeLoadKg clamps both bounds when a total-load % range is entirely harder than the benchmark', () => {
  // ADR-0013: under total-load math the clamp is belt-and-braces (any
  // realistic <1.0 band is naturally safe for an assisted athlete — see the
  // next test) — it still must guard a band ≥1.0 or a data edge. 105–115% of
  // a bw70/-10kg athlete's 60kg total = 63–69kg total = -1/-7kg added, both
  // less negative (harder) than the tested -10kg max. Both bounds must clamp.
  const exercise = { kind: 'hangboard', loadPctRange: [1.05, 1.15] };
  const benchmarks = { maxHang20mm: -10, bodyweight: 70 };
  const result = Loads.prescribeLoadKg(exercise, benchmarks);
  assertEq(result.baseMax, -10, 'prescribeLoadKg must return baseMax so callers can thread it through');
  assertEq(result.addedKgRange, [-10, -10], 'both bounds are harder than -10kg and must clamp to it');
  assertEq(result.totalKgRange, [60, 60], 'total system weight must be derived from the same clamped bounds (70 + -10)');
});

test('[KG-B11a] prescribeLoadKg clamps only the bound that is harder than benchmark, leaves the easier bound untouched', () => {
  // 90–110% of a bw70/-10kg athlete's 60kg total: lo = 0.9×60−70 = -16kg
  // (easier than -10kg already, left alone); hi = 1.1×60−70 = -4kg (harder,
  // must clamp to -10kg).
  const exercise = { kind: 'hangboard', loadPctRange: [0.9, 1.1] };
  const benchmarks = { maxHang20mm: -10, bodyweight: 70 };
  const result = Loads.prescribeLoadKg(exercise, benchmarks);
  assertEq(result.addedKgRange, [-16, -10], 'harder bound (-4) clamps to -10; easier bound (-16) is unaffected');
});

test('[KG-B11a] resolveEffective clamps a previousActualKg-progression path that would otherwise land harder than the negative benchmark', () => {
  // previousActualKg is already at the tested max (-10kg). A stale (60-day)
  // layoff decay of ×0.85 shrinks the magnitude toward zero (-8.5kg — harder!,
  // the opposite of what layoff decay is supposed to do for an assisted lift).
  // Even after the existing +5% session cap (which also shrinks magnitude in
  // this direction, landing at -9kg), the result is still harder than the
  // -10kg benchmark and must be clamped back to it. (This path is driven
  // entirely by previousActualKg, not the range, so it's unaffected by which
  // loadPctRange/convention is in effect — bodyweight is still required for
  // prescribeLoadKg to resolve at all under ADR-0013.)
  const exercise = { kind: 'hangboard', loadPctRange: [0.55, 0.70], rpeRange: [8, 9] };
  const benchmarks = { maxHang20mm: -10, bodyweight: 70 };
  const res = Loads.resolveEffective({
    exercise, previousActualKg: -10, previousAvgRpe: 8.5, daysSincePrevious: 60, benchmarks
  });
  assertEq(res.suggestedKg, -10, 'progression math must never suggest a load harder than the tested -10kg max');
  assert(res.reason.some(r => /clamped to benchmark/i.test(r) && /negative-benchmark safety cap/i.test(r)),
    `reason trail must record the clamp engaging, got: ${JSON.stringify(res.reason)}`);
});

test('[KG-B11a] clamp holds across real program.js phase tables (Base intro, Build, Peak, taper) for a negative benchmark', () => {
  // Every HANGBOARD/BASE_MAX_INTRO loadPctRange in program.js is entirely < 1
  // (e.g. Build's [0.80, 0.90]), so against a negative baseMax every one of
  // these real, program-built sessions must fully clamp to the benchmark.
  const benchmarks = { maxHang20mm: -10, bodyweight: 70 };
  const fixtures = [
    ['2026-05-04', 'hybrid'],          // wk1 Mon, base intro hangboard
    ['2026-06-15', 'boulder'],         // wk7 Mon, build max-weight 10s hangboard
    ['2026-07-06', 'boulder'],         // wk10 Mon, peak 7-53 protocol hangboard
    ['2026-07-20', 'boulder', 'comp'], // wk12 Mon (comp taper), near-max taper hangboard
  ];
  let checked = 0;
  for (const [iso, focus, peakType] of fixtures) {
    const ctx = Program.resolveDate(iso, '2026-05-04', 12, peakType);
    const sess = Program.prescribeForContext(ctx, focus);
    for (const ex of (sess.exercises || [])) {
      if (ex.kind !== 'hangboard' || !ex.loadPctRange) continue;
      const base = Loads.prescribeLoadKg(ex, benchmarks);
      assert(base, `${iso}/${focus}: expected prescribeLoadKg to resolve for "${ex.name}"`);
      assert(base.addedKgRange[0] <= -10 + 1e-9 && base.addedKgRange[1] <= -10 + 1e-9,
        `${iso}/${focus}: "${ex.name}" range ${JSON.stringify(base.addedKgRange)} must never exceed -10kg benchmark`);
      const resolved = Loads.resolveEffective({ exercise: ex, previousActualKg: null, benchmarks });
      assert(resolved.suggestedKg <= -10 + 1e-9,
        `${iso}/${focus}: "${ex.name}" suggestedKg ${resolved.suggestedKg} must never exceed -10kg benchmark`);
      checked++;
    }
  }
  assert(checked >= 3, `expected to check at least 3 real hangboard sessions across phases, got ${checked}`);
});

test('[KG-B11a] positive benchmarks are completely unaffected by the clamp, including a previousActualKg that exceeds a stale benchmark (PR)', () => {
  // ADR-0013: total-load math — bw70/+20kg athlete, totalMax=90. A realistic
  // Build-like band [0.8, 0.9] → 72–81kg total → +2…+11kg added.
  const exercise = { kind: 'hangboard', loadPctRange: [0.8, 0.9], rpeRange: [8, 9] };
  const benchmarks = { maxHang20mm: 20, bodyweight: 70 };

  const range = Loads.prescribeLoadKg(exercise, benchmarks);
  assertEq(range.addedKgRange, [2, 11], 'positive-benchmark range must be untouched by the clamp');

  // PR case: previousActualKg (25) exceeds the stale positive benchmark (20).
  // This is a legitimate upward progression, not a bug — must not be clamped.
  const pr = Loads.resolveEffective({
    exercise, previousActualKg: 25, previousAvgRpe: 8.5, daysSincePrevious: 5, benchmarks
  });
  assertEq(pr.suggestedKg, 25, 'a PR exceeding a stale positive benchmark must progress untouched');
  assert(!pr.reason.some(r => /clamped to benchmark/i.test(r)), 'positive-benchmark path must never mention the clamp');
});

// ─── KG-B13: single-layer taper volume cut + pluralization ───────────────
// Taper templates now author full pre-cut volume; applyTaperVolume's ×0.6 is
// the ONLY reduction, landing at what each template's own text argues for.
// Fixture: 12-wk comp cycle anchored 2026-05-04 (Mon); base wks1–6, build
// wks7–9, peak wks10–11, taper wk12 (verified above under Coach-review §8).

test('[KG-B13] Monday taper pull-ups land at 2×2 after one cut (was shipping as 1×2)', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'hybrid' };
  const ctx = Program.resolveDate('2026-07-20', '2026-05-04', 12);
  assertEq(ctx.phase, 'taper', 'fixture: wk12 Mon must be the taper week');
  const mon = Program.build(plan, '2026-07-20');
  const pullup = mon.exercises.find(e => e.kind === 'pullup');
  assertEq(pullup.prescribedSets, 2, 'floor(4 × 0.6) = 2, matching the "2 × 2" text — not double-cut to 1');
  assertEq(pullup.prescribedReps, 2);
});

test('[KG-B13] Thursday taper project goes land at 2+ (was shipping as 1)', () => {
  // peakType: 'trip' — KG-A13 forks comp taper-Thursdays onto a different
  // (comp-format) template; 'trip'/'project' keep this original template.
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'trip' }, focus: 'sport' };
  const ctx = Program.resolveDate('2026-07-23', '2026-05-04', 12, 'trip');
  assertEq(ctx.phase, 'taper');
  const thu = Program.build(plan, '2026-07-23');
  assertEq(thu.sessionId, 'thu-projects');
  assertEq(thu.exercises[0].prescribedTarget, { value: 2, unit: 'goes' }, 'floor(4 × 0.6) = 2 goes, matching "2–3 quality goes"');
  assertEq(thu.exercises[0].originalTarget, { value: 4, unit: 'goes' });
});

test('[KG-B13] Thursday taper flash-grade boulders land at 8 problems (within the stated 6–10)', () => {
  // peakType: 'trip' — see note above; comp peaks get KG-A13's comp-format touch instead.
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'trip' }, focus: 'boulder' };
  const thu = Program.build(plan, '2026-07-23');
  assertEq(thu.sessionId, 'thu-flash');
  assertEq(thu.exercises[0].prescribedTarget, { value: 8, unit: 'problems' }, 'floor(14 × 0.6) = 8, within "6–10 problems"');
});

test('[KG-B13] Saturday taper sessions (2-week trip/project taper) land within their own stated ranges', () => {
  const base = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'trip' } };
  const satCtx = Program.resolveDate('2026-07-18', '2026-05-04', 12, 'trip');
  assertEq(satCtx.phase, 'taper', 'fixture: wk11 Sat is the first (non-final) taper week under a 2-wk trip taper');

  const boulderSat = Program.build({ ...base, focus: 'boulder' }, '2026-07-18');
  assertEq(boulderSat.sessionId, 'sat-volume-down');
  assertEq(boulderSat.exercises[0].prescribedTarget, { value: 50, unit: 'min' }, 'round(80 × 0.6 / 5) × 5 = 50, within "45–60 min"');

  const sportSat = Program.build({ ...base, focus: 'sport' }, '2026-07-18');
  assertEq(sportSat.sessionId, 'sat-route-mileage');
  assertEq(sportSat.exercises[0].prescribedTarget, { value: 8, unit: 'routes' }, 'floor(14 × 0.6) = 8, within "6–10 routes"');
});

test('[KG-B13] non-taper phases are unaffected by the template volume changes', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'hybrid' };
  const buildMon = Program.build(plan, '2026-06-15'); // Build Mon
  assertEq(buildMon.phase, 'build');
  const buildPullup = buildMon.exercises.find(e => e.kind === 'pullup');
  assertEq(buildPullup.prescribedSets, 5, 'Build pull-ups still 5 sets, untouched by the taper fix');
});

test('[KG-B13] pluralization: a singular target renders "1 go", not "1 goes"', () => {
  assertEq(unitLabel(1, 'goes'), 'go');
  assertEq(unitLabel(2, 'goes'), 'goes');
  assertEq(unitLabel(1, 'problems'), 'problem');
  assertEq(unitLabel(3, 'problems'), 'problems');
  assertEq(unitLabel(1, 'min'), 'min');
  assertEq(unitLabel(5, 'min'), 'min');
});

test('[KG-B13] REGRESSION: Today tab renders a singular cut target grammatically ("1 ladder", not "1 ladders")', () => {
  // A 24-wk comp cycle double-blocks, giving Build a deload week (wk21) — its
  // Monday campus-ladders exercise (boulder focus, prescribedTarget 3 ladders)
  // cuts to floor(3 × 0.6) = 1, a naturally-occurring singular target.
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 24, peakType: 'comp' });
  Storage.updatePlan(plan.id, { focus: 'boulder' });
  sessionStorage.setItem('todaySelectedDate', '2026-09-21'); // wk21 Mon, Build deload
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(!/\b1 ladders\b/.test(root.textContent), `must not render "1 ladders", got page text: "${root.textContent.slice(0, 500)}"`);
    assert(/\b1 ladder\b/.test(root.textContent), `expected "1 ladder" (singular) on the page, got: "${root.textContent.slice(0, 500)}"`);
  } finally { root.remove(); }
});
