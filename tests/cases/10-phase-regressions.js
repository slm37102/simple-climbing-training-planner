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

// ─── Phase 1 regression stubs (RED until implemented) ─────────────────────
// These assertions are EXPECTED TO FAIL against the current code. They encode
// the target behavior for Phase 1 of docs/improvement-audit.md. Make them green
// by implementing the referenced fixes — do NOT relax the assertions.
//
// Not covered here (need a different harness — verify manually):
//   S1/S2  sync `hydrated` gate           → js/sync.js   (requires Firebase mock)
//   P1     SW navigation r.ok guard        → sw.js        (service-worker context)

function makeWednesday() {
  // A deterministic non-Monday anchor (walk forward to the first Wednesday).
  const d = new Date('2026-06-01T00:00:00');
  while (d.getDay() !== 3) d.setDate(d.getDate() + 1);
  return localIso(d);
}
function nextCalendarMonday(iso) {
  const d = new Date(iso + 'T00:00:00');
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 1);
  return localIso(d);
}

test('[Phase1 C1] effectiveStart snaps a non-Monday startDate to Monday', () => {
  const wed = makeWednesday(); // 2026-06-03, a Wednesday
  const start = Program.effectiveStart({ anchorMode: 'startDate', startDate: wed, cycleWeeks: 12 });
  assert(start, 'effectiveStart returned null');
  const dow = new Date(start + 'T00:00:00').getDay();
  assertEq(dow, 1, `effectiveStart should snap to a Monday (got ${start}, dow ${dow}) — see C1`);
});

test('[Phase1 C1] Mon/Thu/Sat of one calendar week share weekIdx/phase/flavor (non-Monday anchor)', () => {
  const wed = makeWednesday();
  const cw = 12;
  const start = Program.effectiveStart({ anchorMode: 'startDate', startDate: wed, cycleWeeks: cw });
  const mon = nextCalendarMonday(wed);
  const thu = addIsoDays(mon, 3);
  const sat = addIsoDays(mon, 5);
  const rMon = Program.resolveDate(mon, start, cw);
  const rThu = Program.resolveDate(thu, start, cw);
  const rSat = Program.resolveDate(sat, start, cw);
  assert(rMon && !rMon.outOfCycle && rThu && !rThu.outOfCycle && rSat && !rSat.outOfCycle, 'all three days should resolve inside the cycle');
  assertEq(rThu.weekIdx, rMon.weekIdx, `Thu must share Mon's weekIdx within one calendar week — see C1`);
  assertEq(rSat.weekIdx, rMon.weekIdx, `Sat must share Mon's weekIdx within one calendar week — see C1`);
  assertEq(rSat.phase, rMon.phase, 'phase must be constant across one calendar week');
  assertEq(rSat.flavor, rMon.flavor, 'flavor must be constant across one calendar week');
});

test('[Phase1 S3] importJson rejects a payload whose plans is not a plain object', () => {
  resetStorage();
  let threw = false;
  try {
    Storage.importJson(JSON.stringify({ version: 5, activePlanId: 'x', plans: [], globalBenchmarks: {} }));
  } catch (e) { threw = true; }
  assert(threw, 'importJson should throw when `plans` is an array / not a plain object — see S3');
  resetStorage();
});

test('[Phase1 S4] mergeRemote keeps a user-created offline plan, prunes only the auto default', () => {
  resetStorage();
  const defaultId = Storage.getActivePlan().id;                          // auto-created "Plan 1"
  const offlineId = Storage.addPlan({ name: 'My Offline Plan', focus: 'sport' }); // real plan, no days yet
  const ts = new Date().toISOString();
  const remote = {
    version: 5,
    activePlanId: 'remote-1',
    plans: {
      'remote-1': {
        id: 'remote-1', name: 'Remote', focus: 'hybrid', color: '#4f8cff', archived: false,
        createdAt: '2026-01-01', settings: { updatedAt: ts }, benchmarks: { history: [], updatedAt: ts },
        days: {}, updatedAt: ts
      }
    },
    globalSettings: {},
    globalBenchmarks: { updatedAt: ts }
  };
  Storage.mergeRemote(remote);
  assert(Storage.getPlan(offlineId), 'a configured offline plan with no logged days must NOT be pruned — see S4');
  assert(!Storage.getPlan(defaultId), 'the auto-created empty default SHOULD be pruned — see S4');
});

