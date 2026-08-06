// Shared UI helpers used across multiple views.

export function flash(msg, ms = 1600) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Escapes & < > " — enough for text nodes and DOUBLE-quoted attributes, which
// is every interpolation site in this app. It deliberately does NOT escape `'`,
// so do not introduce a single-quoted attribute around an escHtml() call.
export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Plan colours are chosen from a fixed swatch palette in the UI, but they are
// stored per-plan and therefore arrive from two paths that never validate them:
// `Storage.importJson` (which only checks that `plans` is a non-array object)
// and `Storage.mergeRemote` (which adopts an unseen remote plan wholesale). All
// four render sites interpolate the value straight into a `style="…"` attribute,
// so a crafted colour is both an attribute-breakout and a CSS-injection vector
// (`url(…)` beaconing) — and it would sync to every device, exactly the reason
// CLAUDE.md treats escaping here as more than self-XSS. Escaping alone would
// close the breakout but not the CSS injection, so this whitelists instead:
// a 3-, 6- or 8-digit hex colour, or the caller's fallback. IB-068.
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export function safeColor(value, fallback = '#5FD4E8') {
  return HEX_COLOR.test(String(value ?? '').trim()) ? String(value).trim() : fallback;
}
