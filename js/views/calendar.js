// Cycle view — ASCENT "Macrocycle": the whole cycle as a month-grouped week grid,
// phase-tinted day cells, logged dots, comp marker, tap → day detail card.
import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { actualHasResult } from '../exercise-inputs.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function renderCalendar(root) {
  const activePlan = Storage.getActivePlan();
  const start = Program.effectiveStart(activePlan?.settings);
  let selectedIso = sessionStorage.getItem('cycleSelectedDay') || null;

  function render() {
    const header = `<div style="display:flex;align-items:flex-end;justify-content:space-between">
      <div class="screen-title">Macrocycle</div>
      ${start ? `<div style="font:700 12px 'Archivo';letter-spacing:.04em;text-transform:uppercase">${currentWeekLabel()}</div>` : ''}
    </div>`;

    if (!start) {
      root.innerHTML = header + `<div class="card"><h2>No cycle configured</h2>
        <p class="muted">Set a cycle start or competition date first.</p>
        <button class="primary" onclick="location.hash='#profile'">Go to Profile</button></div>`;
      return;
    }

    root.innerHTML = header
      + rangeBarHtml()
      + legendHtml()
      + summaryCardHtml(activePlan?.settings, activePlan?.days)
      + gridHtml()
      + `<div id="dayPanel">${selectedIso ? detailCardHtml(selectedIso) : ''}</div>`;

    root.querySelectorAll('[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        selectedIso = cell.dataset.date;
        sessionStorage.setItem('cycleSelectedDay', selectedIso);
        render();
        root.querySelector('#dayPanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
    root.querySelector('[data-open-today]')?.addEventListener('click', () => {
      sessionStorage.setItem('todaySelectedDate', selectedIso);
      location.hash = '#today';
    });
  }

  function currentWeekLabel() {
    const weeks = Program.cycleWeeksOf(activePlan.settings);
    const idx = daysBetween(start, isoDate(new Date()));
    const total = Program.cycleDays(weeks);
    if (idx < 0) return `Starts ${start}`;
    if (idx >= total) return 'Complete';
    return `Wk ${Math.floor(idx / 7) + 1} / ${weeks}`;
  }

  function rangeBarHtml() {
    const weeks = Program.cycleWeeksOf(activePlan.settings);
    const endIso = addDays(start, Program.cycleDays(weeks) - 1);
    return `<div class="cycle-range">
      <span>${pretty(start)}</span><span class="arrow">→</span><span>${pretty(endIso)}</span>
      <span class="len">${weeks} weeks</span>
    </div>`;
  }

  function legendHtml() {
    return `<div class="phase-legend">
      <div class="phase-legend-item"><div class="phase-legend-dot phase-base"></div>Base</div>
      <div class="phase-legend-item"><div class="phase-legend-dot phase-build"></div>Build</div>
      <div class="phase-legend-item"><div class="phase-legend-dot phase-peak"></div>Peak</div>
      <div class="phase-legend-item"><div class="phase-legend-dot phase-taper"></div>Taper</div>
      <div class="phase-legend-item"><div class="phase-legend-dot phase-deload"></div>Deload</div>
    </div>`;
  }

  function gridHtml() {
    const weeks = Program.cycleWeeksOf(activePlan.settings);
    const todayIso = isoDate(new Date());
    const days = activePlan?.days || {};
    const totalDays = weeks * 7;

    // One record per cycle day: Mon-based weekday column + training-week number
    // (training weeks are always 7-day blocks from the Monday-snapped cycle start).
    const dayRecords = [];
    for (let i = 0; i < totalDays; i++) {
      const iso = addDays(start, i);
      const d = new Date(iso + 'T00:00:00');
      dayRecords.push({ iso, d, dow: (d.getDay() + 6) % 7, trainingWeek: Math.floor(i / 7) + 1 });
    }

    // Group by calendar month first — a training week can straddle two months, and
    // each side needs to land in its own month's block rather than the row's month.
    const sections = [];
    let cur = null;
    for (const rec of dayRecords) {
      const key = `${rec.d.getFullYear()}-${rec.d.getMonth()}`;
      if (!cur || cur.key !== key) {
        cur = { key, label: `${MON_SHORT[rec.d.getMonth()]} ${rec.d.getFullYear()}`, days: [] };
        sections.push(cur);
      }
      cur.days.push(rec);
    }

    function cellHtml(rec) {
      const { iso, d } = rec;
      const ctx = Program.resolveDate(iso, start, weeks, activePlan.settings?.peakType);
      const classes = ['cyc-cell'];
      if (ctx && !ctx.outOfCycle) {
        classes.push(ctx.phase);
        if (ctx.deload) classes.push('deload');
        if (ctx.isRest) classes.push('rest');
      } else {
        classes.push('out');
      }
      if (iso === todayIso) classes.push('today');
      if (iso === selectedIso) classes.push('selected');

      const entry = days[iso];
      const logged = entry?.exercises?.some(ex => actualHasResult(ex?.actual));
      const missed = !logged && entry?.status === 'missed';
      const dot = logged ? '<span class="cdot"></span>' : missed ? '<span class="cdot missed"></span>' : '';
      const comp = activePlan.settings?.compDate === iso ? '<span class="comp-mark"></span>' : '';
      const aria = `${iso}${ctx && !ctx.outOfCycle ? ': ' + ctx.phase + (ctx.deload ? ', deload' : '') : ''}`;
      return `<button type="button" class="${classes.join(' ')}" data-date="${iso}" aria-label="${aria}">
          <span>${d.getDate()}</span>${dot}${comp}
        </button>`;
    }

    let html = `<div>
      <div class="wk-dowhead"><div class="rail"></div>
        <div class="days">${['M','T','W','T','F','S','S'].map(d => `<span>${d}</span>`).join('')}</div>
      </div>`;

    for (const sec of sections) {
      html += `<div class="wk-month"><div class="rail"></div>
        <div class="mlabel">${sec.label}</div><div class="mline"></div></div>`;

      // Leading blanks align the section's first real day to its weekday column;
      // trailing blanks complete the last row instead of borrowing next month's days.
      const rows = [];
      let row = new Array(sec.days[0].dow).fill(null);
      for (const rec of sec.days) {
        if (row.length === 7) { rows.push(row); row = []; }
        row.push(rec);
      }
      if (row.length) { while (row.length < 7) row.push(null); rows.push(row); }

      for (const cells of rows) {
        const railWeek = cells.find(Boolean)?.trainingWeek ?? '';
        html += `<div class="wk-row"><div class="rail">${railWeek}</div><div class="cells">`;
        html += cells.map(rec => rec ? cellHtml(rec) : '<div></div>').join('');
        html += `</div></div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  function detailCardHtml(iso) {
    const weeks = Program.cycleWeeksOf(activePlan.settings);
    const ctx = Program.resolveDate(iso, start, weeks, activePlan.settings?.peakType);
    if (!ctx || ctx.outOfCycle) {
      return `<div class="card detail-card"><p class="muted">${pretty(iso)} — outside the cycle window.</p></div>`;
    }
    let session = null;
    try { session = Program.build(activePlan, iso); } catch (_) { /* ignore */ }
    const log = Storage.getDay(activePlan.id, iso);
    const isComp = activePlan.settings?.compDate === iso;

    const items = (session?.exercises || []).map(ex => {
      const rpe = ex.rpeRange ? ` · RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}` : '';
      return `<div class="detail-item">${ex.name}${rpe}</div>`;
    }).join('');

    return `<div class="card detail-card">
      <div class="detail-head">
        <div class="section-label">${pretty(iso)} · Wk ${ctx.weekIdx}${ctx.deload ? ' · Deload' : ''}${isComp ? ' · 🏆 Comp' : ''}</div>
        <span class="badge ${ctx.phase}">${ctx.phase}</span>
      </div>
      <div class="detail-title">${session?.label || '—'}</div>
      ${session?.energySystem && session.energySystem !== '—' ? `<div class="muted" style="margin:-4px 0 8px">${session.energySystem}</div>` : ''}
      <div>${items}</div>
      ${log?.status ? `<div style="margin-top:10px"><span class="badge">${log.status}</span>${log.sessionNotes ? ` <span class="muted">${log.sessionNotes}</span>` : ''}</div>` : ''}
      <button class="mini-btn" data-open-today style="margin-top:13px">Open in Today</button>
    </div>`;
  }

  render();
}

// ── Cycle summary (kept for tests + at-a-glance week progress) ──────────────

function summaryCardHtml(settings, days = {}) {
  const startIso = Program.effectiveStart(settings);
  if (!startIso) {
    return `<div class="card" data-cycle-summary>
      <div style="font-weight:600;margin-bottom:8px">Set up your cycle in Profile</div>
      <div class="muted">Choose a cycle start or competition date to track progress here.</div>
    </div>`;
  }

  const cycleWeeks = Program.cycleWeeksOf(settings);
  const totalDays  = Program.cycleDays(cycleWeeks);
  const pattern    = Program.buildPhasePattern(cycleWeeks, settings?.peakType);
  const todayIso = isoDate(new Date());
  const rawDayIndex = daysBetween(startIso, todayIso);
  const clampedDayIndex = Math.max(0, Math.min(totalDays - 1, rawDayIndex));
  const weekIdx = Math.floor(clampedDayIndex / 7);
  const phaseInfo = pattern[weekIdx] || pattern[pattern.length - 1] || {};
  const weekStartIso = addDays(startIso, weekIdx * 7);
  const cycleEndIso = addDays(startIso, totalDays - 1);

  let scheduledSessions = 0;
  let loggedSessions = 0;
  let bestHang = null;
  let bestPull = null;

  for (let i = 0; i < 7; i++) {
    const iso = addDays(weekStartIso, i);
    const ctx = Program.resolveDate(iso, startIso, cycleWeeks, settings?.peakType);
    if (!ctx || ctx.outOfCycle || ctx.isRest) continue;
    scheduledSessions++;
    if (days[iso]?.exercises?.some(ex => actualHasResult(ex?.actual))) loggedSessions++;
  }

  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(startIso, i);
    const exercises = days[iso]?.exercises || [];
    for (const ex of exercises) {
      const kg = numericKg(ex?.actual?.kg);
      if (kg == null) continue;
      if (ex.kind === 'hangboard' || ex.kind === 'test') bestHang = bestHang == null ? kg : Math.max(bestHang, kg);
      if (ex.kind === 'pullup') bestPull = bestPull == null ? kg : Math.max(bestPull, kg);
    }
  }

  const phaseLabel = titleCase(phaseInfo.name || phaseInfo.phase || '');
  const inCycle = rawDayIndex >= 0 && rawDayIndex < totalDays;
  const title = inCycle
    ? `Week ${weekIdx + 1} of ${cycleWeeks} · ${phaseLabel}`
    : rawDayIndex < 0 ? 'Cycle not started' : 'Cycle complete';
  const statusLabel = inCycle ? 'This week' : rawDayIndex < 0 ? 'Starts' : 'Completed';
  const statusValue = inCycle
    ? `${loggedSessions} / ${scheduledSessions} sessions`
    : rawDayIndex < 0 ? startIso : cycleEndIso;
  const windowHtml = inCycle
    ? ''
    : `<div class="muted" style="margin-bottom:8px">${startIso} → ${cycleEndIso}</div>`;

  return `<div class="card" data-cycle-summary>
    <div style="font:700 13px 'Archivo';margin-bottom:6px">${title}</div>
    ${windowHtml}
    <div class="row" style="gap:20px;flex-wrap:wrap">
      <div><span class="muted">${statusLabel}</span><br><b>${statusValue}</b></div>
      <div><span class="muted">Best hang</span><br><b>${formatKg(bestHang)}</b></div>
      <div><span class="muted">Best pull</span><br><b>${formatKg(bestPull)}</b></div>
    </div>
  </div>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function numericKg(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatKg(value) {
  if (value == null) return '—';
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : String(rounded)} kg`;
}

function titleCase(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysBetween(isoA, isoB) {
  return Math.floor(
    (new Date(isoB + 'T00:00:00') - new Date(isoA + 'T00:00:00')) / 86400000
  );
}

function pretty(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${DOW_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()} ${MON_SHORT[d.getMonth()]}`;
}
