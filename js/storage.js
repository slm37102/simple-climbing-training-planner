// LocalStorage layer with schema versioning, change events, JSON import/export.
import { today } from './dates.js';

const KEY = 'climb-planner:state';
const SCHEMA_VERSION = 5;

const listeners = new Set();
let suppressEmit = 0;

function emit() {
  if (suppressEmit > 0) return;
  listeners.forEach(fn => { try { fn(); } catch(_) {} });
}

function makeUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'plan-' + Date.now();
}

function defaultSettings() {
  return {
    startDate: null,
    compDate: null,
    anchorMode: 'startDate', // 'startDate' | 'compDate'
    cycleWeeks: 12, // configurable macrocycle length (8–40, see js/program.js clampCycleWeeks)
    peakType: 'comp', // 'comp' | 'trip' | 'project' — drives taper length (ADR-0007)
    scheduleShiftDays: 0, // days added to effectiveStart to absorb a missed-session gap (ADR-0008); ignored in compDate mode
    gapAcknowledgedThrough: null, // ISO date up to which a detected gap was handled/acknowledged (ADR-0008)
    units: 'kg',
    syncEnabled: true,
    localOnly: false,
    updatedAt: new Date().toISOString()
  };
}

function defaultBenchmarks() {
  return {
    bodyweight: null,
    maxHang20mm: null,
    pullup1RM: null,
    sportGrade: null,
    boulderGrade: null,
    dominantStyle: 'crimp',
    dominantAngle: 'slight-overhang',
    history: [],
    updatedAt: null
  };
}

function defaultPlan(id, name = 'Plan 1') {
  return {
    id,
    name,
    focus: 'hybrid',
    color: '#4f8cff',
    archived: false,
    createdAt: today(),
    settings: defaultSettings(),
    benchmarks: defaultBenchmarks(),
    days: {},
    updatedAt: new Date().toISOString()
  };
}

function defaultState() {
  const id = makeUUID();
  const plan = defaultPlan(id);
  plan.auto = true; // startup placeholder — pruned by mergeRemote if remote has real plans (S4)
  return {
    version: SCHEMA_VERSION,
    activePlanId: id,
    plans: { [id]: plan },
    globalSettings: {},
    globalBenchmarks: {
      bodyweight: null,
      maxHang20mm: null,
      pullup1RM: null,
      sportGrade: '',
      boulderGrade: '',
      dominantStyle: 'crimp',
      dominantAngle: 'slight-overhang',
    },
  };
}

// Parse legacy "5x2 @ 62kg RPE 9" → structured fields.
function parseLegacyActual(str) {
  if (!str || typeof str !== 'string') return { raw: '' };
  const out = { raw: str };
  let m = str.match(/(\d+)\s*[xX×]\s*(\d+)/);
  if (m) { out.sets = parseInt(m[1], 10); out.reps = parseInt(m[2], 10); }
  m = str.match(/@\s*(-?[\d.]+)\s*kg/i);
  if (m) out.kg = parseFloat(m[1]);
  m = str.match(/RPE\s*([\d.]+)/i);
  if (m) out.rpe = parseFloat(m[1]);
  return out;
}

function migrateExercises(exs) {
  if (!Array.isArray(exs)) return exs;
  return exs.map(ex => {
    if (!ex) return ex;
    const next = { ...ex };
    // Migrate `actual` if it's a string (or undefined).
    if (typeof next.actual === 'string') {
      next.actual = parseLegacyActual(next.actual);
    } else if (next.actual == null) {
      next.actual = {};
    } else if (typeof next.actual === 'object' && next.actual.raw == null && (next.actual.kg != null || next.actual.sets != null || next.actual.reps != null || next.actual.rpe != null)) {
      // Already structured — leave alone.
    } else if (typeof next.actual === 'object') {
      // Object but no fields — keep as-is.
    }
    return next;
  });
}

