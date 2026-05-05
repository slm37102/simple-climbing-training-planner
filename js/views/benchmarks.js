import { Storage } from '../storage.js';
import { Program } from '../program.js';

export function renderBenchmarks(root) {
  const { benchmarks, settings } = Storage.get();
  const anchorMode = settings.anchorMode || 'startDate';

  const f = (k, label, hint) =>
    `<div class="field"><label>${label}</label>
      <input type="number" id="bm-${k}" step="0.5" inputmode="decimal" value="${benchmarks[k] ?? ''}">
      ${hint ? `<div class="muted" style="font-size:.75rem;margin-top:2px">${hint}</div>` : ''}
    </div>`;

  let body = `<div class="card"><h2>Cycle anchor</h2>
    <p class="muted">Choose how the 12-week cycle is positioned in time.</p>
    <div class="radio-group" style="margin-bottom:10px">
      <label><input type="radio" name="anchorMode" value="startDate" ${anchorMode==='startDate'?'checked':''}> Start on a date</label>
      <label><input type="radio" name="anchorMode" value="compDate" ${anchorMode==='compDate'?'checked':''}> Peak on a comp / send date</label>
    </div>
    <div class="field" data-anchor-pane="startDate" style="${anchorMode==='startDate'?'':'display:none'}">
      <label>Cycle start date <span class="muted">(Monday recommended)</span></label>
      <input type="date" id="bm-startDate" value="${settings.startDate ?? ''}">
    </div>
    <div class="field" data-anchor-pane="compDate" style="${anchorMode==='compDate'?'':'display:none'}">
      <label>Competition / send date <span class="muted">(cycle ends here)</span></label>
      <input type="date" id="bm-compDate" value="${settings.compDate ?? ''}">
      <div class="muted" style="font-size:.78rem;margin-top:4px" id="bm-compHint"></div>
    </div>
  </div>

  <div class="card"><h2>Benchmarks</h2>
    <p class="muted">Used to calculate prescribed loads. Update after every retest.</p>
    ${f('bodyweight','Bodyweight (kg)')}
    ${f('maxHang20mm','Max 10s hang on 20mm edge — added kg', 'Negative if you assist with bands.')}
    ${f('pullup1RM','1RM weighted pull-up — added kg')}
    <div class="field"><label>Sport redpoint grade</label>
      <input type="text" id="bm-sportGrade" value="${benchmarks.sportGrade ?? ''}" placeholder="e.g. 5.12a or 7a+"></div>
    <div class="field"><label>Max boulder grade</label>
      <input type="text" id="bm-boulderGrade" value="${benchmarks.boulderGrade ?? ''}" placeholder="e.g. V6"></div>
    <div class="field"><label>Dominant style</label>
      <select id="bm-dominantStyle">
        ${['crimp','pinch','sloper','pocket'].map(o => `<option ${benchmarks.dominantStyle===o?'selected':''}>${o}</option>`).join('')}
      </select></div>
    <div class="field"><label>Dominant angle</label>
      <select id="bm-dominantAngle">
        ${['slab','vert','slight-overhang','steep','roof'].map(o => `<option ${benchmarks.dominantAngle===o?'selected':''}>${o}</option>`).join('')}
      </select></div>

    <div class="row" style="margin-top:12px">
      <button class="primary" id="bm-save">Save</button>
      <button class="ghost" id="bm-archive">Save & archive (post-retest)</button>
    </div>
    <p class="muted" style="margin-top:6px">"Archive" keeps old values in history and recalculates load %s from the new numbers.</p>
  </div>`;

  if (benchmarks.history?.length) {
    body += `<div class="card"><h3>History</h3>
      <ul class="muted">${benchmarks.history.map(h =>
        `<li>${(h.archivedAt||'').slice(0,10)}: hang ${h.maxHang20mm ?? '—'}kg · pull-up ${h.pullup1RM ?? '—'}kg · boulder ${h.boulderGrade ?? '—'}</li>`).join('')}</ul></div>`;
  }

  root.innerHTML = body;

  // Anchor mode toggle
  function refreshCompHint() {
    const compEl = document.getElementById('bm-compDate');
    const hint = document.getElementById('bm-compHint');
    if (!compEl || !hint) return;
    const v = compEl.value;
    if (!v) { hint.textContent = ''; return; }
    const start = Program.computeStartFromComp(v);
    const today = new Date(); today.setHours(0,0,0,0);
    const startDate = new Date(start + 'T00:00:00');
    const daysFromToday = Math.round((startDate - today) / 86400000);
    let warning = '';
    if (daysFromToday < 0) {
      warning = ` ⚠ cycle would have started ${-daysFromToday} day${daysFromToday===-1?'':'s'} ago — early base weeks already passed.`;
    }
    hint.textContent = `Cycle: ${start} → ${v}.${warning}`;
  }
  document.querySelectorAll('input[name="anchorMode"]').forEach(r => {
    r.addEventListener('change', () => {
      const mode = r.value;
      document.querySelectorAll('[data-anchor-pane]').forEach(p => {
        p.style.display = p.dataset.anchorPane === mode ? '' : 'none';
      });
      if (mode === 'compDate') refreshCompHint();
    });
  });
  document.getElementById('bm-compDate')?.addEventListener('change', refreshCompHint);
  refreshCompHint();

  function readBenchmarks() {
    return {
      bodyweight: numOrNull('bm-bodyweight'),
      maxHang20mm: numOrNull('bm-maxHang20mm'),
      pullup1RM: numOrNull('bm-pullup1RM'),
      sportGrade: strOrNull('bm-sportGrade'),
      boulderGrade: strOrNull('bm-boulderGrade'),
      dominantStyle: document.getElementById('bm-dominantStyle').value,
      dominantAngle: document.getElementById('bm-dominantAngle').value
    };
  }
  function readSettings() {
    const mode = document.querySelector('input[name="anchorMode"]:checked')?.value || 'startDate';
    return {
      anchorMode: mode,
      startDate: document.getElementById('bm-startDate').value || null,
      compDate: document.getElementById('bm-compDate').value || null
    };
  }

  document.getElementById('bm-save').addEventListener('click', () => {
    Storage.setBenchmarks(readBenchmarks());
    Storage.setSettings(readSettings());
    flash('Saved.');
  });
  document.getElementById('bm-archive').addEventListener('click', () => {
    Storage.setBenchmarks(readBenchmarks(), { archive: true });
    Storage.setSettings(readSettings());
    flash('Saved & previous values archived.');
  });
}

function numOrNull(id) { const v = document.getElementById(id).value; return v === '' ? null : parseFloat(v); }
function strOrNull(id) { const v = document.getElementById(id).value.trim(); return v || null; }
function flash(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--accent);color:#001;padding:10px 18px;border-radius:8px;z-index:50;font-weight:600;box-shadow:0 4px 12px #0008';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
