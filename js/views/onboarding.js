// New-plan onboarding wizard — ASCENT full-screen overlay, 5 steps:
// 0 welcome · 1 goal (discipline + target grade) · 2 current maxes ·
// 3 schedule (anchor mode + calendar + duration) · 4 review & create.
// Note: the design's "available training days" chips are intentionally omitted —
// the weekly layout is fixed Mon/Thu/Sat main + Tue light + Sun optional
// (a core invariant; flexible scheduling is tracked as KG-A3/KG-D3).
import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { flash } from '../ui.js';
import { mondayDow } from '../dates.js';

const V_GRADES = ['V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11'];
const F_GRADES = ['6c', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a'];
const COLORS = ['#5FD4E8', '#F0607A', '#3FB6A8', '#E0A53C', '#6E8BF0', '#F07850'];
const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
}
function daysBetween(a, b) {
  return Math.floor((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}
function pretty(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function openOnboarding({ onDone } = {}) {
  const bm = Storage.get().benchmarks || {};
  const state = {
    step: 0,
    discipline: 'both', // boulder | sport | both
    gradeIdx: 2,
    draft: {
      hangAddKg: bm.maxHang20mm ?? 10,
      pullMaxKg: bm.pullup1RM ?? 20,
      bodyKg: bm.bodyweight ?? 70,
      weeks: Program.DEFAULT_CYCLE_WEEKS,
    },
    schedMode: 'start-weeks', // start-weeks | start-end | end-weeks
    peakType: 'comp',         // comp | trip | project — taper length lever (ADR-0007)
    activeField: 'start',     // which date the calendar edits in start-end mode
    startDate: null,
    endDate: null,
    calMonth: toLocalISO(new Date()).slice(0, 7) + '-01',
    planName: '',
  };

  const overlay = document.createElement('div');
  overlay.className = 'wizard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'New plan setup');
  document.body.appendChild(overlay);

  function close(done = false) {
    overlay.remove();
    if (done && typeof onDone === 'function') onDone();
  }

  function grades() {
    return state.discipline === 'sport' ? F_GRADES : V_GRADES;
  }

  // Derived schedule values per mode. Returns { startDate, compDate, anchorMode, weeks, derivedLabel, derivedValue }
  function derived() {
    const w = state.draft.weeks;
    if (state.schedMode === 'start-weeks') {
      const end = state.startDate ? addDays(state.startDate, Program.cycleDays(w) - 1) : null;
      return { anchorMode: 'startDate', startDate: state.startDate, compDate: null, weeks: w,
        derivedLabel: 'Cycle ends', derivedValue: pretty(end) };
    }
    if (state.schedMode === 'end-weeks') {
      const start = state.endDate ? Program.computeStartFromComp(state.endDate, w) : null;
      return { anchorMode: 'compDate', startDate: null, compDate: state.endDate, weeks: w,
        derivedLabel: 'Cycle starts', derivedValue: pretty(start) };
    }
    // start-end: derive weeks from the two dates; anchor on the comp date so the
    // final taper day lands on it (start gets Monday-snapped by the engine).
    let weeks = null;
    if (state.startDate && state.endDate && state.endDate > state.startDate) {
      weeks = Program.clampCycleWeeks(Math.round((daysBetween(state.startDate, state.endDate) + 1) / 7));
    }
    return { anchorMode: 'compDate', startDate: null, compDate: state.endDate, weeks,
      derivedLabel: 'Duration', derivedValue: weeks ? `${weeks} weeks` : '—' };
  }

  function stepValid() {
    if (state.step === 3) {
      const d = derived();
      if (state.schedMode === 'start-weeks') return !!state.startDate;
      if (state.schedMode === 'end-weeks') return !!state.endDate;
      return !!(state.startDate && state.endDate && d.weeks);
    }
    return true;
  }

  // ── Step bodies ─────────────────────────────────────────────────────────

  function s0Html() {
    return `<div style="padding-top:16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px">
      <div style="width:64px;height:64px;border-radius:18px;background:linear-gradient(150deg,var(--accent),var(--good));display:flex;align-items:center;justify-content:center">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#04222A" stroke-width="2" stroke-linejoin="round"><path d="M3 20h18L14 6l-3.5 7-2-3z"></path></svg>
      </div>
      <div>
        <div style="font:800 24px 'Archivo';text-transform:uppercase;line-height:1.05">Build your<br>training block</div>
        <div style="font:400 13px 'Archivo';color:var(--muted);margin:10px auto 0;line-height:1.5;max-width:250px">A periodized plan — Base, Build, Peak, Taper — with loads from your maxes that adapt to daily readiness.</div>
      </div>
      <div style="width:100%;display:flex;flex-direction:column;gap:12px;margin-top:6px">
        ${['Auto-calculated hangboard & pull-up loads', 'Adapts each day to your readiness', 'Built-in deload weeks & retests'].map(t =>
          `<div class="feature-li"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg><span>${t}</span></div>`).join('')}
      </div>
    </div>`;
  }

  function s1Html() {
    const g = grades();
    const idx = Math.min(state.gradeIdx, g.length - 1);
    const choice = (val, label) =>
      `<div class="choice ${state.discipline === val ? 'active' : ''}" data-disc="${val}" role="button" tabindex="0">${label}</div>`;
    return `<div style="display:flex;flex-direction:column;gap:22px;padding-top:6px">
      <div><div class="wiz-h">What's the goal?</div><div class="wiz-sub">Sets the emphasis of your sessions.</div></div>
      <div>
        <div class="section-label" style="margin-bottom:9px">Discipline</div>
        <div class="choice-row">${choice('boulder', 'Boulder')}${choice('sport', 'Sport')}${choice('both', 'Both')}</div>
      </div>
      <div>
        <div class="section-label" style="margin-bottom:9px">Target grade</div>
        <div class="big-stepper">
          <button type="button" data-grade="-1">−</button>
          <div class="bs-val">${g[idx]}</div>
          <button type="button" data-grade="1">＋</button>
        </div>
      </div>
    </div>`;
  }

  function maxRow(label, sub, field, step, min) {
    return `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><div style="font:600 13px 'Archivo'">${label}</div><div style="font:400 10px 'Archivo';color:var(--muted)">${sub}</div></div>
      <div class="stepper" style="width:auto">
        <button type="button" data-max-step="-" data-field="${field}" data-step-amount="${step}" data-min="${min}">−</button>
        <input type="number" data-max-input="${field}" value="${state.draft[field]}" step="${step}" style="width:56px">
        <button type="button" data-max-step="+" data-field="${field}" data-step-amount="${step}">＋</button>
      </div>
    </div>`;
  }

  function s2Html() {
    return `<div style="display:flex;flex-direction:column;gap:18px;padding-top:6px">
      <div><div class="wiz-h">Your current maxes</div><div class="wiz-sub">We set your starting loads from these. Estimate if unsure.</div></div>
      <div style="display:flex;flex-direction:column;gap:13px">
        ${maxRow('Max-hang added load', 'kg · best 10s hang on 20mm', 'hangAddKg', 1, -30)}
        ${maxRow('1RM weighted pull-up', 'kg added', 'pullMaxKg', 1, -30)}
        ${maxRow('Bodyweight', 'kg', 'bodyKg', 1, 30)}
      </div>
    </div>`;
  }

  function calendarHtml() {
    const monthISO = state.calMonth;
    const year  = parseInt(monthISO.slice(0, 4), 10);
    const month = parseInt(monthISO.slice(5, 7), 10);
    const todayISO = toLocalISO(new Date());
    const selected = (state.schedMode === 'end-weeks' || (state.schedMode === 'start-end' && state.activeField === 'end'))
      ? state.endDate : state.startDate;

    // Band preview
    const d = derived();
    let bandStart = null, bandEnd = null;
    if (state.schedMode === 'start-weeks' && state.startDate) {
      bandStart = state.startDate; bandEnd = addDays(state.startDate, Program.cycleDays(state.draft.weeks) - 1);
    } else if (state.schedMode === 'end-weeks' && state.endDate) {
      bandStart = Program.computeStartFromComp(state.endDate, state.draft.weeks); bandEnd = state.endDate;
    } else if (state.schedMode === 'start-end' && state.startDate && state.endDate) {
      bandStart = state.startDate; bandEnd = state.endDate;
    }

    const offset = mondayDow(new Date(year, month - 1, 1));
    const cursor = new Date(year, month - 1, 1 - offset);
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const iso = toLocalISO(cursor);
      const isCurrentMonth = cursor.getMonth() === month - 1;
      let cls = 'dp-cell';
      if (iso === selected) cls += ' dp-selected';
      else if (bandStart && bandEnd && iso >= bandStart && iso <= bandEnd) cls += ' dp-in-band';
      if (iso === todayISO) cls += ' dp-today';
      if (!isCurrentMonth) cls += ' dp-other-month';
      cells += `<button type="button" class="${cls}" data-cal-date="${iso}">${cursor.getDate()}</button>`;
      cursor.setDate(cursor.getDate() + 1);
    }
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    return `<div class="card" style="padding:12px">
      <div class="dp-nav">
        <button data-cal-nav="-1">‹</button>
        <span>${monthName} ${year}</span>
        <button data-cal-nav="1">›</button>
      </div>
      <div class="dp-header">${['M','T','W','T','F','S','S'].map(h => `<div>${h}</div>`).join('')}</div>
      <div class="dp-grid">${cells}</div>
    </div>`;
  }

  function s3Html() {
    const d = derived();
    const mode = (val, label) =>
      `<div class="choice ${state.schedMode === val ? 'active' : ''}" data-schmode="${val}" role="button" tabindex="0">${label}</div>`;
    const showWeeks = state.schedMode !== 'start-end';
    const dateLabel = state.schedMode === 'start-weeks' ? 'Start date'
      : state.schedMode === 'end-weeks' ? 'Comp / end date' : '';
    const fieldToggle = state.schedMode === 'start-end'
      ? `<div class="choice-row" style="margin-bottom:9px">
          <div class="choice ${state.activeField === 'start' ? 'active' : ''}" data-activefield="start">Start${state.startDate ? ` · ${pretty(state.startDate).slice(0, 6)}` : ''}</div>
          <div class="choice ${state.activeField === 'end' ? 'active' : ''}" data-activefield="end">End${state.endDate ? ` · ${pretty(state.endDate).slice(0, 6)}` : ''}</div>
        </div>`
      : `<div class="section-label" style="margin-bottom:9px">${dateLabel}</div>`;

    return `<div style="display:flex;flex-direction:column;gap:18px;padding-top:6px">
      <div><div class="wiz-h">Schedule</div><div class="wiz-sub">Pick any two — the third is calculated for you.</div></div>
      <div class="card" style="padding:11px 13px">
        <div style="font:600 11px 'Archivo';color:var(--text2)">Sessions land on <b>Mon · Thu · Sat</b> — Tue light, Sun optional, Wed/Fri rest. The weekly layout is fixed by the program.</div>
      </div>
      <div>
        <div class="section-label" style="margin-bottom:9px">Peaking for</div>
        <div class="choice-row">
          <div class="choice ${state.peakType === 'comp' ? 'active' : ''}" data-peaktype="comp" role="button" tabindex="0">Comp</div>
          <div class="choice ${state.peakType === 'trip' ? 'active' : ''}" data-peaktype="trip" role="button" tabindex="0">Trip</div>
          <div class="choice ${state.peakType === 'project' ? 'active' : ''}" data-peaktype="project" role="button" tabindex="0">Project</div>
        </div>
        <div style="font:400 11px 'Archivo';color:var(--muted);margin-top:8px">Comp: 1-week taper + full rest before the day. Trip / project: 2-week taper riding the peak window.</div>
      </div>
      <div>
        <div class="section-label" style="margin-bottom:9px">I know my…</div>
        <div class="choice-stack">
          ${mode('start-weeks', 'Start date + Duration')}
          ${mode('start-end', 'Start date + Comp / end date')}
          ${mode('end-weeks', 'Comp / end date + Duration')}
        </div>
      </div>
      <div>
        ${fieldToggle}
        ${calendarHtml()}
      </div>
      ${showWeeks ? `<div>
        <div class="section-label" style="margin-bottom:9px">Duration</div>
        <div class="big-stepper">
          <button type="button" data-weeks="-1">−</button>
          <div><div class="bs-val">${state.draft.weeks}</div><div class="bs-unit">weeks</div></div>
          <button type="button" data-weeks="1">＋</button>
        </div>
      </div>` : ''}
      <div class="callout" style="margin-top:0">
        <span class="k">${d.derivedLabel}</span><span class="v">${d.derivedValue}</span>
      </div>
    </div>`;
  }

  function s4Html() {
    const d = derived();
    const g = grades();
    const grade = g[Math.min(state.gradeIdx, g.length - 1)];
    const focus = state.discipline === 'both' ? 'hybrid' : state.discipline;
    const start = d.anchorMode === 'startDate'
      ? d.startDate
      : (d.compDate ? Program.computeStartFromComp(d.compDate, d.weeks) : null);
    const end = d.anchorMode === 'compDate'
      ? d.compDate
      : (d.startDate ? addDays(d.startDate, Program.cycleDays(d.weeks) - 1) : null);
    const pullWork = Math.round(((state.draft.pullMaxKg ?? 0) * 0.55 + (state.draft.pullMaxKg ?? 0) * 0.70) / 2);
    const defaultName = `${focus.charAt(0).toUpperCase() + focus.slice(1)} ${d.weeks}wk`;

    return `<div style="display:flex;flex-direction:column;gap:16px;padding-top:6px">
      <div><div class="wiz-h">Review</div><div class="wiz-sub">You can change anything later.</div></div>
      <div class="field" style="margin:0">
        <label>Plan name</label>
        <input type="text" id="ob-name" value="${state.planName || defaultName}" autocomplete="off">
      </div>
      <div class="review-rows">
        <div class="rr"><span class="rk">Focus</span><span class="rv">${focus}</span></div>
        <div class="rr"><span class="rk">Target grade</span><span class="rv">${grade}</span></div>
        <div class="rr"><span class="rk">Training days</span><span class="rv">Mon · Thu · Sat (+Tue/Sun)</span></div>
        <div class="rr"><span class="rk">Length</span><span class="rv">${d.weeks} weeks</span></div>
        <div class="rr"><span class="rk">Peaking for</span><span class="rv">${state.peakType}</span></div>
        <div class="rr"><span class="rk">Starts</span><span class="rv">${pretty(start)}</span></div>
        <div class="rr"><span class="rk">${d.anchorMode === 'compDate' ? 'Comp / end' : 'Ends'}</span><span class="rv">${pretty(end)}</span></div>
      </div>
      <div class="card" style="background:linear-gradient(135deg,rgba(95,212,232,.078),rgba(95,212,232,.012));border-color:rgba(95,212,232,.2)">
        <div class="section-label" style="color:var(--accent);margin-bottom:10px">Starting loads from your maxes</div>
        <div style="display:flex;justify-content:space-between;font:600 13px 'Archivo';margin-bottom:7px"><span style="color:var(--text2)">Pull-up work load (Base)</span><span style="font-variant-numeric:tabular-nums">+${pullWork} kg</span></div>
        <div style="display:flex;justify-content:space-between;font:600 13px 'Archivo'"><span style="color:var(--text2)">Max-hang added</span><span style="font-variant-numeric:tabular-nums">+${state.draft.hangAddKg} kg</span></div>
      </div>
    </div>`;
  }

  // ── Frame ───────────────────────────────────────────────────────────────

  function render() {
    const bodies = [s0Html, s1Html, s2Html, s3Html, s4Html];
    const nextLabel = state.step === 0 ? "Let's go"
      : state.step === 4 ? 'Create plan' : 'Next';
    const dots = [0,1,2,3,4].map(i =>
      `<div class="wdot ${i <= state.step ? 'done' : ''}"></div>`).join('');

    overlay.innerHTML = `
      <div class="wizard-top">
        <button class="cancel" data-ob="cancel">Cancel</button>
        <div class="stepno">New plan · ${state.step + 1} / 5</div>
      </div>
      <div class="wizard-dots">${dots}</div>
      <div class="wizard-body">${bodies[state.step]()}</div>
      <div class="wizard-foot">
        ${state.step > 0 ? '<button class="ghost" data-ob="back">Back</button>' : ''}
        <button class="primary" data-ob="next" ${stepValid() ? '' : 'disabled style="opacity:.45"'}>${nextLabel}</button>
      </div>`;

    wire();
  }

  function wire() {
    overlay.querySelector('[data-ob="cancel"]')?.addEventListener('click', () => close(false));
    overlay.querySelector('[data-ob="back"]')?.addEventListener('click', () => { state.step--; render(); });
    overlay.querySelector('[data-ob="next"]')?.addEventListener('click', () => {
      if (!stepValid()) return;
      if (state.step === 4) { create(); return; }
      state.step++;
      render();
    });

    // s1
    overlay.querySelectorAll('[data-disc]').forEach(el => el.addEventListener('click', () => {
      state.discipline = el.dataset.disc;
      state.gradeIdx = Math.min(state.gradeIdx, grades().length - 1);
      render();
    }));
    overlay.querySelectorAll('[data-grade]').forEach(el => el.addEventListener('click', () => {
      state.gradeIdx = Math.max(0, Math.min(grades().length - 1, state.gradeIdx + parseInt(el.dataset.grade, 10)));
      render();
    }));

    // s2
    overlay.querySelectorAll('[data-max-step]').forEach(btn => btn.addEventListener('click', () => {
      const f = btn.dataset.field;
      const amount = parseFloat(btn.dataset.stepAmount);
      const dir = btn.dataset.maxStep === '+' ? 1 : -1;
      const min = btn.dataset.min != null ? parseFloat(btn.dataset.min) : -Infinity;
      state.draft[f] = Math.max(min, (Number(state.draft[f]) || 0) + dir * amount);
      const inp = overlay.querySelector(`[data-max-input="${f}"]`);
      if (inp) inp.value = state.draft[f];
    }));
    overlay.querySelectorAll('[data-max-input]').forEach(inp => inp.addEventListener('change', () => {
      const v = parseFloat(inp.value);
      if (Number.isFinite(v)) state.draft[inp.dataset.maxInput] = v;
    }));

    // s3
    overlay.querySelectorAll('[data-peaktype]').forEach(el => el.addEventListener('click', () => {
      state.peakType = el.dataset.peaktype;
      render();
    }));
    overlay.querySelectorAll('[data-schmode]').forEach(el => el.addEventListener('click', () => {
      state.schedMode = el.dataset.schmode;
      state.activeField = 'start';
      render();
    }));
    overlay.querySelectorAll('[data-activefield]').forEach(el => el.addEventListener('click', () => {
      state.activeField = el.dataset.activefield;
      render();
    }));
    overlay.querySelectorAll('[data-cal-nav]').forEach(btn => btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.calNav, 10);
      const [y, m] = state.calMonth.split('-').map(Number);
      let nm = m + delta, ny = y;
      if (nm > 12) { nm = 1; ny++; }
      if (nm < 1)  { nm = 12; ny--; }
      state.calMonth = `${ny}-${String(nm).padStart(2, '0')}-01`;
      render();
    }));
    overlay.querySelectorAll('[data-cal-date]').forEach(cell => cell.addEventListener('click', () => {
      const iso = cell.dataset.calDate;
      if (state.schedMode === 'start-weeks') state.startDate = iso;
      else if (state.schedMode === 'end-weeks') state.endDate = iso;
      else if (state.activeField === 'start') state.startDate = iso;
      else state.endDate = iso;
      render();
    }));
    overlay.querySelectorAll('[data-weeks]').forEach(btn => btn.addEventListener('click', () => {
      state.draft.weeks = Program.clampCycleWeeks(state.draft.weeks + parseInt(btn.dataset.weeks, 10));
      render();
    }));

    // s4
    overlay.querySelector('#ob-name')?.addEventListener('input', e => { state.planName = e.target.value; });
  }

  function create() {
    const d = derived();
    const focus = state.discipline === 'both' ? 'hybrid' : state.discipline;
    const g = grades();
    const grade = g[Math.min(state.gradeIdx, g.length - 1)];
    const name = (state.planName || overlay.querySelector('#ob-name')?.value || '').trim()
      || `${focus.charAt(0).toUpperCase() + focus.slice(1)} ${d.weeks}wk`;
    const usedColors = Storage.listPlans().map(p => p.color);
    const color = COLORS.find(c => !usedColors.includes(c)) || COLORS[0];

    const newId = Storage.addPlan({ name, focus, color });
    Storage.setPlanSettings(newId, {
      anchorMode: d.anchorMode,
      startDate: d.startDate,
      compDate: d.compDate,
      cycleWeeks: d.weeks,
      peakType: state.peakType,
    });
    // Benchmarks are global; target grade lands in the matching grade field(s).
    const benchPatch = {
      maxHang20mm: state.draft.hangAddKg,
      pullup1RM: state.draft.pullMaxKg,
      bodyweight: state.draft.bodyKg,
    };
    if (state.discipline === 'boulder' || state.discipline === 'both') benchPatch.boulderGrade = grade;
    if (state.discipline === 'sport') benchPatch.sportGrade = grade;
    if (state.discipline === 'both') benchPatch.sportGrade = Storage.get().benchmarks.sportGrade ?? null;
    Storage.setGlobalBenchmarks(benchPatch);
    Storage.setActivePlan(newId);

    flash('Plan created.');
    close(true);
  }

  render();
}