function migrate(s) {
  if (!s) return defaultState();

  // v1 → v2: ensure basic flat shape exists
  if (!s.version || s.version < 2) {
    s = {
      version: 2,
      settings: { ...defaultSettings(), ...(s.settings || {}) },
      benchmarks: defaultBenchmarks(),
      days: s.days || {}
    };
  }

  // Ensure pre-v4 intermediate fields exist for subsequent migration steps
  if (s.version < 4 && !s.plans) {
    s.benchmarks = s.benchmarks || defaultBenchmarks();
    if (!Array.isArray(s.benchmarks.history)) s.benchmarks.history = [];
    s.days = s.days || {};
    s.settings = { ...defaultSettings(), ...(s.settings || {}) };
  }

  // v2 → v3: structure exercise.actual
  if (s.version < 3) {
    for (const date of Object.keys(s.days || {})) {
      const day = s.days[date];
      if (day?.exercises) day.exercises = migrateExercises(day.exercises);
    }
    s.version = 3;
  }

  // v3 → v4: multi-plan shape
  if (s.version < 4) {
    if (!s.plans) {
      const planId = makeUUID();
      const plan = defaultPlan(planId, 'Plan 1');
      plan.settings = { ...plan.settings, ...(s.settings || {}) };
      plan.benchmarks = { ...defaultBenchmarks(), ...(s.benchmarks || {}) };
      if (!Array.isArray(plan.benchmarks.history)) plan.benchmarks.history = [];
      plan.days = s.days || {};
      s.activePlanId = planId;
      s.plans = { [planId]: plan };
      s.globalSettings = {};
      delete s.settings;
      delete s.benchmarks;
      delete s.days;
    }
    s.version = 4;
  }

  // v4 → v5: promote active plan's benchmarks to globalBenchmarks
  if (s.version < 5) {
    if (!s.globalBenchmarks) {
      const activePlan = s.plans?.[s.activePlanId];
      const src = activePlan?.benchmarks || {};
      s.globalBenchmarks = {
        bodyweight:    src.bodyweight    ?? null,
        maxHang20mm:   src.maxHang20mm   ?? null,
        pullup1RM:     src.pullup1RM     ?? null,
        sportGrade:    src.sportGrade    ?? '',
        boulderGrade:  src.boulderGrade  ?? '',
        dominantStyle: src.dominantStyle ?? 'crimp',
        dominantAngle: src.dominantAngle ?? 'slight-overhang',
      };
    }
    s.version = 5;
  }

  // Normalise all plans — fills in missing fields on freshly-loaded or newly-added plans
  s.globalSettings = s.globalSettings || {};
  s.globalBenchmarks = s.globalBenchmarks || {
    bodyweight: null, maxHang20mm: null, pullup1RM: null,
    sportGrade: '', boulderGrade: '', dominantStyle: 'crimp', dominantAngle: 'slight-overhang',
  };
  for (const plan of Object.values(s.plans || {})) {
    plan.settings   = { ...defaultSettings(),   ...(plan.settings   || {}) };
    plan.benchmarks = { ...defaultBenchmarks(), ...(plan.benchmarks || {}) };
    if (!Array.isArray(plan.benchmarks.history)) plan.benchmarks.history = [];
    plan.days = plan.days || {};
  }

  return s;
}

let state = null;

