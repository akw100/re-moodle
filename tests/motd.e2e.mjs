// E2E for the header message (src/features/motd.js) on the live dashboard copy, in real Chromium with the extension.
//   node tests/motd.e2e.mjs
import {launch} from './harness.mjs';
import assert from 'node:assert/strict';

const ok = m => console.log('  ✓ ' + m);
const THEMES = ['off', 'campus-pop', 'cloudstudio', 'night-operator'];

const motd = page => page.locator('#page-header .nm-motd');
const msg = page => page.locator('#page-header .nm-motd-text').textContent();
const data = (page, k) => motd(page).getAttribute('data-' + k);
// Click (or press a key on) the message and wait for the new text. Returns it.
const settle = page => page.waitForFunction(() => !document.querySelector('.nm-motd-btn')?.getAnimations().length, null, {timeout: 2000});
async function shuffle(page, how = 'click') {
  await settle(page);
  const before = await msg(page);
  if (how === 'click') await page.locator('.nm-motd-btn').click();
  else { await page.locator('.nm-motd-btn').focus(); await page.keyboard.press(how); }
  await page.waitForFunction(b => document.querySelector('.nm-motd-text')?.textContent !== b, before, {timeout: 2000});
  await settle(page);
  return msg(page);
}

const h = await launch({live: true, storage: {theme: 'off'}});
try {
  let page = await h.open('/my/');

  // The h1 stays for screen readers, visually hidden (not display:none).
  const h1 = await page.$eval('#page-header .page-header-headings h1', el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return {text: el.textContent.trim(), display: cs.display, clip: cs.clipPath, w: r.width, h: r.height};
  });
  assert.equal(h1.text, 'Dashboard');
  assert.notEqual(h1.display, 'none');
  assert.ok(h1.w <= 1 && h1.h <= 1 && /inset\(50%\)/.test(h1.clip), `h1 visually hidden (${JSON.stringify(h1)})`);
  assert.equal(await page.getByRole('heading', {level: 1, name: 'Dashboard'}).count(), 1, 'h1 still in the accessibility tree');
  ok('"Dashboard" h1 is visually hidden but still the page heading');

  // A message shows, as a button labelled "Shuffle message" whose description is the message.
  await motd(page).waitFor({state: 'visible'});
  const first = await msg(page);
  assert.ok(first.length > 5 && !first.includes('{'), `message shows: "${first}"`);
  const btn = page.locator('.nm-motd-btn');
  assert.equal(await btn.getAttribute('aria-label'), 'Shuffle message');
  assert.equal(await btn.getAttribute('title'), 'Shuffle message');
  assert.equal(await page.getByRole('button', {name: 'Shuffle message'}).count(), 1);
  assert.equal(await page.$eval('.nm-motd-btn', b => b.getAttribute('aria-describedby') && document.getElementById(b.getAttribute('aria-describedby'))?.textContent), first);
  ok(`message shows ("${first}") as a "Shuffle message" button`);

  // Clicking changes it, never to the same line twice in a row; Enter and Space work too.
  let prev = first;
  for (let i = 0; i < 12; i++) { const m = await shuffle(page); assert.notEqual(m, prev); assert.ok(!m.includes('{')); prev = m; }
  for (const key of ['Enter', ' ']) { const m = await shuffle(page, key); assert.notEqual(m, prev); prev = m; }
  ok('click, Enter and Space each shuffle to a different message (14 in a row, no repeats)');

  // No gamepad button in the header any more.
  assert.equal(await page.locator('.nm-game-btn').count(), 0);
  assert.equal(await page.locator('#page-header .nm-header-slot .nm-svg-gamepad').count(), 0);
  ok('no gamepad header button');

  // Voice from storage (popup or another tab) applies live and filters every shuffle.
  await h.setStorage({voice: 'stoic'});
  await page.waitForFunction(() => document.querySelector('.nm-motd')?.dataset.voice === 'stoic', null, {timeout: 2000});
  for (let i = 0; i < 8; i++) { await shuffle(page); assert.equal(await data(page, 'voice'), 'stoic'); }
  ok('voice "stoic" set in storage applies live; 8 shuffles all stoic');

  // ...and from the theme picker's "Header voice" select.
  await page.locator('.nm-theme-btn').click();
  const sel = page.locator('#nm-theme-pop .nm-voice-select');
  await sel.waitFor({state: 'visible'});
  assert.equal(await sel.inputValue(), 'stoic', 'select shows the stored voice');
  assert.equal(await page.locator('label[for="nm-voice-select"]').textContent(), 'Header voice');
  await sel.selectOption('mom');
  await page.waitForFunction(() => document.querySelector('.nm-motd')?.dataset.voice === 'mom', null, {timeout: 2000});
  assert.equal((await h.getStorage('voice')).voice, 'mom');
  await page.keyboard.press('Escape');
  for (let i = 0; i < 5; i++) { await shuffle(page); assert.equal(await data(page, 'voice'), 'mom'); }
  ok('picker select stores voice "mom"; messages follow');

  // Templates fill from a dispatched nm:upcoming event. upcoming.js dispatches in the extension's world with an object
  // detail; an object made in the page's world arrives as null over there, so the test sends JSON (motd.js accepts both).
  await h.setStorage({voice: 'tough-love'});
  await page.waitForFunction(() => document.querySelector('.nm-motd')?.dataset.voice === 'tough-love', null, {timeout: 2000});
  await page.evaluate(() => {
    document.documentElement.dataset.nmMotdForce = 'data';
    const timesort = Math.round(Date.now() / 1000 + 5 * 3600 + 60);
    document.dispatchEvent(new CustomEvent('nm:upcoming', {detail: JSON.stringify({todo: 7, done: 3, next: {name: 'Essay 9 &amp; bibliography is due', timesort}})}));
  });
  const values = /\b7 things\b|\b7 to go\b|\b3 things\b|Essay 9 & bibliography|5 hours/;
  for (let i = 0; i < 6; i++) {
    const m = await shuffle(page);
    assert.equal(await data(page, 'kind'), 'data');
    assert.ok(values.test(m) && !m.includes('{'), `template filled from the event: "${m}"`);
  }
  ok(`templates fill from nm:upcoming (e.g. "${await msg(page)}")`);
  // An all-clear event: a showing count line swaps for one that fits.
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('nm:upcoming', {detail: JSON.stringify({todo: 0, done: 4, next: null})})));
  await page.waitForTimeout(100);
  const clear = await msg(page);
  assert.ok(!/\b7\b|Essay 9/.test(clear) && !clear.includes('{'), `stale numbers replaced: "${clear}"`);
  ok(`fresh data updates the showing line ("${clear}")`);
  await page.evaluate(() => { delete document.documentElement.dataset.nmMotdForce; });

  // The real upcoming feature publishes the event too (mocked Moodle API) and keeps NM.upcomingSummary.
  await page.close();
  await h.setStorage({voice: 'mixed'});
  page = await h.open('/my/');
  const viaUpcoming = await page.evaluate(() => new Promise(res => {
    document.addEventListener('nm:upcoming', () => res('seen'), {once: true});
    document.querySelector('section.block_calendar_upcoming input.nm-up-cb')?.click(); // a manual tick republishes
    setTimeout(() => res('timeout'), 1500);
  }));
  assert.notEqual(viaUpcoming, 'timeout', 'upcoming.js dispatched nm:upcoming');
  ok('upcoming.js dispatches nm:upcoming after a change');
  await page.close();

  // Motion off: the swap is immediate.
  await h.setStorage({motion: 'off'});
  page = await h.open('/my/');
  const t0 = await msg(page);
  await page.locator('.nm-motd-btn').click();
  assert.notEqual(await msg(page), t0, 'immediate swap with motion off');
  ok('motion off: no animation, immediate swap');
  await page.close();
  await h.setStorage({motion: 'on'});

  // Every theme: readable (>= 4.5:1 on the background behind it) and not the theme's giant h1 size.
  for (const theme of THEMES) {
    await h.setStorage({theme});
    page = await h.open('/my/');
    const r = await page.$eval('.nm-motd', el => {
      const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      let n = el, bg = null;
      while (n && n.nodeType === 1) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > .5) { bg = c; break; } n = n.parentElement; }
      bg ||= [255, 255, 255];
      const fg = rgb(getComputedStyle(el).color);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      return {ratio: (a + .05) / (b + .05), size: parseFloat(getComputedStyle(el).fontSize), fg, bg};
    });
    assert.ok(r.ratio >= 4.5, `${theme}: contrast ${r.ratio.toFixed(2)} (${r.fg} on ${r.bg})`);
    assert.ok(r.size <= 32.5, `${theme}: font-size ${r.size}px`);
    ok(`${theme}: contrast ${r.ratio.toFixed(2)}:1, ${r.size.toFixed(1)}px`);
    await page.close();
  }

  console.log('\nPASS motd.e2e');
} finally {
  await h.close();
}
