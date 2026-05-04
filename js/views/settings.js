import { Storage } from '../storage.js';
import { Sync } from '../sync.js';

export function renderSettings(root) {
  const { settings } = Storage.get();

  let body = `<div class="card"><h2>Settings</h2>
    <div class="field"><label>Cycle start date</label>
      <input type="date" id="setStart" value="${settings.startDate || ''}"></div>
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

  document.getElementById('saveSettings').onclick = () => {
    Storage.setSettings({
      startDate: document.getElementById('setStart').value || null,
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
