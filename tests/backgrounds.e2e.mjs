// E2E for custom course-card and block backgrounds (src/features/backgrounds.js), on the live dashboard copy.
//   node tests/backgrounds.e2e.mjs
import {launch, ROOT} from './harness.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

let passed = 0;
const ok = async (name, fn) => { await fn(); passed++; console.log('  ✓', name); };
const ID = '8141';
const CARD = `.course-card[data-course-id="${ID}"]`;
const POP = '#nm-bg-pop-course', BPOP = '#nm-bg-pop-block';
const courseBg = async h => (await h.getStorage('courseBg')).courseBg ?? {};
const imgState = page => page.$eval(`${CARD} .card-img-top`, img => ({
  style: img.getAttribute('style') || '',
  bgPriority: img.style.getPropertyPriority('background-color'),
  bgImage: getComputedStyle(img).backgroundImage,
  bgColor: getComputedStyle(img).backgroundColor,
  cls: img.className,
  cardBg: img.closest('.course-card').style.getPropertyValue('--nm-course-bg'),
  cardColor: img.closest('.course-card').style.getPropertyValue('--nm-course-color'),
}));
async function openCourse(page) {
  const card = page.locator(CARD);
  await card.evaluate(e => e.scrollIntoView({block: 'center', behavior: 'instant'}));
  await card.hover();
  await card.locator('.nm-bg-btn').click();
  await page.waitForSelector(`${POP}:popover-open`);
}
const pick = (page, kind, value) => page.click(`${POP} .nm-bg-opt[data-kind="${kind}"]${value != null ? `[data-value="${value}"]` : ''}`);

const h = await launch({live: true, storage: {theme: 'campus-pop'}, viewport: {width: 1440, height: 1000}});
// A same-origin-free test image for the Image URL field (non-Moodle hosts would hit the network otherwise).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
await h.context.route('https://img.example.test/**', r => r.request().url().endsWith('.png')
  ? r.fulfill({contentType: 'image/png', body: PNG}) : r.fulfill({status: 404, body: ''}));
