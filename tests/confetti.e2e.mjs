// Confetti e2e: real Chromium + the unpacked extension against the fixtures.  Run: node tests/confetti.e2e.mjs
// Confetti only fires on the page AFTER a submit went through (sessionStorage flag + status on the page).
// page.evaluate runs in the main world (NM is in the isolated world), so everything is asserted through the DOM.
import {launch, ROOT} from './harness.mjs';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';

const SHOTS = join(ROOT, 'tests', 'tmp');
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

const CANVAS = 'canvas.nm-confetti';
const appears = (page, sel, timeout = 2500) => page.waitForSelector(sel, {state: 'attached', timeout}).then(() => true, () => false);
const gone = (page, sel, timeout = 9000) => page.waitForSelector(sel, {state: 'detached', timeout}).then(() => true, () => false);
const exists = (page, sel) => page.evaluate(s => !!document.querySelector(s), sel);
const toastText = page => page.evaluate(() => document.querySelector('.nm-toast')?.textContent ?? null);

async function assignFlow(h, {shot} = {}) {
  const page = await h.open('/mod/assign/view.php?id=86371&action=editsubmission');
  await page.fill('#id_onlinetext_editor', 'My lab 3 report.');
  await Promise.all([page.waitForURL(u => !u.search.includes('editsubmission')), page.click('#id_submitbutton')]);
  const burst = await appears(page, CANVAS);
  if (shot && burst) { await page.waitForTimeout(650); await page.screenshot({path: join(SHOTS, `confetti-${shot}.png`)}); }
  return {page, burst};
}

async function quizFlow(h, {shot} = {}) {
  const page = await h.open('/mod/quiz/summary.php?attempt=5512&cmid=99730');
  await page.click('#single_button_finish');                     // opens the confirmation modal
  await page.waitForSelector('.modal [data-action=save]');
  await Promise.all([page.waitForURL(/review\.php/), page.click('.modal [data-action=save]')]); // form.submit() from JS
  const burst = await appears(page, CANVAS);
  if (shot && burst) { await page.waitForTimeout(650); await page.screenshot({path: join(SHOTS, `confetti-${shot}.png`)}); }
  return {page, burst};
}

