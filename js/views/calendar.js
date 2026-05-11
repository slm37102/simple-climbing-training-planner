import { Storage } from '../storage.js';
import { Program } from '../program.js';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function renderCalendar(root) {
  const plans = Storage.listPlans().filter(p => !p.archived);
  const activePlan = Storage.getActivePlan();
  const activePlans = plans
    .map(p => ({ plan: p, start: Program.effectiveStart(p.settings) }))
    .filter(x => x.start);

  // View mode: 'month' | 'week'
  let mode = sessionStorage.getItem('cycleViewMode') || 'month';

  // Month navigation state
  const todayD = new Date();
  const todayIso = isoDate(todayD);
  let currentYear = todayD.getFullYear();
  let currentMonth = todayD.getMonth(); // 0-indexed
  const savedMonth = sessionStorage.getItem('cycleCurrentMonth');
  if (savedMonth) {
    const parts = savedMonth.split('-');
    currentYear = Number(parts[0]);
    currentMonth = Number(parts[1]) - 1;
  }

  // Week navigation state (Monday-anchored)
  let currentWeekStart = findMonday(todayIso);
  const savedWeek = sessionStorage.getItem('cycleCurrentWeekStart');
  if (savedWeek) currentWeekStart = savedWeek;

  function render() {
    sessionStorage.setItem('cycleViewMode', mode);
    sessionStorage.setItem('cycleCurrentMonth',
      `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
    sessionStorage.setItem('cycleCurrentWeekStart', currentWeekStart);

    const toggleHtml = `
      <div class="cycle-view-toggle">
        <button data-toggle="month" class="${mode === 'month' ? 'active' : ''}">Month</button>
        <button data-toggle="week" class="${mode === 'week' ? 'active' : ''}">Week</button>
      </div>`;

    const mainHtml = mode === 'month' ? buildMonthGrid() : buildWeekView();

    root.innerHTML = `<div class="card"><h2>Cycle</h2>${toggleHtml}${mainHtml}</div>`;

    // Toggle buttons
    root.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => { mode = btn.dataset.toggle; render(); });
    });

    // Month navigation
    const prevM = root.querySelector('[data-month-nav="-1"]');
    const nextM = root.querySelector('[data-month-nav="1"]');
    if (prevM) prevM.addEventListener('click', () => {
      currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } render();
    });
    if (nextM) nextM.addEventListener('click', () => {
      currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } render();
    });

    // Week navigation
    const prevW = root.querySelector('[data-week-nav="-7"]');
    const nextW = root.querySelector('[data-week-nav="7"]');
    if (prevW) prevW.addEventListener('click', () => {
      currentWeekStart = addDays(currentWeekStart, -7); render();
    });
    if (nextW) nextW.addEventListener('click', () => {
      currentWeekStart = addDays(currentWeekStart, 7); render();
    });

    // Month cell clicks → detail panel
    root.querySelectorAll('.cycle-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => showDayPanel(cell.dataset.date));
    });

    // Week day card clicks → navigate to #today if it's today
    root.querySelectorAll('[data-week-day]').forEach(card => {
      card.addEventListener('click', () => {
        if (card.dataset.weekDay === todayIso) location.hash = '#today';
      });
    });
  }

  // ── Month grid ──────────────────────────────────────────────────────────────

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

    const navHtml = `
      <div class="month-nav">
        <button data-month-nav="-1">◀</button>
        <span class="month-label">${monthLabel}</span>
        <button data-month-nav="1">▶</button>
      </div>`;

    const legendHtml = `
      <div class="phase-legend">
        <div class="phase-legend-item"><div class="phase-legend-dot" style="background:#1e3a2a"></div>Base</div>
        <div class="phase-legend-item"><div class="phase-legend-dot" style="background:#1e2a3a"></div>Build</div>
        <div class="phase-legend-item"><div class="phase-legend-dot" style="background:#3a1e2a"></div>Peak</div>
        <div class="phase-legend-item"><div class="phase-legend-dot" style="background:#3a3a1e"></div>Taper</div>
        <div class="phase-legend-item"><div class="phase-legend-dot" style="background:#ffffff18;border:1px solid #ffffff20"></div>Deload</div>
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

      // Resolve plan data for this date (use first matching active plan for phase)
      let phase = null;
      let deload = false;
      let isMain = false;
      let sessionLabel = '';
      let isComp = false;

      for (const { plan, start } of activePlans) {
        const ctx = Program.resolveDate(date, start);
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

      // Multi-plan dots (shown when 2+ plans)
      let dotsHtml = '';
      if (activePlans.length >= 2) {
        const dots = activePlans
          .filter(({ start }) => {
            const ctx = Program.resolveDate(date, start);
            return ctx && !ctx.outOfCycle;
          })
          .map(({ plan }) =>
            `<span style="width:5px;height:5px;border-radius:50%;background:${plan.color};display:inline-block;flex-shrink:0"></span>`)
          .join('');
        if (dots) dotsHtml = `<div style="position:absolute;bottom:${isComp ? '14px' : '2px'};left:3px;right:3px;display:flex;flex-wrap:wrap;gap:2px">${dots}</div>`;
      }

      cellsHtml += `<div class="${classes.join(' ')}" data-date="${date}">
        <span class="day-num">${d.getDate()}</span>
        ${labelHtml}
        ${dotsHtml}
        ${compIcon}
      </div>`;
    }

    return `${navHtml}${legendHtml}${headersHtml}
      <div class="cycle-month-grid">${cellsHtml}</div>
      <div id="dayPanel"></div>`;
  }

  // ── Week view ───────────────────────────────────────────────────────────────

  function buildWeekView() {
    if (!activePlan) {
      return `<p class="muted">Configure a plan first.</p>`;
    }
    const start = Program.effectiveStart(activePlan.settings);
    if (!start) {
      return `<p class="muted">Set a cycle anchor in <a onclick="location.hash='#plans'" style="cursor:pointer;color:var(--accent)">Plans</a> first.</p>`;
    }

    const weekEnd = addDays(currentWeekStart, 6);

    const cells = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(currentWeekStart, i);
      const ctx = Program.resolveDate(date, start);
      const log = Storage.getDay(activePlan.id, date);
      const session = ctx && !ctx.outOfCycle ? Program.build(activePlan, date) : null;
      cells.push({ date, ctx, session, log });
    }

    const navHtml = `
      <div class="month-nav">
        <button data-week-nav="-7">◀ Prev</button>
        <span class="month-label">${currentWeekStart} → ${weekEnd}</span>
        <button data-week-nav="7">Next ▶</button>
      </div>`;

    const planBadge = `
      <p class="muted" style="font-size:.8rem;margin:4px 0 8px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${activePlan.color}"></span>
        ${activePlan.name}
      </p>`;

    const cardsHtml = cells.map(({ date, ctx, session, log }) => {
      const dow = new Date(date + 'T00:00:00').getDay();
      const phase = ctx?.phase || '';
      const status = log?.status || '';
      const isToday = date === todayIso;
      const focusBadge = session?.focus && session.focus !== 'hybrid'
        ? `<span class="badge focus-${session.focus}" style="font-size:.65rem">${session.focus}</span>` : '';
      return `<div class="exercise" data-week-day="${date}"
          style="${isToday ? 'border-left:3px solid var(--accent);padding-left:8px;cursor:pointer' : 'cursor:default'}">
        <div class="row">
          <span class="badge ${phase}">${DAYS_SHORT[dow]} ${date.slice(5)}</span>
          ${ctx?.deload ? '<span class="badge deload">D</span>' : ''}
          ${focusBadge}
          ${status ? `<span class="badge">${status}</span>` : ''}
        </div>
        <div><b>${session?.label || '—'}</b></div>
        <div class="muted">${session?.energySystem || ''}</div>
      </div>`;
    }).join('');

    return `${navHtml}${planBadge}${cardsHtml}`;
  }

  // ── Detail panel (month mode cell click) ───────────────────────────────────

  function showDayPanel(date) {
    const panel = root.querySelector('#dayPanel');
    if (!panel) return;

    const entries = [];
    for (const { plan, start } of activePlans) {
      const ctx = Program.resolveDate(date, start);
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
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return isoDate(d);
}

function findSunday(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? 0 : 7 - dow));
  return isoDate(d);
}

// Returns "Plan Name — Week N" when exactly one plan owns the week; else "Week of YYYY-MM-DD".
function resolveWeekLabel(monIso, activePlans) {
  const planRefs = new Map();
  for (let d = 0; d < 7; d++) {
    const date = addDays(monIso, d);
    for (const { plan, start } of activePlans) {
      const ctx = Program.resolveDate(date, start);
      if (ctx && !ctx.outOfCycle) {
        planRefs.set(plan.id, { planName: plan.name, weekIdx: ctx.weekIdx });
      }
    }
  }
  if (planRefs.size === 0) return `Week of ${monIso}`;
  if (planRefs.size === 1) {
    const { planName, weekIdx } = [...planRefs.values()][0];
    return `${planName} — Week ${weekIdx}`;
  }
  return `Week of ${monIso}`;
}
