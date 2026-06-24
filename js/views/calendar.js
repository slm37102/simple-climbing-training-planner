import { Storage } from '../storage.js';
import { Program } from '../program.js';
import { actualHasResult } from '../exercise-inputs.js';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function renderCalendar(root) {
  const plans = Storage.listPlans().filter(p => !p.archived);
  const activePlans = plans
    .map(p => ({ plan: p, start: Program.effectiveStart(p.settings) }))
    .filter(x => x.start);

  const todayD = new Date();
  const todayIso = isoDate(todayD);
  const todayYear  = todayD.getFullYear();
  const todayMonth = todayD.getMonth();
  let currentYear  = todayYear;
  let currentMonth = todayMonth;
  const savedMonth = sessionStorage.getItem('cycleCurrentMonth');
  if (savedMonth) {
    const parts = savedMonth.split('-');
    currentYear  = Number(parts[0]);
    currentMonth = Number(parts[1]) - 1;
  }

  function render() {
    sessionStorage.setItem('cycleCurrentMonth',
      `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);

    const activePlan = Storage.getActivePlan();
    root.innerHTML = `<div class="card"><h2>Cycle</h2>${summaryCardHtml(activePlan?.settings, activePlan?.days)}${buildMonthGrid()}</div>`;

    // Month navigation
    const prevM = root.querySelector('[data-month-nav="-1"]');
    const nextM = root.querySelector('[data-month-nav="1"]');
    const goToday = root.querySelector('[data-month-nav="today"]');
    if (prevM) prevM.addEventListener('click', () => {
      currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } render();
    });
    if (nextM) nextM.addEventListener('click', () => {
      currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } render();
    });
    if (goToday) goToday.addEventListener('click', () => {
      currentYear = todayYear; currentMonth = todayMonth; render();
    });

    // Cell clicks → detail panel
    root.querySelectorAll('[data-date]').forEach(cell => {
      cell.addEventListener('click', () => showDayPanel(cell.dataset.date));
    });
  }

  function buildMonthGrid() {
    if (activePlans.length === 0) {
      return `<p class="muted">Configure plans — set a cycle anchor in Plans first.</p>`;
    }

    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const lastOfMonth  = new Date(currentYear, currentMonth + 1, 0);
    const gridStart = findMonday(isoDate(firstOfMonth));
    const gridEnd   = findSunday(isoDate(lastOfMonth));
    const totalDays = daysBetween(gridStart, gridEnd) + 1;

    const monthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    const onCurrent  = currentYear === todayYear && currentMonth === todayMonth;
    const labelHtml = onCurrent
      ? `<span class="month-label">${monthLabel}</span>`
      : `<button class="month-label month-jump-today" data-month-nav="today" title="Jump to current month">${monthLabel}</button>`;

    const navHtml = `
      <div class="month-nav">
        <button data-month-nav="-1">◀</button>
        ${labelHtml}
        <button data-month-nav="1">▶</button>
      </div>
      ${onCurrent ? '' : '<div class="muted" style="text-align:center;font-size:.75rem;margin:0 0 4px">Tap month to jump back to today</div>'}`;

    const legendHtml = `
      <div class="phase-legend">
        <div class="phase-legend-item"><div class="phase-legend-dot phase-base"></div>Base</div>
        <div class="phase-legend-item"><div class="phase-legend-dot phase-build"></div>Build</div>
        <div class="phase-legend-item"><div class="phase-legend-dot phase-peak"></div>Peak</div>
        <div class="phase-legend-item"><div class="phase-legend-dot phase-taper"></div>Taper</div>
        <div class="phase-legend-item"><div class="phase-legend-dot phase-deload"></div>Deload</div>
      </div>`;

    const headersHtml = `
      <div class="cycle-day-header">
        ${DAY_HEADERS.map(h => `<div>${h}</div>`).join('')}
      </div>`;

    let cellsHtml = '';
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(gridStart, i);
      const d = new Date(date + 'T00:00:00');
      const isCurrentMonth = d.getMonth() === currentMonth;
      const isToday = date === todayIso;

      let phase = null;
      let deload = false;
      let isMain = false;
      let sessionLabel = '';
      let isComp = false;

      for (const { plan, start } of activePlans) {
        const ctx = Program.resolveDate(date, start, Program.cycleWeeksOf(plan.settings));
        if (!ctx || ctx.outOfCycle) continue;
        if (!phase) phase = ctx.phase;
        if (ctx.deload) deload = true;
        if (ctx.isMain && !isMain) {
          isMain = true;
          try {
            const session = Program.build(plan, date);
            if (session?.label) sessionLabel = session.label;
          } catch (_) { /* ignore */ }
        }
        if (plan.settings?.compDate === date) isComp = true;
      }

      const classes = ['cycle-cell'];
      if (phase) classes.push(phase);
      if (deload) classes.push('deload');
      if (isToday) classes.push('today');
      if (!isCurrentMonth) classes.push('out');

      const labelHtml = sessionLabel
        ? `<div class="cell-label">${sessionLabel}</div>` : '';
      const compIcon = isComp ? `<span class="comp-icon">🏆</span>` : '';

      let dotsHtml = '';
      if (activePlans.length >= 2) {
        const dots = activePlans
          .filter(({ plan, start }) => {
            const ctx = Program.resolveDate(date, start, Program.cycleWeeksOf(plan.settings));
            return ctx && !ctx.outOfCycle;
          })
          .map(({ plan }) =>
            `<span style="width:5px;height:5px;border-radius:50%;background:${plan.color};display:inline-block;flex-shrink:0"></span>`)
          .join('');
        if (dots) dotsHtml = `<div style="position:absolute;bottom:${isComp ? '14px' : '2px'};left:3px;right:3px;display:flex;flex-wrap:wrap;gap:2px">${dots}</div>`;
      }

      const ariaLabel = `${date}${phase ? ': ' + phase : ''}${sessionLabel ? ' — ' + sessionLabel : ''}`;
      cellsHtml += `<button type="button" class="${classes.join(' ')}" data-date="${date}" aria-label="${ariaLabel}">
        <span class="day-num">${d.getDate()}</span>
        ${labelHtml}
        ${dotsHtml}
        ${compIcon}
      </button>`;
    }

    return `${navHtml}${legendHtml}${headersHtml}
      <div class="cycle-month-grid">${cellsHtml}</div>
      <div id="dayPanel"></div>`;
  }

  function showDayPanel(date) {
    const panel = root.querySelector('#dayPanel');
    if (!panel) return;

    const entries = [];
    for (const { plan, start } of activePlans) {
      const ctx = Program.resolveDate(date, start, Program.cycleWeeksOf(plan.settings));
      if (!ctx || ctx.outOfCycle) continue;
      let session = null;
      try { session = Program.build(plan, date); } catch (_) { /* ignore */ }
      entries.push({ plan, ctx, session });
    }

    if (!entries.length) {
      panel.innerHTML = `<div class="day-panel"><p class="muted">${date} — not in any active plan cycle.</p></div>`;
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    let html = `<div class="day-panel"><h3>${date}</h3>`;
    for (const { plan, ctx, session } of entries) {
      const isComp = plan.settings?.compDate === date;
      const log = Storage.getDay(plan.id, date);

      html += `<div style="margin-top:8px;padding:8px;border-radius:6px;border-left:3px solid ${plan.color}">`;
      html += `<div style="font-weight:600;color:${plan.color}">${plan.name}</div>`;
      html += `<div style="margin-top:4px">`;
      html += `<span class="badge ${ctx.phase}">${ctx.phase}</span> `;
      if (ctx.deload) html += `<span class="badge deload">DELOAD</span> `;
      if (isComp) html += `<span class="badge">🏆 COMP</span> `;
      html += `<span class="muted" style="font-size:.8rem">Wk ${ctx.weekIdx}</span>`;
      html += `</div>`;
      if (session) {
        html += `<div style="margin-top:4px"><b>${session.label}</b></div>`;
        if (session.energySystem && session.energySystem !== '—') {
          html += `<div class="muted" style="font-size:.8rem">${session.energySystem}</div>`;
        }
        const exItems = (session.exercises || [])
          .map(ex => {
            const rpe = ex.rpeRange ? ` <span class="muted">RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}</span>` : '';
            return `<li>${ex.name}${rpe}</li>`;
          }).join('');
        if (exItems) html += `<ul style="margin:4px 0 0;padding-left:18px;font-size:.85rem">${exItems}</ul>`;
      }
      if (log) {
        html += `<div style="margin-top:4px;font-size:.8rem">`;
        if (log.status) html += `<span class="badge">${log.status}</span> `;
        if (log.notes) html += `<span class="muted">${log.notes}</span>`;
        html += `</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    panel.innerHTML = html;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  render();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function summaryCardHtml(settings, days = {}) {
  const startIso = Program.effectiveStart(settings);
  if (!startIso) {
    return `<div class="card" data-cycle-summary style="margin-bottom:12px">
      <div style="font-weight:600;margin-bottom:8px">Set up your cycle in Plans</div>
      <div class="muted">Choose a cycle start or competition date to track progress here.</div>
    </div>`;
  }

  const cycleWeeks = Program.cycleWeeksOf(settings);
  const totalDays  = Program.cycleDays(cycleWeeks);
  const pattern    = Program.buildPhasePattern(cycleWeeks);
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
    const ctx = Program.resolveDate(iso, startIso, cycleWeeks);
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

  return `<div class="card" data-cycle-summary style="margin-bottom:12px">
    <div style="font-weight:600;margin-bottom:4px">${title}</div>
    ${windowHtml}
    <div class="row" style="gap:16px;flex-wrap:wrap">
      <div><span class="muted">${statusLabel}</span><br><b>${statusValue}</b></div>
      <div><span class="muted">Best hang</span><br><b>${formatKg(bestHang)}</b></div>
      <div><span class="muted">Best pull</span><br><b>${formatKg(bestPull)}</b></div>
    </div>
  </div>`;
}


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

function findMonday(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return isoDate(d);
}

function findSunday(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? 0 : 7 - dow));
  return isoDate(d);
}
