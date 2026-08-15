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

// ─── ADR-0015: readiness gating for climbing sessions (closes KG-A14) ─────
// Fixed anchor 2026-05-04 (Mon), 12-wk comp cycle — same fixture geometry as
// the ADR-0009/KG-A10/ADR-0010 blocks above.

test('[ADR-0015] Lighter day scales a climbing-kind prescribedTarget ×0.85 (deload rounding rules)', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const normal = Program.build(plan, '2026-05-09'); // wk1 Sat, sat-flash-pyramid
  assertEq(normal.sessionId, 'sat-flash-pyramid');
  const pyramid = normal.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.prescribedTarget, { value: 18, unit: 'problems' });

  const lighter = Program.build(plan, '2026-05-09', null, { label: 'lighter' });
  assertEq(lighter.sessionId, 'sat-flash-pyramid');
  const lighterPyramid = lighter.exercises.find(e => e.kind === 'boulder');
  assertEq(lighterPyramid.readinessScaledFrom, { value: 18, unit: 'problems' });
  assertEq(lighterPyramid.prescribedTarget, { value: 15, unit: 'problems' }, 'floor(18 × 0.85) = 15');
  assert(lighter.readinessNote && /lighter/i.test(lighter.readinessNote), 'expected a readiness note');
});

test('[ADR-0015] Lighter day caps RPE-note on campus + limit-boulder (Peak Thursday)', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const lighter = Program.build(plan, '2026-07-09', null, { label: 'lighter' }); // wk10 Thu, Peak boulder = thu-limit-campus
  assertEq(lighter.sessionId, 'thu-limit-campus');
  const limitBoulder = lighter.exercises.find(e => e.kind === 'limit-boulder');
  const campus = lighter.exercises.find(e => e.kind === 'campus');
  assert(limitBoulder.rpeRange[1] > 8.5, 'fixture sanity: limit-boulder RPE tops above 8.5');
  assert(campus.rpeRange[1] > 8.5, 'fixture sanity: campus RPE tops above 8.5');
  assertEq(limitBoulder.readinessCapNote, 'today: stay ≤8.5, stop at first quality drop');
  assertEq(campus.readinessCapNote, 'today: stay ≤8.5, stop at first quality drop');
});

test('[ADR-0015] Lighter day on Peak-Thursday sport-flavor swaps 30/30 lactic for the shared 60/60 threshold template', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'sport' };
  const normal = Program.build(plan, '2026-07-09'); // wk10 Thu, Peak sport = thu-3030-lactic
  assertEq(normal.sessionId, 'thu-3030-lactic');
  const lactic = normal.exercises.find(e => e.kind === 'circuit');
  assert(lactic.rpeRange[0] >= 9.5, 'fixture sanity: 30/30 is band-2 lactic');

  const lighter = Program.build(plan, '2026-07-09', null, { label: 'lighter' });
  assertEq(lighter.sessionId, 'thu-3030-lactic', 'sessionId is preserved through the swap');
  const swapped = lighter.exercises.find(e => e.kind === 'circuit');
  assertEq(swapped.prescribedTarget, { value: 20, unit: 'min' });
  assert(swapped.rpeRange[1] <= 8.5, 'swapped-in exercise must be the sub-8.5 60/60 band');
  assert(lighter.readinessNote && /60\/60/.test(lighter.readinessNote));

  // Shared-template guarantee (ADR-0010): identical to whatever Build would prescribe that week.
  const buildSport = Program.build(plan, '2026-06-25'); // wk8 Thu, build sport
  assertEq(buildSport.sessionId, 'thu-6060-threshold');
  assertEq(swapped, buildSport.exercises.find(e => e.kind === 'circuit'));
});

test('[ADR-0015] suggest-rest: declining keeps the planned session with Lighter levers; accepting swaps for the light template', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const declined = Program.build(plan, '2026-05-09', null, { label: 'suggestRest', acceptRestSwap: false });
  assertEq(declined.sessionId, 'sat-flash-pyramid', 'declining must not change session identity');
  const pyramid = declined.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.prescribedTarget, { value: 15, unit: 'problems' }, 'declined suggest-rest still gets the Lighter target scaling');

  const accepted = Program.build(plan, '2026-05-09', null, { label: 'suggestRest', acceptRestSwap: true });
  assertEq(accepted.sessionId, 'readiness-rest-swap');
  assert(accepted.exercises.some(e => e.kind === 'mobility'));
  assert(accepted.exercises.some(e => e.kind === 'antagonist-block'));
});

test('[ADR-0015] Push day is a no-op for climbing sessions', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const normal = Program.build(plan, '2026-05-09');
  const push = Program.build(plan, '2026-05-09', null, { label: 'push' });
  assertEq(push, normal, 'push-day climbing session must be byte-identical to the unmodified prescription');
});

