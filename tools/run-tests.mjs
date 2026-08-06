// Headless CLI runner for the in-browser smoke suite (tests/index.html).
// Run from the repo root:
//
//   node tools/run-tests.mjs
//
// Exit code 0 when every case passes, 1 on any failure or setup error — so it
// drops straight into CI or a pre-push hook.
//
// IB-035: the suite has always been browser-only — open tests/index.html and
// read the summary by eye. This does NOT add a test framework: tests/cases/*.js
// and tests/harness.js are untouched, and the app still ships with zero runtime
// deps. It only *drives* the existing suite — serves the repo, loads the page in
// headless Chromium via Playwright, waits for harness.js to write #summary, and
// reports the result. Playwright is an optional dev/CI tool (not an app dep); if
// it or a browser is missing the runner says exactly how to install it and exits
// non-zero rather than failing obscurely. The Playwright-MCP browser (see the
// `test` skill) is still the tool for interactive/e2e work — this is for "did I
// break anything" in one command.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

// Resolve Playwright from the local install, a global one, or bail with help.
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const name of ['playwright', 'playwright-core']) {
    try { return require(name); } catch { /* try next */ }
  }
  try {
    const { execSync } = require('node:child_process');
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    for (const name of ['playwright', 'playwright-core']) {
      const p = join(globalRoot, name);
      if (existsSync(p)) return require(p);
    }
  } catch { /* npm not on PATH — fall through to the help message */ }
  return null;
}

// Launch headless Chromium. Try Playwright's own resolution first; fall back to
// an explicit executable (PW_CHROMIUM, or the path used by this project's
// preconfigured browsers) so it works where only a bare Chromium is present.
async function launchChromium(chromium) {
  const opts = { headless: true, args: ['--no-sandbox'] };
  try {
    return await chromium.launch(opts);
  } catch (firstErr) {
    const candidates = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
    for (const executablePath of candidates) {
      if (existsSync(executablePath)) {
        try { return await chromium.launch({ ...opts, executablePath }); } catch { /* try next */ }
      }
    }
    throw firstErr;
  }
}

function fail(msg) { console.error(msg); process.exit(1); }

const pw = loadPlaywright();
if (!pw) {
  fail([
    'Playwright is not available — the headless runner needs it.',
    'Install it (a dev/CI tool, not an app dependency):',
    '  npm i -g playwright && npx playwright install chromium',
    'or run the suite by hand: serve the repo and open /tests/ (see the `test` skill).',
  ].join('\n'));
}

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const fp = normalize(join(REPO_ROOT, p));
    if (!fp.startsWith(REPO_ROOT)) { res.writeHead(403); return res.end('forbidden'); }
    const body = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

let browser;
try {
  browser = await launchChromium(pw.chromium);
} catch (err) {
  server.close();
  fail([
    'Could not launch a Chromium browser for Playwright.',
    'Install one with:  npx playwright install chromium',
    `(underlying error: ${err.message})`,
  ].join('\n'));
}

let exitCode = 1;
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/tests/`, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const s = document.getElementById('summary');
    return s && /passed,.*failed/.test(s.textContent || '');
  }, { timeout: 60000 });

  const summary = await page.$eval('#summary', el => el.textContent);
  const passed = await page.$eval('#summary', el => el.className.includes('allpass'));
  const failures = await page.$$eval('#results .name', els =>
    els.filter(e => e.textContent.startsWith('✗')).map(e => e.textContent));

  console.log(summary);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log('  ' + f);
  }
  if (pageErrors.length) {
    console.log('\nPage errors:');
    for (const e of pageErrors.slice(0, 10)) console.log('  ' + e);
  }
  exitCode = passed ? 0 : 1;
} catch (err) {
  console.error('Runner failed before the suite reported: ' + err.message);
  exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
process.exit(exitCode);
