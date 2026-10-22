// E2E for feature 5 (shortcuts bar) in real Chromium with the unpacked extension.
//   node tests/shortcuts.e2e.mjs            (screenshots -> tests/tmp/shortcuts-*.png)
// The "Example Domain" auto-fill is a real network fetch from the service worker; if the network is down,
// example.com is stubbed (and the output says so).
import {launch} from './harness.mjs';
import {mkdirSync} from 'node:fs';

mkdirSync(new URL('./tmp/', import.meta.url), {recursive: true});
const shot = name => new URL(`./tmp/shortcuts-${name}.png`, import.meta.url).pathname;
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const sc = h => h.getStorage('shortcuts').then(r => r.shortcuts || []);
const until = async (fn, ms = 10000) => { const end = Date.now() + ms; let v; while (!(v = await fn()) && Date.now() < end) await new Promise(r => setTimeout(r, 100)); return v; };

// ---------------------------------------------------------------- functional flows
{
  const h = await launch();
  const online = await h.sw.evaluate(async () => { try { return (await fetch('https://example.com/', {signal: AbortSignal.timeout(6000)})).ok; } catch { return false; } });
  // Stubs served to the service worker's fetch: a slow page (to see the spinner and title cleanup), and example.com when offline.
  await h.context.route('https://nm-stub.test/**', async route => {
    await new Promise(r => setTimeout(r, 1200));
    route.fulfill({contentType: 'text/html; charset=utf-8', body: '<html><head><title>Lecture notes &amp; slides | Some Course Site</title><meta content="Weekly notes" property="og:description"></head><body></body></html>'});
  });
  if (!online) await h.context.route('https://example.com/**', r => r.fulfill({contentType: 'text/html', body: '<title>Example Domain</title>'}));
  console.log(online ? '· network: online (real fetch of example.com)' : '· network: OFFLINE, example.com stubbed');

  const page = await h.open('/my/');
  const slotOrder = await page.evaluate(() => [...document.querySelector('.nm-header-slot').children].map(c => c.className));
  ok(slotOrder[0] === 'nm-sc-bar' && slotOrder.at(-1) === 'nm-theme-wrap', `bar is first in the header slot, theme picker last (${slotOrder.join(', ')})`);
  ok(await page.locator('.nm-sc-add').innerText() === 'Add shortcut', 'empty state shows "+ Add shortcut"');

  // Open the add popover
  await page.click('.nm-sc-add');
  ok(await page.isVisible('.nm-sc-pop'), 'add popover opens');
  ok(await page.evaluate(() => document.activeElement.id) === 'nm-sc-url', 'URL field is focused');
  ok(await page.locator('.nm-sc-suggestion').count() === 6, '6 HUJI quick-add suggestions');

  // Validation: http(s) only
  await page.fill('#nm-sc-url', 'javascript:alert(1)');
  await page.click('.nm-sc-save');
  ok(/http/.test(await page.innerText('.nm-sc-error')), `rejects javascript: URL ("${await page.innerText('.nm-sc-error')}")`);
  ok((await sc(h)).length === 0, 'nothing saved after a rejected URL');

  // Spinner + title cleanup on a slow page
  await page.fill('#nm-sc-url', 'nm-stub.test/notes');
  const spun = await page.waitForSelector('.nm-sc-spinner:not([hidden])', {timeout: 3000}).then(() => true, () => false);
  ok(spun, 'spinner shows in the name field while fetching');
  if (spun) await page.screenshot({path: shot('spinner'), clip: {x: 0, y: 50, width: 1280, height: 480}});
  const stubName = await until(async () => (await page.inputValue('#nm-sc-name')) || null, 8000);
  if (stubName === 'nm-stub' || stubName === 'Nm-stub') console.log('· (stub route not applied to service-worker fetches; skipped title-cleanup check)');
  else ok(stubName === 'Lecture notes & slides', `title cleaned: "Lecture notes &amp; slides | Some Course Site" -> "${stubName}"`);

  // Real example: normalizes and auto-fills "Example Domain"
  await page.fill('#nm-sc-name', '');
  await page.fill('#nm-sc-url', 'example.com');
  const name = await until(async () => { const v = await page.inputValue('#nm-sc-name'); return v && v !== 'Lecture notes & slides' ? v : null; }, 12000);
  ok(name === 'Example Domain', `auto-filled name: "${name}"`);
  ok(await page.locator('.nm-sc-preview-title').innerText() === 'Example Domain', 'live preview shows the page title');
  ok(await page.locator('.nm-sc-preview-host').innerText() === 'example.com', 'live preview shows the host');

  // Typed names win over auto-fill
  await page.fill('#nm-sc-name', 'My name');
  await page.fill('#nm-sc-url', 'https://example.com/?x=1');
  await page.waitForTimeout(1500);
  ok(await page.inputValue('#nm-sc-name') === 'My name', "auto-fill doesn't overwrite a name the user typed");
  await page.fill('#nm-sc-name', '');
  await page.fill('#nm-sc-url', 'example.com');
  await until(async () => await page.inputValue('#nm-sc-name') === 'Example Domain', 8000);
  await page.click('.nm-sc-save');

  // Chip + storage
  const chip = page.locator('.nm-sc-chip').first();
  await chip.waitFor();
  const a = await page.evaluate(() => { const l = document.querySelector('.nm-sc-link'); return {href: l.getAttribute('href'), target: l.target, rel: l.rel, text: l.innerText.trim()}; });
  ok(a.href === 'https://example.com/' && a.target === '_blank' && a.rel.includes('noopener'), `chip link: ${JSON.stringify(a)}`);
  ok(a.text === 'Example Domain', 'chip shows the title');
  const icon = await until(() => page.evaluate(() => {
    const img = document.querySelector('.nm-sc-chip .nm-sc-favicon');
    if (document.querySelector('.nm-sc-chip .nm-sc-letter')) return 'letter-avatar';
    return img?.complete && img.naturalWidth > 0 ? `favicon ${img.naturalWidth}px from ${new URL(img.src).host}` : null;
  }), 8000);
  ok(!!icon && (await page.evaluate(() => document.querySelector('.nm-sc-chip .nm-sc-icon')?.getBoundingClientRect().width)) === 16, `chip renders a 16px icon (${icon})`);
  const chipH = await chip.evaluate(n => n.getBoundingClientRect().height);
  ok(chipH >= 28 && chipH <= 32, `chip height ${chipH}px`);
  let stored = await sc(h);
  ok(stored.length === 1 && stored[0].url === 'https://example.com/' && stored[0].title === 'Example Domain' && stored[0].id, `persisted in sync storage: ${JSON.stringify(stored)}`);
  const cache = (await h.getLocal('previews')).previews || {};
  ok(cache['https://example.com/']?.title === 'Example Domain' && cache['https://example.com/'].t > 0, 'preview cached in local storage with a timestamp');

  // Duplicate
  await page.click('.nm-sc-add');
  await page.fill('#nm-sc-url', 'https://example.com');
  await page.click('.nm-sc-save');
  ok(/already/.test(await page.innerText('.nm-sc-error')), 'duplicate URL is rejected');
  await page.keyboard.press('Escape');
  ok(await page.isHidden('.nm-sc-pop') && await page.evaluate(() => document.activeElement.classList.contains('nm-sc-add')), 'Escape closes the popover and returns focus to + Add');

  // Reload: still there
  await page.reload({waitUntil: 'load'});
  await page.waitForSelector('.nm-sc-chip');
  await page.waitForTimeout(600); // same settle time as h.open()
  ok(await page.locator('.nm-sc-chip').count() === 1, 'chip survives a reload');

  // Hover preview card
  await page.hover('.nm-sc-chip');
  await page.waitForSelector('.nm-sc-card:not([hidden])', {timeout: 2000});
  const cardText = await page.innerText('.nm-sc-card');
  ok(cardText.includes('Example Domain') && cardText.includes('example.com'), 'hover shows the preview card with title and host');
  await page.mouse.move(5, 600);
  await page.waitForTimeout(300);
  ok(await page.isHidden('.nm-sc-card'), 'card hides when the pointer leaves');

  // Edit via right-click menu
  await page.click('.nm-sc-chip', {button: 'right'});
  ok(await page.isVisible('.nm-sc-menu'), 'right-click opens the context menu');
  ok(await page.evaluate(() => document.activeElement.matches('.nm-sc-menu-item')), 'menu takes focus');
  await page.click('.nm-sc-menu-item:has-text("Edit")');
  ok(await page.innerText('.nm-sc-pop-title') === 'Edit shortcut' && await page.inputValue('#nm-sc-name') === 'Example Domain', 'edit popover is prefilled');
  await page.fill('#nm-sc-name', 'Example');
  await page.click('.nm-sc-save');
  stored = await sc(h);
  ok(stored.length === 1 && stored[0].title === 'Example' && await page.locator('.nm-sc-title').innerText() === 'Example', 'edit saved to storage and chip');

  // Quick add
  await page.click('.nm-sc-add');
  await page.click('.nm-sc-suggestion[aria-label="Add Shnaton"]');
  await page.click('.nm-sc-suggestion[aria-label="Add Panopto"]');
  await page.keyboard.press('Escape');
  stored = await sc(h);
  ok(stored.map(s => s.title).join() === 'Example,Shnaton,Panopto' && stored[1].url === 'https://shnaton.huji.ac.il/', `quick-add appends (${stored.map(s => s.title).join(', ')})`);

  // Live update from another tab (storage change from the service worker)
  await h.setStorage({shortcuts: [...stored, {id: 'ext', url: 'https://chatgpt.com/', title: 'ChatGPT'}]});
  ok(!!await until(async () => await page.locator('.nm-sc-chip').count() === 4, 3000), 'NM.watch re-renders when another tab changes shortcuts');

  // Edit mode: keyboard reorder + delete + undo
  await page.click('.nm-sc-edit-toggle');
  ok(await page.getAttribute('.nm-sc-edit-toggle', 'aria-pressed') === 'true' && await page.locator('.nm-sc-act-del').count() === 4, 'Edit mode shows delete buttons on every chip');
  await page.mouse.move(5, 700);
  await page.waitForTimeout(300);
  await page.screenshot({path: shot('edit-mode'), clip: {x: 0, y: 50, width: 1280, height: 80}});
  await page.focus('.nm-sc-chip[data-id] .nm-sc-link');
  await page.keyboard.press('ArrowRight');
  stored = await sc(h);
  ok(stored.map(s => s.title).join() === 'Shnaton,Example,Panopto,ChatGPT', `ArrowRight in edit mode moves a chip (${stored.map(s => s.title).join(', ')})`);
  await page.click('.nm-sc-chip:nth-child(2) .nm-sc-act-edit');
  ok(await page.innerText('.nm-sc-pop-title') === 'Edit shortcut', 'pencil button opens the editor');
  await page.keyboard.press('Escape');
  await page.click('.nm-sc-chip:nth-child(2) .nm-sc-act-del');
  stored = await sc(h);
  ok(stored.length === 3 && !stored.some(s => s.title === 'Example'), 'delete button removes the chip from storage');
  ok(await page.isVisible('.nm-sc-toast'), 'undo toast appears');
  await page.click('.nm-sc-toast-undo');
  stored = await sc(h);
  ok(stored.map(s => s.title).join() === 'Shnaton,Example,Panopto,ChatGPT', 'Undo restores it in place');
  await page.click('.nm-sc-edit-toggle');
  ok(await page.locator('.nm-sc-act').count() === 0, 'Done leaves edit mode');

  // Native drag and drop reorder
  await page.locator('.nm-sc-chip').nth(0).dragTo(page.locator('.nm-sc-chip').nth(2), {targetPosition: {x: 60, y: 14}});
  stored = await until(async () => { const s = await sc(h); return s[0].title !== 'Shnaton' ? s : null; }, 3000) || await sc(h);
  ok(stored.map(s => s.title).join() === 'Example,Panopto,Shnaton,ChatGPT', `drag and drop reorders (${stored.map(s => s.title).join(', ')})`);

  // Delete via context menu
  await page.click('.nm-sc-chip:has-text("ChatGPT")', {button: 'right'});
  await page.click('.nm-sc-menu-item:has-text("Delete")');
  stored = await sc(h);
  ok(stored.length === 3 && !stored.some(s => s.title === 'ChatGPT') && await page.locator('.nm-sc-chip').count() === 3, 'context-menu Delete removes the chip');

  await h.close();
}

