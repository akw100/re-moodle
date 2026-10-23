// Loads the unpacked extension in real Chromium and serves fixtures AT the real Moodle URLs (so the real manifest matches).
//   import {launch} from './harness.mjs';
//   const h = await launch({storage: {theme: 'campus-pop'}});
//   const page = await h.open('/my/');            // -> fixtures/dashboard.html
//   await page.screenshot({path: 'x.png'}); await h.close();
// Routing: /my/ -> dashboard.html; /lib/ajax/service.php -> fixtures/service-mock.json by methodname (override with `mock`);
// /mod/<mod>/<file>.php[?action=<a>] -> fixtures/<mod>-<file>[-<a>].html (also in live mode, for pages with no live capture,
// e.g. /mod/resource/view.php -> resource-view.html); /pluginfile.php/...pdf -> fixtures/sample.pdf; other Moodle URLs -> 404. Non-Moodle URLs go to the network.
import {chromium} from 'playwright';
import {readFileSync, existsSync, mkdtempSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const WWWROOT = 'https://moodle.huji.ac.il/2026-27';
const fx = f => join(ROOT, 'fixtures', f);
// fixtures/vendor/ mirrors HUJI's real assets (npm run vendor); keyed like this.
export const vendorKey = url => { const u = new URL(url); return u.host + u.pathname + (u.search ? '__' + createHash('sha1').update(u.search).digest('hex').slice(0, 10) : ''); };
const vendorIndex = existsSync(fx('vendor/index.json')) ? JSON.parse(readFileSync(fx('vendor/index.json'), 'utf8')) : {};
// live: true serves the sanitized captures of real pages in fixtures/live/ (styled by the mirrored HUJI CSS).
const LIVE = {'/my/': 'dashboard.html', '/my/index.php': 'dashboard.html', '/course/view.php': 'course-view.html',
  '/calendar/view.php': 'calendar-month.html', '/mod/assign/view.php': 'assign-view.html', '/mod/quiz/view.php': 'quiz-view.html'};
export const LOGIN_URL = 'https://idp.cc.huji.ac.il/simplesaml/module.php/core/loginuserpass.php';

export async function launch({storage = {}, local = {}, mock = {}, live = false, headless = true, viewport = {width: 1280, height: 900}} = {}) {
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'nm-')), {
    channel: 'chromium', headless, viewport,
    args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`],
  });
  const responses = {...JSON.parse(readFileSync(fx('service-mock.json'), 'utf8')), ...mock};
  const calls = [];

  await context.route(/^https:\/\/(moodle\.huji\.ac\.il|idp\.cc\.huji\.ac\.il)\//, async route => {
    const url = new URL(route.request().url());
    const vk = vendorKey(url.href);
    if (vendorIndex[vk]) return route.fulfill({contentType: vendorIndex[vk], body: readFileSync(fx('vendor/' + vk))});
    if (url.host.startsWith('idp.')) return url.href.startsWith(LOGIN_URL)
      ? route.fulfill({contentType: 'text/html', body: readFileSync(fx('live/login-idp.html'))})
      : route.fulfill({status: 404, body: ''});
    const path = url.pathname.replace(/^\/2026-27/, '');
    if (live && LIVE[path] && existsSync(fx('live/' + LIVE[path]))) return route.fulfill({contentType: 'text/html', body: readFileSync(fx('live/' + LIVE[path]))});
    if (path === '/my/' || path === '/my/index.php') return route.fulfill({contentType: 'text/html', body: readFileSync(fx('dashboard.html'))});
    if (path === '/lib/ajax/service.php') {
      const [req] = JSON.parse(route.request().postData() || '[]');
      calls.push(req);
      const data = responses[req?.methodname];
      const body = data === undefined ? [{error: true, exception: {message: 'Web service is not available.'}}]
        : typeof data === 'function' ? [{error: false, data: data(req.args)}] : [{error: false, data}];
      return route.fulfill({contentType: 'application/json', body: JSON.stringify(body)});
    }
    // Files embedded on resource pages (e.g. /pluginfile.php/1/mod_resource/content/1/x.pdf) -> one tiny real PDF.
    if (/^\/pluginfile\.php\/.+\.pdf$/i.test(path)) return route.fulfill({contentType: 'application/pdf', body: readFileSync(fx('sample.pdf'))});
    const m = path.match(/^\/mod\/(\w+)\/(\w+)\.php$/);
    const action = url.searchParams.get('action');
    const file = m && [action && `${m[1]}-${m[2]}-${action}.html`, `${m[1]}-${m[2]}.html`].find(f => f && existsSync(fx(f)));
    if (file) return route.fulfill({contentType: 'text/html', body: readFileSync(fx(file))});
    return route.fulfill({status: 404, contentType: 'text/html', body: '<h1>Not in fixtures</h1>'});
  });

  let [sw] = context.serviceWorkers();
  sw ||= await context.waitForEvent('serviceworker');
  await sw.evaluate(async ([s, l]) => { await chrome.storage.sync.set(s); await chrome.storage.local.set(l); }, [storage, local]);

  return {
    context, sw, calls,
    async open(path) { // a Moodle path ('/my/') or a full URL (LOGIN_URL)
      const page = await context.newPage();
      page.on('pageerror', e => console.error('[pageerror]', e.message));
      page.on('console', m => { if (m.type() === 'error' || m.text().includes('[Re-Moodle]')) console.log('[console]', m.text()); });
      await page.goto(path.startsWith('http') ? path : WWWROOT + path);
      await page.waitForTimeout(600); // let document_idle scripts and the first AJAX round-trip finish
      return page;
    },
    setStorage: s => sw.evaluate(s => chrome.storage.sync.set(s), s),
    getStorage: keys => sw.evaluate(k => chrome.storage.sync.get(k), keys ?? null),
    getLocal: keys => sw.evaluate(k => chrome.storage.local.get(k), keys ?? null),
    close: () => context.close(),
  };
}
