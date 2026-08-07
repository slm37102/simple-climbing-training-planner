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

// ─── inputVisibility ──────────────────────────────────────────────────────

test('inputVisibility hangboard → kg+sets+reps+rpe', () => {
  const v = inputVisibility({ kind: 'hangboard' });
  assertEq(v, { kg: true, sets: true, reps: true, rpe: true, optional: false, none: false });
});

test('inputVisibility boulder → reps+rpe (no kg, no sets — gym-ready spec: one count input)', () => {
  const v = inputVisibility({ kind: 'boulder' });
  assertEq(v, { kg: false, sets: false, reps: true, rpe: true, optional: false, none: false });
});

test('inputVisibility test → kg+reps+rpe (no sets — single effort)', () => {
  const v = inputVisibility({ kind: 'test' });
  assertEq(v, { kg: true, sets: false, reps: true, rpe: true, optional: false, none: false });
});

test('inputVisibility arc → reps+rpe (min, no sets/kg)', () => {
  const v = inputVisibility({ kind: 'arc' });
  assertEq(v, { kg: false, sets: false, reps: true, rpe: true, optional: false, none: false });
  assertEq(repsLabel({ kind: 'arc' }), 'min');
  assertEq(repsLabel({ kind: 'boulder' }), 'reps');
});

test('inputVisibility mobility/skill/antagonist-block/core → no inputs', () => {
  for (const k of ['mobility', 'skill', 'antagonist-block', 'core']) {
    const v = inputVisibility({ kind: k });
    assert(v.none === true, `kind ${k} should be none`);
    assert(!v.kg && !v.sets && !v.reps && !v.rpe, `kind ${k} should have no numeric fields`);
  }
});

test('inputVisibility optional flag overrides → checkbox only', () => {
  const v = inputVisibility({ kind: 'test', optional: true });
  assertEq(v, { kg: false, sets: false, reps: false, rpe: false, optional: true, none: false });
});

// ─── Storage ──────────────────────────────────────────────────────────────

// IB-037: grade benchmark fields default to a consistent empty type across
// code paths. Grades are strings → '' (not null); numeric benchmarks stay null.
// Previously defaultBenchmarks() used null while globalBenchmarks used '',
// which meant a per-plan grade could interpolate as the literal "null".
test('[IB-037] fresh benchmark grade fields use "" empty in both global and per-plan shapes', () => {
  resetStorage();
  const g = Storage.get().benchmarks;            // globalBenchmarks (live path)
  const p = Storage.getActivePlan().benchmarks;  // per-plan (defaultBenchmarks)
  assertEq(g.sportGrade,   '', 'global sportGrade empty is ""');
  assertEq(g.boulderGrade, '', 'global boulderGrade empty is ""');
  assertEq(p.sportGrade,   '', 'per-plan sportGrade empty is "" (was null)');
  assertEq(p.boulderGrade, '', 'per-plan boulderGrade empty is ""');
  // numeric benchmarks are consistently null (empty number), not ''
  assertEq(p.maxHang20mm, null, 'numeric benchmark empty stays null');
});

test('Storage.setDay → getDay round-trip preserves actual fields', () => {
  resetStorage();
  Storage.setDay('2026-05-20', {
    sessionId: 'mon-hangboard-base',
    status: 'completed',
    exercises: [{ name: 'X', kind: 'hangboard', actual: { kg: 27.5, sets: 5, reps: 3, rpe: 8.5 } }]
  });
  const back = Storage.getDay('2026-05-20');
  assert(back, 'getDay returned null');
  assertEq(back.exercises[0].actual.kg,   27.5);
  assertEq(back.exercises[0].actual.sets, 5);
  assertEq(back.exercises[0].actual.reps, 3);
  assertEq(back.exercises[0].actual.rpe,  8.5);
});

test('Storage.setDay 3-arg writes to specified plan only', () => {
  resetStorage();
  const id1 = Storage.getActivePlan().id;
  const id2 = Storage.addPlan({ name: 'Plan 2' });
  Storage.setDay(id2, '2026-05-20', { exercises: [{ actual: { kg: 99 } }] });
  assert(!Storage.getDay(id1, '2026-05-20'), 'plan1 should not have day');
  const d = Storage.getDay(id2, '2026-05-20');
  assertEq(d.exercises[0].actual.kg, 99);
});

test('Storage: optional.done boolean persists', () => {
  resetStorage();
  Storage.setDay('2026-05-20', { exercises: [{ actual: { done: true } }] });
  const back = Storage.getDay('2026-05-20');
  assertEq(back.exercises[0].actual.done, true);
});