export const Storage = {
  init() {
    try {
      const raw = localStorage.getItem(KEY);
      state = migrate(raw ? JSON.parse(raw) : null);
    } catch (e) {
      console.error('Storage parse failed', e);
      state = defaultState();
    }
    this._save();
    return state;
  },

  // Returns state with convenience accessors for the active plan so legacy
  // callers that destructure { settings, benchmarks, days } continue working.
  get() {
    const s = state || this.init();
    const ap = s.plans[s.activePlanId] || Object.values(s.plans)[0];
    return {
      ...s,
      settings:   ap?.settings,
      benchmarks: state.globalBenchmarks,
      days:       ap?.days,
    };
  },

  _save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  },

  // --- Plan management ---

  getActivePlan() {
    const s = state || this.init();
    return s.plans[s.activePlanId] || Object.values(s.plans)[0];
  },

  getPlan(id) {
    return (state || this.init()).plans[id] || null;
  },

  listPlans() {
    return Object.values((state || this.init()).plans)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  },

  addPlan(planData) {
    const s = state || this.init();
    const id = makeUUID();
    const plan = defaultPlan(id, planData.name || 'New Plan');
    plan.focus = planData.focus || 'hybrid';
    plan.color = planData.color || '#4f8cff';
    if (planData.anchorMode != null)  plan.settings.anchorMode  = planData.anchorMode;
    if (planData.startDate  != null)  plan.settings.startDate   = planData.startDate;
    if (planData.compDate   != null)  plan.settings.compDate    = planData.compDate;
    // user-created plans are never auto-pruned on remote merge (S4)
    plan.auto = false;
    s.plans[id] = plan;
    this._save(); emit();
    return id;
  },

  // Shallow-merge patch into plan top-level fields only.
  // settings / benchmarks / days have their own dedicated setters.
  updatePlan(id, patch) {
    const s = state || this.init();
    const plan = s.plans[id];
    if (!plan) throw new Error(`Plan not found: ${id}`);
    const { settings, benchmarks, days, ...rest } = patch;
    Object.assign(plan, rest, { updatedAt: new Date().toISOString(), auto: false });
    this._save(); emit();
  },

  setActivePlan(id) {
    const s = state || this.init();
    if (!s.plans[id]) throw new Error(`Plan not found: ${id}`);
    s.activePlanId = id;
    this._save(); emit();
  },

  archivePlan(id) {
    const s = state || this.init();
    const plan = s.plans[id];
    if (!plan) throw new Error(`Plan not found: ${id}`);
    plan.archived = true;
    plan.updatedAt = new Date().toISOString();
    this._save(); emit();
  },

  deletePlan(id) {
    const s = state || this.init();
    if (Object.keys(s.plans).length <= 1) throw new Error('Cannot delete the only plan.');
    delete s.plans[id];
    if (s.activePlanId === id) s.activePlanId = Object.keys(s.plans)[0];
    this._save(); emit();
  },

  // Deep-clone plan with a new id, new name, today's createdAt, and empty days.
  duplicatePlan(id, newName) {
    const s = state || this.init();
    const src = s.plans[id];
    if (!src) throw new Error(`Plan not found: ${id}`);
    const newId = makeUUID();
    const clone = JSON.parse(JSON.stringify(src));
    clone.id        = newId;
    clone.name      = newName || (src.name + ' (copy)');
    clone.createdAt = today();
    clone.days      = {};
    clone.updatedAt = new Date().toISOString();
    s.plans[newId] = clone;
    this._save(); emit();
    return newId;
  },

  // --- Per-plan data setters ---

  setPlanSettings(planId, patch) {
    const s = state || this.init();
    const plan = s.plans[planId];
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    plan.settings = { ...plan.settings, ...patch, updatedAt: new Date().toISOString() };
    plan.updatedAt = new Date().toISOString();
    plan.auto = false; // first real edit clears the auto-default flag (S4)
    this._save(); emit();
  },

  setPlanBenchmarks(planId, patch, { archive = false } = {}) {
    const s = state || this.init();
    const plan = s.plans[planId];
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    if (archive && plan.benchmarks.maxHang20mm != null) {
      plan.benchmarks.history.push({ ...plan.benchmarks, archivedAt: new Date().toISOString() });
    }
    plan.benchmarks = { ...plan.benchmarks, ...patch, updatedAt: new Date().toISOString() };
    plan.updatedAt  = new Date().toISOString();
    this._save(); emit();
  },

  // getDay(date)          — legacy 1-arg form, uses active plan
  // getDay(planId, date)  — new 2-arg form
  getDay(...args) {
    const s = state || this.init();
    if (args.length === 1) {
      const ap = s.plans[s.activePlanId] || Object.values(s.plans)[0];
      return ap?.days[args[0]] || null;
    }
    const [planId, date] = args;
    return s.plans[planId]?.days[date] || null;
  },

  // setDay(date, patch)          — legacy 2-arg form, uses active plan
  // setDay(planId, date, patch)  — new 3-arg form
  setDay(...args) {
    const s = state || this.init();
    let planId, date, patch;
    if (args.length === 2) {
      planId = s.activePlanId;
      [date, patch] = args;
    } else {
      [planId, date, patch] = args;
    }
    const plan = s.plans[planId];
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    const cur = plan.days[date] || {};
    plan.days[date] = { ...cur, ...patch, updatedAt: new Date().toISOString() };
    plan.updatedAt  = new Date().toISOString();
    plan.auto = false; // first logged day clears the auto-default flag (S4)
    this._save(); emit();
  },

  // deleteDay(date)        — legacy 1-arg form, uses active plan
  // deleteDay(planId, date) — new 2-arg form
  deleteDay(...args) {
    const s = state || this.init();
    let planId, date;
    if (args.length === 1) { planId = s.activePlanId; date = args[0]; }
    else                   { [planId, date] = args; }
    const plan = s.plans[planId];
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    delete plan.days[date];
    plan.updatedAt = new Date().toISOString();
    this._save(); emit();
  },

  // listDays()       — legacy 0-arg form, uses active plan
  // listDays(planId) — new 1-arg form
  listDays(...args) {
    const s = state || this.init();
    const planId = args.length === 0 ? s.activePlanId : args[0];
    const plan = s.plans[planId];
    if (!plan) return [];
    return Object.entries(plan.days).sort((a, b) => a[0].localeCompare(b[0]));
  },

  // --- Backwards-compat shims — delegate to active plan ---

  setSettings(patch) {
    this.setPlanSettings((state || this.init()).activePlanId, patch);
  },

  setBenchmarks(patch) {
    this.setGlobalBenchmarks(patch);
  },

  setGlobalBenchmarks(patch) {
    const s = state || this.init();
    if (!s.globalBenchmarks) s.globalBenchmarks = {};
    Object.assign(s.globalBenchmarks, patch, { updatedAt: new Date().toISOString() });
    this._save(); emit();
  },

  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  exportJson() {
    return JSON.stringify(state, null, 2);
  },

  importJson(json) {
    const incoming = JSON.parse(json);
    if (!incoming.plans || Array.isArray(incoming.plans) || typeof incoming.plans !== 'object') {
      throw new Error('Invalid import: plans must be a non-array object');
    }
    state = migrate(incoming);
    this._save(); emit();
  },

  reset() {
    state = defaultState();
    this._save(); emit();
  },

  // Merge incoming remote state with local using per-plan, per-day LWW.
  // Returns true if local actually changed (so callers can decide whether to re-render).
  // Does NOT emit() — sync caller would otherwise loop (mergeRemote → emit → upload → snapshot → mergeRemote).
  mergeRemote(remote) {
    if (!remote) return false;
    remote = migrate(remote);
    let changed = false;

    for (const [planId, remotePlan] of Object.entries(remote.plans || {})) {
      const localPlan = state.plans[planId];
      if (!localPlan) {
        // Remote has a plan that doesn't exist locally — add it.
        state.plans[planId] = remotePlan;
        changed = true;
      } else {
        // Merge settings LWW
        if (newer(remotePlan.settings?.updatedAt, localPlan.settings?.updatedAt)) {
          localPlan.settings = remotePlan.settings; changed = true;
        }
        // Merge benchmarks LWW
        if (newer(remotePlan.benchmarks?.updatedAt, localPlan.benchmarks?.updatedAt)) {
          localPlan.benchmarks = remotePlan.benchmarks; changed = true;
        }
        // Merge days LWW
        for (const [date, day] of Object.entries(remotePlan.days || {})) {
          const local = localPlan.days[date];
          if (!local || newer(day.updatedAt, local.updatedAt)) {
            localPlan.days[date] = day; changed = true;
          }
        }
        // Update plan-level updatedAt if remote is newer
        if (newer(remotePlan.updatedAt, localPlan.updatedAt)) {
          localPlan.updatedAt = remotePlan.updatedAt; changed = true;
        }
      }
      // Local plans not in remote are intentionally kept as-is (offline-created).
    }

    // Prune ONLY the auto-created startup default plan when remote already has real plans.
    // Plans created via addPlan() have auto:false and survive regardless of their day count (S4).
    if (Object.keys(remote.plans || {}).length > 0) {
      for (const [planId, plan] of Object.entries(state.plans)) {
        if (!remote.plans[planId] && plan.auto === true) {
          delete state.plans[planId];
          changed = true;
        }
      }
    }

    // Sync activePlanId from remote (so active plan is correct after first login).
    if (remote.activePlanId && state.plans[remote.activePlanId]) {
      if (state.activePlanId !== remote.activePlanId) {
        state.activePlanId = remote.activePlanId;
        changed = true;
      }
    }

    // Guard: ensure activePlanId still points to a valid plan after pruning.
    if (!state.plans[state.activePlanId]) {
      state.activePlanId = Object.keys(state.plans)[0] || null;
      changed = true;
    }

    // Merge globalBenchmarks LWW
    if (newer(remote.globalBenchmarks?.updatedAt, state.globalBenchmarks?.updatedAt)) {
      state.globalBenchmarks = remote.globalBenchmarks; changed = true;
    }

    if (changed) {
      suppressEmit++;
      try { this._save(); } finally { suppressEmit--; }
    }
    return changed;
  },

  // Wipe everything (used when switching auth accounts).
  clearLocal() {
    state = defaultState();
    this._save();
    emit();
  },

  raw() { return state; },

  activeId() { return (state || this.init()).activePlanId; }
};

export function newer(a, b) {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}
