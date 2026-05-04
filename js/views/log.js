import { Storage } from '../storage.js';

export function renderLog(root) {
  const days = Storage.listDays().reverse();
  let body = `<div class="card"><h2>Log</h2>
    <div class="row"><label style="flex:1">From <input type="date" id="logFrom"></label>
    <label style="flex:1">To <input type="date" id="logTo"></label></div>
    <div id="logList"></div></div>`;
  root.innerHTML = body;

  const renderList = () => {
    const from = document.getElementById('logFrom').value;
    const to   = document.getElementById('logTo').value;
    const list = days.filter(([d]) => (!from || d >= from) && (!to || d <= to));
    document.getElementById('logList').innerHTML = list.map(([d, e]) => {
      const phase = e.phase || '';
      const status = e.status || '';
      const ex = (e.exercises||[]).map(x => `<li>${x.name}: ${x.actual||'—'}${x.notes?` <span class="muted">(${x.notes})</span>`:''}</li>`).join('');
      return `<div class="exercise">
        <div class="row"><b>${d}</b> <span class="badge ${phase}">${phase}</span>
          ${e.isDeload?'<span class="badge deload">D</span>':''}
          <span class="badge">${status}</span>
          <span class="muted">feel ${e.sessionFeel ?? '—'}/5</span></div>
        <div class="muted">${e.sessionId || ''}</div>
        ${ex ? `<ul>${ex}</ul>` : ''}
        ${e.sessionNotes ? `<p class="muted">${e.sessionNotes}</p>` : ''}
      </div>`;
    }).join('') || '<p class="muted">No entries.</p>';
  };

  document.getElementById('logFrom').addEventListener('change', renderList);
  document.getElementById('logTo').addEventListener('change', renderList);
  renderList();
}
