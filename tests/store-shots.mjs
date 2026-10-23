// Regenerates the Chrome Web Store images in docs/store/: 1280x800 screenshots (24-bit, no alpha) with friendly,
// store-safe header messages instead of a random one, plus the 1400x560 marquee tile built from one of them.
import {launch, ROOT} from './harness.mjs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const out = join(ROOT, 'docs/store');
const day = d => { const t = new Date(Date.now() + d * 864e5); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
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
const SHOTS = {
  'campus-pop': 'Two things due this week. You’ve totally got this.',
  'night-operator': 'Lab 3 report due Thursday. One focused hour is all it takes.',
  'ahead': 'Small steps count. One reading and one email today.',
  'quiet-focus': 'Everything’s on track. Here’s what’s next.',
  'cloudstudio': 'Good morning! Coffee first, then conquer that quiz.',
};

for (const [theme, message] of Object.entries(SHOTS)) {
  const h = await launch({live: true, storage: {...storage, theme}, local: {highscore: 2450, gamesPlayed: 7}, viewport: {width: 1280, height: 800}});
  const page = await h.open('/my/');
  await page.evaluate(msg => {
    const t = document.querySelector('.nm-motd-text');
    if (t) t.textContent = msg;
    window.dispatchEvent(new Event('resize')); // motd refits its box to the new text
  }, message);
  await page.waitForTimeout(1200); // fonts + favicons + refit
  await page.screenshot({path: join(out, `screenshot-${theme}.png`), type: 'png', omitBackground: false});
  await h.close();
  console.log('shot', theme);
}

// Flatten to 24-bit RGB (the store rejects alpha), then rebuild the marquee tile from the shots.
execFileSync('python3', ['-c', "from PIL import Image\nimport glob\nfor f in glob.glob('docs/store/screenshot-*.png'): Image.open(f).convert('RGB').save(f)"], {cwd: ROOT, stdio: 'inherit'});
execFileSync('python3', ['tools/marquee.py'], {cwd: ROOT, stdio: 'inherit'});
console.log('store images updated in docs/store/');
