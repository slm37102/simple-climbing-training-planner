// Escaping and untrusted-value handling for the shared UI helpers (js/ui.js).
// This module had NO test coverage at all before IB-068 despite owning the
// escaping invariant CLAUDE.md calls load-bearing ("notes sync across devices
// via Firestore, so an unescaped interpolation is not just self-XSS").
// Cases register via test() from the harness; tests/index.html imports every
// file in tests/cases/ (import order = display order) and runs the suite.
import { test, assert, assertEq, resetStorage } from '../harness.js';
import { Storage } from '../../js/storage.js';
import { escHtml, safeColor } from '../../js/ui.js';
import { renderProfile } from '../../js/views/profile.js';
import { renderToday } from '../../js/views/today.js';

// ─── IB-068: escHtml contract ─────────────────────────────────────────────

test('[IB-068] escHtml escapes the four HTML-significant characters', () => {
  assertEq(escHtml('<script>'), '&lt;script&gt;');
  assertEq(escHtml('a & b'), 'a &amp; b');
  assertEq(escHtml('say "hi"'), 'say &quot;hi&quot;');
  // & must be escaped FIRST or the other replacements get double-escaped
  assertEq(escHtml('&lt;'), '&amp;lt;');
});

test('[IB-068] escHtml coerces nullish to empty string, never "null"/"undefined"', () => {
  assertEq(escHtml(null), '');
  assertEq(escHtml(undefined), '');
  assertEq(escHtml(0), '0');
  assertEq(escHtml(false), 'false');
});

test('[IB-068] escHtml does NOT escape single quotes — so no call site may use a single-quoted attribute', () => {
  // Documents the deliberate limit rather than asserting a bug: every render
  // site in the app uses double-quoted attributes. If this ever changes, the
  // helper must be widened too.
  assertEq(escHtml("it's"), "it's");
});

// ─── IB-068: safeColor whitelist ──────────────────────────────────────────

test('[IB-068] safeColor accepts 3-, 6- and 8-digit hex, case-insensitively', () => {
  assertEq(safeColor('#abc'), '#abc');
  assertEq(safeColor('#5FD4E8'), '#5FD4E8');
  assertEq(safeColor('#5fd4e8ff'), '#5fd4e8ff');
  assertEq(safeColor('  #ABC  '), '#ABC', 'surrounding whitespace is trimmed, not rejected');
});

test('[IB-068] safeColor rejects attribute-breakout and CSS-injection payloads', () => {
  const attacks = [
    '" onmouseover="alert(1)',
    '#fff" onload="alert(1)',
    'red;background:url(https://evil.example/beacon)',
    'url(https://evil.example/x)',
    'expression(alert(1))',
    '</style><script>alert(1)</script>',
    '#12345',        // not a valid hex length
    '#ggg',          // not hex digits
    'rebeccapurple', // named colours are not on the whitelist
    '',
  ];
  for (const a of attacks) {
    assertEq(safeColor(a), '#5FD4E8', `payload should fall back to the default: ${JSON.stringify(a)}`);
  }
});

test('[IB-068] safeColor honours a caller-supplied fallback and handles nullish', () => {
  assertEq(safeColor(null), '#5FD4E8');
  assertEq(safeColor(undefined, '#000'), '#000');
  assertEq(safeColor('nope', '#123456'), '#123456');
});

// ─── IB-068: the render sites actually use it ─────────────────────────────
// The threat path is real: Storage.importJson only checks that `plans` is a
// non-array object, and mergeRemote adopts an unseen remote plan wholesale —
// neither validates `plan.color`, which all four sites drop into a style="…".

const ATTACK_COLOR = '" onmouseover="alert(1)';

test('[IB-068] REGRESSION: a hostile plan.color cannot break out of the Profile plan-card markup', () => {
  resetStorage();
  Storage.addPlan({ name: 'Injected', color: ATTACK_COLOR });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderProfile(root);
    assert(!root.innerHTML.includes('onmouseover'),
      'hostile colour reached the DOM as markup — safeColor missing at a Profile render site');
    const dot = root.querySelector('.plan-dot');
    if (dot) assert(!dot.getAttribute('onmouseover'), 'breakout produced a live event handler');
  } finally { root.remove(); }
});

test('[IB-068] REGRESSION: a hostile plan.color cannot break out of the Today plan switcher', () => {
  resetStorage();
  // The switcher only renders with 2+ plans.
  Storage.addPlan({ name: 'Plan A', color: '#5FD4E8' });
  Storage.addPlan({ name: 'Plan B', color: ATTACK_COLOR });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderToday(root);
    assert(!root.innerHTML.includes('onmouseover'),
      'hostile colour reached the DOM as markup — safeColor missing on the Today plan tab');
  } finally { root.remove(); }
});

test('[IB-068] a legitimate palette colour still renders unchanged', () => {
  resetStorage();
  Storage.addPlan({ name: 'Normal', color: '#F0607A' });
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    renderProfile(root);
    assert(root.innerHTML.includes('#F0607A'), 'a valid palette colour must survive the whitelist');
  } finally { root.remove(); }
});
