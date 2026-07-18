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

// ─── ADR-0011: limiter readout (closes KG-A1/KG-D2) ───────────────────────
// Norm table per docs/benchmark-norms.md: V5 finger norm 34% added, V6 40%,
// V7 46% (added %BW); pull-up diminishing-returns ceiling 65% added.

test('[ADR-0011] fingers at-or-above the target-grade norm band', () => {
  const readout = limiterReadout({ bodyweight: 70, maxHang20mm: 23.8, boulderGrade: 'V5' }); // 23.8/70 = 0.34 = V5 norm exactly
  assert(readout, 'expected a readout');
  const fingers = readout.lines.find(l => l.key === 'fingers');
  assertEq(fingers.verdict, 'at-or-above');
  assert(/aren't your main limiter/i.test(fingers.text));
});

test('[ADR-0011] fingers meaningfully (≥1 grade-step) below the target-grade norm band', () => {
  const readout = limiterReadout({ bodyweight: 70, maxHang20mm: 10, boulderGrade: 'V7' }); // 10/70=0.143, V7 norm 0.46, step 0.06 → 0.143 <= 0.40
  const fingers = readout.lines.find(l => l.key === 'fingers');
  assertEq(fingers.verdict, 'below');
  assert(/limiter candidate/i.test(fingers.text));
});

test('[ADR-0011] fingers a little below but not a full grade-step — the ambiguous middle band', () => {
  const readout = limiterReadout({ bodyweight: 70, maxHang20mm: 26, boulderGrade: 'V6' }); // 26/70=0.371, V6 norm 0.40, step floor 0.34 → between
  const fingers = readout.lines.find(l => l.key === 'fingers');
  assertEq(fingers.verdict, 'near');
});

test('[ADR-0011] pull-ups at vs below the diminishing-returns ceiling (no grade table, ceiling only)', () => {
  const at = limiterReadout({ bodyweight: 70, pullup1RM: 46 }); // 46/70 = 0.657 >= 0.65
  assertEq(at.lines.find(l => l.key === 'pullups').verdict, 'at-ceiling');
  const below = limiterReadout({ bodyweight: 70, pullup1RM: 20 }); // 20/70 = 0.286
  assertEq(below.lines.find(l => l.key === 'pullups').verdict, 'below-ceiling');
});

test('[ADR-0011] elsewhere-inference line appears only when BOTH strength lines are at/above norm', () => {
  const both = limiterReadout({ bodyweight: 70, maxHang20mm: 23.8, boulderGrade: 'V5', pullup1RM: 46 });
  assert(both.lines.some(l => l.key === 'elsewhere'), 'expected the elsewhere-inference line when both are at/above');

  const onlyFingers = limiterReadout({ bodyweight: 70, maxHang20mm: 23.8, boulderGrade: 'V5', pullup1RM: 20 });
  assert(!onlyFingers.lines.some(l => l.key === 'elsewhere'), 'must not appear when only one strength line is at/above');
});

test('[ADR-0011] missing fields → graceful no-verdict, never a guess', () => {
  assertEq(limiterReadout(null), null, 'null benchmarks → null');
  assertEq(limiterReadout({}), null, 'empty benchmarks → null');
  assertEq(limiterReadout({ maxHang20mm: 20, pullup1RM: 30, boulderGrade: 'V6' }), null, 'no bodyweight → null (can\'t compute %BW at all)');
  assertEq(limiterReadout({ bodyweight: 70 }), null, 'bodyweight alone, no strength benchmarks → null');
});

test('[ADR-0011] partial data: only pull-up resolves (no grade, no finger benchmark) → single line, no elsewhere', () => {
  const readout = limiterReadout({ bodyweight: 70, pullup1RM: 46 });
  assertEq(readout.lines.length, 1);
  assertEq(readout.lines[0].key, 'pullups');
});

test('[ADR-0011] caveat states the R² honesty requirement', () => {
  const readout = limiterReadout({ bodyweight: 70, pullup1RM: 46 });
  assert(/17%/.test(readout.caveat) && /8.{1,2}12%/.test(readout.caveat), `caveat missing R² figures, got "${readout.caveat}"`);
});

test('[ADR-0011] REGRESSION: card renders on the Profile tab and recomputes on a benchmark change', () => {
  resetStorage();
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 10, boulderGrade: 'V7' });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderProfile(root);
    let card = root.querySelector('[data-limiter-card]');
    assert(card, 'limiter card should render when benchmarks resolve a verdict');
    assert(/limiter candidate/i.test(card.textContent), 'expected the below-norm fingers verdict text');

    Storage.setGlobalBenchmarks({ maxHang20mm: 40 }); // now well above the V7 norm
    renderProfile(root);
    card = root.querySelector('[data-limiter-card]');
    assert(/aren't your main limiter/i.test(card.textContent), 'card should recompute after a benchmark change');
  } finally { root.remove(); }
});