// ─── IB-032: the Loads-key → gate-label adapter as a domain seam ───────────
// Two vocabularies meet at this boundary and differ at exactly one tier:
// Loads.computeReadinessMultiplier names the bottom tier 'rest', the
// readiness-gate pass matches 'suggestRest'. The adapter used to live inline
// in the Today view, where nothing pinned the two vocabularies together.

test('[IB-032] REGRESSION: Program.readinessGateLabel adapts Loads tier keys to gate labels', () => {
  assertEq(Program.readinessGateLabel('lighter'), 'lighter');
  assertEq(Program.readinessGateLabel('rest'), 'suggestRest', "Loads' 'rest' tier is the gate's 'suggestRest' label");
  assertEq(Program.readinessGateLabel('push'), null, 'gating is downward-only — push is a no-op');
  assertEq(Program.readinessGateLabel('normal'), null);
  assertEq(Program.readinessGateLabel(undefined), null, 'an absent readiness key must not override anything');
});

test('[IB-032] REGRESSION: every tier Loads can mint maps to a label the readiness-gate pass acts on', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const baseline = Program.build(plan, '2026-05-09');
  const seen = new Set();
  // One score per tier boundary in computeReadinessMultiplier (≥4.5 / ≥3.5 / ≥2.5 / below).
  for (const v of [5, 4, 3, 1]) {
    const { key } = Loads.computeReadinessMultiplier({ sleep: v, soreness: v, fatigue: v });
    seen.add(key);
    const label = Program.readinessGateLabel(key);
    assert(label === null || label === 'lighter' || label === 'suggestRest',
      `readiness key '${key}' mapped to an unrecognised gate label '${label}'`);
    // The round-trip that matters: a non-null label must actually change the
    // prescription, and a null one must not. A vocabulary drift (e.g. passing
    // 'rest' straight through) would silently land in the no-op branch here.
    const built = Program.build(plan, '2026-05-09', null, { label });
    if (label === null) assertEq(built, baseline, `key '${key}' should be a no-op`);
    else assert(built.readinessNote, `key '${key}' → '${label}' must reach the readiness-gate pass`);
  }
  assertEq(seen.size, 4, 'fixture should exercise all four readiness tiers');
});

test('[ADR-0015] composes with an existing deload cut (readiness scaling applies on top of the already-cut value)', () => {
  const plan = { settings: { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' }, focus: 'boulder' };
  const ctx = Program.resolveDate('2026-05-30', '2026-05-04', 12); // wk4 Sat, natural deload
  assert(ctx.deload && !ctx.retest, 'fixture must be a natural deload week');
  const lighter = Program.build(plan, '2026-05-30', null, { label: 'lighter' });
  assertEq(lighter.sessionId, 'sat-flash-pyramid');
  const pyramid = lighter.exercises.find(e => e.kind === 'boulder');
  assertEq(pyramid.originalTarget, { value: 18, unit: 'problems' }, 'deload records the pre-cut template value');
  assertEq(pyramid.readinessScaledFrom, { value: 10, unit: 'problems' }, 'readiness scaling composes on top of the deload-cut value: floor(18×0.6)=10');
  assertEq(pyramid.prescribedTarget, { value: 8, unit: 'problems' }, 'floor(10 × 0.85) = 8');
  assert(lighter.deloadNote, 'the natural deload note must still be present');
  assert(lighter.readinessNote, 'the readiness note must also be present, composing rather than replacing');
});

test('[ADR-0015] REGRESSION: suggest-rest banner renders on Today with accept/decline, and accept persists + renders the swap', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-09'); // wk1 Sat
  Storage.setDay('2026-05-09', { readiness: { sleep: 1, soreness: 1, fatigue: 1 } }); // avg 1.0 → suggest-rest
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const banner = root.querySelector('[data-readiness-swap-banner]');
    assert(banner, 'expected the suggest-rest swap banner');
    const acceptBtn = root.querySelector('[data-readiness-swap-accept]');
    assert(acceptBtn, 'expected the accept button');
    acceptBtn.click();

    const day = Storage.getDay('2026-05-09');
    assertEq(day.acceptedReadinessSwap, true);
    renderToday(root);
    assert(!root.querySelector('[data-readiness-swap-banner]'), 'banner should not re-appear once accepted');
    assert(/mobility/i.test(root.textContent), 'expected the light-day session to render');
  } finally { root.remove(); }
});

