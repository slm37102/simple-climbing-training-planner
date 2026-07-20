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

// ─── Today view ───────────────────────────────────────────────────────────

test('Today: renders without throwing for a valid plan', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-18'); // Mon, wk 3
  const root = document.createElement('div');
  renderToday(root);
  assert(root.innerHTML.length > 0, 'empty render');
});

test('Today: change events on stepper inputs persist actual', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-18');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const kgEl   = root.querySelector('#ex-0-kg');
    const repsEl = root.querySelector('#ex-0-reps');
    const rpeEl  = root.querySelector('#ex-0-rpe');
    assert(kgEl,   'kg input missing');
    assert(repsEl, 'reps input missing');
    assert(rpeEl,  'rpe input missing');

    kgEl.value   = '12.5'; kgEl.dispatchEvent(new Event('change', { bubbles: true }));
    repsEl.value = '1';    repsEl.dispatchEvent(new Event('change', { bubbles: true }));
    rpeEl.value  = '8';    rpeEl.dispatchEvent(new Event('change', { bubbles: true }));

    const back = Storage.getDay('2026-05-18');
    assert(back, 'day not persisted');
    assertEq(back.exercises[0].actual.kg,   12.5);
    assertEq(back.exercises[0].actual.reps, 1);
    assertEq(back.exercises[0].actual.rpe,  8);
  } finally { root.remove(); }
});

test('Today: kg + rpe inputs pre-fill defaults with data-default flag', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 25, pullup1RM: 40 });
  // 2026-06-15 = Mon of Wk 7 = Build phase, ex[0] is "Max-Weight 10s" w/ loadPctRange → computes kg suggestion.
  sessionStorage.setItem('todaySelectedDate', '2026-06-15');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const kgEl  = root.querySelector('#ex-0-kg');
    const rpeEl = root.querySelector('#ex-0-rpe');
    assert(kgEl,  'kg input missing');
    assert(rpeEl, 'rpe input missing');
    assert(kgEl.value  !== '', 'kg should be pre-filled with suggestion');
    assert(rpeEl.value !== '', 'rpe should be pre-filled with mid of range');
    assert(kgEl.hasAttribute('data-default'),  'kg should be flagged as default');
    assert(rpeEl.hasAttribute('data-default'), 'rpe should be flagged as default');
  } finally { root.remove(); }
});

test('Today: default pre-fill is NOT persisted until user touches that field', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 25, pullup1RM: 40 });
  sessionStorage.setItem('todaySelectedDate', '2026-06-15');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    // User only changes RPE — kg/sets/reps stay as their default values.
    const rpeEl = root.querySelector('#ex-0-rpe');
    rpeEl.value = '8.5';
    rpeEl.removeAttribute('data-default');
    rpeEl.dispatchEvent(new Event('change', { bubbles: true }));

    const back = Storage.getDay('2026-06-15');
    assert(back, 'day not persisted');
    assertEq(back.exercises[0].actual.rpe, 8.5, 'rpe should be persisted (user touched it)');
    assert(back.exercises[0].actual.kg   == null, 'kg must NOT be persisted (still pre-fill default)');
    assert(back.exercises[0].actual.sets == null, 'sets must NOT be persisted (still pre-fill default)');
    assert(back.exercises[0].actual.reps == null, 'reps must NOT be persisted (still pre-fill default)');
  } finally { root.remove(); }
});

test('Today: stepper +/- click clears data-default and persists', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  Storage.setGlobalBenchmarks({ bodyweight: 70, maxHang20mm: 25, pullup1RM: 40 });
  sessionStorage.setItem('todaySelectedDate', '2026-06-15');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const kgEl = root.querySelector('#ex-0-kg');
    const kgBefore = parseFloat(kgEl.value);
    assert(!isNaN(kgBefore), 'kg should be pre-filled with a numeric suggestion');
    const plusBtn = root.querySelector(`button[data-step="+"][data-target="ex-0-kg"]`);
    assert(plusBtn, '+ button missing');
    plusBtn.click();
    assert(!kgEl.hasAttribute('data-default'), 'data-default should be cleared by stepper click');

    const back = Storage.getDay('2026-06-15');
    assert(back && back.exercises[0].actual.kg != null, 'kg should now be persisted');
    assertEq(back.exercises[0].actual.kg, kgBefore + 0.5);
  } finally { root.remove(); }
});