// ─── ADR-0012: benchmark refresh slots (post-goal retest + micro-retest) ──
// 12-wk comp cycle anchored 2026-05-04 (Mon): base wks1-6, build wks7-9,
// peak wks10-11, taper wk12; cycle end (goal day) = 2026-07-26 (established
// by the existing ADR-0007 rest-pre-goal fixture above).

test('[ADR-0012] post-goal retest window: goal day +1 through +7 offers the retest, day +8 falls back to out-of-cycle', () => {
  const start = '2026-05-04';
  const goal = '2026-07-26';
  for (let offset = 1; offset <= 7; offset++) {
    const iso = addIsoDays(goal, offset);
    const ctx = Program.resolveDate(iso, start, 12);
    assert(ctx.outOfCycle, `day+${offset} should be out of cycle`);
    const sess = Program.prescribeForContext(ctx, 'hybrid');
    assertEq(sess.sessionId, 'post-goal-retest', `day+${offset} should offer the post-goal retest`);
    assert(sess.isRetest, `day+${offset} retest session must set isRetest`);
  }
  const day8ctx = Program.resolveDate(addIsoDays(goal, 8), start, 12);
  const day8sess = Program.prescribeForContext(day8ctx, 'hybrid');
  assertEq(day8sess.sessionId, 'out-of-cycle', 'day+8 should fall back to the generic out-of-cycle state');
});

test('[ADR-0012] post-goal retest: max hang mandatory, pull-up 1RM optional', () => {
  const ctx = Program.resolveDate(addIsoDays('2026-07-26', 3), '2026-05-04', 12);
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  const hang = sess.exercises.find(e => /max 10s hang/i.test(e.name));
  const pull = sess.exercises.find(e => /1rm weighted pull-up/i.test(e.name));
  assert(hang && !hang.optional, 'max hang must be mandatory');
  assert(pull && pull.optional, 'pull-up 1RM must be optional in the post-goal retest');
});

test('[ADR-0012] browsing before the cycle start is unaffected by the post-goal logic', () => {
  const ctx = Program.resolveDate('2026-04-01', '2026-05-04', 12);
  assert(ctx.outOfCycle);
  const sess = Program.prescribeForContext(ctx, 'hybrid');
  assertEq(sess.sessionId, 'out-of-cycle');
});

test('[ADR-0012] isBuildRunStart: the first week of EACH Build run — both blocks of a double-block cycle qualify', () => {
  const pattern12 = buildPhasePattern(12, 'comp');
  assert(Program.isBuildRunStart(pattern12, 7), 'wk7 should open the Build run in a 12-wk cycle');
  assert(!Program.isBuildRunStart(pattern12, 8), 'wk8 is Build but not the run start');
  assert(!Program.isBuildRunStart(pattern12, 6), 'wk6 is Base, not Build');

  const pattern24 = buildPhasePattern(24, 'comp');
  assertEq(pattern24[7].phase, 'build', 'fixture: wk8 (idx7) should open block 1\'s Build run');
  assertEq(pattern24[17].phase, 'build', 'fixture: wk18 (idx17) should open block 2\'s Build run');
  assert(Program.isBuildRunStart(pattern24, 8), 'block-1 Build-run start reads true');
  assert(Program.isBuildRunStart(pattern24, 18), 'block-2 Build-run start must ALSO read true — the ADR names the second block explicitly; the staleness gate is what keeps it silent when fresh');
  assert(!Program.isBuildRunStart(pattern24, 9), 'wk9 is mid-run, not a run start');
});