test('[banner-registry] suggest-rest swap banner is absent on a rest day (was rendered dead pre-registry)', () => {
  // Wed of wk1 is a rest slot. suggest-rest readiness there used to render the
  // swap banner with unwired buttons; the TOP_BANNERS model now excludes rest
  // sessions (a swap is a no-op there — the readiness gate guards !isRest).
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-06'); // wk1 Wed — rest slot
  Storage.setDay('2026-05-06', { readiness: { sleep: 1, soreness: 1, fatigue: 1 } }); // avg 1.0 → suggest-rest
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/Recovery checklist/i.test(root.textContent), 'fixture check: Wed must be a rest day');
    assert(!root.querySelector('[data-readiness-swap-banner]'), 'swap banner must not render on a rest day');
  } finally { root.remove(); }
});

test('[ADR-0015] REGRESSION: RPE-cap note renders on the Today tab for a capped climbing exercise', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.updatePlan(plan.id, { focus: 'boulder' });
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-07-09'); // wk10 Thu, Peak boulder = thu-limit-campus
  Storage.setDay('2026-07-09', { readiness: { sleep: 3, soreness: 3, fatigue: 3 } }); // avg 3.0 → Lighter
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(/stay ≤8\.5/i.test(root.textContent), 'expected the RPE-cap note text in the rendered session');
  } finally { root.remove(); }
});

// ─── IB-058 / ADR-0015 addendum (2026-08-06): silence reads Normal, not Lighter ──
// The Today view used to fabricate `{sleep:3,soreness:3,fatigue:3}` whenever a
// day carried no readiness check-in. That averages 3.0, and
// `computeReadinessMultiplier` scores `avg >= 2.5 && < 3.5` as **Lighter
// (×0.85)** — so merely viewing or logging a session without checking in
// down-regulated every climbing target (+ the ≤8.5 RPE cap, + the kg
// suggestion), and `getOrInitDay` froze a 3.0 the athlete never reported into
// the day record, polluting the ADR-0014 `readinessTrend` baseline.
// `computeReadinessMultiplier(null)` already returned Normal — the view
// fabricated a value specifically to defeat its own function's contract.

test('[IB-058] REGRESSION: a day with no readiness check-in prescribes Normal, not Lighter', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.updatePlan(plan.id, { focus: 'boulder' });
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-09'); // wk1 Sat, sat-flash-pyramid = 18 problems
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    assert(!Storage.getDay('2026-05-09'), 'fixture: the day must start with no log at all');
    renderToday(root);
    const summary = root.querySelector('[data-readiness-summary]');
    assert(summary, 'expected the readiness summary line');
    assert(/Normal/.test(summary.textContent), `expected Normal with no check-in, got "${summary.textContent}"`);
    assert(/Avg\s*—/.test(summary.textContent), 'expected "Avg —" (no data), not a fabricated average');
    assert(!/Readiness: lighter/i.test(root.textContent), 'the ×0.85 readiness note must not fire without a check-in');
    assert(!/stay ≤8\.5/i.test(root.textContent), 'the ≤8.5 RPE cap must not fire without a check-in');
    assert(/18 problems/.test(root.textContent), 'expected the un-scaled 18-problem target');
    assert(!/15 problems/.test(root.textContent), 'target must not be scaled ×0.85 without a check-in');
    // The kg side of the defect: `js/loads.js` appends a "readiness ×…" step to
    // the load trail only when the multiplier is not 1.0, so its absence is the
    // observable proof that the kg suggestion is un-scaled too.
    assert(!/readiness ×/.test(root.innerHTML), 'the kg chain must not apply a readiness multiplier without a check-in');
  } finally { root.remove(); }
});

test('[IB-058] REGRESSION: with no check-in the sleep/soreness/fatigue pills render unfilled', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-09');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    for (const key of ['sleep', 'soreness', 'fatigue']) {
      const group = root.querySelector(`[data-pill-group="${key}"]`);
      assert(group, `expected a ${key} pill group`);
      assertEq(group.querySelectorAll('.pill.active').length, 0,
        `${key} must render unfilled so "not checked in" is distinct from "logged straight-3s"`);
    }
  } finally { root.remove(); }
});

test('[IB-058] a DELIBERATELY-logged straight-3 still reads Lighter (thresholds untouched)', () => {
  // The addendum changes what *silence* means, not what a logged 3 means — and
  // this is what makes the two cases above non-vacuous: same date, same view,
  // Lighter appears the moment the athlete actually reports {3,3,3}.
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.updatePlan(plan.id, { focus: 'boulder' });
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-09');
  Storage.setDay('2026-05-09', { readiness: { sleep: 3, soreness: 3, fatigue: 3 } });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const summary = root.querySelector('[data-readiness-summary]');
    assert(/Lighter/.test(summary.textContent), `expected Lighter for a logged {3,3,3}, got "${summary.textContent}"`);
    assert(/Readiness: lighter/i.test(root.textContent), 'expected the ×0.85 readiness note');
    assert(/15 problems/.test(root.textContent), 'expected floor(18 × 0.85) = 15');
  } finally { root.remove(); }
});

