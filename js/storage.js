// LocalStorage layer with schema versioning, change events, JSON import/export.
const KEY = 'climb-planner:state';
const SCHEMA_VERSION = 2;

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

function migrate(s) {
  if (!s) return defaultState();
  if (!s.version || s.version < 2) {
    s = { ...defaultState(), ...s, version: 2 };
  }
  s.benchmarks = s.benchmarks || defaultState().benchmarks;
  if (!Array.isArray(s.benchmarks.history)) s.benchmarks.history = [];
  s.days = s.days || {};
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
