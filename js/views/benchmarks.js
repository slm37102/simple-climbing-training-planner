import { Storage } from '../storage.js';

export function renderBenchmarks(root) {
  const { benchmarks, settings } = Storage.get();

  const f = (k, label, type='number', step='0.5') =>
    `<div class="field"><label>${label}</label>
      <input type="${type}" id="bm-${k}" step="${step}" value="${benchmarks[k] ?? ''}"></div>`;

  let body = `<div class="card"><h2>Benchmarks</h2>
    ${f('bodyweight','Bodyweight (kg)')}
    ${f('maxHang20mm','Max 10s hang on 20mm edge — added kg (can be negative)')}
    ${f('pullup1RM','1RM weighted pull-up — added kg')}
    <div class="field"><label>Sport redpoint grade</label><input type="text" id="bm-sportGrade" value="${benchmarks.sportGrade ?? ''}" placeholder="e.g. 5.12a or 7a+"></div>
    <div class="field"><label>Max boulder grade</label><input type="text" id="bm-boulderGrade" value="${benchmarks.boulderGrade ?? ''}" placeholder="e.g. V6"></div>
    <div class="field"><label>Dominant style</label>
      <select id="bm-dominantStyle">
        ${['crimp','pinch','sloper','pocket'].map(o => `<option ${benchmarks.dominantStyle===o?'selected':''}>${o}</option>`).join('')}
      </select></div>
    <div class="field"><label>Dominant angle</label>
      <select id="bm-dominantAngle">
        ${['slab','vert','slight-overhang','steep','roof'].map(o => `<option ${benchmarks.dominantAngle===o?'selected':''}>${o}</option>`).join('')}
      </select></div>
    <hr>
    <div class="field"><label>Cycle start date (Monday recommended)</label>
      <input type="date" id="settings-startDate" value="${settings.startDate ?? ''}"></div>

    <div class="row">
      <button class="primary" id="bm-save">Save</button>
      <button class="ghost" id="bm-archive">Save & archive previous (retest)</button>
    </div>
    <p class="muted">Use "archive" after a retest day so old values are kept in history and load %s recalc from the new numbers.</p>
  </div>`;

  if (benchmarks.history?.length) {
    body += `<div class="card"><h3>History</h3>
      <ul class="muted">${benchmarks.history.map(h =>
        `<li>${(h.archivedAt||'').slice(0,10)}: hang ${h.maxHang20mm ?? '—'}kg · pull-up ${h.pullup1RM ?? '—'}kg · boulder ${h.boulderGrade ?? '—'}</li>`).join('')}</ul></div>`;
  }

  root.innerHTML = body;

  function readInputs() {
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

  document.getElementById('bm-save').addEventListener('click', () => {
    Storage.setBenchmarks(readInputs());
    const sd = document.getElementById('settings-startDate').value;
    if (sd) Storage.setSettings({ startDate: sd });
    alert('Saved.');
  });
  document.getElementById('bm-archive').addEventListener('click', () => {
    Storage.setBenchmarks(readInputs(), { archive: true });
    const sd = document.getElementById('settings-startDate').value;
    if (sd) Storage.setSettings({ startDate: sd });
    alert('Saved & previous values archived.');
  });
}

function numOrNull(id) { const v = document.getElementById(id).value; return v === '' ? null : parseFloat(v); }
function strOrNull(id) { const v = document.getElementById(id).value.trim(); return v || null; }
