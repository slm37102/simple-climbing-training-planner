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

// ─── ADR-0014: monitoring signals (closes KG-A4/KG-D6) ────────────────────

test('[ADR-0014] readinessTrendSignal fires on a genuine 7-day-vs-28-day drop, not on a flat trend', () => {
  const asOf = '2026-07-01';
  const days = [];
  for (let offset = 0; offset <= 27; offset++) {
    const iso = addIsoDays(asOf, -offset);
    const score = offset <= 6 ? 2 : 4; // last 7 days low, prior 21 days high
    days.push([iso, { readiness: { sleep: score, soreness: score, fatigue: score } }]);
  }
  const dropping = Monitoring.readinessTrendSignal(days, asOf);
  assert(dropping, 'expected a readiness-trend flag on a genuine drop');
  assertEq(dropping.key, 'readiness-trend');

  const flatDays = days.map(([iso]) => [iso, { readiness: { sleep: 4, soreness: 4, fatigue: 4 } }]);
  assertEq(Monitoring.readinessTrendSignal(flatDays, asOf), null, 'a flat trend must not fire');
});

test('[ADR-0014] readinessTrendSignal returns null with too little history', () => {
  const asOf = '2026-07-01';
  const days = [[asOf, { readiness: { sleep: 1, soreness: 1, fatigue: 1 } }]];
  assertEq(Monitoring.readinessTrendSignal(days, asOf), null);
});

test('[ADR-0014] rpeDriftSignal fires on 2 consecutive load-matched over-RPE hangboard sessions, not when kg increased', () => {
  const asOf = '2026-07-01';
  const days = [
    ['2026-06-20', { exercises: [{ kind: 'hangboard', rpeRange: [8, 9], actual: { kg: 20, rpe: 9.5 } }] }],
    ['2026-06-27', { exercises: [{ kind: 'hangboard', rpeRange: [8, 9], actual: { kg: 20, rpe: 9.5 } }] }],
  ];
  const drift = Monitoring.rpeDriftSignal(days, asOf);
  assert(drift, 'expected an rpe-drift flag');
  assertEq(drift.key, 'rpe-drift');

  const increasedKg = [
    ['2026-06-20', { exercises: [{ kind: 'hangboard', rpeRange: [8, 9], actual: { kg: 20, rpe: 9.5 } }] }],
    ['2026-06-27', { exercises: [{ kind: 'hangboard', rpeRange: [8, 9], actual: { kg: 22, rpe: 9.5 } }] }],
  ];
  assertEq(Monitoring.rpeDriftSignal(increasedKg, asOf), null, 'an increased kg must not read as drift');

  const inRange = [
    ['2026-06-20', { exercises: [{ kind: 'hangboard', rpeRange: [8, 9], actual: { kg: 20, rpe: 8.5 } }] }],
    ['2026-06-27', { exercises: [{ kind: 'hangboard', rpeRange: [8, 9], actual: { kg: 20, rpe: 8.5 } }] }],
  ];
  assertEq(Monitoring.rpeDriftSignal(inRange, asOf), null, 'in-range RPE must not fire');
});

test('[ADR-0014] retestTrajectorySignal fires on 2 flat-or-down retests, not on a mixed or improving result', () => {
  const flat = [
    { date: '2026-05-01', maxHang20mm: 20, pullup1RM: 30 },
    { date: '2026-06-08', maxHang20mm: 20, pullup1RM: 30 },
  ];
  const plateau = Monitoring.retestTrajectorySignal(flat);
  assert(plateau, 'expected a retest-plateau flag on two flat retests');
  assertEq(plateau.key, 'retest-plateau');

  const improved = [
    { date: '2026-05-01', maxHang20mm: 20, pullup1RM: 30 },
    { date: '2026-06-08', maxHang20mm: 22, pullup1RM: 30 },
  ];
  assertEq(Monitoring.retestTrajectorySignal(improved), null, 'improvement on either benchmark must not read as a plateau');

  assertEq(Monitoring.retestTrajectorySignal([flat[0]]), null, 'a single retest is not a trajectory');
  assertEq(Monitoring.retestTrajectorySignal([]), null);
});

