// Service worker: cache-first shell, network-first for index.html, bypass Firestore/Auth.
const CACHE = 'climb-planner-v28';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './fonts/archivo-latin.woff2',
  './fonts/archivo-latin-ext.woff2',
  './fonts/archivo-vietnamese.woff2',
  './js/app.js',
  './js/dates.js',
  './js/storage.js',
  './js/program.js',
  './js/loads.js',
  './js/replan.js',
  './js/warmup.js',
  './js/sync.js',
  './js/exercise-inputs.js',
  './js/ui.js',
  './js/views/today.js',
  './js/views/calendar.js',
  './js/views/log.js',
  './js/views/profile.js',
  './js/views/onboarding.js',
  './firebase-config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Bypass Firebase / Google APIs — SDK handles its own offline persistence
  if (/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|googleapis\.com\/identitytoolkit|gstatic\.com|googleapis\.com\/oauth2/.test(url.href)) {
    return; // default network handling
  }
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(r => {
        // P1: only cache a valid, same-origin, non-redirected response to avoid poisoning
        // the offline shell with error pages, captive-portal redirects, or 5xx responses.
        if (r.ok && r.type === 'basic' && !r.redirected) {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(c => {
    if (c) return c;
    return fetch(e.request).then(r => {
      if (r.ok && r.type === 'basic') caches.open(CACHE).then(cache => cache.put(e.request, r.clone()));
      return r;
    });
  }));
});
