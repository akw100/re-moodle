// Regenerates docs/screenshots/: every theme on the user's real dashboard (fixtures/live, offline), desktop and phone width.
import {launch, ROOT} from './harness.mjs';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

const out = join(ROOT, 'docs/screenshots');
mkdirSync(out, {recursive: true});
const day = d => { const t = new Date(Date.now() + d * 864e5); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }; // local date, like <input type=date>
const storage = {
  todos: [
    {id: 't1', text: 'Email the seminar lecturer about my topic', due: day(0), done: false, created: 1, doneAt: null},
    {id: 't2', text: 'Read chapter 4 for Operations', due: day(2), done: false, created: 2, doneAt: null},
    {id: 't3', text: 'Print the Lab 3 checklist', due: null, done: true, created: 3, doneAt: 4},
  ],
  shortcuts: [
    {id: 's1', url: 'https://shnaton.huji.ac.il/', title: 'Shnaton'},
    {id: 's2', url: 'https://huji.cloud.panopto.eu/', title: 'Panopto'},
    {id: 's3', url: 'https://mail.google.com/', title: 'Gmail'},
    {id: 's4', url: 'https://drive.google.com/', title: 'Google Drive'},
  ],
};

const THEMES = ['off', 'quiet-focus', 'night-operator', 'daily-quest', 'campus-pop', 'ahead', 'fal', 'giga', 'cloudstudio', 'butter', 'clay'];
for (const theme of THEMES) {
  for (const [tag, viewport] of [['desktop', {width: 1280, height: 900}], ['phone', {width: 390, height: 844}]]) {
    const h = await launch({live: true, storage: {...storage, theme}, local: {highscore: 2450, gamesPlayed: 7}, viewport});
    const page = await h.open('/my/');
    await page.evaluate(() => { const d = document.querySelector('.nm-up-done'); if (d) d.open = true; });
    await page.waitForTimeout(1200); // fonts + favicons
    await page.screenshot({path: join(out, `${theme}-${tag}.png`), fullPage: tag === 'desktop'});
    await h.close();
  }
  console.log('shot', theme);
}
