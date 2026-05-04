import { Storage } from '../storage.js';
import { Program } from '../program.js';

export function renderCalendar(root) {
  const state = Storage.get();
  const start = state.settings.startDate;
  if (!start) { root.innerHTML = `<div class="card"><p>Set a cycle start date first.</p></div>`; return; }

  let body = `<div class="card"><h2>12-week cycle</h2>
    <p class="muted">Cycle starts ${start}. Click a day to view it on Today.</p>`;

  // Build 12 rows × 7 columns
  const _td = new Date();
  const today = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
  for (let w = 0; w < 12; w++) {
    body += `<div style="margin-top:10px"><div class="muted">Week ${w+1}</div><div class="calendar">`;
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w*7 + d);
      const ctx = Program.resolveDate(date, start);
      const log = Storage.getDay(date);
      const cls = [
        'cal-cell',
        ctx?.phase || '',
        ctx?.deload ? 'deload' : '',
        ctx?.isRest ? 'rest' : '',
        log?.status === 'completed' ? 'completed' : '',
        log?.status === 'missed' ? 'missed' : '',
        date === today ? 'today' : ''
      ].filter(Boolean).join(' ');
      body += `<div class="${cls}" data-date="${date}" title="${date} · ${ctx?.phase||''}${ctx?.deload?' deload':''}">${date.slice(8)}</div>`;
    }
    body += `</div></div>`;
  }
  body += `</div>`;
  root.innerHTML = body;

  root.querySelectorAll('.cal-cell').forEach(c => c.addEventListener('click', () => {
    // Quick modal-ish: store target date, then jump to today view (which shows current date).
    // For simplicity: alert with prescription info.
    const date = c.dataset.date;
    const ctx = Program.resolveDate(date, state.settings.startDate);
    if (!ctx || ctx.outOfCycle) return;
    const sess = Program.prescribeForContext(ctx);
    alert(`${date} · Wk ${ctx.weekIdx} ${ctx.phase}${ctx.deload?' (DELOAD)':''}\n${sess.label}\n${sess.energySystem||''}`);
  }));
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}
