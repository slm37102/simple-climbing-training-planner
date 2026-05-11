import { Storage } from '../storage.js';
import { Sync } from '../sync.js';

export function renderSettings(root) {
  const { settings } = Storage.get();

  const bm = Storage.get().benchmarks;

  function selOpt(opts, val) {
    return opts.map(([v, l]) =>
      `<option value="${v}" ${val === v ? 'selected' : ''}>${l}</option>`
    ).join('');
  }

  let body = `<div class="card"><h2>Benchmarks</h2>
    <p class="muted" style="font-size:.85rem">Used across all plans to prescribe loads.</p>
    <div class="field"><label>Bodyweight (kg)</label>
      <input type="number" id="bm-bodyweight" step="0.5" min="30" max="200" value="${bm.bodyweight ?? ''}">
    </div>
    <div class="field"><label>Max hang 20mm (added kg, BW not included)</label>
      <input type="number" id="bm-maxHang20mm" step="1" min="-30" max="200" value="${bm.maxHang20mm ?? ''}">
    </div>
    <div class="field"><label>Pull-up 1RM (added kg)</label>
      <input type="number" id="bm-pullup1RM" step="1" min="-30" max="200" value="${bm.pullup1RM ?? ''}">
    </div>
    <div class="field"><label>Sport climbing grade (redpoint)</label>
      <input type="text" id="bm-sportGrade" placeholder="e.g. 7b+" value="${bm.sportGrade ?? ''}">
    </div>
    <div class="field"><label>Boulder grade (redpoint)</label>
      <input type="text" id="bm-boulderGrade" placeholder="e.g. V7" value="${bm.boulderGrade ?? ''}">
    </div>
    <div class="field"><label>Dominant style</label>
      <select id="bm-dominantStyle">
        ${selOpt([['crimp','Crimp'],['sloper','Sloper'],['pinch','Pinch']], bm.dominantStyle || 'crimp')}
      </select>
    </div>
    <div class="field"><label>Dominant angle</label>
      <select id="bm-dominantAngle">
        ${selOpt([['slab','Slab'],['vertical','Vertical'],['slight-overhang','Slight overhang'],['overhang','Overhang'],['roof','Roof']], bm.dominantAngle || 'slight-overhang')}
      </select>
    </div>
    <button class="primary" id="saveBenchmarks">Save benchmarks</button>
  </div>

  <div class="card"><h2>Preferences</h2>
    <div class="field"><label>Units</label>
      <select id="setUnits">
        <option value="kg" ${settings.units==='kg'?'selected':''}>kg</option>
        <option value="lb" ${settings.units==='lb'?'selected':''}>lb</option>
      </select></div>
    <div class="row">
      <button class="primary" id="saveSettings">Save</button>
    </div>
  </div>

  <div class="card"><h2>Sync</h2>
    <p class="muted">Status: <span id="syncStat">—</span></p>
    <p class="muted">Signed in: <span id="signedAs">${Sync.user()?.email || '— not signed in —'}</span></p>
    <div class="row">
      <button class="primary" id="signInBtn2">Sign in with Google</button>
      <button class="ghost" id="signOutBtn">Sign out</button>
      <button class="ghost" id="toggleLocal">${settings.localOnly?'Enable sync':'Use locally only'}</button>
    </div>
  </div>

  <div class="card"><h2>Data</h2>
    <div class="row">
      <button class="ghost" id="exportBtn">Export JSON</button>
      <button class="ghost" id="importBtn">Import JSON</button>
      <button class="danger" id="resetBtn">Reset all data</button>
    </div>
    <textarea id="ioArea" placeholder="Paste JSON here to import" style="margin-top:10px"></textarea>
  </div>`;

  root.innerHTML = body;
  document.getElementById('syncStat').textContent = document.getElementById('syncStatus').textContent;

  document.getElementById('saveBenchmarks').onclick = () => {
    Storage.setGlobalBenchmarks({
      bodyweight:    parseFloat(document.getElementById('bm-bodyweight').value) || null,
      maxHang20mm:   parseFloat(document.getElementById('bm-maxHang20mm').value) || null,
      pullup1RM:     parseFloat(document.getElementById('bm-pullup1RM').value) || null,
      sportGrade:    document.getElementById('bm-sportGrade').value.trim() || '',
      boulderGrade:  document.getElementById('bm-boulderGrade').value.trim() || '',
      dominantStyle: document.getElementById('bm-dominantStyle').value,
      dominantAngle: document.getElementById('bm-dominantAngle').value,
    });
    alert('Benchmarks saved.');
  };
  document.getElementById('saveSettings').onclick = () => {
    Storage.setSettings({
      units: document.getElementById('setUnits').value
    });
    alert('Saved.');
  };
  document.getElementById('signInBtn2').onclick = async () => {
    try { await Sync.signIn(); renderSettings(root); }
    catch(e){ alert('Sign-in failed: ' + e.message); }
  };
  document.getElementById('signOutBtn').onclick = async () => { await Sync.signOut(); renderSettings(root); };
  document.getElementById('toggleLocal').onclick = () => {
    Sync.setLocalOnly(!settings.localOnly);
    renderSettings(root);
  };
  document.getElementById('exportBtn').onclick = () => {
    document.getElementById('ioArea').value = Storage.exportJson();
  };
  document.getElementById('importBtn').onclick = () => {
    try { Storage.importJson(document.getElementById('ioArea').value); alert('Imported.'); }
    catch(e){ alert('Invalid JSON'); }
  };
  document.getElementById('resetBtn').onclick = () => {
    if (confirm('Reset all local data? This cannot be undone.')) { Storage.reset(); renderSettings(root); }
  };
}
