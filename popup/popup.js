// Toolbar popup: the same grouped theme tiles as the in-page picker (NM.themeTiles / NM.tileStep from src/core.js),
// plus the header-voice select (NM.VOICES from src/features/motd.js) and the motion switch.
const box = document.getElementById('themes');
const motion = document.getElementById('motion');
const voice = document.getElementById('voice');
voice.append(...NM.VOICES.map(v => NM.el('option', {value: v.id}, v.name)));
document.getElementById('mark').append(Object.assign(document.createElement('img'), {src: '../icons/icon48.png', alt: '', width: 30, height: 30}));

const {nodes, tiles} = NM.themeTiles('nm-pg');
box.append(...nodes);

// The tiles' "Aa" samples use each theme's private font family. On Moodle those @font-face rules are already loaded
// (every theme file is a content-script stylesheet); here, copy just the @font-face rules out of the theme files.
Promise.all(NM.THEMES.filter(t => t.id !== 'off').map(t =>
  fetch(chrome.runtime.getURL(`themes/${t.id}.css`)).then(r => r.text()).catch(() => '')))
  .then(css => {
    const faces = css.join('\n').match(/@font-face\s*{[^}]*}/g) || [];
    document.head.append(Object.assign(document.createElement('style'), {textContent: faces.join('\n')}));
  });

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
// Arrows move focus through the grid (Up/Down by geometry, across the group headings), Home/End jump;
// Enter/Space select (native button click).
box.addEventListener('keydown', e => {
  const i = tiles.indexOf(document.activeElement);
  if (i < 0) return;
  const j = NM.tileStep(tiles, i, e.key, getComputedStyle(box).direction === 'rtl');
  if (j === null) return;
  e.preventDefault();
  tiles.forEach(t => { t.tabIndex = t === tiles[j] ? 0 : -1; });
  tiles[j].focus();
});

chrome.storage.sync.get({theme: 'off', motion: 'on', voice: 'mixed'}).then(s => {
  mark(s.theme);
  motion.checked = s.motion !== 'off';
  voice.value = s.voice || 'mixed';
});
voice.addEventListener('change', () => chrome.storage.sync.set({voice: voice.value}));
motion.addEventListener('change', () => chrome.storage.sync.set({motion: motion.checked ? 'on' : 'off'}));
chrome.storage.onChanged.addListener(ch => {
  if (ch.theme) mark(ch.theme.newValue);
  if (ch.voice) voice.value = ch.voice.newValue || 'mixed';
});

const previews = document.getElementById('previews');
const previewOrigins = {origins: ['https://*/*', 'http://*/*']};
const syncPreviews = async () => { previews.checked = await chrome.permissions.contains(previewOrigins); };
syncPreviews();
previews.addEventListener('change', async () => {
  previews.disabled = true;
  try {
    // Invoke request directly from the checkbox gesture, before any await.
    if (previews.checked) await chrome.permissions.request(previewOrigins);
    else await chrome.permissions.remove(previewOrigins);
  } catch { /* A dismissed request leaves the switch reflecting actual permissions. */ }
  finally { await syncPreviews(); previews.disabled = false; }
});
chrome.permissions.onAdded.addListener(syncPreviews);
chrome.permissions.onRemoved.addListener(syncPreviews);

const shnaton = document.getElementById('shnaton');
const shnatonOrigins = {origins: ['https://shnaton.huji.ac.il/*']};
const syncShnaton = async () => { shnaton.checked = await chrome.permissions.contains(shnatonOrigins); };
syncShnaton();
shnaton.addEventListener('change', async () => {
  shnaton.disabled = true;
  try {
    if (shnaton.checked) await chrome.permissions.request(shnatonOrigins);
    else await chrome.permissions.remove(shnatonOrigins);
  } catch { /* A dismissed request leaves the switch reflecting actual permissions. */ }
  finally { await syncShnaton(); shnaton.disabled = false; }
});
chrome.permissions.onAdded.addListener(syncShnaton);
chrome.permissions.onRemoved.addListener(syncShnaton);