try {
  const page = await h.open('/my/');

  await ok('every course card and every block gets a hidden brush button', async () => {
    const n = await page.evaluate(() => ({
      cards: document.querySelectorAll('.course-card[data-course-id]').length,
      cardBtns: document.querySelectorAll('.course-card > .nm-bg-btn-course').length,
      blocks: document.querySelectorAll('#block-region-content section.block[data-block], #nm-top-row > .nm-block').length,
      blockBtns: document.querySelectorAll('.nm-bg-btn-block').length,
      label: document.querySelector('.nm-bg-btn-course').getAttribute('aria-label'),
      title: document.querySelector('.nm-bg-btn-course').title,
      size: document.querySelector('.nm-bg-btn-course').offsetWidth,
      op: getComputedStyle(document.querySelector('.nm-bg-btn-course')).opacity,
    }));
    assert.ok(n.cards >= 4 && n.cardBtns === n.cards, JSON.stringify(n));
    assert.ok(n.blocks >= 6 && n.blockBtns === n.blocks, JSON.stringify(n));
    assert.equal(n.title, 'Customize background');
    assert.match(n.label, /^Customize background: .+Operations/);
    assert.equal(n.size, 28);
    assert.equal(n.op, '0', 'hidden until hover/focus');
  });

  await ok('the popover opens from the card button (top layer, focus on a tile, aria-expanded)', async () => {
    await openCourse(page);
    const s = await page.evaluate(([POP, CARD]) => {
      const pop = document.querySelector(POP), r = pop.getBoundingClientRect();
      return {open: pop.matches(':popover-open'), expanded: document.querySelector(`${CARD} .nm-bg-btn`).getAttribute('aria-expanded'),
        focused: document.activeElement.matches(`${POP} .nm-bg-opt`), pressed: document.activeElement.dataset.kind,
        groups: [...pop.querySelectorAll('.nm-bg-group')].map(g => g.getAttribute('aria-label')),
        counts: ['color', 'gradient', 'pattern'].map(k => pop.querySelectorAll(`.nm-bg-opt[data-kind="${k}"]`).length),
        unlabeled: [...pop.querySelectorAll('.nm-bg-opt')].filter(b => !b.getAttribute('aria-label')).length,
        inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight};
    }, [POP, CARD]);
    assert.equal(s.open, true);
    assert.equal(s.expanded, 'true');
    assert.equal(s.focused, true);
    assert.equal(s.pressed, 'default', 'Theme default is the current choice');
    assert.deepEqual(s.groups, ['Start from', 'Colors', 'Gradients', 'Patterns']);
    assert.deepEqual(s.counts, [14, 11, 10]);
    assert.equal(s.unlabeled, 0);
    assert.ok(s.inView);
    assert.ok(await page.isVisible(`${POP} #nm-bg-url`));
  });

  await ok('arrow keys move through the swatch grid', async () => {
    await page.focus(`${POP} .nm-bg-opt[data-kind="color"][data-value="#ef5b5b"]`);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Tangerine');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Violet');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Coral');
  });

  await ok('a color persists in storage and applies inline with !important, plus the card custom properties', async () => {
    await page.keyboard.press('Enter'); // Coral
    await page.waitForFunction(id => document.querySelector(`.course-card[data-course-id="${id}"]`).classList.contains('nm-bg-set'), ID);
    assert.deepEqual((await courseBg(h))[ID], {kind: 'color', value: '#ef5b5b'});
    const s = await imgState(page);
    assert.equal(s.bgPriority, 'important');
    assert.equal(s.bgColor, 'rgb(239, 91, 91)');
    assert.equal(s.bgImage, 'none');
    assert.match(s.cls, /nm-bg-img/);
    assert.equal(s.cardColor, '#ef5b5b');
    assert.equal(s.cardBg, '#ef5b5b');
    assert.equal(await page.getAttribute(`${POP} .nm-bg-opt[data-value="#ef5b5b"]`, 'aria-pressed'), 'true');
  });

  await ok('a pattern takes the last picked color; a gradient applies', async () => {
    await pick(page, 'pattern', 'waves');
    await page.waitForFunction(id => document.querySelector(`.course-card[data-course-id="${id}"]`).dataset.nmBgKind === 'pattern', ID);
    assert.deepEqual((await courseBg(h))[ID], {kind: 'pattern', value: 'waves', color: '#ef5b5b'});
    let s = await imgState(page);
    assert.match(s.bgImage, /radial-gradient/);
    assert.equal(s.bgColor, 'rgb(239, 91, 91)');
    assert.equal(s.cardColor, '#ef5b5b');
    await pick(page, 'gradient', 'lagoon');
    await page.waitForFunction(id => document.querySelector(`.course-card[data-course-id="${id}"]`).dataset.nmBgKind === 'gradient', ID);
    s = await imgState(page);
    assert.match(s.bgImage, /^linear-gradient/);
    assert.deepEqual((await courseBg(h))[ID], {kind: 'gradient', value: 'lagoon'});
  });

  await ok('Image URL accepts https only, previews, and applies', async () => {
    await page.fill(`${POP} #nm-bg-url`, 'http://img.example.test/a.png');
    await page.waitForSelector(`${POP} #nm-bg-url[aria-invalid="true"]`);
    assert.match(await page.textContent(`${POP} #nm-bg-url-msg`), /https/);
    assert.ok(await page.isDisabled(`${POP} .nm-bg-apply`));
    await page.fill(`${POP} #nm-bg-url`, 'javascript:alert(1)');
    await page.waitForSelector(`${POP} #nm-bg-url[aria-invalid="true"]`);
    await page.fill(`${POP} #nm-bg-url`, 'https://img.example.test/missing.jpg');
    await page.waitForFunction(p => /Couldn/.test(document.querySelector(`${p} #nm-bg-url-msg`).textContent), POP);
    await page.fill(`${POP} #nm-bg-url`, 'https://img.example.test/a.png');
    await page.waitForSelector(`${POP} .nm-bg-url-prev.is-ok`);
    assert.ok(await page.isEnabled(`${POP} .nm-bg-apply`));
    await page.press(`${POP} #nm-bg-url`, 'Enter');
    await page.waitForFunction(id => document.querySelector(`.course-card[data-course-id="${id}"]`).dataset.nmBgKind === 'image', ID);
    assert.deepEqual((await courseBg(h))[ID], {kind: 'image', value: 'https://img.example.test/a.png'});
    assert.match((await imgState(page)).bgImage, /^url\("https:\/\/img\.example\.test\/a\.png"\)/);
  });

  await ok('Esc closes the popover and returns focus to the button', async () => {
    await page.focus(`${POP} .nm-bg-opt[data-kind="gradient"][data-value="lagoon"]`);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(p => document.querySelector(p).matches(':popover-open'), POP), false);
    assert.equal(await page.evaluate(() => document.activeElement.matches('.nm-bg-btn-course')), true);
    assert.equal(await page.getAttribute(`${CARD} .nm-bg-btn`, 'aria-expanded'), 'false');
  });

  await ok('re-applies after Moodle re-renders [data-region=courses-view]', async () => {
    await openCourse(page);
    await pick(page, 'color', 'var(--nm-accent)');
    await page.keyboard.press('Escape');
    await page.waitForFunction(id => document.querySelector(`.course-card[data-course-id="${id}"]`).dataset.nmBgKind === 'color', ID);
    const fresh = readFileSync(join(ROOT, 'fixtures/live/dashboard.html'), 'utf8');
    await page.evaluate(html => {
      const d = new DOMParser().parseFromString(html, 'text/html');
      const v = document.querySelector('[data-region="courses-view"]');
      v.innerHTML = d.querySelector('[data-region="courses-view"]').innerHTML; // brand-new card elements, no nm- markup
    }, fresh);
    await page.waitForFunction(id => {
      const c = document.querySelector(`.course-card[data-course-id="${id}"]`);
      return c?.classList.contains('nm-bg-set') && c.querySelector(':scope > .nm-bg-btn');
    }, ID);
    const s = await imgState(page);
    assert.equal(s.bgPriority, 'important');
    assert.equal(s.cardColor, 'var(--nm-accent)');
    assert.equal(await page.$$eval('.course-card', cs => cs.filter(c => c.querySelectorAll(':scope > .nm-bg-btn').length !== 1).length), 0, 'exactly one button per card');
    // the observer doesn't loop on its own writes
    const before = await page.evaluate(() => document.querySelector('[data-region="courses-view"]').innerHTML.length);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelector('[data-region="courses-view"]').innerHTML.length), before);
  });

  await ok('Original image restores Moodle\'s own picture over the theme', async () => {
    await openCourse(page);
    await pick(page, 'original');
    await page.waitForFunction(id => document.querySelector(`.course-card[data-course-id="${id}"]`).dataset.nmBgKind === 'original', ID);
    assert.deepEqual((await courseBg(h))[ID], {kind: 'original'});
    assert.match((await imgState(page)).bgImage, /^url\("data:image\/svg\+xml;base64,/);
  });

  await ok('"Theme default" clears the override (storage, inline style and custom properties)', async () => {
    await pick(page, 'default');
    await page.waitForFunction(id => !document.querySelector(`.course-card[data-course-id="${id}"]`).classList.contains('nm-bg-set'), ID);
    assert.equal(ID in (await courseBg(h)), false);
    const s = await imgState(page);
    assert.equal(s.bgPriority, '');
    assert.doesNotMatch(s.style, /!important/);
    assert.match(s.style, /^background-image: url\("data:image\/svg/, 'Moodle\'s own style attribute is back');
    assert.doesNotMatch(s.cls, /nm-bg-img/);
    assert.equal(s.cardBg, '');
    assert.equal(s.cardColor, '');
    await page.keyboard.press('Escape');
  });

  await ok('a block tint applies to the block (theme-relative), persists, and clears', async () => {
    const blk = page.locator('section[data-block="calendar_upcoming"]');
    await blk.evaluate(e => e.scrollIntoView({block: 'center', behavior: 'instant'}));
    await blk.hover();
    await blk.locator('.nm-bg-btn').click();
    await page.waitForSelector(`${BPOP}:popover-open`);
    assert.deepEqual(await page.$$eval(`${BPOP} .nm-bg-group`, gs => gs.map(g => g.getAttribute('aria-label'))), ['Start from', 'Tints', 'Soft gradients', 'Patterns']);
    await page.click(`${BPOP} .nm-bg-opt[data-kind="tint"][data-value="sky"]`);
    await page.waitForFunction(() => document.querySelector('section[data-block="calendar_upcoming"]').classList.contains('nm-bg-set'));
    assert.deepEqual((await h.getStorage('blockBg')).blockBg, {calendar_upcoming: {kind: 'tint', value: 'sky'}});
    const s = await page.evaluate(() => {
      const b = document.querySelector('section[data-block="calendar_upcoming"]');
      const t = b.querySelector('.nm-bg-surface') || b;
      return {var: b.style.getPropertyValue('--nm-block-bg'), prio: t.style.getPropertyPriority('background-color'), color: getComputedStyle(t).backgroundColor};
    });
    assert.match(s.var, /color-mix\(in oklab, var\(--nm-surface\) 86%, #3fa7f5\)/);
    assert.equal(s.prio, 'important');
    assert.notEqual(s.color, 'rgb(255, 255, 255)');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(p => document.querySelector(p).matches(':popover-open'), BPOP), false);
    // clear it again
    await blk.hover();
    await blk.locator('.nm-bg-btn').click();
    await page.click(`${BPOP} .nm-bg-opt[data-kind="default"]`);
    await page.waitForFunction(() => !document.querySelector('section[data-block="calendar_upcoming"]').classList.contains('nm-bg-set'));
    assert.equal(await page.evaluate(() => document.querySelector('section[data-block="calendar_upcoming"] [style*="background"]') === null), true);
    await page.keyboard.press('Escape');
  });

  await ok('changes from another tab apply live (NM.watch)', async () => {
    await h.setStorage({courseBg: {'2279': {kind: 'gradient', value: 'sunrise'}}, blockBg: {'nm-block-todo': {kind: 'pattern', value: 'dots'}}});
    await page.waitForFunction(() => document.querySelector('.course-card[data-course-id="2279"]').dataset.nmBgKind === 'gradient'
      && document.getElementById('nm-block-todo').classList.contains('nm-bg-set'));
  });

  await ok('at 390px the popover fits the viewport', async () => {
    await page.setViewportSize({width: 390, height: 844});
    await openCourse(page);
    const r = await page.$eval(POP, p => { const r = p.getBoundingClientRect(); return {l: r.left, t: r.top, r: r.right, b: r.bottom}; });
    assert.ok(r.l >= 0 && r.t >= 0 && r.r <= 390 && r.b <= 844, JSON.stringify(r));
    await page.click(`${POP} .nm-bg-close`);
    assert.equal(await page.evaluate(p => document.querySelector(p).matches(':popover-open'), POP), false);
  });

  console.log(`backgrounds: ${passed} passed`);
} finally {
  await h.close();
}
