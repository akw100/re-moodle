// E2E for the personal to-do block (src/features/todo.js) in real Chromium with the extension loaded.
//   node tests/todo.e2e.mjs            (add --shots to also write tests/tmp/todo-*.png per theme)
import {launch, ROOT} from './harness.mjs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const shots = process.argv.includes('--shots');
let passed = 0;
const ok = async (name, fn) => { await fn(); passed++; console.log('  ✓', name); };
const texts = (page, sel) => page.$$eval(sel, els => els.map(e => e.querySelector('.nm-todo-text, .nm-todo-edit')?.textContent ?? e.textContent));
const todos = async h => (await h.getStorage('todos')).todos ?? [];

const h = await launch();
try {
  const page = await h.open('/my/');
  const open = '.nm-todo-open .nm-todo-item', done = '#nm-todo-done-list .nm-todo-item';

  await ok('block is first on the dashboard and shows the empty state', async () => {
    assert.equal(await page.$eval('#nm-top-row', r => r.firstElementChild.id + '|' + (r.nextElementSibling?.id)), 'nm-block-todo|block-region-content');
    assert.ok(await page.isVisible('.nm-todo-empty'));
    assert.ok(await page.isVisible('.nm-todo-done-toggle'), 'Completed header always visible');
  });

  await ok('add 3 items with Enter; focus stays in the field; persisted', async () => {
    await page.click('#nm-todo-new');
    for (const t of ['Read chapter 4', 'Email the TA', 'Print lab sheet']) {
      await page.keyboard.type(t);
      await page.keyboard.press('Enter');
      await page.waitForFunction(t => [...document.querySelectorAll('.nm-todo-text')].some(e => e.textContent === t), t);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'nm-todo-new');
      assert.equal(await page.inputValue('#nm-todo-new'), '');
    }
    assert.deepEqual(await texts(page, open), ['Print lab sheet', 'Email the TA', 'Read chapter 4']);
    const stored = await todos(h);
    assert.equal(stored.length, 3);
    for (const t of stored) assert.deepEqual(Object.keys(t).sort(), ['created', 'done', 'doneAt', 'due', 'id', 'text']);
    assert.ok(await page.isHidden('.nm-todo-empty'));
  });

  await ok('Escape clears the add field; due date via calendar button', async () => {
    await page.fill('#nm-todo-new', 'scratch');
    await page.press('#nm-todo-new', 'Escape');
    assert.equal(await page.inputValue('#nm-todo-new'), '');
    assert.ok(await page.isHidden('#nm-todo-new-due'));
    await page.click('.nm-todo-date-btn');
    assert.ok(await page.isVisible('#nm-todo-new-due'));
    const tomorrow = new Date(Date.now() + 864e5);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    await page.fill('#nm-todo-new-due', iso);
    await page.click('#nm-todo-new'); // a real click closes the native picker popup
    await page.keyboard.type('Submit ex 2');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.nm-todo-due.is-tomorrow');
    assert.equal((await todos(h)).find(t => t.text === 'Submit ex 2').due, iso);
    assert.equal(await page.textContent('.nm-todo-due.is-tomorrow'), 'Tomorrow');
    assert.ok(await page.isHidden('#nm-todo-new-due'), 'date resets after add');
  });

  await ok('checking moves an item into Completed (confetti called at the checkbox)', async () => {
    await page.click(`${open}:has-text("Email the TA") .nm-todo-check`);
    await page.waitForFunction(() => [...document.querySelectorAll('#nm-todo-done-list .nm-todo-text')].some(e => e.textContent === 'Email the TA'));
    assert.ok(!(await texts(page, open)).includes('Email the TA'));
    assert.equal(await page.textContent('.nm-todo-done-count'), '1');
    assert.ok(await page.isHidden('#nm-todo-done-list'), 'collapsed by default');
    const t = (await todos(h)).find(t => t.text === 'Email the TA');
    assert.equal(t.done, true);
    assert.ok(t.doneAt > 0);
  });

  await ok('expand Completed and uncheck moves it back', async () => {
    await page.click('.nm-todo-done-toggle');
    assert.equal(await page.getAttribute('.nm-todo-done-toggle', 'aria-expanded'), 'true');
    await page.click(`${done}:has-text("Email the TA") .nm-todo-check`);
    await page.waitForFunction(() => [...document.querySelectorAll('.nm-todo-open .nm-todo-text')].some(e => e.textContent === 'Email the TA'));
    assert.equal(await page.$$eval(done, e => e.length), 0);
    assert.equal((await todos(h)).find(t => t.text === 'Email the TA').done, false);
  });

  await ok('double-click edits inline; Enter saves', async () => {
    await page.dblclick(`${open}:has-text("Print lab sheet") .nm-todo-text`);
    await page.fill('.nm-todo-edit', 'Print lab sheet (x2)');
    await page.press('.nm-todo-edit', 'Enter');
    await page.waitForFunction(() => [...document.querySelectorAll('.nm-todo-text')].some(e => e.textContent === 'Print lab sheet (x2)'));
    assert.ok((await todos(h)).some(t => t.text === 'Print lab sheet (x2)'));
  });

  await ok('Alt+ArrowDown/Up reorders the focused row and keeps focus', async () => {
    const before = await texts(page, open);
    await page.focus(`${open}:nth-child(1)`);
    await page.keyboard.press('Alt+ArrowDown');
    await page.waitForFunction(b => document.querySelector('.nm-todo-open .nm-todo-item:nth-child(2) .nm-todo-text')?.textContent === b, before[0]);
    assert.deepEqual(await texts(page, open), [before[1], before[0], ...before.slice(2)]);
    assert.equal(await page.evaluate(() => document.activeElement.querySelector('.nm-todo-text')?.textContent), before[0]);
    assert.deepEqual((await todos(h)).map(t => t.text).slice(0, 2), [before[1], before[0]]);
    await page.keyboard.press('Alt+ArrowUp');
    await page.waitForFunction(b => document.querySelector('.nm-todo-open .nm-todo-item:nth-child(1) .nm-todo-text')?.textContent === b, before[0]);
  });

  await ok('native drag and drop reorders', async () => {
    const before = await texts(page, open);
    await page.dragAndDrop(`${open}:nth-child(1)`, `${open}:nth-child(3)`, {targetPosition: {x: 40, y: (await page.locator(`${open}:nth-child(3)`).boundingBox()).height - 6}});
    await page.waitForFunction(b => document.querySelector('.nm-todo-open .nm-todo-item:nth-child(3) .nm-todo-text')?.textContent === b, before[0]);
    assert.deepEqual(await texts(page, open), [before[1], before[2], before[0], ...before.slice(3)]);
  });

  await ok('delete works (hover button) and Undo restores', async () => {
    await page.hover(`${open}:has-text("Read chapter 4")`);
    await page.click(`${open}:has-text("Read chapter 4") .nm-todo-del`);
    await page.waitForFunction(() => ![...document.querySelectorAll('.nm-todo-text')].some(e => e.textContent === 'Read chapter 4'));
    assert.ok(!(await todos(h)).some(t => t.text === 'Read chapter 4'));
    await page.click('.nm-todo-msg-action');
    await page.waitForFunction(() => [...document.querySelectorAll('.nm-todo-text')].some(e => e.textContent === 'Read chapter 4'));
    await page.hover(`${open}:has-text("Read chapter 4")`);
    await page.click(`${open}:has-text("Read chapter 4") .nm-todo-del`);
    await page.waitForFunction(() => ![...document.querySelectorAll('.nm-todo-text')].some(e => e.textContent === 'Read chapter 4'));
    assert.equal((await todos(h)).length, 3);
  });

  await ok('a second tab updates live', async () => {
    const page2 = await h.open('/my/');
    assert.deepEqual(await texts(page2, open), await texts(page, open));
    await page.fill('#nm-todo-new', 'Added in tab 1');
    await page.press('#nm-todo-new', 'Enter');
    await page2.waitForFunction(() => [...document.querySelectorAll('.nm-todo-text')].some(e => e.textContent === 'Added in tab 1'), null, {timeout: 3000});
    await page2.click(`${open}:has-text("Added in tab 1") .nm-todo-check`);
    await page.waitForFunction(() => [...document.querySelectorAll('#nm-todo-done-list .nm-todo-text')].some(e => e.textContent === 'Added in tab 1'), null, {timeout: 3000});
    await page2.close();
  });

  await ok('Clear completed removes done items', async () => {
    await page.click('.nm-todo-clear');
    await page.waitForFunction(() => document.querySelector('.nm-todo-done-count').textContent === '0');
    assert.ok((await todos(h)).every(t => !t.done));
    assert.ok(await page.isHidden('.nm-todo-clear'));
  });

  await ok('quota error shows an inline message and keeps data', async () => {
    const big = Array.from({length: 60}, (_, i) => ({id: 'q' + i, text: 'x'.repeat(60) + i, due: null, done: false, created: 1, doneAt: null}));
    await h.setStorage({todos: big});
    await page.waitForFunction(() => document.querySelectorAll('.nm-todo-open .nm-todo-item').length === 60);
    await page.fill('#nm-todo-new', 'y'.repeat(200));
    await page.press('#nm-todo-new', 'Enter');
    await page.waitForSelector('.nm-todo-msg.is-error');
    assert.match(await page.textContent('.nm-todo-msg'), /full/i);
    assert.equal((await todos(h)).length, 60);
    assert.equal((await page.inputValue('#nm-todo-new')).length, 200, 'typed text is kept');
  });
} finally {
  await h.close();
}

