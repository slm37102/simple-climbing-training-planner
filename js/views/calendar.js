import { Storage } from '../storage.js';
import { Program } from '../program.js';

export function renderCalendar(root) {
  const plans = Storage.listPlans().filter(p => !p.archived);
  const activePlan = Storage.getActivePlan();

  // Resolve effective start for each plan
  const activePlans = plans
    .map(p => ({ plan: p, start: Program.effectiveStart(p.settings) }))
    .filter(x => x.start);

  if (activePlans.length === 0) {
    root.innerHTML = `<div class="card"><p>Configure plans — set a cycle anchor in Benchmarks first.</p></div>`;
    return;
  }

  // Union date range across all plans (each cycle is 84 days)
  let earliest = activePlans[0].start;
  let latest = addDays(activePlans[0].start, 83);
  for (const { start } of activePlans) {
    if (start < earliest) earliest = start;
    const end = addDays(start, 83);
    if (end > latest) latest = end;
  }

  const todayIso = isoDate(new Date());

  // Build dateInfo map: date → [{plan, ctx, session}]
  const dateInfo = {};
  const totalDays = Math.min(daysBetween(earliest, latest) + 1, 730);
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(earliest, i);
    const entries = [];
    for (const { plan, start } of activePlans) {
      const ctx = Program.resolveDate(date, start);
      if (!ctx || ctx.outOfCycle) continue;
      const session = Program.prescribeForContext(ctx, plan.focus || 'hybrid');
      entries.push({ plan, ctx, session });
    }
    if (entries.length) dateInfo[date] = entries;
  }

  // Expand to full Mon–Sun week boundaries
  const weekStart = findMonday(earliest);
  const weekEnd = findSunday(latest);

  // Legend
  let legendHtml = `<div class="plan-legend">`;
  for (const { plan } of activePlans) {
    legendHtml += `<div class="plan-legend-item">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${plan.color}"></span>
      <span>${plan.name}</span>
    </div>`;
  }
  legendHtml += `</div>`;

  // Build week rows
  let weeksHtml = '';
  let cur = weekStart;
  while (cur <= weekEnd) {
    const label = resolveWeekLabel(cur, activePlans);
    weeksHtml += `<div style="margin-top:10px">
      <div class="muted" style="font-size:.75rem;margin-bottom:4px">${label}</div>
      <div class="calendar">`;

    for (let d = 0; d < 7; d++) {
      const date = addDays(cur, d);
      const entries = dateInfo[date] || [];
      const activeLog = activePlan ? Storage.getDay(activePlan.id, date) : null;

      const isToday = date === todayIso;
      const compPlans = activePlans.filter(({ plan }) => plan.settings.compDate === date);
      const isCompleted = activeLog?.status === 'completed';
      const isMissed = activeLog?.status === 'missed';

      const cls = [
        'cal-cell',
        isCompleted ? 'completed' : '',
        isMissed ? 'missed' : '',
        isToday ? 'today' : '',
        compPlans.length ? 'comp' : ''
      ].filter(Boolean).join(' ');

      // Phase dots: filled = main session, hollow = in-cycle non-main
      let dotsHtml = '';
      for (const { plan, ctx } of entries) {
        if (ctx.isMain) {
          dotsHtml += `<span class="plan-dot" style="background:${plan.color}" title="${plan.name}: ${ctx.phase}${ctx.deload ? ' deload' : ''}"></span>`;
        } else {
          dotsHtml += `<span class="plan-dot" style="background:transparent;border:1.5px solid ${plan.color};box-sizing:border-box" title="${plan.name}: ${ctx.isRest ? 'rest' : 'light'}"></span>`;
        }
      }

      const compTitle = compPlans.map(({ plan }) => plan.name).join(', ');
      const cellTitle = [date, compTitle ? `COMP: ${compTitle}` : ''].filter(Boolean).join(' · ');

      weeksHtml += `<div class="${cls}" data-date="${date}" title="${cellTitle}">
        <span style="line-height:1">${date.slice(8)}</span>
        ${dotsHtml ? `<div style="position:absolute;bottom:2px;left:0;right:0;display:flex;flex-wrap:wrap;justify-content:center;gap:1px">${dotsHtml}</div>` : ''}
      </div>`;
    }

    weeksHtml += `</div></div>`;
    cur = addDays(cur, 7);
  }

  root.innerHTML = `
    <style>
      .plan-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 1px}
      .plan-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
      .plan-legend-item{display:flex;align-items:center;gap:6px;font-size:.8rem}
      .cal-cell.today{border:2px solid var(--accent)!important}
    </style>
    <div class="card">
      <h2>Training Calendar</h2>
      ${legendHtml}
      <div id="dayPanel"></div>
      ${weeksHtml}
    </div>`;

  // Wire click handlers
  const panel = root.querySelector('#dayPanel');
  root.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      const entries = dateInfo[date] || [];

      if (!entries.length) {
        panel.innerHTML = `<div class="day-panel"><p class="muted">${date} — not in any active plan cycle.</p></div>`;
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      let html = `<div class="day-panel"><h3>${date}</h3>`;
      for (const { plan, ctx, session } of entries) {
        const isComp = plan.settings.compDate === date;
        const log = Storage.getDay(plan.id, date);

        html += `<div style="margin-top:8px;padding:8px;border-radius:6px;border-left:3px solid ${plan.color}">`;
        html += `<div style="font-weight:600;color:${plan.color}">${plan.name}</div>`;
        html += `<div style="margin-top:4px">`;
        html += `<span class="badge ${ctx.phase}">${ctx.phase}</span> `;
        if (ctx.deload) html += `<span class="badge deload">DELOAD</span> `;
        if (isComp) html += `<span class="badge">🏆 COMP</span> `;
        html += `<span class="muted" style="font-size:.8rem">Wk ${ctx.weekIdx}</span>`;
        html += `</div>`;
        html += `<div style="margin-top:4px"><b>${session.label}</b></div>`;
        if (session.energySystem && session.energySystem !== '—') {
          html += `<div class="muted" style="font-size:.8rem">${session.energySystem}</div>`;
        }

        const exItems = (session.exercises || [])
          .map(ex => {
            const rpe = ex.rpeRange ? ` <span class="muted">RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}</span>` : '';
            return `<li>${ex.name}${rpe}</li>`;
          })
          .join('');
        if (exItems) html += `<ul style="margin:4px 0 0;padding-left:18px;font-size:.85rem">${exItems}</ul>`;

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
    });
  });
}

// ---- Helpers ----

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
  const planRefs = new Map(); // planId → {planName, weekIdx}
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
