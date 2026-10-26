// Offline only: fixture-backed worker fetch, simulated permissions, and the real dashboard/content script.
import {launch} from './harness.mjs';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

const fixtureDir = new URL('../fixtures/shnaton/', import.meta.url);
const fixtures = Object.fromEntries(readdirSync(fixtureDir).filter(f => f.endsWith('.json'))
  .map(f => [f, JSON.parse(readFileSync(new URL(f, fixtureDir), 'utf8'))]));
const ok = text => console.log('  ✓ ' + text);
const h = await launch({live: true, storage: {theme: 'quiet-focus', motion: 'off'}});
try {
  // The harness fulfills Moodle/IdP URLs from disk; every other external URL is blocked.
  await h.context.route(/^(?!https:\/\/(?:moodle\.huji\.ac\.il|idp\.cc\.huji\.ac\.il)\/).*$/, route =>
    route.request().url().startsWith('chrome-extension:') ? route.continue() : route.fulfill({status: 404, body: ''}));
  await h.sw.evaluate(fixtures => {
    globalThis.shnatonAllowed = false;
    globalThis.shnatonRequests = [];
    chrome.permissions.contains = async ({origins}) => globalThis.shnatonAllowed &&
      origins.length === 1 && origins[0] === 'https://shnaton.huji.ac.il/*';
    globalThis.fetch = async (raw, init = {}) => {
      const url = new URL(String(raw));
      globalThis.shnatonRequests.push({url: url.href, accept: init.headers?.Accept, method: init.method || 'GET'});
      if (url.origin !== 'https://shnaton.huji.ac.il' || url.searchParams.get('year') !== '2027') throw new Error('Unexpected fetch: ' + url);
      const code = url.pathname.match(/^\/api\/courses\/code\/(\d{5})$/)?.[1];
      let data;
      if (code) data = fixtures[`code-${code}.json`] || [];
      else if (url.pathname === '/api/courses/groups-with-sessions') {
        data = Object.assign({}, ...url.searchParams.get('courseIds').split(',').map(id => fixtures[`groups-${id}.json`] || {}));
      } else throw new Error('Unexpected API path: ' + url);
      return new Response(JSON.stringify(data), {headers: {'content-type': 'application/json'}});
    };
  }, fixtures);
  const requests = () => h.sw.evaluate(() => globalThis.shnatonRequests);
  const permission = allowed => h.sw.evaluate(async allowed => {
    globalThis.shnatonAllowed = allowed;
    await permissionsChanged(); // Exercise the same broadcast as Chrome's onAdded/onRemoved listeners.
  }, allowed);
  const popup = await h.context.newPage();
  await popup.goto(h.sw.url().replace('src/background.js', 'popup/popup.html'));
  await popup.waitForFunction(() => !document.querySelector('#shnaton').checked);
  assert.equal(await popup.locator('#shnaton').getAttribute('aria-describedby'), 'shnaton-description');
  const send = message => popup.evaluate(message => chrome.runtime.sendMessage(message), message);
  assert.deepEqual(await send({type: 'nm-shnaton', codes: ['55826'], year: '2027'}), {error: 'no-permission'});

  const page = await h.open('/my/');
  const card = code => page.locator('[data-region="courses-view"] [data-region="course-content"]')
    .filter({has: page.locator('.coursename', {hasText: code})});
  const ad = card('55826'), lab = card('67723');
  let cdp, contextId;
  async function world() {
    if (cdp) await cdp.detach();
    cdp = await h.context.newCDPSession(page);
    const contexts = [];
    cdp.on('Runtime.executionContextCreated', ({context}) => contexts.push(context));
    await cdp.send('Runtime.enable');
    contextId = undefined;
    for (const context of contexts) {
      const {result} = await cdp.send('Runtime.evaluate', {contextId: context.id,
        expression: 'typeof globalThis.NM?.parseSchedule === "function"'});
      if (result.value) { contextId = context.id; break; }
    }
    assert.ok(contextId, 'extension content-script world exists');
  }
  // Visit meeting dates without advancing the cache's elapsed-time clock by days.
  const cacheNow = Date.now();
  async function at(time) {
    const now = +new Date(time);
    const result = await cdp.send('Runtime.evaluate', {contextId, expression: `
      globalThis.__scheduleNativeDate ||= Date;
      globalThis.Date = class extends __scheduleNativeDate {
        constructor(...args) { super(...(args.length ? args : [${now}])); }
        static now() { return ${cacheNow}; }
      };
    `});
    assert.ok(!result.exceptionDetails);
    await page.locator('[data-region="courses-view"]').evaluate(view => view.replaceChildren(...[...view.childNodes].map(n => n.cloneNode(true))));
    // Flush the feature's mutation observer and rendering frame, including negative assertions.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  async function badgeCount(code, count) {
    await page.waitForFunction(({code, count}) => {
      const card = [...document.querySelectorAll('[data-region="courses-view"] [data-region="course-content"]')]
        .find(c => c.querySelector('.coursename')?.textContent.includes(code));
      return card?.querySelectorAll('.nm-ongoing').length === count;
    }, {code, count});
  }
  await world();
  await at('2026-10-26T17:00:00+02:00');
  await page.waitForFunction(() => document.querySelector('.nm-shnaton-status')?.textContent.startsWith('Shnaton is off.'));
  assert.equal(await page.locator('.nm-ongoing').count(), 0);
  assert.equal((await requests()).length, 0);
  assert.equal((await h.getLocal('shnaton')).shnaton, undefined);
  ok('permission denial makes no API requests, caches no error, and shows no badges');

  // Native permission prompts are unavailable in automation; exercise the popup gesture with a simulated grant.
  await popup.evaluate(() => {
    globalThis.granted = false;
    globalThis.permissionCalls = [];
    chrome.permissions.contains = async () => globalThis.granted;
    chrome.permissions.request = async details => { globalThis.permissionCalls.push(['request', details]); return globalThis.granted = true; };
    chrome.permissions.remove = async details => { globalThis.permissionCalls.push(['remove', details]); globalThis.granted = false; return true; };
  });
  await popup.locator('#shnaton').check();
  await popup.waitForFunction(() => !document.querySelector('#shnaton').disabled);
  assert.ok(await popup.isChecked('#shnaton'));
  await permission(true);
  await badgeCount('55826', 1);
  assert.equal(await ad.locator('.nm-ongoing').getAttribute('title'), 'Ongoing until 19:00 · גוש 3 חברה · 23206 חברה');
  assert.equal(await ad.locator('.nm-ongoing').getAttribute('aria-label'), await ad.locator('.nm-ongoing').getAttribute('title'));
  await page.waitForFunction(() => document.querySelector('.nm-shnaton-status')?.textContent === 'Shnaton: 2 courses');
  const cached = (await h.getLocal('shnaton')).shnaton;
  assert.equal(cached.year, '2027');
  assert.equal(cached.codes, cached.codes.split(',').sort().join());
  const firstRequests = await requests();
  const batches = firstRequests.filter(r => r.url.includes('/groups-with-sessions?'));
  assert.equal(batches.length, 1);
  assert.deepEqual(new URL(batches[0].url).searchParams.get('courseIds').split(',').sort(), ['350371', '508662']);
  assert.equal(firstRequests.length, cached.codes.split(',').length + 1);
  assert.ok(firstRequests.every(r => r.accept === 'application/json' && r.method === 'GET'));
  const thursday = cached.courses['67723'].find(g => g.group === '7-06');
  assert.deepEqual(thursday.meetings.find(m => m[0] === '20261029T100000'),
    ['20261029T100000', '20261029T114500', 'הנדסה · A105, A106, A107']);
  assert.equal(new Set(thursday.meetings.map(m => m[0] + m[1])).size, thursday.meetings.length);
  ok('grant updates the open dashboard, batches all ids once, and merges rooms');

  await page.reload({waitUntil: 'load'});
  await page.waitForFunction(() => document.querySelector('.nm-shnaton-status')?.textContent === 'Shnaton: 2 courses');
  await world();
  await at('2026-10-26T17:00:00+02:00');
  await badgeCount('55826', 1);
  assert.equal((await requests()).length, firstRequests.length);
  ok('reload reuses the cache without API requests');

  await at('2026-10-29T10:30:00+02:00');
  await badgeCount('67723', 0);
  await page.getByRole('button', {name: 'Choose theme', exact: true}).click();
  const select = page.getByRole('combobox', {name: '67723 Agentic Programming · מעבדה', exact: true});
  assert.equal(await select.inputValue(), '?');
  assert.equal(await select.locator('option[value="7-06"]').textContent(), '7-06 · Thu 10:00–11:45');
  await select.selectOption('7-06');
  await badgeCount('67723', 1);
  assert.equal((await h.getLocal('shnatonGroups')).shnatonGroups['67723']['מעבדה'], '7-06');
  assert.equal(await lab.locator('.nm-ongoing').getAttribute('title'), 'Ongoing until 11:45 · הנדסה · A105, A106, A107');
  assert.equal(await select.inputValue(), '7-06');
  await at('2026-10-27T10:30:00+02:00');
  await badgeCount('67723', 0);
  await at('2026-10-29T10:30:00+02:00');
  await badgeCount('67723', 1);
  await select.selectOption('');
  await badgeCount('67723', 0);
  assert.equal((await h.getLocal('shnatonGroups')).shnatonGroups['67723']['מעבדה'], '');
  await select.selectOption('7-06');
  await badgeCount('67723', 1);
  ok('ambiguous labs require a pick, only that group contributes meetings, and None of these persists');

  // Import through the actual popover, at a time different from the catalog meeting.
  await page.locator('#nm-schedule-file').setInputFiles({name: 'override.ics', mimeType: 'text/calendar', buffer: Buffer.from([
    'BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'SUMMARY:55826 - Advertising',
    'DTSTART:20261026T200000', 'DTEND:20261026T210000', 'LOCATION:Imported room',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n'))});
  await page.waitForFunction(() => document.querySelector('.nm-schedule-status')?.textContent === '1 classes imported');
  await at('2026-10-26T17:00:00+02:00');
  await badgeCount('55826', 0);
  await at('2026-10-26T20:30:00+02:00');
  await badgeCount('55826', 1);
  assert.equal(await ad.locator('.nm-ongoing').getAttribute('title'), 'Ongoing until 21:00 · Imported room');
  await at('2026-10-29T10:30:00+02:00');
  await badgeCount('67723', 1);
  ok('an imported course overrides all its catalog meetings while other courses still use Shnaton');

  const beforeInvalid = (await requests()).length;
  for (const message of [
    {codes: ['5582x'], year: '2027'}, {codes: [], year: '2027'},
    {codes: Array(21).fill('55826'), year: '2027'}, {codes: [55826], year: '2027'},
    {codes: ['55826'], year: '202x'},
  ]) assert.deepEqual(await send({type: 'nm-shnaton', ...message}), {error: 'invalid request'});
  assert.equal((await requests()).length, beforeInvalid);
  await popup.locator('#shnaton').uncheck();
  await popup.waitForFunction(() => !document.querySelector('#shnaton').disabled);
  assert.deepEqual(await popup.evaluate(() => globalThis.permissionCalls), [
    ['request', {origins: ['https://shnaton.huji.ac.il/*']}], ['remove', {origins: ['https://shnaton.huji.ac.il/*']}],
  ]);
  await permission(false);
  await page.waitForFunction(() => document.querySelector('.nm-shnaton-status')?.textContent.startsWith('Shnaton is off.'));
  await badgeCount('67723', 0);
  assert.deepEqual(await send({type: 'nm-shnaton', codes: ['55826'], year: '2027'}), {error: 'no-permission'});
  assert.equal((await requests()).length, beforeInvalid);
  await at('2026-10-26T20:30:00+02:00');
  await badgeCount('55826', 1);
  ok('invalid requests and revoked permission never fetch; revocation hides cached catalog badges but keeps imports');
  console.log('\nPASS shnaton.e2e');
} finally { await h.close(); }
