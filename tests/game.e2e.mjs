// E2E for the arcade game ("Deadline Dash") in real Chromium with the unpacked extension.
//   node tests/game.e2e.mjs            -> asserts + screenshots in tests/tmp/game-<theme>-{mid,record,over}.png
import {launch, ROOT} from './harness.mjs';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const OUT = join(ROOT, 'tests', 'tmp');
mkdirSync(OUT, {recursive: true});
const THEMES = process.argv.slice(2).length ? process.argv.slice(2) : ['off', 'daily-quest', 'campus-pop'];
const ok = m => console.log('  ✓ ' + m);

const ov = page => page.locator('.nm-game-overlay');
const attr = (page, name) => page.$eval('.nm-game-overlay', (el, n) => el.dataset[n], name);
const score = async page => +(await attr(page, 'nmGameScore'));

// Click the lowest falling card (the most urgent one). Returns true if something was clicked.
async function clickCard(page, kinds = ['card']) {
  const targets = JSON.parse((await attr(page, 'nmGameTargets')) || '[]').filter(t => kinds.includes(t.kind));
  if (!targets.length) return false;
  const t = targets.sort((a, b) => b.y - a.y)[0];
  await page.mouse.click(t.x, t.y + 4); // cards fall; aim a hair below center
  return true;
}

// Keep clicking cards until `until()` is true (or timeout). Returns the number of clicks.
async function play(page, until, timeout = 20000) {
  const end = Date.now() + timeout;
  let n = 0;
  while (Date.now() < end) {
    if (await until()) return n;
    if (await clickCard(page)) { n++; await page.waitForTimeout(60); } else await page.waitForTimeout(40);
  }
  throw new Error('play() timed out');
}

const h = await launch({local: {highscore: 400}});
try {
  for (const theme of THEMES) {
    console.log(`\n[theme ${theme}]`);
    await h.setStorage({theme});
    await h.sw.evaluate(() => chrome.storage.local.set({highscore: 400})); // a beatable record, so the mid-game celebration fires
    const page = await h.open('/my/');
    await page.evaluate(() => { document.documentElement.dataset.nmGameSpeed = '2.4'; }); // faster spawns = quicker combos

    // Entry points
    assert.equal(await page.locator('#nm-block-game .nm-game-play').count(), 1, 'block with Play button');
    const order = await page.evaluate(() => {
      const b = document.querySelector('#nm-block-game');
      return {topRow: b?.parentElement?.id === 'nm-top-row' && b.previousElementSibling?.id === 'nm-block-todo', headerBtn: !!document.querySelector('.nm-game-btn')};
    });
    assert.ok(order.topRow, 'block sits in the top row, after the to-dos');
    assert.ok(!order.headerBtn, 'no gamepad button in the header');
    const bestShown = await page.locator('#nm-block-game [data-nm-game-best]').textContent();
    ok(`block exists, no header button (card shows high score ${bestShown})`);
    await page.locator('#nm-block-game').screenshot({path: join(OUT, `game-${theme}-block.png`)});

    // Open
    await page.locator('#nm-block-game .nm-game-play').click();
    await ov(page).waitFor({state: 'visible'});
    assert.equal(await attr(page, 'nmGameState'), 'playing');
    assert.ok(await page.evaluate(() => document.querySelector('.nm-game-overlay').contains(document.activeElement)), 'focus moved into overlay');
    ok('Play opens the overlay (state=playing, focus inside)');

    // Score goes up when clicking cards
    const s0 = await score(page);
    await play(page, async () => (await score(page)) > s0);
    const s1 = await score(page);
    assert.ok(s1 > s0, 'score increased');
    ok(`clicking a falling card scores (${s0} -> ${s1})`);

    // Build a combo; screenshot right as the "COMBO x3!" popup slams in, with particles flying
    await play(page, async () => +(await attr(page, 'nmGameCombo')) >= 3);
    await page.waitForTimeout(110);
    await page.screenshot({path: join(OUT, `game-${theme}-mid.png`)});
    ok(`combo x${await attr(page, 'nmGameCombo')} reached, score ${await score(page)} (screenshot game-${theme}-mid.png)`);

    // A busier frame: let cards pile up for a moment, then submit one (particles + "+N" popup + urgent cards)
    await page.waitForTimeout(2200);
    await clickCard(page);
    await page.waitForTimeout(90);
    await page.screenshot({path: join(OUT, `game-${theme}-busy.png`)});

    // High score is written the moment it's beaten (mid-game, not at game over)
    await play(page, async () => (await score(page)) > 400);
    await page.waitForTimeout(150);
    await page.screenshot({path: join(OUT, `game-${theme}-record.png`)});
    const live = await score(page);
    const {highscore} = await h.getLocal('highscore');
    assert.ok(highscore >= live, `highscore ${highscore} >= live score ${live}`);
    const {gamesPlayed} = await h.getLocal('gamesPlayed');
    assert.ok(gamesPlayed >= 1, 'gamesPlayed counted');
    ok(`highscore persisted mid-game: storage=${highscore}, live score=${live}, gamesPlayed=${gamesPlayed}`);

    // Pause / resume with Space, focus trap with Tab
    await page.keyboard.press('Space');
    assert.equal(await attr(page, 'nmGameState'), 'paused');
    await page.keyboard.press('Space');
    assert.equal(await attr(page, 'nmGameState'), 'playing');
    for (let i = 0; i < 7; i++) await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.querySelector('.nm-game-overlay').contains(document.activeElement)), 'Tab stays inside');
    ok('Space pauses + resumes; Tab x7 keeps focus inside the overlay');

    // Game over: stop clicking, crank the speed, let 3 cards hit the deadline
    await page.evaluate(() => { document.documentElement.dataset.nmGameSpeed = '6'; });
    await page.waitForFunction(() => document.querySelector('.nm-game-overlay')?.dataset.nmGameState === 'over', null, {timeout: 30000});
    await page.waitForTimeout(900); // let the bouncy card land
    assert.equal(await page.locator('.nm-game-over .nm-game-again').count(), 1, 'Play again button');
    const record = await attr(page, 'nmGameRecord');
    await page.screenshot({path: join(OUT, `game-${theme}-over.png`)});
    ok(`game over card shown (record=${record}, final=${await page.locator('.nm-game-final').textContent()})`);

    // Block card updated live from chrome.storage.onChanged
    const cardBest = (await page.locator('#nm-block-game [data-nm-game-best]').textContent()).replace(/,/g, '');
    assert.equal(+cardBest, (await h.getLocal('highscore')).highscore, 'block card shows live high score');
    ok(`block card high score updated live (${cardBest})`);

    // Play again restarts; Esc closes
    await page.locator('.nm-game-again').click();
    assert.equal(await attr(page, 'nmGameState'), 'playing');
    assert.equal(await score(page), 0);
    await page.keyboard.press('Escape');
    await ov(page).waitFor({state: 'hidden'});
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('nm-game-play')), 'focus restored to Play');
    ok('Play again restarts at 0; Esc closes the overlay and restores focus');
    await page.close();
  }
  console.log('\nPASS game.e2e');
} finally {
  await h.close();
}