if (shots) {
  const day = n => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const sample = [
    {id: 'a', text: 'Finish Operations Management problem set', due: day(0), done: false, created: 1, doneAt: null},
    {id: 'b', text: 'Email Prof. Levi about the project groups', due: day(1), done: false, created: 2, doneAt: null},
    {id: 'c', text: 'Return library books', due: day(-2), done: false, created: 3, doneAt: null},
    {id: 'd', text: 'Read the Strategic Management case before Thursday’s class', due: day(6), done: false, created: 4, doneAt: null},
    {id: 'e', text: 'Buy a new notebook', due: null, done: false, created: 5, doneAt: null},
    {id: 'f', text: 'Submit the Big Data quiz', due: day(-1), done: true, created: 6, doneAt: 9},
    {id: 'g', text: 'Print lecture slides', due: null, done: true, created: 7, doneAt: 8},
  ];
  for (const theme of ['off', 'night-operator', 'campus-pop']) {
    const s = await launch({storage: {theme, todos: sample}});
    const p = await s.open('/my/');
    const block = await p.$('#nm-block-todo');
    await p.hover('.nm-todo-open .nm-todo-item:nth-child(2)');
    await block.screenshot({path: join(ROOT, `tests/tmp/todo-${theme}.png`)});
    await p.click('.nm-todo-done-toggle');
    await p.click('#nm-todo-new');
    await p.keyboard.type('Plan the weekend');
    await p.click('.nm-todo-date-btn');
    await p.fill('#nm-todo-new-due', day(3));
    await p.click('#nm-todo-new'); // closes the native picker popup
    await p.mouse.move(0, 0);
    await block.screenshot({path: join(ROOT, `tests/tmp/todo-${theme}-open.png`)});
    await s.setStorage({todos: []});
    await p.waitForSelector('.nm-todo-empty:not([hidden])');
    await p.evaluate(() => document.activeElement.blur());
    await p.mouse.move(0, 0);
    await block.screenshot({path: join(ROOT, `tests/tmp/todo-${theme}-empty.png`)});
    await s.close();
  }
  console.log('  screenshots: tests/tmp/todo-{off,night-operator,campus-pop}{,-open,-empty}.png');
}
console.log(`todo e2e: ${passed} passed`);
