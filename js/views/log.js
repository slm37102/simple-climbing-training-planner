import { Storage } from '../storage.js';
import { Program, PHASE_PATTERN } from '../program.js';

export function renderLog(root) {
  let activeTab = 'feed';
  let planFilter = 'all';
  let fromFilter = '';
  let toFilter = '';

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
      const planColor = plan.color || '#4f8cff';
      const phase     = e.phase  || '';
      const status    = e.status || '';

      const exRows = (e.exercises || []).map(x => {
        const actual = fmtActual(x.actual);
        if (!x.name && !actual) return '';
        return `<li class="muted" style="padding:2px 0">` +
          `<b style="color:var(--text)">${esc(x.name || '')}</b>` +
          (actual ? `<span>: ${esc(actual)}</span>` : '') +
          (x.notes ? `<span> — ${esc(x.notes)}</span>` : '') +
          `</li>`;
      }).filter(Boolean).join('');

      const statusStyle = status === 'completed' ? 'background:var(--good);color:#001'
                        : status === 'missed'    ? 'background:var(--bad);color:#fff'
                        : status === 'partial'   ? 'background:var(--warn);color:#001'
                        : '';

      return `<div class="card" style="padding:12px">
        <div class="row" style="margin-bottom:4px;gap:6px;flex-wrap:wrap">
          <b>${esc(date)}</b>
          <span style="width:8px;height:8px;border-radius:50%;background:${planColor};display:inline-block;flex-shrink:0"></span>
          <span class="muted" style="font-size:.8rem">${esc(plan.name)}</span>
          ${phase  ? `<span class="badge ${phase}">${esc(phase)}</span>` : ''}
          ${e.isDeload ? `<span class="badge deload">Deload</span>` : ''}
          ${status ? `<span class="badge" style="${statusStyle}">${esc(status)}</span>` : ''}
        </div>
        <div class="muted" style="font-size:.85rem;margin-bottom:4px">${esc(e.sessionId || '')}${e.label ? ` — ${esc(e.label)}` : ''}</div>
        <div class="muted" style="font-size:.8rem;margin-bottom:6px">
          Feel: ${feelStars(e.sessionFeel)}${fmtReadiness(e.readiness)}
        </div>
        ${exRows ? `<ul style="margin:4px 0;padding-left:16px">${exRows}</ul>` : ''}
        ${e.sessionNotes ? `<p class="muted" style="margin:6px 0 0;font-size:.85rem">${esc(e.sessionNotes)}</p>` : ''}
      </div>`;
    }).join('');
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
        const color    = plan.color || '#4f8cff';
        const hbPts = [], puPts = [];
        const rpeMap = {};

        for (const [date, entry] of Storage.listDays(plan.id)) {
          if (!startISO) continue;
          const ctx = Program.resolveDate(date, startISO);
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

      if (hbC) {
        const r = autoRange(hbSeries, 0, 50);
        drawLineChart(hbC, hbSeries, { title: 'Hangboard kg', ...r, xMax: 12 });
      }
      if (puC) {
        const r = autoRange(puSeries, 0, 50);
        drawLineChart(puC, puSeries, { title: 'Pull-up 1RM kg', ...r, xMax: 12 });
      }
      if (rC) {
        const r = autoRange(rpeSeries, 5, 10);
        drawLineChart(rC, rpeSeries, { title: 'Avg RPE', yMin: Math.max(0, r.yMin), yMax: Math.min(10, r.yMax), xMax: 12 });
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

    // Expected main sessions per phase (3 main days/week × weeks in phase)
    const phaseWeekCount = { base: 0, build: 0, peak: 0, taper: 0 };
    PHASE_PATTERN.forEach(p => { phaseWeekCount[p.phase]++; });
    const expectedSessions = {
      base:  phaseWeekCount.base  * 3,
      build: phaseWeekCount.build * 3,
      peak:  phaseWeekCount.peak  * 3,
      taper: phaseWeekCount.taper * 3,
    };
    const phaseRanges  = { base: 'Wk 1–6', build: 'Wk 7–9', peak: 'Wk 10–11', taper: 'Wk 12' };
    const phaseColors  = { base: 'var(--base)', build: 'var(--build)', peak: 'var(--peak)', taper: 'var(--taper)' };
    const PHASES       = ['base', 'build', 'peak', 'taper'];

    const html = plans.map(plan => {
      const startISO = Program.effectiveStart(plan.settings);
      const loggedByPhase = { base: 0, build: 0, peak: 0, taper: 0 };
      const rpeByPhase    = { base: [], build: [], peak: [], taper: [] };
      const setsByPhase   = { base: 0, build: 0, peak: 0, taper: 0 };

      for (const [date, entry] of Storage.listDays(plan.id)) {
        if (entry.status !== 'completed' && entry.status !== 'partial') continue;
        let ph = null;
        if (startISO) {
          const ctx = Program.resolveDate(date, startISO);
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
  [1, 4, 8, 12].forEach(w => {
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
