import { Storage } from '../storage.js';
import { Program } from '../program.js';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function dateAdd(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localIso(d);
}
function localIso(d) {
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function todayIso() { return localIso(new Date()); }

export function renderWeek(root) {
  const state = Storage.get();
  const start = state.settings.startDate;
  if (!start) { root.innerHTML = `<div class="card"><p>Set a cycle start date first.</p></div>`; return; }

  const today = todayIso();
  const ctx = Program.resolveDate(today, start);
  // Week starts Monday: find Monday of this week
  const d = new Date(today + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun
  const daysToMon = dow === 0 ? -6 : 1 - dow;
  const weekStart = dateAdd(today, daysToMon);

  const cells = [];
  for (let i = 0; i < 7; i++) {
    const date = dateAdd(weekStart, i);
    const c = Program.resolveDate(date, start);
    const log = Storage.getDay(date);
    const session = c && !c.outOfCycle ? Program.prescribeForContext(c) : null;
    cells.push({ date, ctx: c, session, log });
  }

  let body = `<div class="card"><h2>This week</h2>
    <p class="muted">${weekStart} → ${dateAdd(weekStart, 6)}</p>`;
  body += cells.map(({date, ctx, session, log}) => {
    const dow = new Date(date+'T00:00:00').getDay();
    const phase = ctx?.phase || '';
    const status = log?.status || '';
    const isToday = date === today;
    return `<div class="exercise" style="${isToday?'border-left:3px solid var(--accent);padding-left:8px':''}">
      <div class="row">
        <span class="badge ${phase}">${DAYS[dow]} ${date.slice(5)}</span>
        ${ctx?.deload ? '<span class="badge deload">D</span>' : ''}
        ${status ? `<span class="badge">${status}</span>` : ''}
      </div>
      <div><b>${session?.label || '—'}</b></div>
      <div class="muted">${session?.energySystem || ''}</div>
    </div>`;
  }).join('');
  body += `</div>`;

  root.innerHTML = body;
}
