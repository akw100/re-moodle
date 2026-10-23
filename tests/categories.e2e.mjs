// Only sanitized live fixtures, routed by the harness; never the remote Moodle site.
import {launch} from './harness.mjs';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const themes = ['quiet-focus', 'ahead', 'fal', 'cloudstudio', 'butter', 'clay', 'night-operator', 'giga', 'daily-quest', 'campus-pop'];
const ok = text => console.log('  ✓ ' + text);
const selector = '[data-region="courses-view"] .categoryname';
const h = await launch({live: true, storage: {theme: 'campus-pop', motion: 'off'}, viewport: {width: 1440, height: 1000}});
try {
  let page = await h.open('/my/');
  const read = () => page.locator(selector).evaluateAll(tags => tags.map(t => ({name: t.textContent.trim(), slot: +t.dataset.nmCatSlot})));
  const initial = await read();
  const business = initial.filter(t => t.name === 'Business Administration');
  assert.equal(business.length, 4);
  assert.equal(new Set(business.map(t => t.slot)).size, 1);
  const bs = business[0].slot;
  assert.ok(bs >= 1);
  assert.notEqual(initial.find(t => t.name === 'Computer Science').slot, bs);
  const saved = (await h.getStorage('catSlots')).catSlots;
  assert.equal(saved['business administration'], bs);
  assert.equal(saved['business administration'], 1);
  assert.equal(saved['computer science'], 2);
  ok('four Business Administration cards share slot 1; Computer Science uses slot 2; storage persists alphabetical allocation');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.categoryname[data-nm-cat-slot]'));
  assert.deepEqual(await read(), initial);
  await page.evaluate(() => {
    const view = document.querySelector('[data-region="courses-view"]');
    view.innerHTML = view.innerHTML.replaceAll(/ data-nm-cat-slot="\d+"/g, '');
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-region="courses-view"] .categoryname')].every(t => t.dataset.nmCatSlot));
  assert.deepEqual(await read(), initial);
  ok('reload and courses-view re-render retain slots');
  await page.locator(selector).first().evaluate(t => { t.textContent = '  New   Department  '; });
  await page.waitForFunction(() => document.querySelector('[data-region="courses-view"] .categoryname').dataset.nmCatSlot === '3');
  assert.equal((await h.getStorage('catSlots')).catSlots['new department'], 3);
  await page.locator(selector).first().evaluate(t => { t.textContent = ' BUSINESS   ADMINISTRATION '; });
  await page.waitForFunction(() => document.querySelector('[data-region="courses-view"] .categoryname').dataset.nmCatSlot === '1');
  ok('new category takes lowest unused slot; whitespace and case normalize');
  await h.setStorage({catSlots: {...saved, 'new department': 3, 'business administration': 4}});
  await page.waitForFunction(() => document.querySelector('[data-region="courses-view"] .categoryname').dataset.nmCatSlot === '4');
  ok('storage watch reapplies another tab’s mapping');
  // Overflow, arbitrary languages and object-prototype names remain safe and deterministic.
  await page.evaluate(() => {
    const view = document.querySelector('[data-region="courses-view"]');
    for (const name of ['Zulu', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'constructor', 'מדעי המחשב']) {
      const card = document.createElement('div'); card.className = 'course-card';
      const tag = document.createElement('span'); tag.className = 'categoryname'; tag.textContent = name;
      card.append(tag); view.append(card);
    }
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-region="courses-view"] .categoryname')].every(t => t.dataset.nmCatSlot));
  await page.waitForTimeout(150);
  const overflow = (await h.getStorage('catSlots')).catSlots;
  const counts = Array(8).fill(0); Object.values(overflow).forEach(s => counts[s - 1]++);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  assert.equal(overflow['business administration'], 4);
  assert.ok(Object.hasOwn(overflow, 'constructor'));
  ok('more than eight categories reuse least-used slots; Hebrew and prototype-like names work');
  await page.close();
  await h.setStorage({catSlots: saved});
  mkdirSync('tests/tmp/codex', {recursive: true});
  for (const theme of themes) {
    await h.setStorage({theme});
    page = await h.open('/my/');
    await page.evaluate(() => document.fonts.ready);
    const checks = await page.locator(selector).evaluateAll(tags => tags.map(tag => {
      const css = getComputedStyle(tag);
      const probe = document.createElement('span'); tag.append(probe);
      probe.style.backgroundColor = `var(--nm-cat-${tag.dataset.nmCatSlot})`;
      const expected = getComputedStyle(probe).backgroundColor; probe.remove();
      return {actual: css.backgroundColor, expected, color: css.color,
        cardSlot: tag.closest('[data-region="course-content"], .course-card, .dashboard-card').dataset.nmCatSlot,
        slot: tag.dataset.nmCatSlot};
    }));
    for (const c of checks) { assert.equal(c.actual, c.expected, theme); assert.equal(c.cardSlot, c.slot); }
    // Check every one of the eight rendered palette colors, not just the fixture’s two.
    const ratios = await page.locator(selector).first().evaluate(tag => {
      const rgb = s => s.match(/[\d.]+/g).map(Number);
      const lum = s => rgb(s).slice(0, 3).map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const original = tag.style.getPropertyValue('--nm-cat-color');
      const ratios = [];
      for (let i = 1; i <= 8; i++) {
        tag.style.setProperty('--nm-cat-color', `var(--nm-cat-${i})`);
        const cs = getComputedStyle(tag), a = lum(cs.color), b = lum(cs.backgroundColor);
        ratios.push((Math.max(a, b) + .05) / (Math.min(a, b) + .05));
      }
      tag.style.setProperty('--nm-cat-color', original);
      return ratios;
    });
    assert.ok(ratios.every(r => r >= 4.5), `${theme}: ${ratios}`);
    assert.deepEqual(await read(), initial);
    const grid = page.locator('.block_myoverview');
    const bounds = await grid.boundingBox();
    await page.setViewportSize({width: 1440, height: Math.max(1000, Math.ceil(bounds.height) + 180)});
    await grid.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 90));
    await grid.screenshot({path: `tests/tmp/codex/cats-${theme}.png`});
    ok(`${theme}: computed tag backgrounds match palette; all eight contrast ratios >= ${Math.min(...ratios).toFixed(2)}:1; 1440px grid captured`);
    await page.close();
  }
  page = await h.open('/course/view.php?id=1230');
  assert.equal(await page.locator('[data-nm-cat-slot]').count(), 0);
  assert.deepEqual((await h.getStorage('catSlots')).catSlots, saved);
  await page.close();
  page = await h.open('/my/');
  await page.locator('[data-region="courses-view"]').evaluateAll(views => views.forEach(v => v.replaceChildren()));
  await page.waitForTimeout(100);
  assert.deepEqual((await h.getStorage('catSlots')).catSlots, saved);
  ok('off-dashboard and empty cards are no-ops');
  console.log('\nPASS categories.e2e');
} finally { await h.close(); }