test('[ADR-0012] Warmup.forSession appends the micro-retest step only when opts.microRetest is true', () => {
  const session = { sessionId: 'mon-hangboard-build' };
  const withRetest = Warmup.forSession(session, { microRetest: true });
  assert(withRetest.warmup.some(w => /micro-retest/i.test(w)), 'expected the micro-retest line in the warm-up');
  const without = Warmup.forSession(session, { microRetest: false });
  assert(!without.warmup.some(w => /micro-retest/i.test(w)));
  const noOpts = Warmup.forSession(session);
  assert(!noOpts.warmup.some(w => /micro-retest/i.test(w)), 'omitting opts must default to no micro-retest');
});

test('[ADR-0012] REGRESSION: default 12-week cycle shows no micro-retest on the first Build Monday (week-6 retest just ran)', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  // setGlobalBenchmarks always re-stamps updatedAt to the real wall clock,
  // so a fixed test date must be set directly on the raw state afterward.
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 20, pullup1RM: 30 });
  Storage.raw().globalBenchmarks.updatedAt = '2026-06-08T00:00:00.000Z';
  sessionStorage.setItem('todaySelectedDate', '2026-06-15'); // wk7 Mon, first Build Monday
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(!/micro-retest/i.test(root.textContent), 'default 12-wk shape should be silent (benchmark only 1 week stale)');
  } finally { root.remove(); }
});

test('[ADR-0012] REGRESSION: micro-retest appears on the first Build Monday when the benchmark is >4 weeks stale', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 20, pullup1RM: 30 });
  Storage.raw().globalBenchmarks.updatedAt = '2026-04-01T00:00:00.000Z';
  sessionStorage.setItem('todaySelectedDate', '2026-06-15');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/micro-retest/i.test(root.textContent), 'stale benchmark should trigger the micro-retest warm-up step');
  } finally { root.remove(); }
});

test('[ADR-0012] REGRESSION: micro-retest never appears on a mid-run Build Monday even when stale', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 24, peakType: 'comp' });
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 20, pullup1RM: 30 });
  Storage.raw().globalBenchmarks.updatedAt = '2026-01-01T00:00:00.000Z';
  sessionStorage.setItem('todaySelectedDate', addIsoDays('2026-05-04', (9 - 1) * 7)); // wk9 Mon, second week of block-1's Build run
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(!/micro-retest/i.test(root.textContent), 'only a Build-run-opening Monday should ever show the micro-retest');
  } finally { root.remove(); }
});

test('[ADR-0012] REGRESSION: micro-retest fires on block-2\'s Build-run start when stale, and benchmark age comes from retest history, not updatedAt', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 24, peakType: 'comp' });
  const wk18Mon = addIsoDays('2026-05-04', (18 - 1) * 7); // block-2's Build-run start
  // Last RETEST was >4wk before wk18 Mon, but a bodyweight-only Profile edit
  // bumped updatedAt yesterday — the gate must read the retest history and
  // still fire (updatedAt alone would silently suppress a due micro-retest).
  Storage.saveRetestBenchmarks({ bodyweight: 70, maxHang20mm: 20, pullup1RM: 30 }, addIsoDays(wk18Mon, -40));
  Storage.setGlobalBenchmarks({ bodyweight: 71 });
  Storage.raw().globalBenchmarks.updatedAt = addIsoDays(wk18Mon, -1) + 'T00:00:00.000Z'; // "yesterday" relative to the fixture Monday
  sessionStorage.setItem('todaySelectedDate', wk18Mon);
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/micro-retest/i.test(root.textContent), 'block-2 Build-run start with a stale benchmark must show the micro-retest despite a fresh updatedAt');
  } finally { root.remove(); }
});

test('[ADR-0012] REGRESSION: post-goal retest card renders and saves with just max hang (optional pull-up skipped)', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 15, pullup1RM: 25 });
  sessionStorage.setItem('todaySelectedDate', addIsoDays('2026-07-26', 3));
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(root.querySelector('[data-post-goal-retest]'), 'expected the post-goal retest card');
    const kgEl = root.querySelector('#ex-0-kg');
    assert(kgEl, 'max-hang kg input missing');
    kgEl.value = '24';
    kgEl.dispatchEvent(new Event('change', { bubbles: true }));

    const btn = root.querySelector('[data-retest-benchmark]');
    assert(btn, 'Save as Benchmark button should show with just max hang logged (pull-up optional)');
    btn.click();

    const { benchmarks } = Storage.get();
    assertEq(benchmarks.maxHang20mm, 24);
    assertEq(benchmarks.pullup1RM, 25, 'skipped optional pull-up must not overwrite the existing benchmark');
  } finally { root.remove(); }
});
