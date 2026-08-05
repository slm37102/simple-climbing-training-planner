// Regenerate sw.js's SHELL array from the files actually on disk, and derive
// the CACHE key from a content hash of those shell assets. Run from the repo
// root:
//
//   node tools/generate-sw.mjs    # sync SHELL + set CACHE = hash(shell contents)
//
// This replaces the two hand-maintained invariants that used to live in
// CLAUDE.md prose ("add every new js/ file to SHELL", "bump CACHE whenever
// anything under js/ changes") — 31 of the repo's first ~200 commits touched
// sw.js, two of them existing only to bump the version. Derived, not
// maintained. Same tools/ precedent as generate-schedule.mjs; no build step.
//
// IB-055: CACHE was a hand-bumped counter (`--bump` → vN+1). Two passes off one
// base both bumped to the *same* vN+1 and merged cleanly, publishing one version
// for two different payloads (a blocked/duplicate deploy). CACHE is now a hash of
// every shell asset's bytes, so it changes iff the cached payload changes:
// idempotent (re-running with no source change is a no-op — no counter to drift),
// and collision-proof (different payloads get different keys; identical payloads
// correctly share one). The CI guard in firebase-deploy.yml still applies —
// content-hashing changes how CACHE is derived, not whether someone regenerated,
// so "js/ changed but CACHE didn't" still catches a forgotten regen.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

// CACHE key = short hash of every shell asset's bytes (in shell order). './' is
// the root URL served as index.html, which is already listed as './index.html',
// so it contributes no separate file. Reading as bytes handles binary assets
// (icons, fonts) as well as text.
const hash = createHash('sha256');
for (const entry of shell) {
  const rel = entry === './' ? './index.html' : entry;
  const p = join(REPO_ROOT, rel);
  if (existsSync(p)) hash.update(readFileSync(p));
}
const cacheKey = `climb-planner-${hash.digest('hex').slice(0, 12)}`;

let sw = readFileSync(SW_PATH, 'utf8');

const shellRe = /const SHELL = \[[\s\S]*?\];/;
if (!shellRe.test(sw)) { console.error('SHELL array not found in sw.js'); process.exit(1); }
const rendered = 'const SHELL = [\n' + shell.map(f => `  '${f}'`).join(',\n') + '\n];';
const before = sw;
sw = sw.replace(shellRe, rendered);

const cacheRe = /const CACHE = 'climb-planner-[^']*';/;
if (!cacheRe.test(sw)) { console.error('CACHE key not found in sw.js'); process.exit(1); }
sw = sw.replace(cacheRe, `const CACHE = '${cacheKey}';`);

if (sw === before) {
  console.log(`sw.js up to date (${shell.length} shell entries, CACHE ${cacheKey}) — no changes written`);
} else {
  writeFileSync(SW_PATH, sw);
  console.log(`sw.js written — ${shell.length} shell entries, CACHE ${cacheKey}`);
}