// ---------- motion on ----------
const h = await launch({storage: {theme: 'daily-quest'}});
try {
  // 1. Full assignment flow -> big burst on the view page
  const a = await assignFlow(h, {shot: 'daily-quest'});
  check('assign: editsubmission -> Save changes -> view page creates a confetti canvas', a.burst);
  const style = await a.page.evaluate(s => {
    const c = document.querySelector(s); if (!c) return null;
    const cs = getComputedStyle(c);
    return {pe: cs.pointerEvents, pos: cs.position, z: +cs.zIndex, w: c.getBoundingClientRect().width, vw: innerWidth};
  }, CANVAS);
  check('canvas is fixed, full-screen, pointer-events:none, top z-index',
    !!style && style.pe === 'none' && style.pos === 'fixed' && style.z >= 2147483000 && Math.abs(style.w - style.vw) < 20, JSON.stringify(style));
  const clickThrough = await a.page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName);
  check('clicks pass through the canvas', clickThrough !== 'CANVAS', `elementFromPoint=${clickThrough}`);
  // main-thread frame rate during the burst (rAF in the main world shares the thread with the confetti loop)
  const fps = await a.page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now();
    const f = () => { n++; performance.now() - t0 < 1000 ? requestAnimationFrame(f) : r(n); }; requestAnimationFrame(f); }));
  console.log(`      (main-thread frames during burst: ~${fps}/s)`);
  check('canvas is removed when the burst finishes', await gone(a.page, CANVAS));

  // 2. Same tab, view page opened again: the flag was consumed -> nothing
  await a.page.goto(a.page.url().replace(/view\.php.*$/, 'view.php?id=86371'));
  check('assign: reopening view.php after the burst does NOT fire', !(await appears(a.page, CANVAS, 1500)));

  // 3. Fresh tab, view page directly, no flag -> nothing
  const direct = await h.open('/mod/assign/view.php?id=86371');
  check('assign: opening assign-view.html directly (no flag) does NOT fire',
    !(await appears(direct, CANVAS, 1500)) && !(await exists(direct, '.nm-toast')));

  // 4. Cancel on the edit form -> no confetti on the view page
  const cancel = await h.open('/mod/assign/view.php?id=86371&action=editsubmission');
  await Promise.all([cancel.waitForURL(u => !u.search.includes('editsubmission')), cancel.click('#id_cancel')]);
  check('assign: Cancel on the edit form does NOT fire', !(await appears(cancel, CANVAS, 1500)));

  // 5. "Submit assignment" confirmation form (action=submit) -> big burst
  const conf = await h.open('/mod/assign/view.php?id=86371&action=submit');
  await Promise.all([conf.waitForURL(u => !u.search.includes('action=submit')), conf.click('#id_submitbutton')]);
  check('assign: action=submit confirmation -> view page fires', await appears(conf, CANVAS));

  // 6. Draft (not submitted): small burst + reminder toast
  const draft = await h.context.newPage();
  await draft.route('**/mod/assign/view.php', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = readFileSync(join(ROOT, 'fixtures', 'assign-view.html'), 'utf8').replace(/<td class="submissionstatussubmitted[^"]*">Submitted for grading<\/td>/,
      '<td class="submissionstatusdraft cell c1 lastcol">Draft (not submitted)</td>');
    return route.fulfill({contentType: 'text/html', body});
  });
  await draft.goto('https://moodle.huji.ac.il/2026-27/mod/assign/view.php?id=86371&action=editsubmission');
  await draft.waitForTimeout(500);
  await Promise.all([draft.waitForURL(u => !u.search.includes('editsubmission')), draft.click('#id_submitbutton')]);
  const draftBurst = await appears(draft, CANVAS);
  await draft.waitForSelector('.nm-toast', {timeout: 2000}).catch(() => {});
  check('assign: draft saved -> small burst + "remember to submit" toast',
    draftBurst && /remember to submit/.test(await toastText(draft) || ''), `toast=${JSON.stringify(await toastText(draft))}`);

  // 7. Quiz flow (campus-pop) -> big burst with stickers
  await h.setStorage({theme: 'campus-pop'});
  const q = await quizFlow(h, {shot: 'campus-pop'});
  check('quiz: summary -> Submit all and finish -> modal -> review.php creates a confetti canvas', q.burst);

  // 8. Quiz: open the modal, cancel, then visit review.php -> nothing
  const qc = await h.open('/mod/quiz/summary.php?attempt=5512&cmid=99730');
  await qc.click('#single_button_finish');
  await qc.click('.modal [data-action=cancel]');
  await qc.goto(qc.url().replace(/summary\.php.*$/, 'review.php?attempt=5512'));
  check('quiz: cancelling the modal then opening review.php does NOT fire', !(await appears(qc, CANVAS, 1500)));

  // 9. Quiz review opened directly -> nothing
  const qd = await h.open('/mod/quiz/review.php?attempt=5512');
  check('quiz: opening review.php directly does NOT fire', !(await appears(qd, CANVAS, 1500)));

  // 10. Forum reply -> small burst on the discussion page
  const f = await h.open('/mod/forum/post.php?reply=8990');
  await f.fill('#id_message', 'Thanks!');
  await Promise.all([f.waitForURL(/discuss\.php/), f.click('#id_submitbutton')]);
  check('forum: posting a reply -> small burst on the discussion page', await appears(f, CANVAS));

  // Screenshots for the other personalities
  for (const theme of ['night-operator', 'quiet-focus', 'off']) {
    await h.setStorage({theme});
    const r = await assignFlow(h, {shot: theme});
    check(`assign flow fires in theme ${theme}`, r.burst);
  }
} finally { await h.close(); }

// ---------- motion off ----------
const h2 = await launch({storage: {motion: 'off', theme: 'daily-quest'}});
try {
  const {page} = await assignFlow(h2);
  await page.waitForSelector('.nm-toast', {timeout: 2000}).catch(() => {});
  const text = await toastText(page);
  await page.waitForTimeout(800);
  const noCanvas = !(await exists(page, CANVAS));
  check('motion off: shows the "Submitted ✓" toast and no canvas', text === 'Submitted ✓' && noCanvas, `toast=${JSON.stringify(text)}`);
  if (text) await page.screenshot({path: join(SHOTS, 'confetti-motion-off.png')});
  const q = await quizFlow(h2);
  await q.page.waitForSelector('.nm-toast', {timeout: 2000}).catch(() => {});
  check('motion off: quiz flow shows the toast and no canvas', !q.burst && (await toastText(q.page)) === 'Submitted ✓');
} finally { await h2.close(); }

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