// ─── Phase 4: dates.js + exercise-inputs.js + Storage.activeId ───────────

test('[Phase4 Q1] dates.js today() returns a local YYYY-MM-DD string', () => {
  const t = datesToday();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(t), `today() should be YYYY-MM-DD, got ${t}`);
  // Local date should match JS Date local parts
  const d = new Date();
  const expected = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  assertEq(t, expected, 'today() must use local time, not UTC');
});

test('[Phase4 Q1] dates.js addDays and daysBetween round-trip', () => {
  const base = '2026-06-01';
  assertEq(datesAddDays(base, 7), '2026-06-08', 'addDays +7');
  assertEq(datesAddDays(base, -1), '2026-05-31', 'addDays -1 across month');
  assertEq(daysBetween(base, '2026-06-08'), 7, 'daysBetween');
  assertEq(daysBetween('2026-06-08', base), -7, 'daysBetween negative');
});

test('[Phase4 Q1] dates.js snapToMonday snaps any weekday to Monday', () => {
  assertEq(datesSnapToMonday('2026-06-01'), '2026-06-01', 'Monday stays');
  assertEq(datesSnapToMonday('2026-06-03'), '2026-06-01', 'Wednesday → Monday');
  assertEq(datesSnapToMonday('2026-06-07'), '2026-06-01', 'Sunday → previous Monday');
});

test('[Phase4 Q8] actualHasResult detects any logged field', () => {
  assert(!actualHasResult(null), 'null → false');
  assert(!actualHasResult({}), 'empty object → false');
  assert( actualHasResult({ kg: 20 }), 'kg → true');
  assert( actualHasResult({ sets: 3 }), 'sets → true');
  assert( actualHasResult({ done: true }), 'done → true');
  assert(!actualHasResult({ done: false }), 'done:false → false');
  assert( actualHasResult({ raw: 'some text' }), 'raw string → true');
  assert(!actualHasResult({ raw: '' }), 'empty raw → false');
});

test('[Phase4 Q5] Storage.activeId() returns activePlanId', () => {
  resetStorage();
  const id = Storage.getActivePlan().id;
  assertEq(Storage.activeId(), id, 'activeId() should match active plan id');
  const newId = Storage.addPlan({ name: 'New Plan' });
  Storage.setActivePlan(newId);
  assertEq(Storage.activeId(), newId, 'activeId() updates after setActivePlan');
});

// ─── Phase 2: C2 no adjacent deloads ─────────────────────────────────────

test('[Phase2 C2] no two adjacent weeks are both deload for all supported cycle lengths', () => {
  for (let w = MIN_CYCLE_WEEKS; w <= MAX_CYCLE_WEEKS; w++) {
    const p = buildPhasePattern(w);
    for (let i = 1; i < p.length; i++) {
      if (p[i - 1].deload && p[i].deload) {
        throw new Error(`w=${w}: weeks ${i} and ${i+1} are both deload (adjacent) — see C2`);
      }
    }
  }
});

// ─── Phase 2: S5 newer() + mergeRemote LWW ────────────────────────────────

test('[Phase2 S5] newer: returns correct LWW ordering', () => {
  assert( newer('2026-06-02T10:00:00.000Z', '2026-06-01T10:00:00.000Z'), 'newer A>B should be true');
  assert(!newer('2026-06-01T10:00:00.000Z', '2026-06-02T10:00:00.000Z'), 'newer A<B should be false');
  assert(!newer(null, '2026-06-01T10:00:00.000Z'), 'newer(null, b) should be false');
  assert( newer('2026-06-01T10:00:00.000Z', null),  'newer(a, null) should be true');
  assert( newer('2026-06-01T10:00:00.000Z', '2026-06-01T10:00:00.000Z') === false, 'equal timestamps: not newer');
});

