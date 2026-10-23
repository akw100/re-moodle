// Toolbar popup: the same theme tiles as the in-page picker (NM.THEMES and NM.el come from src/core.js), plus the motion switch.
const box = document.getElementById('themes');
const motion = document.getElementById('motion');
document.getElementById('mark').append(NM.icon('palette'));

const tiles = NM.THEMES.map(t => NM.el('button', {
  type: 'button', class: 'nm-theme-tile', role: 'radio', 'aria-checked': 'false', tabindex: '-1', title: t.name,
  dataset: {theme: t.id}, style: `--t-bg:${t.swatch[0]};--t-accent:${t.swatch[1]}`,
},
NM.el('span', {class: 'nm-theme-prev', 'aria-hidden': 'true'},
  NM.el('span', {class: 'nm-theme-prev-card'},
    NM.el('span', {class: 'nm-theme-prev-bar'}), NM.el('span', {class: 'nm-theme-prev-line'}), NM.el('span', {class: 'nm-theme-prev-line'}))),
NM.el('span', {class: 'nm-theme-name'}, t.name)));
box.append(...tiles);

const mark = id => tiles.forEach(t => {
  const on = t.dataset.theme === id;
  t.setAttribute('aria-checked', String(on));
  t.tabIndex = on ? 0 : -1;
});

box.addEventListener('click', e => {
  const t = e.target.closest('.nm-theme-tile');
  if (!t) return;
  mark(t.dataset.theme);
  chrome.storage.sync.set({theme: t.dataset.theme});
});
// Arrows move focus across the 3-column grid, Home/End jump; Enter/Space select (native button click).
box.addEventListener('keydown', e => {
  const i = tiles.indexOf(document.activeElement);
  if (i < 0) return;
  const cols = tiles.filter(t => t.offsetTop === tiles[0].offsetTop).length || 1;
  const step = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols}[e.key];
  let j = step !== undefined ? i + step : e.key === 'Home' ? 0 : e.key === 'End' ? tiles.length - 1 : null;
  if (j === null) return;
  if (Math.abs(step) === cols && (j < 0 || j >= tiles.length)) j = i;
  j = Math.max(0, Math.min(tiles.length - 1, j));
  e.preventDefault();
  tiles.forEach(t => { t.tabIndex = t === tiles[j] ? 0 : -1; });
  tiles[j].focus();
});

chrome.storage.sync.get({theme: 'off', motion: 'on'}).then(s => {
  mark(s.theme);
  motion.checked = s.motion !== 'off';
});
motion.addEventListener('change', () => chrome.storage.sync.set({motion: motion.checked ? 'on' : 'off'}));
chrome.storage.onChanged.addListener(ch => { if (ch.theme) mark(ch.theme.newValue); });
