// Entry point: registers SW, wires nav, mounts views, gates on auth.
import { Storage } from './storage.js';
import { Sync } from './sync.js';
import { renderToday } from './views/today.js';
import { renderCalendar } from './views/calendar.js';
import { renderLog } from './views/log.js';
import { renderProfile } from './views/profile.js';

const views = {
  today: renderToday,
  cycle: renderCalendar,
  calendar: renderCalendar, // legacy hash
  log: renderLog,
  profile: renderProfile,
  settings: renderProfile,  // legacy hash
  plans: renderProfile,     // legacy hash
};

const TAB_FOR = { calendar: 'cycle', settings: 'profile', plans: 'profile' };

// Views take just (root) and import their own domain modules — the old `ctx`
// bundle was a seam with zero receivers (no view ever read it, no test ever
// substituted a fake), so it was deleted rather than kept as a fiction.
function navigate(name) {
  const tab = TAB_FOR[name] || name;
  document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.view === tab));
  const root = document.getElementById('view');
  root.innerHTML = '';
  (views[name] || renderToday)(root);
  location.hash = '#' + (views[name] ? name : 'today');
  window.scrollTo(0, 0);
}

function init() {
  Storage.init();
  document.querySelectorAll('#tabs .tab').forEach(b =>
    b.addEventListener('click', () => navigate(b.dataset.view))
  );
  window.addEventListener('hashchange', () => navigate((location.hash || '#today').slice(1)));

  // Auth gate: show if first run and sync available
  Sync.init({
    onStatus: s => {
      const el = document.getElementById('syncStatus');
      if (!el) return;
      el.textContent = s;
      el.classList.toggle('on', /synced|signed/i.test(s));
    },
    onRemoteUpdate: () => {
      const currentView = (location.hash || '#today').slice(1);
      // Don't wipe the Profile forms while user might be actively editing
      if (currentView !== 'profile' && currentView !== 'plans' && currentView !== 'settings') navigate(currentView);
    }
  }).then(({ needsAuthGate }) => {
    if (needsAuthGate) showAuthGate();
    else navigate((location.hash || '#today').slice(1));
  });

  if ('serviceWorker' in navigator) {
    // On a first-ever visit there is no controller yet; the initial clients.claim() fires
    // controllerchange once — that is NOT an update and must not trigger a reload.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
    // P3: reload the page when a NEW SW takes over an already-controlled page (a genuine update),
    // so users get the fresh shell immediately. Guard against the first-visit claim and double-fire.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      location.reload();
    });
  }
}

function showAuthGate() {
  const gate = document.getElementById('authGate');
  gate.classList.remove('hidden');
  setTimeout(() => gate.querySelector('button')?.focus(), 50);
  document.getElementById('signInBtn').onclick = async () => {
    try {
      await Sync.signIn();
      gate.classList.add('hidden');
      navigate('today');
    } catch (e) {
      // User closing the popup is not an error worth alerting
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        alert('Sign-in failed: ' + e.message);
      }
    }
  };
  document.getElementById('localOnlyBtn').onclick = () => {
    Sync.setLocalOnly(true);
    gate.classList.add('hidden');
    navigate('today');
  };
}

init();
