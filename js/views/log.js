import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { inputVisibility, repsLabel } from '../exercise-inputs.js';

export function renderLog(root) {
  let activeTab = 'feed';
  let planFilter = 'all';
  let fromFilter = '';
  let toFilter = '';
  let editingSet  = new Set(); // tracks "planId:date" keys with edit form open
  let expandedSet = new Set(); // tracks collapsed/expanded rows

  // ── helpers ──────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getFilteredPlans() {
    const all = Storage.listPlans();
    return planFilter === 'all' ? all : all.filter(p => p.id === planFilter);
  }

  function fmtActual(a) {
    if (!a) return '';
    if (typeof a === 'string') return a;
    const parts = [];
    if (a.done === true) parts.push('✓ done');
    if (a.sets != null && a.reps != null) parts.push(`${a.sets}×${a.reps}`);
    else if (a.reps != null) parts.push(`${a.reps}`);
    if (a.kg  != null) parts.push(`@ ${a.kg}kg`);
    if (a.rpe != null) parts.push(`RPE ${a.rpe}`);
    return parts.join(' ') || (a.raw || '');
  }

  function fmtReadiness(r) {
    if (!r || typeof r !== 'object') return '';
    const vals = Object.values(r).filter(v => typeof v === 'number');
    if (!vals.length) return '';
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return ` · Readiness ${avg.toFixed(1)}`;
  }

  function feelStars(feel) {
    if (feel == null) return '—';
    const n = Math.max(0, Math.min(5, parseInt(feel, 10)));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  // ISO → "Mon May 25" (or "Mon May 25, 2024" if not current year)
  const DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDateHuman(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    const base = `${DOW_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
    return d.getFullYear() === new Date().getFullYear() ? base : `${base}, ${d.getFullYear()}`;
  }

  // One-line summary of all kg-bearing exercises in the session
  function keyMetric(entry) {
    const parts = [];
    for (const ex of (entry.exercises || [])) {
      const a = ex.actual;
      if (!a || typeof a !== 'object') continue;
      if (a.kg != null) {
        const label = esc(ex.name || ex.kind);
        const rpe = a.rpe != null ? ` @${a.rpe}` : '';
        parts.push(`${label} ${a.kg}kg${rpe}`);
      }
    }
    if (parts.length) return parts.join(' · ');
    // fallback: first RPE
    for (const ex of (entry.exercises || [])) {
      const a = ex.actual;
      if (a && a.rpe != null) return `RPE ${a.rpe}`;
    }
    return '';
  }

  // ── header HTML (rendered once, kept alive) ───────────────────────────

  function buildHeaderHtml() {
    const plans = Storage.listPlans();
    const opts = plans.map(p =>
      `<option value="${esc(p.id)}"${planFilter === p.id ? ' selected' : ''}>${esc(p.name)}</option>`
    ).join('');
    const tab = t => `<button class="log-tab${activeTab === t ? ' active' : ''}" data-log-tab="${t}">${
      t.charAt(0).toUpperCase() + t.slice(1)}</button>`;
    return `
<div class="card">
  <div class="row" style="align-items:center;justify-content:space-between">
    <h2 style="margin:0">Log</h2>
    <select id="logPlanFilter" style="width:auto">
      <option value="all"${planFilter === 'all' ? ' selected' : ''}>All plans</option>
      ${opts}
    </select>
  </div>
  <div class="log-tabs" style="display:flex;gap:6px;margin-top:10px">
    ${tab('feed')}${tab('charts')}${tab('phases')}
  </div>
</div>
<div id="logContent"></div>`;
  }

  // ── Log entry edit form ───────────────────────────────────────────────

  function editFormHtml(date, entry, plan) {
    const key = plan.id + ':' + date;
    const status = entry.status || '';
    const feel   = entry.sessionFeel != null ? +entry.sessionFeel : null;
    const notes  = entry.sessionNotes || '';

    const statusBtn = (s, label, selBg, selColor) => {
      const sel = s === status;
      return `<button style="padding:4px 10px;border-radius:6px;border:none;cursor:pointer;font-size:.8rem;font-weight:600;background:${sel ? selBg : '#334155'};color:${sel ? selColor : '#94a3b8'}" data-edit-status="${s}"${sel ? ' data-selected="1"' : ''}>${label}</button>`;
    };

    const stars = [1,2,3,4,5].map(n => {
      const lit = feel != null && n <= feel;
      return `<button style="background:none;border:none;font-size:1.4rem;cursor:pointer;padding:2px;line-height:1;color:${lit ? '#f59e0b' : '#ffffff30'}" data-edit-feel="${n}">${lit ? '★' : '☆'}</button>`;
    }).join('');

    const exRows = (entry.exercises || []).map((x, i) => {
      const a = (x.actual && typeof x.actual === 'object') ? x.actual : {};
      const vis = inputVisibility(x);
      if (vis.none) {
        return `<div style="padding:6px 0;border-bottom:1px solid #ffffff0f">
          <div style="font-size:.8rem;color:var(--text);margin-bottom:4px;font-weight:600">${esc(x.name || 'Exercise ' + (i + 1))}</div>
          <label style="display:flex;flex-direction:column;gap:2px;font-size:.75rem;color:var(--muted)">Notes<input type="text" data-edit-ex="${i}" data-edit-ex-field="notes" value="${esc(x.notes || '')}" style="width:100%"></label>
        </div>`;
      }
      if (vis.optional) {
        return `<div style="padding:6px 0;border-bottom:1px solid #ffffff0f">
          <div style="font-size:.8rem;color:var(--text);margin-bottom:4px;font-weight:600">${esc(x.name || 'Exercise ' + (i + 1))}</div>
          <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
            <label style="display:flex;gap:6px;align-items:center;font-size:.8rem"><input type="checkbox" data-edit-ex="${i}" data-edit-ex-field="done"${a.done ? ' checked' : ''}> Done</label>
            <label style="display:flex;flex-direction:column;gap:2px;font-size:.75rem;color:var(--muted);flex:1;min-width:80px">Notes<input type="text" data-edit-ex="${i}" data-edit-ex-field="notes" value="${esc(x.notes || '')}" style="width:100%"></label>
          </div>
        </div>`;
      }
      return `<div style="padding:6px 0;border-bottom:1px solid #ffffff0f">
        <div style="font-size:.8rem;color:var(--text);margin-bottom:4px;font-weight:600">${esc(x.name || 'Exercise ' + (i + 1))}</div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          ${vis.kg   ? `<label style="display:flex;flex-direction:column;gap:2px;font-size:.75rem;color:var(--muted)">kg<input type="number" step="0.5" min="0" data-edit-ex="${i}" data-edit-ex-field="kg" value="${a.kg != null ? a.kg : ''}" style="width:60px"></label>` : ''}
          ${vis.sets ? `<label style="display:flex;flex-direction:column;gap:2px;font-size:.75rem;color:var(--muted)">Sets<input type="number" step="1" min="0" data-edit-ex="${i}" data-edit-ex-field="sets" value="${a.sets != null ? a.sets : ''}" style="width:52px"></label>` : ''}
          ${vis.reps ? `<label style="display:flex;flex-direction:column;gap:2px;font-size:.75rem;color:var(--muted)">${repsLabel(x)}<input type="number" step="1" min="0" data-edit-ex="${i}" data-edit-ex-field="reps" value="${a.reps != null ? a.reps : ''}" style="width:52px"></label>` : ''}
          ${vis.rpe  ? `<label style="display:flex;flex-direction:column;gap:2px;font-size:.75rem;color:var(--muted)">RPE<input type="number" step="0.5" min="1" max="10" data-edit-ex="${i}" data-edit-ex-field="rpe" value="${a.rpe != null ? a.rpe : ''}" style="width:52px"></label>` : ''}
          <label style="display:flex;flex-direction:column;gap:2px;font-size:.75rem;color:var(--muted);flex:1;min-width:80px">Notes<input type="text" data-edit-ex="${i}" data-edit-ex-field="notes" value="${esc(x.notes || '')}" style="width:100%"></label>
        </div>
      </div>`;
    }).join('');

    return `<div class="log-edit-form" data-edit-form="${key}" data-edit-feel-value="${feel != null ? feel : ''}" style="margin-top:10px;border-top:1px solid #ffffff20;padding-top:10px">
      <div class="row" style="gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:.8rem;color:var(--muted)">Status:</span>
        ${statusBtn('completed', 'Completed', '#22c55e', '#001')}
        ${statusBtn('missed',    'Missed',    '#ef4444', '#fff')}
        ${statusBtn('partial',   'Partial',   '#f59e0b', '#001')}
      </div>
      <div class="row" style="gap:4px;margin-bottom:8px;align-items:center">
        <span style="font-size:.8rem;color:var(--muted)">Feel:</span>${stars}
      </div>
      <textarea data-edit-field="notes" placeholder="Session notes…" style="width:100%;min-height:56px;resize:vertical;border-radius:6px;padding:8px;background:#1e293b;border:1px solid #334155;color:var(--text);font-family:inherit;font-size:.9rem;margin-bottom:8px;box-sizing:border-box">${esc(notes)}</textarea>
      ${exRows ? `<details style="margin-bottom:8px"><summary style="cursor:pointer;font-size:.8rem;color:var(--muted)">Edit exercise logs (${(entry.exercises || []).length})</summary>${exRows}</details>` : ''}
      <div class="row" style="gap:8px;justify-content:flex-end">
        <button class="ghost" data-edit-cancel="${key}" style="font-size:.85rem">Cancel</button>
        <button class="primary" data-edit-save="${key}" style="font-size:.85rem">Save</button>
      </div>
    </div>`;
  }

  function wireEditHandlers(el) {
    // Expand/collapse row on header tap
    el.querySelectorAll('[data-log-toggle]').forEach(hdr => {
      hdr.addEventListener('click', e => {
        // Don't toggle if user clicked inside (e.g. a button inside the header)
        if (e.target.closest('button')) return;
        const key = hdr.dataset.logToggle;
        expandedSet.has(key) ? expandedSet.delete(key) : expandedSet.add(key);
        renderFeedList();
      });
    });

    el.querySelectorAll('[data-edit-log]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.editLog;
        if (editingSet.has(key)) {
          editingSet.delete(key);
        } else {
          editingSet.add(key);
          expandedSet.add(key); // ensure row stays open when edit opens
        }
        renderFeedList();
      });
    });

    el.querySelectorAll('[data-edit-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = btn.closest('[data-edit-form]');
        if (!form) return;
        form.querySelectorAll('[data-edit-status]').forEach(b => {
          const s = b.dataset.editStatus;
          const isThis = b === btn;
          b.style.background = isThis ? (s === 'completed' ? '#22c55e' : s === 'missed' ? '#ef4444' : '#f59e0b') : '#334155';
          b.style.color      = isThis ? (s === 'missed' ? '#fff' : '#001') : '#94a3b8';
          if (isThis) b.dataset.selected = '1'; else delete b.dataset.selected;
        });
      });
    });

    el.querySelectorAll('[data-edit-feel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = btn.closest('[data-edit-form]');
        if (!form) return;
        const n = +btn.dataset.editFeel;
        form.dataset.editFeelValue = n;
        form.querySelectorAll('[data-edit-feel]').forEach(b => {
          const i = +b.dataset.editFeel;
          b.textContent = i <= n ? '★' : '☆';
          b.style.color = i <= n ? '#f59e0b' : '#ffffff30';
        });
      });
    });

    el.querySelectorAll('[data-edit-save]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.editSave;
        const colonIdx = key.indexOf(':');
        const planId = key.slice(0, colonIdx);
        const date   = key.slice(colonIdx + 1);
        const form   = el.querySelector(`[data-edit-form="${key}"]`);
        if (!form) return;

        const statusBtn  = form.querySelector('[data-edit-status][data-selected]');
        const status     = statusBtn?.dataset.editStatus || null;
        const feelRaw    = form.dataset.editFeelValue;
        const sessionFeel = feelRaw !== '' && feelRaw != null ? +feelRaw : null;
        const sessionNotes = form.querySelector('[data-edit-field="notes"]')?.value ?? '';

        const existing = Storage.getDay(planId, date);
        const exercises = (existing?.exercises || []).map((x, i) => {
          const kg    = form.querySelector(`[data-edit-ex="${i}"][data-edit-ex-field="kg"]`);
          const sets  = form.querySelector(`[data-edit-ex="${i}"][data-edit-ex-field="sets"]`);
          const reps  = form.querySelector(`[data-edit-ex="${i}"][data-edit-ex-field="reps"]`);
          const rpe   = form.querySelector(`[data-edit-ex="${i}"][data-edit-ex-field="rpe"]`);
          const done  = form.querySelector(`[data-edit-ex="${i}"][data-edit-ex-field="done"]`);
          const nts   = form.querySelector(`[data-edit-ex="${i}"][data-edit-ex-field="notes"]`);
          const prev  = (x.actual && typeof x.actual === 'object') ? x.actual : {};
          const actual = { ...prev };
          if (kg   && kg.value   !== '') actual.kg   = parseFloat(kg.value);
          if (sets && sets.value !== '') actual.sets = parseInt(sets.value, 10);
          if (reps && reps.value !== '') actual.reps = parseInt(reps.value, 10);
          if (rpe  && rpe.value  !== '') actual.rpe  = parseFloat(rpe.value);
          if (done) actual.done = done.checked;
          return { ...x, actual, notes: nts?.value ?? x.notes ?? '' };
        });

        const patch = { exercises, sessionNotes };
        if (status) patch.status = status;
        if (sessionFeel != null) patch.sessionFeel = sessionFeel;
        Storage.setDay(planId, date, patch);
        editingSet.delete(key);
        renderFeedList();
      });
    });

    el.querySelectorAll('[data-edit-cancel]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingSet.delete(btn.dataset.editCancel);
        renderFeedList();
      });
    });
  }

  // ── Tab 1: Feed ───────────────────────────────────────────────────────

  function renderFeedList() {
    const el = document.getElementById('feedList');
    if (!el) return;

    const plans = getFilteredPlans();
    let allDays = [];
    for (const plan of plans) {
      for (const [date, entry] of Storage.listDays(plan.id)) {
        allDays.push({ date, entry, plan });
      }
    }
    allDays.sort((a, b) => b.date.localeCompare(a.date));
    if (fromFilter) allDays = allDays.filter(d => d.date >= fromFilter);
    if (toFilter)   allDays = allDays.filter(d => d.date <= toFilter);

    if (!allDays.length) {
      el.innerHTML = '<p class="muted" style="padding:10px 0">No log entries found.</p>';
      return;
    }

    el.innerHTML = allDays.map(({ date, entry: e, plan }) => {
      const phase      = e.phase  || '';
      const status     = e.status || '';
      const key        = plan.id + ':' + date;
      const isEditing  = editingSet.has(key);
      const isExpanded = isEditing || expandedSet.has(key);
      const metric     = keyMetric(e);

      const statusDot = status === 'completed' ? '🟢'
                      : status === 'missed'    ? '🔴'
                      : status === 'partial'   ? '🟡'
                      : '';

      // Collapsed one-liner header (always shown)
      const header = `<div class="log-row-header" data-log-toggle="${key}" style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none">
        <b style="flex-shrink:0">${esc(fmtDateHuman(date))}</b>
        ${phase ? `<span class="badge ${phase}" style="flex-shrink:0">${esc(phase)}</span>` : ''}
        ${e.isDeload ? `<span class="badge deload" style="flex-shrink:0">Deload</span>` : ''}
        ${statusDot ? `<span style="flex-shrink:0">${statusDot}</span>` : ''}
        <span class="muted" style="font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${metric || esc(e.label || e.sessionId || '')}</span>
        <span style="flex-shrink:0;color:var(--muted);font-size:.8rem">${isExpanded ? '▾' : '▸'}</span>
      </div>`;

      if (!isExpanded) {
        return `<div class="card" style="padding:10px 12px">${header}</div>`;
      }

      // Expanded detail
      const exRows = (e.exercises || []).map(x => {
        const actual = fmtActual(x.actual);
        if (!x.name && !actual) return '';
        return `<li class="muted" style="padding:2px 0">` +
          `<b style="color:var(--text)">${esc(x.name || '')}</b>` +
          (actual ? `<span>: ${esc(actual)}</span>` : '') +
          (x.notes ? `<span> — ${esc(x.notes)}</span>` : '') +
          `</li>`;
      }).filter(Boolean).join('');

      return `<div class="card" style="padding:10px 12px">
        ${header}
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #ffffff10">
          <div class="muted" style="font-size:.8rem;margin-bottom:4px">
            ${e.sessionFeel != null ? `Feel ${feelStars(e.sessionFeel)}` : ''}${fmtReadiness(e.readiness)}
          </div>
          ${exRows ? `<ul style="margin:4px 0 6px;padding-left:16px">${exRows}</ul>` : ''}
          ${e.sessionNotes ? `<p class="muted" style="margin:4px 0;font-size:.85rem">${esc(e.sessionNotes)}</p>` : ''}
          <div style="margin-top:8px">
            <button style="background:none;border:1px solid #334155;border-radius:6px;color:var(--muted);cursor:pointer;font-size:.75rem;padding:4px 10px" data-edit-log="${key}">Edit</button>
          </div>
          ${isEditing ? editFormHtml(date, e, plan) : ''}
        </div>
      </div>`;
    }).join('');

    wireEditHandlers(el);
  }

  function renderFeed() {
    document.getElementById('logContent').innerHTML = `
      <div class="card">
        <div class="row">
          <label style="flex:1;margin:0">From<br>
            <input type="date" id="logFrom" value="${fromFilter}" style="margin-top:4px">
          </label>
          <label style="flex:1;margin:0">To<br>
            <input type="date" id="logTo" value="${toFilter}" style="margin-top:4px">
          </label>
        </div>
      </div>
      <div id="feedList"></div>`;

    document.getElementById('logFrom').addEventListener('change', e => {
      fromFilter = e.target.value; renderFeedList();
    });
    document.getElementById('logTo').addEventListener('change', e => {
      toFilter = e.target.value; renderFeedList();
    });

    renderFeedList();
  }

  // ── Tab 2: Charts ─────────────────────────────────────────────────────

  function renderCharts() {
    document.getElementById('logContent').innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px">Hangboard Max Load (kg)</h3>
        <canvas id="chartHangboard" style="width:100%;max-width:400px;height:160px"></canvas>
      </div>
      <div class="card">
        <h3 style="margin:0 0 10px">Pull-up 1RM Load (kg)</h3>
        <canvas id="chartPullup" style="width:100%;max-width:400px;height:160px"></canvas>
      </div>
      <div class="card">
        <h3 style="margin:0 0 10px">Average RPE by Week</h3>
        <canvas id="chartRpe" style="width:100%;max-width:400px;height:160px"></canvas>
      </div>`;

    requestAnimationFrame(() => {
      const plans = getFilteredPlans();
      const hbSeries = [], puSeries = [], rpeSeries = [];

      for (const plan of plans) {
        const startISO = Program.effectiveStart(plan.settings);
        const cycleWeeks = Program.cycleWeeksOf(plan.settings);
        const color    = plan.color || '#4f8cff';
        const hbPts = [], puPts = [];
        const rpeMap = {};

        for (const [date, entry] of Storage.listDays(plan.id)) {
          if (!startISO) continue;
          const ctx = Program.resolveDate(date, startISO, cycleWeeks);
          if (!ctx || ctx.outOfCycle) continue;
          const w = ctx.weekIdx;

          for (const ex of (entry.exercises || [])) {
            const a = ex.actual;
            if (!a || typeof a !== 'object') continue;
            if (ex.kind === 'hangboard' && a.kg != null) hbPts.push({ x: w, y: a.kg });
            if (ex.kind === 'pullup'    && a.kg != null) puPts.push({ x: w, y: a.kg });
            if (a.rpe != null) { (rpeMap[w] = rpeMap[w] || []).push(a.rpe); }
          }
        }

        const rpePts = Object.entries(rpeMap).map(([w, arr]) =>
          ({ x: +w, y: arr.reduce((s, v) => s + v, 0) / arr.length }));

        hbSeries.push({ label: plan.name, color, points: hbPts });
        puSeries.push({ label: plan.name, color, points: puPts });
        rpeSeries.push({ label: plan.name, color, points: rpePts });
      }

      function autoRange(series, defMin, defMax) {
        const all = series.flatMap(s => s.points.map(p => p.y));
        if (!all.length) return { yMin: defMin, yMax: defMax };
        return { yMin: Math.max(0, Math.min(...all) - 5), yMax: Math.max(...all) + 5 };
      }

      function initCanvas(id) {
        const c = document.getElementById(id);
        if (!c) return null;
        c.width  = c.offsetWidth || 400;
        c.height = 160;
        return c;
      }

      const hbC = initCanvas('chartHangboard');
      const puC = initCanvas('chartPullup');
      const rC  = initCanvas('chartRpe');

      // Use the largest cycle length across plans for the chart x-axis.
      const xMax = Math.max(...plans.map(p => Program.cycleWeeksOf(p.settings)), Program.DEFAULT_CYCLE_WEEKS);

      if (hbC) {
        const r = autoRange(hbSeries, 0, 50);
        drawLineChart(hbC, hbSeries, { title: 'Hangboard kg', ...r, xMax });
      }
      if (puC) {
        const r = autoRange(puSeries, 0, 50);
        drawLineChart(puC, puSeries, { title: 'Pull-up 1RM kg', ...r, xMax });
      }
      if (rC) {
        const r = autoRange(rpeSeries, 5, 10);
        drawLineChart(rC, rpeSeries, { title: 'Avg RPE', yMin: Math.max(0, r.yMin), yMax: Math.min(10, r.yMax), xMax });
      }
    });
  }

  // ── Tab 3: Phases ─────────────────────────────────────────────────────

  function renderPhases() {
    const plans = getFilteredPlans();
    if (!plans.length) {
      document.getElementById('logContent').innerHTML =
        '<p class="muted" style="padding:10px 0">No plans found.</p>';
      return;
    }

    const phaseColors  = { base: 'var(--base)', build: 'var(--build)', peak: 'var(--peak)', taper: 'var(--taper)' };
    const PHASES       = ['base', 'build', 'peak', 'taper'];

    // Derive per-phase week ranges from a pattern array (handles double-block).
    function rangesFromPattern(pattern) {
      const ranges = { base: [], build: [], peak: [], taper: [] };
      let i = 0;
      while (i < pattern.length) {
        const ph = pattern[i].phase;
        let j = i;
        while (j < pattern.length && pattern[j].phase === ph) j++;
        ranges[ph].push([i + 1, j]); // 1-indexed week numbers
        i = j;
      }
      const fmt = (arr) => arr.length
        ? arr.map(([a, b]) => a === b ? `Wk ${a}` : `Wk ${a}–${b}`).join(' · ')
        : '—';
      return { base: fmt(ranges.base), build: fmt(ranges.build), peak: fmt(ranges.peak), taper: fmt(ranges.taper) };
    }

    const html = plans.map(plan => {
      const startISO = Program.effectiveStart(plan.settings);
      const cycleWeeks = Program.cycleWeeksOf(plan.settings);
      const pattern = Program.buildPhasePattern(cycleWeeks);

      // Expected main sessions per phase (3 main days/week × weeks in phase) — per-plan.
      const phaseWeekCount = { base: 0, build: 0, peak: 0, taper: 0 };
      pattern.forEach(p => { phaseWeekCount[p.phase]++; });
      const expectedSessions = {
        base:  phaseWeekCount.base  * 3,
        build: phaseWeekCount.build * 3,
        peak:  phaseWeekCount.peak  * 3,
        taper: phaseWeekCount.taper * 3,
      };
      const phaseRanges = rangesFromPattern(pattern);

      const loggedByPhase = { base: 0, build: 0, peak: 0, taper: 0 };
      const rpeByPhase    = { base: [], build: [], peak: [], taper: [] };
      const setsByPhase   = { base: 0, build: 0, peak: 0, taper: 0 };

      for (const [date, entry] of Storage.listDays(plan.id)) {
        if (entry.status !== 'completed' && entry.status !== 'partial') continue;
        let ph = null;
        if (startISO) {
          const ctx = Program.resolveDate(date, startISO, cycleWeeks);
          if (ctx && !ctx.outOfCycle) ph = ctx.phase;
        } else if (entry.phase && Object.prototype.hasOwnProperty.call(loggedByPhase, entry.phase)) {
          ph = entry.phase;
        }
        if (!ph) continue;
        loggedByPhase[ph]++;
        for (const ex of (entry.exercises || [])) {
          const a = ex.actual;
          if (a && typeof a === 'object') {
            if (a.rpe  != null) rpeByPhase[ph].push(a.rpe);
            if (a.sets != null) setsByPhase[ph] += a.sets;
          }
        }
      }

      const phaseRows = PHASES.map(ph => {
        const logged   = loggedByPhase[ph];
        const expected = expectedSessions[ph];
        const pct      = expected ? Math.min(100, Math.round((logged / expected) * 100)) : 0;
        const rpes     = rpeByPhase[ph];
        const avgRpe   = rpes.length
          ? (rpes.reduce((s, v) => s + v, 0) / rpes.length).toFixed(1)
          : '—';
        const sets  = setsByPhase[ph];
        const label = ph.charAt(0).toUpperCase() + ph.slice(1);

        return `<div style="margin-bottom:12px">
          <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span class="badge ${ph}" style="min-width:54px;text-align:center">${label}</span>
            <span class="muted" style="font-size:.8rem;min-width:68px">${phaseRanges[ph]}</span>
            <span class="muted" style="font-size:.8rem">${logged}/${expected} sessions</span>
            <span class="muted" style="font-size:.8rem">Avg RPE: ${avgRpe}</span>
            ${sets > 0 ? `<span class="muted" style="font-size:.8rem">Vol: ${sets} sets</span>` : ''}
          </div>
          <div style="background:#ffffff10;border-radius:6px;height:10px;overflow:hidden">
            <div class="phase-bar" style="width:${pct}%;height:100%;background:${phaseColors[ph]};border-radius:6px"></div>
          </div>
        </div>`;
      }).join('');

      return `<div class="card">
        <div class="row" style="margin-bottom:10px;gap:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${plan.color || '#4f8cff'};flex-shrink:0;display:inline-block"></span>
          <b>${esc(plan.name)}</b>
        </div>
        ${phaseRows}
      </div>`;
    }).join('');

    document.getElementById('logContent').innerHTML = html;
  }

  // ── Routing ──────────────────────────────────────────────────────────

  function renderContent() {
    if      (activeTab === 'feed')   renderFeed();
    else if (activeTab === 'charts') renderCharts();
    else if (activeTab === 'phases') renderPhases();
  }

  // ── Bootstrap ────────────────────────────────────────────────────────

  root.innerHTML = buildHeaderHtml();

  document.getElementById('logPlanFilter')?.addEventListener('change', e => {
    planFilter = e.target.value;
    renderContent();
  });

  document.querySelectorAll('[data-log-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.logTab;
      document.querySelectorAll('[data-log-tab]').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      renderContent();
    });
  });

  renderContent();
}