// ─── Schema migration: legacy flat state → multi-plan shape (IB-061) ────────
// The v3→v6 chain is the path a returning user who last opened the app before
// the multi-plan rework hits on load. Only v5→v6 had a round-trip case
// (15-monitoring.js); the earlier steps — especially the v3→v4 structural wrap
// that reshapes {settings,benchmarks,days} into {plans,activePlanId,...} — had
// none, so a regression that dropped a returning user's logged history would
// pass silently. `importJson` can't reach it (it throws unless `plans` already
// exists), so the migration runs only via the LocalStorage load path: seed the
// key and call Storage.init(). Characterization test — pins current behaviour.
test('[IB-061] v3→v6 load-path migration wraps a legacy flat state into a plan, preserving days/settings/benchmarks', () => {
  resetStorage();
  const legacy = {
    version: 3,
    settings: { cycleWeeks: 16, peakType: 'trip', startDate: '2026-01-05', units: 'lb' },
    benchmarks: {
      bodyweight: 68, maxHang20mm: 22, pullup1RM: 30, sportGrade: '7a', boulderGrade: 'V6',
      history: [{ date: '2026-01-01', maxHang20mm: 22, pullup1RM: 30 }],
    },
    days: { '2026-01-06': { exercises: [{ id: 'e1', name: 'Max hangs', kind: 'hangboard', actual: { kg: 20, sets: 4, reps: 5, rpe: 8 } }] } },
  };
  localStorage.setItem('climb-planner:state', JSON.stringify(legacy));
  Storage.init();

  const raw = Storage.raw();
  assertEq(raw.version, 6, 'the whole v3→v6 chain runs to the current version on load');
  assert(raw.plans && typeof raw.plans === 'object' && !Array.isArray(raw.plans), 'v3→v4 wraps the flat state into a plans object');
  assert(!('settings' in raw) && !('benchmarks' in raw) && !('days' in raw), 'the old flat top-level keys are removed by v3→v4');
  const plan = raw.plans[raw.activePlanId];
  assert(plan, 'activePlanId points at a real plan');

  // The returning user's logged history must survive the wrap — the data-loss guard.
  assertEq(Object.keys(plan.days), ['2026-01-06'], 'logged days are preserved into the plan');
  assertEq(plan.days['2026-01-06'].exercises[0].actual.kg, 20, 'logged actuals survive the migration');

  // User settings carried into the plan (not reset to defaults).
  assertEq(plan.settings.cycleWeeks, 16, 'cycleWeeks carried into the plan');
  assertEq(plan.settings.peakType, 'trip', 'peakType carried into the plan');
  assertEq(plan.settings.units, 'lb', 'units carried into the plan');

  // Benchmark scalars promoted to globalBenchmarks (v4→v5); per-plan history preserved.
  assertEq(raw.globalBenchmarks.maxHang20mm, 22, 'benchmark scalars promoted to globalBenchmarks');
  assertEq(raw.globalBenchmarks.sportGrade, '7a', 'grade strings promoted to globalBenchmarks');
  assertEq(plan.benchmarks.history, [{ date: '2026-01-01', maxHang20mm: 22, pullup1RM: 30 }], 'legacy per-plan retest history preserved on the plan');
  // v6 invariant: globalBenchmarks.history is always an array. (The legacy
  // per-plan history is NOT promoted into it — it stays on the plan; whether
  // that promotion is owed is a separate migrate-level question, trip-wire 4.)
  assert(Array.isArray(raw.globalBenchmarks.history), 'globalBenchmarks.history is an array after v6');
});

test('[IB-061] load-path migration is idempotent — re-init on the migrated state does not corrupt it', () => {
  resetStorage();
  const legacy = {
    version: 3,
    settings: { cycleWeeks: 12, peakType: 'comp' },
    benchmarks: { bodyweight: 70, maxHang20mm: 20, pullup1RM: 28 },
    days: { '2026-02-02': { exercises: [{ name: 'Repeaters', kind: 'hangboard', actual: { kg: 15 } }] } },
  };
  localStorage.setItem('climb-planner:state', JSON.stringify(legacy));
  Storage.init();
  const firstPlanId = Storage.raw().activePlanId;

  // A second load reads the just-saved v6 state and must migrate to a no-op.
  Storage.init();
  const raw = Storage.raw();
  assertEq(raw.version, 6, 're-init keeps the state at v6');
  assertEq(Object.keys(raw.plans).length, 1, 're-init does not duplicate the plan');
  assertEq(raw.activePlanId, firstPlanId, 'the active plan id is stable across re-init');
  assertEq(raw.plans[raw.activePlanId].days['2026-02-02'].exercises[0].actual.kg, 15, 'logged data survives a second load');
});