test('Log: feed header renders human-friendly date (e.g. "Mon May 25")', () => {
  resetStorage();
  Storage.setDay('2026-05-25', { // Monday
    sessionId: 'mon-hangboard-base',
    status: 'completed',
    phase: 'base',
    exercises: [{ name: 'Hangboard', kind: 'hangboard', actual: { kg: 15 } }]
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderLog(root);
    const txt = root.textContent;
    assert(txt.includes('Mon May 25'),
      `Log header should show "Mon May 25" (got snippet: ${txt.slice(0, 300)})`);
    assert(!txt.includes('2026-05-25'),
      'Raw ISO date should not appear in the row header');
  } finally { root.remove(); }
});

test('Today: retest benchmark button only shows when both test kg values are logged', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  // wk6 Mon = the retest Monday (session.isRetest gates the button)
  sessionStorage.setItem('todaySelectedDate', '2026-06-08');
  Storage.setDay('2026-06-08', {
    sessionId: 'mon-retest',
    exercises: [
      { name: 'Max 10s hang on 20mm edge', kind: 'test', actual: { kg: 18 } },
      { name: '1RM weighted pull-up', kind: 'test', actual: { kg: 32 } }
    ]
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(root.querySelector('[data-retest-benchmark]'), 'Save as Benchmark button should show when both test kg values exist');

    Storage.setDay('2026-06-08', {
      sessionId: 'mon-retest',
      exercises: [
        { name: 'Max 10s hang on 20mm edge', kind: 'test', actual: { kg: 18 } },
        { name: '1RM weighted pull-up', kind: 'test', actual: {} }
      ]
    });
    renderToday(root);
    assert(!root.querySelector('[data-retest-benchmark]'), 'button should hide when either benchmark test is missing kg');
  } finally { root.remove(); }
});

test('Today: retest Save as Benchmark updates global benchmarks + shows confirmation', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  Storage.setGlobalBenchmarks({ bodyweight: 72, maxHang20mm: 10, pullup1RM: 20 });
  sessionStorage.setItem('todaySelectedDate', '2026-06-08'); // wk6 retest Mon
  Storage.setDay('2026-06-08', {
    sessionId: 'mon-retest',
    exercises: [
      { name: 'Max 10s hang on 20mm edge', kind: 'test', actual: { kg: 18 } },
      { name: '1RM weighted pull-up', kind: 'test', actual: { kg: 32 } }
    ]
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const btn = root.querySelector('[data-retest-benchmark]');
    assert(btn, 'Save as Benchmark button missing');
    btn.click();

    const { benchmarks } = Storage.get();
    assertEq(benchmarks.bodyweight, 72);
    assertEq(benchmarks.maxHang20mm, 18);
    assertEq(benchmarks.pullup1RM, 32);
    assert(root.textContent.includes('Benchmarks updated — future loads recalculated'), 'confirmation missing');
  } finally { root.remove(); }
});

test('Today: renders the cycle-complete screen without throwing (cycleStats actualHasResult)', () => {
  // Regression: cycleStats() called actualHasResult under the wrong (deleted) name,
  // throwing ReferenceError on the cycle-complete path once a day was logged.
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  // A logged day inside the cycle so cycleStats iterates real exercises (hits the call site).
  Storage.setDay(plan.id, '2026-05-18', {
    exercises: [{ name: 'Hangboard', kind: 'hangboard', actual: { kg: 30, sets: 4, reps: 5, rpe: 7 } }]
  });
  // Select a date well past the 12-week cycle end → cycle-complete view renders.
  sessionStorage.setItem('todaySelectedDate', '2027-01-01');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root); // must not throw
    assert(root.textContent.trim().length > 0, 'cycle-complete view should render content');
  } finally { root.remove(); }
});

test('Today: kg exercise with no benchmarks shows an empty load field + a hint naming what to set', () => {
  // The load field is blank when resolve can't suggest (no bodyweight AND/OR no
  // kind benchmark); the hint must name exactly what's missing so the empty
  // stepper isn't a mystery (the old hint only mentioned bodyweight).
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  Storage.setGlobalBenchmarks({ bodyweight: null, maxHang20mm: null, pullup1RM: null });
  sessionStorage.setItem('todaySelectedDate', '2026-05-04'); // wk1 Mon — hangboard
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/Set your .*bodyweight.*max-hang.*in Profile/i.test(root.textContent),
      'expected a load hint naming bodyweight + the max-hang benchmark');
    const kg = root.querySelector('#ex-0-kg');
    assert(kg && kg.value === '', 'the added-load field must be empty when there is no suggestion');
    assertEq(kg.getAttribute('placeholder'), '—', 'empty load field carries a placeholder so it reads intentional');
  } finally { root.remove(); }
});

test('Today: pain scale pills carry severity zones + the row has direction anchors', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-04');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const zone = v => root.querySelector(`[data-pain-pill][data-val="${v}"]`)?.className || '';
    assert(/pz-green/.test(zone(2)), '0–2 are the green (fine) zone');
    assert(/pz-amber/.test(zone(4)), '3–5 are the amber (hold) zone');
    assert(/pz-red/.test(zone(8)), '6–10 are the red (skip) zone');
    const anchors = root.querySelector('.scale-anchors');
    assert(anchors && /no pain/i.test(anchors.textContent) && /severe/i.test(anchors.textContent),
      'the scale must show no-pain → severe direction anchors');
  } finally { root.remove(); }
});