test('[ADR-0014] painCheckInSignal: green/amber/red per the Silbernagel gate, including the worse-next-morning red trigger', () => {
  assertEq(Monitoring.painCheckInSignal(null), null);
  assertEq(Monitoring.painCheckInSignal({ value: 2 }), null, 'green (<3) must not flag');
  const amber = Monitoring.painCheckInSignal({ value: 4 });
  assertEq(amber.key, 'pain-amber');
  const red = Monitoring.painCheckInSignal({ value: 6 });
  assertEq(red.key, 'pain-red');
  const worseMorning = Monitoring.painCheckInSignal({ value: 2, settledByMorning: false });
  assertEq(worseMorning.key, 'pain-red', 'worse-next-morning must trigger red even at green-level pain');
});

test('[ADR-0014] pain-red carries the return-from-tweak href; retest-plateau carries the checklist href; both render as links on Today', () => {
  assertEq(Monitoring.painCheckInSignal({ value: 6 }).href, 'docs/return-from-tweak.md');
  const plateau = Monitoring.retestTrajectorySignal([
    { date: '2026-05-01', maxHang20mm: 20, pullup1RM: 30 },
    { date: '2026-06-08', maxHang20mm: 20, pullup1RM: 30 },
  ]);
  assertEq(plateau.href, 'docs/end-of-cycle-review.md');

  // DOM: a pain-red day must render the guide link in the Today banner —
  // the explicit #47→#52 blocker dependency ("pain-red banner links the
  // return-from-tweak doc").
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: datesToday() });
  Storage.setDay(datesToday(), { readiness: { sleep: 3, soreness: 3, fatigue: 3, pain: { value: 7 } } });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const link = root.querySelector('[data-signal-banner="painCheckIn"] a[href="docs/return-from-tweak.md"]');
    assert(link, 'pain-red banner must link docs/return-from-tweak.md');
  } finally { root.remove(); }
});

test('[ADR-0014] amber pain check-in holds the ADR-0009 targets-hit progression (kg mirrors instead of +2.5%)', () => {
  const exercise = { kind: 'hangboard', loadPctRange: [0.87, 0.92], rpeRange: [8, 9], prescribedSets: 2, prescribedReps: 4 };
  const benchmarks = { maxHang20mm: 20, bodyweight: 70 };
  const args = { exercise, previousActualKg: 12, previousAvgRpe: 8.5, previousActualSets: 2, previousActualReps: 4, daysSincePrevious: 5, benchmarks };
  const normal = Loads.resolveEffective(args);
  assertEq(normal.suggestedKg, 12.5, 'sanity: targets hit normally progresses +2.5% (12 × 1.025 = 12.3 → 12.5 after rounding)');
  const held = Loads.resolveEffective({ ...args, holdProgression: true });
  assertEq(held.suggestedKg, 12, 'amber holds the progression — load mirrors');
  assert(held.reason.some(r => /progression held/i.test(r)), 'reason trail must record the hold');
});

test('[Standards] computeReadinessMultiplier exposes a stable key tier alongside the display label', () => {
  assertEq(Loads.computeReadinessMultiplier({ sleep: 5, soreness: 5, fatigue: 5 }).key, 'push');
  assertEq(Loads.computeReadinessMultiplier({ sleep: 4, soreness: 4, fatigue: 4 }).key, 'normal');
  assertEq(Loads.computeReadinessMultiplier({ sleep: 3, soreness: 3, fatigue: 3 }).key, 'lighter');
  assertEq(Loads.computeReadinessMultiplier({ sleep: 1, soreness: 1, fatigue: 1 }).key, 'rest');
  assertEq(Loads.computeReadinessMultiplier(null).key, 'normal');
});

