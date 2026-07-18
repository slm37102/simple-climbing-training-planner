// Regenerate sw.js's SHELL array from the files actually on disk, and bump
// the CACHE version. Run from the repo root:
//
//   node tools/generate-sw.mjs           # sync SHELL only (reports drift)
//   node tools/generate-sw.mjs --bump    # sync SHELL and bump CACHE vN → vN+1
//
// This replaces the two hand-maintained invariants that used to live in
// CLAUDE.md prose ("add every new js/ file to SHELL", "bump CACHE whenever
// anything under js/ changes") — 31 of the repo's first ~200 commits touched
// sw.js, two of them existing only to bump the version. Derived, not
// maintained. Same tools/ precedent as generate-schedule.mjs; no build step.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SW_PATH = join(REPO_ROOT, 'sw.js');

// Fixed shell entries (order preserved in output). js/ and fonts/ are scanned;
// everything else the app shell needs is listed explicitly.
const HEAD = ['./', './index.html', './manifest.webmanifest', './css/styles.css'];
const TAIL = ['./firebase-config.js', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

function scan(dir, ext) {
  const abs = join(REPO_ROOT, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const name of readdirSync(abs).sort()) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) out.push(...scan(join(dir, name), ext));
    else if (name.endsWith(ext)) out.push('./' + relative(REPO_ROOT, p).replaceAll('\\', '/'));
  }
  return out;
}

// js/ files sorted top-level-first (js/*.js before js/views/*.js), mirroring
// the hand-maintained order so diffs stay reviewable.
const jsFiles = scan('js', '.js').sort((a, b) => {
  const da = a.split('/').length, db = b.split('/').length;
  return da !== db ? da - db : a.localeCompare(b);
});
const fonts = scan('fonts', '.woff2');
const shell = [...HEAD, ...fonts, ...jsFiles, ...TAIL];

let sw = readFileSync(SW_PATH, 'utf8');

const shellRe = /const SHELL = \[[\s\S]*?\];/;
if (!shellRe.test(sw)) { console.error('SHELL array not found in sw.js'); process.exit(1); }
const rendered = 'const SHELL = [\n' + shell.map(f => `  '${f}'`).join(',\n') + '\n];';
const before = sw;
sw = sw.replace(shellRe, rendered);

if (process.argv.includes('--bump')) {
  const verRe = /const CACHE = 'climb-planner-v(\d+)';/;
  const m = sw.match(verRe);
  if (!m) { console.error('CACHE version not found in sw.js'); process.exit(1); }
  const next = Number(m[1]) + 1;
  sw = sw.replace(verRe, `const CACHE = 'climb-planner-v${next}';`);
  console.log(`CACHE bumped to climb-planner-v${next}`);
}

if (sw === before) {
  console.log(`SHELL up to date (${shell.length} entries), no changes written`);
} else {
  writeFileSync(SW_PATH, sw);
  console.log(`sw.js written — SHELL has ${shell.length} entries`);
}