// ── Canvas chart helper ───────────────────────────────────────────────────

function drawLineChart(canvas, seriesList, opts) {
  const W = canvas.width, H = canvas.height;
  const pad = { top: 24, right: 12, bottom: 28, left: 36 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top  - pad.bottom;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#e2e8f0'; ctx.font = '11px system-ui';
  ctx.fillText(opts.title, pad.left, 16);

  // Axes
  ctx.strokeStyle = '#ffffff20'; ctx.lineWidth = 1;
  ctx.strokeRect(pad.left, pad.top, cw, ch);

  // X-axis week labels
  ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui';
  [0, 1, 2, 3].map(i => Math.round(1 + i * (opts.xMax - 1) / 3)).forEach(w => {
    const x = pad.left + ((w - 1) / (opts.xMax - 1)) * cw;
    ctx.fillText('W' + w, x - 6, H - 6);
  });

  seriesList.forEach(series => {
    if (!series.points.length) return;
    const pts = series.points.slice().sort((a, b) => a.x - b.x);
    const toXY = p => ({
      x: pad.left + ((p.x - 1) / (opts.xMax - 1)) * cw,
      y: pad.top  + ch - ((p.y - opts.yMin) / (opts.yMax - opts.yMin + 0.001)) * ch
    });

    // Line
    ctx.strokeStyle = series.color; ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const { x, y } = toXY(p);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    ctx.fillStyle = series.color;
    pts.forEach(p => {
      const { x, y } = toXY(p);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    });
  });
}