test('[ADR-0014] computeSignals aggregates all four independently', () => {
  const result = Monitoring.computeSignals({ days: [], benchmarkHistory: [], todayPain: { value: 6 }, asOfIso: '2026-07-01' });
  assertEq(result.readinessTrend, null);
  assertEq(result.rpeDrift, null);
  assertEq(result.retestPlateau, null);
  assert(result.painCheckIn && result.painCheckIn.key === 'pain-red');
});

test('[ADR-0014] schema v6 migration: globalBenchmarks.history is backfilled and idempotent', () => {
  resetStorage();
  Storage.importJson(JSON.stringify({
    version: 5, activePlanId: 'p1',
    plans: { p1: { id: 'p1', name: 'Plan 1', focus: 'hybrid', color: '#4f8cff', archived: false, createdAt: '2026-01-01', settings: {}, benchmarks: { history: [] }, days: {}, updatedAt: '2026-01-01T00:00:00.000Z' } },
    globalSettings: {},
    globalBenchmarks: { bodyweight: 70, maxHang20mm: 20, pullup1RM: 30 }
  }));
  assert(Array.isArray(Storage.get().benchmarks.history), 'v5→v6 migration must backfill globalBenchmarks.history as an array');
  assertEq(Storage.raw().version, 6);

  // Re-importing an already-v6 state must not throw or duplicate anything.
  const exported = Storage.exportJson();
  Storage.importJson(exported);
  assertEq(Storage.raw().version, 6);
  assert(Array.isArray(Storage.get().benchmarks.history));
});

test('[ADR-0014] Storage.saveRetestBenchmarks appends to history instead of overwriting', () => {
  resetStorage();
  Storage.saveRetestBenchmarks({ bodyweight: 70, maxHang20mm: 18, pullup1RM: 28 }, '2026-05-01');
  Storage.saveRetestBenchmarks({ bodyweight: 70, maxHang20mm: 20, pullup1RM: 30 }, '2026-06-08');
  const { benchmarks } = Storage.get();
  assertEq(benchmarks.maxHang20mm, 20, 'current values reflect the latest save');
  assertEq(benchmarks.history.length, 2, 'both retests must be recorded, not overwritten');
  assertEq(benchmarks.history[0], { date: '2026-05-01', maxHang20mm: 18, pullup1RM: 28 });
  assertEq(benchmarks.history[1], { date: '2026-06-08', maxHang20mm: 20, pullup1RM: 30 });
});

test('[ADR-0014] mergeRemote round-trips globalBenchmarks.history (LWW on the whole object)', () => {
  resetStorage();
  Storage.saveRetestBenchmarks({ bodyweight: 70, maxHang20mm: 18, pullup1RM: 28 }, '2026-05-01');
  const remoteTs = new Date(Date.now() + 60000).toISOString();
  const remote = {
    version: 6, activePlanId: Storage.activeId(),
    plans: {},
    globalSettings: {},
    globalBenchmarks: {
      bodyweight: 70, maxHang20mm: 22, pullup1RM: 32,
      history: [{ date: '2026-05-01', maxHang20mm: 18, pullup1RM: 28 }, { date: '2026-06-15', maxHang20mm: 22, pullup1RM: 32 }],
      updatedAt: remoteTs
    }
  };
  Storage.mergeRemote(remote);
  const { benchmarks } = Storage.get();
  assertEq(benchmarks.history.length, 2, 'remote history (newer) should win and round-trip intact');
  assertEq(benchmarks.history[1], { date: '2026-06-15', maxHang20mm: 22, pullup1RM: 32 });
});

