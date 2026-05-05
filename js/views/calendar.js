import { Storage } from '../storage.js';
import { Program } from '../program.js';

export function renderCalendar(root) {
  const state = Storage.get();
  const start = Program.effectiveStart(state.settings);
  const compDate = state.settings.compDate;
  if (!start) { root.innerHTML = `<div class="card"><p>Set a cycle anchor in Benchmarks first.</p></div>`; return; }

  const anchorLabel = state.settings.anchorMode === 'compDate' && compDate
    ? `Cycle: ${start} → ${compDate} (peak)`
    : `Cycle starts ${start}`;

  let body = `<div class="card"><h2>12-week cycle</h2>
    <p class="muted">${anchorLabel}. Tap a day for details.</p>
    <div id="dayPanel"></div>`;

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
        date === today ? 'today' : '',
        date === compDate ? 'comp' : ''
      ].filter(Boolean).join(' ');
      body += `<div class="${cls}" data-date="${date}" title="${date} · ${ctx?.phase||''}${ctx?.deload?' deload':''}${date===compDate?' · COMP':''}">${date.slice(8)}</div>`;
    }
    body += `</div></div>`;
  }
  body += `</div>`;
  root.innerHTML = body;

  const panel = root.querySelector('#dayPanel');
  root.querySelectorAll('.cal-cell').forEach(c => c.addEventListener('click', () => {
    const date = c.dataset.date;
    const ctx = Program.resolveDate(date, start);
    if (!ctx || ctx.outOfCycle) return;
    const sess = Program.prescribeForContext(ctx);
    const exItems = (sess.exercises || []).map(ex => {
      const rpe = ex.rpeRange ? ` <span class="muted">RPE ${ex.rpeRange[0]}–${ex.rpeRange[1]}</span>` : '';
      return `<li>${ex.name}${rpe}</li>`;
    }).join('');
    panel.innerHTML = `<div class="day-panel">
      <h3>${date} · Wk ${ctx.weekIdx} <span class="badge ${ctx.phase}">${ctx.phase}</span>
        ${ctx.deload?'<span class="badge deload">DELOAD</span>':''}
        ${date===compDate?'<span class="badge">🏆 COMP</span>':''}
      </h3>
      <div><b>${sess.label}</b></div>
      <div class="muted">${sess.energySystem || ''}</div>
      ${exItems ? `<ul>${exItems}</ul>` : ''}
    </div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}