// ─── Plan duplication: deep, independent clone with empty days (IB-062) ──────
// duplicatePlan backs a live Profile "Duplicate" button. The copy must be a
// deep clone with a fresh id and — critically — EMPTY days: it reuses the
// schedule/benchmarks but starts with no logged sessions. Dropping the
// `clone.days = {}` line would silently inherit the source's entire training
// log into the copy; a shallow clone would alias source state so logging into
// one plan corrupts the other. Neither had any coverage.
test('[IB-062] duplicatePlan makes a deep, independent copy: fresh id, default (copy) name, empty days', () => {
  resetStorage();
  const srcId = Storage.addPlan({ name: 'Base', focus: 'boulder' });
  Storage.setDay(srcId, '2026-01-06', { exercises: [{ name: 'Max hangs', actual: { kg: 20 } }] });

  const copyId = Storage.duplicatePlan(srcId);            // no name → default
  assert(copyId !== srcId, 'the copy gets a fresh id');
  const copy = Storage.getPlan(copyId);
  assertEq(copy.name, 'Base (copy)', 'default name is "<source> (copy)"');
  assertEq(copy.focus, 'boulder', 'schedule fields (focus) are carried over from the source');
  assertEq(Object.keys(copy.days).length, 0, 'the copy starts with NO logged days — it reuses the plan, not the log');

  // Deep independence: logging into the copy must not leak into the source, and
  // the source's own logged day must stay intact.
  Storage.setDay(copyId, '2026-02-02', { exercises: [{ name: 'Repeaters', actual: { kg: 99 } }] });
  assertEq(Storage.getPlan(srcId).days['2026-02-02'], undefined, 'writing into the copy does not leak into the source');
  assert(Storage.getPlan(srcId).days['2026-01-06'] != null, "the source's original logged day survives duplication");
  assertEq(Storage.getPlan(copyId).days['2026-02-02'].exercises[0].actual.kg, 99, 'the copy keeps its own logged day');
});

// ─── v2→v3 legacy `actual` string parse (IB-063) ────────────────────────────
// IB-061 covered the v3→v6 chain but *explicitly* left the earlier v2→v3 step
// uncovered. A pre-v3 state stored `exercise.actual` as a free string like
// "5x2 @ 62kg RPE 9"; the migration must parse it into structured fields via
// `parseLegacyActual`'s three regexes, or a returning user's historical logged
// results silently blank on the one-time upgrade (data loss). Only reachable
// via the LocalStorage load path (importJson throws without `plans`).
test('[IB-063] v2→v3 migration parses a legacy string `actual` into structured {sets,reps,kg,rpe,raw}', () => {
  resetStorage();
  localStorage.setItem('climb-planner:state', JSON.stringify({
    version: 2,
    settings: {},
    benchmarks: {},
    days: { '2026-01-06': { exercises: [{ name: 'Max hangs', actual: '5x2 @ 62kg RPE 9' }] } },
  }));
  Storage.init();                                        // runs migrate() v2→v3→…→v6

  const raw = Storage.raw();
  assertEq(raw.version, 6, 'the whole chain runs from v2 to the current version on load');
  const a = raw.plans[raw.activePlanId].days['2026-01-06'].exercises[0].actual;
  assertEq(a.sets, 5, 'sets parsed from "5x2"');
  assertEq(a.reps, 2, 'reps parsed from "5x2"');
  assertEq(a.kg,   62, 'kg parsed from "@ 62kg"');
  assertEq(a.rpe,  9,  'rpe parsed from "RPE 9"');
  assertEq(a.raw, '5x2 @ 62kg RPE 9', 'the original string is preserved as raw');
});

// ─── deletePlan: guard the last plan + reassign active on delete (IB-065) ────
// deletePlan must (a) throw 'Cannot delete the only plan.' when one plan
// remains — deleting the last one would leave a plan-less state that get()
// later throws on — and (b) move activePlanId to a survivor when the plan being
// deleted is the active one, or the app is left pointing at a dangling id.
test('[IB-065] deletePlan reassigns activePlanId on active-plan delete and refuses the last plan', () => {
  resetStorage();
  const a = Storage.getActivePlan().id;        // reset leaves one (active) plan
  const b = Storage.addPlan({ name: 'B' });    // active stays `a`
  Storage.deletePlan(a);                        // delete the ACTIVE plan
  assertEq(Storage.getPlan(a), null, 'the deleted plan is gone');
  assertEq(Storage.raw().activePlanId, b, 'activePlanId moves to the surviving plan');

  let threw = false;
  try { Storage.deletePlan(b); }
  catch (e) { threw = true; assertEq(e.message, 'Cannot delete the only plan.', 'guard message'); }
  assert(threw, 'deleting the only remaining plan throws');
  assert(Storage.getPlan(b) != null, 'the last plan is not deleted after the guard fires');
});