// ---------------------------------------------------------------- screenshots per theme
const FIVE = [
  {id: 's1', url: 'https://shnaton.huji.ac.il/', title: 'Shnaton'},
  {id: 's2', url: 'https://huji.cloud.panopto.eu/', title: 'Panopto'},
  {id: 's3', url: 'https://mail.google.com/', title: 'Gmail'},
  {id: 's4', url: 'https://github.com/', title: 'GitHub'},
  {id: 's5', url: 'https://chatgpt.com/', title: 'ChatGPT'},
];
for (const theme of ['off', 'quiet-focus', 'campus-pop']) {
  const h = await launch({storage: {theme, shortcuts: FIVE}});
  const page = await h.open('/my/');
  await page.waitForFunction(() => [...document.querySelectorAll('.nm-sc-chip img')].every(i => i.complete), null, {timeout: 8000}).catch(() => {});
  await page.hover('.nm-sc-chip[data-id=s4]');
  await page.waitForSelector('.nm-sc-card:not([hidden]) .nm-sc-card-desc, .nm-sc-card:not([hidden]) .nm-sc-card-hint', {timeout: 10000});
  await page.waitForFunction(() => { const i = document.querySelector('.nm-sc-card-img'); return !i || i.complete; }, null, {timeout: 8000}).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({path: shot(`${theme}-hover`), clip: {x: 0, y: 0, width: 1280, height: 520}});
  await page.mouse.move(5, 700);
  await page.click('.nm-sc-add');
  await page.fill('#nm-sc-url', 'example.com');
  await until(async () => await page.inputValue('#nm-sc-name') === 'Example Domain', 10000);
  await page.waitForTimeout(250);
  await page.screenshot({path: shot(`${theme}-add`), clip: {x: 0, y: 0, width: 1280, height: 560}});
  ok(true, `screenshots for theme ${theme}`);
  await h.close();
}

