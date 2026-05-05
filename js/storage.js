// LocalStorage layer with schema versioning, change events, JSON import/export.
const KEY = 'climb-planner:state';
const SCHEMA_VERSION = 3;

const listeners = new Set();
let suppressEmit = 0;

function emit() {
  if (suppressEmit > 0) return;
  listeners.forEach(fn => { try { fn(); } catch(_) {} });
}

function defaultState() {
  return {
    version: SCHEMA_VERSION,
    settings: {
      startDate: null,
      compDate: null,
      anchorMode: 'startDate', // 'startDate' | 'compDate'
      units: 'kg',
      discipline: 'both',
      level: 'intermediate',
      syncEnabled: true,
      localOnly: false,
      updatedAt: new Date().toISOString()
    },
    benchmarks: {
      bodyweight: null,
      maxHang20mm: null,
      pullup1RM: null,
      sportGrade: null,
      boulderGrade: null,
      dominantStyle: 'crimp',
      dominantAngle: 'slight-overhang',
      history: [],
      updatedAt: null
    },
    days: {}
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
  if (!s.version || s.version < 2) {
    s = { ...defaultState(), ...s, version: 2 };
  }
  s.benchmarks = s.benchmarks || defaultState().benchmarks;
  if (!Array.isArray(s.benchmarks.history)) s.benchmarks.history = [];
  s.days = s.days || {};
  s.settings = { ...defaultState().settings, ...(s.settings || {}) };

  // v2 → v3: structure exercise.actual
  if (!s.version || s.version < 3) {
    for (const date of Object.keys(s.days)) {
      const day = s.days[date];
      if (day?.exercises) day.exercises = migrateExercises(day.exercises);
    }
    s.version = 3;
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
  get() { return state || this.init(); },
  _save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  },
  setSettings(patch) {
    state.settings = { ...state.settings, ...patch, updatedAt: new Date().toISOString() };
    this._save(); emit();
  },
  setBenchmarks(patch, { archive = false } = {}) {
    if (archive && state.benchmarks.maxHang20mm != null) {
      state.benchmarks.history.push({
        ...state.benchmarks,
        archivedAt: new Date().toISOString()
      });
    }
    state.benchmarks = {
      ...state.benchmarks,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this._save(); emit();
  },
  getDay(date) { return state.days[date] || null; },
  setDay(date, patch) {
    const cur = state.days[date] || {};
    state.days[date] = {
      ...cur,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this._save(); emit();
  },
  deleteDay(date) {
    delete state.days[date];
    this._save(); emit();
  },
  listDays() { return Object.entries(state.days).sort((a,b) => a[0].localeCompare(b[0])); },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  exportJson() {
    return JSON.stringify(state, null, 2);
  },
  importJson(json) {
    const incoming = JSON.parse(json);
    state = migrate(incoming);
    this._save(); emit();
  },
  reset() {
    state = defaultState();
    this._save(); emit();
  },
  // Merge incoming remote state with local using per-day LWW.
  // Returns true if local actually changed (so callers can decide whether to re-render).
  // Does NOT emit() — sync caller would otherwise loop (mergeRemote → emit → upload → snapshot → mergeRemote).
  mergeRemote(remote) {
    if (!remote) return false;
    remote = migrate(remote);
    let changed = false;
    if (newer(remote.settings?.updatedAt, state.settings?.updatedAt)) {
      state.settings = remote.settings; changed = true;
    }
    if (newer(remote.benchmarks?.updatedAt, state.benchmarks?.updatedAt)) {
      state.benchmarks = remote.benchmarks; changed = true;
    }
    for (const [date, day] of Object.entries(remote.days || {})) {
      const local = state.days[date];
      if (!local || newer(day.updatedAt, local.updatedAt)) {
        state.days[date] = day; changed = true;
      }
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
  raw() { return state; }
};

function newer(a, b) {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}