test('[ADR-0014] REGRESSION: pain check-in persists value + worse-this-morning flag on the Today tab', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: '2026-05-04' });
  sessionStorage.setItem('todaySelectedDate', '2026-05-04');
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const painPill = root.querySelector('button[data-pain-pill][data-val="6"]');
    assert(painPill, 'pain pill (value 6) missing');
    painPill.click();
    const worseCb = root.querySelector('[data-pain-worse]');
    assert(worseCb, 'worse-this-morning checkbox missing');
    worseCb.checked = true;
    worseCb.dispatchEvent(new Event('change', { bubbles: true }));

    const day = Storage.getDay('2026-05-04');
    assertEq(day.readiness.pain.value, 6);
    assertEq(day.readiness.pain.settledByMorning, false);
  } finally { root.remove(); }
});

test('[ADR-0014] REGRESSION: readiness-trend banner appears on Today and its accept action cuts the current week\'s volume', () => {
  // The Today-tab signal banner (like the gap banner) only ever evaluates
  // against the REAL current date, not the browsed/selected one — so this
  // fixture must anchor on the actual wall-clock today, not a fixed
  // fictional date, or the date===realToday gate never opens.
  resetStorage();
  const plan = Storage.getActivePlan();
  // wk1 (startDate = today) is never a deload/retest week, whatever today's
  // weekday is, so this can't collide with a natural volume cut.
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: datesToday(), cycleWeeks: 12, peakType: 'comp' });
  for (let offset = 0; offset <= 27; offset++) {
    const iso = datesAddDays(datesToday(), -offset);
    const score = offset <= 6 ? 2 : 4;
    Storage.setDay(iso, { readiness: { sleep: score, soreness: score, fatigue: score } });
  }
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    const banner = root.querySelector('[data-signal-banner="readinessTrend"]');
    assert(banner, 'expected the readiness-trend banner to render');
    const acceptBtn = root.querySelector('[data-signal-accept="readinessTrend"]');
    assert(acceptBtn, 'expected the accept button');
    acceptBtn.click();

    // Re-render and confirm the COMING week (the 7 days from acceptance —
    // ADR-0014's "the coming week's sessions", not the already-in-progress
    // calendar week's index) now carries the early volume cut. Scan the
    // window for a cut session since some of those days are rest days
    // (forceVolumeCut deliberately skips isRest), and assert a day beyond
    // the window is uncut.
    renderToday(root);
    const freshPlan = Storage.getActivePlan();
    const cutSessions = [];
    for (let off = 0; off < 7; off++) {
      const s = Program.build(freshPlan, datesAddDays(datesToday(), off));
      if (s.deloadNote && /early volume cut/i.test(s.deloadNote)) cutSessions.push(s);
    }
    assert(cutSessions.length >= 3, `expected most non-rest sessions in the coming 7 days to carry the early cut, got ${cutSessions.length}`);
    const beyond = Program.build(freshPlan, datesAddDays(datesToday(), 8)); // wk2 of a fresh cycle — never a natural deload
    assert(!(beyond.deloadNote && /early volume cut/i.test(beyond.deloadNote)), 'a day beyond the 7-day window must not carry the early cut');
  } finally { root.remove(); }
});

test('[ADR-0014] REGRESSION: signals panel renders on the Log tab and dismiss removes it', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  Storage.setPlanSettings(plan.id, { anchorMode: 'startDate', startDate: datesToday() });
  for (let offset = 0; offset <= 27; offset++) {
    const iso = datesAddDays(datesToday(), -offset);
    const score = offset <= 6 ? 2 : 4;
    Storage.setDay(iso, { readiness: { sleep: score, soreness: score, fatigue: score } });
  }
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderLog(root);
    const panel = document.getElementById('logSignalsPanel');
    assert(panel && panel.querySelector('[data-log-signal="readinessTrend"]'), 'expected the readiness-trend row in the Log signals panel');
    const dismissBtn = panel.querySelector('[data-log-signal-dismiss="readinessTrend"]');
    assert(dismissBtn, 'dismiss button missing');
    dismissBtn.click();
    assert(!document.getElementById('logSignalsPanel').querySelector('[data-log-signal="readinessTrend"]'), 'dismissed signal should disappear from the panel');
  } finally { root.remove(); }
});