test('[Phase2 S5] mergeRemote: remote plan added locally when not present', () => {
  resetStorage();
  const ts = new Date().toISOString();
  const remote = {
    version: 5,
    activePlanId: 'r1',
    plans: {
      'r1': {
        id: 'r1', name: 'Remote Plan', focus: 'sport', color: '#fff', archived: false,
        createdAt: '2026-01-01', settings: { updatedAt: ts }, benchmarks: { history: [], updatedAt: ts },
        days: {}, updatedAt: ts
      }
    },
    globalSettings: {},
    globalBenchmarks: { updatedAt: ts }
  };
  Storage.mergeRemote(remote);
  assert(Storage.getPlan('r1'), 'remote-only plan should be added locally');
});

test('[Phase2 S5] mergeRemote: remote wins on newer updatedAt (LWW)', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  const olderTs = '2026-01-01T00:00:00.000Z';
  const newerTs = '2026-12-31T00:00:00.000Z';
  Storage.setPlanSettings(plan.id, { startDate: '2026-03-01' });
  // setPlanSettings stamps updatedAt=now; pin local to the intended OLDER timestamp so the
  // LWW boundary is genuinely exercised (independent of the current date).
  { const lp = Storage.raw().plans[plan.id]; lp.settings.updatedAt = olderTs; lp.updatedAt = olderTs; }
  const remote = {
    version: 5,
    activePlanId: plan.id,
    plans: {
      [plan.id]: {
        id: plan.id, name: 'Plan 1', focus: 'hybrid', color: '#4f8cff', archived: false,
        createdAt: '2026-01-01',
        settings: { startDate: '2026-06-01', updatedAt: newerTs },
        benchmarks: { history: [], updatedAt: olderTs },
        days: {}, updatedAt: newerTs
      }
    },
    globalSettings: {},
    globalBenchmarks: { updatedAt: olderTs }
  };
  Storage.mergeRemote(remote);
  assertEq(Storage.getActivePlan().settings.startDate, '2026-06-01', 'remote startDate should win (newer)');
});

test('[Phase2 S5] mergeRemote: local wins when local is newer', () => {
  resetStorage();
  const plan = Storage.getActivePlan();
  const olderTs = '2026-01-01T00:00:00.000Z';
  const newerTs = '2026-12-31T00:00:00.000Z';
  Storage.setPlanSettings(plan.id, { startDate: '2026-09-01' });
  // Pin local to the intended NEWER timestamp (setPlanSettings would otherwise stamp now).
  { const lp = Storage.raw().plans[plan.id]; lp.settings.updatedAt = newerTs; lp.updatedAt = newerTs; }
  const remote = {
    version: 5,
    activePlanId: plan.id,
    plans: {
      [plan.id]: {
        id: plan.id, name: 'Plan 1', focus: 'hybrid', color: '#4f8cff', archived: false,
        createdAt: '2026-01-01',
        settings: { startDate: '2026-01-15', updatedAt: olderTs },
        benchmarks: { history: [], updatedAt: olderTs },
        days: {}, updatedAt: olderTs
      }
    },
    globalSettings: {},
    globalBenchmarks: { updatedAt: olderTs }
  };
  Storage.mergeRemote(remote);
  assertEq(Storage.getActivePlan().settings.startDate, '2026-09-01', 'local startDate should win (newer)');
});

test('[Phase2 S5] mergeRemote: activePlanId syncs from remote', () => {
  resetStorage();
  const ts = new Date().toISOString();
  const remote = {
    version: 5,
    activePlanId: 'r-active',
    plans: {
      'r-active': {
        id: 'r-active', name: 'Remote Active', focus: 'hybrid', color: '#4f8cff', archived: false,
        createdAt: '2026-01-01', settings: { updatedAt: ts }, benchmarks: { history: [], updatedAt: ts },
        days: {}, updatedAt: ts
      }
    },
    globalSettings: {},
    globalBenchmarks: { updatedAt: ts }
  };
  Storage.mergeRemote(remote);
  assertEq(Storage.get().activePlanId, 'r-active', 'activePlanId should sync from remote');
});
