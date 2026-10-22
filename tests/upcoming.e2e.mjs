// E2E check for the Upcoming events done-split (src/features/upcoming.js). Run: node tests/upcoming.e2e.mjs
// Screenshots land in tests/tmp/upcoming-*.png.
import {launch} from './harness.mjs';
import {readFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './harness.mjs';

const TMP = join(ROOT, 'tests', 'tmp');
mkdirSync(TMP, {recursive: true});
const mock = JSON.parse(readFileSync(join(ROOT, 'fixtures', 'service-mock.json'), 'utf8'));
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

// Snapshot of what the block looks like now, read through the DOM only.
const state = page => page.evaluate(() => {
  const sec = document.querySelector('section.block_calendar_upcoming');
  const rows = [...sec.querySelectorAll('.event[data-region=event-item]')].map(r => ({
    id: r.querySelector('a[data-event-id]').dataset.eventId,
    inDone: !!r.closest('.nm-up-done'),
    checkbox: !!r.querySelector('input[type=checkbox]'),
    checked: !!r.querySelector('input[type=checkbox]')?.checked,
    tag: r.querySelector('.nm-up-tag')?.textContent || null,
    edit: r.querySelector('.nm-up-edit')?.firstChild.textContent || null,
  }));
  return {
    rows: Object.fromEntries(rows.map(r => [r.id, r])),
    order: rows.map(r => r.id),
    details: sec.querySelectorAll('details.nm-up-done').length,
    summary: sec.querySelector('.nm-up-done-summary')?.textContent || null,
    count: sec.querySelector('.nm-up-count')?.textContent || null,
    note: sec.querySelectorAll('.nm-up-note').length,
  };
});
const until = async (page, fn, arg, ms = 3000) => page.waitForFunction(fn, arg, {timeout: ms, polling: 50});

// Evaluate in the extension's isolated world (where the content-script NM lives) via CDP.
async function isolated(page) {
  const cdp = await page.context().newCDPSession(page);
  const ctxs = [];
  cdp.on('Runtime.executionContextCreated', e => ctxs.push(e.context));
  await cdp.send('Runtime.enable');
  const ctx = ctxs.find(c => c.auxData?.type === 'isolated' && c.name === 'Nicer Moodle' && c.auxData?.frameId === ctxs.find(m => m.auxData?.isDefault)?.auxData?.frameId)
    || ctxs.find(c => c.name === 'Nicer Moodle');
  if (!ctx) return null;
  return async expr => (await cdp.send('Runtime.evaluate', {expression: expr, contextId: ctx.id, returnByValue: true, awaitPromise: true})).result.value;
}

// ---------- (a) default mock ----------
{
  const h = await launch();
  const page = await h.open('/my/');
  await until(page, () => document.querySelector('.nm-up-done'));
  let s = await state(page);
  ok(s.rows['28754'].inDone, '(a) 28754 is inside .nm-up-done');
  ok(s.rows['28754'].tag === '✓ submitted' && s.rows['28754'].edit === 'Review', '(a) 28754 tagged "✓ submitted" with a "Review" link');
  for (const id of ['30587', '33795']) ok(!s.rows[id].inDone && s.rows[id].checkbox && !s.rows[id].checked, `(a) ${id} is to-do with an unticked checkbox`);
  ok(!s.rows['33794'].checkbox && !s.rows['33794'].inDone, '(a) 33794 (open) has no checkbox and stays in the list');
  ok(s.count === '2 to do · 1 done', `(a) header count "${s.count}"`);
  ok(/Done \/ submitted \(1\)/.test(s.summary) && /still editable/.test(s.summary), `(a) summary "${s.summary}"`);
  ok(await page.evaluate(() => !document.querySelector('details.nm-up-done').open), '(a) done section collapsed by default');
  await page.locator('section.block_calendar_upcoming').screenshot({path: join(TMP, 'upcoming-off-collapsed.png')});

  // ---------- (b) tick / untick ----------
  await page.locator('#nm-up-cb-30587').click();
  await until(page, () => document.querySelector('[data-event-id="30587"]').closest('.nm-up-done'));
  s = await state(page);
  ok(s.rows['30587'].inDone && s.rows['30587'].checked && s.rows['30587'].tag === 'marked done' && s.rows['30587'].edit === 'Edit submission',
    '(b) ticking 30587 moves it to done, tagged "marked done" with "Edit submission"');
  ok(JSON.stringify((await h.getStorage('overrides')).overrides) === '{"30587":"done"}', '(b) override stored as {30587:"done"}');
  ok(s.count === '1 to do · 2 done', `(b) header count "${s.count}"`);

  await page.locator('details.nm-up-done > summary').click(); // open, then untick from inside
  await page.waitForTimeout(150);
  await page.locator('section.block_calendar_upcoming').screenshot({path: join(TMP, 'upcoming-off-open.png')});
  await page.locator('#nm-up-cb-30587').click();
  await until(page, () => !document.querySelector('[data-event-id="30587"]').closest('.nm-up-done'));
  await page.waitForTimeout(100);
  s = await state(page);
  ok(!s.rows['30587'].inDone && !s.rows['30587'].checked, '(b) unticking moves 30587 back to to-do');
  ok(JSON.stringify((await h.getStorage('overrides')).overrides) === '{}', '(b) unticking removes the override (back to auto)');
  ok(s.order.join() === '33794,30587,33795,28754', `(b) to-do keeps Moodle's order (${s.order.join()})`);

  // keyboard: Space on the focused checkbox toggles it, focus survives the rebuild
  await page.locator('#nm-up-cb-33795').focus();
  await page.keyboard.press('Space');
  await until(page, () => document.querySelector('[data-event-id="33795"]').closest('.nm-up-done'));
  ok(await page.evaluate(() => document.activeElement?.id === 'nm-up-cb-33795'), '(b) keyboard Space marks done and keeps focus');
  await page.keyboard.press('Space');
  await until(page, () => !document.querySelector('[data-event-id="33795"]').closest('.nm-up-done'));

  // untick an AUTO-done row -> override 'todo'; re-tick -> override removed
  await page.locator('#nm-up-cb-28754').click();
  await until(page, () => !document.querySelector('[data-event-id="28754"]').closest('.nm-up-done'));
  ok(JSON.stringify((await h.getStorage('overrides')).overrides) === '{"28754":"todo"}', '(b) unticking auto-done 28754 stores {28754:"todo"}');
  await page.locator('#nm-up-cb-28754').click();
  await until(page, () => document.querySelector('[data-event-id="28754"]').closest('.nm-up-done'));
  ok(JSON.stringify((await h.getStorage('overrides')).overrides) === '{}', '(b) re-ticking it deletes the override');

  // other tab writes overrides -> this tab follows
  await h.setStorage({overrides: {33795: 'done'}});
  await until(page, () => document.querySelector('[data-event-id="33795"]').closest('.nm-up-done'));
  ok(true, '(b) storage change from elsewhere re-renders (NM.watch)');
  await h.setStorage({overrides: {}});
  await until(page, () => !document.querySelector('[data-event-id="33795"]').closest('.nm-up-done'));

  // ---------- (e) Moodle re-renders the block ----------
  await page.evaluate(html => { document.querySelector('section.block_calendar_upcoming').innerHTML = html; },
    readFileSync(join(ROOT, 'fixtures', 'dashboard.html'), 'utf8').match(/data-block="calendar_upcoming"[^>]*>([\s\S]*?)<\/section>/)[1]);
  await until(page, () => document.querySelector('[data-event-id="28754"]').closest('.nm-up-done') && document.querySelector('.nm-up-count'));
  s = await state(page);
  ok(s.rows['28754'].inDone && s.rows['30587'].checkbox && !s.rows['33794'].checkbox && s.details === 1 && s.count === '2 to do · 1 done',
    '(e) replacing the block innerHTML re-applies the split');
  // no mutation loop: the DOM settles
  const settled = await page.evaluate(() => new Promise(res => {
    let n = 0; const mo = new MutationObserver(r => { n += r.length; });
    mo.observe(document.querySelector('section.block_calendar_upcoming'), {childList: true, subtree: true, attributes: true});
    setTimeout(() => { mo.disconnect(); res(n); }, 500);
  }));
  ok(settled === 0, `(e) no mutation loop (${settled} mutations in 500ms after re-apply)`);

  // visibilitychange refetches
  const before = h.calls.length;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(300);
  const names = h.calls.slice(before).map(c => c.methodname);
  ok(names.includes('core_calendar_get_calendar_upcoming_view') && names.includes('core_calendar_get_action_events_by_timesort'), '(dyn) visibilitychange refetches U and A');
  const a = h.calls.find(c => c.methodname === 'core_calendar_get_action_events_by_timesort').args;
  ok(a.timesortfrom === 1793138460 && a.timesortto === 1793829301 && a.limitnum === 50, `(dyn) A range ${a.timesortfrom}..${a.timesortto} limit ${a.limitnum}`);
  await h.close();
}

// ---------- pagination with aftereventid ----------
{
  const all = Array.from({length: 120}, (_, i) => ({id: 50000 + i, timesort: 1793000000 + i}));
  const U = all.map(e => ({...e, name: 'E' + e.id, modulename: 'assign', eventtype: 'due', isactionevent: true, timestart: e.timesort}));
  const h = await launch({mock: {
    core_calendar_get_calendar_upcoming_view: {events: U},
    core_calendar_get_action_events_by_timesort: args => {
      const start = args.aftereventid ? all.findIndex(e => e.id === args.aftereventid) + 1 : 0;
      return {events: all.filter(e => e.id !== 50119).slice(start, start + args.limitnum)};
    },
  }, local: {doneIds: [50119]}});
  const page = await h.open('/my/');
  await page.waitForTimeout(300);
  const pages = h.calls.filter(c => c.methodname === 'core_calendar_get_action_events_by_timesort').map(c => c.args.aftereventid ?? null).slice(0, 4);
  // (the fixture's rows aren't in this U, so one extra refetch for the unknown rows follows; look at the first load only)
  ok((pages[3] ?? null) === null && pages[0] === null && pages[1] === 50049 && pages[2] === 50099, `(pag) paginated with aftereventid: ${pages.join(', ')}`);
  ok(JSON.stringify((await h.getLocal('doneIds')).doneIds) === '[50119]', '(pag) only the missing id counts as done');
  await h.close();
}

// ---------- (c) API error ----------
{
  const h = await launch({mock: {core_calendar_get_action_events_by_timesort: undefined}});
  const page = await h.open('/my/');
  await until(page, () => document.querySelector('.nm-up-note'));
  const s = await state(page);
  ok(s.details === 0 && s.note === 1 && !s.count, '(c) API error: no .nm-up-done, no count, one .nm-up-note');
  ok(Object.values(s.rows).every(r => !r.checkbox) && s.order.join() === '33794,28754,30587,33795', "(c) Moodle's rows untouched, in Moodle's order");
  ok(await page.evaluate(() => !document.querySelector('section.block_calendar_upcoming [class*="nm-up-row"]')), '(c) no row decorations');
  await page.locator('section.block_calendar_upcoming').screenshot({path: join(TMP, 'upcoming-off-error.png')});
  await h.close();
}

// ---------- (d) confetti on the deterministic diff ----------
{
  const A = {...mock.core_calendar_get_action_events_by_timesort,
    events: mock.core_calendar_get_action_events_by_timesort.events.filter(e => e.id !== 30587)};
  const h = await launch({mock: {core_calendar_get_action_events_by_timesort: A}, local: {doneIds: [28754]}});
  const page = await h.open('/my/');
  await page.waitForTimeout(300);
  ok(JSON.stringify((await h.getLocal('doneIds')).doneIds) === '[28754,30587]', '(d) doneIds updated to [28754,30587] after the diff');

  const evalIso = await isolated(page);
  ok(!!evalIso, '(d) found the content-script isolated world');
  if (evalIso) {
    // Spy, reset the stored set to the old one, and trigger a refetch: 30587 is new again -> confetti.
    await evalIso(`globalThis.__spy = []; NM.confetti = o => __spy.push(o); 1`);
    await h.sw.evaluate(() => chrome.storage.local.set({doneIds: [28754]}));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(400);
    const spy = await evalIso('JSON.stringify(__spy)');
    ok(spy === '[{"power":"big","reason":"done"}]', `(d) NM.confetti called once with ${spy}`);
    // Same set again -> no new confetti.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(400);
    ok(await evalIso('__spy.length') === 1, '(d) no confetti when nothing new is done');
  }
  const s = await state(page);
  ok(s.rows['30587'].inDone && s.rows['30587'].tag === '✓ submitted', '(d) 30587 now auto-done');
  await h.close();
}
{
  // First run (no stored set): store only, never fire.
  const h = await launch();
  const page = await h.open('/my/');
  await page.waitForTimeout(200);
  ok(JSON.stringify((await h.getLocal('doneIds')).doneIds) === '[28754]', '(d) first run stores doneIds [28754]');
  await h.close();
}

// ---------- screenshots: campus-pop, RTL, reduced motion ----------
{
  const h = await launch({storage: {theme: 'campus-pop', overrides: {33795: 'done'}}});
  const page = await h.open('/my/');
  await until(page, () => document.querySelector('.nm-up-done'));
  await page.locator('details.nm-up-done > summary').click();
  await page.waitForTimeout(400);
  await page.locator('section.block_calendar_upcoming').screenshot({path: join(TMP, 'upcoming-campus-pop.png')});
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.body.classList.replace('dir-ltr', 'dir-rtl'); });
  await page.waitForTimeout(100);
  await page.locator('section.block_calendar_upcoming').screenshot({path: join(TMP, 'upcoming-rtl.png')});
  await h.close();
}

console.log(failures ? `\n${failures} FAILED` : '\nall upcoming checks passed');
process.exit(failures ? 1 : 0);