// Overflow (narrow window, many chips) and RTL
{
  const many = [...FIVE, {id: 'm1', url: 'https://drive.google.com/', title: 'Google Drive'}, {id: 'm2', url: 'https://orbitlive.huji.ac.il/', title: 'Personal info'},
    {id: 'm3', url: 'https://www.wikipedia.org/', title: 'Wikipedia, the free encyclopedia'}, {id: 'm4', url: 'https://nosuchsite-nm.invalid/', title: 'No favicon here'}];
  const h = await launch({storage: {shortcuts: many}, viewport: {width: 900, height: 600}});
  const page = await h.open('/my/');
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const l = document.querySelector('.nm-sc-list'), hd = document.querySelector('#page-header');
    return {scrolls: l.scrollWidth > l.clientWidth, fade: l.classList.contains('nm-sc-more-end'), headerH: hd.getBoundingClientRect().height,
      addVisible: document.querySelector('.nm-sc-add').getBoundingClientRect().right <= innerWidth, letter: !!document.querySelector('[data-id=m4] .nm-sc-letter'),
      titleW: Math.max(...[...document.querySelectorAll('.nm-sc-title')].map(t => t.getBoundingClientRect().width))};
  });
  ok(m.scrolls && m.fade && m.addVisible, `overflow scrolls horizontally with a fade, + Add stays visible (${JSON.stringify(m)})`);
  ok(m.headerH < 90, `header stays one row (${m.headerH}px)`);
  ok(m.titleW <= 141, `titles truncate at 140px (${m.titleW}px)`);
  ok(m.letter, 'missing favicon falls back to a letter avatar');
  m.letter ||= !!await until(() => page.evaluate(() => !!document.querySelector('[data-id=m4] .nm-sc-letter')), 8000);
  await page.screenshot({path: shot('overflow'), clip: {x: 0, y: 50, width: 900, height: 80}});
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.body.classList.replace('dir-ltr', 'dir-rtl'); });
  await page.waitForTimeout(200);
  await page.click('.nm-sc-chip[data-id=s2]', {button: 'right'});
  await page.waitForTimeout(300);
  const rtlMenu = await page.evaluate(() => {
    const m = document.querySelector('.nm-sc-menu').getBoundingClientRect(), c = document.querySelector('[data-id=s2]').getBoundingClientRect();
    return {menuRight: Math.round(m.right), chipCenter: Math.round(c.left + c.width / 2), first: document.querySelector('.nm-sc-chip').getBoundingClientRect().left > innerWidth / 2};
  });
  ok(rtlMenu.first && Math.abs(rtlMenu.menuRight - rtlMenu.chipCenter) <= 2, `RTL: first chip on the right, menu opens leftward from the cursor (${JSON.stringify(rtlMenu)})`);
  await page.screenshot({path: shot('rtl'), clip: {x: 0, y: 40, width: 900, height: 360}});
  await h.close();
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall shortcut checks passed');
process.exit(failures ? 1 : 0);