test('[IB-058] a pain-only day reads Normal — a pain value must not re-enter as a fabricated straight-3', () => {
  // Found while building IB-058, and not anticipated by the addendum (which
  // reasoned only about monitoring's `readinessScore`): the pain check-in
  // persists `readiness` WITHOUT sleep/soreness/fatigue, and
  // `computeReadinessMultiplier` defaults each missing field to 3 — so a
  // truthy pain-only object would average 3.0 → Lighter, restoring the exact
  // defect through a different door. Pain has its own gates (ADR-0014's
  // Silbernagel model via `Loads.holdProgressionFor`), which still fire.
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.updatePlan(plan.id, { focus: 'boulder' });
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-09');
  Storage.setDay('2026-05-09', { readiness: { pain: { value: 4, settledByMorning: true } } });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const summary = root.querySelector('[data-readiness-summary]');
    assert(/Normal/.test(summary.textContent), `pain-only must read Normal, got "${summary.textContent}"`);
    assert(!/Readiness: lighter/i.test(root.textContent), 'a pain value alone must not trigger the wellness ×0.85 lever');
    assert(/18 problems/.test(root.textContent), 'expected the un-scaled target on a pain-only day');
    // The pain input itself is still rendered and still selected.
    assertEq(root.querySelectorAll('[data-pain-pill].active').length, 1, 'the logged pain value must still render');
  } finally { root.remove(); }
});

test('[IB-058] REGRESSION: saving a day without touching the pills persists NO readiness', () => {
  // getOrInitDay used to write `{3,3,3}` on every save, so a session-feel tap
  // (or any logged set) manufactured a 3.0 data point for the ADR-0014
  // readinessTrend baseline. `Monitoring.readinessScore` treats absent
  // readiness as null, so an un-persisted day is correctly ignored.
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-09');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const feel = root.querySelector('[data-pill="sessionFeel"][data-val="4"]');
    assert(feel, 'expected the session-feel pills');
    feel.click();
    const day = Storage.getDay('2026-05-09');
    assertEq(day.sessionFeel, 4, 'fixture: the save must actually have happened');
    assert(!day.readiness, `no readiness may be fabricated on save, got ${JSON.stringify(day.readiness)}`);
    // The point of not fabricating: the ADR-0014 readinessTrend baseline must
    // not gain a data point the athlete never reported. Assert it rather than
    // asserting only the storage shape.
    assertEq(Monitoring.readinessTrendSignal(Storage.listDays(plan.id), '2026-05-09'), null,
      'a saved-but-un-checked-in day must contribute nothing to the readiness trend');
    // …and a real check-in afterwards still persists normally.
    root.querySelector('[data-pill="sleep"][data-val="5"]').click();
    assertEq(Storage.getDay('2026-05-09').readiness.sleep, 5);
  } finally { root.remove(); }
});

test('[IB-058] Log feed averages the three wellness pills by name, not every numeric key', () => {
  // `fmtReadiness` used to average `Object.values(r)`, which folded in the
  // `multiplier` today.js stores alongside the pills. That was bounded while
  // the view fabricated all three pills; once IB-058 stopped fabricating them a
  // partial/pain-only day could render a score the athlete never reported.
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04', cycleWeeks: 12, peakType: 'comp' });
  // A full check-in: the multiplier stored beside the pills must not skew it.
  Storage.setDay('2026-05-09', {
    sessionId: 'sat-flash-pyramid', phase: 'base', week: 1,
    readiness: { sleep: 3, soreness: 3, fatigue: 3, multiplier: 0.85 },
    exercises: [{ name: 'Flash pyramid', kind: 'boulder', actual: { reps: 18, rpe: 7 } }]
  });
  // A pain-only day: no s/s/f at all → no readiness readout, not a fake one.
  Storage.setDay('2026-05-10', {
    sessionId: 'sun-optional', phase: 'base', week: 1,
    readiness: { pain: { value: 4, settledByMorning: true } },
    exercises: [{ name: 'Easy open climbing (optional)', kind: 'open-climb', actual: { done: true } }]
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderLog(root);
    // Feed cards are collapsed by default; readiness lives in the detail body.
    const toggles = root.querySelectorAll('[data-log-toggle]');
    assertEq(toggles.length, 2, 'fixture: expected both logged days in the feed');
    toggles.forEach(t => t.click());
    assert(/Readiness 3\.0/.test(root.textContent),
      `expected the pills-only average 3.0, got: ${(root.textContent.match(/Readiness [\d.]+/g) || []).join(', ') || 'none'}`);
    assert(!/Readiness 2\.5/.test(root.textContent), 'the stored multiplier must not be averaged into the score');
    assertEq((root.textContent.match(/Readiness [\d.]+/g) || []).length, 1,
      'a pain-only day carries no wellness score, so it must render no Readiness readout');
  } finally { root.remove(); }
});
