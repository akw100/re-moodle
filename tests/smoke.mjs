import {launch} from './harness.mjs';
const h = await launch();
const page = await h.open('/my/');
console.log(await page.evaluate(() => ({
  wwwroot: document.documentElement.dataset.nmWwwroot,
  slot: !!document.querySelector('.nm-header-slot .nm-theme-btn'),
  theme: document.documentElement.dataset.nmTheme ?? 'off',
})));
await h.setStorage({theme: 'campus-pop'});
await page.waitForTimeout(200);
console.log('after switch:', await page.evaluate(() => document.documentElement.dataset.nmTheme));
await h.close();
