// Only sanitized live fixtures, routed by the harness; never the remote Moodle site.
import {launch} from './harness.mjs';
import assert from 'node:assert/strict';

const ok = text => console.log('  ✓ ' + text);
const event = ['55826', '20261026T163000', '20261026T190000', 'גוש 3 חברה - 23206'];
const h = await launch({live: true, storage: {theme: 'quiet-focus', motion: 'off'}, local: {schedule: [event]}});
try {
  const page = await h.open('/my/');
  const cards = page.locator('[data-region="courses-view"] [data-region="course-content"]');
  const advertising = cards.filter({has: page.locator('.coursename', {hasText: '55826'})});
  const badge = advertising.locator('.nm-ongoing');
  const waitCount = async count => {
    await page.waitForFunction(n => document.querySelectorAll('.nm-ongoing').length === n, count);
    assert.equal(await badge.count(), count);
  };

  // page.clock patches the main world. Mirror its Date in the extension's isolated world too.
  const cdp = await h.context.newCDPSession(page);
  const contexts = [];
  cdp.on('Runtime.executionContextCreated', ({context}) => contexts.push(context));
  await cdp.send('Runtime.enable');
  let contextId;
  for (const context of contexts) {
    const {result} = await cdp.send('Runtime.evaluate', {contextId: context.id,
      expression: 'typeof globalThis.NM?.parseSchedule === "function"'});
    if (result.value) { contextId = context.id; break; }
  }
  assert.ok(contextId, 'extension content-script world exists');
  async function at(time) {
    await page.clock.setFixedTime(new Date(time));
    const now = await page.evaluate(() => Date.now());
    const result = await cdp.send('Runtime.evaluate', {contextId, expression: `
      globalThis.__scheduleNativeDate ||= Date;
      globalThis.Date = class extends __scheduleNativeDate {
        constructor(...args) { super(...(args.length ? args : [${now}])); }
        static now() { return ${now}; }
      };
    `});
    assert.ok(!result.exceptionDetails);
    // A Moodle re-render asks the real feature to evaluate the new time.
    await page.locator('[data-region="courses-view"]').evaluate(view => view.replaceChildren(...[...view.childNodes].map(n => n.cloneNode(true))));
  }

  await at('2026-10-26T16:29:59+02:00');
  await waitCount(0);
  await at('2026-10-26T16:30:00+02:00');
  await waitCount(1);
  assert.equal(await badge.textContent(), 'Ongoing');
  assert.equal(await badge.getAttribute('title'), 'Ongoing until 19:00 · גוש 3 חברה - 23206');
  assert.equal(await badge.getAttribute('aria-label'), await badge.getAttribute('title'));
  assert.ok(await badge.evaluate(el => el.previousElementSibling.matches('.categoryname')));
  assert.equal(await cards.filter({hasNot: page.locator('.coursename', {hasText: '55826'})}).locator('.nm-ongoing').count(), 0);
  await at('2026-10-26T18:59:59+02:00');
  await waitCount(1);
  await at('2026-10-26T19:00:00+02:00');
  await waitCount(0);
  ok('only 55826 is ongoing from 16:30 inclusive to 19:00 exclusive, with accessible time and location');

  await at('2026-10-26T17:00:00+02:00');
  await waitCount(1);
  await page.locator('[data-region="courses-view"]').evaluate(view => {
    const replacement = view.cloneNode(true);
    replacement.querySelectorAll('.nm-ongoing').forEach(b => b.remove());
    view.replaceWith(replacement);
  });
  await waitCount(1);
  await h.sw.evaluate(() => chrome.storage.local.set({schedule: []}));
  await waitCount(0);
  ok('view replacement and local storage changes update badges without duplicates');

  await page.getByRole('button', {name: 'Choose theme', exact: true}).click();
  const control = page.getByRole('group', {name: 'Class schedule', exact: true});
  const status = control.locator('.nm-schedule-status');
  assert.equal(await status.textContent(), 'No schedule');
  const input = control.locator('input[type="file"]');
  const upload = text => input.setInputFiles({name: 'classes.ics', mimeType: 'text/calendar', buffer: Buffer.from(text)});
  await upload([
    'BEGIN:VCALENDAR', 'BEGIN:VEVENT',
    'UID:99999-3-01-20261026@huji-schedule',
    'DTSTART;TZID=Asia/Jerusalem:20261026T163000', 'DTEND;TZID=Asia/Jerusalem:20261026T190000',
    'SUMMARY:ניהול התקשורת והפרסום בעידן הדיגיטלי',
    'LOCATION:גוש 3 חברה\\,', '  23206',
    'DESCRIPTION:קוד קורס: 55826-3-01\\nמרצה: פרופ שפירא מיכל', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:55506-4-01@huji-schedule',
    'DTSTART:20261026T180000Z', 'DTEND:20261026T190000Z', 'END:VEVENT',
    'BEGIN:VEVENT', 'SUMMARY:67543 - Algorithms',
    'DTSTART:20261027T120000', 'DTEND:20261027T130000', 'END:VEVENT',
    'BEGIN:VEVENT', 'SUMMARY:No course code',
    'DTSTART:20261026T163000', 'DTEND:20261026T190000', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n'));
  await page.waitForFunction(() => document.querySelector('.nm-schedule-status').textContent === '3 classes imported');
  assert.deepEqual((await h.getLocal('schedule')).schedule, [
    ['55826', '20261026T163000', '20261026T190000', 'גוש 3 חברה, 23206'],
    ['55506', '20261026T200000', '20261026T210000', ''],
    ['67543', '20261027T120000', '20261027T130000', ''],
  ]);
  assert.equal((await h.getStorage('schedule')).schedule, undefined);
  await waitCount(1);
  ok('in-page import unfolds and unescapes ICS, resolves code fallbacks, converts UTC, skips missing codes, and saves locally');

  await upload('BEGIN:VCALENDAR\r\nEND:VCALENDAR');
  await page.waitForFunction(() => document.querySelector('.nm-schedule-status').textContent.includes('No usable classes'));
  assert.equal((await h.getLocal('schedule')).schedule.length, 3);
  await control.getByRole('button', {name: 'Clear', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('.nm-schedule-status').textContent === 'No schedule');
  await waitCount(0);
  assert.deepEqual((await h.getLocal('schedule')).schedule, []);
  ok('empty import shows an error and preserves the schedule; Clear removes it and its badges');
  console.log('\nPASS schedule.e2e');
} finally { await h.close(); }
