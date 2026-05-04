// Firebase Auth (Google) + Firestore mirror.
// Loaded as ES modules from gstatic CDN (so no build step needed).
import { Storage } from './storage.js';
import { firebaseConfig, SYNC_ENABLED } from '../firebase-config.js';

const FB_VERSION = '10.12.2';
const APP_URL  = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth.js`;
const FS_URL   = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore.js`;

let app = null, auth = null, db = null, user = null;
let docRef = null;
let unsubSnap = null;
let saveTimer = null;
let onStatusCb = () => {};
let onRemoteCb = () => {};
let initialized = false;
let firebaseAvailable = false;
let lastKnownUid = null;
const LAST_UID_KEY = 'climb-planner:lastUid';

function setStatus(s) { onStatusCb(s); }

async function loadFirebase() {
  if (firebaseAvailable) return true;
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import(APP_URL),
      import(AUTH_URL),
      import(FS_URL)
    ]);
    app = initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db   = fsMod.getFirestore(app);
    Sync._auth = authMod;
    Sync._fs   = fsMod;
    firebaseAvailable = true;
    return true;
  } catch (e) {
    console.warn('Firebase failed to load — running local-only', e);
    return false;
  }
}

function configValid() {
  return firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'REPLACE_ME';
}

export const Sync = {
  _auth: null, _fs: null,

  async init({ onStatus, onRemoteUpdate } = {}) {
    if (onStatus) onStatusCb = onStatus;
    if (onRemoteUpdate) onRemoteCb = onRemoteUpdate;
    initialized = true;

    const state = Storage.get();
    if (!SYNC_ENABLED || state.settings.localOnly || !configValid()) {
      setStatus(state.settings.localOnly ? 'local-only' : 'offline');
      const needsAuthGate = !state.settings.localOnly && configValid() && !state.benchmarks.bodyweight;
      if (!configValid()) return { needsAuthGate: false };
      return { needsAuthGate };
    }

    const ok = await loadFirebase();
    if (!ok) { setStatus('offline'); return { needsAuthGate: false }; }

    // Hook up auth state changes
    let resolved = false;
    let storageHookInstalled = false;
    return new Promise(resolve => {
      this._auth.onAuthStateChanged(auth, async u => {
        const prev = user;
        user = u;
        if (u) {
          // Detect account switch: clear local state so we don't merge data across users.
          const lastUid = lastKnownUid || localStorage.getItem(LAST_UID_KEY);
          if (lastUid && lastUid !== u.uid) {
            const ok = confirm(
              'You signed in with a different Google account.\n\n' +
              'OK = clear this device\'s local data and load the new account\'s data.\n' +
              'Cancel = stay signed out (keeps current local data).'
            );
            if (!ok) {
              await this._auth.signOut(auth);
              setStatus('signed-out');
              if (!resolved) { resolved = true; resolve({ needsAuthGate: true }); }
              return;
            }
            Storage.clearLocal();
          }
          lastKnownUid = u.uid;
          localStorage.setItem(LAST_UID_KEY, u.uid);

          setStatus('signed-in: connecting…');
          await this._attachDoc();
          if (!storageHookInstalled) {
            Storage.onChange(() => this._scheduleUpload());
            storageHookInstalled = true;
          }
          if (!resolved) { resolved = true; resolve({ needsAuthGate: false }); }
        } else {
          setStatus('signed-out');
          if (!resolved) { resolved = true; resolve({ needsAuthGate: !state.settings.localOnly }); }
        }
      });
    });
  },

  async signIn() {
    const ok = await loadFirebase();
    if (!ok) throw new Error('Firebase unavailable');
    const { GoogleAuthProvider, signInWithPopup } = this._auth;
    await signInWithPopup(auth, new GoogleAuthProvider());
    Storage.setSettings({ localOnly: false });
  },

  async signOut() {
    if (!auth) return;
    if (unsubSnap) { unsubSnap(); unsubSnap = null; }
    await this._auth.signOut(auth);
    setStatus('signed-out');
  },

  setLocalOnly(on) {
    Storage.setSettings({ localOnly: !!on });
    setStatus(on ? 'local-only' : 'offline');
  },

  async _attachDoc() {
    if (!user) return;
    const { doc, onSnapshot } = this._fs;
    docRef = doc(db, 'users', user.uid, 'state', 'main');
    if (unsubSnap) unsubSnap();
    unsubSnap = onSnapshot(docRef,
      snap => {
        if (snap.exists()) {
          const remote = snap.data();
          // mergeRemote returns true only if local actually changed; emit is suppressed
          // internally so this does NOT re-trigger the upload pipeline.
          const changed = Storage.mergeRemote(remote);
          setStatus('synced ' + new Date().toLocaleTimeString());
          if (changed) onRemoteCb();
        } else {
          // Push local up if remote empty
          this._uploadNow();
        }
      },
      err => { console.warn('snapshot error', err); setStatus('error'); }
    );
  },

  _scheduleUpload() {
    if (!user || !docRef) return;
    setStatus('saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => this._uploadNow(), 800);
  },

  async _uploadNow() {
    if (!user || !docRef) return;
    const { setDoc } = this._fs;
    try {
      await setDoc(docRef, Storage.raw(), { merge: false });
      setStatus('synced ' + new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('upload failed', e);
      setStatus('save failed');
    }
  },

  isSignedIn() { return !!user; },
  user() { return user; }
};
